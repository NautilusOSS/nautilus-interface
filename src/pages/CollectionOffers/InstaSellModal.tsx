// InstaSellModal component for selecting NFT to sell and offer to accept
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Alert,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Divider,
  Chip,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Close as CloseIcon } from "@mui/icons-material";
import { toast } from "react-toastify";
import axios from "axios";
import { MIMIR_API } from "../../config/arc72-idx";
import { formatAmount } from "../../utils/format";
import { shortenAddress } from "../../utils/string";

const StyledDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    borderRadius: 24,
    maxWidth: "900px",
    width: "95%",
  },
}));

const NFTSelectionCard = styled(Card)<{ $isDark?: boolean; $selected?: boolean }>`
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid ${(props) => 
    props.$selected 
      ? props.$isDark ? "#ff5722" : "#d84315"
      : props.$isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
  };
  background: ${(props) =>
    props.$isDark ? "rgba(40, 40, 40, 0.85)" : "rgba(255, 255, 255, 0.95)"};
  
  &:hover {
    transform: translateY(-2px);
    border-color: ${(props) => props.$isDark ? "#ff5722" : "#d84315"};
  }
`;

const OfferCard = styled(Card)<{ $isDark?: boolean; $selected?: boolean }>`
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid ${(props) => 
    props.$selected 
      ? props.$isDark ? "#4caf50" : "#2e7d32"
      : props.$isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
  };
  background: ${(props) =>
    props.$isDark ? "rgba(40, 40, 40, 0.85)" : "rgba(255, 255, 255, 0.95)"};
  
  &:hover {
    transform: translateY(-2px);
    border-color: ${(props) => props.$isDark ? "#4caf50" : "#2e7d32"};
  }
`;

const NFTImage = styled(CardMedia)`
  aspect-ratio: 1;
  object-fit: cover;
`;

interface NFT {
  tokenId: number;
  metadata: any;
  image?: string;
  name?: string;
}

interface CollectionOffer {
  id: string;
  collectionId: string;
  offerAmount: string;
  price: string;
  currency: string | number;
  offerer: string;
  timestamp: number;
  createTimestamp: number;
  status: "active" | "expired" | "accepted" | "cancelled";
  expiresAt?: number;
  floorDifference?: number;
  listingId: number;
}

interface InstaSellModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedNFT: NFT, selectedOffer: CollectionOffer) => void;
  collectionId: string;
  activeAccount: string | null;
  isDarkTheme: boolean;
  offers: CollectionOffer[];
  loading?: boolean;
}

