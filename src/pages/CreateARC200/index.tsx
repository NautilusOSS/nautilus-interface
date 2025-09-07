import React, { useState, useEffect, useRef } from "react";
import {
  Button,
  FormControl,
  FormLabel,
  Grid,
  Typography,
  Box,
  CircularProgress,
  Container,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { useWallet } from "@txnlab/use-wallet-react";
import { abi, CONTRACT } from "ulujs";
import { getAlgorandClients } from "@/wallets";
import { waitForConfirmation } from "algosdk";
import { toast } from "react-toastify";
import { ShadedInput } from "@/components/ShadedInput";
import TransactionDetails from "@/components/TransactionDetails";
import Layout from "@/layouts/Default";
import styled from "styled-components";
import axios from "axios";
import algosdk from "algosdk";
import BigNumber from "bignumber.js";
import { Link } from "react-router-dom";
import TokenList from "./components/TokenList";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { Buffer } from "buffer";

const { algodClient } = getAlgorandClients();

const FormContainer = styled(Box)<{ $isDarkTheme: boolean }>`
  background: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)"};
  border-radius: 24px;
  padding: 32px;
  border: 1px solid
    ${(props) => (props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "#D8D8E1")};
`;

const StyledFormLabel = styled(FormLabel)<{ $isDarkTheme: boolean }>`
  color: ${(props) => (props.$isDarkTheme ? "#fff" : "#0C0C10")};
  margin-bottom: 8px;
  font-family: "Plus Jakarta Sans";
  font-size: 14px;
  font-weight: 600;
`;

const PageTitle = styled(Typography)<{ $isDarkTheme: boolean }>`
  color: ${(props) => (props.$isDarkTheme ? "#fff" : "#0C0C10")};
  font-family: "Plus Jakarta Sans";
  font-weight: 700;
`;

const HelperText = styled(Typography)<{ $isDarkTheme: boolean }>`
  color: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(12, 12, 16, 0.6)"};
  font-size: 12px;
  margin-top: 4px;
`;

const LengthIndicator = styled.span<{ $isDarkTheme: boolean }>`
  color: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.5)" : "rgba(12, 12, 16, 0.5)"};
  font-size: 12px;
  margin-left: 8px;
  font-family: "IBM Plex Sans Condensed";
`;

const InputHeader = styled.div<{ $isDarkTheme: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  color: ${(props) => (props.$isDarkTheme ? "#fff" : "#0C0C10")};
`;

const CharacterCount = styled.div<{
  $isDarkTheme: boolean;
  $isAtLimit: boolean;
}>`
  color: ${(props) =>
    props.$isAtLimit
      ? "#ff6b00"
      : props.$isDarkTheme
      ? "rgba(255, 255, 255, 0.5)"
      : "rgba(12, 12, 16, 0.5)"};
  font-size: 12px;
  font-family: "IBM Plex Sans Condensed";
  margin-top: 4px;
  text-align: right;
`;

interface ContractStub {
  contractId: number;
  hash: string;
  creator: string;
  active: number;
}

interface ContractOption {
  contractId: number;
  address: string;
  hash: string;
  creator: string;
}

const ContractIdDisplay = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ContractId = styled.div`
  font-family: "IBM Plex Sans Condensed";
  font-size: 14px;
  font-weight: 500;
`;

const ContractAddress = styled.div`
  font-family: "IBM Plex Sans Condensed";
  font-size: 12px;
  color: ${(props) =>
    props.theme.isDarkTheme
      ? "rgba(255, 255, 255, 0.7)"
      : "rgba(12, 12, 16, 0.6)"};
`;

const CostBreakdown = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
`;

const CostItem = styled.div<{ $isDarkTheme: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};

  &:last-child {
    border-bottom: none;
    font-weight: 600;
  }
`;

const CostLabel = styled.span<{ $isDarkTheme: boolean }>`
  color: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.7)"};
`;

const CostValue = styled.span<{ $isDarkTheme: boolean }>`
  color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};
  font-family: "IBM Plex Sans Condensed";
