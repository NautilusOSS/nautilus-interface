import React, { useEffect, useMemo, useState } from "react";
import Layout from "../../layouts/Default";
import { Container } from "@mui/material";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import axios from "axios";
import styled from "styled-components";
import NFTCollectionTable from "../../components/NFTCollectionTable";

import { GridLoader } from "react-spinners";
import { useQuery } from "@tanstack/react-query";

const SectionHeading = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding-top: 45px;
  gap: 10px;
  & h2.dark {
    color: #fff;
  }
  & h2.light {
    color: #93f;
  }
`;

const SectionDescription = styled.div`
  flex: 1 0 0;
  color: #93f;
  font-family: "Advent Pro";
  font-size: 20px;
  font-style: normal;
  font-weight: 500;
  line-height: 24px; /* 120% */
  letter-spacing: 0.2px;
`;

const SectionTitle = styled.h2`
  /*color: #93f;*/
  text-align: center;
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: Nohemi;
  font-size: 40px;
  font-style: normal;
  font-weight: 700;
  line-height: 100%; /* 40px */
`;

const ExternalLinks = styled.ul`
  & li {
    margin-top: 10px;
  }
`;

const StyledLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 10px;
`;

// Add new type definitions
type GlobalState = {
  key: string;
  value: number | string;
};

type NFTCollection = {
  contractId: number;
  totalSupply: number;
  isBlacklisted: number;
  creator: string;
  globalState: GlobalState[];
  mintRound: number;
  burnedSupply: number;
  firstToken: {
    contractId: number;
    tokenId: string;
    owner: string;
    metadataURI: string;
    metadata: string;
  } | null;
  uniqueOwners: number;
  name?: string;
  description?: string;
  launchStart?: number;
  launchEnd?: number;
  maxSupply?: number;
  featured?: number; // 0: not featured, 1: featured
  nostats?: boolean; // 0: stats, 1: no stats
};

type NautilusResponse = {
  "current-round": number;
  collections: NFTCollection[];
};

// Add new type definition for listings
type Listing = {
  collectionId: number;
  tokenId: string;
  deleted: boolean;
  price: string;
  sold: boolean;
  token?: any;
  staking?: any;
};

// Update type definition for volume data
type VolumeData = {
  contractId: number;
  vol24h: string;
  vol7d: string;
  vol30: number;
  alltime: string;
  floor: string;
};

type VolumeResponse = {
  "current-round": number;
  volumes: VolumeData[];
};

// Replace useCollectionInfo with new hook
const useNautilusCollections = () => {
  return useQuery({
    queryKey: ["nautilus-collections"],
    queryFn: async () => {
      const response = await axios.get<NautilusResponse>(
        "https://arc72-voi-mainnet.nftnavigator.xyz/nft-indexer/v1/collections?includes=unique-owners"
      );
      return response.data;
    },
  });
};

// Add new hook to fetch listings
const useNautilusListings = () => {
  return useQuery({
    queryKey: ["nautilus-listings"],
    queryFn: async () => {
      const response = await axios.get<{ listings: Listing[] }>(
        //"https://arc72-voi-mainnet.nftnavigator.xyz/nft-indexer/v1/mp/listings?active=true"
        "https://mainnet-idx.nautilus.sh/nft-indexer/v1/mp/listings?active=true"
      );
      return response.data;
    },
  });
};

// Update hook to fetch volume data
const useNautilusVolumes = () => {
  return useQuery({
    queryKey: ["nautilus-volumes"],
    queryFn: async () => {
      const response = await axios.get<VolumeResponse>(
        "https://mainnet-idx.nautilus.sh/nft-indexer/v1/mp/volumes"
      );
      return response.data;
    },
  });
};

