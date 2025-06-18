import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Grid,
  Container,
  useTheme,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { toast } from "react-toastify";
import Layout from "@/layouts/Default";
import { useWallet } from "@txnlab/use-wallet-react";
import algosdk from "algosdk";
import { getAlgorandClients } from "@/wallets";
import { CONTRACT, abi } from "ulujs";
import styled, { keyframes } from "styled-components";
import SearchIcon from "@mui/icons-material/Search";

// Stargazer theme animations
const twinkle = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(180deg); }
`;

const shootingStar = keyframes`
  0% { transform: translateX(-100px) translateY(-100px) rotate(45deg); opacity: 1; }
  100% { transform: translateX(calc(100vw + 100px)) translateY(calc(100vh + 100px)) rotate(45deg); opacity: 0; }
`;

const StargazerBackground = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  background: linear-gradient(
    135deg,
    #0c0c1e 0%,
    #1a1a3a 25%,
    #2d1e4f 50%,
    #1a2a3c 75%,
    #0c0c1e 100%
  );
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(
        circle at 20% 80%,
        rgba(120, 119, 198, 0.3) 0%,
        transparent 50%
      ),
      radial-gradient(
        circle at 80% 20%,
        rgba(255, 119, 198, 0.3) 0%,
        transparent 50%
      ),
      radial-gradient(
        circle at 40% 40%,
        rgba(120, 219, 255, 0.2) 0%,
        transparent 50%
      );
    animation: ${float} 20s ease-in-out infinite;
  }
`;

const Star = styled.div<{
  $size: number;
  $left: number;
  $top: number;
  $delay: number;
}>`
  position: absolute;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  background: white;
  border-radius: 50%;
  left: ${(props) => props.$left}%;
  top: ${(props) => props.$top}%;
  animation: ${twinkle} ${(props) => 2 + props.$delay}s ease-in-out infinite;
  animation-delay: ${(props) => props.$delay}s;
  box-shadow: 0 0 ${(props) => props.$size * 2}px rgba(255, 255, 255, 0.8);
`;

const ShootingStarTrail = styled.div<{
  $left: number;
  $top: number;
  $delay: number;
}>`
  position: absolute;
  width: 100px;
  height: 2px;
  background: linear-gradient(90deg, transparent, white, transparent);
  left: ${(props) => props.$left}%;
  top: ${(props) => props.$top}%;
  animation: ${shootingStar} 3s linear infinite;
  animation-delay: ${(props) => props.$delay}s;
  opacity: 0;
`;

const Nebula = styled.div<{ $left: number; $top: number; $color: string }>`
  position: absolute;
  width: 300px;
  height: 300px;
  background: radial-gradient(
    circle,
    ${(props) => props.$color} 0%,
    transparent 70%
  );
  left: ${(props) => props.$left}%;
  top: ${(props) => props.$top}%;
  border-radius: 50%;
  opacity: 0.1;
  filter: blur(20px);
  animation: ${float} 15s ease-in-out infinite;
`;

const StargazerContainer = styled(Container)`
  position: relative;
  z-index: 1;
`;

// Styled components for rounded elements
const RoundedTextField = styled(TextField)`
  & .MuiOutlinedInput-root {
    border-radius: 100px;
  }
`;

const RoundedSelect = styled(Select)`
  & .MuiOutlinedInput-root {
    border-radius: 100px;
  }
`;

const RoundedButton = styled(Button)`
  border-radius: 100px !important;
  text-transform: none;
  font-weight: 600;
`;

const RoundedCard = styled(Card)`
  border-radius: 12px !important;
  overflow: hidden;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`;

const RoundedChip = styled(Chip)`
  border-radius: 100px !important;
`;

const RoundedAlert = styled(Alert)`
  border-radius: 12px !important;
`;

interface Airdrop {
  id: string;
  name: string;
  description: string;
  eligibility: string;
  image: string;
  start_date: string;
  period: string;
  status: "pending" | "active" | "completed";
  url: string;
  token_id?: string;
  airdrop_address?: string;
}

interface EligibilityData {
  Address: string;
  Voi?: number;
  Algo?: number;
  Total?: number;
}

