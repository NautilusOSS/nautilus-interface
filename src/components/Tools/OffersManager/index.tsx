import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
} from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { useWallet } from "@txnlab/use-wallet-react";
import { useNavigate, useParams } from "react-router-dom";
import { CONTRACT, abi } from "ulujs";
import { toast } from "react-toastify";
import styled from "styled-components";
import { MIMIR_API } from "@/config/arc72-idx";
import axios from "axios";
import BigNumber from "bignumber.js";
import { getAlgorandClients } from "@/wallets";
import algosdk, { waitForConfirmation } from "algosdk";

export const decodeMpCurrencyData = (currencyData: any) => {
  const ct = currencyData[0];
  const currency = ct == "00" ? 0 : parseInt(currencyData[1], 16);
  const price =
    ct == "00" ? Number(currencyData[1]) : parseInt(currencyData[2], 16);
  return { currency, price };
};

export const getListingEvent = (event: any[]) => {
  // Parse listing event data
  const { currency, price } = decodeMpCurrencyData(event[7]);
  return {
    transactionId: event[0],
    createRound: Number(event[1]),
    createTimestamp: Number(event[2]),
    listingId: Number(event[3]),
    contractId: Number(event[4]),
    tokenId: event[5].toString(),
    offerer: event[6],
    price,
    currency,
  };
};

export const getDeleteEvent = (event: any) => {
  // Parse delete event data
  return {
    transactionId: event[0],
    createRound: Number(event[1]),
    createTimestamp: Number(event[2]),
    listingId: Number(event[3]),
  };
};

export const offerABI = {
  name: "mp213",
  desc: "mp213",
  methods: [
    // a_offer_listSC(uint64,uint256,uint64,uint256)uint256
    {
      name: "a_offer_listSC",
      args: [
        { type: "uint64", name: "contractId" },
        { type: "uint256", name: "tokenId" },
        { type: "uint64", name: "paymentTokenId" },
        { type: "uint256", name: "price" },
      ],
      returns: {
        type: "uint256",
      },
    },
    // a_offer_acceptSC(uint256)void
    {
      name: "a_offer_acceptSC",
      args: [
        {
          type: "uint256",
          name: "listingId",
        },
      ],
      returns: {
        type: "void",
      },
    },
    // a_offer_deleteListing(uint256)void
    {
      name: "a_offer_deleteListing",
      args: [
        {
          type: "uint256",
          name: "listingId",
        },
      ],
      returns: {
        type: "void",
      },
    },
  ],
  events: [
    // ListEvent: [UInt256, Contract, UInt256, Address, Price], // ListId, CollectionId, TokenId, ListAddr, ListPrice
    // AcceptEvent: [UInt256], // ListId
    // DeleteListingEvent: [UInt256], // ListId
    {
      name: "e_offer_ListEvent",
      args: [
        {
          type: "uint256",
          name: "listingId",
        },
        {
          type: "uint64",
          name: "contractId",
        },
        {
          type: "uint256",
          name: "tokenId",
        },
        {
          type: "address",
          name: "listAddr",
        },
        {
          type: "(byte,byte[40])",
          name: "listPrice",
        },
      ],
    },
    {
      name: "e_offer_AcceptEvent",
      args: [
        {
          type: "uint256",
          name: "listingId",
        },
      ],
    },
    {
      name: "e_offer_DeleteListingEvent",
      args: [
        {
          type: "uint256",
          name: "listingId",
        },
      ],
    },
  ],
};

export const makeContract = (
  contractId: number,
  address: string,
  algodClient: any,
  indexerClient: any
) =>
  new CONTRACT(contractId, algodClient, indexerClient, offerABI, {
    addr: address,
    sk: new Uint8Array(0),
  });

const OfferCard = styled.div<{ $isDark: boolean }>`
  background-color: ${(props) => (props.$isDark ? "#2a2a2a" : "#fff")};
  border: 1px solid ${(props) => (props.$isDark ? "#444" : "#e0e0e0")};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  transition: all 0.2s ease-in-out;
  position: relative;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${(props) =>
      props.$isDark
        ? "0 4px 20px rgba(255, 255, 255, 0.1)"
        : "0 4px 20px rgba(0, 0, 0, 0.1)"};
  }
`;

const TokenImage = styled.img`
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 12px;
`;

interface Offer {
  transactionId: string;
  listingId: number;
  contractId: number;
  tokenId: number;
  offerer: string;
  price: number;
  currency: number;
  createTimestamp: number;
  expireTimestamp: number;
  active: number;
  nftImage?: string;
  nftName?: string;
  status: "active" | "expired" | "accepted";
  outBound?: boolean;
  inBound?: boolean;
}

interface OffersManagerProps {}