export const Collections: React.FC = () => {
  const { data: nautilusData, status: nautilusStatus } =
    useNautilusCollections();
  const { data: listingsData, status: listingsStatus } = useNautilusListings();
  const { data: volumeData, status: volumeStatus } = useNautilusVolumes();
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  console.log("nautilusData", nautilusData);

  const processedCollections = useMemo(() => {
    if (!nautilusData?.collections) return [];

    // Add volume info mapping
    const volumeInfo =
      volumeData?.volumes.reduce(
        (acc, volume) => {
          acc[volume.contractId] = {
            volume24h: Number(volume.vol24h) / 1_000_000,
            volume7d: Number(volume.vol7d) / 1_000_000,
            volume30d: volume.vol30 / 1_000_000,
            volumeAllTime: Number(volume.alltime) / 1_000_000,
            floor: Number(volume.floor) / 1_000_000,
          };
          return acc;
        },
        {} as Record<
          number,
          {
            volume24h: number;
            volume7d: number;
            volume30d: number;
            volumeAllTime: number;
            floor: number;
          }
        >
      ) || {};

    console.log("listingsData", listingsData);

    // Create a map of active listings and floor prices by contract ID
    const listingsInfo =
      listingsData?.listings
        .filter(
          (listing) =>
            (!!listing.token || !!listing.staking) &&
            listing.token.approved ===
              "C4NGXXA22RGBDDHVR4CXC6YPGYL4KC2RSCOKLOOBDR6IEKYSJYPJX3HJZE" &&
            listing.price !== "0"
        )
        .reduce((acc, listing) => {
          if (!listing.deleted && !listing.sold) {
            if (!acc[listing.collectionId]) {
              acc[listing.collectionId] = {
                count: 0,
                floorPrice: Infinity,
              };
            }
            acc[listing.collectionId].count += 1;
            // Assuming the listing price is in microVOI
            const price = Number(listing.price || 0) / 1_000_000;
            acc[listing.collectionId].floorPrice = Math.min(
              acc[listing.collectionId].floorPrice,
              price
            );
          }
          return acc;
        }, {} as Record<number, { count: number; floorPrice: number }>) || {};

    // Add console.log to debug
    console.log("Listings info:", listingsInfo);

    const resolveIpfsUrl = (url: string) => {
      if (url.startsWith("ipfs://")) {
        return url.replace("ipfs://", "https://ipfs.io/ipfs/");
      }
      return url;
    };

    const excludedCollections = [
      //421076, // Nautilus Locked Voi
      404576,
      411530, // Nautilus Voi Staking
      //797609, // .voi Registrar
      846601,
      876578, // Staking Registrar
    ];

    const mixinCollections = [
      {
        contractId: 421076,
        name: "Nautilus Locked Voi",
        description: "Nautilus Locked Voi",
        image:
          "https://ipfs.io/ipfs/QmSKyaq1r71DjhV8pUZiBAKkCwB4yQ8xYSQjFS8YEaEdFL",
        isBlacklisted: 0,
        totalSupply: 1,
        uniqueOwners: 1,
        creator: "IX3ZPAWOIDIGDFT3DSUDOC76ZPYWRX7DHQECWS2OJBV2WMSY3THB3ZCUQI",
        globalState: [],
        mintRound: 0,
        burnedSupply: 0,
        firstToken: null,
        featured: 1,
        nostats: 1,
      },
    ];

    const result = [...nautilusData.collections, ...mixinCollections]
      .filter(
        (collection) =>
          !collection.isBlacklisted &&
          collection.totalSupply > 0 &&
          !excludedCollections.includes(collection.contractId)
      )
      .map((collection) => {
        let image = "";
        let name = "";
        let description = "";

        try {
          if (collection?.image) {
            image = collection.image;
            name = collection?.name || "";
            description = collection?.description || "";
          } else if (collection.firstToken?.metadata) {
            const metadata = JSON.parse(collection.firstToken.metadata);
            image = resolveIpfsUrl(metadata.image || "");
            name = (metadata.name || "").replace(/\s*[#~]*\d+$/, "");
            description = metadata.description || "";
          }
        } catch (e) {
          console.error(
            "Error parsing metadata for collection:",
            collection.contractId,
            e
          );
        }

        const getGlobalStateValue = (key: string) =>
          collection.globalState.find((s) => s.key === key)?.value;

        return {
          contractId: collection.contractId,
          totalSupply: collection.totalSupply,
          uniqueOwners: collection.uniqueOwners,
          creator: collection.creator,
          price: Number(getGlobalStateValue("price") || 0) / 1_000_000,
          maxSupply: Number(getGlobalStateValue("maxSupply") || 0),
          launchStart: Number(getGlobalStateValue("launchStart") || 0),
          launchEnd: Number(getGlobalStateValue("launchEnd") || 0),
          image,
          name,
          description,
          activeListings: listingsInfo[collection.contractId]?.count || 0,
          floorPrice:
            listingsInfo[collection.contractId]?.floorPrice === Infinity
              ? null
              : listingsInfo[collection.contractId]?.floorPrice || null,
          featured:
            collection.featured || [797609].includes(collection.contractId)
              ? 1
              : 0,
          nostats: collection.nostats || 0,
          volume24h: volumeInfo[collection.contractId]?.volume24h || 0,
          volume7d: volumeInfo[collection.contractId]?.volume7d || 0,
          volume30d: volumeInfo[collection.contractId]?.volume30d || 0,
          volumeAllTime: volumeInfo[collection.contractId]?.volumeAllTime || 0,
          floor: volumeInfo[collection.contractId]?.floor || 0,
        };
      })
      .sort((a, b) => {
        // First sort by volume24h
        const volume24hDiff = (b.volume24h || 0) - (a.volume24h || 0);
        if (volume24hDiff !== 0) return volume24hDiff;
        
        // If 24h volumes are equal, sort by active listings
        const listingSort = (b.activeListings || 0) - (a.activeListings || 0);
        if (listingSort !== 0) return listingSort;
        
        // If both are equal, continue with other volume metrics
        const volume7dDiff = (b.volume7d || 0) - (a.volume7d || 0);
        if (volume7dDiff !== 0) return volume7dDiff;
        
        const volume30dDiff = (b.volume30d || 0) - (a.volume30d || 0);
        if (volume30dDiff !== 0) return volume30dDiff;
        
        // Finally, check all-time volume
        return (b.volumeAllTime || 0) - (a.volumeAllTime || 0);
      });

    console.log("Processed collections:", result);
    return result;
  }, [nautilusData, listingsData, volumeData]);

  const [creatorFilter, setCreatorFilter] = useState<string | undefined>(
    undefined
  );
  const [filteredCollections, setFilteredCollections] =
    useState(processedCollections);

  useEffect(() => {
    setFilteredCollections(processedCollections);
  }, [processedCollections]);

  // Add loading and error states
  if (
    nautilusStatus === "loading" ||
    listingsStatus === "loading" ||
    !processedCollections
  ) {
    return (
      <Layout>
        <Container maxWidth="xl">
          <SectionHeading>
            <SectionTitle className={isDarkTheme ? "dark" : "light"}>
              Collections
            </SectionTitle>
          </SectionHeading>
          <div className="w-full h-[max(70vh,20rem)] flex items-center justify-center">
            <GridLoader
              size={30}
              color={isDarkTheme ? "#fff" : "#000"}
              className="sm:!hidden !text-primary"
            />
            <GridLoader
              size={50}
              color={isDarkTheme ? "#fff" : "#000"}
              className="!hidden sm:!block !text-primary"
            />
          </div>
        </Container>
      </Layout>
    );
  }

  // Ensure we have data before rendering the table
  if (!Array.isArray(processedCollections)) {
    console.error(
      "processedCollections is not an array:",
      processedCollections
    );
    return null;
  }

  return (
    <Layout>
      <Container maxWidth="xl">
        <SectionHeading>
          <SectionTitle className={isDarkTheme ? "dark" : "light"}>
            Collections
          </SectionTitle>
          <SectionDescription>
            {processedCollections.length} results
          </SectionDescription>
        </SectionHeading>
        {processedCollections.length > 0 ? (
          <NFTCollectionTable
            collections={filteredCollections}
            creatorFilter={creatorFilter}
            onCreatorFilter={(creator) => {
              setCreatorFilter(creator);
              // Filter logic here
              if (!!creator) {
                setFilteredCollections(
                  processedCollections.filter((c) => c.creator === creator)
                );
              } else {
                setFilteredCollections(processedCollections);
              }
            }}
          />
        ) : (
          <div>No collections found</div>
        )}
      </Container>
    </Layout>
  );
};