const AirdropPage: React.FC = () => {
  const theme = useTheme();
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const { activeAccount, signTransactions } = useWallet();
  const [airdrops, setAirdrops] = useState<Airdrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [eligibilityData, setEligibilityData] = useState<{
    [key: string]: EligibilityData[];
  }>({});
  const [checkingEligibility, setCheckingEligibility] = useState<{
    [key: string]: boolean;
  }>({});
  const [eligibilityResults, setEligibilityResults] = useState<{
    [key: string]: boolean | null;
  }>({});
  const [eligibleAmounts, setEligibleAmounts] = useState<{
    [key: string]: number;
  }>({});
  const [claimStatus, setClaimStatus] = useState<{
    [key: string]: "unclaimed" | "claimed" | "checking" | null;
  }>({});
  const [claimingAirdrop, setClaimingAirdrop] = useState<{
    [key: string]: boolean;
  }>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [selectedAirdrops, setSelectedAirdrops] = useState<Set<string>>(
    new Set()
  );
  const [notifications, setNotifications] = useState<boolean>(true);

  useEffect(() => {
    fetchAirdrops();
  }, []);

  useEffect(() => {
    // Reset all user-specific state when activeAccount changes
    setEligibilityResults({});
    setEligibleAmounts({});
    setClaimStatus({});
    setCheckingEligibility({});
    setSelectedAirdrops(new Set());
  }, [activeAccount]);

  useEffect(() => {
    // Check for upcoming airdrops and show notifications
    if (notifications && activeAccount) {
      const upcomingAirdrops = airdrops.filter((airdrop) => {
        const startDate = new Date(airdrop.start_date);
        const now = new Date();
        const daysUntilStart = Math.ceil(
          (startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilStart > 0 && daysUntilStart <= 7; // Within 7 days
      });

      if (upcomingAirdrops.length > 0) {
        toast.info(
          `${upcomingAirdrops.length} airdrop(s) starting soon! Check your eligibility.`,
          { autoClose: 5000 }
        );
      }
    }
  }, [airdrops, activeAccount, notifications]);

  const fetchAirdrops = async () => {
    try {
      setError(null);
      const response = await fetch(
        "https://nautilusoss.github.io/airdrop/index.json"
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Sort by status: active first, then pending, then completed
      const sortedData = data.sort((a: Airdrop, b: Airdrop) => {
        const statusOrder = { active: 0, pending: 1, completed: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      });

      setAirdrops(sortedData);
    } catch (error) {
      console.error("Failed to fetch airdrops:", error);
      setError("Failed to load airdrops. Please try again.");
      toast.error("Failed to load airdrops", { autoClose: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const fetchEligibilityData = async (airdropId: string) => {
    try {
      const response = await fetch(
        `https://nautilusoss.github.io/airdrop/data/${airdropId}.json`
      );
      const data = await response.json();
      setEligibilityData((prev) => ({
        ...prev,
        [airdropId]: data,
      }));
      return data;
    } catch (error) {
      console.error(
        `Failed to fetch eligibility data for ${airdropId}:`,
        error
      );
      toast.error("Failed to fetch eligibility data", { autoClose: 3000 });
      return null;
    }
  };

  const checkClaimStatus = async (airdrop: Airdrop) => {
    console.log({ airdrop });
    if (!activeAccount || !airdrop.token_id || !airdrop.airdrop_address) {
      return;
    }

    setClaimStatus((prev) => ({ ...prev, [airdrop.id]: "checking" }));

    try {
      // Create Algorand client (you may need to adjust the server/port based on your setup)
      const { algodClient } = getAlgorandClients();

      // Check for spending approval from airdrop address on the token
      const tokenId = parseInt(airdrop.token_id);
      const airdropAddress = airdrop.airdrop_address;

      const ci = new CONTRACT(tokenId, algodClient, undefined, abi.nt200, {
        addr: activeAccount.address,
        sk: new Uint8Array(),
      });

      const arc200_allowanceR = await ci.arc200_allowance(
        airdropAddress,
        activeAccount.address
      );
      const arc200_allowance = arc200_allowanceR.returnValue.toString();

      if (arc200_allowance === "0") {
        setClaimStatus((prev) => ({ ...prev, [airdrop.id]: "claimed" }));
        toast.info("You have already claimed this airdrop", {
          autoClose: 3000,
        });
      } else {
        setClaimStatus((prev) => ({ ...prev, [airdrop.id]: "unclaimed" }));
      }
    } catch (error) {
      console.error("Error checking claim status:", error);
      toast.error("Failed to check claim status", { autoClose: 3000 });
      setClaimStatus((prev) => ({ ...prev, [airdrop.id]: null }));
    }
  };

  const checkEligibility = async (airdrop: Airdrop) => {
    if (!activeAccount) {
      toast.error("Please connect your wallet first", { autoClose: 3000 });
      return;
    }

    setCheckingEligibility((prev) => ({ ...prev, [airdrop.id]: true }));

    try {
      // Fetch eligibility data if not already cached
      let data = eligibilityData[airdrop.id];
      if (!data) {
        data = await fetchEligibilityData(airdrop.id);
      }

      if (!data) {
        setEligibilityResults((prev) => ({ ...prev, [airdrop.id]: null }));
        return;
      }

      // Check if user's address is in the eligibility list
      const userAddress = activeAccount.address;
      const isEligible = data.some(
        (entry: EligibilityData) => entry.Address === userAddress
      );

      setEligibilityResults((prev) => ({ ...prev, [airdrop.id]: isEligible }));

      if (isEligible) {
        const userData = data.find(
          (entry: EligibilityData) => entry.Address === userAddress
        );
        const amount = userData?.Voi ?? userData?.Total ?? 0;
        setEligibleAmounts((prev) => ({ ...prev, [airdrop.id]: amount }));

        toast.success(`You are eligible! Total: ${amount.toFixed(2)}`, {
          autoClose: 3000,
        });

        // Also check claim status if eligible
        await checkClaimStatus(airdrop);
      } else {
        toast.error("You are not eligible for this airdrop", {
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error("Error checking eligibility:", error);
      toast.error("Failed to check eligibility", { autoClose: 3000 });
      setEligibilityResults((prev) => ({ ...prev, [airdrop.id]: null }));
    } finally {
      setCheckingEligibility((prev) => ({ ...prev, [airdrop.id]: false }));
    }
  };

  const handleClaim = async (airdrop: Airdrop) => {
    if (!activeAccount) {
      toast.error("Please connect your wallet first", { autoClose: 3000 });
      return;
    }

    if (airdrop.status === "pending") {
      toast.info("Airdrop details coming soon!", { autoClose: 3000 });
      return;
    }

    if (claimStatus[airdrop.id] === "claimed") {
      toast.info("You have already claimed this airdrop", { autoClose: 3000 });
      return;
    }

    setClaimingAirdrop((prev) => ({ ...prev, [airdrop.id]: true }));

    try {
      // Check if there's a valid URL for external claiming
      if (
        airdrop.url &&
        airdrop.url !== "TBD" &&
        airdrop.url !== null &&
        airdrop.url.trim() !== ""
      ) {
        // External claiming - open URL in new tab
        window.open(airdrop.url, "_blank");
        toast.info("Opening external claim page...", { autoClose: 3000 });
        return;
      }

      // Create Algorand client
      const { algodClient } = getAlgorandClients();
      const tokenId = parseInt(airdrop.token_id ?? "0");
      const airdropAddress = airdrop.airdrop_address;

      // Create contract instance
      const ci = new CONTRACT(tokenId, algodClient, undefined, abi.nt200, {
        addr: activeAccount.address,
        sk: new Uint8Array(),
      });

      // Check current allowance
      const arc200_allowanceR = await ci.arc200_allowance(
        airdropAddress,
        activeAccount.address
      );
      const currentAllowance = arc200_allowanceR.returnValue.toString();

      const arc200_decimalsR = await ci.arc200_decimals();
      const decimals = Number(arc200_decimalsR.returnValue);

      if (currentAllowance === "0") {
        toast.error("You have already claimed this airdrop", {
          autoClose: 3000,
        });
        setClaimStatus((prev) => ({ ...prev, [airdrop.id]: "claimed" }));
        return;
      }

      // Sign and send the transaction
      const arc200_transferFromR = await ci.arc200_transferFrom(
        airdropAddress,
        activeAccount.address,
        BigInt(currentAllowance)
      );

      if (arc200_transferFromR.success) {
        const stxns = await signTransactions(
          arc200_transferFromR.txns.map((txn: string) =>
            Buffer.from(txn, "base64")
          )
        );
        await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();
        toast.success(
          `Successfully claimed ${
            Number(currentAllowance) / 10 ** decimals
          } VOI!`,
          {
            autoClose: 5000,
          }
        );
        setClaimStatus((prev) => ({ ...prev, [airdrop.id]: "claimed" }));
        // Update the statistics
        // You might want to refresh the eligibility data here
        setTimeout(() => {
          checkClaimStatus(airdrop);
        }, 2000);
      } else {
        toast.error("Failed to claim airdrop. Please try again.", {
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error("Error claiming airdrop:", error);
      toast.error("Failed to claim airdrop. Please try again.", {
        autoClose: 3000,
      });
    } finally {
      setClaimingAirdrop((prev) => ({ ...prev, [airdrop.id]: false }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "pending":
        return "warning";
      case "completed":
        return "default";
      default:
        return "default";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getClaimButtonText = (airdrop: Airdrop) => {
    if (airdrop.status === "pending") return "Coming Soon";
    if (airdrop.status === "completed") return "Completed";

    const claimStatusForAirdrop = claimStatus[airdrop.id];
    if (claimStatusForAirdrop === "claimed") return "Already Claimed";
    if (claimStatusForAirdrop === "checking") return "Checking...";
    if (claimingAirdrop[airdrop.id]) return "Claiming...";

    // Check if it's an external claim or in-app claim
    const isExternalClaim =
      airdrop.url &&
      airdrop.url !== "TBD" &&
      airdrop.url !== "null" &&
      airdrop.url.trim() !== "";

    return isExternalClaim ? "Claim on Website" : "Claim in App";
  };

  const isClaimButtonDisabled = (airdrop: Airdrop) => {
    if (airdrop.status === "pending") return true;
    if (claimStatus[airdrop.id] === "claimed") return true;
    if (claimStatus[airdrop.id] === "checking") return true;
    if (claimingAirdrop[airdrop.id]) return true;
    return false;
  };

  const filteredAirdrops = airdrops.filter((airdrop) => {
    const matchesSearch =
      airdrop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      airdrop.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || airdrop.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleBulkEligibilityCheck = async () => {
    if (!activeAccount) {
      toast.error("Please connect your wallet first", { autoClose: 3000 });
      return;
    }

    const activeAirdrops = airdrops.filter((a) => a.status === "active");

    toast.info(
      `Checking eligibility for ${activeAirdrops.length} airdrops...`,
      { autoClose: 3000 }
    );

    for (const airdrop of activeAirdrops) {
      await checkEligibility(airdrop);
      // Small delay to avoid overwhelming the network
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    toast.success("Bulk eligibility check completed!", { autoClose: 3000 });
  };

  const handleSelectAll = () => {
    const eligibleAirdrops = airdrops.filter(
      (a) =>
        a.status === "active" &&
        eligibilityResults[a.id] === true &&
        claimStatus[a.id] !== "claimed"
    );
    setSelectedAirdrops(new Set(eligibleAirdrops.map((a) => a.id)));
  };

  const handleDeselectAll = () => {
    setSelectedAirdrops(new Set());
  };

  const handleToggleSelection = (airdropId: string) => {
    const newSelection = new Set(selectedAirdrops);
    if (newSelection.has(airdropId)) {
      newSelection.delete(airdropId);
    } else {
      newSelection.add(airdropId);
    }
    setSelectedAirdrops(newSelection);
  };

  if (loading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Typography variant="h4" align="center">
            Loading airdrops...
          </Typography>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography
          variant="h3"
          component="h1"
          align="center"
          gutterBottom
          sx={{
            fontWeight: 700,
            color: isDarkTheme ? "#fff" : "#000",
            mb: 4,
          }}
        >
          Airdrop Center
        </Typography>

        {/* Search and Filter Controls */}
        <Box
          sx={{
            mb: 4,
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <RoundedTextField
            placeholder="Search airdrops..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              flex: 1,
              minWidth: 200,
              "& .MuiOutlinedInput-root": {
                backgroundColor: isDarkTheme
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.02)",
                color: isDarkTheme ? "#fff" : "#000",
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon
                    sx={{
                      color: isDarkTheme
                        ? "rgba(255, 255, 255, 0.5)"
                        : "rgba(0, 0, 0, 0.5)",
                    }}
                  />
                </InputAdornment>
              ),
            }}
          />
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel
              sx={{
                color: isDarkTheme
                  ? "rgba(255, 255, 255, 0.7)"
                  : "rgba(0, 0, 0, 0.7)",
              }}
            >
              Status
            </InputLabel>
            <RoundedSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as string)}
              sx={{
                backgroundColor: isDarkTheme
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.02)",
                color: isDarkTheme ? "#fff" : "#000",
                "& .MuiSelect-icon": {
                  color: isDarkTheme
                    ? "rgba(255, 255, 255, 0.5)"
                    : "rgba(0, 0, 0, 0.5)",
                },
              }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </RoundedSelect>
          </FormControl>
          <RoundedButton
            variant="outlined"
            onClick={handleBulkEligibilityCheck}
            disabled={!activeAccount}
            sx={{
              borderColor: isDarkTheme
                ? "rgba(255, 255, 255, 0.3)"
                : "rgba(0, 0, 0, 0.3)",
              color: isDarkTheme
                ? "rgba(255, 255, 255, 0.7)"
                : "rgba(0, 0, 0, 0.7)",
            }}
          >
            Check All Eligibility
          </RoundedButton>
          <RoundedButton
            variant="outlined"
            onClick={() => setNotifications(!notifications)}
            sx={{
              borderColor: isDarkTheme
                ? "rgba(255, 255, 255, 0.3)"
                : "rgba(0, 0, 0, 0.3)",
              color: isDarkTheme
                ? "rgba(255, 255, 255, 0.7)"
                : "rgba(0, 0, 0, 0.7)",
            }}
          >
            {notifications ? "Disable" : "Enable"} Notifications
          </RoundedButton>
        </Box>

        {error && (
          <Box sx={{ mb: 4, textAlign: "center" }}>
            <RoundedAlert
              severity="error"
              action={
                <RoundedButton
                  color="inherit"
                  size="small"
                  onClick={fetchAirdrops}
                >
                  Retry
                </RoundedButton>
              }
            >
              {error}
            </RoundedAlert>
          </Box>
        )}

        {/* Statistics Summary */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <RoundedCard
                sx={{
                  backgroundColor: isDarkTheme
                    ? "rgba(30, 32, 50, 0.9)"
                    : "rgba(255, 255, 255, 0.9)",
                  color: isDarkTheme ? "#fff" : "#000",
                  border: `1px solid ${
                    isDarkTheme
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.1)"
                  }`,
                  textAlign: "center",
                }}
              >
                <CardContent sx={{ py: 2 }}>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: "#4caf50" }}
                  >
                    {airdrops.filter((a) => a.status === "active").length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Active
                  </Typography>
                </CardContent>
              </RoundedCard>
            </Grid>
            <Grid item xs={6} sm={3}>
              <RoundedCard
                sx={{
                  backgroundColor: isDarkTheme
                    ? "rgba(30, 32, 50, 0.9)"
                    : "rgba(255, 255, 255, 0.9)",
                  color: isDarkTheme ? "#fff" : "#000",
                  border: `1px solid ${
                    isDarkTheme
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.1)"
                  }`,
                  textAlign: "center",
                }}
              >
                <CardContent sx={{ py: 2 }}>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: "#ff9800" }}
                  >
                    {airdrops.filter((a) => a.status === "pending").length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Pending
                  </Typography>
                </CardContent>
              </RoundedCard>
            </Grid>
            <Grid item xs={6} sm={3}>
              <RoundedCard
                sx={{
                  backgroundColor: isDarkTheme
                    ? "rgba(30, 32, 50, 0.9)"
                    : "rgba(255, 255, 255, 0.9)",
                  color: isDarkTheme ? "#fff" : "#000",
                  border: `1px solid ${
                    isDarkTheme
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.1)"
                  }`,
                  textAlign: "center",
                }}
              >
                <CardContent sx={{ py: 2 }}>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: "#2196f3" }}
                  >
                    {
                      Object.values(eligibilityResults).filter(
                        (result) => result === true
                      ).length
                    }
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Eligible
                  </Typography>
                </CardContent>
              </RoundedCard>
            </Grid>
            <Grid item xs={6} sm={3}>
              <RoundedCard
                sx={{
                  backgroundColor: isDarkTheme
                    ? "rgba(30, 32, 50, 0.9)"
                    : "rgba(255, 255, 255, 0.9)",
                  color: isDarkTheme ? "#fff" : "#000",
                  border: `1px solid ${
                    isDarkTheme
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.1)"
                  }`,
                  textAlign: "center",
                }}
              >
                <CardContent sx={{ py: 2 }}>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: "#9c27b0" }}
                  >
                    {
                      Object.values(claimStatus).filter(
                        (status) => status === "claimed"
                      ).length
                    }
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Claimed
                  </Typography>
                </CardContent>
              </RoundedCard>
            </Grid>
          </Grid>
        </Box>

        <Grid container spacing={3}>
          {filteredAirdrops.map((airdrop) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={airdrop.id}>
              <RoundedCard
                sx={{
                  height: "100%",
                  backgroundColor: isDarkTheme
                    ? "rgba(30, 32, 50, 0.9)"
                    : "rgba(255, 255, 255, 0.9)",
                  color: isDarkTheme ? "#fff" : "#000",
                  border: `1px solid ${
                    isDarkTheme
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.1)"
                  }`,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <CardMedia
                  component="img"
                  height="80"
                  width="80"
                  image={airdrop.image}
                  alt={airdrop.name}
                  sx={{
                    objectFit: "contain",
                    p: 1,
                    borderRadius: "50%",
                    border: "none",
                    overflow: "hidden",
                    width: "80px",
                    height: "80px",
                    alignSelf: "center",
                    mt: 2,
                  }}
                />
                <CardContent
                  sx={{
                    p: 2,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    minHeight: "400px",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      mb: 1.5,
                    }}
                  >
                    <Typography
                      variant="h6"
                      component="h2"
                      sx={{
                        fontWeight: 600,
                        fontSize: "1rem",
                        flex: 1,
                        mr: 1,
                        lineHeight: 1.2,
                      }}
                    >
                      {airdrop.name}
                    </Typography>
                    <RoundedChip
                      label={airdrop.status}
                      color={getStatusColor(airdrop.status) as any}
                      size="small"
                      sx={{ flexShrink: 0 }}
                    />
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{
                      mb: 1.5,
                      opacity: 0.8,
                      fontSize: "0.875rem",
                      lineHeight: 1.4,
                      minHeight: "2.8rem",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {airdrop.description}
                  </Typography>

                  <Box sx={{ mb: 1.5 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 500,
                        display: "block",
                        mb: 0.5,
                        fontSize: "0.75rem",
                      }}
                    >
                      Eligibility:
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        opacity: 0.8,
                        display: "block",
                        fontSize: "0.75rem",
                        lineHeight: 1.3,
                        minHeight: "1.3rem",
                      }}
                    >
                      {airdrop.eligibility}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1.5,
                      minHeight: "2.5rem",
                    }}
                  >
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          opacity: 0.6,
                          display: "block",
                          fontSize: "0.7rem",
                        }}
                      >
                        Start Date
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 500,
                          fontSize: "0.75rem",
                        }}
                      >
                        {formatDate(airdrop.start_date)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          opacity: 0.6,
                          display: "block",
                          fontSize: "0.7rem",
                        }}
                      >
                        Duration
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 500,
                          fontSize: "0.75rem",
                        }}
                      >
                        {airdrop.period}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Consolidated Status Display */}
                  {eligibilityResults[airdrop.id] !== undefined && (
                    <Box
                      sx={{
                        mb: 1.5,
                        p: 1.5,
                        borderRadius: 2,
                        minHeight: "3rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: (() => {
                          if (claimStatus[airdrop.id] === "claimed") {
                            return isDarkTheme
                              ? "rgba(33, 150, 243, 0.1)"
                              : "rgba(33, 150, 243, 0.05)";
                          }
                          if (eligibilityResults[airdrop.id] === true) {
                            return isDarkTheme
                              ? "rgba(76, 175, 80, 0.1)"
                              : "rgba(76, 175, 80, 0.05)";
                          }
                          return isDarkTheme
                            ? "rgba(244, 67, 54, 0.1)"
                            : "rgba(244, 67, 54, 0.05)";
                        })(),
                        border: `1px solid ${(() => {
                          if (claimStatus[airdrop.id] === "claimed") {
                            return isDarkTheme
                              ? "rgba(33, 150, 243, 0.3)"
                              : "rgba(33, 150, 243, 0.2)";
                          }
                          if (eligibilityResults[airdrop.id] === true) {
                            return isDarkTheme
                              ? "rgba(76, 175, 80, 0.3)"
                              : "rgba(76, 175, 80, 0.2)";
                          }
                          return isDarkTheme
                            ? "rgba(244, 67, 54, 0.3)"
                            : "rgba(244, 67, 54, 0.2)";
                        })()}`,
                        textAlign: "center",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: (() => {
                            if (claimStatus[airdrop.id] === "claimed") {
                              return "#2196f3";
                            }
                            if (eligibilityResults[airdrop.id] === true) {
                              return "#4caf50";
                            }
                            return "#f44336";
                          })(),
                          fontSize: "0.85rem",
                          lineHeight: 1.2,
                        }}
                      >
                        {(() => {
                          if (claimStatus[airdrop.id] === "claimed") {
                            return "You have already claimed this airdrop";
                          }
                          if (eligibilityResults[airdrop.id] === true) {
                            return "You are eligible!";
                          }
                          return "You are not eligible";
                        })()}
                      </Typography>
                    </Box>
                  )}

                  {/* Eligible Amount Display */}
                  {eligibilityResults[airdrop.id] === true &&
                    eligibleAmounts[airdrop.id] &&
                    claimStatus[airdrop.id] !== "claimed" && (
                      <Box
                        sx={{
                          mb: 1.5,
                          p: 1.5,
                          borderRadius: 2,
                          minHeight: "3.5rem",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isDarkTheme
                            ? "rgba(76, 175, 80, 0.1)"
                            : "rgba(76, 175, 80, 0.05)",
                          border: `1px solid ${
                            isDarkTheme
                              ? "rgba(76, 175, 80, 0.3)"
                              : "rgba(76, 175, 80, 0.2)"
                          }`,
                          textAlign: "center",
                        }}
                      >
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 700,
                            color: "#4caf50",
                            fontSize: "1rem",
                            lineHeight: 1.2,
                            mb: 0.5,
                          }}
                        >
                          {eligibleAmounts[airdrop.id].toFixed(2)} VOI
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            opacity: 0.8,
                            display: "block",
                            fontSize: "0.7rem",
                          }}
                        >
                          Eligible Amount
                        </Typography>
                      </Box>
                    )}

                  <Box sx={{ mt: "auto", pt: 1, minHeight: "5rem" }}>
                    {/* Check Eligibility Button */}
                    <RoundedButton
                      variant="outlined"
                      fullWidth
                      size="small"
                      onClick={() => checkEligibility(airdrop)}
                      disabled={
                        checkingEligibility[airdrop.id] ||
                        !activeAccount ||
                        airdrop.status === "pending"
                      }
                      sx={{
                        mb: 1,
                        height: "36px", // Fixed height for buttons
                        borderColor: isDarkTheme
                          ? "rgba(255, 255, 255, 0.3)"
                          : "rgba(0, 0, 0, 0.3)",
                        color: isDarkTheme
                          ? "rgba(255, 255, 255, 0.7)"
                          : "rgba(0, 0, 0, 0.7)",
                        fontSize: "0.8rem",
                        "&:hover": {
                          borderColor: isDarkTheme
                            ? "rgba(255, 255, 255, 0.5)"
                            : "rgba(0, 0, 0, 0.5)",
                        },
                      }}
                    >
                      {checkingEligibility[airdrop.id]
                        ? "Checking..."
                        : airdrop.status === "pending"
                        ? "Not Available"
                        : "Check Eligibility"}
                    </RoundedButton>

                    {/* Claim Button */}
                    <RoundedButton
                      variant="contained"
                      fullWidth
                      size="small"
                      onClick={() => handleClaim(airdrop)}
                      disabled={isClaimButtonDisabled(airdrop)}
                      sx={{
                        height: "36px", // Fixed height for buttons
                        background:
                          airdrop.status === "active" &&
                          claimStatus[airdrop.id] !== "claimed"
                            ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                            : "rgba(0, 0, 0, 0.12)",
                        color:
                          airdrop.status === "active" &&
                          claimStatus[airdrop.id] !== "claimed"
                            ? "#fff"
                            : "rgba(0, 0, 0, 0.38)",
                        fontSize: "0.8rem",
                        "&:hover": {
                          background:
                            airdrop.status === "active" &&
                            claimStatus[airdrop.id] !== "claimed"
                              ? "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)"
                              : "rgba(0, 0, 0, 0.12)",
                        },
                      }}
                    >
                      {getClaimButtonText(airdrop)}
                    </RoundedButton>
                  </Box>
                </CardContent>
              </RoundedCard>
            </Grid>
          ))}
        </Grid>

        {airdrops.length === 0 && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <Typography variant="h6" sx={{ opacity: 0.7 }}>
              No airdrops available at the moment.
            </Typography>
          </Box>
        )}
      </Container>
    </Layout>
  );
};

export default AirdropPage;
