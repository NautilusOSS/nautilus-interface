import React, { useEffect, useState } from "react";
import {
  Modal,
  Button,
  TextField,
  CircularProgress,
  Stack,
  InputLabel,
  Box,
  Typography,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { getAlgorandClients } from "../../../wallets";
import { MListedNFTTokenI } from "../../../types";
import Grid2 from "@mui/material/Unstable_Grid2/Grid2";
import CartNftCard from "../../CartNFTCard";
import { useWallet } from "@txnlab/use-wallet-react";
import { useTheme } from "@mui/material/styles";
import styled from "styled-components";
import { RootState } from "@/store/store";
import { useSelector } from "react-redux";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { namehash, uint8ArrayToBigInt } from "@/utils/namehash";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

interface AddressModalProps {
  open: boolean;
  loading: boolean;
  handleClose: () => void;
  onSave: (address: string, amount: string) => Promise<void>;
  title?: string;
  buttonText?: string;
  nfts: MListedNFTTokenI[];
}

interface EnvoiNameResult {
  name: string;
  address: string;
  metadata?: {
    avatar?: string;
    twitter?: string;
    location?: string;
    "com.github"?: string;
    "com.twitter"?: string;
  };
}

const StyledModalContent = styled(Box)<{ isDark?: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: ${(props) => (props.isDark ? "#121212" : "#ffffff")};
  padding: 40px;
  min-height: 300px;
  min-width: 400px;
  width: 50vw;
  border-radius: 25px;
  border: ${(props) => (props.isDark ? "1px solid #333" : "1px solid #e0e0e0")};
  box-shadow: 0 4px 20px
    rgba(0, 0, 0, ${(props) => (props.isDark ? "0.5" : "0.15")});
  color: ${(props) => (props.isDark ? "#ffffff" : "#000000")};
  overflow: visible;
`;

const StyledModal = styled(Modal)<{ isDark?: boolean }>`
  .MuiBackdrop-root {
    background-color: rgba(
      0,
      0,
      0,
      ${(props) => (props.isDark ? "0.8" : "0.5")}
    );
  }
`;

const AddressModal: React.FC<AddressModalProps> = ({
  nfts,
  open,
  loading,
  handleClose,
  onSave,
  title = "Enter Address",
  buttonText = "Send",
}) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  const { activeAccount } = useWallet();
  const [selectedProfile, setSelectedProfile] =
    useState<EnvoiNameResult | null>(null);
  const [amount, setAmount] = useState("0");
  const [searchInput, setSearchInput] = useState("");
  const [envoiResults, setEnvoiResults] = useState<EnvoiNameResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isNftVerified, setIsNftVerified] = useState<boolean>(false);
  const [isVerifyingName, setIsVerifyingName] = useState(false);
  const [isVerifyingNft, setIsVerifyingNft] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);

  const theme = useTheme();

  const handleSave = async (address: string, amount: string) => {
    await onSave(address, amount);
    setSelectedProfile(null);
    handleClose();
  };

  useEffect(() => {
    if (!selectedProfile) return;
    try {
      const { algodClient } = getAlgorandClients();
      algodClient
        .accountInformation(selectedProfile.address)
        .do()
        .then((accountInfo: any) => {
          setAmount(
            ((accountInfo.amount - accountInfo["min-balance"]) / 1e6).toString()
          );
        })
        .catch((error: any) => {
          setAmount("0");
          console.error(error);
        });
    } catch (error) {
      setAmount("0");
      console.error(error);
    }
  }, [selectedProfile]);

  useEffect(() => {
    const searchEnvoiNames = async () => {
      if (searchInput.length <= 0) {
        setEnvoiResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // Add address validation
        if (searchInput.length === 58 && /^[A-Z2-7]{58}$/.test(searchInput)) {
          setEnvoiResults([{ name: "Use as address", address: searchInput }]);
          setIsSearching(false);
          return;
        }

        const response = await fetch(
          `https://api.envoi.sh/api/search?pattern=${searchInput}&type=starts`
        );
        const data = await response.json();

        // Sort results by name length first, then alphabetically
        const sortedResults = [...data.results].sort((a, b) => {
          const lengthDiff = a.name.length - b.name.length;
          return lengthDiff === 0 ? a.name.localeCompare(b.name) : lengthDiff;
        });

        setEnvoiResults(sortedResults);
      } catch (error) {
        console.error("Error fetching EnVoi names:", error);
        // Keep address validation here as fallback
        if (searchInput.length === 58 && /^[A-Z2-7]{58}$/.test(searchInput)) {
          setEnvoiResults([{ name: "Use as address", address: searchInput }]);
        }
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchEnvoiNames, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchInput]);

  // Add console logs to debug state
  useEffect(() => {
    console.log(
      "Search Results:",
      envoiResults.length,
      "isEditing:",
      isEditing
    );
  }, [envoiResults, isEditing]);

  console.log({ envoiResults, isEditing, selectedProfile });

  // Update the verifyEnvoiName function to handle sequential verification
  const verifyEnvoiName = async (
    name: string,
    address: string
  ): Promise<boolean[]> => {
    setIsVerifyingName(true);
    try {
      // First verify the token details
      const tokenResponse = await fetch(
        `https://api.envoi.sh/api/token/${uint8ArrayToBigInt(
          await namehash(name)
        ).toString()}`
      );
      const tokenData = await tokenResponse.json();

      // Artificial delay for visual feedback
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const isNameVerified =
        tokenData.results.length > 0 &&
        tokenData.results[0].address.toLowerCase() === address.toLowerCase();

      setIsVerifyingName(false);
      setIsVerified(isNameVerified);

      if (isNameVerified) {
        // Start NFT verification after name verification
        setIsVerifyingNft(true);
        await new Promise((resolve) => setTimeout(resolve, 500)); // Small delay before starting next verification

        const nftTokenResponse = await fetch(
          `https://arc72-voi-mainnet.nftnavigator.xyz/nft-indexer/v1/tokens?contractId=797609&tokenId=${uint8ArrayToBigInt(
            await namehash(name)
          ).toString()}`
        );
        const nftTokenData = await nftTokenResponse.json();

        // Artificial delay for visual feedback
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const isNftVerified =
          nftTokenData.tokens.length > 0 &&
          nftTokenData.tokens[0].owner === address;

        setIsVerifyingNft(false);
        setIsNftVerified(isNftVerified);

        return [isNameVerified, isNftVerified];
      }

      return [isNameVerified, false];
    } catch (error) {
      console.error("Error verifying EnVoi name:", error);
      setIsVerifyingName(false);
      setIsVerifyingNft(false);
      return [false, false];
    }
  };

  console.log({ isVerified, isNftVerified });

  // Add useEffect to verify when profile is selected and step changes to confirm
  useEffect(() => {
    if (
      step === "confirm" &&
      selectedProfile &&
      selectedProfile.name !== "Use as address"
    ) {
      verifyEnvoiName(selectedProfile.name, selectedProfile.address).then(
        ([verified, nftVerified]) => {
          setIsVerified(verified);
          setIsNftVerified(nftVerified);
        }
      );
    }
  }, [step, selectedProfile]);

  return (
    <StyledModal
      isDark={isDarkTheme}
      open={open}
      onClose={handleClose}
      aria-labelledby="address-modal-title"
      aria-describedby="address-modal-description"
    >
      <StyledModalContent isDark={isDarkTheme}>
        <Typography
          variant="h5"
          component="h2"
          id="address-modal-title"
          sx={{ mb: 3 }}
        >
          {title}
        </Typography>
        {!loading ? (
          <>
            <Box
              sx={{
                overflowY: "scroll",
                maxHeight: {
                  xs: "300px",
                  xl: "500px",
                },
              }}
            >
              <Grid2 container spacing={2}>
                {nfts.map((t: MListedNFTTokenI) => (
                  <Grid2 xs={12} sm={6} xl={4} key={t.id}>
                    <CartNftCard
                      token={t}
                      size="small"
                      imageOnly={true}
                      viewMode="list"
                      hideOverlay={true}
                    />
                  </Grid2>
                ))}
              </Grid2>
            </Box>
            {/*<Box
              sx={{
                p: 5,
                mt: 2,
                border: "1px solid lightgray",
                borderRadius: "25px",
              }}
            >
              <InputLabel htmlFor="address-from">Recipient Address</InputLabel>
              <TextField
                id="address-from"
                label="Address"
                variant="outlined"
                value={activeAccount?.address}
                fullWidth
                disabled
                margin="normal"
              />
            </Box>*/}
            <Box sx={{ mt: 2, position: "relative" }}>
              {selectedProfile && !isEditing ? (
                <Box
                  sx={{
                    p: 2,
                    border: isDarkTheme
                      ? "1px solid #333"
                      : "1px solid #e0e0e0",
                    borderRadius: "4px",
                    display: "flex",
                    flexDirection: "column",
                    backgroundColor: isDarkTheme ? "#1e1e1e" : "#ffffff",
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      {selectedProfile.metadata?.avatar ? (
                        <Box
                          component="img"
                          src={selectedProfile.metadata.avatar}
                          alt="Avatar"
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            backgroundColor: isDarkTheme ? "#333" : "#e0e0e0",
                          }}
                        />
                      )}
                      <Box>
                        <Typography sx={{ fontWeight: "bold" }}>
                          {selectedProfile.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            display: "block",
                            fontSize: "0.75rem",
                          }}
                        >
                          {selectedProfile.address.slice(0, 8)}...
                          {selectedProfile.address.slice(-8)}
                        </Typography>
                      </Box>
                    </Box>
                    {step === "select" && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setIsEditing(true);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </Box>

                  {step === "confirm" &&
                    selectedProfile.name !== "Use as address" && (
                      <Box sx={{ mt: 2 }}>
                        <Accordion
                          sx={{
                            backgroundColor: isDarkTheme
                              ? "#2a2a2a"
                              : "#f5f5f5",
                            "&:before": { display: "none" },
                            boxShadow: "none",
                            transition: "all 0.3s ease-in-out",
                            opacity: isVerifyingName || isVerified ? 1 : 0,
                            height: isVerifyingName || isVerified ? "auto" : 0,
                            overflow: "hidden",
                          }}
                        >
                          <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            sx={{
                              color: isVerifyingName
                                ? "text.secondary"
                                : "success.main",
                              "& .MuiAccordionSummary-content": {
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              },
                            }}
                          >
                            {isVerifyingName ? (
                              <CircularProgress size={20} color="inherit" />
                            ) : (
                              <CheckCircleIcon fontSize="small" />
                            )}
                            <Typography variant="body2">
                              {isVerifyingName
                                ? "Verifying EnVoi Name..."
                                : "Verified EnVoi Name"}
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Typography variant="body2" color="text.secondary">
                              EnVoi Name resolved address matches owner in
                              registry.
                            </Typography>
                          </AccordionDetails>
                        </Accordion>

                        <Accordion
                          sx={{
                            backgroundColor: isDarkTheme
                              ? "#2a2a2a"
                              : "#f5f5f5",
                            "&:before": { display: "none" },
                            boxShadow: "none",
                            mt: 1,
                            transition: "all 0.3s ease-in-out",
                            opacity: isVerifyingNft || isNftVerified ? 1 : 0,
                            height:
                              isVerifyingNft || isNftVerified ? "auto" : 0,
                            overflow: "hidden",
                          }}
                        >
                          <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            sx={{
                              color: isVerifyingNft
                                ? "text.secondary"
                                : "success.main",
                              "& .MuiAccordionSummary-content": {
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              },
                            }}
                          >
                            {isVerifyingNft ? (
                              <CircularProgress size={20} color="inherit" />
                            ) : (
                              <CheckCircleIcon fontSize="small" />
                            )}
                            <Typography variant="body2">
                              {isVerifyingNft
                                ? "Verifying NFT Token Owner..."
                                : "Verified EnVoi Name NFT Token Owner"}
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Typography variant="body2" color="text.secondary">
                              EnVoi Name NFT Token owner matches resolved
                              address.
                            </Typography>
                          </AccordionDetails>
                        </Accordion>
                      </Box>
                    )}
                </Box>
              ) : (
                <TextField
                  label="Enter EnVoi Name or Address"
                  variant="outlined"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  fullWidth
                  margin="normal"
                  sx={{
                    "& .MuiInputBase-input": {
                      color: isDarkTheme ? "#fff" : "inherit",
                    },
                    "& .MuiInputLabel-root": {
                      color: isDarkTheme ? "#fff" : "inherit",
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: isDarkTheme ? "#fff" : "rgba(0, 0, 0, 0.23)",
                    },
                  }}
                />
              )}

              {isSearching && (
                <Box sx={{ display: "flex", justifyContent: "center", my: 1 }}>
                  <CircularProgress size={20} />
                </Box>
              )}

              {/* Modified dropdown visibility condition */}
              {envoiResults.length > 0 &&
                (searchInput.length > 0 || isEditing) && (
                  <Box
                    sx={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      zIndex: 9999,
                      maxHeight: "300px",
                      overflowY: "auto",
                      backgroundColor: isDarkTheme ? "#1e1e1e" : "#ffffff",
                      border: isDarkTheme
                        ? "1px solid #333"
                        : "1px solid #e0e0e0",
                      borderRadius: "4px",
                      mt: 1,
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                      WebkitOverflowScrolling: "touch",
                      "&::-webkit-scrollbar": {
                        width: "8px",
                      },
                      "&::-webkit-scrollbar-thumb": {
                        backgroundColor: isDarkTheme ? "#555" : "#ccc",
                        borderRadius: "4px",
                      },
                    }}
                  >
                    {envoiResults.map((result) => (
                      <Box
                        key={result.name}
                        sx={{
                          p: 2,
                          cursor: "pointer",
                          "&:hover": {
                            backgroundColor: isDarkTheme ? "#333" : "#f5f5f5",
                          },
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          borderBottom: isDarkTheme
                            ? "1px solid #333"
                            : "1px solid #e0e0e0",
                        }}
                        onClick={() => {
                          setSelectedProfile(result);
                          setSearchInput("");
                          setIsEditing(false);
                        }}
                      >
                        {result.metadata?.avatar ? (
                          <Box
                            component="img"
                            src={result.metadata.avatar}
                            alt={result.name}
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              backgroundColor: isDarkTheme ? "#333" : "#e0e0e0",
                            }}
                          />
                        )}
                        <Box>
                          <Typography sx={{ fontWeight: "bold" }}>
                            {result.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "text.secondary",
                              display: "block",
                              fontSize: "0.75rem",
                            }}
                          >
                            {result.address.slice(0, 8)}...
                            {result.address.slice(-8)}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}

              {amount ? <div>Available Balance: {amount} VOI</div> : null}
              {amount && selectedProfile && Number(amount) < 1 ? (
                <>
                  <Typography color="error">
                    Recipient available balance less than 1 VOI
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <InputLabel htmlFor="amount-input">
                      Additional Amount (VOI)
                    </InputLabel>
                    <TextField
                      id="amount-input"
                      label="Amount"
                      variant="outlined"
                      fullWidth
                      margin="normal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      sx={{
                        "& .MuiInputBase-input": {
                          color: isDarkTheme ? "#fff" : "inherit",
                        },
                        "& .MuiInputLabel-root": {
                          color: isDarkTheme ? "#fff" : "inherit",
                        },
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: isDarkTheme
                            ? "#fff"
                            : "rgba(0, 0, 0, 0.23)",
                        },
                      }}
                    />
                  </Box>
                </>
              ) : null}
            </Box>
            <Stack sx={{ mt: 3 }} gap={2}>
              {step === "select" ? (
                <>
                  <Button
                    size="large"
                    fullWidth
                    variant="contained"
                    onClick={() => setStep("confirm")}
                    disabled={!selectedProfile}
                  >
                    Next
                  </Button>
                  <Button
                    size="large"
                    fullWidth
                    variant="outlined"
                    onClick={handleClose}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="large"
                    fullWidth
                    variant="contained"
                    onClick={() =>
                      handleSave(selectedProfile?.address || "", amount)
                    }
                  >
                    Transfer
                  </Button>
                  <Button
                    size="large"
                    fullWidth
                    variant="outlined"
                    onClick={() => setStep("select")}
                  >
                    Back
                  </Button>
                </>
              )}
            </Stack>
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
            <Typography variant="h6" sx={{ mt: 2 }}>
              Signature pending
            </Typography>
          </div>
        )}
      </StyledModalContent>
    </StyledModal>
  );
};

export default AddressModal;