const InstaSellModal: React.FC<InstaSellModalProps> = ({
  open,
  onClose,
  onConfirm,
  collectionId,
  activeAccount,
  isDarkTheme,
  offers,
  loading = false,
}) => {
  const [userNFTs, setUserNFTs] = useState<NFT[]>([]);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<CollectionOffer | null>(null);
  const [nftsLoading, setNftsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'nft' | 'offer'>('nft');

  // Set default offer to highest when offers change
  useEffect(() => {
    if (offers.length > 0 && !selectedOffer) {
      const highestOffer = offers.reduce((max, offer) => {
        const price = parseFloat(offer.price);
        return price > parseFloat(max.price) ? offer : max;
      });
      setSelectedOffer(highestOffer);
    }
  }, [offers, selectedOffer]);

  // Fetch user's NFTs from the collection
  const fetchUserNFTs = async () => {
    if (!activeAccount || !collectionId) return;

    try {
      setNftsLoading(true);
      setError(null);

      const response = await axios.get(`${MIMIR_API}/nft-indexer/v1/tokens`, {
        params: {
          contractId: Number(collectionId),
          owner: activeAccount,
          limit: 100, // Adjust as needed
        },
      });

      if (response.data.tokens) {
        const nfts: NFT[] = response.data.tokens.map((token: any) => {
          let metadata = null;
          let image = "";
          let name = `#${token.tokenId}`;

          if (token.metadata) {
            try {
              metadata = JSON.parse(token.metadata);
              image = metadata.image || "";
              name = metadata.name || `#${token.tokenId}`;
            } catch (e) {
              console.warn("Failed to parse metadata for token", token.tokenId);
            }
          }

          return {
            tokenId: token.tokenId,
            metadata,
            image,
            name,
          };
        });

        setUserNFTs(nfts);
      }
    } catch (err) {
      console.error("Error fetching user NFTs:", err);
      setError("Failed to load your NFTs");
    } finally {
      setNftsLoading(false);
    }
  };

  useEffect(() => {
    if (open && activeAccount) {
      fetchUserNFTs();
      setCurrentStep('nft');
      setSelectedNFT(null);
      setSelectedOffer(null);
    }
  }, [open, activeAccount, collectionId]);

  const handleNFTSelect = (nft: NFT) => {
    setSelectedNFT(nft);
    setCurrentStep('offer');
  };

  const handleOfferSelect = (offer: CollectionOffer) => {
    setSelectedOffer(offer);
  };

  const handleBack = () => {
    setCurrentStep('nft');
  };

  const handleConfirm = () => {
    if (!selectedNFT || !selectedOffer) {
      toast.error("Please select both an NFT and an offer");
      return;
    }
    onConfirm(selectedNFT, selectedOffer);
  };

  const resolveImageUrl = (imageUrl: string) => {
    if (!imageUrl) return "";

    if (imageUrl.startsWith("ipfs://")) {
      return `https://ipfs.io/ipfs/${imageUrl.slice(7)}`;
    }

    if (imageUrl.startsWith("https://ipfs.io/ipfs/")) {
      return imageUrl;
    }

    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    return imageUrl;
  };

  const renderNFTSelection = () => (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="body1"
          sx={{
            color: isDarkTheme ? "#ccc" : "#666",
            mb: 1,
          }}
        >
          Choose which NFT you want to sell
        </Typography>
      </Box>

      {nftsLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : userNFTs.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No NFTs Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You don't own any NFTs from this collection
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {userNFTs.map((nft) => (
            <Grid item xs={6} sm={4} md={3} key={nft.tokenId}>
              <NFTSelectionCard
                $isDark={isDarkTheme}
                $selected={selectedNFT?.tokenId === nft.tokenId}
                onClick={() => handleNFTSelect(nft)}
              >
                <NFTImage
                  component="img"
                  height="140"
                  image={
                    nft.image
                      ? resolveImageUrl(nft.image)
                      : "/placeholder-nft.png"
                  }
                  alt={nft.name}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder-nft.png";
                  }}
                />
                <CardContent sx={{ p: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      textAlign: "center",
                      color: isDarkTheme ? "#fff" : "#000",
                    }}
                  >
                    {nft.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      textAlign: "center",
                      display: "block",
                      color: isDarkTheme ? "#ccc" : "#666",
                    }}
                  >
                    Token #{nft.tokenId}
                  </Typography>
                </CardContent>
              </NFTSelectionCard>
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );

  const renderOfferSelection = () => (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="body1"
          sx={{
            color: isDarkTheme ? "#ccc" : "#666",
            mb: 1,
          }}
        >
          Choose which offer to accept for{" "}
          <Typography
            component="span"
            sx={{
              color: isDarkTheme ? "#fff" : "#000",
              fontWeight: 600,
            }}
          >
            {selectedNFT?.name || `#${selectedNFT?.tokenId}`}
          </Typography>
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {offers.map((offer) => (
          <Grid item xs={12} sm={6} key={offer.listingId}>
            <OfferCard
              $isDark={isDarkTheme}
              $selected={selectedOffer?.listingId === offer.listingId}
              onClick={() => handleOfferSelect(offer)}
            >
              <CardContent sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: isDarkTheme ? "#4caf50" : "#2e7d32",
                      fontWeight: 700,
                    }}
                  >
                    {formatAmount(Number(offer.price))} VOI
                  </Typography>
                  {selectedOffer?.listingId === offer.listingId && (
                    <Chip
                      label="Highest"
                      size="small"
                      color="success"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography variant="body2" sx={{ color: isDarkTheme ? "#ccc" : "#666" }}>
                    From:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {shortenAddress(offer.offerer)}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: isDarkTheme ? "#aaa" : "#777" }}>
                  Offer #{offer.listingId}
                </Typography>
              </CardContent>
            </OfferCard>
          </Grid>
        ))}
      </Grid>
    </>
  );

  return (
    <StyledDialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {currentStep === 'nft' ? 'Select NFT to Sell' : 'Select Offer to Accept'}
        </Typography>
        <Button
          onClick={onClose}
          sx={{ minWidth: "auto", p: 1 }}
          disabled={loading}
        >
          <CloseIcon />
        </Button>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {currentStep === 'nft' ? renderNFTSelection() : renderOfferSelection()}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        {currentStep === 'offer' && (
          <Button onClick={handleBack} disabled={loading}>
            Back
          </Button>
        )}
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!selectedNFT || !selectedOffer || loading}
          sx={{
            background: currentStep === 'nft' 
              ? "linear-gradient(135deg, #ff5722 0%, #d84315 100%)"
              : "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",
            "&:hover": {
              background: currentStep === 'nft'
                ? "linear-gradient(135deg, #ff6633 0%, #e64a19 100%)"
                : "linear-gradient(135deg, #66bb6a 0%, #388e3c 100%)",
            },
          }}
        >
          {loading ? (
            <CircularProgress size={20} sx={{ color: "#fff" }} />
          ) : currentStep === 'nft' ? (
            "Next"
          ) : (
            `Sell for ${selectedOffer ? formatAmount(Number(selectedOffer.price)) : '0'} VOI`
          )}
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

export default InstaSellModal;
