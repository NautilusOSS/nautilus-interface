import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Modal,
  Button,
  TextField,
  CircularProgress,
  Stack,
  Box,
  Grid,
  Typography,
  Chip,
  Card,
  CardContent,
  Divider,
  Alert,
  InputAdornment,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Close as CloseIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  History as HistoryIcon,
  PriceCheck as PriceCheckIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import TokenSelect from "../../TokenSelect";
import { TokenType } from "../../../types";
import BigNumber from "bignumber.js";
import { useSelector } from "react-redux";
import { formatter } from "../../../utils/number";
import CartNftCard from "../../CartNFTCard";
import axios from "axios";
import { useSmartTokens } from "@/components/Navbar/hooks/collections";
import CostBreakdown from "@/components/CostBreakdown";
import { decodeRoyalties } from "@/utils/hf";

interface EnhancedListModalProps {
  open: boolean;
  loading: boolean;
  onCloseModal: () => void;
  onSave: (price: string, currency: string, token: any) => Promise<void>;
  title?: string;
  buttonText?: string;
  nft: any;
  clearSelection?: () => void;
}

interface SaleHistory {
  price: number;
  timestamp: number;
  buyer: string;
  seller: string;
}

interface FloorPriceInfo {
  floorPrice: number;
  lastUpdate: number;
  collectionId: string;
}

