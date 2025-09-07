import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Modal,
  Button,
  TextField,
  CircularProgress,
  Stack,
  InputLabel,
  Box,
  Grid,
  FormControl,
  Typography,
  Unstable_Grid2 as Grid2,
  InputAdornment,
} from "@mui/material";
import PaymentCurrencyRadio, {
  defaultCurrencies,
} from "../../PaymentCurrencyRadio";
import { collections } from "../../../contants/games";
import axios from "axios";
import { Token } from "@mui/icons-material";
import TokenSelect from "../../TokenSelect";
import RoyaltyCheckbox from "../../checkboxes/RoyaltyCheckbox";
import { NFTIndexerTokenI, TokenType } from "../../../types";
import BigNumber from "bignumber.js";
import { useSelector } from "react-redux";
import { formatter } from "../../../utils/number";
import CartNftCard from "../../CartNFTCard";
import { TOKEN_NAUT_VOI_STAKING, TOKEN_WVOI } from "../../../contants/tokens";
import { useSmartTokens } from "@/components/Navbar/hooks/collections";
import StakingInformation from "@/components/StakingInformation/StakingInformation";
import { decodeRoyalties } from "@/utils/hf";
import CostBreakdown from "@/components/CostBreakdown";
import { mp } from "ulujs";
import party from "party-js";
import { MIMIR_API } from "@/config/arc72-idx";

// function to split array into chunks

const chunkArray = (arr: any[], chunkSize: number) => {
  const chunkedArray = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunkedArray.push(arr.slice(i, i + chunkSize));
  }
  return chunkedArray;
};

type BatchAction = "list-sale";

interface ListBatchModalProps {
  action: BatchAction;
  open: boolean;
  loading: boolean;
  handleClose: () => void;
  onSave: any;
  title?: string;
  buttonText?: string;
  nfts: NFTIndexerTokenI[];
  clearSelection?: () => void;
}

// Add new interface for sale history
interface SaleHistory {
  price: number;
  timestamp: number;
  buyer: string;
  seller: string;
}

// Update the FloorPriceInfo interface to include collection ID
interface FloorPriceInfo {
  floorPrice: number;
  lastUpdate: number;
  collectionId: string;
}