`;

const CostTitle = styled(Typography)<{ $isDarkTheme: boolean }>`
  color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};
  font-weight: 600;
`;

const StyledLink = styled(Link)`
  color: #2958ff;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

const StyledDialog = styled(Dialog)<{ $isDarkTheme: boolean }>`
  .MuiDialog-paper {
    background-color: ${(props) => (props.$isDarkTheme ? "#1a1a1a" : "#fff")};
    color: ${(props) => (props.$isDarkTheme ? "#fff" : "inherit")};
  }
`;

const StyledDialogTitle = styled(DialogTitle)<{ $isDarkTheme: boolean }>`
  color: ${(props) => (props.$isDarkTheme ? "#fff" : "inherit")};
  font-family: "Plus Jakarta Sans";
  font-weight: 600;
`;

const ImageUploadContainer = styled.div<{ $isDarkTheme: boolean }>`
  border: 2px dashed
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)"};
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)"};

  &:hover {
    border-color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)"};
    background: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)"};
  }
`;

const ImagePreviewContainer = styled.div`
  position: relative;
  width: 100px;
  height: 100px;
  margin: 16px auto;
`;

const ImagePreview = styled.img`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
`;

const RemoveImageButton = styled(Button)`
  position: absolute;
  top: -8px;
  right: -8px;
  min-width: 0;
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 50%;
`;

const convertToSVG = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 256; // Standard size for token icons
          canvas.height = 256;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }

          // Draw image with white background for transparency
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Convert to SVG
          const svgString = `
            <svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
              <image href="${canvas.toDataURL(
                "image/png"
              )}" width="256" height="256"/>
            </svg>
          `;
          resolve(svgString);
        };
        img.src = e.target?.result as string;
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const convertToPNG = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 256; // Standard size for token icons
          canvas.height = 256;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }

          // Draw image maintaining aspect ratio
          const scale = Math.min(
            canvas.width / img.width,
            canvas.height / img.height
          );
          const x = (canvas.width - img.width * scale) / 2;
          const y = (canvas.height - img.height * scale) / 2;

          // Clear canvas
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw image
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

          // Convert to PNG blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Failed to convert to PNG"));
              }
            },
            "image/png",
            1.0
          );
        };
        img.src = e.target?.result as string;
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const ButtonText = styled.span`
  @media (max-width: 600px) {
    display: none;
  }
`;