const EnhancedListModal: React.FC<EnhancedListModalProps> = ({
  open,
  loading,
  onCloseModal,
  onSave,
  title = "List NFT for Sale",
  buttonText = "List for Sale",
  nft,
  clearSelection,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const modalRef = useRef<HTMLDivElement>(null);

  // State management
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<string>("0");
  const [token, setToken] = useState<any>();
  const [step, setStep] = useState<"details" | "review" | "confirm">("details");
  const [salesHistory, setSalesHistory] = useState<SaleHistory[]>([]);
  const [floorPrice, setFloorPrice] = useState<FloorPriceInfo | null>(null);
  const [mintPrice, setMintPrice] = useState<number | null>(null);
  const [tokenName, setTokenName] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Smart tokens hook
  const { isLoading: isLoadingSmartTokens, data: smartTokens } = useSmartTokens();

  // Fetch token name
  useEffect(() => {
    const fetchTokenName = async () => {
      try {
        const response = await axios.get(
          `https://api.envoi.sh/api/token/${nft.tokenId}`
        );
        const name = response.data?.results?.[0]?.name;
        setTokenName(name || `#${nft.tokenId}`);
      } catch (error) {
        setTokenName(`#${nft.tokenId}`);
      }
    };
    if (nft?.tokenId) {
      fetchTokenName();
    }
  }, [nft]);

  // Fetch sales history
  useEffect(() => {
    const fetchSalesHistory = async () => {
      try {
        const response = await axios.get(
          `https://mainnet-idx.nautilus.sh/nft-indexer/v1/mp/sales?collectionId=${nft.contractId}&tokenId=${nft.tokenId}`
        );
        const sales = response.data.sales.map((sale: any) => ({
          price: sale.price / 1e6,
          timestamp: sale.timestamp,
          buyer: sale.buyer,
          seller: sale.seller,
        }));
        setSalesHistory(sales);
      } catch (error) {
        console.error("Error fetching sales history:", error);
      }
    };
    if (nft?.contractId && nft?.tokenId) {
      fetchSalesHistory();
    }
  }, [nft]);

  // Fetch floor price
  useEffect(() => {
    const fetchFloorPrice = async () => {
      try {
        const response = await axios.get(
          `https://mainnet-idx.nautilus.sh/nft-indexer/v1/mp/listings?collectionId=${nft.contractId}&active=true`
        );
        const listings = response.data.listings || [];
        if (listings.length > 0) {
          const prices = listings.map((sale: any) => Number(sale.price) / 1e6);
          const floor = Math.min(...prices);
          setFloorPrice({
            floorPrice: floor,
            lastUpdate: Date.now(),
            collectionId: nft.contractId,
          });
        }
      } catch (error) {
        console.error("Error fetching floor price:", error);
      }
    };
    if (nft?.contractId) {
      fetchFloorPrice();
    }
  }, [nft]);

  // Fetch mint price
  useEffect(() => {
    const fetchMintPrice = async () => {
      try {
        const response = await axios.get(
          `https://prod-voi.api.highforge.io/projects/info/${nft.contractId}`
        );
        const mintPriceValue = response.data.blockchain.state.price / 1e6;
        setMintPrice(mintPriceValue);
      } catch (error) {
        console.error("Error fetching mint price:", error);
      }
    };
    if (nft?.contractId) {
      fetchMintPrice();
    }
  }, [nft]);

  // Set token based on currency
  useEffect(() => {
    if (currency === "0") {
      setToken(smartTokens.find((token: TokenType) => token.contractId === 34099056));
    } else {
      setToken(smartTokens.find((token: TokenType) => token.contractId === Number(currency)));
    }
  }, [smartTokens, currency]);

  // Royalty calculation
  const royaltyInfo = useMemo(() => {
    if (!nft) return null;
    const metadata = JSON.parse(nft?.metadata || "{}");
    const royalties = metadata.royalties || {};
    return decodeRoyalties(royalties);
  }, [nft]);

  const [mpFee, royaltyFee, gameFee] = useMemo(() => {
    const mpFee = 500 / 10000; // 5% marketplace fee
    const royaltyFee = (royaltyInfo?.royaltyPoints || 0) / 10000;
    const gameFee = 0.0; // No game fee for now
    return [mpFee, royaltyFee, gameFee];
  }, [royaltyInfo]);

  // Validation
  const isValidPrice = useMemo(() => {
    const numPrice = Number(price);
    return !isNaN(numPrice) && numPrice > 0;
  }, [price]);

  const handleSave = async () => {
    if (!isValidPrice) {
      setError("Please enter a valid price");
      return;
    }
    setError("");
    await onSave(price, currency, token);
    onCloseModal();
    clearSelection?.();
  };

  const onClose = () => {
    setPrice("");
    setCurrency("0");
    setStep("details");
    setError("");
    onCloseModal();
  };

  const handleNext = () => {
    if (!isValidPrice) {
      setError("Please enter a valid price");
      return;
    }
    setError("");
    setStep("review");
  };

  const handleBack = () => {
    setStep("details");
  };

  const handleConfirm = () => {
    setStep("confirm");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="enhanced-list-modal-title"
      aria-describedby="enhanced-list-modal-description"
      sx={{
        bgcolor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(8px)",
        "& .MuiModal-backdrop": {
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(8px)",
        },
      }}
    >
      <Box
        ref={modalRef}
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
          color: "#ffffff",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)",
          p: { xs: 2, sm: 3 },
          minHeight: { xs: "200px", sm: "300px" },
          width: { xs: "95%", sm: "80%", md: "600px" },
          maxWidth: "600px",
          maxHeight: { xs: "90vh", sm: "80vh" },
          overflow: "auto",
          borderRadius: { xs: "16px", sm: "20px" },
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          "&:hover": {
            boxShadow: "0 25px 80px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.15)",
          },
        }}
      >
        {/* Header */}
        <Box sx={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          mb: 3,
          pb: 2,
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
        }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              fontSize: { xs: "1.25rem", sm: "1.5rem" },
              background: "linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {step === "details" ? title : step === "review" ? "Review Listing" : "Confirm Listing"}
          </Typography>
          <IconButton
            onClick={onClose}
            sx={{
              color: "rgba(255, 255, 255, 0.7)",
              bgcolor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              "&:hover": { 
                color: "white",
                bgcolor: "rgba(255, 255, 255, 0.2)",
                transform: "scale(1.1)",
              },
              transition: "all 0.2s ease-in-out",
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 4 }}>
            <CircularProgress size={60} />
          </Box>
        ) : (
          <>
            {step === "details" && (
              <Stack spacing={3}>
                {/* NFT Display */}
                <Card
                  sx={{
                    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "16px",
                    backdropFilter: "blur(10px)",
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
                    transition: "all 0.3s ease-in-out",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4)",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                    },
                  }}
                >
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={4}>
                        <Box sx={{ aspectRatio: "1", width: "100%" }}>
                          <CartNftCard
                            token={nft}
                            imageOnly={true}
                            hideOverlay={true}
                            size="small"
                            sx={{
                              height: "100%",
                              width: "100%",
                              "& img": {
                                objectFit: "cover",
                                width: "100%",
                                height: "100%",
                                borderRadius: "8px",
                              },
                            }}
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={8}>
                        <Stack spacing={1}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {tokenName || nft.name || `#${nft.tokenId}`}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
                            Collection: {nft.collectionName || "Unknown Collection"}
                          </Typography>
                          {floorPrice && (
                            <Chip
                              icon={<TrendingUpIcon />}
                              label={`Floor: ${floorPrice.floorPrice.toFixed(2)} VOI`}
                              size="small"
                              sx={{
                                bgcolor: "rgba(255, 255, 255, 0.1)",
                                color: "white",
                                width: "fit-content",
                              }}
                            />
                          )}
                        </Stack>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Price Input */}
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
                    Listing Price
                  </Typography>
                  <TextField
                    fullWidth
                    variant="outlined"
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value);
                      setError("");
                    }}
                    placeholder="Enter price in VOI"
                    error={!!error}
                    helperText={error}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Typography sx={{ color: "white", opacity: 0.8 }}>
                            VOI
                          </Typography>
                        </InputAdornment>
                      ),
                      sx: {
                        color: "white",
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "rgba(255, 255, 255, 0.3)",
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: "rgba(255, 255, 255, 0.5)",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "white",
                        },
                      },
                    }}
                    sx={{
                      "& .MuiInputLabel-root": {
                        color: "rgba(255, 255, 255, 0.7)",
                      },
                      "& .MuiInputLabel-root.Mui-focused": {
                        color: "white",
                      },
                    }}
                  />
                </Box>

                {/* Token Selection */}
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
                    Payment Currency
                  </Typography>
                  <TokenSelect
                    filter={(t: TokenType) => !["LPT", "ARC200LT"].includes(t.symbol)}
                    onChange={(newValue: any) => {
                      if (!newValue) {
                        setCurrency("");
                        return;
                      }
                      const currency = `${newValue?.contractId || "0"}`;
                      if (currency === "0") {
                        setCurrency(`0,34099056`);
                      } else {
                        setCurrency(`${newValue?.contractId}`);
                      }
                    }}
                  />
                </Box>

                {/* Market Information */}
                {(floorPrice || mintPrice || salesHistory.length > 0) && (
                  <Card
                    sx={{
                      bgcolor: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                    }}
                  >
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
                        Market Information
                      </Typography>
                      <Stack spacing={2}>
                        {floorPrice && (
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
                              Floor Price
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {floorPrice.floorPrice.toFixed(2)} VOI
                            </Typography>
                          </Box>
                        )}
                        {mintPrice && (
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
                              Mint Price
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {mintPrice.toFixed(2)} VOI
                            </Typography>
                          </Box>
                        )}
                        {salesHistory.length > 0 && (
                          <Box>
                            <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.7)", mb: 1 }}>
                              Recent Sales
                            </Typography>
                            <Stack spacing={1}>
                              {salesHistory.slice(0, 3).map((sale, index) => (
                                <Box key={index} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.9)" }}>
                                    {sale.price.toFixed(2)} VOI
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.6)" }}>
                                    {new Date(sale.timestamp * 1000).toLocaleDateString()}
                                  </Typography>
                                </Box>
                              ))}
                            </Stack>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={onClose}
                    sx={{
                      py: 1.5,
                      textTransform: "none",
                      fontSize: "1rem",
                      fontWeight: 500,
                      borderRadius: "12px",
                      borderColor: "rgba(255, 255, 255, 0.3)",
                      color: "white",
                      "&:hover": {
                        borderColor: "white",
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                      },
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleNext}
                    disabled={!isValidPrice}
                    sx={{
                      py: 1.5,
                      textTransform: "none",
                      fontSize: "1rem",
                      fontWeight: 500,
                      borderRadius: "12px",
                      "&:hover": {
                        transform: "translateY(-1px)",
                        boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)",
                      },
                    }}
                  >
                    Continue
                  </Button>
                </Stack>
              </Stack>
            )}

            {step === "review" && (
              <Stack spacing={3}>
                {/* NFT Review */}
                <Card
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "12px",
                  }}
                >
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={4}>
                        <Box sx={{ aspectRatio: "1", width: "100%" }}>
                          <CartNftCard
                            token={nft}
                            imageOnly={true}
                            hideOverlay={true}
                            size="small"
                            sx={{
                              height: "100%",
                              width: "100%",
                              "& img": {
                                objectFit: "cover",
                                width: "100%",
                                height: "100%",
                                borderRadius: "8px",
                              },
                            }}
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={8}>
                        <Stack spacing={1}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {tokenName || nft.name || `#${nft.tokenId}`}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
                            Collection: {nft.collectionName || "Unknown Collection"}
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 600, color: "#4CAF50" }}>
                            {price} VOI
                          </Typography>
                        </Stack>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Cost Breakdown */}
                <Card
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "12px",
                  }}
                >
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
                      Cost Breakdown
                    </Typography>
                    <CostBreakdown
                      price={Number(price)}
                      marketplaceFeeRate={mpFee}
                      royaltyFeeRate={royaltyFee}
                      gamesFeeRate={gameFee}
                      symbol="VOI"
                      darkMode={true}
                      sx={{ color: "white" }}
                    />
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleBack}
                    sx={{
                      py: 1.5,
                      textTransform: "none",
                      fontSize: "1rem",
                      fontWeight: 500,
                      borderRadius: "12px",
                      borderColor: "rgba(255, 255, 255, 0.3)",
                      color: "white",
                      background: "rgba(255, 255, 255, 0.05)",
                      backdropFilter: "blur(10px)",
                      transition: "all 0.3s ease-in-out",
                      "&:hover": {
                        borderColor: "white",
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        transform: "translateY(-2px)",
                        boxShadow: "0 8px 25px rgba(0, 0, 0, 0.3)",
                      },
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleConfirm}
                    sx={{
                      py: 1.5,
                      textTransform: "none",
                      fontSize: "1rem",
                      fontWeight: 500,
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      boxShadow: "0 8px 25px rgba(102, 126, 234, 0.4)",
                      transition: "all 0.3s ease-in-out",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 12px 35px rgba(102, 126, 234, 0.6)",
                        background: "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)",
                      },
                      "&:disabled": {
                        background: "rgba(255, 255, 255, 0.1)",
                        color: "rgba(255, 255, 255, 0.5)",
                      },
                    }}
                  >
                    Confirm Listing
                  </Button>
                </Stack>
              </Stack>
            )}

            {step === "confirm" && (
              <Stack spacing={3}>
                <Alert severity="info" sx={{ bgcolor: "rgba(33, 150, 243, 0.1)", color: "white" }}>
                  <Typography variant="body2">
                    You are about to list <strong>{tokenName || nft.name || `#${nft.tokenId}`}</strong> for{" "}
                    <strong>{price} VOI</strong>. Please confirm this action.
                  </Typography>
                </Alert>

                <Card
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "12px",
                  }}
                >
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
                      Final Details
                    </Typography>
                    <Stack spacing={2}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
                          NFT
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {tokenName || nft.name || `#${nft.tokenId}`}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
                          Price
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {price} VOI
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
                          Marketplace Fee
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {(Number(price) * mpFee).toFixed(2)} VOI
                        </Typography>
                      </Box>
                      {royaltyFee > 0 && (
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
                            Royalty Fee
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {(Number(price) * royaltyFee).toFixed(2)} VOI
                          </Typography>
                        </Box>
                      )}
                      <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)" }} />
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          You'll Receive
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: "#4CAF50" }}>
                          {(Number(price) * (1 - mpFee - royaltyFee)).toFixed(2)} VOI
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleBack}
                    sx={{
                      py: 1.5,
                      textTransform: "none",
                      fontSize: "1rem",
                      fontWeight: 500,
                      borderRadius: "12px",
                      borderColor: "rgba(255, 255, 255, 0.3)",
                      color: "white",
                      "&:hover": {
                        borderColor: "white",
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                      },
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSave}
                    disabled={loading}
                    sx={{
                      py: 1.5,
                      textTransform: "none",
                      fontSize: "1rem",
                      fontWeight: 500,
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      boxShadow: "0 8px 25px rgba(102, 126, 234, 0.4)",
                      transition: "all 0.3s ease-in-out",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 12px 35px rgba(102, 126, 234, 0.6)",
                        background: "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)",
                      },
                      "&:disabled": {
                        background: "rgba(255, 255, 255, 0.1)",
                        color: "rgba(255, 255, 255, 0.5)",
                      },
                    }}
                  >
                    {loading ? "Processing..." : buttonText}
                  </Button>
                </Stack>
              </Stack>
            )}
          </>
        )}
      </Box>
    </Modal>
  );
};

export default EnhancedListModal; 