const OffersManager: React.FC<OffersManagerProps> = () => {
  const { address: addressParam } = useParams();
  const { activeAccount, signTransactions } = useWallet();
  const navigate = useNavigate();
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use provided address or fall back to active account
  const targetAddress = addressParam || activeAccount?.address;

  const resolveImageUrl = (imageUrl: string): string => {
    if (!imageUrl) return "/placeholder-nft.png";
    if (imageUrl.startsWith("http")) return imageUrl;
    if (imageUrl.startsWith("ipfs://")) {
      return `https://ipfs.io/ipfs/${imageUrl.slice(7)}`;
    }
    return imageUrl;
  };

  // todo add abi to ulujs
  const fetchMyOffers = useCallback(async () => {
    setLoading(true);
    try {
      if (!targetAddress) {
        throw new Error("No address provided");
      }

      const { algodClient, indexerClient } = getAlgorandClients();

      // Fetch events from the marketplace contract
      const ci = makeContract(
        8329112,
        targetAddress,
        algodClient,
        indexerClient
      );

      const tokenData =
        (
          await axios.get(
            `${MIMIR_API}/nft-indexer/v1/tokens?owner=${targetAddress}&limit=1000`
          )
        )?.data?.tokens || [];
      console.log({ tokenData });
      const holdings = tokenData.map(
        (token: any) => `${token.contractId}-${token.tokenId}`
      );

      const status = await algodClient.status().do();
      const lastRound = status["last-round"];

      const events = await ci.getEvents({
        minRound: Math.max(lastRound - 2e6, 0),
      });

      const listEvents =
        events.find((event: any) => event.name === "e_offer_ListEvent")
          ?.events || [];

      const acceptEvents =
        events.find((event: any) => event.name === "e_offer_AcceptEvent")
          ?.events || [];

      const deleteEvents =
        events.find((event: any) => event.name === "e_offer_DeleteListingEvent")
          ?.events || [];

      const listings = listEvents.map(getListingEvent);
      const deletions = deleteEvents.map(getDeleteEvent);
      const accepts = acceptEvents.map(getDeleteEvent);

      console.log({ listings, deletions, accepts });

      const offers = listings.filter(
        (offer: any) =>
          !accepts.some(
            (accept: any) => accept.listingId === offer.listingId
          ) &&
          !deletions.some(
            (deletion: any) => deletion.listingId === offer.listingId
          )
      );

      console.log(offers);

      // Normalize and process offers
      const processedOffers = offers.map((offer: any) => ({
        ...offer,
        status: getOfferStatus(offer.expireTimestamp),
        price: offer.price, // Convert from microAlgos to Algos
        outBound: targetAddress === offer.offerer,
        inBound: holdings.includes(`${offer.contractId}-${offer.tokenId}`),
      }));

      // Fetch NFT metadata for each offer
      const offersWithMetadata = await Promise.all(
        processedOffers.map(async (offer: any) => {
          const metadata = await fetchNFTMetadata(
            offer.contractId,
            offer.tokenId
          );
          return {
            ...offer,
            nftImage: metadata ? resolveImageUrl(metadata.image) : undefined,
            nftName: metadata?.name || `Token #${offer.tokenId}`,
          };
        })
      );

      const filteredOffers = offersWithMetadata.filter(
        (offer: any) => offer.outBound || offer.inBound
      );

      setOffers(filteredOffers);
    } catch (error) {
      console.error("Error fetching offers:", error);
      toast.error("Failed to fetch offers");
    } finally {
      setLoading(false);
    }
  }, [targetAddress]);

  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => !!offer.nftName || !!offer.nftImage);
  }, [offers]);

  const getOfferStatus = (
    expireTimestamp: number
  ): "active" | "expired" | "accepted" => {
    const now = Date.now() / 1000;
    if (expireTimestamp < now) return "expired";
    return "active";
  };

  const getOfferId = (offer: Offer): number => {
    const offerId = offer.listingId;
    if (!offerId) {
      console.error("No valid offer ID found in:", offer);
      toast.error("Invalid offer format");
      throw new Error("Invalid offer ID");
    }
    return offerId;
  };

  const fetchManager = async () => {
    if (!targetAddress) {
      toast.error("Please provide an address or connect your wallet");
      return;
    }
    await fetchMyOffers();
  };

  const handleCancelOffer = async (offer: Offer) => {
    try {
      if (!activeAccount) {
        toast.error("Please connect your wallet");
        return;
      }

      const offerId = getOfferId(offer);
      const ctcInfoMP213 = 8329112; // mp213 offers
      const ctcInfoNV = 8324600; // Nautilus Voi NV
      const { algodClient, indexerClient } = getAlgorandClients();

      const ci = new CONTRACT(
        ctcInfoMP213,
        algodClient,
        indexerClient,
        abi.custom,
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );

      const ciARC200 = new CONTRACT(
        ctcInfoNV,
        algodClient,
        indexerClient,
        abi.nt200,
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );

      const builder = {
        mp: new CONTRACT(
          ctcInfoMP213,
          algodClient,
          indexerClient,
          offerABI,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
        arc200: new CONTRACT(
          ctcInfoNV,
          algodClient,
          indexerClient,
          abi.nt200,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
      };

      const buildN = [];

      // Cancel offer transaction
      {
        const txnO = (await builder.mp.a_offer_deleteListing(BigInt(offerId)))
          .obj;
        buildN.push(txnO);
      }

      console.log({ buildN });

      ci.setFee(2000);
      ci.setExtraTxns(buildN);
      ci.setEnableGroupResourceSharing(true);

      const customR = await ci.custom();

      console.log({ customR });

      if (!customR.success) {
        toast.error("Failed to cancel offer", customR.error);
        return;
      }

      const stxns = await signTransactions([
        customR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        ),
      ]);

      const { txId } = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();

      await waitForConfirmation(algodClient, txId, 4);

      // Remove from local state
      setOffers(filteredOffers.filter((o) => o.listingId !== offerId));
      toast.success("Offer cancelled successfully!");
    } catch (error: any) {
      console.error("Error cancelling offer:", error);
      toast.error("Failed to cancel offer: " + error.message);
    }
  };

  const handleAcceptOffer = async (offer: Offer) => {
    try {
      if (!activeAccount) {
        toast.error("Please connect your wallet");
        return;
      }

      const ctcInfoMP213 = 8329112; // mp213 offers
      const ctcInfoNV = 8324600; // Nautilus Voi NV
      const { algodClient, indexerClient } = getAlgorandClients();

      const ci = new CONTRACT(
        ctcInfoMP213,
        algodClient,
        indexerClient,
        abi.custom,
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );

      const builder = {
        nt200: new CONTRACT(
          ctcInfoNV,
          algodClient,
          indexerClient,
          abi.nt200,
          { addr: activeAccount.address, sk: new Uint8Array(0) },
          true,
          false,
          true
        ),
        mp: new CONTRACT(
          ctcInfoMP213,
          algodClient,
          indexerClient,
          offerABI,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
        arc72: new CONTRACT(
          offer.contractId,
          algodClient,
          indexerClient,
          abi.arc72,
          { addr: activeAccount.address, sk: new Uint8Array(0) },
          true,
          false,
          true
        ),
      };

      const buildN = [];

      // TODO add beacon transaction

      // Approve ARC72
      {
        const txnO = (
          await builder.arc72.arc72_approve(
            algosdk.getApplicationAddress(ctcInfoMP213),
            BigInt(offer.tokenId)
          )
        ).obj;
        buildN.push(txnO);
      }

      // Accept offer transactio
      {
        const txnO = (
          await builder.mp.a_offer_acceptSC(BigInt(offer.listingId))
        ).obj;
        buildN.push(txnO);
      }

      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);
      ci.setFee(4000);

      const customR = await ci.custom();

      console.log({ customR });

      if (!customR.success) {
        toast.error("Failed to accept offer", customR.error);
        return;
      }

      console.log({ customR });

      const stxns = await signTransactions([
        customR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        ),
      ]);

      const { txId } = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();

      await waitForConfirmation(algodClient, txId, 4);

      // Remove from local state
      setOffers(filteredOffers.filter((o) => o.listingId !== offer.listingId));
      toast.success("Offer accepted successfully!");
    } catch (error: any) {
      console.error("Error accepting offer:", error);
      toast.error("Failed to accept offer: " + error.message);
    }
  };

  const handleViewNFT = (offer: Offer) => {
    navigate(`/collection/${offer.contractId}/token/${offer.tokenId}`);
  };

  const handleViewOffer = (offer: Offer) => {
    navigate(`/offer/${offer.transactionId}`);
  };

  const handleViewAuction = (offer: Offer) => {
    navigate(`/collection/${offer.contractId}/token/${offer.tokenId}/trade`);
  };

  const fetchNFTMetadata = async (contractId: number, tokenId: number) => {
    try {
      const response = await axios.get(
        `${MIMIR_API}/nft-indexer/v1/tokens?contractId=${contractId}&tokenId=${tokenId}`
      );
      const nftMetadata = JSON.parse(response.data.tokens[0]?.metadata);
      return nftMetadata;
    } catch (error) {
      console.error("Error fetching NFT metadata:", error);
      return null;
    }
  };

  const formatPrice = (price: number) => {
    return (price / 1e6).toFixed(2);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const isExpired = (offer: Offer) => {
    return Date.now() / 1000 > offer.expireTimestamp;
  };

  useEffect(() => {
    if (targetAddress) {
      fetchMyOffers();
    }
  }, [targetAddress, fetchMyOffers]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h4"
        sx={{ color: isDarkTheme ? "#fff" : "#000", mb: 3 }}
      >
        Offers
      </Typography>

      {!targetAddress ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          {address
            ? "Invalid address provided"
            : "Please connect your wallet to manage your offers"}
        </Alert>
      ) : (
        <>
          <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              onClick={fetchManager}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              Refresh Offers
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              minHeight="200px"
            >
              <CircularProgress />
            </Box>
          ) : filteredOffers.length === 0 ? (
            <Alert severity="info">
              No offers found. Create offers on NFTs to manage them here.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {filteredOffers.map((offer) => (
                <Grid item xs={12} sm={6} md={4} key={offer.listingId}>
                  <OfferCard $isDark={isDarkTheme}>
                    {/* Inbound/Outbound Indicators */}
                    <Box
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        display: "flex",
                        gap: 1,
                        flexDirection: "column",
                      }}
                    >
                      {offer.outBound && (
                        <Chip
                          label="Outbound"
                          size="small"
                          color="primary"
                          variant="filled"
                          sx={{
                            fontSize: "0.7rem",
                            height: "20px",
                            backgroundColor: "#1976d2",
                            color: "white",
                          }}
                        />
                      )}
                      {offer.inBound && (
                        <Chip
                          label="Inbound"
                          size="small"
                          color="secondary"
                          variant="filled"
                          sx={{
                            fontSize: "0.7rem",
                            height: "20px",
                            backgroundColor: "#9c27b0",
                            color: "white",
                          }}
                        />
                      )}
                    </Box>

                    <CardContent>
                      {/* NFT Image */}
                      <TokenImage
                        src={offer.nftImage || "/placeholder-nft.png"}
                        alt={offer.nftName || `Token #${offer.tokenId}`}
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder-nft.png";
                        }}
                      />

                      {/* NFT Info */}
                      <Typography
                        variant="h6"
                        sx={{ color: isDarkTheme ? "#fff" : "#000", mb: 1 }}
                      >
                        {offer.nftName || `Token #${offer.tokenId}`}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: isDarkTheme ? "#ccc" : "#666", mb: 2 }}
                      >
                        Collection #{offer.contractId}
                      </Typography>

                      {/* Offer Details */}
                      <Typography
                        variant="h6"
                        sx={{ color: isDarkTheme ? "#fff" : "#000", mb: 1 }}
                      >
                        {formatPrice(offer.price)}{" "}
                        {offer.currency === 8324600 ? "VOI" : offer.currency}
                      </Typography>

                      {/* Action Buttons */}
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          flexDirection: "column",
                        }}
                      >
                        {offer.inBound &&
                          !isExpired(offer) &&
                          activeAccount && (
                            <Button
                              variant="contained"
                              size="small"
                              fullWidth
                              onClick={() => handleAcceptOffer(offer)}
                              sx={{
                                backgroundColor: "#4caf50",
                                color: "white",
                                "&:hover": {
                                  backgroundColor: "#45a049",
                                },
                              }}
                            >
                              Accept Offer
                            </Button>
                          )}
                        {offer.outBound && activeAccount && (
                          <Button
                            variant="outlined"
                            size="small"
                            fullWidth
                            onClick={() => handleCancelOffer(offer)}
                            disabled={isExpired(offer)}
                            sx={{
                              color: isDarkTheme ? "#fff" : "#000",
                              borderColor: isDarkTheme ? "#666" : "#ccc",
                              "&:hover": {
                                borderColor: isDarkTheme ? "#888" : "#999",
                              },
                            }}
                          >
                            {isExpired(offer) ? "Expired" : "Cancel Offer"}
                          </Button>
                        )}
                        <Button
                          variant="contained"
                          size="small"
                          fullWidth
                          onClick={() => handleViewNFT(offer)}
                          sx={{
                            backgroundColor: "#2196f3",
                            color: "white",
                            "&:hover": {
                              backgroundColor: "#1976d2",
                            },
                          }}
                        >
                          View NFT
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          fullWidth
                          onClick={() => handleViewOffer(offer)}
                          sx={{
                            backgroundColor: "#ff9800",
                            color: "white",
                            "&:hover": {
                              backgroundColor: "#f57c00",
                            },
                          }}
                        >
                          View Offer
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          fullWidth
                          onClick={() => handleViewAuction(offer)}
                          sx={{
                            backgroundColor: "#9c27b0",
                            color: "white",
                            "&:hover": {
                              backgroundColor: "#7b1fa2",
                            },
                          }}
                        >
                          View Trade
                        </Button>
                      </Box>
                    </CardContent>
                  </OfferCard>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
    </Box>
  );
};

export default OffersManager;