export const CreateARC200: React.FC = () => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const { activeAccount, signTransactions } = useWallet();
  const [name, setName] = useState<string>("");
  const [symbol, setSymbol] = useState<string>("");
  const [totalSupply, setTotalSupply] = useState<string>("1000000");
  const [decimals, setDecimals] = useState<string>("6");
  const [txnId, setTxnId] = useState<string>("");
  const [txnMsg, setTxnMsg] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contracts, setContracts] = useState<ContractOption[]>([]);
  const [selectedContract, setSelectedContract] =
    useState<ContractOption | null>(null);
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [tokens, setTokens] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [convertedPNG, setConvertedPNG] = useState<Blob | null>(null);
  const [convertedSVG, setConvertedSVG] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_NAME_LENGTH = 32;
  const MAX_SYMBOL_LENGTH = 8;

  useEffect(() => {
    if (!tokens.length) return;

    const fetchContracts = async () => {
      setIsLoadingContracts(true);
      try {
        const response = await axios.get(
          "https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/stubs/token"
        );
        const contractOptions: ContractOption[] = response.data.stubs
          .filter(
            (stub: ContractStub) =>
              !tokens.some((t: any) => t.contractId === stub.contractId)
          )
          .map((stub: ContractStub) => ({
            contractId: stub.contractId,
            address: algosdk.getApplicationAddress(stub.contractId),
            hash: stub.hash,
            creator: stub.creator,
          }));
        setContracts(contractOptions);
      } catch (error) {
        console.error("Error fetching contracts:", error);
        toast.error("Failed to load contracts");
      } finally {
        setIsLoadingContracts(false);
      }
    };

    fetchContracts();
  }, [tokens]);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const response = await axios.get(
          "https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/tokens?includes=all"
        );
        setTokens(response.data.tokens || []);
      } catch (error) {
        console.error("Error fetching tokens:", error);
        toast.error("Failed to load tokens");
      }
    };

    fetchTokens();
  }, []);

  const uploadTokenIcon = async (contractId: number) => {
    if (!selectedImage || !convertedPNG || !convertedSVG) return;

    try {
      const formData = new FormData();

      // Create Blobs with proper filenames including contractId
      const pngBlob = new Blob([convertedPNG], { type: "image/png" });
      const svgBlob = new Blob([convertedSVG], { type: "image/svg+xml" });

      // Required fields from SubmitProjectForm - using exact same field names
      formData.append("logoPng", pngBlob, `${contractId}.png`);
      formData.append("logoSvg", svgBlob, `${contractId}.svg`);
      formData.append("assetId", contractId.toString());
      formData.append("projectName", name);
      formData.append("contactName", name); // Using token name as contact name
      formData.append(
        "projectUrl",
        `https://block.voi.network/explorer/application/${contractId}`
      );
      formData.append("email", `${contractId}@voi.network`); // Changed from emailAddress to email
      formData.append("discordLink", "https://discord.gg/humble");
      formData.append("telegramLink", "https://t.me/HumbleDefi");
      formData.append("twitterUsername", "HumbleDefi");
      formData.append(
        "description",
        `${name} (${symbol}) is an ARC-200 token on the VOI network.`
      );

      // Submit to verification API
      await fetch("https://asset-verification.nautilus.sh/submit", {
        method: "POST",
        body: formData,
      });

      toast.success("Token icon and verification submitted successfully");
    } catch (error) {
      console.error("Error uploading token icon:", error);
      toast.error("Failed to upload token icon");
    }
  };

  const handleCreateToken = async () => {
    if (!activeAccount) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!name || !symbol || !totalSupply || !decimals || !selectedContract) {
      toast.error("Please fill in all fields");
      return;
    }

    console.log({ name, symbol, totalSupply, decimals, selectedContract });

    setIsSubmitting(true);

    try {
      const ci = new CONTRACT(
        selectedContract.contractId,
        algodClient,
        undefined,
        abi.custom,
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );
      const builder = {
        newARC200: new CONTRACT(
          selectedContract.contractId,
          algodClient,
          undefined,
          {
            name: "ARC200Token",
            methods: [
              {
                name: "mint",
                args: [
                  { type: "address", name: "to" },
                  { type: "byte[32]", name: "hash" },
                  { type: "byte[8]", name: "symbol" },
                  { type: "uint8", name: "decimals" },
                  { type: "uint256", name: "supply" },
                ],
                returns: { type: "void" },
              },
            ],
            events: [],
          },
          { addr: activeAccount.address, sk: new Uint8Array(0) },
          true,
          false,
          true
        ),
        fTok: new CONTRACT(
          302222,
          algodClient,
          undefined,
          abi.arc200,
          { addr: activeAccount.address, sk: new Uint8Array(0) },
          true,
          false,
          true
        ),
      };
      const buildN = [];
      {
        const txnO = (
          await builder.newARC200.mint(
            activeAccount.address,
            new Uint8Array(Buffer.from(name.padEnd(32, "\0"), "utf8")),
            new Uint8Array(Buffer.from(symbol.padEnd(8, "\0"), "utf8")),
            Number(decimals),
            BigInt(
              new BigNumber(totalSupply)
                .multipliedBy(Math.pow(10, Number(decimals)))
                .toFixed(0)
            )
          )
        ).obj;
        buildN.push({
          ...txnO,
          payment: 1000000 + 31300,
          note: new TextEncoder().encode(
            `arc200 mint ${name} ${symbol} ${decimals} ${totalSupply} ${activeAccount.address}`
          ),
        });
      }
      {
        const txnO = (
          await builder.fTok.arc200_transfer(
            "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
            1000 * 1e6
          )
        ).obj;
        buildN.push({
          ...txnO,
          payment: 28500,
          note: new TextEncoder().encode(
            "arc200_transfer 1000 F to G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ"
          ),
        });
      }
      ci.setFee(2000);
      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);
      const customR = await ci.custom();

      console.log({ customR });
      if (!customR.success) {
        throw new Error("Token creation failed in mint");
      }

      const stxns = await signTransactions(
        customR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );

      const { txId } = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();

      await waitForConfirmation(algodClient, txId, 4);

      // After successful token creation, upload the icon
      if (selectedImage && convertedPNG) {
        await uploadTokenIcon(selectedContract.contractId);
      }

      setTxnId(txId);
      setTxnMsg(`Token ${name} (${symbol}) created successfully!`);
      resetForm();
      toast.success("Token created successfully!");
    } catch (error) {
      console.error("Error creating token:", error);
      toast.error("Failed to create token");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setSymbol("");
    setTotalSupply("1000000");
    setDecimals("6");
  };

  const handleCreateClick = () => {
    if (!activeAccount) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!name || !symbol || !totalSupply || !decimals || !selectedContract) {
      toast.error("Please fill in all fields");
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setShowConfirmation(false);
    await handleCreateToken();
  };

  const handleImageSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        // 1MB limit
        toast.error("Image size should be less than 1MB");
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      try {
        // Convert to both formats
        const pngBlob = await convertToPNG(file);
        const svgString = await convertToSVG(file);

        setConvertedPNG(pngBlob);
        setConvertedSVG(svgString);
        setSelectedImage(file);

        // Show preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(pngBlob);
      } catch (error) {
        console.error("Error converting image:", error);
        toast.error("Failed to process image");
      }
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setConvertedPNG(null);
    setConvertedSVG(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Layout>
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <FormContainer $isDarkTheme={isDarkTheme}>
          <PageTitle variant="h4" sx={{ mb: 4 }} $isDarkTheme={isDarkTheme}>
            Create ARC-200 Token
          </PageTitle>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <StyledFormLabel $isDarkTheme={isDarkTheme}>
                  Contract Address
                </StyledFormLabel>
                <Autocomplete
                  value={selectedContract}
                  onChange={(_, newValue) => setSelectedContract(newValue)}
                  options={contracts}
                  loading={isLoadingContracts}
                  getOptionLabel={(option) => `${option.contractId}`}
                  renderInput={(params) => (
                    <ShadedInput
                      {...params}
                      placeholder="Select contract"
                      fullWidth
                      sx={{
                        "& .MuiInputBase-input": {
                          color: isDarkTheme ? "#fff" : "inherit",
                        },
                        "& .MuiInputLabel-root": {
                          color: isDarkTheme ? "#fff" : "inherit",
                        },
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <ContractIdDisplay>
                        <ContractId>
                          Contract ID: {option.contractId}
                        </ContractId>
                        <ContractAddress>
                          Address: {option.address}
                        </ContractAddress>
                      </ContractIdDisplay>
                    </Box>
                  )}
                />
                <HelperText $isDarkTheme={isDarkTheme}>
                  Select token contract address to use
                </HelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputHeader $isDarkTheme={isDarkTheme}>
                  <StyledFormLabel $isDarkTheme={isDarkTheme}>
                    Token Name
                  </StyledFormLabel>
                </InputHeader>
                <ShadedInput
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    if (e.target.value.length <= MAX_NAME_LENGTH) {
                      setName(e.target.value);
                    }
                  }}
                  placeholder="e.g., My Token"
                  fullWidth
                  error={name.length === MAX_NAME_LENGTH}
                  sx={{
                    "& .MuiInputBase-input": {
                      color: isDarkTheme ? "#fff" : "inherit",
                    },
                    "& .MuiInputLabel-root": {
                      color: isDarkTheme ? "#fff" : "inherit",
                    },
                  }}
                />
                <CharacterCount
                  $isDarkTheme={isDarkTheme}
                  $isAtLimit={name.length === MAX_NAME_LENGTH}
                >
                  {name.length} / {MAX_NAME_LENGTH} characters
                </CharacterCount>
                <HelperText $isDarkTheme={isDarkTheme}>
                  The full name of your token
                </HelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputHeader $isDarkTheme={isDarkTheme}>
                  <StyledFormLabel $isDarkTheme={isDarkTheme}>
                    Token Symbol
                  </StyledFormLabel>
                </InputHeader>
                <ShadedInput
                  value={symbol}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const upperValue = e.target.value.toUpperCase();
                    if (upperValue.length <= MAX_SYMBOL_LENGTH) {
                      setSymbol(upperValue);
                    }
                  }}
                  placeholder="e.g., MTK"
                  fullWidth
                  error={symbol.length === MAX_SYMBOL_LENGTH}
                  sx={{
                    "& .MuiInputBase-input": {
                      color: isDarkTheme ? "#fff" : "inherit",
                    },
                    "& .MuiInputLabel-root": {
                      color: isDarkTheme ? "#fff" : "inherit",
                    },
                  }}
                />
                <CharacterCount
                  $isDarkTheme={isDarkTheme}
                  $isAtLimit={symbol.length === MAX_SYMBOL_LENGTH}
                >
                  {symbol.length} / {MAX_SYMBOL_LENGTH} characters
                </CharacterCount>
                <HelperText $isDarkTheme={isDarkTheme}>
                  A short identifier for your token (uppercase)
                </HelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <StyledFormLabel $isDarkTheme={isDarkTheme}>
                  Total Supply
                </StyledFormLabel>
                <ShadedInput
                  value={totalSupply}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setTotalSupply(e.target.value)
                  }
                  type="number"
                  fullWidth
                  sx={{
                    "& .MuiInputBase-input": {
                      color: isDarkTheme ? "#fff" : "inherit",
                    },
                    "& .MuiInputLabel-root": {
                      color: isDarkTheme ? "#fff" : "inherit",
                    },
                  }}
                />
                <HelperText $isDarkTheme={isDarkTheme}>
                  The total number of tokens to create
                </HelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <StyledFormLabel $isDarkTheme={isDarkTheme}>
                  Decimals
                </StyledFormLabel>
                <ShadedInput
                  value={decimals}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setDecimals(e.target.value)
                  }
                  type="number"
                  fullWidth
                  sx={{
                    "& .MuiInputBase-input": {
                      color: isDarkTheme ? "#fff" : "inherit",
                    },
                    "& .MuiInputLabel-root": {
                      color: isDarkTheme ? "#fff" : "inherit",
                    },
                  }}
                />
                <HelperText $isDarkTheme={isDarkTheme}>
                  Number of decimal places (6 recommended)
                </HelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <StyledFormLabel $isDarkTheme={isDarkTheme}>
                  Token Icon
                </StyledFormLabel>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  style={{ display: "none" }}
                  ref={fileInputRef}
                />
                <ImageUploadContainer
                  $isDarkTheme={isDarkTheme}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <ImagePreviewContainer>
                      <ImagePreview
                        src={imagePreview}
                        alt="Token icon preview"
                      />
                      <RemoveImageButton
                        variant="contained"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage();
                        }}
                      >
                        ×
                      </RemoveImageButton>
                    </ImagePreviewContainer>
                  ) : (
                    <>
                      <CloudUploadIcon
                        sx={{ fontSize: 48, mb: 1, opacity: 0.7 }}
                      />
                      <Typography variant="body2" sx={{ opacity: 0.7 }}>
                        Click to upload token icon
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ display: "block", mt: 1, opacity: 0.5 }}
                      >
                        PNG, JPG up to 1MB
                      </Typography>
                    </>
                  )}
                </ImageUploadContainer>
                <HelperText $isDarkTheme={isDarkTheme}>
                  Upload a token icon for better visibility (optional)
                </HelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleCreateClick}
                disabled={isSubmitting}
                fullWidth
                size="large"
                sx={{
                  height: "48px",
                  fontSize: "16px",
                  fontWeight: 600,
                  mt: 2,
                }}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {isSubmitting ? (
                  <>
                    <ButtonText>Creating Token...</ButtonText>
                    <Box
                      component="span"
                      sx={{ display: { xs: "inline", sm: "none" } }}
                    >
                      Creating...
                    </Box>
                  </>
                ) : (
                  <>
                    <ButtonText>Create Token</ButtonText>
                    <Box
                      component="span"
                      sx={{ display: { xs: "inline", sm: "none" } }}
                    >
                      Create
                    </Box>
                  </>
                )}
              </Button>
            </Grid>
          </Grid>
        </FormContainer>
      </Container>

      <Container maxWidth="xl" sx={{ mt: 4, px: { xs: 2, sm: 3 } }}>
        <TokenList tokens={tokens} />
      </Container>

      <StyledDialog
        open={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        maxWidth="sm"
        fullWidth
        $isDarkTheme={isDarkTheme}
      >
        <StyledDialogTitle $isDarkTheme={isDarkTheme}>
          Confirm Token Creation
        </StyledDialogTitle>
        <DialogContent>
          <Typography
            variant="body1"
            gutterBottom
            sx={{
              color: isDarkTheme ? "#fff" : "inherit",
              opacity: isDarkTheme ? 0.9 : 1,
            }}
          >
            You are about to create a new ARC-200 token with the following
            details:
          </Typography>

          <Box
            sx={{
              mt: 2,
              p: 2,
              backgroundColor: isDarkTheme
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.02)",
              borderRadius: "8px",
            }}
          >
            <Typography
              variant="body2"
              gutterBottom
              sx={{
                color: isDarkTheme ? "rgba(255, 255, 255, 0.9)" : "inherit",
                "& > span": {
                  color: isDarkTheme ? "#fff" : "inherit",
                  fontWeight: 600,
                },
              }}
            >
              <span>Name:</span> {name}
              <br />
              <span>Symbol:</span> {symbol}
              <br />
              <span>Total Supply:</span> {totalSupply}
              <br />
              <span>Decimals:</span> {decimals}
            </Typography>
          </Box>

          <CostBreakdown>
            <CostTitle variant="subtitle2" $isDarkTheme={isDarkTheme}>
              Cost Breakdown:
            </CostTitle>

            <CostItem $isDarkTheme={isDarkTheme}>
              <CostLabel $isDarkTheme={isDarkTheme}>Creation Fee</CostLabel>
              <CostValue $isDarkTheme={isDarkTheme}>1.0313 VOI</CostValue>
            </CostItem>

            <CostItem $isDarkTheme={isDarkTheme}>
              <CostLabel $isDarkTheme={isDarkTheme}>Factory Fee</CostLabel>
              <CostValue $isDarkTheme={isDarkTheme}>1000 F</CostValue>
            </CostItem>

            <CostItem $isDarkTheme={isDarkTheme}>
              <CostLabel $isDarkTheme={isDarkTheme}>Total Cost</CostLabel>
              <CostValue $isDarkTheme={isDarkTheme}>
                1.0313 VOI + 1000 F
              </CostValue>
            </CostItem>

            <Typography
              variant="body2"
              sx={{
                mt: 2,
                color: isDarkTheme
                  ? "rgba(255, 255, 255, 0.7)"
                  : "text.secondary",
                textAlign: "center",
              }}
            >
              Need F tokens? Get them{" "}
              <StyledLink
                to="https://voi.humble.sh/#/swap?poolId=395510"
                target="_blank"
              >
                here
              </StyledLink>
            </Typography>
          </CostBreakdown>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setShowConfirmation(false)}
            disabled={isSubmitting}
            sx={{
              color: isDarkTheme ? "rgba(255, 255, 255, 0.7)" : undefined,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            color="primary"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            {isSubmitting ? "Creating..." : "Confirm & Create"}
          </Button>
        </DialogActions>
      </StyledDialog>

      <TransactionDetails
        id={txnId}
        show={Boolean(txnId)}
        onClose={() => setTxnId("")}
        msg={txnMsg}
      />
    </Layout>
  );
};

export default CreateARC200;
