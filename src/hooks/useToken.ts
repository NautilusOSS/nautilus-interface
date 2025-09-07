import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { MIMIR_API, ARC72_INDEXER_API, HIGHFORGE_CDN } from "@/config/arc72-idx";
import { stripTrailingZeroBytes } from "@/utils/string";
import { getAlgorandClients } from "@/wallets";
import { abi, CONTRACT } from "ulujs";

export interface TokenMetadata {
  name: string;
  image: string;
  description?: string;
  properties?: any;
  royalties?: string;
  image_integrity?: string;
  image_mimetype?: string;
}

export interface TokenInfo {
  contractId: number;
  tokenId: number;
  owner: string;
  approved?: string;
  metadata: TokenMetadata;
  metadataURI?: string;
  mintRound?: number;
}

export interface TokenOwnership {
  isOwner: boolean;
  currentOwner: string;
  approvedAddress?: string;
}

export interface TokenTransferHistory {
  from: string;
  to: string;
  timestamp: number;
  round: number;
  txId: string;
}

// Token metadata cache
const tokenMetadataCache: Record<string, TokenMetadata> = {};

// Token info cache  
const tokenInfoCache: Record<string, TokenInfo> = {};

/**
 * Hook to fetch comprehensive token information
 */
export const useToken = (contractId?: number, tokenId?: number) => {
  return useQuery({
    queryKey: ["token", contractId, tokenId],
    queryFn: async (): Promise<TokenInfo | null> => {
      if (!contractId || tokenId === undefined) return null;

      const cacheKey = `${contractId}-${tokenId}`;
      
      // Check cache first
      if (tokenInfoCache[cacheKey]) {
        return tokenInfoCache[cacheKey];
      }

      try {
        // Fetch token from MIMIR API
        const response = await axios.get(
          `${MIMIR_API}/nft-indexer/v1/tokens?contractId=${contractId}&tokenId=${tokenId}`
        );

        if (response.data.tokens && response.data.tokens.length > 0) {
          const token = response.data.tokens[0];
          let metadata: TokenMetadata = {
            name: `Token #${tokenId}`,
            image: "",
          };

          // Parse metadata if available
          if (token.metadata) {
            try {
              const parsedMetadata = JSON.parse(token.metadata);
              metadata = {
                name: parsedMetadata.name || `Token #${tokenId}`,
                image: parsedMetadata.image || "",
                description: parsedMetadata.description,
                properties: parsedMetadata.properties,
                royalties: parsedMetadata.royalties,
                image_integrity: parsedMetadata.image_integrity,
                image_mimetype: parsedMetadata.image_mimetype,
              };
            } catch (error) {
              console.warn("Failed to parse token metadata:", error);
            }
          }

          const tokenInfo: TokenInfo = {
            contractId: token.contractId,
            tokenId: token.tokenId,
            owner: token.owner,
            approved: token.approved,
            metadata,
            metadataURI: token.metadataURI,
            mintRound: token["mint-round"],
          };

          // Cache the result
          tokenInfoCache[cacheKey] = tokenInfo;
          return tokenInfo;
        }

        return null;
      } catch (error) {
        console.error("Error fetching token:", error);
        throw error;
      }
    },
    enabled: !!contractId && tokenId !== undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to fetch token ownership information
 */
export const useTokenOwnership = (contractId?: number, tokenId?: number, userAddress?: string) => {
  return useQuery({
    queryKey: ["tokenOwnership", contractId, tokenId, userAddress],
    queryFn: async (): Promise<TokenOwnership | null> => {
      if (!contractId || tokenId === undefined) return null;

      try {
        const { algodClient, indexerClient } = getAlgorandClients();
        
        // Create contract instance to check ownership
        const ci = new CONTRACT(
          contractId,
          algodClient,
          indexerClient,
          abi.arc72,
          { addr: userAddress || "", sk: new Uint8Array(0) }
        );

        // Get owner of token
        const ownerResult = await ci.arc72_ownerOf(BigInt(tokenId));
        const currentOwner = ownerResult.returnValue;

        // Get approved address if any
        let approvedAddress = "";
        try {
          const approvedResult = await ci.arc72_getApproved(BigInt(tokenId));
          approvedAddress = approvedResult.returnValue;
        } catch (error) {
          // Approved address might not be set
        }

        return {
          isOwner: userAddress ? currentOwner === userAddress : false,
          currentOwner,
          approvedAddress: approvedAddress || undefined,
        };
      } catch (error) {
        console.error("Error fetching token ownership:", error);
        throw error;
      }
    },
    enabled: !!contractId && tokenId !== undefined,
    staleTime: 30 * 1000, // 30 seconds - ownership can change frequently
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook to fetch token transfer history
 */
export const useTokenTransferHistory = (contractId?: number, tokenId?: number) => {
  return useQuery({
    queryKey: ["tokenTransferHistory", contractId, tokenId],
    queryFn: async (): Promise<TokenTransferHistory[]> => {
      if (!contractId || tokenId === undefined) return [];

      try {
        const { algodClient, indexerClient } = getAlgorandClients();
        
        // Create contract instance to get events
        const ci = new CONTRACT(
          contractId,
          algodClient,
          indexerClient,
          abi.arc72,
          { addr: "", sk: new Uint8Array(0) }
        );

        // Get transfer events for this token
        const events = await ci.getEvents({
          minRound: 0, // Get all events - you might want to limit this
        });

        const transferEvents = events
          ?.find((event: any) => event.name === "arc72_Transfer")
          ?.events || [];

        // Filter events for this specific token and parse them
        const tokenTransfers: TokenTransferHistory[] = transferEvents
          .filter((event: any) => {
            // Parse the event data to check if it's for our token
            try {
              const tokenIdFromEvent = event.data?.[2]; // Assuming tokenId is the 3rd parameter
              return tokenIdFromEvent === tokenId;
            } catch {
              return false;
            }
          })
          .map((event: any) => ({
            from: event.data?.[0] || "",
            to: event.data?.[1] || "",
            timestamp: event.timestamp || 0,
            round: event.round || 0,
            txId: event.txId || "",
          }))
          .sort((a: any, b: any) => b.round - a.round); // Sort by round descending (newest first)

        return tokenTransfers;
      } catch (error) {
        console.error("Error fetching token transfer history:", error);
        return [];
      }
    },
    enabled: !!contractId && tokenId !== undefined,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to resolve and cache token image URLs
 */
export const useTokenImage = (imageUrl?: string, metadataURI?: string, contractId?: number) => {
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string>("");
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);

  useEffect(() => {
    const resolveImageUrl = () => {
      if (!imageUrl) {
        setResolvedImageUrl("");
        setImageLoading(false);
        setImageError(true);
        return;
      }

      let resolved = imageUrl;

      // Handle IPFS URLs
      if (imageUrl.startsWith("ipfs://")) {
        resolved = `https://ipfs.io/ipfs/${imageUrl.slice(7)}`;
      }
      // Handle already resolved IPFS URLs
      else if (imageUrl.startsWith("https://ipfs.io/ipfs/")) {
        resolved = imageUrl;
      }
      // Handle direct HTTP/HTTPS URLs
      else if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        resolved = imageUrl;
      }
      // Fallback to CDN if metadataURI is available
      else if (metadataURI && !imageUrl.startsWith("data:")) {
        const collectionsMissingImage = [35720076, 797609];
        if (contractId && !collectionsMissingImage.includes(contractId)) {
          resolved = `${HIGHFORGE_CDN}/i/${encodeURIComponent(
            stripTrailingZeroBytes(metadataURI)
          )}?w=400`;
        }
      }

      setResolvedImageUrl(resolved);
      setImageLoading(false);
      setImageError(false);
    };

    resolveImageUrl();
  }, [imageUrl, metadataURI, contractId]);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  return {
    resolvedImageUrl,
    imageLoading,
    imageError,
    handleImageLoad,
    handleImageError,
  };
};

/**
 * Hook to fetch multiple tokens for a collection
 */
export const useCollectionTokens = (contractId?: number, limit?: number, offset?: number) => {
  return useQuery({
    queryKey: ["collectionTokens", contractId, limit, offset],
    queryFn: async () => {
      if (!contractId) return { tokens: [], total: 0 };

      try {
        const params: any = {
          contractId,
        };
        
        if (limit) params.limit = limit;
        if (offset) params.offset = offset;

        const response = await axios.get(`${MIMIR_API}/nft-indexer/v1/tokens`, {
          params,
        });

        const tokens = response.data.tokens?.map((token: any) => {
          let metadata: TokenMetadata = {
            name: `Token #${token.tokenId}`,
            image: "",
          };

          if (token.metadata) {
            try {
              const parsedMetadata = JSON.parse(token.metadata);
              metadata = {
                name: parsedMetadata.name || `Token #${token.tokenId}`,
                image: parsedMetadata.image || "",
                description: parsedMetadata.description,
                properties: parsedMetadata.properties,
                royalties: parsedMetadata.royalties,
              };
            } catch (error) {
              console.warn("Failed to parse token metadata:", error);
            }
          }

          return {
            contractId: token.contractId,
            tokenId: token.tokenId,
            owner: token.owner,
            approved: token.approved,
            metadata,
            metadataURI: token.metadataURI,
            mintRound: token["mint-round"],
          };
        }) || [];

        return {
          tokens,
          total: response.data.total || tokens.length,
        };
      } catch (error) {
        console.error("Error fetching collection tokens:", error);
        throw error;
      }
    },
    enabled: !!contractId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};
