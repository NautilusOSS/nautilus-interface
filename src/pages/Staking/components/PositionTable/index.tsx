import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Tabs,
  Tab,
  Box,
  useTheme,
  styled,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  Menu,
  MenuItem,
  Fade,
  CircularProgress,
  TextField,
} from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import PositionTokenRow from "../PositionTokenRow";
import PositionRow from "../PositionRow";
import Pagination from "@/components/Pagination";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { abi, CONTRACT } from "ulujs";
import { getAlgorandClients } from "@/wallets";
import { useWallet } from "@txnlab/use-wallet-react";
import { getStakingWithdrawableAmount } from "@/utils/staking";
import { toast } from "react-hot-toast";
import party from "party-js";
import algosdk from "algosdk";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

interface ResponsiveTableProps {
  stakingContracts: any[];
  arc72Tokens: any[];
  onRefresh: () => void;
}

type SortDirection = "asc" | "desc" | null;
type SortColumn =
  | "contractId"
  | "totalStaked"
  | "unlock"
  | "claimable"
  | "expires"
  | "global_delegate"
  | "part_vote_lst"
  | "unlockTime"
  | null;

const StyledTabs = styled(Tabs)<{ $isDarkTheme: boolean }>`
  .MuiTab-root {
    color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)"};
    font-family: "Plus Jakarta Sans";
    font-weight: 600;

    &.Mui-selected {
      color: #9933ff;
    }
  }

  .MuiTabs-indicator {
    background-color: #9933ff;
  }
`;

