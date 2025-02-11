import React from "react";
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { useWallet } from "@txnlab/use-wallet-react";
import Layout from "@/layouts/Default";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { getAlgorandClients } from "@/wallets";
import DeleteIcon from "@mui/icons-material/Delete";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import * as algosdk from "algosdk";

interface Asset {
  id: number;
  name: string;
  unitName: string;
  balance?: number;
}

interface RecipientInfo {
  address: string;
  count: number;
  isOptedIn: boolean;
}

interface Batch {
  addresses: RecipientInfo[];
  totalTokens: number;
  txnId?: string;
  sent?: boolean;
}

const EarlyAccessTokenSender: React.FC = () => {
  const { isDarkTheme } = useSelector((state: RootState) => state.theme);
  const { activeAddress, activeAccount, signTransactions } = useWallet();
  const [selectedToken, setSelectedToken] = React.useState("");
  const [selectedAsset, setSelectedAsset] = React.useState<Asset | null>(null);
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [addresses, setAddresses] = React.useState("");
  const [recipients, setRecipients] = React.useState<RecipientInfo[]>([]);
  const [processing, setProcessing] = React.useState(false);
  const [batches, setBatches] = React.useState<Batch[]>([]);
  const [signingBatchIndex, setSigningBatchIndex] = React.useState<
    number | null
  >(null);
  const [acknowledged, setAcknowledged] = React.useState(false);

  React.useEffect(() => {
    const fetchAssets = async () => {
      if (!activeAddress) return;

      setLoading(true);
      try {
        const { algodClient } = getAlgorandClients();
        const accountInfo = await algodClient
          .accountInformation(activeAddress)
          .do();
        const assets = await Promise.all(
          accountInfo.assets.map(async (asset: any) => {
            const assetInfo = await algodClient
              .getAssetByID(asset["asset-id"])
              .do();
            return {
              id: asset["asset-id"],
              name: assetInfo.params.name,
              unitName: assetInfo.params["unit-name"],
            };
          })
        );
        setAssets(assets.filter((asset) => asset.unitName === "EARLY"));
      } catch (error) {
        console.error("Error fetching assets:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [activeAddress]);

  console.log({ assets });

  const handleTokenSelect = async (value: string) => {
    setSelectedToken(value);
    const selected = assets.find((asset) => asset.id.toString() === value);
    if (selected && activeAddress) {
      try {
        const { algodClient } = getAlgorandClients();
        const accountInfo = await algodClient
          .accountInformation(activeAddress)
          .do();
        const assetHolding = accountInfo.assets.find(
          (a: any) => a["asset-id"] === selected.id
        );
        setSelectedAsset({
          ...selected,
          balance: assetHolding ? assetHolding.amount : 0,
        });
      } catch (error) {
        console.error("Error fetching token balance:", error);
      }
    } else {
      setSelectedAsset(null);
    }
  };

  const handleProcess = async () => {
    if (!selectedAsset) return;

    setProcessing(true);
    const addressList = addresses
      .split("\n")
      .map((addr) => addr.trim())
      .filter((addr) => addr);

    try {
      const { algodClient } = getAlgorandClients();
      const processedRecipients: RecipientInfo[] = [];

      for (const address of addressList) {
        try {
          // Check if address is valid and opted in
          const accountInfo = await algodClient
            .accountInformation(address)
            .do();
          const isOptedIn = accountInfo.assets?.some(
            (asset: any) => asset["asset-id"] === selectedAsset.id
          );

          // Check if address already exists in processedRecipients
          const existing = processedRecipients.find(
            (r) => r.address === address
          );
          if (existing) {
            existing.count += 1;
          } else {
            processedRecipients.push({
              address,
              count: 1,
              isOptedIn,
            });
          }
        } catch (error) {
          console.warn(`Invalid address or error checking ${address}:`, error);
        }
      }

      setRecipients(processedRecipients);
      console.log("Processed recipients:", processedRecipients);
    } catch (error) {
      console.error("Error processing addresses:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleClearAll = () => {
    setRecipients([]);
    setAddresses("");
  };

  const handleDeleteRecipient = (addressToDelete: string) => {
    setRecipients(recipients.filter((r) => r.address !== addressToDelete));
  };

  const handleExportCsv = () => {
    const csvContent = [
      ["Address", "Count", "Status"].join(","),
      ...recipients.map((r) =>
        [r.address, r.count, r.isOptedIn ? "Opted In" : "Not Opted In"].join(
          ","
        )
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "recipients.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateBatches = () => {
    // Filter for only opted-in recipients
    const eligibleRecipients = recipients.filter((r) => r.isOptedIn);

    // No need to expand the list - use original recipients with their counts
    const batchedRecipients: Batch[] = [];
    let currentBatch: RecipientInfo[] = [];
    let currentBatchCount = 0;

    for (const recipient of eligibleRecipients) {
      if (currentBatchCount + 1 > 16) {
        // Current batch is full, start a new one
        batchedRecipients.push({
          addresses: currentBatch,
          totalTokens: currentBatch.reduce((sum, r) => sum + r.count, 0),
        });
        currentBatch = [];
        currentBatchCount = 0;
      }
      currentBatch.push(recipient);
      currentBatchCount += 1;
    }

    // Add the last batch if it has any recipients
    if (currentBatch.length > 0) {
      batchedRecipients.push({
        addresses: currentBatch,
        totalTokens: currentBatch.reduce((sum, r) => sum + r.count, 0),
      });
    }

    setBatches(batchedRecipients);
  };

  const handleSendBatch = async (batchIndex: number) => {
    if (!selectedAsset || !activeAccount) return;

    setSigningBatchIndex(batchIndex);
    const batch = batches[batchIndex];
    try {
      const { algodClient } = getAlgorandClients();

      // Create transactions for each address in batch, using their count
      const suggestedParams = await algodClient.getTransactionParams().do();
      const txns = batch.addresses.map((recipient) => {
        const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: activeAccount.address,
          to: recipient.address,
          amount: recipient.count, // Use the actual count for the amount
          assetIndex: selectedAsset.id,
          suggestedParams,
        });
        return txn;
      });

      // Group transactions
      const groupedTxns = algosdk.assignGroupID(txns);

      // Sign transactions
      const signedTxns = await signTransactions(
        groupedTxns.map((txn) => txn.toByte())
      );

      // Send transactions
      const { txId } = await algodClient
        .sendRawTransaction(signedTxns as Uint8Array[])
        .do();

      // Wait for confirmation
      await algosdk.waitForConfirmation(algodClient, txId, 4);

      // Update batch status
      const updatedBatches = [...batches];
      updatedBatches[batchIndex] = {
        ...batch,
        txnId: txId,
        sent: true,
      };
      setBatches(updatedBatches);

      setSigningBatchIndex(null);
    } catch (error) {
      console.error("Error sending batch:", error);
      setSigningBatchIndex(null);
    }
  };

  const handleCopyTxnId = (txnId: string) => {
    navigator.clipboard.writeText(txnId);
    // Optionally add a toast notification here
  };

  if (!activeAddress) {
    return (
      <Layout>
        <Box
          sx={{
            width: "100%",
            height: "90vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            p: 4,
            gap: 3,
          }}
        >
          <Paper
            sx={{
              p: 4,
              maxWidth: 600,
              width: "100%",
              textAlign: "center",
              bgcolor: "transparent",
              borderRadius: 2,
              border: "3px solid",
              borderColor: isDarkTheme ? "rgba(255, 255, 255, 0.23)" : "rgba(0, 0, 0, 0.23)",
            }}
            elevation={0}
          >
            <div className="flex flex-col items-center mb-6">
              <img 
                src="https://voix.nautilus.sh/happy.png"
                alt="Happy purple character"
                className="w-32 h-32 mb-4"
              />
              <Typography variant="h4" sx={{ mb: 2, color: "primary.main" }}>
                Welcome to Early Access Token Distribution
              </Typography>
            </div>
            <Typography variant="body1" sx={{ mb: 3, color: isDarkTheme ? "#fff" : "inherit" }}>
              To begin distributing early access tokens, please connect your wallet using the button in the top right corner.
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
              <Paper
                sx={{
                  p: 2,
                  flex: "1 1 160px",
                  maxWidth: 200,
                  bgcolor: "transparent",
                  border: "1px solid",
                  borderColor: isDarkTheme ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
                }}
              >
                <Typography variant="h6" sx={{ color: isDarkTheme ? "#fff" : "inherit", mb: 1 }}>
                  Step 1
                </Typography>
                <Typography variant="body2" sx={{ color: isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)" }}>
                  Connect your wallet to get started
                </Typography>
              </Paper>
              <Paper
                sx={{
                  p: 2,
                  flex: "1 1 160px",
                  maxWidth: 200,
                  bgcolor: "transparent",
                  border: "1px solid",
                  borderColor: isDarkTheme ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
                }}
              >
                <Typography variant="h6" sx={{ color: isDarkTheme ? "#fff" : "inherit", mb: 1 }}>
                  Step 2
                </Typography>
                <Typography variant="body2" sx={{ color: isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)" }}>
                  Select your early access token
                </Typography>
              </Paper>
              <Paper
                sx={{
                  p: 2,
                  flex: "1 1 160px",
                  maxWidth: 200,
                  bgcolor: "transparent",
                  border: "1px solid",
                  borderColor: isDarkTheme ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
                }}
              >
                <Typography variant="h6" sx={{ color: isDarkTheme ? "#fff" : "inherit", mb: 1 }}>
                  Step 3
                </Typography>
                <Typography variant="body2" sx={{ color: isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)" }}>
                  Start distributing tokens
                </Typography>
              </Paper>
            </Box>
          </Paper>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ width: "100%", height: "100%", p: 4 }}>
        <Typography variant="h4" sx={{ mb: 4, color: "primary.contrastText" }}>
          Early Access Token Distribution Wizard
        </Typography>

        <Stepper
          activeStep={activeAddress ? 1 : 0}
          sx={{
            mb: 4,
            "& .MuiStepIcon-root": {
              color: isDarkTheme ? "rgba(255, 255, 255, 0.5)" : undefined,
              "&.Mui-active": {
                color: isDarkTheme ? "primary.main" : undefined,
              },
              "&.Mui-completed": {
                color: isDarkTheme ? "primary.main" : undefined,
              },
            },
            "& .MuiStepConnector-line": {
              borderColor: isDarkTheme
                ? "rgba(255, 255, 255, 0.23)"
                : undefined,
            },
          }}
        >
          <Step>
            <StepLabel
              sx={{
                "& .MuiStepLabel-label": {
                  color: isDarkTheme ? "#fff" : "inherit",
                  "&.Mui-active": {
                    color: isDarkTheme ? "#fff" : undefined,
                  },
                  "&.Mui-completed": {
                    color: isDarkTheme ? "#fff" : undefined,
                  },
                },
              }}
            >
              Connect Wallet
            </StepLabel>
          </Step>
          <Step>
            <StepLabel
              sx={{
                "& .MuiStepLabel-label": {
                  color: isDarkTheme ? "#fff" : "inherit",
                  "&.Mui-active": {
                    color: isDarkTheme ? "#fff" : undefined,
                  },
                  "&.Mui-completed": {
                    color: isDarkTheme ? "#fff" : undefined,
                  },
                },
              }}
            >
              Configure Distribution
            </StepLabel>
          </Step>
          <Step>
            <StepLabel
              sx={{
                "& .MuiStepLabel-label": {
                  color: isDarkTheme ? "#fff" : "inherit",
                  "&.Mui-active": {
                    color: isDarkTheme ? "#fff" : undefined,
                  },
                  "&.Mui-completed": {
                    color: isDarkTheme ? "#fff" : undefined,
                  },
                },
              }}
            >
              Review & Send
            </StepLabel>
          </Step>
        </Stepper>

        {activeAddress && (
          <Paper
            sx={{
              p: 3,
              mb: 3,
              bgcolor: "transparent",
              borderRadius: 2,
              border: "3px solid",
              borderColor: isDarkTheme
                ? "rgba(255, 255, 255, 0.23)"
                : "rgba(0, 0, 0, 0.23)",
            }}
            elevation={0}
          >
            <Typography
              variant="h6"
              sx={{ mb: 2, color: isDarkTheme ? "#fff" : "#000" }}
            >
              Configure Distribution
            </Typography>
            <FormControl fullWidth>
              <InputLabel
                id="token-select-label"
                sx={{ color: isDarkTheme ? "#fff" : "inherit" }}
              >
                Select Early Access Token
              </InputLabel>
              <Select
                labelId="token-select-label"
                id="token-select"
                value={selectedToken}
                label="Select Early Access Token"
                onChange={(e) => handleTokenSelect(e.target.value)}
                disabled={loading}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: isDarkTheme ? "#1e1e1e" : "#fff",
                      "& .MuiMenuItem-root": {
                        color: isDarkTheme ? "#fff" : "inherit",
                        "&:hover": {
                          bgcolor: isDarkTheme
                            ? "rgba(255, 255, 255, 0.08)"
                            : "rgba(0, 0, 0, 0.04)",
                        },
                        "&.Mui-selected": {
                          bgcolor: isDarkTheme
                            ? "rgba(255, 255, 255, 0.16)"
                            : "rgba(0, 0, 0, 0.08)",
                          "&:hover": {
                            bgcolor: isDarkTheme
                              ? "rgba(255, 255, 255, 0.24)"
                              : "rgba(0, 0, 0, 0.12)",
                          },
                        },
                      },
                    },
                  },
                }}
                sx={{
                  color: isDarkTheme ? "#fff" : "inherit",
                  ".MuiOutlinedInput-notchedOutline": {
                    borderColor: isDarkTheme
                      ? "rgba(255, 255, 255, 0.23)"
                      : "rgba(0, 0, 0, 0.23)",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: isDarkTheme
                      ? "rgba(255, 255, 255, 0.5)"
                      : "rgba(0, 0, 0, 0.5)",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: isDarkTheme ? "#fff" : "primary.main",
                  },
                  ".MuiSvgIcon-root": {
                    color: isDarkTheme ? "#fff" : "inherit",
                  },
                }}
              >
                {loading ? (
                  <MenuItem disabled>Loading assets...</MenuItem>
                ) : assets.length > 0 ? (
                  assets.map((asset) => (
                    <MenuItem key={asset.id} value={asset.id.toString()}>
                      {asset.name} ({asset.unitName})
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No assets found</MenuItem>
                )}
              </Select>
            </FormControl>
            {selectedAsset && (
              <Typography
                sx={{ mt: 2, color: isDarkTheme ? "#fff" : "inherit" }}
              >
                Available Balance: {selectedAsset.balance}{" "}
                {selectedAsset.unitName}
              </Typography>
            )}

            {selectedAsset && selectedAsset.balance > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ mb: 1, color: isDarkTheme ? "#fff" : "inherit" }}
                >
                  Enter Recipient Addresses (one per line)
                </Typography>
                <textarea
                  value={addresses}
                  onChange={(e) => setAddresses(e.target.value)}
                  placeholder="Enter Algorand addresses, one per line"
                  style={{
                    width: "100%",
                    minHeight: "150px",
                    padding: "12px",
                    borderRadius: "4px",
                    border: `1px solid ${
                      isDarkTheme
                        ? "rgba(255, 255, 255, 0.23)"
                        : "rgba(0, 0, 0, 0.23)"
                    }`,
                    backgroundColor: "transparent",
                    color: isDarkTheme ? "#fff" : "inherit",
                    resize: "vertical",
                  }}
                />
                {addresses.trim() && (
                  <Button
                    variant="contained"
                    onClick={handleProcess}
                    disabled={processing}
                    sx={{
                      mt: 2,
                      bgcolor: isDarkTheme ? "primary.main" : undefined,
                      color: isDarkTheme ? "#fff" : undefined,
                      "&:hover": {
                        bgcolor: isDarkTheme ? "primary.dark" : undefined,
                      },
                    }}
                  >
                    {processing ? "Processing..." : "Process Addresses"}
                  </Button>
                )}

                {recipients.length > 0 && (
                  <>
                    <Box sx={{ mt: 3, overflowX: "auto" }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 2,
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{ color: isDarkTheme ? "#fff" : "inherit" }}
                        >
                          Processed Addresses (
                          {recipients
                            .filter((r) => r.isOptedIn)
                            .reduce((sum, r) => sum + r.count, 0)}{" "}
                          eligible tokens):
                        </Typography>
                        <Box>
                          <IconButton
                            onClick={handleExportCsv}
                            sx={{
                              color: isDarkTheme ? "#fff" : "inherit",
                              mr: 1,
                            }}
                            title="Export as CSV"
                          >
                            <FileDownloadIcon />
                          </IconButton>
                          <IconButton
                            onClick={handleClearAll}
                            sx={{
                              color: isDarkTheme ? "#fff" : "inherit",
                            }}
                            title="Clear All"
                          >
                            <ClearAllIcon />
                          </IconButton>
                        </Box>
                      </Box>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          color: isDarkTheme ? "#fff" : "inherit",
                        }}
                      >
                        <thead>
                          <tr>
                            <th
                              style={{
                                textAlign: "left",
                                padding: "8px",
                                borderBottom: `1px solid ${
                                  isDarkTheme
                                    ? "rgba(255, 255, 255, 0.23)"
                                    : "rgba(0, 0, 0, 0.23)"
                                }`,
                              }}
                            >
                              Address
                            </th>
                            <th
                              style={{
                                textAlign: "center",
                                padding: "8px",
                                borderBottom: `1px solid ${
                                  isDarkTheme
                                    ? "rgba(255, 255, 255, 0.23)"
                                    : "rgba(0, 0, 0, 0.23)"
                                }`,
                              }}
                            >
                              Count
                            </th>
                            <th
                              style={{
                                textAlign: "center",
                                padding: "8px",
                                borderBottom: `1px solid ${
                                  isDarkTheme
                                    ? "rgba(255, 255, 255, 0.23)"
                                    : "rgba(0, 0, 0, 0.23)"
                                }`,
                              }}
                            >
                              Status
                            </th>
                            <th
                              style={{
                                textAlign: "center",
                                padding: "8px",
                                borderBottom: `1px solid ${
                                  isDarkTheme
                                    ? "rgba(255, 255, 255, 0.23)"
                                    : "rgba(0, 0, 0, 0.23)"
                                }`,
                              }}
                            >
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {recipients.map((recipient, index) => (
                            <tr key={index}>
                              <td
                                style={{
                                  padding: "8px",
                                  borderBottom: `1px solid ${
                                    isDarkTheme
                                      ? "rgba(255, 255, 255, 0.12)"
                                      : "rgba(0, 0, 0, 0.12)"
                                  }`,
                                  fontSize: "0.875rem",
                                }}
                              >
                                {recipient.address}
                              </td>
                              <td
                                style={{
                                  textAlign: "center",
                                  padding: "8px",
                                  borderBottom: `1px solid ${
                                    isDarkTheme
                                      ? "rgba(255, 255, 255, 0.12)"
                                      : "rgba(0, 0, 0, 0.12)"
                                  }`,
                                  fontSize: "0.875rem",
                                }}
                              >
                                {recipient.count}
                              </td>
                              <td
                                style={{
                                  textAlign: "center",
                                  padding: "8px",
                                  borderBottom: `1px solid ${
                                    isDarkTheme
                                      ? "rgba(255, 255, 255, 0.12)"
                                      : "rgba(0, 0, 0, 0.12)"
                                  }`,
                                  fontSize: "0.875rem",
                                  color: recipient.isOptedIn
                                    ? isDarkTheme
                                      ? "#4caf50"
                                      : "#2e7d32"
                                    : isDarkTheme
                                    ? "#f44336"
                                    : "#d32f2f",
                                }}
                              >
                                {recipient.isOptedIn
                                  ? "Opted In"
                                  : "Not Opted In"}
                              </td>
                              <td
                                style={{
                                  textAlign: "center",
                                  padding: "8px",
                                  borderBottom: `1px solid ${
                                    isDarkTheme
                                      ? "rgba(255, 255, 255, 0.12)"
                                      : "rgba(0, 0, 0, 0.12)"
                                  }`,
                                  fontSize: "0.875rem",
                                }}
                              >
                                <IconButton
                                  onClick={() =>
                                    handleDeleteRecipient(recipient.address)
                                  }
                                  size="small"
                                  sx={{
                                    color: isDarkTheme ? "#fff" : "inherit",
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Box>

                    {recipients.filter((r) => r.isOptedIn).length > 0 && (
                      <Box sx={{ mt: 3 }}>
                        <Box sx={{ mb: 2 }}>
                          <FormControl>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <input
                                type="checkbox"
                                checked={acknowledged}
                                onChange={(e) =>
                                  setAcknowledged(e.target.checked)
                                }
                                style={{ marginRight: "8px" }}
                              />
                              <Typography
                                sx={{
                                  color: isDarkTheme
                                    ? "rgba(255, 255, 255, 0.7)"
                                    : "rgba(0, 0, 0, 0.7)",
                                  fontSize: "0.875rem",
                                }}
                              >
                                I acknowledge that this is experimental software
                                and the developers are not responsible for any
                                losses or issues that may occur during token
                                distribution.
                              </Typography>
                            </Box>
                          </FormControl>
                        </Box>
                        <Button
                          variant="contained"
                          onClick={handleCreateBatches}
                          disabled={!acknowledged}
                          sx={{
                            bgcolor: isDarkTheme ? "primary.main" : undefined,
                            color: isDarkTheme ? "#fff" : undefined,
                            "&:hover": {
                              bgcolor: isDarkTheme ? "primary.dark" : undefined,
                            },
                            "&:disabled": {
                              bgcolor: isDarkTheme
                                ? "rgba(255, 255, 255, 0.12)"
                                : undefined,
                              color: isDarkTheme
                                ? "rgba(255, 255, 255, 0.3)"
                                : undefined,
                            },
                          }}
                        >
                          Create Transaction Batches
                        </Button>

                        {batches.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography
                              variant="h6"
                              sx={{
                                mb: 2,
                                color: isDarkTheme ? "#fff" : "inherit",
                              }}
                            >
                              Transaction Batches ({batches.length} total)
                            </Typography>
                            {batches.map((batch, batchIndex) => (
                              <Paper
                                key={batchIndex}
                                sx={{
                                  p: 2,
                                  mb: 2,
                                  bgcolor: "transparent",
                                  borderRadius: 2,
                                  border: "1px solid",
                                  borderColor: isDarkTheme
                                    ? "rgba(255, 255, 255, 0.23)"
                                    : "rgba(0, 0, 0, 0.23)",
                                }}
                                elevation={0}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    mb: 1,
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      color: isDarkTheme ? "#fff" : "inherit",
                                      fontWeight: "bold",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                    }}
                                  >
                                    Batch {batchIndex + 1} ({batch.totalTokens}{" "}
                                    tokens)
                                    {batch.sent && (
                                      <CheckCircleIcon
                                        sx={{
                                          color: isDarkTheme
                                            ? "#4caf50"
                                            : "#2e7d32",
                                          fontSize: "1.2rem",
                                        }}
                                      />
                                    )}
                                  </Typography>
                                  {!batch.sent ? (
                                    <Button
                                      variant="contained"
                                      onClick={() =>
                                        handleSendBatch(batchIndex)
                                      }
                                      size="small"
                                      disabled={
                                        signingBatchIndex === batchIndex
                                      }
                                      sx={{
                                        bgcolor: isDarkTheme
                                          ? "primary.main"
                                          : undefined,
                                        color: isDarkTheme ? "#fff" : undefined,
                                        "&:hover": {
                                          bgcolor: isDarkTheme
                                            ? "primary.dark"
                                            : undefined,
                                        },
                                      }}
                                    >
                                      {signingBatchIndex === batchIndex ? (
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                          }}
                                        >
                                          <CircularProgress
                                            size={16}
                                            color="inherit"
                                          />
                                          <span>Signing...</span>
                                        </Box>
                                      ) : (
                                        "Send Batch"
                                      )}
                                    </Button>
                                  ) : (
                                    batch.txnId && (
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 1,
                                        }}
                                      >
                                        <Typography
                                          sx={{
                                            fontSize: "0.875rem",
                                            color: isDarkTheme
                                              ? "rgba(255, 255, 255, 0.7)"
                                              : "rgba(0, 0, 0, 0.7)",
                                          }}
                                        >
                                          Txn: {batch.txnId.slice(0, 8)}...
                                          {batch.txnId.slice(-8)}
                                        </Typography>
                                        <IconButton
                                          size="small"
                                          onClick={() =>
                                            handleCopyTxnId(batch.txnId!)
                                          }
                                          sx={{
                                            color: isDarkTheme
                                              ? "#fff"
                                              : "inherit",
                                          }}
                                        >
                                          <ContentCopyIcon fontSize="small" />
                                        </IconButton>
                                      </Box>
                                    )
                                  )}
                                </Box>
                                <Box
                                  sx={{
                                    maxHeight: "100px",
                                    overflowY: "auto",
                                    "&::-webkit-scrollbar": {
                                      width: "8px",
                                    },
                                    "&::-webkit-scrollbar-track": {
                                      background: isDarkTheme
                                        ? "rgba(255, 255, 255, 0.1)"
                                        : "rgba(0, 0, 0, 0.1)",
                                    },
                                    "&::-webkit-scrollbar-thumb": {
                                      background: isDarkTheme
                                        ? "rgba(255, 255, 255, 0.3)"
                                        : "rgba(0, 0, 0, 0.3)",
                                      borderRadius: "4px",
                                    },
                                  }}
                                >
                                  {batch.addresses.map((recipient, index) => (
                                    <Typography
                                      key={index}
                                      sx={{
                                        fontSize: "0.875rem",
                                        color: isDarkTheme
                                          ? "rgba(255, 255, 255, 0.7)"
                                          : "rgba(0, 0, 0, 0.7)",
                                        mb: 0.5,
                                      }}
                                    >
                                      {recipient.address}
                                    </Typography>
                                  ))}
                                </Box>
                              </Paper>
                            ))}
                          </Box>
                        )}
                      </Box>
                    )}
                  </>
                )}
              </Box>
            )}
          </Paper>
        )}
      </Box>
    </Layout>
  );
};

export default EarlyAccessTokenSender;
