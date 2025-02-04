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

  // Initialize individual prices when entering review step
  const handleEnterReview = () => {
    const newPrices: { [key: string]: string } = {};
    nfts.forEach((nft) => {
      newPrices[getPriceKey(nft)] = initialPrice;
    });
    setPrices(newPrices);
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

  const [mpFee, royaltyFee] = useMemo(() => {
    const mpFee = 500 / 10000;
    const royaltyFee = (royaltyInfo?.royaltyPoints || 0) / 10000;
    return [mpFee, royaltyFee];
  }, [initialPrice, royaltyInfo]);

  console.log({ mpFee, royaltyFee, royaltyInfo });

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
                    }
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
                        <Typography variant="subtitle1" sx={{ mb: 1 }}>
                          {nfts[currentReviewIndex].name ||
                            `#${nfts[currentReviewIndex].tokenId}`}
                        </Typography>
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
