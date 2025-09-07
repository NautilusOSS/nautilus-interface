import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  CircularProgress,
  Grid,
  Alert,
  Link,
} from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import Layout from "@/layouts/Default";
import axios from "axios";
import {
  ARC72_INDEXER_API,
  NFT_NAVIGATOR_API,
  HIGHFORGE_CDN,
  MIMIR_API,
} from "@/config/arc72-idx";
import { stripTrailingZeroBytes } from "@/utils/string";
import styled from "styled-components";
import { abi, CONTRACT } from "ulujs";
import { getAlgorandClients } from "@/wallets";
import {
  getListingEvent,
  makeContract,
  offerABI,
} from "@/components/Tools/OffersManager";
import algosdk, { waitForConfirmation } from "algosdk";
import { useWallet } from "@txnlab/use-wallet-react";
import { alpha } from "@mui/material/styles";
import { toast } from "react-toastify";
import { bigIntToUint8Array } from "@/lib/utils";

interface Offer {
  listingId: number;
  contractId: number;
  tokenId: number;
  offerer: string;
  owner?: string;
  price: number;
  currency: number;
  createTimestamp: number;
  expireTimestamp: number;
  active: number;
}

interface TokenMetadata {
  name: string;
  image: string;
  description?: string;
  properties?: any;
}

const StyledCard = styled(Card)<{ $isDark?: boolean }>`
  background: ${(props) =>
    props.$isDark ? "rgba(40, 40, 40, 0.85)" : "rgba(255, 255, 255, 0.95)"};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  border-radius: 32px;
  margin-bottom: 24px;
  box-shadow: ${(props) =>
    props.$isDark
      ? "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.1)"
      : "0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.8)"};
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${(props) =>
      props.$isDark
        ? "0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.15)"
        : "0 12px 40px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.9)"};
  }
`;

const ImageContainer = styled(Box)<{ $isDark?: boolean }>`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 24px;
  overflow: hidden;
  background: ${(props) =>
    props.$isDark
      ? "linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)"
      : "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)"};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  box-shadow: ${(props) =>
    props.$isDark
      ? "inset 0 1px 1px rgba(255, 255, 255, 0.1), 0 4px 12px rgba(0, 0, 0, 0.3)"
      : "inset 0 1px 1px rgba(255, 255, 255, 0.8), 0 4px 12px rgba(0, 0, 0, 0.1)"};
`;

const TokenImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s ease;
  border-radius: 24px;
`;

const ImagePlaceholder = styled(Box)<{ $isDark?: boolean }>`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(props) =>
    props.$isDark
      ? "linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)"
      : "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)"};
  color: ${(props) => (props.$isDark ? "#888" : "#999")};
  font-size: 14px;
  text-align: center;
  border-radius: 24px;
`;

const StyledButton = styled(Button)<{ $isDark?: boolean }>`
  background: ${(props) =>
    props.$isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"};
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)"};
  color: ${(props) => (props.$isDark ? "#fff" : "#000")};
  backdrop-filter: blur(10px);
  border-radius: 20px;
  text-transform: none;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.08)"};
    border-color: ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.15)"};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const StyledChip = styled(Chip)<{ $isDark?: boolean }>`
  background: ${(props) =>
    props.$isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"};
  color: ${(props) => (props.$isDark ? "#fff" : "#000")};
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)"};
  backdrop-filter: blur(10px);
  font-weight: 500;
  border-radius: 20px;

  &.MuiChip-colorSuccess {
    background: ${(props) =>
      props.$isDark ? "rgba(76, 175, 80, 0.2)" : "rgba(76, 175, 80, 0.1)"};
    color: ${(props) => (props.$isDark ? "#4caf50" : "#2e7d32")};
    border-color: ${(props) =>
      props.$isDark ? "rgba(76, 175, 80, 0.3)" : "rgba(76, 175, 80, 0.2)"};
  }

  &.MuiChip-colorError {
    background: ${(props) =>
      props.$isDark ? "rgba(244, 67, 54, 0.2)" : "rgba(244, 67, 54, 0.1)"};
    color: ${(props) => (props.$isDark ? "#f44336" : "#d32f2f")};
    border-color: ${(props) =>
      props.$isDark ? "rgba(244, 67, 54, 0.3)" : "rgba(244, 67, 54, 0.2)"};
  }