const ListBatchModal: React.FC<ListBatchModalProps> = ({
  action,
  open,
  loading,
  handleClose,
  onSave,
  title = "Enter Address",
  buttonText = "List NFT",
  nfts,
  clearSelection,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Keep single initial price
  const [initialPrice, setInitialPrice] = useState("");

  // Individual prices for review step
  const [prices, setPrices] = useState<{ [key: string]: string }>({});

  // Helper functions for price management
  const getPriceKey = (nft: NFTIndexerTokenI) =>
    `${nft.contractId}-${nft.tokenId}`;
  const getNFTPrice = (nft: NFTIndexerTokenI) =>
    prices[getPriceKey(nft)] || initialPrice;
  const setNFTPrice = (nft: NFTIndexerTokenI, value: string) => {
    setPrices((prev) => ({
      ...prev,
      [getPriceKey(nft)]: value,
    }));
  };

  // Add new state for token names
  const [tokenNames, setTokenNames] = useState<{ [key: string]: string }>({});

  // Add function to fetch token name
  const fetchTokenName = async (contractId: string, tokenId: string) => {
    try {
      const response = await axios.get(
        `https://api.envoi.sh/api/token/${tokenId}`
      );
      const name = response.data?.results?.[0]?.name;
      return name || `#${tokenId}`;
    } catch (error) {
      console.error("Error fetching token name:", error);
      return `#${tokenId}`;
    }
  };

  // Add new state for sales history
  const [salesHistory, setSalesHistory] = useState<{
    [key: string]: SaleHistory[];
  }>({});

  // Add function to fetch sales history
  const fetchSalesHistory = async (contractId: string, tokenId: string) => {
    try {
      // here
      const response = await axios.get(
        `${MIMIR_API}/nft-indexer/v1/mp/sales?collectionId=${contractId}&tokenId=${tokenId}`
      );
      return response.data.sales.map((sale: any) => ({
        price: sale.price / 1e6,
        timestamp: sale.timestamp,
        buyer: sale.buyer,
        seller: sale.seller,
      }));
    } catch (error) {
      console.error("Error fetching sales history:", error);
      return [];
    }
  };

  // Add new state for mint price
  const [mintPrice, setMintPrice] = useState<number | null>(null);

  // Add function to fetch mint price
  const fetchMintPrice = async (contractId: string) => {
    try {
      const response = await axios.get(
        `https://prod-voi.api.highforge.io/projects/info/${contractId}`
      );
      console.log({ response });
      return response.data.blockchain.state.price / 1e6; // Convert from nano to VOI
    } catch (error) {
      console.error("Error fetching mint price:", error);
      return null;
    }
  };

  // Update handleEnterReview to fetch floor prices for all collections
  const handleEnterReview = async () => {
    const newPrices: { [key: string]: string } = {};
    const newNames: { [key: string]: string } = {};
    const newSalesHistory: { [key: string]: SaleHistory[] } = {};

    await Promise.all(
      nfts.map(async (nft) => {
        const key = getPriceKey(nft);
        newPrices[key] = initialPrice;
        newNames[key] = await fetchTokenName(nft.contractId, nft.tokenId);
        newSalesHistory[key] = await fetchSalesHistory(
          nft.contractId,
          nft.tokenId
        );
      })
    );

    // Fetch mint price for the first NFT's contract
    if (nfts.length > 0) {
      const mintPriceValue = await fetchMintPrice(nfts[0].contractId);
      setMintPrice(mintPriceValue);
    }

    console.log({ nfts });

    // Get unique collection IDs
    const collectionIds = [...new Set(nfts.map((nft) => nft.contractId))];

    console.log({ collectionIds });

    // Fetch floor prices for all collections
    await Promise.all(
      collectionIds.map((collectionId) => fetchFloorPrice(collectionId))
    );

    setPrices(newPrices);
    setTokenNames(newNames);
    setSalesHistory(newSalesHistory);
    setStep("review");
  };

  const [royalties, setRoyalties] = useState<boolean>(true);
  const [token, setToken] = useState<any>();

  const defaultCurrency: string = "0";
  const [currency, setCurrency] = useState<string>(defaultCurrency);

  const [showDefaultButton, setShowDefaultButton] = useState<boolean>(true);

  const { isLoading: isLoadingSmartTokens, data: smartTokens } =
    useSmartTokens();
  useEffect(() => {
    if (currency === "0") {
      setToken(
        smartTokens.find((token: TokenType) => token.contractId === TOKEN_WVOI)
      );
    } else {
      /*
      setToken(
        smartTokens.find(
          (token: TokenType) => token.contractId === Number(currency)
        )
      );
      */
    }
  }, [smartTokens, currency]);
  /*
  const smartTokens = useSelector((state: any) => state.smartTokens.tokens);
  const smartTokenStatus = useSelector(
    (state: any) => state.smartTokens.status
  );
  */
  const [progress, setProgress] = useState<number>(0);

  // Add new state for tracking steps
  const [step, setStep] = useState<"price" | "review" | "confirm">("price");

  // Add new state for tracking current NFT index in review
  const [currentReviewIndex, setCurrentReviewIndex] = useState<number>(0);

  // Helper function to check if we're on the last NFT
  const isLastNFT = currentReviewIndex === nfts.length - 1;

  // Add state declarations here
  const [floorPrices, setFloorPrices] = useState<{
    [key: string]: FloorPriceInfo;
  }>({});

  // Rest of the component logic including fetchFloorPrice function
  const fetchFloorPrice = async (collectionId: number) => {
    try {
      // Skip if we already have recent floor price (less than 5 minutes old)
      const existingPrice = floorPrices[collectionId];
      if (
        existingPrice &&
        Date.now() - existingPrice.lastUpdate < 5 * 60 * 1000
      ) {
        return existingPrice;
      }
      const response = await axios.get(
        `${MIMIR_API}/nft-indexer/v1/mp/listings?collectionId=${collectionId}&active=true`
      );
      const listings = response.data.listings || [];
      if (listings.length > 0) {
        const prices = listings.map((sale: any) => Number(sale.price) / 1e6);
        const floor = Math.min(...prices);
        const floorPriceInfo = {
          floorPrice: floor,
          lastUpdate: Date.now(),
          collectionId,
        };
        setFloorPrices((prev) => ({
          ...prev,
          [collectionId]: floorPriceInfo,
        }));
        return floorPriceInfo;
      }
    } catch (error) {
      console.error("Error fetching floor price:", error);
    }
    return null;
  };

  console.log({ floorPrices });

  /* Modal */

  // Update handleSave to use individual prices
  const handleSave = async () => {
    const pricesList = nfts.map((nft) => prices[getPriceKey(nft)]);
    await onSave(pricesList, currency, token, setProgress);
    setShowDefaultButton(false);

    // Trigger confetti from the modal element
    if (modalRef.current) {
      party.confetti(modalRef.current, {
        count: party.variation.range(30, 40),
        size: party.variation.range(0.8, 1.2),
      });
    }

    // Clear selection if the prop is provided
    clearSelection?.();
  };

  const onClose = () => {
    setInitialPrice("");
    setCurrency("0");
    setShowDefaultButton(true);
    handleClose();
  };

  const royaltyInfo = useMemo(() => {
    if (!nfts.length) return null;
    const metadata = JSON.parse(nfts[0]?.metadata || "{}");
    const royalties = metadata.royalties || {};
    return decodeRoyalties(royalties);
  }, [nfts]);

  const [mpFee, royaltyFee, gameFee] = useMemo(() => {
    const mpFee = 500 / 10000;
    const royaltyFee = (royaltyInfo?.royaltyPoints || 0) / 10000;
    const gameFee = 0.0; // 10% game fee
    return [mpFee, royaltyFee, gameFee];
  }, [initialPrice, royaltyInfo]);

  console.log({ mpFee, royaltyFee, gameFee, royaltyInfo });

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="address-modal-title"
      aria-describedby="address-modal-description"
      sx={{
        bgcolor: "rgba(0, 0, 0, 0.5)",
        "& .MuiModal-backdrop": {
          backgroundColor: "rgba(0, 0, 0, 0.5)",
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
          bgcolor: "#1e1e1e",
          color: "#ffffff",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
          p: { xs: 2, sm: 2.5, md: 3 },
          minHeight: { xs: "200px", sm: "300px" },
          width: { xs: "95%", sm: "80%", md: "35vw" },
          maxWidth: "500px",
          maxHeight: { xs: "90vh", sm: "80vh" },
          overflow: "auto",
          borderRadius: { xs: "12px", sm: "16px" },
          transition: "all 0.2s ease-in-out",
        }}
      >
        <h2
          id="address-modal-title"
          style={{
            marginBottom: "16px",
            fontSize: { xs: "1.25rem", sm: "1.5rem" },
            fontWeight: 600,
          }}
        >
          {step === "price"
            ? title
            : step === "review"
            ? "Review Listing Details"
            : "Confirm Listing"}
        </h2>
        {true || !loading ? (
          <>
            {step === "price" && (
              <>
                <Grid2
                  container
                  spacing={1}
                  columns={16}
                  sx={{
                    overflowX: "hidden",
                    overflowY: "auto",
                    maxHeight: { xs: "45vh", sm: "55vh" },
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 1,
                    "& > .MuiGrid2-root": {
                      width: "100% !important",
                      maxWidth: "100% !important",
                      flexBasis: "unset !important",
                      height: "100%",
                    },
                  }}
                >
                  {nfts.map((nft: NFTIndexerTokenI, index) => (
                    <Grid2 key={`${nft.contractId}-${nft.tokenId}`}>
                      <Box
                        sx={{
                          aspectRatio: "1",
                          width: "100%",
                          height: "100%",
                        }}
                      >
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
                    </Grid2>
                  ))}
                </Grid2>
                <Stack sx={{ mt: { xs: 2, sm: 3 } }} gap={{ xs: 1, sm: 2 }}>
                  <Box>
                    {!loading && progress === 0 && (
                      <TextField
                        id="price"
                        variant="outlined"
                        value={initialPrice}
                        fullWidth
                        margin="normal"
                        onChange={(e) => setInitialPrice(e.target.value)}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Typography
                                sx={{
                                  color: "white",
                                  opacity: 1,
                                  fontWeight: 400,
                                }}
                              >
                                VOI
                              </Typography>
                            </InputAdornment>
                          ),
                          sx: {
                            color: "white",
                            fontSize: { xs: "0.9rem", sm: "1rem" },
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
                          "& label": {
                            color: "rgba(255, 255, 255, 0.7)",
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                          },
                          "& label.Mui-focused": {
                            color: "white",
                          },
                        }}
                      />
                    )}
                  </Box>

                  {showDefaultButton && (
                    <Button
                      disabled={!initialPrice || loading}
                      size="large"
                      fullWidth
                      variant="contained"
                      onClick={handleEnterReview}
                      sx={{
                        py: { xs: 1, sm: 1.5 },
                        textTransform: "none",
                        fontSize: { xs: "1rem", sm: "1.1rem" },
                        fontWeight: 500,
                        borderRadius: { xs: "8px", sm: "12px" },
                        "&:hover": {
                          transform: "translateY(-1px)",
                          boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)",
                        },
                      }}
                    >
                      Review Listing
                    </Button>
                  )}
                </Stack>
              </>
            )}

            {step === "review" && (
              <>
                <Stack spacing={2}>
                  <Box
                    sx={{
                      p: 2,
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                    }}
                  >
                    <Grid container spacing={2} alignItems="flex-start">
                      <Grid item xs={4}>
                        <Box sx={{ aspectRatio: "1", width: "100%" }}>
                          <CartNftCard
                            token={nfts[currentReviewIndex]}
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
                      <Grid item xs={8}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{ mb: 1 }}
                        >
                          <Typography variant="subtitle1">
                            {tokenNames[
                              getPriceKey(nfts[currentReviewIndex])
                            ] ||
                              nfts[currentReviewIndex].name ||
                              `#${nfts[currentReviewIndex].tokenId}`}
                          </Typography>
                        </Stack>
                        <TextField
                          variant="outlined"
                          value={getNFTPrice(nfts[currentReviewIndex])}
                          fullWidth
                          margin="normal"
                          onChange={(e) =>
                            setNFTPrice(
                              nfts[currentReviewIndex],
                              e.target.value
                            )
                          }
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <Typography
                                  sx={{
                                    color: "white",
                                    opacity: 1,
                                    fontWeight: 400,
                                  }}
                                >
                                  VOI
                                </Typography>
                              </InputAdornment>
                            ),
                            sx: {
                              color: "white",
                              fontSize: { xs: "0.9rem", sm: "1rem" },
                              "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: "rgba(255, 255, 255, 0.3)",
                              },
                              "&:hover .MuiOutlinedInput-notchedOutline": {
                                borderColor: "rgba(255, 255, 255, 0.5)",
                              },
                              "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                                {
                                  borderColor: "white",
                                },
                            },
                          }}
                        />
                        <CostBreakdown
                          price={Number(getNFTPrice(nfts[currentReviewIndex]))}
                          marketplaceFeeRate={mpFee}
                          royaltyFeeRate={
                            [TOKEN_NAUT_VOI_STAKING].includes(
                              nfts[currentReviewIndex].contractId
                            )
                              ? 0
                              : royaltyFee
                          }
                          gamesFeeRate={gameFee}
                          symbol="VOI"
                          darkMode={true}
                          sx={{ color: "white", mt: 2 }}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      textAlign: "center",
                      color: "rgba(255, 255, 255, 0.7)",
                    }}
                  >
                    Reviewing {currentReviewIndex + 1} of {nfts.length}
                  </Typography>

                  {/* Move floor price to appear right after mint price */}
                  {mintPrice !== null && (
                    <Box sx={{ mt: 2, mb: 1 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                      >
                        Mint Price
                      </Typography>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: "8px",
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                          mt: 0.5,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ color: "rgba(255, 255, 255, 0.9)" }}
                        >
                          {mintPrice.toFixed(2)} VOI
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Floor price section */}
                  {floorPrices[nfts[currentReviewIndex].contractId] && (
                    <Box sx={{ mt: 2 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                      >
                        Collection Floor Price
                      </Typography>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: "8px",
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                          mt: 0.5,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            color: "rgba(255, 255, 255, 0.9)",
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>
                            {floorPrices[
                              nfts[currentReviewIndex].contractId
                            ].floorPrice.toFixed(2)}{" "}
                            VOI
                          </span>
                          <span
                            style={{
                              color: "rgba(255, 255, 255, 0.5)",
                              fontSize: "0.8em",
                            }}
                          >
                            Last updated:{" "}
                            {new Date(
                              floorPrices[
                                nfts[currentReviewIndex].contractId
                              ].lastUpdate
                            ).toLocaleTimeString()}
                          </span>
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Add sales history section */}
                  <Box sx={{ mt: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 1, color: "rgba(255, 255, 255, 0.7)" }}
                    >
                      Sales History
                    </Typography>
                    {salesHistory[getPriceKey(nfts[currentReviewIndex])]
                      ?.length > 0 ? (
                      <Stack spacing={1}>
                        {salesHistory[getPriceKey(nfts[currentReviewIndex])]
                          .sort((a, b) => b.timestamp - a.timestamp)
                          .slice(0, 3)
                          .map((sale, index) => (
                            <Box
                              key={index}
                              sx={{
                                p: 1,
                                borderRadius: "8px",
                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                              }}
                            >
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                              >
                                <Typography
                                  variant="body2"
                                  sx={{ color: "rgba(255, 255, 255, 0.9)" }}
                                >
                                  {sale.price.toFixed(2)} VOI
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ color: "rgba(255, 255, 255, 0.6)" }}
                                >
                                  {new Date(
                                    sale.timestamp * 1000
                                  ).toLocaleDateString()}
                                </Typography>
                              </Stack>
                            </Box>
                          ))}
                      </Stack>
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{ color: "rgba(255, 255, 255, 0.5)" }}
                      >
                        No previous sales found
                      </Typography>
                    )}
                  </Box>
                </Stack>

                <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                  {currentReviewIndex === 0 && (
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => setStep("confirm")}
                      sx={{
                        py: { xs: 1, sm: 1.5 },
                        textTransform: "none",
                        fontSize: { xs: "1rem", sm: "1.1rem" },
                        fontWeight: 500,
                        borderRadius: { xs: "8px", sm: "12px" },
                        borderColor: "rgba(255, 255, 255, 0.3)",
                        color: "white",
                        "&:hover": {
                          borderColor: "white",
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                        },
                      }}
                    >
                      Skip Review
                    </Button>
                  )}

                  {currentReviewIndex > 0 && (
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => setCurrentReviewIndex((prev) => prev - 1)}
                      sx={{
                        py: { xs: 1, sm: 1.5 },
                        textTransform: "none",
                        fontSize: { xs: "1rem", sm: "1.1rem" },
                        fontWeight: 500,
                        borderRadius: { xs: "8px", sm: "12px" },
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
                  )}

                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => {
                      if (isLastNFT) {
                        setStep("confirm");
                      } else {
                        setCurrentReviewIndex((prev) => prev + 1);
                      }
                    }}
                    sx={{
                      py: { xs: 1, sm: 1.5 },
                      textTransform: "none",
                      fontSize: { xs: "1rem", sm: "1.1rem" },
                      fontWeight: 500,
                      borderRadius: { xs: "8px", sm: "12px" },
                      "&:hover": {
                        transform: "translateY(-1px)",
                        boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)",
                      },
                    }}
                  >
                    {isLastNFT ? "Continue to Confirmation" : "Next"}
                  </Button>
                </Stack>
              </>
            )}

            {step === "confirm" && (
              <>
                <Typography sx={{ mb: 2 }}>
                  You are about to list {nfts.length} item
                  {nfts.length > 1 ? "s" : ""} with the following prices:
                </Typography>

                <Stack spacing={1} sx={{ mb: 3 }}>
                  {nfts.map((nft, index) => (
                    <Box
                      key={getPriceKey(nft)}
                      sx={{
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                        p: 1,
                      }}
                    >
                      <Grid container spacing={1} alignItems="center">
                        <Grid item xs={3} sm={2}>
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
                                  borderRadius: "6px",
                                },
                              }}
                            />
                          </Box>
                        </Grid>
                        <Grid item xs={9} sm={10}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{
                              width: "100%",
                              px: 1,
                            }}
                          >
                            <Typography
                              sx={{
                                color: "rgba(255, 255, 255, 0.9)",
                                fontSize: "0.9rem",
                                fontWeight: 500,
                              }}
                            >
                              {nft.name || `#${nft.tokenId}`}
                            </Typography>
                            <Typography
                              sx={{
                                color: "white",
                                fontWeight: 600,
                                fontSize: "1rem",
                              }}
                            >
                              {getNFTPrice(nft)} VOI
                            </Typography>
                          </Stack>
                        </Grid>
                      </Grid>

                      {floorPrices[nft.contractId] && (
                        <Typography
                          sx={{
                            color: "rgba(255, 255, 255, 0.6)",
                            fontSize: "0.8rem",
                            mt: 0.5,
                            pl: 1,
                          }}
                        >
                          Floor:{" "}
                          {floorPrices[nft.contractId].floorPrice.toFixed(2)}{" "}
                          VOI
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>

                <Stack spacing={2}>
                  {showDefaultButton && (
                    <Button
                      disabled={loading}
                      size="large"
                      fullWidth
                      variant="contained"
                      onClick={handleSave}
                      sx={{
                        py: { xs: 1, sm: 1.5 },
                        textTransform: "none",
                        fontSize: { xs: "1rem", sm: "1.1rem" },
                        fontWeight: 500,
                        borderRadius: { xs: "8px", sm: "12px" },
                        "&:hover": {
                          transform: "translateY(-1px)",
                          boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)",
                        },
                      }}
                    >
                      {loading ? "Pending transaction..." : buttonText}
                    </Button>
                  )}
                  {showDefaultButton && (
                    <Button
                      size="large"
                      fullWidth
                      variant="outlined"
                      onClick={() => setStep("review")}
                      sx={{
                        py: { xs: 1, sm: 1.5 },
                        textTransform: "none",
                        fontSize: { xs: "1rem", sm: "1.1rem" },
                        fontWeight: 500,
                        borderRadius: { xs: "8px", sm: "12px" },
                        borderColor: "rgba(255, 255, 255, 0.3)",
                        color: "white",
                        "&:hover": {
                          borderColor: "white",
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                        },
                      }}
                    >
                      Back to Review
                    </Button>
                  )}
                </Stack>
              </>
            )}

            <Button
              size="large"
              fullWidth
              variant="outlined"
              onClick={handleClose}
              sx={{
                mt: 2,
                py: { xs: 1, sm: 1.5 },
                textTransform: "none",
                fontSize: { xs: "1rem", sm: "1.1rem" },
                fontWeight: 500,
                borderRadius: { xs: "8px", sm: "12px" },
              }}
            >
              Close
            </Button>
          </>
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
              padding: "20px",
            }}
          >
            <CircularProgress size={200} />
          </div>
        )}
      </Box>
    </Modal>
  );
};

export default ListBatchModal;
