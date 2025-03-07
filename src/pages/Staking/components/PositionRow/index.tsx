import React, { useState, useEffect } from "react";
import {
  TableRow,
  TableCell,
  Button,
  Skeleton,
  Typography,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
  TextField,
  Grid,
  Box,
  CircularProgress,
  Menu,
  MenuItem,
  Slider,
  Table,
  TableHead,
  TableBody,
  Stepper,
  Step,
  StepLabel,
  Checkbox,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import moment from "moment";
import { useWallet } from "@txnlab/use-wallet-react";
import { getAlgorandClients } from "@/wallets";
import { CONTRACT } from "ulujs";
import { toast } from "react-toastify";
import VIAIcon from "/src/static/crypto-icons/voi/6779767.svg";
import { getStakingTotalTokens, getStakingUnlockTime } from "@/utils/staking";
import { useStakingContract } from "@/hooks/staking";
import algosdk, { waitForConfirmation } from "algosdk";
import party from "party-js";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import DelegateModal from "@/components/modals/DelegateModal";
import humanizeDuration from "humanize-duration";
import {
  MoreVerticalIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  UserIcon,
  PowerIcon,
  BarChart3Icon,
  CoinsIcon,
} from "lucide-react";
import BlockProductionGraph from "@/pages/CommunityChest/components/BlockProductionGraph";
import { useBlocks } from "@/hooks/useBlocks";
import { abi } from "ulujs";

// format number using Intl.NumberFormat
// 100.12342 -> 100
// 1000 -> 1K
// 1000000 -> 1M
// 1000000000 -> 1B
// 1000000000000 -> 1T
// 1000000000000000 -> 1Q
// 1000000000000000000 -> 1Q
const formatNumber = (number: number) => {
  if (number < 1000) {
    return number.toFixed(0);
  }
  if (number < 1000000) {
    return `${(number / 1000).toFixed(0)}K`;
  }
  if (number < 1000000000) {
    return `${(number / 1000000).toFixed(0)}M`;
  }
  if (number < 1000000000000) {
    return `${(number / 1000000000).toFixed(0)}B`;
  }
  if (number < 1000000000000000) {
    return `${(number / 1000000000000).toFixed(0)}T`;
  }
  return `${(number / 1000000000000000).toFixed(0)}Q`;
};

const { algodClient } = getAlgorandClients();

const ParticipateModal: React.FC<{
  open: boolean;
  onClose: () => void;
  contractId: string;
}> = ({ open, onClose, contractId }) => {
  const { activeAccount, signTransactions } = useWallet();
  const { isDarkTheme } = useSelector((state: RootState) => state.theme);
  const [formData, setFormData] = useState({
    firstRound: "",
    lastRound: "",
    keyDilution: "",
    selectionKey: "",
    votingKey: "",
    stateProofKey: "",
  });

  const handleSubmit = async () => {
    if (!activeAccount) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      const ci = new CONTRACT(
        Number(contractId),
        algodClient,
        undefined,
        {
          name: "NautilusVoiStaking",
          methods: [
            {
              name: "participate",
              args: [
                { type: "byte[32]", name: "vote_k" },
                { type: "byte[32]", name: "sel_k" },
                { type: "uint64", name: "vote_fst" },
                { type: "uint64", name: "vote_lst" },
                { type: "uint64", name: "vote_kd" },
                { type: "byte[64]", name: "sp_key" },
              ],
              returns: { type: "void" },
              desc: "Register participation keys.",
            },
          ],
          events: [],
        },
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );

      ci.setFee(5000);
      ci.setPaymentAmount(1000);

      // Convert base64 keys to byte arrays
      const votingKeyBytes = new Uint8Array(
        Buffer.from(formData.votingKey, "base64")
      );
      const selectionKeyBytes = new Uint8Array(
        Buffer.from(formData.selectionKey, "base64")
      );
      const stateProofKeyBytes = new Uint8Array(
        Buffer.from(formData.stateProofKey, "base64")
      );

      // Ensure key lengths are correct
      if (
        votingKeyBytes.length !== 32 ||
        selectionKeyBytes.length !== 32 ||
        stateProofKeyBytes.length !== 64
      ) {
        throw new Error("Invalid key lengths");
      }

      const participateResult = await ci.participate(
        votingKeyBytes, // vote_k
        selectionKeyBytes, // sel_k
        BigInt(formData.firstRound), // vote_fst
        BigInt(formData.lastRound), // vote_lst
        BigInt(formData.keyDilution), // vote_kd
        stateProofKeyBytes // sp_key
      );

      if (!participateResult.success) {
        console.error({ participateResult });
        throw new Error("Participate failed in simulate");
      }

      const stxns = await signTransactions(
        participateResult.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );

      const { txId } = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();

      await waitForConfirmation(algodClient, txId, 4);
      toast.success("Successfully registered participation keys");
      onClose();
    } catch (error) {
      console.error("Error registering participation:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to register participation"
      );
    }
  };

  const textFieldStyle = {
    "& .MuiInputLabel-root": {
      color: isDarkTheme ? "rgba(255, 255, 255, 0.7)" : undefined,
    },
    "& .MuiOutlinedInput-root": {
      color: isDarkTheme ? "#FFFFFF" : undefined,
      "& fieldset": {
        borderColor: isDarkTheme ? "rgba(255, 255, 255, 0.23)" : undefined,
      },
    },
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: isDarkTheme
            ? "rgba(30, 30, 30, 0.95)"
            : "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          borderRadius: "16px",
        },
      }}
    >
      <DialogTitle>
        <Typography variant="h6" color={isDarkTheme ? "#FFFFFF" : undefined}>
          Participate in Consensus
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="First Round"
              value={formData.firstRound}
              onChange={(e) =>
                setFormData({ ...formData, firstRound: e.target.value })
              }
              sx={textFieldStyle}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Last Round"
              value={formData.lastRound}
              onChange={(e) =>
                setFormData({ ...formData, lastRound: e.target.value })
              }
              sx={textFieldStyle}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Key Dilution"
              value={formData.keyDilution}
              onChange={(e) =>
                setFormData({ ...formData, keyDilution: e.target.value })
              }
              sx={textFieldStyle}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Selection Key"
              value={formData.selectionKey}
              onChange={(e) =>
                setFormData({ ...formData, selectionKey: e.target.value })
              }
              sx={textFieldStyle}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Voting Key"
              value={formData.votingKey}
              onChange={(e) =>
                setFormData({ ...formData, votingKey: e.target.value })
              }
              sx={textFieldStyle}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="State Proof Key"
              value={formData.stateProofKey}
              onChange={(e) =>
                setFormData({ ...formData, stateProofKey: e.target.value })
              }
              sx={textFieldStyle}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          variant={isDarkTheme ? "outlined" : "contained"}
          sx={{
            color: isDarkTheme ? "#FFFFFF" : undefined,
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant={isDarkTheme ? "outlined" : "contained"}
          sx={{
            color: isDarkTheme ? "#FFFFFF" : undefined,
          }}
        >
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface PositionRowProps {
  position: {
    contractId: string;
    tokenId: string;
    contractAddress: string;
    withdrawable: string;
    global_delegate: string;
    part_vote_lst: number;
  };
  cellStyle: React.CSSProperties;
  isSelected: boolean;
  onSelectRow: () => void;
  // Add new prop for refresh trigger
  refreshTrigger?: number;
}

// Add new interface for block production data
interface BlockProductionData {
  start_date: string;
  end_date: string;
  proposers: Record<string, number>;
  total_blocks: number;
  ballast_blocks: number;
}

// Add new type for minting steps
type MintStep = 1 | 2 | 3;

// Update MintModal component
const MintModal: React.FC<{
  open: boolean;
  onClose: () => void;
  contractId: string;
  onMint: () => Promise<void>;
  isMinting: boolean;
  position: {
    contractId: string;
    tokenId: string;
    contractAddress: string;
    withdrawable: string;
    global_delegate: string;
    global_owner: string;
    part_vote_lst: number;
  };
  stakingData: any;
}> = ({
  open,
  onClose,
  contractId,
  onMint,
  isMinting,
  position,
  stakingData,
}) => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`${label} copied to clipboard`))
      .catch(() => toast.error("Failed to copy to clipboard"));
  };
  const { isDarkTheme } = useSelector((state: RootState) => state.theme);
  const [currentStep, setCurrentStep] = useState<MintStep>(1);
  const [selectedOption, setSelectedOption] = useState<
    "own" | "service" | null
  >(null);
  const [nodeAddress, setNodeAddress] = useState<string>(position.global_owner);

  const handleBack = () => {
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as MintStep) : prev));
  };

  const handleNext = () => {
    if (currentStep === 2 && selectedOption === "own" && !nodeAddress) {
      toast.error("Please enter your node address");
      return;
    }
    setCurrentStep((prev) => (prev < 3 ? ((prev + 1) as MintStep) : prev));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Box sx={{ py: 2 }}>
            <Typography
              color={isDarkTheme ? "#FFFFFF" : undefined}
              gutterBottom
            >
              Staking Contract Information:
            </Typography>
            <Box sx={{ pl: 2 }}>
              <Typography
                color={isDarkTheme ? "#FFFFFF" : undefined}
                gutterBottom
              >
                • Contract ID:{" "}
                <Box
                  component="span"
                  sx={{ display: "inline-flex", alignItems: "center" }}
                >
                  <Link
                    href={`https://block.voi.network/explorer/application/${position.contractId}/global-state`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: "inherit",
                      textDecoration: "underline",
                      "&:hover": { opacity: 0.8 },
                    }}
                  >
                    {position.contractId}
                  </Link>
                  <ContentCopyIcon
                    style={{
                      cursor: "pointer",
                      marginLeft: "5px",
                      fontSize: "16px",
                      color: "inherit",
                    }}
                    onClick={() =>
                      copyToClipboard(position.contractId, "Contract ID")
                    }
                  />
                </Box>
              </Typography>
              <Typography
                color={isDarkTheme ? "#FFFFFF" : undefined}
                gutterBottom
              >
                • Contract Address:{" "}
                <Box
                  component="span"
                  sx={{ display: "inline-flex", alignItems: "center" }}
                >
                  <Link
                    href={`https://block.voi.network/explorer/account/${position.contractAddress}/transactions`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: "inherit",
                      textDecoration: "underline",
                      "&:hover": { opacity: 0.8 },
                    }}
                  >
                    {`${position.contractAddress.slice(
                      0,
                      6
                    )}...${position.contractAddress.slice(-6)}`}
                  </Link>
                  <ContentCopyIcon
                    style={{
                      cursor: "pointer",
                      marginLeft: "5px",
                      fontSize: "16px",
                      color: "inherit",
                    }}
                    onClick={() =>
                      copyToClipboard(
                        position.contractAddress,
                        "Contract Address"
                      )
                    }
                  />
                </Box>
              </Typography>
              <Typography
                color={isDarkTheme ? "#FFFFFF" : undefined}
                gutterBottom
              >
                • Current Delegate:{" "}
                <Box
                  component="span"
                  sx={{ display: "inline-flex", alignItems: "center" }}
                >
                  <Link
                    href={`https://block.voi.network/explorer/account/${position.global_delegate}/transactions`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: "inherit",
                      textDecoration: "underline",
                      "&:hover": { opacity: 0.8 },
                    }}
                  >
                    {`${position.global_delegate.slice(
                      0,
                      6
                    )}...${position.global_delegate.slice(-6)}`}
                  </Link>
                  <ContentCopyIcon
                    style={{
                      cursor: "pointer",
                      marginLeft: "5px",
                      fontSize: "16px",
                      color: "inherit",
                    }}
                    onClick={() =>
                      copyToClipboard(
                        position.global_delegate,
                        "Delegate Address"
                      )
                    }
                  />
                </Box>
              </Typography>
              <Typography
                color={isDarkTheme ? "#FFFFFF" : undefined}
                gutterBottom
              >
                • Total Staked: {formatNumber(stakingData.value / 1e6)} VOI
              </Typography>
              <Typography
                color={isDarkTheme ? "#FFFFFF" : undefined}
                gutterBottom
              >
                • Withdrawable: {Number(stakingData.withdrawable) / 1e6} VOI
              </Typography>
              <Typography color={isDarkTheme ? "#FFFFFF" : undefined}>
                • Unlock Time:{" "}
                {moment.unix(getStakingUnlockTime(position)).fromNow()}
              </Typography>
              <Typography
                color={
                  isDarkTheme ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)"
                }
                sx={{ mt: 2 }}
              >
                View detailed profitability analysis on{" "}
                <Link
                  href={`https://voirewards.com/wallet/${position.contractAddress}#calculator`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: isDarkTheme ? "#90caf9" : "#1976d2",
                    textDecoration: "none",
                    "&:hover": {
                      textDecoration: "underline",
                    },
                  }}
                >
                  Voi Rewards Auditor
                </Link>
              </Typography>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ py: 2 }}>
            <Typography
              color={isDarkTheme ? "#FFFFFF" : undefined}
              gutterBottom
            >
              Select Your Staking Option:
            </Typography>
            <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
              <Button
                variant={selectedOption === "own" ? "contained" : "outlined"}
                onClick={() => setSelectedOption("own")}
                sx={{
                  flex: 1,
                  p: 3,
                  borderRadius: 2,
                  color: isDarkTheme ? "#FFFFFF" : undefined,
                  borderColor: isDarkTheme
                    ? "rgba(255, 255, 255, 0.23)"
                    : undefined,
                }}
              >
                <Box>
                  <PowerIcon size={24} />
                  <Typography sx={{ mt: 1 }}>Stake on Own Node</Typography>
                </Box>
              </Button>
              <Button
                variant={
                  selectedOption === "service" ? "contained" : "outlined"
                }
                onClick={() => setSelectedOption("service")}
                sx={{
                  flex: 1,
                  p: 3,
                  borderRadius: 2,
                  color: isDarkTheme ? "#FFFFFF" : undefined,
                  borderColor: isDarkTheme
                    ? "rgba(255, 255, 255, 0.23)"
                    : undefined,
                }}
              >
                <Box>
                  <CoinsIcon size={24} />
                  <Typography sx={{ mt: 1 }}>Node as a Service</Typography>
                </Box>
              </Button>
            </Box>
            {selectedOption === "own" && (
              <Box sx={{ mt: 3 }}>
                <TextField
                  fullWidth
                  label="Node Address"
                  value={nodeAddress}
                  onChange={(e) => setNodeAddress(e.target.value)}
                  placeholder="Enter your node address"
                  sx={{
                    "& .MuiInputLabel-root": {
                      color: isDarkTheme
                        ? "rgba(255, 255, 255, 0.7)"
                        : undefined,
                    },
                    "& .MuiOutlinedInput-root": {
                      color: isDarkTheme ? "#FFFFFF" : undefined,
                      "& fieldset": {
                        borderColor: isDarkTheme
                          ? "rgba(255, 255, 255, 0.23)"
                          : undefined,
                      },
                      "&:hover fieldset": {
                        borderColor: isDarkTheme
                          ? "rgba(255, 255, 255, 0.4)"
                          : undefined,
                      },
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    mt: 1,
                    color: isDarkTheme
                      ? "rgba(255, 255, 255, 0.7)"
                      : "rgba(0, 0, 0, 0.6)",
                  }}
                >
                  Enter the Algorand address of your participation node
                </Typography>
              </Box>
            )}
            {selectedOption === "service" && (
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: isDarkTheme
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(0, 0, 0, 0.05)",
                }}
              >
                <Typography
                  sx={{
                    color: isDarkTheme
                      ? "rgba(255, 255, 255, 0.7)"
                      : "rgba(0, 0, 0, 0.7)",
                    lineHeight: 1.6,
                  }}
                >
                  The node service is provided free of charge with a 10% fee
                  applied only to generated block rewards.
                </Typography>
              </Box>
            )}
          </Box>
        );

      case 3:
        return (
          <Box sx={{ py: 2 }}>
            {isMinting ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <CircularProgress
                  size={100}
                  sx={{ color: isDarkTheme ? "#FFFFFF" : undefined }}
                />
                <Typography
                  variant="h6"
                  color={isDarkTheme ? "#FFFFFF" : undefined}
                >
                  Minting in progress...
                </Typography>
              </Box>
            ) : (
              <>
                <Typography
                  color={isDarkTheme ? "#FFFFFF" : undefined}
                  gutterBottom
                >
                  Confirm Your Selection:
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography
                    color={isDarkTheme ? "#FFFFFF" : undefined}
                    gutterBottom
                  >
                    • Contract ID: {contractId}
                  </Typography>
                  <Typography
                    color={isDarkTheme ? "#FFFFFF" : undefined}
                    gutterBottom
                  >
                    • Staking Option:{" "}
                    {selectedOption === "own"
                      ? "Own Node"
                      : "Node as a Service"}
                  </Typography>
                  {selectedOption === "own" && (
                    <Typography
                      color={isDarkTheme ? "#FFFFFF" : undefined}
                      gutterBottom
                    >
                      • Delegate Address:{" "}
                      <Box
                        component="span"
                        sx={{ display: "inline-flex", alignItems: "center" }}
                      >
                        {nodeAddress.slice(0, 6)}...{nodeAddress.slice(-6)}
                        <ContentCopyIcon
                          style={{
                            cursor: "pointer",
                            marginLeft: "5px",
                            fontSize: "16px",
                            color: "inherit",
                          }}
                          onClick={() =>
                            copyToClipboard(nodeAddress, "Delegate Address")
                          }
                        />
                      </Box>
                    </Typography>
                  )}
                  <Typography color={isDarkTheme ? "#FFFFFF" : undefined}>
                    • Transaction Fee: {0.003 * 2 + 100.3367} VOI
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        );
    }
  };

  const steps = [
    "Contract Information",
    "Select Staking Option",
    "Confirm & Mint",
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: isDarkTheme
            ? "rgba(30, 30, 30, 0.95)"
            : "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          borderRadius: "16px",
        },
      }}
    >
      <DialogTitle>
        <Typography variant="h6" color={isDarkTheme ? "#FFFFFF" : undefined}>
          Mint NFT
        </Typography>
        <Stepper
          activeStep={currentStep - 1}
          sx={{
            mt: 2,
            "& .MuiStepLabel-label": {
              color: isDarkTheme ? "rgba(255, 255, 255, 0.5)" : undefined,
              "&.Mui-active": {
                color: isDarkTheme ? "#FFFFFF" : undefined,
              },
              "&.Mui-completed": {
                color: isDarkTheme ? "rgba(255, 255, 255, 0.7)" : undefined,
              },
            },
            "& .MuiStepIcon-root": {
              color: isDarkTheme ? "rgba(255, 255, 255, 0.3)" : undefined,
              "&.Mui-active": {
                color: isDarkTheme ? "#FFFFFF" : undefined,
              },
              "&.Mui-completed": {
                color: isDarkTheme ? "rgba(255, 255, 255, 0.7)" : undefined,
              },
            },
          }}
        >
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </DialogTitle>
      <DialogContent>{renderStepContent()}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {!isMinting && (
          <>
            <Button
              onClick={onClose}
              variant={isDarkTheme ? "outlined" : "contained"}
              sx={{ color: isDarkTheme ? "#FFFFFF" : undefined }}
            >
              Cancel
            </Button>
            <Box sx={{ flex: 1 }} />
            {currentStep > 1 && (
              <Button
                onClick={handleBack}
                variant={isDarkTheme ? "outlined" : "contained"}
                sx={{ color: isDarkTheme ? "#FFFFFF" : undefined, mr: 1 }}
              >
                Back
              </Button>
            )}
            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                variant={isDarkTheme ? "outlined" : "contained"}
                sx={{ color: isDarkTheme ? "#FFFFFF" : undefined }}
                disabled={currentStep === 2 && !selectedOption}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={onMint}
                variant={isDarkTheme ? "outlined" : "contained"}
                sx={{ color: isDarkTheme ? "#FFFFFF" : undefined }}
                disabled={isMinting}
              >
                Confirm & Mint
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

const PositionRow: React.FC<PositionRowProps> = ({
  position,
  cellStyle,
  isSelected,
  onSelectRow,
  refreshTrigger = 0,
}) => {
  // Add refreshTrigger to queryKey to force refresh
  const { data, isLoading } = useStakingContract(position.contractId, {
    includeWithdrawable: true,
    queryKey: ["stakingAccount", position.contractId, refreshTrigger],
  });

  const {
    data: blocksData,
    isLoading: isLoadingBlocks,
    refetch: refetchBlocks,
  } = useBlocks();

  const { isDarkTheme } = useSelector((state: RootState) => state.theme);
  const { activeAccount, signTransactions } = useWallet();

  const [isDepositLoading, setIsDepositLoading] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [maxAmount, setMaxAmount] = useState<number>(0);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`${label} copied to clipboard`))
      .catch(() => toast.error("Failed to copy to clipboard"));
  };
  const handleClaim = async () => {
    if (!activeAccount) return;
    setIsWithdrawLoading(true);
    const apid = Number(position.contractId);
    const ci = new CONTRACT(
      apid,
      algodClient,
      undefined,
      {
        name: "NautilusVoiStaking",
        methods: [
          {
            name: "withdraw",
            args: [{ type: "uint64", name: "amount" }],
            readonly: false,
            returns: { type: "uint64" },
            desc: "Withdraw funds from contract.",
          },
        ],
        events: [],
      },
      { addr: activeAccount.address, sk: new Uint8Array(0) }
    );
    ci.setFee(5000);
    try {
      const withdrawR2 = await ci.withdraw(BigInt(withdrawAmount));
      if (!withdrawR2.success) {
        console.log({ withdrawR2 });
        throw new Error("Withdraw failed in simulate");
      }
      const stxns = await signTransactions(
        withdrawR2.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );
      const { txId } = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();
      await waitForConfirmation(algodClient, txId, 4);
      party.confetti(document.body, {
        count: party.variation.range(200, 300),
        size: party.variation.range(1, 1.4),
      });
      setIsMintModalOpen(false);
      toast.success("Claimed");
    } catch (error) {
      console.error("Error claiming rewards:", error);
      toast.error("Failed to claim rewards");
    } finally {
      setIsWithdrawLoading(false);
    }
  };

  const cellStyleWithColor = {
    ...cellStyle,
  };

  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);
  const [currentRound, setCurrentRound] = useState<number>(0);

  useEffect(() => {
    const fetchCurrentRound = async () => {
      try {
        const status = await algodClient.status().do();
        setCurrentRound(status["last-round"]);
      } catch (error) {
        console.error("Error fetching current round:", error);
      }
    };

    fetchCurrentRound();
    const interval = setInterval(fetchCurrentRound, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const getExpirationTime = (part_vote_lst: number) => {
    if (!part_vote_lst || !currentRound) return null;

    const roundDifference = part_vote_lst - currentRound;
    if (roundDifference <= 0) return "Expired";

    const secondsRemaining = roundDifference * 2.8;

    return humanizeDuration(secondsRemaining * 1000, {
      largest: 2,
      round: true,
      units: ["y", "mo", "d", "h", "m"],
    });
  };

  const [isParticipateModalOpen, setIsParticipateModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // Add new state for dropdown menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleWithdrawConfirm = async () => {
    if (!activeAccount) return;
    setIsWithdrawLoading(true);
    const apid = Number(position.contractId);
    const ci = new CONTRACT(
      apid,
      algodClient,
      undefined,
      {
        name: "NautilusVoiStaking",
        methods: [
          {
            name: "withdraw",
            args: [{ type: "uint64", name: "amount" }],
            readonly: false,
            returns: { type: "uint64" },
            desc: "Withdraw funds from contract.",
          },
        ],
        events: [],
      },
      { addr: activeAccount.address, sk: new Uint8Array(0) }
    );
    ci.setFee(5000);
    try {
      const withdrawR2 = await ci.withdraw(BigInt(withdrawAmount));
      if (!withdrawR2.success) {
        console.log({ withdrawR2 });
        throw new Error("Withdraw failed in simulate");
      }
      const stxns = await signTransactions(
        withdrawR2.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );
      const { txId } = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();
      await waitForConfirmation(algodClient, txId, 4);
      await refetch();
      party.confetti(document.body, {
        count: party.variation.range(200, 300),
        size: party.variation.range(1, 1.4),
      });
      toast.success("Claimed");
      setIsWithdrawModalOpen(false);
      setWithdrawAmount(0);
    } catch (error) {
      console.error("Error claiming rewards:", error);
      toast.error("Failed to claim rewards");
    } finally {
      setIsWithdrawLoading(false);
    }
  };

  const handleDepositConfirm = async () => {
    if (!activeAccount || !amount) {
      toast.error("Please connect your wallet and enter an amount");
      return;
    }

    setIsDepositLoading(true);
    try {
      // Create payment transaction to app account
      const suggestedParams = await algodClient.getTransactionParams().do();
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: activeAccount.address,
        to: position.contractAddress,
        amount: Math.floor(Number(amount) * 1e6), // Convert VOI to microVOI
        suggestedParams,
        note: new TextEncoder().encode(
          `deposit ${amount} VOI to staking contract ${position.contractId}`
        ),
      });
      const stxns = await signTransactions([paymentTxn.toByte()]);
      const { txId } = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();

      await waitForConfirmation(algodClient, txId, 4);
      await refetch();
      toast.success("Successfully deposited funds");
      setIsDepositModalOpen(false);
      setAmount("");
    } catch (error) {
      console.error("Error depositing:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to deposit funds"
      );
    } finally {
      setIsDepositLoading(false);
    }
  };

  useEffect(() => {
    const fetchBalance = async () => {
      if (activeAccount?.address && isDepositModalOpen) {
        try {
          const accountInfo = await algodClient
            .accountInformation(activeAccount.address)
            .do();
          const amount = accountInfo.amount;
          const minBalance = accountInfo["min-balance"];
          const availableBalance = Math.max(amount - minBalance - 1e6, 0) / 1e6;
          setMaxAmount(availableBalance);
        } catch (error) {
          console.error("Error fetching balance:", error);
          setMaxAmount(0);
        }
      }
    };

    fetchBalance();
  }, [activeAccount?.address, isDepositModalOpen]);

  // Add new state and modal component
  const [isBlockProductionModalOpen, setIsBlockProductionModalOpen] =
    useState(false);
  const [blockProductionData, setBlockProductionData] = useState<
    BlockProductionData[]
  >([]);
  const [isLoadingBlockData, setIsLoadingBlockData] = useState(false);

  // Add new function to fetch block production data
  const fetchBlockProductionData = async (contractAddress: string) => {
    setIsLoadingBlockData(true);
    try {
      const response = await fetch(
        `https://api.voirewards.com/proposers/index_main_3.php?action=epoch-summary&wallet=${contractAddress}`
      );
      const data = await response.json();
      setBlockProductionData(data.snapshots || []);
    } catch (error) {
      console.error("Error fetching block production data:", error);
      toast.error("Failed to fetch block production data");
    } finally {
      setIsLoadingBlockData(false);
    }
  };

  // Inside PositionRow component, update this function to use period numbers
  const transformDataForGraph = (data: BlockProductionData[]) => {
    return data.map((snapshot, index) => ({
      count: snapshot.proposers[position.contractAddress] || 0,
      label: `${index}`, // Most recent period will be Period 1
    }));
  };

  const [isMinting, setIsMinting] = useState(false);

  const handleMint = async () => {
    if (!activeAccount) {
      toast.error("Please connect your wallet");
      return;
    }
    try {
      setIsMinting(true);
      const { algodClient, indexerClient } = getAlgorandClients();
      const apid = 421076;
      const to = activeAccount.address;
      const tokenId = Number(position.contractId);
      const ci = new CONTRACT(apid, algodClient, indexerClient, abi.custom, {
        addr: activeAccount.address,
        sk: new Uint8Array(0),
      });
      const builder = {
        arc72: new CONTRACT(
          apid,
          algodClient,
          indexerClient,
          {
            name: "OSARC72Token",
            methods: [
              {
                name: "mint",
                args: [
                  {
                    type: "address",
                    name: "to",
                  },
                  {
                    type: "uint64",
                    name: "tokenId",
                  },
                  {
                    type: "address",
                    name: "delegate",
                  },
                ],
                readonly: false,
                returns: {
                  type: "uint256",
                },
                desc: "Mint a new NFT",
              },
            ],
            events: [],
          },
          {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
        ownable: new CONTRACT(
          tokenId,
          algodClient,
          indexerClient,
          {
            name: "Ownable",
            methods: [
              {
                name: "transfer",
                args: [
                  {
                    type: "address",
                    name: "new_owner",
                  },
                ],
                readonly: false,
                returns: {
                  type: "void",
                },
              },
            ],
            events: [],
          },
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
      const txnO = (
        await builder.ownable.transfer(algosdk.getApplicationAddress(apid))
      ).obj;
      buildN.push({
        ...txnO,
        note: new TextEncoder().encode(
          `transfer ownership of ${
            position.contractId
          } to: ${algosdk.getApplicationAddress(apid)}`
        ),
      });
      const delegate =
        "7REOQMRXHEFIETBIRWXJS7ZE6X7FZCNYPK7GFQMRRZE6NVZT426U7ZESQ4";
      const txn1 = (await builder.arc72.mint(to, tokenId, delegate)).obj;
      const note1 = new TextEncoder().encode(
        `mint to: ${to} tokenId: ${tokenId} delegate: ${delegate}`
      );
      console.log({ mint: txn1 });
      buildN.push({
        ...txn1,
        payment: 336700 + 100 * 1e6,
        note: note1,
      });
      ci.setFee(3000);
      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);
      ci.setGroupResourceSharingStrategy("merge");
      const customR = await ci.custom();
      if (!customR.success) {
        console.log({ customR });
        throw new Error("Mint failed in simulate");
      }

      const stxns = await signTransactions(
        customR.txns.map(
          (t: string) => new Uint8Array(Buffer.from(t, "base64"))
        )
      );

      const { txId } = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();

      await waitForConfirmation(algodClient, txId, 4);

      setIsMintModalOpen(false);

      // Set success state
      setSuccessTxId(txId);
      setIsSuccessModalOpen(true);

      party.confetti(document.body, {
        count: party.variation.range(200, 300),
        size: party.variation.range(1, 1.4),
      });

      toast.success("Successfully minted staking NFT");
    } catch (error) {
      console.error("Error minting:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to mint rewards"
      );
    } finally {
      setIsMinting(false);
      handleClose();
    }
  };

  const [isMintModalOpen, setIsMintModalOpen] = useState(false);

  // Update the menu item click handler
  const handleMintClick = () => {
    setIsMintModalOpen(true);
    handleClose();
  };

  // Add new state for success modal
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successTxId, setSuccessTxId] = useState<string>("");

  if (isLoading) {
    return (
      <TableRow>
        <TableCell style={cellStyleWithColor} colSpan={9} align="right">
          <Skeleton variant="text" />
        </TableCell>
      </TableRow>
    );
  }
  return (
    <>
      <TableRow
        hover
        role="checkbox"
        aria-checked={isSelected}
        tabIndex={-1}
        selected={isSelected}
        sx={{
          cursor: "pointer",
          "&.Mui-selected": {
            backgroundColor: isDarkTheme
              ? "rgba(153, 51, 255, 0.08)"
              : "rgba(153, 51, 255, 0.08)",
          },
          "&.Mui-selected:hover": {
            backgroundColor: isDarkTheme
              ? "rgba(153, 51, 255, 0.12)"
              : "rgba(153, 51, 255, 0.12)",
          },
        }}
      >
        <TableCell padding="checkbox" style={cellStyle}>
          <Checkbox
            checked={isSelected}
            onChange={(event) => {
              event.stopPropagation();
              onSelectRow();
            }}
            onClick={(event) => {
              event.stopPropagation();
            }}
            sx={{
              color: isDarkTheme ? "white" : undefined,
              "&.Mui-checked": {
                color: "#9933ff",
              },
            }}
          />
        </TableCell>
        <TableCell
          onClick={(event) => {
            event.stopPropagation();
            onSelectRow();
          }}
          style={{
            ...cellStyle,
            color: isDarkTheme ? "white" : "black",
            fontWeight: 100,
          }}
          align="right"
        >
          <a
            href={`https://block.voi.network/explorer/application/${position.contractId}/global-state`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "inherit" }}
            onClick={(e) => e.stopPropagation()}
          >
            {position.contractId}
          </a>
          <ContentCopyIcon
            style={{
              cursor: "pointer",
              marginLeft: "5px",
              fontSize: "16px",
              color: "inherit",
            }}
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(position.contractId, "Account ID");
            }}
          />
        </TableCell>
        <TableCell
          onClick={(event) => {
            event.stopPropagation();
            onSelectRow();
          }}
          style={{
            ...cellStyle,
            color: isDarkTheme ? "white" : "black",
            fontWeight: 100,
          }}
          align="center"
        >
          <a
            href={`https://block.voi.network/explorer/account/${position.contractAddress}/transactions`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "inherit" }}
            onClick={(e) => e.stopPropagation()}
          >
            {position.contractAddress.slice(0, 6)}...
            {position.contractAddress.slice(-6)}
          </a>
          <ContentCopyIcon
            style={{
              cursor: "pointer",
              marginLeft: "5px",
              fontSize: "16px",
              color: "inherit",
            }}
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(position.contractAddress, "Account Address");
            }}
          />
        </TableCell>
        <TableCell
          onClick={(event) => {
            event.stopPropagation();
            onSelectRow();
          }}
          style={{
            ...cellStyle,
            color: isDarkTheme ? "white" : "black",
            fontWeight: 100,
          }}
          align="center"
        >
          {position.global_delegate.slice(0, 6)}...
          {position.global_delegate.slice(-6)}
          <ContentCopyIcon
            style={{
              cursor: "pointer",
              marginLeft: "5px",
              fontSize: "16px",
              color: "inherit",
            }}
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(position.global_delegate, "Account Address");
            }}
          />
        </TableCell>
        <TableCell
          onClick={(event) => {
            event.stopPropagation();
            onSelectRow();
          }}
          style={{
            ...cellStyle,
            color: isDarkTheme ? "white" : "black",
            fontWeight: 100,
          }}
          align="right"
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-evenly",
                flexShrink: 0,
              }}
            >
              <img src={VIAIcon} style={{ height: "12px" }} alt="VOI Icon" />
              <Typography
                variant="body2"
                sx={{
                  ml: 1,
                  color: isDarkTheme ? "white" : "black",
                  fontWeight: 500,
                }}
              >
                {formatNumber(getStakingTotalTokens(position))} VOI
              </Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell
          onClick={(event) => {
            event.stopPropagation();
            onSelectRow();
          }}
          style={{
            ...cellStyle,
            color: isDarkTheme ? "white" : "black",
            fontWeight: 100,
          }}
          align="right"
        >
          <Typography variant="body2" sx={{ flexShrink: 0 }}>
            {moment.unix(getStakingUnlockTime(position)).fromNow(true)}
          </Typography>
        </TableCell>
        <TableCell
          onClick={(event) => {
            event.stopPropagation();
            onSelectRow();
          }}
          style={{
            ...cellStyle,
            color: isDarkTheme ? "white" : "black",
            fontWeight: 100,
          }}
          align="right"
        >
          <Typography variant="body2" sx={{ flexShrink: 0 }}>
            {getExpirationTime(position.part_vote_lst)}
          </Typography>
        </TableCell>
        <TableCell
          onClick={(event) => {
            event.stopPropagation();
            onSelectRow();
          }}
          style={{
            ...cellStyle,
            color: isDarkTheme ? "white" : "black",
            fontWeight: 100,
          }}
          align="right"
        >
          {blocksData?.getProposerBlocks(position.contractAddress)}
        </TableCell>
        <TableCell
          onClick={(event) => {
            event.stopPropagation();
            onSelectRow();
          }}
          style={{
            ...cellStyle,
            color: isDarkTheme ? "white" : "black",
            fontWeight: 100,
          }}
          align="right"
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              animation:
                Number(data?.withdrawable || 0) > 0
                  ? "glow 1.5s ease-in-out infinite alternate"
                  : "none",
              "@keyframes glow": {
                from: {
                  textShadow: "0 0 5px rgba(255,255,255,0.2)",
                },
                to: {
                  textShadow: "0 0 20px rgba(255,255,255,0.6)",
                },
              },
            }}
          >
            <img
              src={VIAIcon}
              style={{
                height: "12px",
                filter:
                  Number(data?.withdrawable || 0) === 0
                    ? "grayscale(100%)"
                    : undefined,
              }}
              alt="VOI Icon"
            />
            <Typography
              variant="body2"
              sx={{
                ml: 1,
                color: isDarkTheme ? "white" : "black",
                fontWeight: 500,
              }}
            >
              {Number(data?.withdrawable || 0) / 1e6} VOI
            </Typography>
          </Box>
        </TableCell>
        <TableCell
          onClick={(event) => {
            event.stopPropagation();
            onSelectRow();
          }}
          style={{
            ...cellStyle,
            color: isDarkTheme ? "white" : "black",
            fontWeight: 100,
          }}
          align="right"
        >
          <Button
            id="actions-button"
            aria-controls={open ? "actions-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
            onClick={handleClick}
            variant={isDarkTheme ? "outlined" : "contained"}
            size="small"
            sx={{
              borderRadius: "12px",
              minWidth: "40px",
              color: isDarkTheme ? "#FFFFFF" : undefined,
              backgroundColor: isDarkTheme ? "transparent" : undefined,
              borderColor: isDarkTheme ? "rgba(255, 255, 255, 0.3)" : undefined,
            }}
          >
            <MoreVerticalIcon />
          </Button>
          <Menu
            id="actions-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            MenuListProps={{
              "aria-labelledby": "actions-button",
            }}
            PaperProps={{
              sx: {
                backgroundColor: isDarkTheme
                  ? "rgba(30, 30, 30, 0.95)"
                  : "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(10px)",
              },
            }}
          >
            <MenuItem
              onClick={() => {
                setIsDepositModalOpen(true);
                handleClose();
              }}
              sx={{
                color: isDarkTheme ? "#FFFFFF" : undefined,
                gap: 1.5,
              }}
            >
              <ArrowUpIcon size={18} /> Deposit
            </MenuItem>
            {Number(data?.withdrawable || 0) > 0 && (
              <MenuItem
                onClick={() => {
                  setIsWithdrawModalOpen(true);
                  handleClose();
                }}
                sx={{
                  color: isDarkTheme ? "#FFFFFF" : undefined,
                  gap: 1.5,
                }}
              >
                <ArrowDownIcon size={18} /> Withdraw
              </MenuItem>
            )}
            <MenuItem
              onClick={() => {
                setIsDelegateModalOpen(true);
                handleClose();
              }}
              sx={{
                color: isDarkTheme ? "#FFFFFF" : undefined,
                gap: 1.5,
              }}
            >
              <UserIcon size={18} /> Change Delegate
            </MenuItem>
            <MenuItem
              onClick={() => {
                setIsParticipateModalOpen(true);
                handleClose();
              }}
              sx={{
                color: isDarkTheme ? "#FFFFFF" : undefined,
                gap: 1.5,
              }}
            >
              <PowerIcon size={18} />{" "}
              {!position.part_vote_lst ? "Go Online" : "Update Participation"}
            </MenuItem>
            <MenuItem
              onClick={handleMintClick}
              disabled={isMinting}
              sx={{
                color: isDarkTheme ? "#FFFFFF" : undefined,
                gap: 1.5,
              }}
            >
              <CoinsIcon size={18} />
              {isMinting ? "Minting..." : "Mint NFT"}
            </MenuItem>
            <MenuItem
              onClick={() => {
                fetchBlockProductionData(position.contractAddress);
                setIsBlockProductionModalOpen(true);
                handleClose();
              }}
              sx={{
                color: isDarkTheme ? "#FFFFFF" : undefined,
                gap: 1.5,
              }}
            >
              <BarChart3Icon size={18} /> View Block Production
            </MenuItem>
          </Menu>
        </TableCell>
      </TableRow>

      <Dialog
        maxWidth="xs"
        fullWidth
        open={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: isDarkTheme
              ? "rgba(30, 30, 30, 0.95)"
              : "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            borderRadius: "16px",
          },
        }}
      >
        <DialogTitle>
          <Typography variant="h6" color={isDarkTheme ? "#FFFFFF" : undefined}>
            Deposit VOI
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, py: 2 }}>
            {isDepositLoading ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <CircularProgress
                  size={100}
                  sx={{ color: isDarkTheme ? "#FFFFFF" : undefined }}
                />
                <Typography
                  variant="h6"
                  color={isDarkTheme ? "#FFFFFF" : undefined}
                >
                  Signature pending...
                </Typography>
              </Box>
            ) : (
              <>
                <Typography color={isDarkTheme ? "#FFFFFF" : undefined}>
                  Select amount to deposit: {Number(amount || 0).toFixed(6)} VOI
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Slider
                    value={Number(amount || 0)}
                    onChange={(_, value) => setAmount(value.toString())}
                    min={0}
                    max={maxAmount}
                    step={0.001}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value.toFixed(6)} VOI`}
                    sx={{
                      color: isDarkTheme ? "#FFFFFF" : undefined,
                      "& .MuiSlider-valueLabel": {
                        backgroundColor: isDarkTheme
                          ? "rgba(30, 30, 30, 0.95)"
                          : undefined,
                      },
                    }}
                  />
                  <Button
                    onClick={() => setAmount(maxAmount.toString())}
                    variant={isDarkTheme ? "outlined" : "contained"}
                    size="small"
                    sx={{
                      color: isDarkTheme ? "#FFFFFF" : undefined,
                      minWidth: "60px",
                    }}
                  >
                    Max
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          {!isDepositLoading && (
            <>
              <Button
                onClick={() => setIsDepositModalOpen(false)}
                variant={isDarkTheme ? "outlined" : "contained"}
                sx={{
                  color: isDarkTheme ? "#FFFFFF" : undefined,
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={isDepositLoading}
                onClick={handleDepositConfirm}
                variant={isDarkTheme ? "outlined" : "contained"}
                sx={{
                  color: isDarkTheme ? "#FFFFFF" : undefined,
                }}
              >
                {isDepositLoading ? (
                  <Circ
                    size={16}
                    sx={{ color: isDarkTheme ? "#FFFFFF" : "inherit" }}
                  />
                ) : (
                  "Confirm"
                )}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        maxWidth="xs"
        fullWidth
        open={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: isDarkTheme
              ? "rgba(30, 30, 30, 0.95)"
              : "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            borderRadius: "16px",
          },
        }}
      >
        <DialogTitle>
          <Typography variant="h6" color={isDarkTheme ? "#FFFFFF" : undefined}>
            Withdraw Funds
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, py: 2 }}>
            {isWithdrawLoading ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <CircularProgress
                  size={100}
                  sx={{ color: isDarkTheme ? "#FFFFFF" : undefined }}
                />
                <Typography
                  variant="h6"
                  color={isDarkTheme ? "#FFFFFF" : undefined}
                >
                  Signature pending...
                </Typography>
              </Box>
            ) : (
              <>
                <Typography color={isDarkTheme ? "#FFFFFF" : undefined}>
                  Select amount to withdraw: {withdrawAmount / 1e6} VOI
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Slider
                    value={withdrawAmount}
                    onChange={(_, value) => setWithdrawAmount(value as number)}
                    min={0}
                    max={Number(data?.withdrawable || 0)}
                    step={1000}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) =>
                      `${(value / 1e6).toFixed(6)} VOI`
                    }
                    sx={{
                      color: isDarkTheme ? "#FFFFFF" : undefined,
                      "& .MuiSlider-valueLabel": {
                        backgroundColor: isDarkTheme
                          ? "rgba(30, 30, 30, 0.95)"
                          : undefined,
                      },
                    }}
                  />
                  <Button
                    onClick={() =>
                      setWithdrawAmount(Number(data?.withdrawable || 0))
                    }
                    variant={isDarkTheme ? "outlined" : "contained"}
                    size="small"
                    sx={{
                      color: isDarkTheme ? "#FFFFFF" : undefined,
                      minWidth: "60px",
                    }}
                  >
                    Max
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          {!isWithdrawLoading && (
            <>
              <Button
                onClick={() => setIsWithdrawModalOpen(false)}
                variant={isDarkTheme ? "outlined" : "contained"}
                sx={{
                  color: isDarkTheme ? "#FFFFFF" : undefined,
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={isWithdrawLoading}
                onClick={handleWithdrawConfirm}
                variant={isDarkTheme ? "outlined" : "contained"}
                sx={{
                  color: isDarkTheme ? "#FFFFFF" : undefined,
                }}
              >
                {isWithdrawLoading ? (
                  <CircularProgress
                    size={16}
                    sx={{ color: isDarkTheme ? "#FFFFFF" : "inherit" }}
                  />
                ) : (
                  "Confirm"
                )}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <DelegateModal
        open={isDelegateModalOpen}
        onClose={() => setIsDelegateModalOpen(false)}
        contractId={position.contractId}
        currentDelegate={position.global_delegate}
      />

      <ParticipateModal
        open={isParticipateModalOpen}
        onClose={() => setIsParticipateModalOpen(false)}
        contractId={position.contractId}
      />

      <Dialog
        maxWidth="md"
        fullWidth
        open={isBlockProductionModalOpen}
        onClose={() => setIsBlockProductionModalOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: isDarkTheme
              ? "rgba(30, 30, 30, 0.95)"
              : "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            borderRadius: "16px",
          },
        }}
      >
        <DialogTitle>
          <Typography variant="h6" color={isDarkTheme ? "#FFFFFF" : undefined}>
            Block Production History
          </Typography>
        </DialogTitle>
        <DialogContent>
          {isLoadingBlockData ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="body2"
                  color={
                    isDarkTheme ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)"
                  }
                  sx={{ mb: 2 }}
                >
                  View detailed profitability analysis on{" "}
                  <Link
                    href={`https://voirewards.com/wallet/${position.contractAddress}#calculator`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: isDarkTheme ? "#90caf9" : "#1976d2",
                      textDecoration: "none",
                      "&:hover": {
                        textDecoration: "underline",
                      },
                    }}
                  >
                    Voi Rewards Auditor
                  </Link>
                </Typography>
              </Box>
              <Box sx={{ mb: 4 }}>
                <BlockProductionGraph
                  data={transformDataForGraph(blockProductionData)}
                  isDarkTheme={isDarkTheme}
                />
              </Box>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{ color: isDarkTheme ? "#FFFFFF" : undefined }}
                    >
                      Period
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: isDarkTheme ? "#FFFFFF" : undefined }}
                    >
                      Blocks Produced
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: isDarkTheme ? "#FFFFFF" : undefined }}
                    >
                      Total Blocks
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: isDarkTheme ? "#FFFFFF" : undefined }}
                    >
                      Participation Rate
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {blockProductionData.map((snapshot, index) => {
                    const blocksProduced =
                      snapshot.proposers[position.contractAddress] || 0;
                    const participationRate = (
                      (blocksProduced / snapshot.total_blocks) *
                      100
                    ).toFixed(2);

                    return (
                      <TableRow key={index}>
                        <TableCell
                          sx={{ color: isDarkTheme ? "#FFFFFF" : undefined }}
                        >
                          {moment(snapshot.start_date).format("MMM D")} -{" "}
                          {moment(snapshot.end_date).format("MMM D, YYYY")}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: isDarkTheme ? "#FFFFFF" : undefined }}
                        >
                          {blocksProduced.toLocaleString()}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: isDarkTheme ? "#FFFFFF" : undefined }}
                        >
                          {snapshot.total_blocks.toLocaleString()}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: isDarkTheme ? "#FFFFFF" : undefined }}
                        >
                          {participationRate}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIsBlockProductionModalOpen(false)}
            variant={isDarkTheme ? "outlined" : "contained"}
            sx={{
              color: isDarkTheme ? "#FFFFFF" : undefined,
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <MintModal
        open={isMintModalOpen}
        onClose={() => setIsMintModalOpen(false)}
        contractId={position.contractId}
        onMint={handleMint}
        isMinting={isMinting}
        position={position}
        stakingData={data}
      />

      <Dialog
        open={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: isDarkTheme
              ? "rgba(30, 30, 30, 0.95)"
              : "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            borderRadius: "16px",
          },
        }}
      >
        <DialogTitle>
          <Typography variant="h6" color={isDarkTheme ? "#FFFFFF" : undefined}>
            NFT Minted Successfully!
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, textAlign: "center" }}>
            <Typography
              color={isDarkTheme ? "#FFFFFF" : undefined}
              gutterBottom
            >
              Your staking NFT has been minted successfully. <br />
              View the transaction details below:
            </Typography>
            <Link
              href={`https://block.voi.network/explorer/transaction/${successTxId}`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: isDarkTheme ? "#90caf9" : "#1976d2",
                textDecoration: "none",
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              View Transaction in Explorer
            </Link>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIsSuccessModalOpen(false)}
            variant={isDarkTheme ? "outlined" : "contained"}
            sx={{
              color: isDarkTheme ? "#FFFFFF" : undefined,
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PositionRow;