`;

const InfoBox = styled(Box)<{ $isDark?: boolean }>`
  margin-bottom: 16px;
  padding: 16px;
  background: ${(props) =>
    props.$isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)"};
  border-radius: 20px;
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"};
  backdrop-filter: blur(5px);
`;

const OfferDetail: React.FC = () => {
  const { activeAccount, signTransactions } = useWallet();
  const { txid } = useParams<{ txid: string }>();
  const navigate = useNavigate();
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  const [offer, setOffer] = useState<Offer | null>(null);
  const [tokenMetadata, setTokenMetadata] = useState<TokenMetadata | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchOfferByTxId = async () => {
      if (!txid) {
        setError("No transaction ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { algodClient, indexerClient } = getAlgorandClients();

        // Fetch events from the marketplace contract
        const ci = makeContract(
          8329112,
          activeAccount?.address || algosdk.getApplicationAddress(8329112),
          algodClient,
          indexerClient
        );

        const events = await ci.getEvents({
          txid: txid,
        });

        const listEvents = (
          events.find((e: any) => e.name === "e_offer_ListEvent")?.events || []
        ).map(getListingEvent);

        const foundOffer = listEvents[0];

        if (!foundOffer) {
          setError("Offer not found with the provided transaction ID");
          setLoading(false);
          return;
        }

        const boxName = bigIntToUint8Array(
          BigInt(foundOffer.listingId),
          new Uint8Array([0])
        );

        const box = await algodClient
          .getApplicationBoxByName(8329112, boxName)
          .do()
          .catch((error) => {
            console.error("Error getting application box:", error);
            return null;
          });

        setOffer({
          ...foundOffer,
          hasBox: box ? 1 : 0,
        });

        // Fetch token metadata
        if (foundOffer.contractId && foundOffer.tokenId) {
          try {
            const requestUrl = `${MIMIR_API}/nft-indexer/v1/tokens?contractId=${foundOffer.contractId}&tokenId=${foundOffer.tokenId}`;
            console.log({ requestUrl });
            const metadataResponse = await axios.get(requestUrl);

            console.log({ metadataResponse });
            if (
              metadataResponse.data.tokens &&
              metadataResponse.data.tokens.length > 0
            ) {
              const token = metadataResponse.data.tokens[0];
              const tokenMetadata = JSON.parse(token.metadata);
              const tokenData = {
                name: tokenMetadata.name || `Token #${foundOffer.tokenId}`,
                image: tokenMetadata.image || "",
                description: tokenMetadata.description,
                properties: tokenMetadata.properties,
              };

              setOffer({
                ...foundOffer,
                owner: token.owner,
                hasBox: box ? 1 : 0,
              });
              setTokenMetadata(tokenData);
            }
          } catch (metadataError) {
            console.warn("Failed to fetch token metadata:", metadataError);
            setTokenMetadata({
              name: `Token #${foundOffer.tokenId}`,
              image: "",
            });
          }
        }
      } catch (error) {
        console.error("Error fetching offer:", error);
        setError("Failed to fetch offer details");
      } finally {
        setLoading(false);
      }
    };

    fetchOfferByTxId();
  }, [txid]);

  const formatPrice = (price: number) => {
    return (price / 1e6).toFixed(2);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  // Enhanced image URL resolution following app patterns
  const resolveImageUrl = (imageUrl: string, metadataURI?: string) => {
    if (!imageUrl) return "";

    // Handle IPFS URLs
    if (imageUrl.startsWith("ipfs://")) {
      return `https://ipfs.io/ipfs/${imageUrl.slice(7)}`;
    }

    // Handle already resolved IPFS URLs
    if (imageUrl.startsWith("https://ipfs.io/ipfs/")) {
      return imageUrl;
    }

    // Handle direct HTTP/HTTPS URLs
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    // Fallback to CDN if metadataURI is available (following app pattern)
    if (offer && metadataURI && !imageUrl.startsWith("data:")) {
      const collectionsMissingImage = [35720076, 797609];
      if (!collectionsMissingImage.includes(Number(offer.contractId))) {
        return `${HIGHFORGE_CDN}/i/${encodeURIComponent(
          stripTrailingZeroBytes(metadataURI)
        )}?w=400`;
      }
    }

    return imageUrl;
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const handleViewCollection = () => {
    if (offer) {
      navigate(`/collection/${offer.contractId}`);
    }
  };

  const handleViewToken = () => {
    if (offer) {
      navigate(`/collection/${offer.contractId}/token/${offer.tokenId}`);
    }
  };

  // Helper functions to determine button visibility
  const canAcceptOffer = () => {
    if (!offer || !activeAccount) return false;
    // User can accept offer if they are the token owner and offer is active
    return offer.owner === activeAccount.address && offer.active === 1;
  };

  const canCancelOffer = () => {
    if (!offer || !activeAccount) return false;
    // User can cancel offer if they are the offerer and offer is active
    return (
      (offer.active === 1 && offer.offerer === activeAccount.address) ||
      activeAccount.address ===
        "JFHP4IL4D3I4FDQFWGFDMCZLFSLGQAL4OZGQQKTPEE4SSW6JXSYQPZY2PM"
    );
  };

  // Handler functions for offer actions
  const handleAcceptOffer = async () => {
    if (!offer || !activeAccount) return;

    setActionLoading(true);
    try {
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

      const ciArc200 = new CONTRACT(
        ctcInfoNV,
        algodClient,
        indexerClient,
        abi.nt200,
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

      // preflight arc200 balance

      const arc200BalanceR = await ciArc200.arc200_balanceOf(offer.offerer);

      const arc200Balance = arc200BalanceR.returnValue;

      console.log("arc200Balance", Number(arc200Balance) / 1e6);

      if (!arc200BalanceR.success) {
        toast.error("Failed to check ARC200 balance", arc200BalanceR.error);
        return;
      }

      if (Number(arc200Balance) < Number(offer.price)) {
        toast.error("Insufficient ARC200 balance");
        return;
      }

      // preflight arc200 approval

      const arc200AllowanceR = await ciArc200.arc200_allowance(
        offer.offerer,
        algosdk.getApplicationAddress(ctcInfoMP213)
      );

      const arc200Allowance = arc200AllowanceR.returnValue;

      console.log("arc200Allowance", Number(arc200Allowance) / 1e6);

      if (!arc200AllowanceR.success) {
        toast.error("Failed to check ARC200 allowance", arc200AllowanceR.error);
        return;
      }

      if (arc200AllowanceR.allowance < BigInt(offer.price)) {
        toast.error("Insufficient ARC200 allowance");
        return;
      }

      const buildN = [];

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

      // Accept offer transaction
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

      const stxns = await signTransactions([
        customR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        ),
      ]);

      const { txId } = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();

      await waitForConfirmation(algodClient, txId, 4);

      toast.success("Offer accepted successfully!");
      // Navigate back to offers page or refresh the current page
      navigate("/offers");
    } catch (error: any) {
      console.error("Error accepting offer:", error);
      toast.error("Failed to accept offer: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOffer = async () => {
    if (!offer || !activeAccount) return;

    setActionLoading(true);
    try {
      console.log("Cancelling offer", offer);
      const offerId = offer.listingId;
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
      console.log("Cancelling offer", offer.listingId);
      {
        const txnO = (
          await builder.mp.a_offer_deleteListing(BigInt(offer.listingId))
        ).obj;
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

      alert("Offer cancelled successfully!");
    } catch (error) {
      console.error("Error cancelling offer:", error);
      alert("Failed to cancel offer. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  console.log({ tokenMetadata });

  if (loading) {
    return (
      <Layout>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <CircularProgress sx={{ color: isDarkTheme ? "#fff" : "#000" }} />
        </Box>
      </Layout>
    );
  }

  if (error || !offer) {
    return (
      <Layout>
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            sx={{ color: isDarkTheme ? "#fff" : "#000", mb: 2 }}
          >
            Offer Not Found
          </Typography>
          <Alert
            severity="error"
            sx={{
              mb: 2,
              backgroundColor: isDarkTheme
                ? "rgba(244, 67, 54, 0.1)"
                : "rgba(244, 67, 54, 0.05)",
              border: `1px solid ${
                isDarkTheme
                  ? "rgba(244, 67, 54, 0.3)"
                  : "rgba(244, 67, 54, 0.2)"
              }`,
              color: isDarkTheme ? "#f44336" : "#d32f2f",
              backdropFilter: "blur(10px)",
            }}
          >
            {error || "The requested offer could not be found."}
          </Alert>
          <StyledButton
            $isDark={isDarkTheme}
            variant="contained"
            onClick={() => navigate("/offers")}
          >
            View All Offers
          </StyledButton>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography
          variant="h4"
          sx={{ color: isDarkTheme ? "#fff" : "#000", mb: 2 }}
        >
          Offer Details
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: isDarkTheme ? "#ccc" : "#666", mb: 2 }}
        >
          Transaction ID: {txid}
        </Typography>
        <Link
          href={`https://voiager.xyz/transaction/${txid}`}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            color: isDarkTheme ? "#4fc3f7" : "#1976d2",
            textDecoration: "none",
            fontSize: "0.9rem",
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            mb: 4,
            "&:hover": {
              textDecoration: "underline",
              color: isDarkTheme ? "#81d4fa" : "#1565c0",
            },
          }}
        >
          View on Explorer ↗
        </Link>
      </Box>

      <Grid container spacing={3}>
        {/* Token Image and Basic Info */}
        <Grid item xs={12} md={6}>
          <StyledCard $isDark={isDarkTheme}>
            <CardContent>
              <ImageContainer $isDark={isDarkTheme}>
                {tokenMetadata?.image && !imageError ? (
                  <TokenImage
                    src={resolveImageUrl(tokenMetadata.image)}
                    alt={tokenMetadata.name}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    style={{
                      opacity: imageLoading ? 0 : 1,
                      display: imageError ? "none" : "block",
                    }}
                  />
                ) : null}

                {imageLoading && tokenMetadata?.image && !imageError && (
                  <CircularProgress
                    size={40}
                    sx={{ color: isDarkTheme ? "#fff" : "#000" }}
                  />
                )}

                {(!tokenMetadata?.image || imageError) && (
                  <ImagePlaceholder $isDark={isDarkTheme}>
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        🖼️
                      </Typography>
                      <Typography variant="caption">
                        {imageError ? "Image unavailable" : "No image"}
                      </Typography>
                    </Box>
                  </ImagePlaceholder>
                )}
              </ImageContainer>

              <Typography
                variant="h5"
                sx={{
                  color: isDarkTheme ? "#fff" : "#000",
                  mb: 1,
                  textAlign: "center",
                  fontWeight: 600,
                }}
              >
                {tokenMetadata?.name || `Token #${offer.tokenId}`}
              </Typography>

              {tokenMetadata?.description && (
                <Typography
                  variant="body2"
                  sx={{
                    color: isDarkTheme ? "#ccc" : "#666",
                    mb: 2,
                    textAlign: "center",
                    lineHeight: 1.5,
                  }}
                >
                  {tokenMetadata.description}
                </Typography>
              )}
            </CardContent>
          </StyledCard>
        </Grid>

        {/* Offer Details */}
        <Grid item xs={12} md={6}>
          <StyledCard $isDark={isDarkTheme}>
            <CardContent>
              <Typography
                variant="h6"
                sx={{
                  color: isDarkTheme ? "#fff" : "#000",
                  mb: 3,
                  fontWeight: 600,
                }}
              >
                Offer Information
              </Typography>

              <InfoBox $isDark={isDarkTheme}>
                <Typography
                  variant="body2"
                  sx={{ color: isDarkTheme ? "#ccc" : "#666", mb: 1 }}
                >
                  Status
                </Typography>
                <StyledChip
                  $isDark={isDarkTheme}
                  label={"Active"}
                  color={"success"}
                  size="small"
                />
              </InfoBox>

              <InfoBox $isDark={isDarkTheme}>
                <Typography
                  variant="body2"
                  sx={{ color: isDarkTheme ? "#ccc" : "#666", mb: 1 }}
                >
                  Price
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: isDarkTheme ? "#fff" : "#000",
                    fontWeight: 600,
                    fontSize: "1.25rem",
                  }}
                >
                  {formatPrice(offer.price)}{" "}
                  {offer.currency === 8324600 ? "VOI" : offer.currency}
                </Typography>
              </InfoBox>

              <InfoBox $isDark={isDarkTheme}>
                <Typography
                  variant="body2"
                  sx={{ color: isDarkTheme ? "#ccc" : "#666", mb: 1 }}
                >
                  Offerer
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: isDarkTheme ? "#fff" : "#000",
                    fontFamily: "monospace",
                    fontSize: "0.9rem",
                  }}
                >
                  {formatAddress(offer.offerer)}
                </Typography>
              </InfoBox>

              {offer.owner && (
                <InfoBox $isDark={isDarkTheme}>
                  <Typography
                    variant="body2"
                    sx={{ color: isDarkTheme ? "#ccc" : "#666", mb: 1 }}
                  >
                    Owner
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: isDarkTheme ? "#fff" : "#000",
                      fontFamily: "monospace",
                      fontSize: "0.9rem",
                    }}
                  >
                    {formatAddress(offer.owner)}
                  </Typography>
                </InfoBox>
              )}

              <InfoBox $isDark={isDarkTheme}>
                <Typography
                  variant="body2"
                  sx={{ color: isDarkTheme ? "#ccc" : "#666", mb: 1 }}
                >
                  Collection ID
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ color: isDarkTheme ? "#fff" : "#000" }}
                >
                  {offer.contractId}
                </Typography>
              </InfoBox>

              <InfoBox $isDark={isDarkTheme}>
                <Typography
                  variant="body2"
                  sx={{ color: isDarkTheme ? "#ccc" : "#666", mb: 1 }}
                >
                  Token ID
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ color: isDarkTheme ? "#fff" : "#000" }}
                >
                  {offer.tokenId}
                </Typography>
              </InfoBox>

              <InfoBox $isDark={isDarkTheme}>
                <Typography
                  variant="body2"
                  sx={{ color: isDarkTheme ? "#ccc" : "#666", mb: 1 }}
                >
                  Created
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ color: isDarkTheme ? "#fff" : "#000" }}
                >
                  {formatDate(offer.createTimestamp)}
                </Typography>
              </InfoBox>

              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
                {/* Action buttons - conditionally rendered */}
                {canAcceptOffer() && (
                  <StyledButton
                    $isDark={isDarkTheme}
                    variant="contained"
                    onClick={handleAcceptOffer}
                    disabled={actionLoading}
                    size="small"
                    sx={{
                      background: isDarkTheme
                        ? "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)"
                        : "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",
                      color: "#fff",
                      fontWeight: 600,
                      "&:hover": {
                        background: isDarkTheme
                          ? "linear-gradient(135deg, #5cbf60 0%, #3e8d42 100%)"
                          : "linear-gradient(135deg, #5cbf60 0%, #3e8d42 100%)",
                      },
                      "&:disabled": {
                        background: isDarkTheme
                          ? "rgba(76, 175, 80, 0.3)"
                          : "rgba(76, 175, 80, 0.3)",
                        color: isDarkTheme ? "#888" : "#999",
                      },
                    }}
                  >
                    {actionLoading ? "Accepting..." : "Accept Offer"}
                  </StyledButton>
                )}

                {canCancelOffer() && (
                  <StyledButton
                    $isDark={isDarkTheme}
                    variant="contained"
                    onClick={handleCancelOffer}
                    disabled={actionLoading}
                    size="small"
                    sx={{
                      background: isDarkTheme
                        ? "linear-gradient(135deg, #f44336 0%, #d32f2f 100%)"
                        : "linear-gradient(135deg, #f44336 0%, #d32f2f 100%)",
                      color: "#fff",
                      fontWeight: 600,
                      "&:hover": {
                        background: isDarkTheme
                          ? "linear-gradient(135deg, #ff5346 0%, #e33f3f 100%)"
                          : "linear-gradient(135deg, #ff5346 0%, #e33f3f 100%)",
                      },
                      "&:disabled": {
                        background: isDarkTheme
                          ? "rgba(244, 67, 54, 0.3)"
                          : "rgba(244, 67, 54, 0.3)",
                        color: isDarkTheme ? "#888" : "#999",
                      },
                    }}
                  >
                    {actionLoading ? "Cancelling..." : "Cancel Offer"}
                  </StyledButton>
                )}

                {/* Existing navigation buttons */}
                <StyledButton
                  $isDark={isDarkTheme}
                  variant="outlined"
                  onClick={handleViewToken}
                  size="small"
                >
                  View Token
                </StyledButton>
                <StyledButton
                  $isDark={isDarkTheme}
                  variant="outlined"
                  onClick={handleViewCollection}
                  size="small"
                >
                  View Collection
                </StyledButton>
                <StyledButton
                  $isDark={isDarkTheme}
                  variant="outlined"
                  onClick={() => navigate("/offers")}
                  size="small"
                >
                  All Offers
                </StyledButton>
              </Box>
            </CardContent>
          </StyledCard>
        </Grid>
      </Grid>
    </Layout>
  );
};

export default OfferDetail;