const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  stakingContracts,
  arc72Tokens,
  onRefresh,
}) => {
  const { activeAccount, signTransactions } = useWallet();
  const { isDarkTheme } = useSelector((state: RootState) => state.theme);
  const theme = useTheme();
  const pageSize = 10;

  // Add sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn>("totalStaked");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Sort stakingContracts
  const sortedStakingContracts = useMemo(() => {
    if (!sortColumn || !sortDirection) return stakingContracts;

    return [...stakingContracts].sort((a, b) => {
      let aValue: any = a[sortColumn];
      let bValue: any = b[sortColumn];

      // Special handling for specific columns
      if (sortColumn === "totalStaked") {
        aValue = Number(a.global_total || 0);
        bValue = Number(b.global_total || 0);
      } else if (sortColumn === "unlock") {
        aValue = Number(a.unlock || 0);
        bValue = Number(b.unlock || 0);
      } else if (sortColumn === "claimable") {
        aValue = Number(a.withdrawable || 0);
        bValue = Number(b.withdrawable || 0);
      } else if (sortColumn === "expires") {
        aValue = Number(a.expires || 0);
        bValue = Number(b.expires || 0);
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return bValue > aValue ? 1 : -1;
      }
    });
  }, [stakingContracts, sortColumn, sortDirection]);

  // Sort arc72Tokens
  const sortedArc72Tokens = useMemo(() => {
    if (!sortColumn || !sortDirection) return arc72Tokens;

    return [...arc72Tokens].sort((a, b) => {
      let aValue: any = a[sortColumn];
      let bValue: any = b[sortColumn];

      // Special handling for specific columns
      if (sortColumn === "totalStaked") {
        aValue = Number(a.staking?.global_total || 0);
        bValue = Number(b.staking?.global_total || 0);
      } else if (sortColumn === "unlock") {
        aValue = Number(a.staking?.unlock || 0);
        bValue = Number(b.staking?.unlock || 0);
      } else if (sortColumn === "claimable") {
        aValue = Number(a.staking?.withdrawable || 0);
        bValue = Number(b.staking?.withdrawable || 0);
      } else if (sortColumn === "expires") {
        aValue = Number(a.staking?.expires || 0);
        bValue = Number(b.staking?.expires || 0);
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return bValue > aValue ? 1 : -1;
      }
    });
  }, [arc72Tokens, sortColumn, sortDirection]);

  const SortableHeader: React.FC<{
    column: SortColumn;
    children: React.ReactNode;
  }> = ({ column, children }) => (
    <Box
      component="span"
      sx={{
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
        "&:hover": { opacity: 0.8 },
      }}
      onClick={() => handleSort(column)}
    >
      {children}
      {sortColumn === column && (
        <Box component="span" sx={{ ml: 1 }}>
          {sortDirection === "asc" ? (
            <ArrowUpwardIcon fontSize="small" />
          ) : (
            <ArrowDownwardIcon fontSize="small" />
          )}
        </Box>
      )}
    </Box>
  );

  console.log(stakingContracts, arc72Tokens);

  const tableStyle = {
    backgroundColor: "transparent",
    borderRadius: "8px",
    marginTop: "25px",
  };

  const cellStyle = {
    color: theme.palette.mode === "dark" ? "white" : theme.palette.text.primary,
    fontWeight: 900,
  };

  const headCellStyle = {
    ...cellStyle,
    backgroundColor:
      theme.palette.mode === "dark"
        ? theme.palette.grey[800]
        : theme.palette.grey[200],
  };

  const headRowStyle = {
    borderBottom: "none",
  };

  const lastRowStyle = {
    borderBottom: "none",
  };

  const [value, setValue] = React.useState(0);
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const totalPages = Math.ceil(sortedStakingContracts.length / pageSize);
  const [currentPage, setCurrentPage] = React.useState(1);

  const totalPages2 = Math.ceil(sortedArc72Tokens.length / pageSize);
  const [currentPage2, setCurrentPage2] = React.useState(1);

  // Add state for modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [withdrawableAmount, setWithdrawableAmount] = useState(0);

  // Add state for selected rows
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // Add new state for action menu
  const [actionAnchorEl, setActionAnchorEl] = useState<null | HTMLElement>(
    null
  );

  // Add state for confirmation modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Add state for total withdrawable amount
  const [totalWithdrawable, setTotalWithdrawable] = useState<string>("0");

  // Add state for loading
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Add state for refresh counter
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Add new state for delegate modal
  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);
  const [delegateAddress, setDelegateAddress] = useState('');
  const [isDelegating, setIsDelegating] = useState(false);

  // Add handlers for selection
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (value === 0) {
      if (event.target.checked) {
        const newSelected = sortedStakingContracts
          .slice((currentPage - 1) * pageSize, currentPage * pageSize)
          .map((row) => row.contractId.toString());
        setSelectedRows(newSelected);
      } else {
        setSelectedRows([]);
      }
    } else {
      if (event.target.checked) {
        const newSelected = sortedArc72Tokens
          .slice((currentPage2 - 1) * pageSize, currentPage2 * pageSize)
          .map((row) => row.tokenId.toString());
        setSelectedRows(newSelected);
      } else {
        setSelectedRows([]);
      }
    }
  };

  const handleSelectRow = (id: string) => {
    const selectedIndex = selectedRows.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedRows, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedRows.slice(1));
    } else if (selectedIndex === selectedRows.length - 1) {
      newSelected = newSelected.concat(selectedRows.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedRows.slice(0, selectedIndex),
        selectedRows.slice(selectedIndex + 1)
      );
    }

    setSelectedRows(newSelected);
  };

  // Add isSelected helper
  const isSelected = (id: string) => selectedRows.indexOf(id) !== -1;

  const handleActionClick = (event: React.MouseEvent<HTMLElement>) => {
    setActionAnchorEl(event.currentTarget);
  };

  const handleActionClose = () => {
    setActionAnchorEl(null);
  };

  // Add handler for selecting all rows in current tab
  const handleSelectAllInTab = () => {
    if (value === 0) {
      const allIds = sortedStakingContracts.map((row) =>
        row.contractId.toString()
      );
      setSelectedRows(allIds);
    } else {
      const allIds = sortedArc72Tokens.map((row) => row.tokenId.toString());
      setSelectedRows(allIds);
    }
  };

  // Update handler to calculate withdrawable amount before showing confirmation
  const handleWithdrawSelectedClick = async () => {
    if (!activeAccount || selectedRows.length === 0) return;
    const { algodClient } = getAlgorandClients();
    let total = BigInt(0);

    try {
      if (value === 0) {
        // Calculate for staking contracts
        for (const ctc of sortedStakingContracts) {
          if (!selectedRows.includes(ctc.contractId.toString())) continue;
          const withdrawable = await getStakingWithdrawableAmount(
            algodClient,
            ctc.contractId,
            ctc.global_owner
          );
          total += BigInt(withdrawable);
        }
      } else {
        // Calculate for tokens
        for (const nft of sortedArc72Tokens) {
          if (!selectedRows.includes(nft.tokenId.toString())) continue;
          try {
            const withdrawable = await getStakingWithdrawableAmount(
              algodClient,
              Number(nft.tokenId),
              nft.staking?.global_owner
            );
            total += BigInt(withdrawable);
          } catch (e) {
            console.log(e);
          }
        }
      }

      setTotalWithdrawable((Number(total) / 10 ** 6).toFixed(6));
      setIsConfirmModalOpen(true);
      handleActionClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to calculate withdrawable amount");
    }
  };

  // Add handler for confirmed withdrawal
  const handleConfirmedWithdraw = async () => {
    if (!activeAccount || selectedRows.length === 0) return;
    const { algodClient } = getAlgorandClients();
    let total = BigInt(0);

    try {
      setIsWithdrawing(true);
      if (value === 0) {
        // Handle staking contracts tab
        const buildN = [];
        for await (const ctc of sortedStakingContracts) {
          if (!selectedRows.includes(ctc.contractId.toString())) continue;

          const withdrawable = await getStakingWithdrawableAmount(
            algodClient,
            ctc.contractId,
            ctc.global_owner
          );
          total += BigInt(withdrawable);

          if (withdrawable > 0) {
            const builder = new CONTRACT(
              ctc.contractId,
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
              { addr: activeAccount.address, sk: new Uint8Array(0) },
              true,
              false,
              true
            );
            const txnO = await builder.withdraw(BigInt(withdrawable));
            buildN.push({
              ...txnO,
              note: new TextEncoder().encode(
                `withdraw ${withdrawable} VOI from ${ctc.contractId}`
              ),
            });
          }
        }

        if (buildN.length > 0) {
          const ci = new CONTRACT(0, algodClient, undefined, abi.custom, {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          });
          ci.setFee(2000);
          ci.setEnableGroupResourceSharing(true);
          ci.setGroupResourceSharingStrategy("merge");
          ci.setExtraTxns(buildN.slice(0, 8).map((txn) => txn.obj));
          const customR = await ci.custom();
          const stxns = await signTransactions(
            customR.txns.map(
              (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
            )
          );
          const res = await algodClient
            .sendRawTransaction(stxns as Uint8Array[])
            .do();

          // convert transaction id to txid

          const txid = res.txId;

          await algosdk.waitForConfirmation(algodClient, txid, 4);

          await new Promise((resolve) => setTimeout(resolve, 8000));

          toast.success("Withdrawal processed successfully");
          const element = document.body;
          if (element) {
            party.confetti(element, {
              count: party.variation.range(30, 40),
              size: party.variation.range(0.8, 1.2),
              speed: party.variation.range(100, 300),
              spread: party.variation.range(50, 70),
              color: party.Color.fromHex("#9933ff").mix(
                party.Color.fromHex("#7f2adb")
              ),
            });
          }
          // Clear selected rows and trigger refresh
          setSelectedRows([]);
          setRefreshCounter((prev) => prev + 1);
          onRefresh();
        }
      } else {
        // Handle tokens tab
        const buildN: any[] = [];
        for await (const nft of sortedArc72Tokens) {
          if (!selectedRows.includes(nft.tokenId.toString())) continue;

          try {
            const withdrawable = await getStakingWithdrawableAmount(
              algodClient,
              Number(nft.tokenId),
              nft.staking?.global_owner
            );
            total += BigInt(withdrawable);

            if (withdrawable > BigInt(0)) {
              const builder = new CONTRACT(
                nft.contractId,
                algodClient,
                undefined,
                {
                  name: "NautilusVoiStaking",
                  methods: [
                    {
                      name: "withdraw",
                      args: [
                        { type: "uint64", name: "tokenId" },
                        { type: "uint64", name: "amount" },
                      ],
                      readonly: false,
                      returns: { type: "void" },
                      desc: "Withdraw funds from contract.",
                    },
                  ],
                  events: [],
                },
                { addr: activeAccount.address, sk: new Uint8Array(0) },
                true,
                false,
                true
              );
              const txnO = await builder.withdraw(
                Number(nft.tokenId),
                BigInt(withdrawable)
              );
              buildN.push({
                ...txnO,
                accounts: [
                  "RTKWX3FTDNNIHMAWHK5SDPKH3VRPPW7OS5ZLWN6RFZODF7E22YOBK2OGPE",
                ],
                foreignApp: [Number(nft.tokenId)],
                note: new TextEncoder().encode(
                  `withdraw ${withdrawable} VOI from ${nft.contractId}`
                ),
              });
            }
          } catch (e) {
            console.log(e);
          }
        }

        if (buildN.length > 0) {
          const ci = new CONTRACT(0, algodClient, undefined, abi.custom, {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          });
          ci.setFee(8000);
          ci.setEnableGroupResourceSharing(true);
          ci.setGroupResourceSharingStrategy("merge");
          ci.setExtraTxns(buildN.slice(0, 7).map((txn) => txn.obj));
          const customR = await ci.custom();
          const stxns = await signTransactions(
            customR.txns.map(
              (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
            )
          );
          const res = await algodClient
            .sendRawTransaction(stxns as Uint8Array[])
            .do();
          console.log(res);
          // Clear selected rows and trigger refresh
          setSelectedRows([]);
          setRefreshCounter((prev) => prev + 1);
          onRefresh();
        }
      }

      setWithdrawableAmount(Number(total) / 10 ** 6);
      setIsModalOpen(true);
    } catch (error) {
      console.error(error);
      toast.error("Failed to process withdrawal");
    } finally {
      setIsWithdrawing(false);
      setIsConfirmModalOpen(false);
    }
  };

  // Add handler for delegate action
  const handleSetDelegateClick = () => {
    setDelegateAddress('');
    setIsDelegateModalOpen(true);
    handleActionClose();
  };

  // Add handler for confirmed delegation
  const handleConfirmedDelegate = async () => {
    if (!activeAccount || selectedRows.length === 0 || !delegateAddress) return;
    const { algodClient } = getAlgorandClients();

    try {
      setIsDelegating(true);
      if (value === 0) {
        // Handle staking contracts tab
        const buildN = [];
        for await (const ctc of sortedStakingContracts) {
          if (!selectedRows.includes(ctc.contractId.toString())) continue;

          const builder = new CONTRACT(
            ctc.contractId,
            algodClient,
            undefined,
            {
              name: "NautilusVoiStaking",
              methods: [
                {
                  name: "set_delegate",
                  args: [{ type: "address", name: "delegate_address" }],
                  readonly: false,
                  returns: { type: "void" },
                  desc: "Set delegate address for the contract.",
                },
              ],
              events: [],
            },
            { addr: activeAccount.address, sk: new Uint8Array(0) },
            true,
            false,
            true
          );
          const txnO = await builder.set_delegate(delegateAddress);
          buildN.push({
            ...txnO,
            note: new TextEncoder().encode(
              `set delegate ${delegateAddress} for ${ctc.contractId}`
            ),
          });
        }

        if (buildN.length > 0) {
          const ci = new CONTRACT(0, algodClient, undefined, abi.custom, {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          });
          ci.setFee(2000);
          ci.setEnableGroupResourceSharing(true);
          ci.setGroupResourceSharingStrategy("merge");
          ci.setExtraTxns(buildN.slice(0, 8).map((txn) => txn.obj));
          const customR = await ci.custom();
          const stxns = await signTransactions(
            customR.txns.map(
              (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
            )
          );
          const res = await algodClient
            .sendRawTransaction(stxns as Uint8Array[])
            .do();

          const txid = res.txId;
          await algosdk.waitForConfirmation(algodClient, txid, 4);
          await new Promise((resolve) => setTimeout(resolve, 8000));

          toast.success("Delegate set successfully");
          setSelectedRows([]);
          setRefreshCounter((prev) => prev + 1);
          onRefresh();
        }
      } else {
        // Handle tokens tab - similar to staking contracts but with token-specific logic
        const buildN: any[] = [];
        for await (const nft of sortedArc72Tokens) {
          if (!selectedRows.includes(nft.tokenId.toString())) continue;

          const builder = new CONTRACT(
            nft.contractId,
            algodClient,
            undefined,
            {
              name: "NautilusVoiStaking",
              methods: [
                {
                  name: "set_delegate",
                  args: [
                    { type: "uint64", name: "tokenId" },
                    { type: "address", name: "delegate_address" },
                  ],
                  readonly: false,
                  returns: { type: "void" },
                  desc: "Set delegate address for the token.",
                },
              ],
              events: [],
            },
            { addr: activeAccount.address, sk: new Uint8Array(0) },
            true,
            false,
            true
          );
          const txnO = await builder.set_delegate(Number(nft.tokenId), delegateAddress);
          buildN.push({
            ...txnO,
            accounts: [
              "RTKWX3FTDNNIHMAWHK5SDPKH3VRPPW7OS5ZLWN6RFZODF7E22YOBK2OGPE",
            ],
            foreignApp: [Number(nft.tokenId)],
            note: new TextEncoder().encode(
              `set delegate ${delegateAddress} for token ${nft.tokenId}`
            ),
          });
        }

        if (buildN.length > 0) {
          const ci = new CONTRACT(0, algodClient, undefined, abi.custom, {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          });
          ci.setFee(8000);
          ci.setEnableGroupResourceSharing(true);
          ci.setGroupResourceSharingStrategy("merge");
          ci.setExtraTxns(buildN.slice(0, 7).map((txn) => txn.obj));
          const customR = await ci.custom();
          const stxns = await signTransactions(
            customR.txns.map(
              (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
            )
          );
          const res = await algodClient
            .sendRawTransaction(stxns as Uint8Array[])
            .do();

          await algosdk.waitForConfirmation(algodClient, res.txId, 4);
          await new Promise((resolve) => setTimeout(resolve, 8000));

          toast.success("Delegate set successfully");
          setSelectedRows([]);
          setRefreshCounter((prev) => prev + 1);
          onRefresh();
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to set delegate");
    } finally {
      setIsDelegating(false);
      setIsDelegateModalOpen(false);
    }
  };

  return (
    <>
      {/* Updated confirmation modal */}
      <Dialog
        open={isConfirmModalOpen}
        onClose={() => !isWithdrawing && setIsConfirmModalOpen(false)}
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
          <Typography variant="h6" color={isDarkTheme ? "white" : "inherit"}>
            {isWithdrawing ? "Processing Withdrawal" : "Confirm Withdrawal"}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {isWithdrawing ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: 3,
                gap: 2,
              }}
            >
              <CircularProgress
                size={48}
                sx={{
                  color: "#9933ff",
                }}
              />
              <Typography
                color={isDarkTheme ? "white" : "inherit"}
                align="center"
              >
                Please sign the transaction in your wallet...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ mt: 1 }}>
              <Typography
                color={isDarkTheme ? "white" : "inherit"}
                gutterBottom
              >
                You are about to withdraw from {selectedRows.length} selected{" "}
                {selectedRows.length === 1 ? "position" : "positions"}.
              </Typography>
              <Typography
                color={isDarkTheme ? "white" : "inherit"}
                variant="body1"
                sx={{
                  mt: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                Total withdrawable amount:
                <Box
                  component="span"
                  sx={{
                    color: "#9933ff",
                    fontWeight: "bold",
                    fontSize: "1.1em",
                  }}
                >
                  {totalWithdrawable} VOI
                </Box>
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIsConfirmModalOpen(false)}
            sx={{
              color: isDarkTheme ? "white" : "inherit",
            }}
            disabled={isWithdrawing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmedWithdraw}
            variant="contained"
            disabled={Number(totalWithdrawable) === 0 || isWithdrawing}
            sx={{
              backgroundColor: "#9933ff",
              color: "white",
              "&:hover": { backgroundColor: "#7f2adb" },
              "&.Mui-disabled": {
                backgroundColor: isDarkTheme
                  ? "rgba(153, 51, 255, 0.3)"
                  : "rgba(153, 51, 255, 0.12)",
              },
            }}
          >
            {isWithdrawing ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress
                  size={20}
                  sx={{
                    color: "white",
                  }}
                />
                Processing...
              </Box>
            ) : (
              "Confirm Withdrawal"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add delegate modal */}
      <Dialog
        open={isDelegateModalOpen}
        onClose={() => !isDelegating && setIsDelegateModalOpen(false)}
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
          <Typography variant="h6" color={isDarkTheme ? "white" : "inherit"}>
            {isDelegating ? "Setting Delegate" : "Set Delegate Address"}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {isDelegating ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: 3,
                gap: 2,
              }}
            >
              <CircularProgress
                size={48}
                sx={{
                  color: "#9933ff",
                }}
              />
              <Typography color={isDarkTheme ? "white" : "inherit"} align="center">
                Please sign the transaction in your wallet...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ mt: 1 }}>
              <Typography color={isDarkTheme ? "white" : "inherit"} gutterBottom>
                Enter the delegate address for {selectedRows.length} selected{" "}
                {selectedRows.length === 1 ? "position" : "positions"}.
              </Typography>
              <TextField
                fullWidth
                value={delegateAddress}
                onChange={(e) => setDelegateAddress(e.target.value)}
                placeholder="Enter delegate address"
                sx={{
                  mt: 2,
                  "& .MuiInputBase-input": {
                    color: isDarkTheme ? "white" : "inherit",
                  },
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIsDelegateModalOpen(false)}
            sx={{
              color: isDarkTheme ? "white" : "inherit",
            }}
            disabled={isDelegating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmedDelegate}
            variant="contained"
            disabled={!delegateAddress || isDelegating}
            sx={{
              backgroundColor: "#9933ff",
              color: "white",
              "&:hover": { backgroundColor: "#7f2adb" },
              "&.Mui-disabled": {
                backgroundColor: isDarkTheme
                  ? "rgba(153, 51, 255, 0.3)"
                  : "rgba(153, 51, 255, 0.12)",
              },
            }}
          >
            {isDelegating ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress
                  size={20}
                  sx={{
                    color: "white",
                  }}
                />
                Processing...
              </Box>
            ) : (
              "Set Delegate"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ mb: 3 }}>
        <StyledTabs
          value={value}
          onChange={handleChange}
          aria-label="position tabs"
          $isDarkTheme={isDarkTheme}
        >
          <Tab label="Staking Contracts" />
          <Tab label="Tokens" />
        </StyledTabs>
      </Box>
      <Fade in={selectedRows.length > 0} timeout={{ enter: 300, exit: 200 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 2,
            backgroundColor: isDarkTheme
              ? "rgba(153, 51, 255, 0.08)"
              : "rgba(153, 51, 255, 0.08)",
            borderRadius: 1,
            mb: 2,
            height: selectedRows.length > 0 ? "auto" : 0,
            overflow: "hidden",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography
              sx={{
                color: isDarkTheme ? "white" : "inherit",
                fontWeight: 500,
              }}
            >
              {selectedRows.length} {selectedRows.length === 1 ? "row" : "rows"}{" "}
              selected
            </Typography>
            <Button
              variant="text"
              onClick={handleSelectAllInTab}
              sx={{
                color: "#9933ff",
                "&:hover": {
                  backgroundColor: isDarkTheme
                    ? "rgba(153, 51, 255, 0.08)"
                    : "rgba(153, 51, 255, 0.08)",
                },
                textTransform: "none",
                fontWeight: 500,
              }}
            >
              Select all{" "}
              {value === 0
                ? sortedStakingContracts.length
                : sortedArc72Tokens.length}{" "}
              rows
            </Button>
          </Box>
          <Button
            variant="contained"
            onClick={handleActionClick}
            sx={{
              backgroundColor: "#9933ff",
              "&:hover": { backgroundColor: "#7f2adb" },
              color: "white",
            }}
          >
            Perform Action
          </Button>
        </Box>
      </Fade>
      <Menu
        anchorEl={actionAnchorEl}
        open={Boolean(actionAnchorEl)}
        onClose={handleActionClose}
        PaperProps={{
          sx: {
            backgroundColor: isDarkTheme
              ? "rgba(30, 30, 30, 0.95)"
              : "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            borderRadius: "8px",
            mt: 1,
          },
        }}
      >
        <MenuItem
          onClick={handleWithdrawSelectedClick}
          sx={{
            color: isDarkTheme ? "white" : "inherit",
            "&:hover": {
              backgroundColor: isDarkTheme
                ? "rgba(153, 51, 255, 0.08)"
                : "rgba(153, 51, 255, 0.08)",
            },
          }}
        >
          Withdraw Selected
        </MenuItem>
        <MenuItem
          onClick={handleSetDelegateClick}
          sx={{
            color: isDarkTheme ? "white" : "inherit",
            "&:hover": {
              backgroundColor: isDarkTheme
                ? "rgba(153, 51, 255, 0.08)"
                : "rgba(153, 51, 255, 0.08)",
            },
          }}
        >
          Set Delegate
        </MenuItem>
      </Menu>
      <CustomTabPanel value={value} index={0}>
        <TableContainer component={Paper} style={tableStyle}>
          <Table>
            <TableHead>
              <TableRow style={headRowStyle}>
                <TableCell padding="checkbox" style={headCellStyle}>
                  <Checkbox
                    indeterminate={
                      selectedRows.length > 0 &&
                      (value === 0
                        ? selectedRows.length < sortedStakingContracts.length
                        : selectedRows.length < sortedArc72Tokens.length)
                    }
                    checked={
                      (value === 0
                        ? sortedStakingContracts.length > 0
                        : sortedArc72Tokens.length > 0) &&
                      selectedRows.length ===
                        (value === 0
                          ? sortedStakingContracts.length
                          : sortedArc72Tokens.length)
                    }
                    onChange={handleSelectAll}
                    sx={{
                      color:
                        theme.palette.mode === "dark" ? "white" : undefined,
                      "&.Mui-checked": {
                        color: "#9933ff",
                      },
                      "&.MuiCheckbox-indeterminate": {
                        color: "#9933ff",
                      },
                    }}
                  />
                </TableCell>
                <TableCell style={headCellStyle} align="right">
                  <SortableHeader column="contractId">
                    Account Id
                  </SortableHeader>
                </TableCell>
                <TableCell style={headCellStyle} align="center">
                  Account Address
                </TableCell>
                <TableCell style={headCellStyle} align="center">
                  <SortableHeader column="global_delegate">
                    Delegate
                  </SortableHeader>
                </TableCell>
                <TableCell style={headCellStyle} align="right">
                  <SortableHeader column="totalStaked">
                    Lockup Tokens
                  </SortableHeader>
                </TableCell>
                <TableCell style={headCellStyle} align="right">
                  <SortableHeader column="unlockTime">
                    Unlock Time
                  </SortableHeader>
                </TableCell>
                <TableCell style={headCellStyle} align="right">
                  <SortableHeader column="part_vote_lst">
                    Expires
                  </SortableHeader>
                </TableCell>
                <TableCell style={headCellStyle} align="right">
                  Proposer Blocks
                </TableCell>
                <TableCell style={headCellStyle} align="right">
                  <SortableHeader column="claimable">
                    Claimable Amount
                  </SortableHeader>
                </TableCell>
                <TableCell style={headCellStyle} align="right">
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {value === 0 ? (
                sortedStakingContracts.length > 0 ? (
                  sortedStakingContracts
                    ?.slice(
                      (currentPage - 1) * pageSize,
                      currentPage * pageSize
                    )
                    ?.map((ctc, index) => (
                      <PositionRow
                        key={ctc.contractId}
                        position={ctc}
                        cellStyle={cellStyle}
                        isSelected={isSelected(ctc.contractId.toString())}
                        onSelectRow={() =>
                          handleSelectRow(ctc.contractId.toString())
                        }
                        refreshTrigger={refreshCounter}
                      />
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} align="center" style={cellStyle}>
                      <Typography
                        variant="body1"
                        sx={{ color: isDarkTheme ? "white" : "inherit" }}
                      >
                        No staking contracts found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )
              ) : sortedArc72Tokens.length > 0 ? (
                sortedArc72Tokens
                  ?.slice(
                    (currentPage2 - 1) * pageSize,
                    currentPage2 * pageSize
                  )
                  ?.map((nft, index) => (
                    <PositionTokenRow
                      key={nft.tokenId}
                      nft={nft}
                      index={index}
                      arc72TokensLength={sortedArc72Tokens.length}
                      lastRowStyle={lastRowStyle}
                      cellStyle={cellStyle}
                      isSelected={isSelected(nft.tokenId.toString())}
                      onSelectRow={() =>
                        handleSelectRow(nft.tokenId.toString())
                      }
                    />
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} align="center" style={cellStyle}>
                    <Typography
                      variant="body1"
                      sx={{ color: isDarkTheme ? "white" : "inherit" }}
                    >
                      No tokens found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {value === 0
          ? sortedStakingContracts.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                isDarkTheme={isDarkTheme}
              />
            )
          : sortedArc72Tokens.length > 0 && (
              <Pagination
                currentPage={currentPage2}
                totalPages={totalPages2}
                onPageChange={setCurrentPage2}
                isDarkTheme={isDarkTheme}
              />
            )}
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <TableContainer component={Paper} style={tableStyle}>
          <Table>
            <TableHead>
              <TableRow style={headRowStyle}>
                <TableCell padding="checkbox" style={headCellStyle}>
                  <Checkbox
                    indeterminate={
                      selectedRows.length > 0 &&
                      (value === 0
                        ? selectedRows.length < sortedStakingContracts.length
                        : selectedRows.length < sortedArc72Tokens.length)
                    }
                    checked={
                      (value === 0
                        ? sortedStakingContracts.length > 0
                        : sortedArc72Tokens.length > 0) &&
                      selectedRows.length ===
                        (value === 0
                          ? sortedStakingContracts.length
                          : sortedArc72Tokens.length)
                    }
                    onChange={handleSelectAll}
                    sx={{
                      color:
                        theme.palette.mode === "dark" ? "white" : undefined,
                      "&.Mui-checked": {
                        color: "#9933ff",
                      },
                      "&.MuiCheckbox-indeterminate": {
                        color: "#9933ff",
                      },
                    }}
                  />
                </TableCell>
                <TableCell style={headCellStyle} align="right">
                  <SortableHeader column="contractId">
                    Account Id
                  </SortableHeader>
                </TableCell>
                <TableCell style={headCellStyle} align="center">
                  Account Address
                </TableCell>
                <TableCell style={headCellStyle} align="center">
                  Delegate
                </TableCell>
                <TableCell style={headCellStyle} align="right">
                  <SortableHeader column="totalStaked">
                    Lockup Tokens
                  </SortableHeader>
                </TableCell>
                <TableCell style={headCellStyle} align="right">
                  <SortableHeader column="unlock">Unlock Time</SortableHeader>
                </TableCell>
                <TableCell style={headCellStyle} align="right">
                  <SortableHeader column="expires">Expires</SortableHeader>
                </TableCell>
                <TableCell style={headCellStyle} align="right">
                  Proposer Blocks
                </TableCell>
                <TableCell style={headCellStyle} align="right">
                  <SortableHeader column="claimable">Claimable</SortableHeader>
                </TableCell>
                <TableCell style={headCellStyle} align="right">
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {value === 0 ? (
                sortedStakingContracts.length > 0 ? (
                  sortedStakingContracts
                    ?.slice(
                      (currentPage - 1) * pageSize,
                      currentPage * pageSize
                    )
                    ?.map((ctc, index) => (
                      <PositionRow
                        key={ctc.contractId}
                        position={ctc}
                        cellStyle={cellStyle}
                        isSelected={isSelected(ctc.contractId.toString())}
                        onSelectRow={() =>
                          handleSelectRow(ctc.contractId.toString())
                        }
                        refreshTrigger={refreshCounter}
                      />
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} align="center" style={cellStyle}>
                      <Typography
                        variant="body1"
                        sx={{ color: isDarkTheme ? "white" : "inherit" }}
                      >
                        No staking contracts found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )
              ) : sortedArc72Tokens.length > 0 ? (
                sortedArc72Tokens
                  ?.slice(
                    (currentPage2 - 1) * pageSize,
                    currentPage2 * pageSize
                  )
                  ?.map((nft, index) => (
                    <PositionTokenRow
                      key={nft.tokenId}
                      nft={nft}
                      index={index}
                      arc72TokensLength={sortedArc72Tokens.length}
                      lastRowStyle={lastRowStyle}
                      cellStyle={cellStyle}
                      isSelectable={true}
                      selected={isSelected(nft.tokenId.toString())}
                      onSelect={() => handleSelectRow(nft.tokenId.toString())}
                    />
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} align="center" style={cellStyle}>
                    <Typography
                      variant="body1"
                      sx={{ color: isDarkTheme ? "white" : "inherit" }}
                    >
                      No tokens found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {value === 0
          ? sortedStakingContracts.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                isDarkTheme={isDarkTheme}
              />
            )
          : sortedArc72Tokens.length > 0 && (
              <Pagination
                currentPage={currentPage2}
                totalPages={totalPages2}
                onPageChange={setCurrentPage2}
                isDarkTheme={isDarkTheme}
              />
            )}
      </CustomTabPanel>
    </>
  );
};

export default ResponsiveTable;
