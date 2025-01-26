import React, { useState, useEffect } from "react";
import {
  Button,
  TableCell,
  TableRow,
  useTheme,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
  TextField,
  Grid,
  Box,
  Menu,
  ListItemIcon,
  ListItemText,
  MenuItem,
  CircularProgress,
  Slider,
  Table,
  TableHead,
  TableBody,
  Checkbox,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Skeleton from "@mui/material/Skeleton";
import { useStakingContract } from "@/hooks/staking";
import { getStakingTotalTokens, getStakingUnlockTime } from "@/utils/staking";
import moment from "moment";
import { useWallet } from "@txnlab/use-wallet-react";
import { getAlgorandClients } from "@/wallets";
import { CONTRACT } from "ulujs";
import { toast } from "react-toastify";
import VIAIcon from "/src/static/crypto-icons/voi/6779767.svg";
import algosdk from "algosdk";
import party from "party-js";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import DelegateModal from "@/components/modals/DelegateModal";
import { NAAS_ADDRESS } from "@/contants/staking";
import humanizeDuration from "humanize-duration";
import {
  MoreVerticalIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  UserIcon,
  PowerIcon,
  BarChart3Icon,
  FlameIcon,
} from "lucide-react";
import BlockProductionGraph from "@/pages/CommunityChest/components/BlockProductionGraph";
import { useBlocks } from "@/hooks/useBlocks";

const { algodClient } = getAlgorandClients();

interface PositionTokenRowProps {
  nft: {
    contractId: string;
    tokenId: string;
    staking: {
      contractId: string;
      tokenId: string;
      contractAddress: string;
      withdrawable: string;
      global_delegate: string;
      part_vote_lst: number;
    };
  };
  index: number;
  arc72TokensLength: number;
  lastRowStyle: React.CSSProperties;
  cellStyle: React.CSSProperties;
  selected: boolean;
  onSelect: (nft: any) => void;
  isSelectable?: boolean;
}

interface BlockProductionData {
  start_date: string;
  end_date: string;
  proposers: Record<string, number>;
  total_blocks: number;
  ballast_blocks: number;
}

const ParticipateModal: React.FC<{
  open: boolean;
  onClose: () => void;
  contractId: string;
}> = ({ open, onClose, contractId }) => {
  const { isDarkTheme } = useSelector((state: RootState) => state.theme);
  const { activeAccount, signTransactions } = useWallet();

  const [formData, setFormData] = useState({
    firstRound: "",
    lastRound: "",
    keyDilution: "",
    selectionKey: "",
    votingKey: "",
    stateProofKey: "",
  });

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

  const handleSubmit = async () => {
    if (!activeAccount) {
      toast.error("Please connect your wallet");
      return;
    }

    console.log({ contractId });

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

      console.log({ participateResult });

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

      await algosdk.waitForConfirmation(algodClient, txId, 4);
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

const PositionTokenRow: React.FC<PositionTokenRowProps> = ({
  nft,
  index,
  arc72TokensLength,
  lastRowStyle,
  cellStyle,
  selected,
  onSelect,
  isSelectable = true,
}) => {
  if (!nft.staking) return null;
  const { isDarkTheme } = useSelector((state: RootState) => state.theme);
  const { activeAccount, signTransactions } = useWallet();
  const { data, isLoading, refetch } = useStakingContract(Number(nft.tokenId), {
    includeRewards: true,
    includeWithdrawable: true,
  });
  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [isParticipateModalOpen, setIsParticipateModalOpen] = useState(false);
  const {
    data: blocksData,
    isLoading: isLoadingBlocks,
    refetch: refetchBlocks,
  } = useBlocks();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isBlockProductionModalOpen, setIsBlockProductionModalOpen] =
    useState(false);
  const [blockProductionData, setBlockProductionData] = useState<
    BlockProductionData[]
  >([]);
  const [isLoadingBlockData, setIsLoadingBlockData] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [maxAmount, setMaxAmount] = useState<number>(0);
  const [isDepositLoading, setIsDepositLoading] = useState(false);
  const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);
  const [isBurnLoading, setIsBurnLoading] = useState(false);
  const [isBurnModalOpen, setIsBurnModalOpen] = useState(false);
  const [successTxId, setSuccessTxId] = useState<string | null>(null);

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

  const handleClaim = async () => {
    if (!activeAccount) return;
    setIsWithdrawLoading(true);
    try {
      const apid = Number(nft.contractId);
      const ci = new CONTRACT(
        apid,
        algodClient,
        undefined,
        {
          name: "NautilusVoiStaking",
          methods: [
            {
              name: "withdraw",
              args: [
                {
                  type: "uint64",
                  name: "tokenId",
                },
                {
                  type: "uint64",
                  name: "amount",
                },
              ],
              readonly: false,
              returns: {
                type: "void",
              },
              desc: "Withdraw funds from contract.",
            },
          ],
          events: [],
        },
        {
          addr: activeAccount.address,
          sk: new Uint8Array(0),
        }
      );
      ci.setFee(6000);
      const withdrawR2 = await ci.withdraw(
        Number(nft.tokenId),
        BigInt(withdrawAmount * 1e6) // Convert VOI to microVOI
      );
      if (!withdrawR2.success) {
        console.error({ withdrawR2 });
        throw new Error("withdraw failed in simulate");
      }
      const stxns = await signTransactions(
        withdrawR2.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );
      const { txId } = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();
      await algosdk.waitForConfirmation(algodClient, txId, 4);
      await refetch();
      toast.success("Successfully withdrawn funds");
      setIsWithdrawModalOpen(false);
      setWithdrawAmount(0);
      party.confetti(document.body, {
        count: party.variation.range(200, 300),
        size: party.variation.range(1, 1.4),
      });
    } catch (error) {
      console.error("Error withdrawing:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to withdraw funds"
      );
    } finally {
      setIsWithdrawLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success(`${label} copied to clipboard`);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
        toast.error("Failed to copy to clipboard");
      });
  };

  const cellStyleWithColor = {
    ...cellStyle,
  };

  const renderExpirationCell = () => {
    // Check if active account is the delegate
    const isDelegate = activeAccount?.address === data?.global_delegate;

    if (!data?.part_vote_lst) {
      return (
        <>
          {isDelegate && (
            <Button
              variant={isDarkTheme ? "outlined" : "contained"}
              size="small"
              onClick={() => setIsParticipateModalOpen(true)}
              sx={{
                borderRadius: "12px",
                fontSize: "0.75rem",
                color: isDarkTheme ? "#FFFFFF" : undefined,
                backgroundColor: isDarkTheme ? "transparent" : undefined,
                borderColor: isDarkTheme
                  ? "rgba(255, 255, 255, 0.3)"
                  : undefined,
                "&:hover": {
                  backgroundColor: isDarkTheme
                    ? "rgba(255, 255, 255, 0.1)"
                    : undefined,
                  borderColor: isDarkTheme
                    ? "rgba(255, 255, 255, 0.5)"
                    : undefined,
                },
              }}
            >
              Go Online
            </Button>
          )}
        </>
      );
    }

    const roundDifference = data.part_vote_lst - currentRound;
    const isExpired = roundDifference <= 0;
    const timeRemaining = getExpirationTime(data.part_vote_lst);

    // Calculate if expiration is within 7 days
    const secondsRemaining = roundDifference * 2.8;
    const sevenDaysInSeconds = 7 * 24 * 60 * 60;
    const isNearExpiration = secondsRemaining <= sevenDaysInSeconds;

    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          justifyContent: "flex-end",
        }}
      >
        {timeRemaining === null ? (
          <Skeleton width={80} />
        ) : (
          <Typography
            sx={{
              color: isExpired
                ? "error.main"
                : isNearExpiration
                ? "warning.main"
                : "inherit",
            }}
          >
            {timeRemaining}
          </Typography>
        )}
        {!isExpired && !isNearExpiration && isDelegate && (
          <Button
            variant={isDarkTheme ? "outlined" : "contained"}
            size="small"
            onClick={() => setIsParticipateModalOpen(true)}
            sx={{
              borderRadius: "12px",
              fontSize: "0.75rem",
              minWidth: "60px",
              color: isDarkTheme ? "#FFFFFF" : undefined,
              backgroundColor: isDarkTheme ? "transparent" : undefined,
              borderColor: isDarkTheme ? "rgba(255, 255, 255, 0.3)" : undefined,
              "&:hover": {
                backgroundColor: isDarkTheme
                  ? "rgba(255, 255, 255, 0.1)"
                  : undefined,
                borderColor: isDarkTheme
                  ? "rgba(255, 255, 255, 0.5)"
                  : undefined,
              },
            }}
          >
            Update
          </Button>
        )}
        {!isExpired && isNearExpiration && isDelegate && (
          <Button
            variant={isDarkTheme ? "outlined" : "contained"}
            size="small"
            onClick={() => setIsParticipateModalOpen(true)}
            sx={{
              borderRadius: "12px",
              fontSize: "0.75rem",
              minWidth: "60px",
              color: isDarkTheme ? "#FFFFFF" : undefined,
              backgroundColor: isDarkTheme ? "transparent" : undefined,
              borderColor: isDarkTheme ? "rgba(255, 255, 255, 0.3)" : undefined,
              "&:hover": {
                backgroundColor: isDarkTheme
                  ? "rgba(255, 255, 255, 0.1)"
                  : undefined,
                borderColor: isDarkTheme
                  ? "rgba(255, 255, 255, 0.5)"
                  : undefined,
              },
            }}
          >
            Renew
          </Button>
        )}
        <ParticipateModal
          open={isParticipateModalOpen}
          onClose={() => setIsParticipateModalOpen(false)}
          contractId={Number(nft.tokenId)}
        />
      </Box>
    );
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

  const handleDepositConfirm = async () => {
    if (!activeAccount || !amount) {
      toast.error("Please connect your wallet and enter an amount");
      return;
    }

    setIsDepositLoading(true);
    try {
      // Create payment transaction to app account

      const ci = new CONTRACT(
        Number(nft.contractId),
        algodClient,
        undefined,
        {
          name: "NautilusVoiStaking",
          desc: "Nautilus Voi Staking Contract",
          methods: [
            {
              name: "deposit",
              args: [{ type: "uint64", name: "tokenId" }],
              returns: { type: "uint64" },
            },
          ],
          events: [],
        },
        {
          addr: activeAccount.address,
          sk: new Uint8Array(0),
        }
      );
      ci.setFee(2000);
      ci.setPaymentAmount(Math.floor(Number(amount) * 1e6));
      const depositR = await ci.deposit(Number(nft.tokenId));
      if (!depositR.success) {
        console.error({ depositR });
        throw new Error("deposit failed in simulate");
      }
      const stxns = await signTransactions(
        depositR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );
      const { txId } = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();
      await algosdk.waitForConfirmation(algodClient, txId, 4);
      //await refetch(); // fix missing refetch
      toast.success("Successfully deposited funds");
      setIsDepositModalOpen(false);
      setAmount("");

      // const suggestedParams = await algodClient.getTransactionParams().do();
      // const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      //   from: activeAccount.address,
      //   to: nft.staking?.contractAddress || "",
      //   amount: Math.floor(Number(amount) * 1e6), // Convert VOI to microVOI
      //   suggestedParams,
      //   note: new TextEncoder().encode(
      //     `deposit ${amount} VOI to staking contract ${nft.contractId}`
      //   ),
      // });
      // const stxns = await signTransactions([paymentTxn.toByte()]);
      // const { txId } = await algodClient
      //   .sendRawTransaction(stxns as Uint8Array[])
      //   .do();

      // await algosdk.waitForConfirmation(algodClient, txId, 4);
      // await refetch();
      // toast.success("Successfully deposited funds");
      // setIsDepositModalOpen(false);
      // setAmount("");
    } catch (error) {
      console.error("Error depositing:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to deposit funds"
      );
    } finally {
      setIsDepositLoading(false);
    }
  };

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

  const transformDataForGraph = (data: BlockProductionData[]) => {
    return data.map((snapshot, index) => ({
      count: snapshot.proposers[nft.staking.contractAddress] || 0,
      label: `${index}`, // Most recent period will be Period 1
    }));
  };

  const handleBurnToken = async () => {
    if (!activeAccount) {
      toast.error("Please connect your wallet");
      return;
    }

    setIsBurnLoading(true);
    try {
      const ci = new CONTRACT(
        Number(nft.contractId),
        algodClient,
        undefined,
        {
          name: "NautilusVoiStaking",
          methods: [
            {
              name: "burn",
              args: [{ type: "uint64", name: "tokenId" }],
              returns: { type: "void" },
              desc: "Burn staking position token.",
            },
          ],
          events: [],
        },
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );

      ci.setFee(5000);
      const burnResult = await ci.burn(Number(nft.tokenId));

      if (!burnResult.success) {
        console.error({ burnResult });
        throw new Error("Burn failed in simulate");
      }

      const stxns = await signTransactions(
        burnResult.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );

      const { txId } = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();

      await algosdk.waitForConfirmation(algodClient, txId, 4);
      await refetch();
      setSuccessTxId(txId);
      setIsBurnModalOpen(false);
      party.confetti(document.body, {
        count: party.variation.range(200, 300),
        size: party.variation.range(1, 1.4),
      });
    } catch (error) {
      console.error("Error burning token:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to burn token"
      );
    } finally {
      setIsBurnLoading(false);
    }
  };

  return (
    <>
      <TableRow
        hover
        role="checkbox"
        aria-checked={selected}
        tabIndex={-1}
        selected={selected}
        onClick={() => isSelectable && onSelect(nft)}
        sx={{
          cursor: isSelectable ? 'pointer' : 'default',
          '&.Mui-selected': {
            backgroundColor: isDarkTheme 
              ? 'rgba(153, 51, 255, 0.08)' 
              : 'rgba(153, 51, 255, 0.08)',
          },
          '&.Mui-selected:hover': {
            backgroundColor: isDarkTheme 
              ? 'rgba(153, 51, 255, 0.12)' 
              : 'rgba(153, 51, 255, 0.12)',
          },
        }}
      >
        {isLoading ? (
          <TableCell style={cellStyleWithColor} colSpan={10} align="right">
            <Skeleton variant="text" />
          </TableCell>
        ) : (
          <>
            <TableCell padding="checkbox" style={cellStyleWithColor}>
              <Checkbox
                checked={selected}
                onChange={(event) => {
                  event.stopPropagation();
                  onSelect(nft);
                }}
                onClick={(event) => {
                  event.stopPropagation();
                }}
                sx={{
                  color: isDarkTheme ? 'white' : undefined,
                  '&.Mui-checked': {
                    color: '#9933ff',
                  },
                }}
              />
            </TableCell>
            <TableCell 
              style={{
                ...cellStyleWithColor,
                color: isDarkTheme ? "white" : "black",
                fontWeight: 100,
              }}
              align="right"
            >
              <a
                href={`https://block.voi.network/explorer/application/${data?.contractId}/global-state`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "inherit" }}
                onClick={(e) => e.stopPropagation()}
              >
                {data?.contractId}
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
                  copyToClipboard(data?.contractId, "Account ID");
                }}
              />
            </TableCell>
            <TableCell 
              style={{
                ...cellStyleWithColor,
                color: isDarkTheme ? "white" : "black",
                fontWeight: 100,
              }}
              align="right"
            >
              <a
                href={`https://block.voi.network/explorer/account/${data?.contractAddress}/transactions`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "inherit" }}
                onClick={(e) => e.stopPropagation()}
              >
                {data?.contractAddress.slice(0, 6)}...
                {data?.contractAddress.slice(-6)}
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
                  copyToClipboard(data?.contractAddress, "Account Address");
                }}
              />
            </TableCell>
            <TableCell
              style={{
                ...cellStyleWithColor,
                color: isDarkTheme ? "white" : "black",
                fontWeight: 100,
              }}
              align="right"
            >
              <a
                href={`https://block.voi.network/explorer/account/${data?.contractAddress}/transactions`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "inherit" }}
                onClick={(e) => e.stopPropagation()}
              >
                {data.global_delegate.slice(0, 6)}...
                {data.global_delegate.slice(-6)}
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
                  copyToClipboard(data.global_delegate, "Account Address");
                }}
              />
            </TableCell>
            <TableCell
              style={{
                ...cellStyleWithColor,
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
                  <img
                    src={VIAIcon}
                    style={{ height: "12px" }}
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
                    {getStakingTotalTokens(data)} VOI
                  </Typography>
                </Box>
              </Box>
            </TableCell>
            <TableCell
              style={{
                ...cellStyleWithColor,
                color: isDarkTheme ? "white" : "black",
                fontWeight: 100,
              }}
              align="right"
            >
              {moment.unix(getStakingUnlockTime(data)).fromNow(true)}
            </TableCell>
            <TableCell
              style={{
                ...cellStyleWithColor,
                color: isDarkTheme ? "white" : "black",
                fontWeight: 100,
              }}
              align="right"
            >
              {renderExpirationCell()}
            </TableCell>
            <TableCell 
              style={{
                ...cellStyleWithColor,
                color: isDarkTheme ? "white" : "black",
                fontWeight: 100,
              }}
              align="right"
            >
              <Typography
                variant="body2"
                sx={{
                  color: isDarkTheme ? "white" : "black",
                  fontWeight: 500,
                }}
              >
                {blocksData?.getProposerBlocks(data?.contractAddress)}
              </Typography>
            </TableCell>
            <TableCell 
              style={{
                ...cellStyleWithColor,
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
              style={{
                ...cellStyleWithColor,
                color: isDarkTheme ? "white" : "black",
                fontWeight: 100,
              }}
              align="right"
            >
              <Button
                id="actions-button"
                aria-controls={Boolean(anchorEl) ? "actions-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={Boolean(anchorEl) ? "true" : undefined}
                onClick={(e) => setAnchorEl(e.currentTarget)}
                variant={isDarkTheme ? "outlined" : "contained"}
                size="small"
                sx={{
                  borderRadius: "12px",
                  minWidth: "40px",
                  color: isDarkTheme ? "#FFFFFF" : undefined,
                  backgroundColor: isDarkTheme ? "transparent" : undefined,
                  borderColor: isDarkTheme
                    ? "rgba(255, 255, 255, 0.3)"
                    : undefined,
                }}
              >
                <MoreVerticalIcon />
              </Button>
              <Menu
                id="actions-menu"
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
              >
                <MenuItem onClick={() => setIsDepositModalOpen(true)}>
                  <ListItemIcon>
                    <ArrowDownIcon />
                  </ListItemIcon>
                  <ListItemText primary="Deposit" />
                </MenuItem>
                {Number(data?.withdrawable || 0) > 0 && (
                  <MenuItem onClick={() => setIsWithdrawModalOpen(true)}>
                    <ListItemIcon>
                      <ArrowUpIcon />
                    </ListItemIcon>
                    <ListItemText primary="Withdraw" />
                  </MenuItem>
                )}
                <MenuItem
                  onClick={() => {
                    fetchBlockProductionData(nft.staking.contractAddress);
                    setIsBlockProductionModalOpen(true);
                    setAnchorEl(null);
                  }}
                >
                  <ListItemIcon>
                    <BarChart3Icon />
                  </ListItemIcon>
                  <ListItemText primary="View Block Production" />
                </MenuItem>
                <MenuItem onClick={() => setIsDelegateModalOpen(true)}>
                  <ListItemIcon>
                    <UserIcon />
                  </ListItemIcon>
                  <ListItemText primary="Delegate" />
                </MenuItem>
                <MenuItem onClick={() => setIsParticipateModalOpen(true)}>
                  <ListItemIcon>
                    <PowerIcon />
                  </ListItemIcon>
                  <ListItemText primary="Participate" />
                </MenuItem>
                <MenuItem onClick={() => setIsBurnModalOpen(true)}>
                  <ListItemIcon>
                    <FlameIcon />
                  </ListItemIcon>
                  <ListItemText primary="Burn Token" />
                </MenuItem>
              </Menu>
            </TableCell>
          </>
        )}
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
            Withdraw VOI
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
                  Processing withdrawal...
                </Typography>
              </Box>
            ) : (
              <>
                <Typography color={isDarkTheme ? "#FFFFFF" : undefined}>
                  Select amount to withdraw: {withdrawAmount.toFixed(6)} VOI
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Slider
                    value={withdrawAmount}
                    onChange={(_, value) => setWithdrawAmount(Number(value))}
                    min={0}
                    max={Number(data?.withdrawable || 0) / 1e6}
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
                    onClick={() =>
                      setWithdrawAmount(Number(data?.withdrawable || 0) / 1e6)
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
                onClick={handleClaim}
                disabled={withdrawAmount <= 0}
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
                      snapshot.proposers[nft.staking.contractAddress] || 0;
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

      <Dialog
        maxWidth="xs"
        fullWidth
        open={isBurnModalOpen}
        onClose={() => setIsBurnModalOpen(false)}
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
            Burn Token
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            {isBurnLoading ? (
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
                  Processing burn transaction...
                </Typography>
              </Box>
            ) : (
              <Typography color={isDarkTheme ? "#FFFFFF" : undefined}>
                Are you sure you want to burn this token? This action cannot be
                undone. Please be sure to delist your NFT before burning.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          {!isBurnLoading && (
            <>
              <Button
                onClick={() => setIsBurnModalOpen(false)}
                variant={isDarkTheme ? "outlined" : "contained"}
                sx={{ color: isDarkTheme ? "#FFFFFF" : undefined }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBurnToken}
                variant={isDarkTheme ? "outlined" : "contained"}
                sx={{
                  color: isDarkTheme ? "#FFFFFF" : undefined,
                  backgroundColor: isDarkTheme
                    ? "rgba(220, 38, 38, 0.1)"
                    : "#dc2626",
                  "&:hover": {
                    backgroundColor: isDarkTheme
                      ? "rgba(220, 38, 38, 0.2)"
                      : "#b91c1c",
                  },
                }}
              >
                Burn Token
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!successTxId}
        onClose={() => setSuccessTxId(null)}
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
            Token Successfully Burned
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography color={isDarkTheme ? "#FFFFFF" : undefined}>
              The token has been successfully burned. View the transaction
              details below:
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
              View Transaction on Explorer
            </Link>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSuccessTxId(null)}
            variant={isDarkTheme ? "outlined" : "contained"}
            sx={{ color: isDarkTheme ? "#FFFFFF" : undefined }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <DelegateModal
        open={isDelegateModalOpen}
        onClose={() => setIsDelegateModalOpen(false)}
        contractId={nft.contractId}
        tokenId={Number(nft.tokenId)}
        currentDelegate={data?.global_delegate || ""}
        allowNaaS={true}
        naaSAddress={NAAS_ADDRESS}
      />

      <ParticipateModal
        open={isParticipateModalOpen}
        onClose={() => setIsParticipateModalOpen(false)}
        contractId={nft.contractId}
      />
    </>
  );
};

export default PositionTokenRow;
