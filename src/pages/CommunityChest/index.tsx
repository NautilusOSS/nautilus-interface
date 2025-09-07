import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  TextField,
  CircularProgress,
  useTheme,
  Link,
  MenuItem,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Modal,
  IconButton,
} from "@mui/material";
import styled, { keyframes, css } from "styled-components";
import { toast } from "react-toastify";
import Layout from "@/layouts/Default";
import BigNumber from "bignumber.js";
import { getAlgorandClients } from "@/wallets";
import algosdk from "algosdk";
import axios from "axios";
import { abi, CONTRACT } from "ulujs";
import { useWallet } from "@txnlab/use-wallet-react";
import party from "party-js";
import DepositModal from "./components/DepositModal";
import WithdrawModal from "./components/WithdrawModal";
import HowItWorksModal from "./components/HowItWorksModal";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RankingsModal from "./components/RankingsModal";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import BlockProductionGraph from "./components/BlockProductionGraph";
import InfoIcon from "@mui/icons-material/Info";
import RewardDistributionModal from "./components/RewardDistributionModal";
import LEDCountdown from "./components/LEDCountdown";
import { useSearchParams } from "react-router-dom";
import SwapModal from "./components/SwapModal";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { useCopyToClipboard } from "usehooks-ts";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import LaunchIcon from "@mui/icons-material/Launch";
import CloseIcon from "@mui/icons-material/Close";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import { useAccountBalance } from "@/hooks/useAccountBalance";
import { MIMIR_API } from "@/config/arc72-idx";

const findCommonRatio = (a: number, totalSum: number, n: number) => {
  // Using numerical method (binary search) to find r
  // where a(1-r^n)/(1-r) = totalSum
  let left = 0.1; // Lower bound for r
  let right = 2.0; // Upper bound for r
  const epsilon = 0.0000001; // Precision

  while (right - left > epsilon) {
    const mid = (left + right) / 2;
    const sum = (a * (1 - Math.pow(mid, n))) / (1 - mid);

    if (sum < totalSum) {
      left = mid;
    } else {
      right = mid;
    }
  }

  return (left + right) / 2;
};

export const getTokensByEpoch = async (epoch: number) => {
  // tokens = 3000000 for epoch 1
  // tokens = a * r^(i-1)
  const a = 3_000_000;
  const totalSum = 1_000_000_000;
  const n = 1042;
  const r = findCommonRatio(a, totalSum, n);
  return Math.round(a * Math.pow(r, epoch - 1));
};

interface CommunityChestProps {
  isDarkTheme: boolean;
  connected: boolean;
  address: string;
}

function weightedRandomSelect(data: any) {
  // Step 1: Convert balances to numbers and calculate total weight
  const totalBalance = data.balances.reduce(
    (sum: number, item: any) => sum + Number(item.balance),
    0
  );

  // Step 2: Calculate cumulative weights
  const cumulativeWeights = [];
  let cumulativeSum = 0;
  for (const item of data.balances) {
    cumulativeSum += Number(item.balance) / totalBalance;
    cumulativeWeights.push(cumulativeSum);
  }

  // Step 3: Generate a random number and select based on cumulative weights
  const random = Math.random();
  for (let i = 0; i < cumulativeWeights.length; i++) {
    if (random < cumulativeWeights[i]) {
      return data.balances[i].accountId;
    }
  }
}

const Container = styled(Box)<{ $isDarkTheme: boolean }>`
  padding: 24px;
  max-width: 800px;
  margin: 48px auto 0;
  color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};
  background-color: ${(props) =>
    props.$isDarkTheme ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.1)"};

  @media (min-width: 768px) {
    margin-top: 64px;
  }
`;

const StatsCard = styled(Card)<{ $isDarkTheme: boolean }>`
  background-color: ${(props) =>
    props.$isDarkTheme ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.1)"};
  margin-bottom: 24px;
  border-radius: 16px;
  box-shadow: none;
  color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};
  margin-top: 48px;
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  display: flex;
  flex-direction: column;

  @media (min-width: 768px) {
    flex-direction: row;
    margin-top: 64px;
  }
`;

const StatusRow = styled(Box)<{ $isDarkTheme: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  text-align: center;
  flex: 1;
  background-color: ${(props) =>
    props.$isDarkTheme ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.1)"};
  border-radius: 12px;
  margin: 4px;
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};

  @media (min-width: 768px) {
    &:last-child {
      border-right: 1px solid
        ${(props) =>
          props.$isDarkTheme
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)"};
    }
  }
`;

const BigNumberDisplay = styled(Typography)<{ $isDarkTheme: boolean }>`
  font-size: 36px;
  font-weight: 600;
  margin: 8px 0;
  font-family: "IBM Plex Mono", monospace;
  color: ${(props) => (props.$isDarkTheme ? "#90caf9" : "#1976d2")};
  text-shadow: ${(props) =>
    props.$isDarkTheme ? "0 0 20px rgba(144, 202, 249, 0.3)" : "none"};
`;

const Label = styled(Typography)<{ $isDarkTheme: boolean }>`
  font-size: 1.25rem;
  font-weight: 500;
  margin-bottom: 16px;
  padding-top: 24px; // Added padding at the top
  color: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)"};
`;

const ActionCard = styled(Card)<{ $isDarkTheme: boolean }>`
  background-color: ${(props) =>
    props.$isDarkTheme ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.1)"};
  padding: 24px;
  border-radius: 16px;
  box-shadow: none;
  color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};

  .MuiInputBase-root {
    color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};
    background-color: ${(props) =>
      props.$isDarkTheme ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.8)"};
    border-radius: 8px;
  }

  .MuiOutlinedInput-notchedOutline {
    border-color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)"};
  }

  .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline {
    border-color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)"};
  }

  .MuiFormLabel-root {
    color: ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 255, 255, 0.7)"
        : "rgba(0, 0, 0, 0.6)"} !important;
  }

  h6 {
    color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.9)" : "#000"};
    font-weight: 500;
    margin-bottom: 16px;
  }

  .MuiInputLabel-root {
    color: ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 255, 255, 0.7)"
        : "rgba(0, 0, 0, 0.6)"} !important;
  }

  .MuiInputLabel-root.Mui-focused {
    color: ${(props) =>
      props.$isDarkTheme ? "#90caf9" : "#1976d2"} !important;
  }

  .MuiButton-contained {
    background-color: ${(props) =>
      props.$isDarkTheme ? "#90caf9" : "#1976d2"};
    color: ${(props) => (props.$isDarkTheme ? "#000" : "#fff")};
    font-weight: 500;
    padding: 8px 24px;

    &:hover {
      background-color: ${(props) =>
        props.$isDarkTheme ? "#64b5f6" : "#1565c0"};
    }

    &:disabled {
      background-color: ${(props) =>
        props.$isDarkTheme
          ? "rgba(144, 202, 249, 0.3)"
          : "rgba(25, 118, 210, 0.3)"};
      color: ${(props) =>
        props.$isDarkTheme
          ? "rgba(0, 0, 0, 0.26)"
          : "rgba(255, 255, 255, 0.3)"};
    }
  }
`;

const glowAnimation = keyframes`
  0% {
    filter: drop-shadow(0 0 2px #ffd700);
  }
  50% {
    filter: drop-shadow(0 0 8px #ffd700);
  }
  100% {
    filter: drop-shadow(0 0 2px #ffd700);
  }
`;

const HeaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 48px;
  margin-top: 48px; // Added margin-top for spacing

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: center;
    gap: 32px;
    margin-top: 64px; // Slightly larger margin on desktop
  }
`;

const ChestIcon = styled.svg<{ $intensity: number }>`
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  animation: ${glowAnimation} 2s ease-in-out infinite;
  filter: drop-shadow(
    0 0 ${(props) => Math.min(props.$intensity * 2, 15)}px #ffd700
  );

  @media (min-width: 768px) {
    width: 96px;
    height: 96px;
    margin-bottom: 0;
  }
`;

const StorySection = styled(Typography)<{ $isDarkTheme: boolean }>`
  text-align: left;
  margin-bottom: 64px;
  font-style: italic;
  color: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)"};
  width: 100%;
  line-height: 1.6;
  padding: 0 16px;

  @media (min-width: 768px) {
    margin-bottom: 96px;
  }

  .how-it-works-link {
    color: ${(props) => (props.$isDarkTheme ? "#90caf9" : "#1976d2")};
    cursor: pointer;
    text-decoration: none;
    margin-left: 8px;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const Disclaimer = styled(Typography)<{ $isDarkTheme: boolean }>`
  text-align: left;
  margin-top: 32px;
  padding: 16px;
  font-size: 12px;
  color: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.6)"};
  border-top: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  line-height: 1.6;
`;

// Add keyframes for fade-in animation
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Update the RollDiceSection styled component
const RollDiceSection = styled(Box)<{ $isDarkTheme: boolean }>`
  text-align: center;
  margin-bottom: 32px;
  padding: 16px;
  background-color: ${(props) =>
    props.$isDarkTheme ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.1)"};
  border-radius: 16px;
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};

  .selected-account {
    font-size: 24px;
    font-weight: bold;
    color: ${(props) => (props.$isDarkTheme ? "#90caf9" : "#1976d2")};
    margin-top: 16px;
    animation: ${fadeIn} 0.5s ease-in-out; // Apply fade-in animation
  }
`;

// Update the EpochSummary interface
interface EpochSummary {
  start_date: string;
  end_date: string;
  proposers: { [key: string]: number } | []; // Update to handle object format
  total_blocks: number;
  ballast_blocks: number;
}

interface ApiResponse {
  last_updated: number;
  snapshots: EpochSummary[];
}

// Add this interface near the top with other interfaces
interface Notification {
  date: string;
  message: string;
  type: "info" | "warning" | "success";
  contractId: number;
}

// Update the NotificationSection styled component
const NotificationSection = styled(Box)<{ $isDarkTheme: boolean }>`
  margin: 64px 0 48px;
  padding: 16px;
  background-color: ${(props) =>
    props.$isDarkTheme ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.1)"};
  border-radius: 12px;
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
`;

const NotificationItem = styled(Box)<{ $isDarkTheme: boolean; $type: string }>`
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  background-color: ${(props) => {
    const alpha = props.$isDarkTheme ? "0.2" : "0.1";
    switch (props.$type) {
      case "info":
        return props.$isDarkTheme
          ? `rgba(33, 150, 243, ${alpha})`
          : `rgba(33, 150, 243, ${alpha})`;
      case "warning":
        return props.$isDarkTheme
          ? `rgba(255, 152, 0, ${alpha})`
          : `rgba(255, 152, 0, ${alpha})`;
      case "success":
        return props.$isDarkTheme
          ? `rgba(76, 175, 80, ${alpha})`
          : `rgba(76, 175, 80, ${alpha})`;
      default:
        return "transparent";
    }
  }};
  border-left: 4px solid
    ${(props) => {
      switch (props.$type) {
        case "info":
          return "#2196f3";
        case "warning":
          return "#ff9800";
        case "success":
          return "#4caf50";
        default:
          return "transparent";
      }
    }};

  &:last-child {
    margin-bottom: 0;
  }
`;

// Update notifications with contract IDs
const notifications: Notification[] = [
  {
    date: "2025-03-24",
    message: "Buidl Voi (bVoi) launched to support ecosystem development",
    type: "success",
    contractId: 8471125,
  },
  {
    date: "2024-11-14",
    message:
      "Update: Weekly rewards now available to CCV holder according to reward distribution",
    type: "info",
    contractId: 664258,
  },
  {
    date: "2024-11-13",
    message:
      "Community Chest v1.0 launched no-loss lottery with Community Chest Voi (CCV)",
    type: "success",
    contractId: 664258,
  },
  {
    date: "2024-03-20",
    message: "Wrapped VOI is now available for DeFi integrations",
    type: "success",
    contractId: 390001,
  },
  {
    date: "2024-03-15",
    message: "Fountain VOI launched with enhanced reward distribution",
    type: "success",
    contractId: 770561,
  },
  {
    date: "2024-03-10",
    message: "En VOI now supports name registrations and renewals",
    type: "info",
    contractId: 828295,
  },
  {
    date: "2024-03-05",
    message: "Womp VOI integration with WompCrew ecosystem complete",
    type: "success",
    contractId: 888305,
  },
  {
    date: "2025-01-24",
    message: "NFT VOI now live for digital collectibles",
    type: "success",
    contractId: 913147,
  },
  {
    date: "2025-01-28",
    message: "Arb Voi now live for arbitrage opportunities",
    type: "success",
    contractId: 917261,
  },
  {
    date: "2025-03-04",
    message: "Liquid Voi (LV) launches with automated rewards distribution",
    type: "success",
    contractId: 8372092,
  },
  {
    date: "2025-04-01",
    message: "Gully Voi (gVOI) launched to support Gully ecosystem development",
    type: "success",
    contractId: 39949746,
  },
  {
    date: "2025-05-19",
    message:
      "GM Liquid Stake (COFFEE) launched to support GM ecosystem development",
    type: "success",
    contractId: 40077073,
  },
];

// Add these near the top with other interfaces
interface ContractOption {
  id: number;
  name: string;
  description: string;
  iconPath: string;
  tokenomics: {
    holder: number;
    lpHolder: number;
    treasury: number;
    team: number;
    node: number;
    other: number;
    drawing: number;
    faucet: number;
    future: number; // Added future field
  };
  tokenomicsNote?: string;
  url?: string;
  image?: string;
}

// Add color mapping for tokenomics properties
const TOKENOMICS_COLORS = {
  holder: "#4CAF50", // Green for holders
  lpHolder: "#9C27B0", // Purple for LP holders
  treasury: "#FFC107", // Yellow for treasury
  team: "#9C27B0", // Purple for team
  node: "#FF5722", // Orange for node
  other: "#808080", // Grey for other
  drawing: "#E91E63", // Pink for drawing/rewards
  development: "#00BCD4", // Cyan for development
  faucet: "#00FFFF", // Changed to aqua for faucet
  future: "#607D8B", // Blue-grey for future
};

// Update the baseTokenomics object to ensure all properties are included
const baseTokenomics: ContractOption["tokenomics"] = {
  holder: 0,
  lpHolder: 0,
  treasury: 0,
  team: 0,
  node: 0,
  other: 0,
  drawing: 0,
  faucet: 0,
  future: 0, // Added future field
};

// Update the defaultTokenomics to include all properties
const defaultTokenomics: ContractOption["tokenomics"] = {
  ...baseTokenomics,
  other: 1, // Default to 100% other if no specific distribution
};

// Helper function to format tokenomics label - add faucet case
const formatTokenomicsLabel = (key: string): string => {
  switch (key) {
    case "holder":
      return "Holders";
    case "lpHolder":
      return "LP Holders";
    case "treasury":
      return "Treasury";
    case "team":
      return "Team";
    case "node":
      return "Node";
    case "other":
      return "Other";
    case "drawing":
      return "Drawing";
    case "faucet":
      return "Faucet";
    case "future":
      return "Future Use";
    default:
      return key;
  }
};

// Add this function to prepare data for the pie chart
const prepareTokenomicsData = (tokenomics: ContractOption["tokenomics"]) => {
  const entries = Object.entries(tokenomics)
    .filter(([_, value]) => value > 0) // Only include non-zero values
    .map(([key, value]) => ({
      name: formatTokenomicsLabel(key),
      value: value * 100, // Convert to percentage
      color:
        TOKENOMICS_COLORS[key as keyof typeof TOKENOMICS_COLORS] || "#808080",
    }));

  // If there's only one entry, ensure it gets a proper color
  if (entries.length === 1) {
    const [entry] = entries;
    // Find the key that has value 1
    const fullPropertyKey = Object.entries(tokenomics).find(
      ([_, val]) => val === 1
    )?.[0];
    if (fullPropertyKey) {
      entry.color =
        TOKENOMICS_COLORS[fullPropertyKey as keyof typeof TOKENOMICS_COLORS];
      console.log("Setting color for", fullPropertyKey, "to", entry.color); // Debug log
    }
  }

  return entries;
};

const CONTRACT_OPTIONS: ContractOption[] = [
  {
    id: 0,
    name: "VOI",
    description: "VOI is the native token of the Voi ecosystem.",
    iconPath:
      "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z",
    tokenomics: {
      holder: 1,
      lpHolder: 0,
      treasury: 0,
      team: 0,
      node: 0,
      other: 0,
      drawing: 0,
      faucet: 0,
      future: 0,
    },
  },
  {
    id: 664258,
    name: "Community Chest Voi (CCV)",
    description:
      "Community Chest Voi is the original Community Chest token with weekly draws and holder distributions.",
    iconPath: "M3 3h18v18H3V3m15 15V6H6v12h12Z",
    tokenomics: {
      holder: 0.45,
      drawing: 0.5,
      lpHolder: 0,
      treasury: 0,
      team: 0,
      node: 0.05,
      other: 0,
      faucet: 0,
      future: 0,
    },
    tokenomicsNote:
      "Drawings and holder distributions are held every week on a random day of the week.",
  },
  {
    id: 390001,
    name: "Wrapped VOI (wVOI)",
    description:
      "Wrapped VOI is used for LP incentives on HumbleSwap tied to block rewards. It represents all the VOI held in liquidity pools on HumbleSwap. There is no incentive to hold wVOI, it is only used for LP incentives.",
    iconPath:
      "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z",
    tokenomics: {
      holder: 0,
      drawing: 0,
      lpHolder: 0.9999, // 100% to LP holders (using purple color)
      treasury: 0,
      team: 0,
      node: 0.0001,
      other: 0,
      faucet: 0,
      future: 0,
    },
    url: "https://voi.humble.sh/",
  },
  {
    id: 770561,
    name: "Fountain VOI (FV)",
    description:
      "Fountain VOI is a wrapped VOI token that allows holders to contribute to the Voi Fountain project. Voi Fountain provideds a faucet where anyone can claim VOI every 24 hours based on how much they have explored the ecosystem. Holders may increase claim amount by holding FV.",
    iconPath:
      "M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z...",
    tokenomics: {
      holder: 0,
      drawing: 0,
      lpHolder: 0,
      treasury: 0,
      team: 0,
      node: 0.0001,
      other: 0,
      faucet: 0.9999, // 100% to faucets
      future: 0, // Added future field
    },
    url: "https://faucet.voirewards.com/",
  },
  {
    id: 913147,
    name: "NFT Voi (NFV)",
    description: "Weekly NFT prizes for holders...",
    iconPath: "M19 19H5V5h14m0-2H5c-1.1...",
    tokenomics: {
      holder: 0.32,
      drawing: 0.6,
      lpHolder: 0,
      treasury: 0,
      team: 0,
      node: 0.05,
      other: 0.03,
      faucet: 0,
      future: 0,
    },
    tokenomicsNote:
      "NFT draws are held every week on a random day of the week. The NFTs are chosen from the vault. Drawing allocation is used to purchase NFTs for the vault. Holders of GM Simpleton, Pixel Cups, and GN Voiagers recieve 1% of distribution, respectfully.",
  },
  {
    id: 8372092,
    name: "Liquid Voi (LV)",
    description:
      "Liquid staking solution for VOI with automatic rewards distribution.",
    iconPath:
      "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z...",
    tokenomics: {
      holder: 0.95, // 95% to holders
      drawing: 0,
      lpHolder: 0,
      treasury: 0,
      team: 0,
      node: 0.05, // 5% to nodes
      other: 0,
      faucet: 0,
      future: 0, // Added future field
    },
  },
  // For tokens without specific tokenomics, use the defaultTokenomics
  {
    id: 828295,
    name: "En VOI (EV)",
    description:
      "En VOI is the backbone of the enVoi Naming Service. EV represents staked VOI that secures name registrations and renewals in the enVoi ecosystem. While holding EV, you're contributing to the development of Voi's decentralized naming infrastructure.",
    iconPath: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z...",
    tokenomics: {
      holder: 0,
      drawing: 0,
      lpHolder: 0,
      treasury: 0.9999,
      team: 0,
      node: 0.0001,
      other: 0,
      faucet: 0,
      future: 0, // Added future field
    },
    url: "https://envoi.sh/",
  },
  {
    id: 888305,
    name: "Womp VOI (WV)",
    description:
      "Womp VOI is the token that powers the WompCrew ecosystem. WV represents staked VOI in the WompCrew project, enabling users to participate in various WompCrew activities and support the growing WompCrew community.",
    iconPath:
      "M4 2C2.9 2 2 2.9 2 4v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H4z...",
    tokenomics: {
      holder: 0,
      drawing: 0,
      lpHolder: 0,
      treasury: 0.9999,
      team: 0,
      node: 0.0001,
      other: 0,
      faucet: 0,
      future: 0, // Added future field
    },
  },
  {
    id: 917261,
    name: "Arb Voi (ARV)",
    description:
      "Arb Voi is a token that supports future arbitrage opportunities within the Voi ecosystem. ARV represents staked VOI in the Arb Voi project, enabling users to participate in various Arb Voi activities and support the growing Arb Voi community.",
    iconPath:
      "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z...",
    tokenomics: {
      holder: 0,
      drawing: 0,
      lpHolder: 0,
      treasury: 0,
      team: 0,
      node: 0.0001,
      other: 0,
      faucet: 0,
      future: 0.9999, // Added future field
    },
  },
  // Nautilus Voi (NV)
  {
    id: 8324600,
    name: "Nautilus Voi (NV)",
    description:
      "Nautilus VOI is a token that supports Nautilus development and ecosystem. NV represents staked VOI in the Nautilus project, enabling users to support the project by holding NV. In addition, it is used to for offers. If you have offers, cancel them instead of withdrawing NV directly to avoid losing your offers.",
    iconPath: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    tokenomics: {
      holder: 0,
      drawing: 0,
      lpHolder: 0,
      treasury: 0.9999,
      team: 0,
      node: 0.0001,
      other: 0,
      faucet: 0,
      future: 0, // Added future field
    },
  },
  {
    id: 8471125,
    name: "Buidl Voi (bVoi)",
    description:
      "Buidl Voi (bVoi) is a wrapped VOI token that represents staked VOI in the Buidl program, enabling users to support Voi ecosystem development.",
    iconPath: "M12 3L1 9l11 6 11-6z M2 12l10 6 10-6", // Basic building block icon path
    tokenomics: {
      holder: 0,
      drawing: 0,
      lpHolder: 0,
      treasury: 0,
      team: 0,
      node: 0.0001,
      other: 0,
      faucet: 0,
      future: 0.9999, // Added future field
    },
  },
  {
    id: 39949746,
    name: "Gully Voi (gVOI)",
    description:
      "Gully Voi (gVOI) is a wrapped VOI token that represents staked VOI in the Gully ecosystem. gVOI holders support the development of Gully's decentralized applications and may be eligible for future incentives.",
    iconPath: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5", // Basic building block icon path
    tokenomics: {
      holder: 0.9999,
      drawing: 0,
      lpHolder: 0,
      treasury: 0,
      team: 0,
      node: 0.0001,
      other: 0,
      faucet: 0,
      future: 0,
    },
  },
  {
    id: 40077073,
    name: "GM Liquid Stake (COFFEE)",
    description:
      "COFFEE is GM's liquid staking token, representing staked VOI to support long-term GM/VOI trading liquidity without earning rewards. This token helps maintain stable liquidity for the GM ecosystem while allowing holders to maintain flexibility with their positions.",
    iconPath:
      "M4 19h16v-2H4v2zm16-16H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2z",
    tokenomics: {
      holder: 0,
      drawing: 0,
      lpHolder: 0,
      treasury: 0.95,
      team: 0,
      node: 0.05,
      other: 0,
      faucet: 0,
      future: 0,
    },
    tokenomicsNote:
      "95% of rewards are automatically distributed to COFFEE holders, with 5% allocated to node operations.",
  },
  {
    id: 40227315,
    name: "Virtual Babes VOiconomy (VBV)",
    description:
      "Staking in Virtual Babes VOiconomy allows users to grow their VOI in $VBV, rewarding users with $VBV. User rewards are compounded into their stake and their stake can be withdrawn 1:1 with VOI anytime, forfeiting those % of stakes unpaid rewards for the current epoch withdrawn in. Regular rewards are paid into users stake after each completed epoch has been cleared. Bonus rewards are paid irregularly and may vary, these bonuses will grow in value over time.",
    iconPath:
      "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z",
    tokenomics: {
      holder: 0.5,
      drawing: 0,
      lpHolder: 0.25,
      treasury: 0.1,
      team: 0,
      node: 0.1,
      other: 0.05,
      faucet: 0,
      future: 0,
    },
    tokenomicsNote:
      "Holders receive ~50% of epoch VOI block rewards as $VBV. LP and Bonus Reward System receives 25%, Treasury 10%, Node manager 10%, and Community wVOI 5%.",
  },
  {
    id: 40263883,
    name: "Neo Voi (NEO)",
    description:
      "Neo Voi (NEO) is a wrapped VOI token that represents staked VOI in the Neo ecosystem. NEO holders support the development of Neo's decentralized applications and may be eligible for future incentives.",
    iconPath:
      "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z",
    tokenomics: {
      holder: 0,
      drawing: 0,
      lpHolder: 0,
      treasury: 0.9999,
      team: 0,
      node: 0.0001,
      other: 0,
      faucet: 0,
      future: 0,
    },
  },
];

const getContractInfo = (contractId: number) => {
  switch (contractId) {
    case 390001:
      return {
        title: "Wrapped VOI",
        iconPath:
          "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z",
      };
    case 770561:
      return {
        title: "Fountain VOI",
        iconPath:
          "M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8zM12 20c-3.35 0-6-2.57-6-6.2 0-2.34 1.95-5.44 6-9.14 4.05 3.7 6 6.79 6 9.14 0 3.63-2.65 6.2-6 6.2z",
      };
    case 828295:
      return {
        title: "En VOI",
        iconPath:
          "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0-6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 7c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4zm6 5H6v-.99c.2-.72 3.3-2.01 6-2.01s5.8 1.29 6 2v1z",
      };
    case 888305:
      return {
        title: "Womp VOI",
        iconPath:
          "M4 2C2.9 2 2 2.9 2 4v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H4zm0 2h16v16H4V4zm4 4h8v8H8V8zm0 4h10v2H7v-2z",
      };
    case 913147:
      return {
        title: "NFT VOI",
        iconPath:
          "M12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zm0 2c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 1c3.87 0 7 3.13 7 7 0 1.93-.78 3.68-2.05 4.95L9.05 8.05C10.32 6.78 12.07 6 14 5zm-7 7c0-1.93.78-3.68 2.05-4.95l7.9 7.9C15.68 18.22 13.93 19 12 19c-3.87 0-7-3.13-7-7z",
      };
    case 917261:
      return {
        title: "Arb Voi",
        iconPath:
          "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-7-2h2V7h-4v2h2z",
      };
    case 8324600:
      return {
        title: "Nautilus Voi (NV)",
        iconPath: "M12 2L2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
      };
    case 8372092:
      return {
        title: "Liquid Voi (LV)",
        iconPath:
          "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2V8h-2v8z",
      };
    case 8471125:
      return {
        title: "Buidl Voi (bVoi)",
        iconPath: "M12 3L1 9l11 6 11-6z M2 12l10 6 10-6", // Basic building block icon path
      };
    case 39949746:
      return {
        title: "Gully Voi (gVOI)",
        iconPath: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5", // Basic building block icon path
      };
    case 40077073:
      return {
        title: "GM Liquid Stake (COFFEE)",
        iconPath:
          "M4 19h16v-2H4v2zm16-16H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2z",
      };
    case 40227315:
      return {
        title: "Virtual Babes VOiconomy (VBV)",
        iconPath:
          "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z",
      };
    case 40263883:
      return {
        title: "Neo Voi (NEO)",
        iconPath:
          "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z",
      };
    default:
      return {
        title: "Community Chest",
        iconPath:
          "M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v12h14V6H5zm2 2h10v2H7V8zm0 4h10v2H7v-2z",
      };
  }
};

// Update the function signature to accept isDarkTheme
const getContractDescription = (
  contractId: number,
  isDarkTheme: boolean
): React.ReactNode => {
  switch (contractId) {
    case 664258:
      return "Welcome to the Community Chest - a collaborative pool where members can deposit VOI for a chance to win big! Every deposit increases the chest's value, and weekly draws give participants the opportunity to win exciting rewards. Your deposit remains fully accessible - you can withdraw your entire contribution at any time without restrictions. Join us in building this treasure trove of possibilities!";
    case 390001:
      return "Welcome to Wrapped VOI (wVOI) - a wrapped version of the native VOI token that enables seamless integration with DeFi protocols and smart contracts. wVOI maintains perfect 1:1 parity with VOI, allowing users to easily participate in decentralized finance while retaining the full value of their VOI holdings.";
    case 770561:
      return "Welcome to Fountain VOI (FV) - your gateway to the Voi Fountain ecosystem. By holding FV, you're not just participating in the network - you're supporting the growth of the Voi Fountain project while earning additional rewards through the Fountain's innovative reward distribution system.";
    case 828295:
      return "Welcome to En VOI (EV) - the backbone of the enVoi Naming Service. EV represents staked VOI that secures name registrations and renewals in the enVoi ecosystem. While holding EV, you're contributing to the development of Voi's decentralized naming infrastructure.";
    case 888305:
      return "Welcome to Womp VOI (WV) - the token that powers the WompCrew ecosystem. WV represents staked VOI in the WompCrew project, enabling users to participate in various WompCrew activities and support the growing WompCrew community.";
    case 913147:
      return "Welcome to NFT VOI (NFV) - the token that bridges the gap between VOI and NFTs. NFV enables unique interactions with digital collectibles while maintaining the security and value of the VOI ecosystem. Join us in exploring the intersection of DeFi and NFTs!";
    case 917261:
      return "Welcome to Arb Voi (ARV) - a token designed for arbitrage opportunities within the Voi ecosystem. ARV enables users to participate in cross-platform trading and take advantage of price differentials while maintaining the security of the Voi network.";
    case 8324600:
      return "Welcome to Nautilus Voi (NV) - support Nautilus development and ecosystem. NV represents staked VOI in the Nautilus project, enabling users to support the project by holding NV";
    case 8372092:
      return "Welcome to Liquid Voi (LV) - a liquid staking solution that allows you to stake your VOI while maintaining liquidity. Your staked VOI automatically earns rewards which are distributed to all LV holders proportionally. Stake, earn, and trade without lockups!";
    case 8471125:
      return "Buidl VOI (bVoi) is a wrapped VOI token that represents staked VOI in the Buidl program. Holders support ecosystem development and may be eligible for future incentives. There are currently no direct rewards for holding bVoi.";
    case 39949746:
      return "Gully Voi (gVOI) is a wrapped VOI token that represents staked VOI in the Gully ecosystem. gVOI holders support the development of Gully's decentralized applications and may be eligible for future incentives.";
    case 40077073:
      return "COFFEE is GM's liquid staking token, representing staked VOI to support long-term GM/VOI trading liquidity without earning rewards. This token helps maintain stable liquidity for the GM ecosystem while allowing holders to maintain flexibility with their positions.";
    case 40227315:
      return "Welcome to Virtual Babes VOiconomy (VBV) - a staking solution that allows users to grow their VOI in $VBV. User rewards are compounded into their stake and can be withdrawn 1:1 with VOI anytime. Regular rewards are paid after each completed epoch, while bonus rewards are paid irregularly and grow in value over time.";
    case 40263883:
      return "Neo Voi (NEO) is a wrapped VOI token that represents staked VOI in the Neo ecosystem. NEO holders support the development of Neo's decentralized applications and may be eligible for future incentives.";
    default:
      return "";
  }
};

// Add this styled component with other styled components
const NFTPrizeCard = styled(Box)<{ $isDarkTheme: boolean }>`
  padding: 24px;
  background-color: ${(props) =>
    props.$isDarkTheme ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.1)"};
  border-radius: 16px;
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  margin-bottom: 24px;
  text-align: center;
`;

const NFTImage = styled.img<{ $isDarkTheme: boolean }>`
  width: 200px;
  height: 200px;
  border-radius: 8px;
  margin: 16px auto;
  display: block;
  object-fit: cover;
  border: 2px solid ${(props) => (props.$isDarkTheme ? "#90caf9" : "#1976d2")};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
`;

// Add these interfaces with other interfaces
interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  properties: Record<string, string>;
}

interface NFTAsset {
  contractId: number;
  tokenId: string;
  metadata: string;
  collectionName: string;
}

// Add this styled component with other styled components
const NFTVaultSection = styled(Box)<{ $isDarkTheme: boolean }>`
  margin: 24px 0;
  padding: 24px;
  background-color: ${(props) =>
    props.$isDarkTheme ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.1)"};
  border-radius: 16px;
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
`;

// Add these styled components near the other styled components
const HeroSection = styled(Box)<{ $isDarkTheme: boolean }>`
  background: ${(props) =>
    props.$isDarkTheme
      ? "linear-gradient(180deg, rgba(25, 118, 210, 0.2) 0%, rgba(0, 0, 0, 0) 100%)"
      : "linear-gradient(180deg, rgba(144, 202, 249, 0.2) 0%, rgba(255, 255, 255, 0) 100%)"};
  padding: 48px 24px;
  text-align: center;
  margin-bottom: 32px;
`;

const HeroTitle = styled(Typography)<{ $isDarkTheme: boolean }>`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 16px;
  background: ${(props) =>
    props.$isDarkTheme
      ? "linear-gradient(45deg, #90caf9 30%, #64b5f6 90%)"
      : "linear-gradient(45deg, #1976d2 30%, #1565c0 90%)"};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

  @media (max-width: 600px) {
    font-size: 2rem;
  }
`;

const HeroSubtitle = styled(Typography)<{ $isDarkTheme: boolean }>`
  font-size: 1.25rem;
  color: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)"};
  margin: 0 auto;
  line-height: 1.6;
  text-align: center;
  padding: 0 24px;
  max-width: 800px;

  @media (max-width: 600px) {
    font-size: 1rem;
  }
`;

// Update StatsHighlight styled component
const StatsHighlight = styled(Box)`
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 32px;
  flex-wrap: wrap;
  max-width: 1200px; // Match Container max-width
  margin-left: auto;
  margin-right: auto;
  padding: 0 24px; // Match Container padding
`;

const StatItem = styled(Box)<{ $isDarkTheme: boolean }>`
  text-align: center;

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: ${(props) => (props.$isDarkTheme ? "#90caf9" : "#1976d2")};
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 0.875rem;
    color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)"};
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`;

// Add this helper function near other utility functions
const formatLargeNumber = (value: string): string => {
  const num = parseFloat(value) / 1e6; // Convert to VOI units
  if (num >= 1_000_000) {
    return `${Math.floor(num / 1_000_000)}M`;
  } else if (num >= 1_000) {
    return `${Math.floor(num / 1_000)}k`;
  }
  return Math.floor(num).toString();
};

// Add this styled component with other styled components
const UserBalancesSection = styled(Box)<{ $isDarkTheme: boolean }>`
  margin: 24px auto;
  padding: 24px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  padding: 0 24px 24px;
  background-color: ${(props) =>
    props.$isDarkTheme ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.1)"};
  border-radius: 16px;
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
`;

// Create a common table style mixin
const tableStyles = css<{ $isDarkTheme: boolean }>`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  th,
  td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid
      ${(props) =>
        props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
    font-size: 0.875rem;
  }

  // Add this to ensure last row doesn't have a border if needed
  tr:last-child td {
    border-bottom: none;
  }
`;

// Update the existing table styled components to use the mixin
const BalanceTable = styled(Box)`
  width: 100%;
  table {
    ${tableStyles}
  }
`;

// Update the ComparisonTable styled component to accommodate the pie chart
const ComparisonTable = styled(Box)`
  overflow-x: auto;
  margin-top: 24px;
  table {
    ${tableStyles}
    min-width: 800px;

    td:first-child {
      width: 120px; // Increase width to accommodate pie chart
      padding: 8px;
    }
  }
`;

// Add a skeleton loading state for the balance cards
const BalanceCardSkeleton = styled(Box)`
  height: 80px;
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    ${(props) =>
        props.$isDarkTheme ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
      25%,
    ${(props) =>
        props.$isDarkTheme ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}
      50%,
    ${(props) =>
        props.$isDarkTheme ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
      75%
  );
  background-size: 200% 100%;
  animation: pulse 1.5s ease-in-out infinite;
`;

const BalanceCard = styled(Box)<{ $isDarkTheme: boolean }>`
  padding: 16px;
  border-radius: 8px;
  background-color: ${(props) =>
    props.$isDarkTheme ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.2)"};
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};

  .token-name {
    font-size: 0.875rem;
    color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)"};
    margin-bottom: 4px;
  }

  .balance {
    font-size: 1.25rem;
    font-weight: 600;
    color: ${(props) => (props.$isDarkTheme ? "#90caf9" : "#1976d2")};
  }
`;

// Add a dedicated error state component
const ErrorState = styled(Box)`
  text-align: center;
  padding: 24px;
  color: ${(props) => (props.$isDarkTheme ? "#ff6b6b" : "#d32f2f")};

  .retry-button {
    margin-top: 16px;
  }
`;

const TotalBalance = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};

  .total-label {
    font-size: 1rem;
    color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)"};
  }

  .total-value {
    font-size: 1.25rem;
    font-weight: 600;
    color: ${(props) => (props.$isDarkTheme ? "#90caf9" : "#1976d2")};
  }
`;

// Add this interface near other interfaces
interface NFTRelease {
  date: string;
  name: string;
  url: string;
  winnerAddress: string;
  txid: string;
}

// Add this constant with the release schedule data
const NFT_RELEASES: NFTRelease[] = [
  {
    date: "2025-01-31 00:00:00 UTC",
    name: "PXLMOB30",
    url: "https://nautilus.sh/#/collection/400099/token/30",
    winnerAddress: "EM6YOBT4UOMEGWZO74OLOSA55V6EH6DUQSCAJA6FNMQ5IS5U3GZXBUR2OI",
    txid: "BKUIX5NRWXCYGNVDMKCSHJCEP6EDGWAUDX6T6HSHXQ7A6YZIWRSQ",
  },
  {
    date: "2025-02-07 00:00:00 UTC",
    name: "DORKS13",
    url: "https://nautilus.sh/#/collection/894888/token/13",
    winnerAddress: "BWHDXT6H4EP54IE3ETYXR3YATEXNI7ABWYTX3LQVBGTFQZ3OK4QAQWFLLM",
    txid: "SRPUJZDXM5AB4XZBCRKFIHEZAYOEKJHTKOYR5ENGVJEITKRL6BJA",
  },
  {
    date: "2025-02-14 00:00:00 UTC",
    name: "DORKS29",
    url: "https://nautilus.sh/#/collection/894888/token/29",
    winnerAddress: "MUTS5EI5IYSNNM2QDLNPBJ2NNRSRRMUC4S6OTCXM3JZMHUAJOSJT6YUKRA",
    txid: "G7IQFGOMS367XPXYUQDYK4F7UXVKDQJWA53WGU5N7CZRYGTXDUKA",
  },
  {
    date: "2025-02-21 00:00:00 UTC",
    name: "Mermaid4",
    url: "https://nautilus.sh/#/collection/864075/token/4",
    winnerAddress: "VDEVK22RGTKEE4EVKRTWVBPBPBB3IOFGO25RQCKDZCLZMRBKFBNNECRDLI",
    txid: "ZKPEMRSL3G6JK6I2554J3RII7RNZDTFFGTG5VQLAF6WLNELCFHQA",
  },
  {
    date: "2025-02-28 00:00:00 UTC",
    name: "Mermaid2",
    url: "https://nautilus.sh/#/collection/864075/token/2",
    winnerAddress: "ZYOUQ7CP7JLNYYQJXMICT3CGUBJZUGOJ5L4HZRION4RIIBXZCWXM2XJ6XI",
    txid: "6YRO7WXK6IMNAEJG4T46IB2MEXRYBFMJQORNIDVXAUB4ZS3YDQIQ",
  },
  {
    date: "2025-03-07 00:00:00 UTC",
    name: "Chrisbro 16",
    url: "https://nautilus.sh/#/collection/603303/token/16",
    winnerAddress: "MUTS5EI5IYSNNM2QDLNPBJ2NNRSRRMUC4S6OTCXM3JZMHUAJOSJT6YUKRA",
    txid: "SOC43DLHDS4DGKWFM75WOWBGUA2TWS2FVLULGPXH4EZP3LKOIBWA",
  },
  {
    date: "2025-03-14 00:00:00 UTC",
    name: "PixelProphet162",
    url: "https://nautilus.sh/#/collection/450392/token/162",
    winnerAddress: "R7TBR3Y5QCM6Y2OPQP3BPNUQG7TLN75IOC2WTNRUKO4VPNSDQF52MZB4ZE",
    txid: "PVJ24GYELTZH47QDZ4DVFKQ5N7RFXJGXDW7O3M62LTJNPKSL6M3A",
  },
  {
    date: "2025-03-21 00:00:00 UTC",
    name: "AI Voiager #66",
    url: "https://nautilus.sh/#/collection/398796/token/66",
    winnerAddress: "MUTS5EI5IYSNNM2QDLNPBJ2NNRSRRMUC4S6OTCXM3JZMHUAJOSJT6YUKRA",
    txid: "Y76JCTFIVIDZNSGBDTBXMEMW5O47FN7Z6O6Y4K7FTSMVJXWJMLBA",
  },
  {
    date: "2025-03-28 00:00:00 UTC",
    name: "CandyMons90",
    url: "https://nautilus.sh/#/collection/587497/token/90",
    winnerAddress: "VOIUK3B5KQXVMVMYMLZOELHNABRKV27BP3CZRIK2ZCF7HEFP4F6APX76NM",
    txid: "FXAIOAH4RQUECYKXJNVSGCWWPP6RDJR2DLWZDR4UFSN3QAE7BH2Q",
  },
  {
    date: "2025-04-04 00:00:00 UTC",
    name: "Bored Crepe #24",
    url: "https://nautilus.sh/#/collection/398078/token/24",
    winnerAddress: "",
    txid: "",
  },
  {
    date: "2025-04-11 00:00:00 UTC",
    name: "COB13",
    url: "https://nautilus.sh/#/collection/417521/token/13",
    winnerAddress: "",
    txid: "",
  },
  {
    date: "2025-04-18 00:00:00 UTC",
    name: "MIA WILD #188",
    url: "https://nautilus.sh/#/collection/425242/token/188",
    winnerAddress: "",
    txid: "",
  },
  {
    date: "2025-04-25 00:00:00 UTC",
    name: "Zodiac 12",
    url: "https://nautilus.sh/#/collection/407072/token/12",
    winnerAddress: "",
    txid: "",
  },
];

// Add these styled components with other styled components
const ReleaseScheduleSection = styled(Box)<{ $isDarkTheme: boolean }>`
  margin: 32px 0;
  padding: 24px;
  background-color: ${(props) =>
    props.$isDarkTheme ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.1)"};
  border-radius: 16px;
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
`;

const ReleaseTable = styled(Box)`
  overflow-x: auto;

  table {
    ${tableStyles}
    min-width: 600px;

    // Additional specific styles for ReleaseTable...
  }
`;

// Inside your CommunityChest component, add this helper function
const formatReleaseDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Add this interface near other interfaces
interface DrawHistory {
  date: string;
  amount: string;
  winnerAddress: string;
  txid: string;
}

// Add this constant with the draw history data
const DRAW_HISTORY: DrawHistory[] = [
  {
    date: "2025-01-28 00:00:00 UTC",
    amount: "760.7277743",
    winnerAddress: "5B3H47ALJ7WVF45HMVFQJ5XZGNLDE677FIPLHR2FB4J6S4MZYHDVQRGCTU",
    txid: "-",
  },
  {
    date: "2025-01-22 00:00:00 UTC",
    amount: "748.4402651",
    winnerAddress: "DQVAPFLH3ZOG3LJPFCDATKKTO5YXM77ENZBAEO5LPL7AO6QASBEEKDVS4I",
    txid: "-",
  },
  {
    date: "2025-01-08 00:00:00 UTC",
    amount: "1291.000657",
    winnerAddress: "7WO47R4XY5TIO3YP4KFK7RU6Z72YL5VPPIOM2P5NNFH6YFYLQZVVJWMJFI",
    txid: "-",
  },
  {
    date: "2025-01-01 00:00:00 UTC",
    amount: "1304.158494",
    winnerAddress: "VDEVK22RGTKEE4EVKRTWVBPBPBB3IOFGO25RQCKDZCLZMRBKFBNNECRDLI",
    txid: "-",
  },
  {
    date: "2024-12-25 00:00:00 UTC",
    amount: "52.276572",
    winnerAddress: "VDEVK22RGTKEE4EVKRTWVBPBPBB3IOFGO25RQCKDZCLZMRBKFBNNECRDLI",
    txid: "-",
  },
  {
    date: "2024-12-18 00:00:00 UTC",
    amount: "439.7559921",
    winnerAddress: "MUTS5EI5IYSNNM2QDLNPBJ2NNRSRRMUC4S6OTCXM3JZMHUAJOSJT6YUKRA",
    txid: "-",
  },
  {
    date: "2024-12-11 00:00:00 UTC",
    amount: "315.2908013",
    winnerAddress: "POPOO6QSUX2UTF4XCRY7WHHLSQTRDRTYIE7YW2DQ2KPGLQRAA7ZTCGLET4",
    txid: "-",
  },
  {
    date: "2024-12-04 00:00:00 UTC",
    amount: "262.4207139",
    winnerAddress: "VDEVK22RGTKEE4EVKRTWVBPBPBB3IOFGO25RQCKDZCLZMRBKFBNNECRDLI",
    txid: "-",
  },
  {
    date: "2024-11-27 00:00:00 UTC",
    amount: "241.831476",
    winnerAddress: "MUTS5EI5IYSNNM2QDLNPBJ2NNRSRRMUC4S6OTCXM3JZMHUAJOSJT6YUKRA",
    txid: "-",
  },
];

// Add this styled component with other styled components
const DrawHistorySection = styled(Box)<{ $isDarkTheme: boolean }>`
  margin: 32px 0;
  padding: 24px;
  background-color: ${(props) =>
    props.$isDarkTheme ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.1)"};
  border-radius: 16px;
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
`;

const DrawTable = styled(Box)`
  overflow-x: auto;

  table {
    ${tableStyles}
    min-width: 600px;

    // Additional specific styles for DrawTable...
  }
`;

// Add this new styled component with other styled components
const ExpandableDescription = styled(Box)<{ $isDarkTheme: boolean }>`
  position: relative;

  .description-text {
    transition: max-height 0.3s ease-out;
    overflow: hidden;
  }

  .show-more-button {
    color: ${(props) => (props.$isDarkTheme ? "#90caf9" : "#1976d2")};
    cursor: pointer;
    margin-top: 8px;
    font-size: 0.875rem;

    &:hover {
      text-decoration: underline;
    }
  }
`;

// Add new styled component for clickable rows
const ClickableTableRow = styled.tr<{ $isDarkTheme: boolean }>`
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"};
  }
`;

// Add new modal styled components
const ContractModal = styled(Modal)`
  display: flex;
  align-items: center;
  justify-content: center;
`;

// Update the ModalContent styled component to add cursor pointer
const ModalContent = styled(Box)<{ $isDarkTheme: boolean }>`
  background-color: ${(props) =>
    props.$isDarkTheme ? "rgba(0, 0, 0, 0.9)" : "rgba(255, 255, 255, 0.9)"};
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  border-radius: 16px;
  padding: 32px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};

  .select-button {
    margin-top: 24px;
    width: 100%;
    cursor: pointer;
  }

  .tokenomics-chart {
    margin-top: 24px;
    height: 250px; // Reduced height to make room for legend
  }

  .tokenomics-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 24px;
    justify-content: center;
    padding: 16px;
    background-color: ${(props) =>
      props.$isDarkTheme ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.1)"};
    border-radius: 8px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
    padding: 4px 8px;
    border-radius: 4px;
    background-color: ${(props) =>
      props.$isDarkTheme ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.2)"};
  }

  .color-box {
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }

  .legend-label {
    color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)"};
  }

  .legend-value {
    color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)"};
    margin-left: 4px;
  }

  .url-link {
    color: ${(props) => (props.$isDarkTheme ? "#90caf9" : "#1976d2")};
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;

    &:hover {
      text-decoration: underline;
    }
  }

  .close-button {
    position: absolute;
    top: 16px;
    right: 16px;
    color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)"};
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: background-color 0.2s;

    &:hover {
      background-color: ${(props) =>
        props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
    }
  }

  .tokenomics-note {
    margin-top: 16px;
    padding: 12px;
    border-radius: 8px;
    background-color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"};
    font-size: 0.875rem;
    color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)"};
    font-style: italic;
  }
`;

// Add this styled component with other styled components
const RewardBadge = styled.span<{ $isDarkTheme: boolean; $variant?: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  margin-left: 8px;
  background-color: ${(props) =>
    props.$variant === "ecosystem"
      ? props.$isDarkTheme
        ? "rgba(156, 39, 176, 0.2)"
        : "rgba(156, 39, 176, 0.1)"
      : props.$isDarkTheme
      ? "rgba(33, 150, 243, 0.2)"
      : "rgba(33, 150, 243, 0.1)"};
  color: ${(props) =>
    props.$variant === "ecosystem"
      ? props.$isDarkTheme
        ? "#ce93d8"
        : "#9c27b0"
      : props.$isDarkTheme
      ? "#90caf9"
      : "#1976d2"};
  border: 1px solid
    ${(props) =>
      props.$variant === "ecosystem"
        ? props.$isDarkTheme
          ? "rgba(156, 39, 176, 0.3)"
          : "rgba(156, 39, 176, 0.2)"
        : props.$isDarkTheme
        ? "rgba(33, 150, 243, 0.3)"
        : "rgba(33, 150, 243, 0.2)"};
`;

// Add this styled component with other styled components
const ContractSelect = styled(TextField)<{ $isDarkTheme: boolean }>`
  & .MuiOutlinedInput-root {
    background-color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"};
    border-radius: 8px;

    & fieldset {
      border-color: ${(props) =>
        props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
    }

    &:hover fieldset {
      border-color: ${(props) =>
        props.$isDarkTheme ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)"};
    }

    &.Mui-focused fieldset {
      border-color: ${(props) => (props.$isDarkTheme ? "#90caf9" : "#1976d2")};
    }
  }

  & .MuiInputLabel-root {
    color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)"};

    &.Mui-focused {
      color: ${(props) => (props.$isDarkTheme ? "#90caf9" : "#1976d2")};
    }
  }

  & .MuiSelect-select {
    color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};
  }

  & .MuiSvgIcon-root {
    color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)"};
  }
`;

// Add these styled components with other styled components
const ContractStats = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 16px;
  flex-wrap: wrap;
`;

const StatBox = styled.div<{ $isDarkTheme: boolean }>`
  flex: 1;
  min-width: 120px;
  padding: 12px;
  border-radius: 8px;
  background-color: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"};
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};

  .stat-value {
    font-size: 1.125rem;
    font-weight: 600;
    color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 0.75rem;
    color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)"};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

// Update the TokenomicsPieChart component
const TokenomicsPieChart: React.FC<{
  tokenomics: Record<string, number>;
  isDarkTheme: boolean;
  size?: number;
  compact?: boolean;
}> = ({ tokenomics, isDarkTheme, size = 32, compact = false }) => {
  const data = prepareTokenomicsData(tokenomics);

  // If there's only one segment and it's "other", use a specific color instead of grey
  if (data.length === 1 && data[0].name === "Other") {
    data[0].color = isDarkTheme ? "#90caf9" : "#1976d2"; // Use theme primary color
  }

  const centerPoint = compact ? 16 : 16;
  const radius = compact ? 14 : 14;

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      style={{ minWidth: size, minHeight: size }}
    >
      <circle
        cx={centerPoint}
        cy={centerPoint}
        r={radius}
        fill={isDarkTheme ? "#333" : "#eee"}
      />
      {(() => {
        let startAngle = 0;
        return data.map((segment, i) => {
          const percentage = segment.value / 100;
          const endAngle = startAngle + percentage * 2 * Math.PI;

          const x1 = centerPoint + radius * Math.cos(startAngle);
          const y1 = centerPoint + radius * Math.sin(startAngle);
          const x2 = centerPoint + radius * Math.cos(endAngle);
          const y2 = centerPoint + radius * Math.sin(endAngle);

          const largeArcFlag = percentage > 0.5 ? 1 : 0;

          const pathData = [
            `M ${centerPoint} ${centerPoint}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            `Z`,
          ].join(" ");

          const path = (
            <path
              key={i}
              d={pathData}
              fill={segment.color}
              stroke={isDarkTheme ? "#1a1a1a" : "#fff"}
              strokeWidth="0.5"
            />
          );

          startAngle = endAngle;
          return path;
        });
      })()}
    </svg>
  );
};

const CommunityChest: React.FC<CommunityChestProps> = ({
  isDarkTheme,
  connected,
  address,
}) => {
  const { activeAccount, signTransactions } = useWallet();
  const { balance, refetch: refetchBalance } = useAccountBalance(address);

  const [searchParams, setSearchParams] = useSearchParams();
  const contractParam = searchParams?.get("contract") || 390001;

  // Update state initialization to use URL parameter if available
  const [selectedContract, setSelectedContract] = useState<number>(
    CONTRACT_OPTIONS.some((opt) => opt.id === Number(contractParam))
      ? Number(contractParam)
      : 664258
  );

  const [manager, setManager] = useState<string>("");
  useEffect(() => {
    if (!selectedContract) return;
    if (!activeAccount) return;
    const { algodClient } = getAlgorandClients();
    const ci = new CONTRACT(
      selectedContract,
      algodClient,
      undefined,
      {
        name: "WrappedVOI",
        desc: "Wrapped VOI",
        methods: [
          {
            name: "manager",
            args: [],
            returns: {
              type: "address",
            },
          },
        ],
        events: [],
      },
      {
        addr: activeAccount.address,
        sk: Uint8Array.from([]),
      }
    );
    ci.manager().then((managerR: any) => {
      if (!managerR.success) {
        throw new Error("Failed to get manager");
      }
      const manager = managerR.returnValue;
      setManager(manager);
    });
  }, [selectedContract, activeAccount]);

  console.log({ manager });

  // Update the contract selection handler to modify URL
  const handleContractChange = (newContract: number) => {
    setSelectedContract(newContract);
    setSearchParams({ contract: newContract.toString() });
  };

  // Add this state near other state declarations
  const [expandedDescription, setExpandedDescription] = useState(false);

  // Update the contract description rendering in your JSX
  const renderContractDescription = (description: string) => {
    const isLongDescription = description.length > 200;

    return (
      <ExpandableDescription $isDarkTheme={isDarkTheme}>
        <div
          className="description-text"
          style={{ maxHeight: expandedDescription ? "none" : "80px" }}
        >
          {description}
        </div>
        {isLongDescription && (
          <div
            className="show-more-button"
            onClick={() => setExpandedDescription(!expandedDescription)}
          >
            {expandedDescription ? "Show Less" : "Show More"}
          </div>
        )}
      </ExpandableDescription>
    );
  };

  const [totalInChest, setTotalInChest] = useState<string>("0");
  const [holders, setHolders] = useState<number>(0);
  const [userBalance, setUserBalance] = useState<string>("0");
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [holdersList, setHoldersList] = useState<any[]>([]);
  const [showRankings, setShowRankings] = useState(false);
  const [epochSummaries, setEpochSummaries] = useState<EpochSummary[]>([]);
  const [currentEpochTokens, setCurrentEpochTokens] = useState<string>("0");
  const [showRewardDistribution, setShowRewardDistribution] = useState(false);
  const [timeUntilNextEpoch, setTimeUntilNextEpoch] = useState<string>("");
  const [nftAssets, setNftAssets] = useState<
    (NFTAsset & { parsedMetadata: NFTMetadata })[]
  >([]);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [userTokenBalances, setUserTokenBalances] = useState<any[]>([]);
  // Update fromToken default to 0 (VOI)
  const [fromToken, setFromToken] = useState<number>(0);
  const [toToken, setToToken] = useState<number>(CONTRACT_OPTIONS[0].id);
  const [swapAmount, setSwapAmount] = useState<string>("");

  interface TokenStats {
    contractId: number;
    account_count: number;
    adjusted_total_balance: string; // Changed from number to string
  }

  interface StatsResponse {
    "current-round": number;
    tokens: TokenStats[];
  }

  // Add this state near other state declarations
  const [statsResponse, setStatsResponse] = useState<StatsResponse | null>(
    null
  );

  // Add new state for modal
  const [selectedContractDetails, setSelectedContractDetails] =
    useState<ContractOption | null>(null);

  // Add handler for row click
  const handleContractRowClick = (contract: ContractOption) => {
    setSelectedContractDetails(contract);
  };

  // Add handler for modal close
  const handleModalClose = () => {
    setSelectedContractDetails(null);
  };

  useEffect(() => {
    if (connected) {
      fetchData();
    }
  }, [connected, address, selectedContract]);

  // Update the fetchData function to store the response
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch contract stats
      const statsResponse = await axios.get<StatsResponse>(
        "https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/stats/wvoi"
      );

      setStatsResponse(statsResponse.data); // Store the entire response

      const contractStats = statsResponse.data.tokens.find(
        (token) => token.contractId === selectedContract
      );

      if (contractStats) {
        setTotalInChest(contractStats.adjusted_total_balance);
        setHolders(contractStats.account_count);
      }

      const { algodClient } = getAlgorandClients();

      // Fetch holders data for rankings
      const response = await axios.get(
        `${MIMIR_API}/arc200/balances?contractId=${selectedContract}`
      );
      const filteredHolders =
        response?.data?.balances?.filter(
          (balance: any) =>
            balance.accountId !==
              algosdk.getApplicationAddress(selectedContract) &&
            balance.balance !== "0"
        ) || [];
      setHoldersList(filteredHolders);

      // Fetch epoch summary
      const epochResponse = await axios.get<ApiResponse>(
        `https://api.voirewards.com/proposers/index_main_3.php?action=epoch-summary&wallet=${algosdk.getApplicationAddress(
          selectedContract
        )}`
      );

      // Sort snapshots by start date in descending order (newest first)
      const sortedEpochs = epochResponse.data.snapshots.sort(
        (a, b) =>
          new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      );

      setEpochSummaries(sortedEpochs);

      // Get user balance if connected
      if (connected && address) {
        const ci = new CONTRACT(
          selectedContract,
          algodClient,
          null,
          abi.nt200,
          {
            addr: address,
            sk: Uint8Array.from([]),
          }
        );
        const arc200_balanceOf =
          (await ci.arc200_balanceOf(address))?.returnValue || BigInt(0);
        const userBalance = arc200_balanceOf.toString();
        setUserBalance(userBalance);
      }

      // Add token calculations
      if (sortedEpochs.length > 0) {
        const weeksSinceLaunch = Math.ceil(
          (new Date().getTime() - new Date("2024-10-30").getTime()) /
            (1000 * 60 * 60 * 24 * 7)
        );
        const current = await getTokensByEpoch(weeksSinceLaunch);
        setCurrentEpochTokens(current.toString());
      }

      // Fetch user token balances if connected
      if (connected && address) {
        const balancesResponse = await axios.get(
          `${MIMIR_API}/arc200/balances?accountId=${address}`
        );

        const relevantTokens = [
          664258, 390001, 770561, 828295, 888305, 913147, 917261, 8324600,
          8372092, 8471125, 39949746, 40077073, 40227315, 40263820,
        ];
        const filteredBalances = balancesResponse.data.balances.filter(
          (balance: any) =>
            relevantTokens.includes(balance.contractId) &&
            balance.balance !== "0" // Filter out zero balances
        );

        setUserTokenBalances(filteredBalances);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  }, [selectedContract, connected, address]);

  const handleDeposit = async () => {
    if (!connected) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      setIsLoading(true);

      const { algodClient } = getAlgorandClients();
      const ciC = new CONTRACT(
        selectedContract,
        algodClient,
        null,
        abi.custom,
        {
          addr:
            address ||
            "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
          sk: Uint8Array.from([]),
        }
      );
      const ci = new CONTRACT(
        selectedContract,
        algodClient,
        null,
        abi.nt200,
        {
          addr:
            address ||
            "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
          sk: Uint8Array.from([]),
        },
        true,
        false,
        true
      );
      const amountBI = BigInt(
        new BigNumber(depositAmount).multipliedBy(10 ** 6).toFixed(0)
      );
      let customR;
      for (const p0 of [0, 1]) {
        const buildN = [];
        if (p0 > 0) {
          const txnO = (await ci.createBalanceBox(address)).obj;
          buildN.push({
            ...txnO,
            payment: 28500,
            note: new Uint8Array(Buffer.from("createBalanceBox")),
          });
        }
        {
          const txn0 = (await ci.deposit(amountBI)).obj;
          buildN.push({
            ...txn0,
            payment: amountBI,
            note: new Uint8Array(Buffer.from("Deposit")),
          });
        }
        ciC.setEnableGroupResourceSharing(true);
        ciC.setExtraTxns(buildN);
        customR = await ciC.custom();
        if (customR.success) {
          break;
        }
      }
      if (!customR?.success) {
        console.log({ customR });
        toast.error("Failed to deposit");
        return;
      }
      const stxns = await signTransactions(
        customR.txns.map(
          (t: string) => new Uint8Array(Buffer.from(t, "base64"))
        )
      );
      const [stxn] = stxns;
      const dstxn = algosdk.decodeSignedTransaction(stxn as Uint8Array);
      const txId = dstxn.txn.txID();
      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();
      await algosdk.waitForConfirmation(algodClient, txId, 4);
      party.confetti(document.body, {
        count: party.variation.range(200, 300),
        size: party.variation.range(1, 1.4),
      });
      toast.success("Deposit successful!");
      setDepositModalOpen(false);
      fetchData();
      refetchBalance();
    } catch (error) {
      console.error("Error depositing:", error);
      toast.error("Failed to deposit");
    } finally {
      setIsLoading(false);
      setDepositAmount("");
    }
  };

  const handleWithdraw = async () => {
    if (!connected) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      setIsLoading(true);
      const { algodClient } = getAlgorandClients();
      const ci = new CONTRACT(selectedContract, algodClient, null, abi.nt200, {
        addr:
          address ||
          "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
        sk: Uint8Array.from([]),
      });
      const amountBI = BigInt(
        new BigNumber(withdrawAmount).multipliedBy(10 ** 6).toFixed(0)
      );
      ci.setFee(2000);
      const withdrawR = await ci.withdraw(amountBI);
      if (!withdrawR.success) {
        console.log({ customR: withdrawR });
        toast.error("Failed to withdraw");
        return;
      }
      const stxns = await signTransactions(
        withdrawR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );
      const [stxn] = stxns;
      const dstxn = algosdk.decodeSignedTransaction(stxn as Uint8Array);
      const txId = dstxn.txn.txID();
      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();
      await algosdk.waitForConfirmation(algodClient, txId, 4);
      party.confetti(document.body, {
        count: party.variation.range(200, 300),
        size: party.variation.range(1, 1.4),
      });
      toast.success("Withdrawal successful!");
      setWithdrawModalOpen(false);
      fetchData();
      refetchBalance();
    } catch (error) {
      console.error("Error withdrawing:", error);
      toast.error("Failed to withdraw");
    } finally {
      setIsLoading(false);
      setWithdrawAmount("");
    }
  };

  const formatAmount = (amount: string): string => {
    return new BigNumber(amount).dividedBy(1e6).toFormat();
  };

  const calculateGlowIntensity = (amount: string): number => {
    const value = new BigNumber(amount).dividedBy(1e6).toNumber();
    // Adjust these thresholds based on your needs
    if (value < 1000) return 1;
    if (value < 10000) return 3;
    if (value < 100000) return 5;
    return 7;
  };

  const handleRollDice = () => {
    if (!connected) {
      toast.error("Please connect your wallet");
      return;
    }
    setIsRolling(true);
    setSelectedAccount(null);
    setTimeout(() => {
      const selected = weightedRandomSelect({ balances: holdersList });
      party.confetti(document.body, {
        count: party.variation.range(200, 300),
        size: party.variation.range(1, 1.4),
      });
      setIsRolling(false);
      setTimeout(() => {
        setSelectedAccount(selected);
      }, 1000);
    }, 2000); // Simulate a delay for cinematic effect
  };

  // Add a function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success("Address copied to clipboard");
      })
      .catch(() => {
        toast.error("Failed to copy address");
      });
  };

  // Add this helper function near the top with other utility functions
  const calculateAverageStake = (total: string, holders: number): string => {
    if (holders === 0) return "0";
    const totalBN = new BigNumber(total);
    return totalBN.dividedBy(holders).dividedBy(1e6).toFixed(6);
  };

  const formatTimeRemaining = (seconds: number): string => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);

    return `${days}d ${hours}h ${minutes}m`;
  };

  useEffect(() => {
    const updateCountdown = () => {
      if (epochSummaries.length > 0) {
        const endDate = new Date(epochSummaries[0].end_date);
        const now = new Date();
        const diff = Math.max(
          0,
          Math.floor((endDate.getTime() - now.getTime()) / 1000)
        );
        setTimeUntilNextEpoch(formatTimeRemaining(diff));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [epochSummaries]);

  // Inside the CommunityChest component, add this helper function
  const formatNotificationDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        const response = await axios.get(
          `${MIMIR_API}/nft-indexer/v1/tokens?owner=MTGLPLANYNVD4OMZUQDIZ62G5LRX3JCC2H33VZNYY5VDWLEYW5JRZ3W3GQ`
        );

        const nftData = response.data.tokens
          .filter((token: NFTAsset) => !token.isBurned)
          .map((token: NFTAsset) => ({
            ...token,
            parsedMetadata: JSON.parse(token.metadata),
          }));

        setNftAssets(nftData);
      } catch (error) {
        console.error("Error fetching NFTs:", error);
      }
    };

    fetchNFTs();
  }, []);

  // Update handleSwap function
  const handleSwap = async (
    address: string,
    fromToken: number,
    toToken: number,
    amount: string
  ) => {
    try {
      setIsLoading(true);
      const { algodClient } = getAlgorandClients();
      const amountBI = BigInt(
        new BigNumber(amount).multipliedBy(10 ** 6).toFixed(0)
      );

      // If swapping to VOI (contract 0), just withdraw from source contract
      if (toToken === 0) {
        const fromContract = new CONTRACT(
          fromToken,
          algodClient,
          null,
          abi.nt200,
          {
            addr: address,
            sk: new Uint8Array(),
          }
        );

        fromContract.setFee(2000);
        const withdrawR = await fromContract.withdraw(amountBI);
        if (!withdrawR.success) {
          toast.error("Failed to withdraw");
          return;
        }

        const stxns = await signTransactions(
          withdrawR.txns.map(
            (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
          )
        );

        const [stxn] = stxns;
        const dstxn = algosdk.decodeSignedTransaction(stxn as Uint8Array);
        const txId = dstxn.txn.txID();

        await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();
        await algosdk.waitForConfirmation(algodClient, txId, 4);

        // Optimistically update balances
        setUserTokenBalances((prevBalances) => {
          const updatedBalances = [...prevBalances];
          const fromTokenIndex = updatedBalances.findIndex(
            (b) => b.contractId === fromToken
          );

          if (fromTokenIndex !== -1) {
            const newBalance =
              BigInt(updatedBalances[fromTokenIndex].balance) - amountBI;
            if (newBalance <= BigInt(0)) {
              updatedBalances.splice(fromTokenIndex, 1);
            } else {
              updatedBalances[fromTokenIndex] = {
                ...updatedBalances[fromTokenIndex],
                balance: newBalance.toString(),
              };
            }
          }
          return updatedBalances;
        });
        refetchBalance();
        toast.success("Swap successful!");
        setSwapAmount("");
        if (swapModalOpen) {
          setSwapModalOpen(false);
        }
        return;
      }

      // Original swap logic for other cases
      const ci = new CONTRACT(
        fromToken || toToken,
        algodClient,
        null,
        abi.custom,
        {
          addr: address,
          sk: new Uint8Array(),
        }
      );

      const builder = {
        fromContract: new CONTRACT(
          fromToken,
          algodClient,
          null,
          abi.nt200,
          {
            addr: address,
            sk: new Uint8Array(),
          },
          true,
          false,
          true
        ),
        toContract: new CONTRACT(
          toToken,
          algodClient,
          null,
          abi.nt200,
          {
            addr: address,
            sk: new Uint8Array(),
          },
          true,
          false,
          true
        ),
      };

      // build custom contract transactions
      const buildN = [];

      // If fromToken is not 0 (VOI), include withdraw step
      if (fromToken !== 0) {
        const txnO = (await builder.fromContract.withdraw(amountBI)).obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode("Withdraw"),
        });
      }

      // create balance box for deposit if needed
      {
        const ciTo = new CONTRACT(toToken, algodClient, null, abi.nt200, {
          addr: address,
          sk: new Uint8Array(),
        });
        ciTo.setFee(2000);
        ciTo.setPaymentAmount(28500);
        const createBalanceBoxR = await ciTo.createBalanceBox(address);
        if (createBalanceBoxR.success) {
          const txnO = (await builder.toContract.createBalanceBox(address)).obj;
          buildN.push({
            ...txnO,
            payment: 28500,
            note: new Uint8Array(Buffer.from("createBalanceBox")),
          });
        }
      }

      // Always include deposit step
      const txnO = (await builder.toContract.deposit(amountBI)).obj;
      buildN.push({
        ...txnO,
        note: new TextEncoder().encode("Deposit"),
        payment: amountBI,
      });

      ci.setFee(2000);
      ci.setGroupResourceSharingStrategy("merge");
      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);

      const customR = await ci.custom();

      if (!customR.success) {
        console.log({ customR });
        toast.error("Failed to swap tokens");
        return;
      }

      // Sign and send transactions
      const stxns = await signTransactions(
        customR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );

      const [stxn] = stxns;
      const dstxn = algosdk.decodeSignedTransaction(stxn as Uint8Array);
      const txId = dstxn.txn.txID();

      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();
      await algosdk.waitForConfirmation(algodClient, txId, 4);

      // Optimistically update balances for both tokens
      setUserTokenBalances((prevBalances) => {
        const updatedBalances = [...prevBalances];

        // Update fromToken balance
        if (fromToken !== 0) {
          const fromTokenIndex = updatedBalances.findIndex(
            (b) => b.contractId === fromToken
          );
          if (fromTokenIndex !== -1) {
            const newFromBalance =
              BigInt(updatedBalances[fromTokenIndex].balance) - amountBI;
            if (newFromBalance <= BigInt(0)) {
              updatedBalances.splice(fromTokenIndex, 1);
            } else {
              updatedBalances[fromTokenIndex] = {
                ...updatedBalances[fromTokenIndex],
                balance: newFromBalance.toString(),
              };
            }
          }
        }

        // Update toToken balance
        if (toToken !== 0) {
          const toTokenIndex = updatedBalances.findIndex(
            (b) => b.contractId === toToken
          );
          if (toTokenIndex !== -1) {
            // Token already exists in balances
            updatedBalances[toTokenIndex] = {
              ...updatedBalances[toTokenIndex],
              balance: (
                BigInt(updatedBalances[toTokenIndex].balance) + amountBI
              ).toString(),
            };
          } else {
            // Add new token to balances
            const newToken = CONTRACT_OPTIONS.find((opt) => opt.id === toToken);
            if (newToken) {
              updatedBalances.push({
                contractId: toToken,
                symbol: newToken.name,
                balance: amountBI.toString(),
              });
            }
          }
        }

        return updatedBalances;
      });

      toast.success("Swap successful!");
      setSwapAmount("");
      if (swapModalOpen) {
        setSwapModalOpen(false);
      }
    } catch (error) {
      console.error("Error swapping:", error);
      toast.error("Failed to swap tokens");
    } finally {
      setIsLoading(false);
    }
  };

  // Add this interface near other interfaces
  interface DrawHistory {
    date: string;
    amount: string;
    winnerAddress: string;
    txid: string;
  }

  // Add this constant with the draw history data
  const DRAW_HISTORY: DrawHistory[] = [
    {
      date: "2025-01-28 00:00:00 UTC",
      amount: "760.7277743",
      winnerAddress:
        "5B3H47ALJ7WVF45HMVFQJ5XZGNLDE677FIPLHR2FB4J6S4MZYHDVQRGCTU",
      txid: "-",
    },
    {
      date: "2025-01-22 00:00:00 UTC",
      amount: "748.4402651",
      winnerAddress:
        "DQVAPFLH3ZOG3LJPFCDATKKTO5YXM77ENZBAEO5LPL7AO6QASBEEKDVS4I",
      txid: "-",
    },
    {
      date: "2025-01-08 00:00:00 UTC",
      amount: "1291.000657",
      winnerAddress:
        "7WO47R4XY5TIO3YP4KFK7RU6Z72YL5VPPIOM2P5NNFH6YFYLQZVVJWMJFI",
      txid: "-",
    },
    {
      date: "2025-01-01 00:00:00 UTC",
      amount: "1304.158494",
      winnerAddress:
        "VDEVK22RGTKEE4EVKRTWVBPBPBB3IOFGO25RQCKDZCLZMRBKFBNNECRDLI",
      txid: "-",
    },
    {
      date: "2024-12-25 00:00:00 UTC",
      amount: "52.276572",
      winnerAddress:
        "VDEVK22RGTKEE4EVKRTWVBPBPBB3IOFGO25RQCKDZCLZMRBKFBNNECRDLI",
      txid: "-",
    },
    {
      date: "2024-12-18 00:00:00 UTC",
      amount: "439.7559921",
      winnerAddress:
        "MUTS5EI5IYSNNM2QDLNPBJ2NNRSRRMUC4S6OTCXM3JZMHUAJOSJT6YUKRA",
      txid: "-",
    },
    {
      date: "2024-12-11 00:00:00 UTC",
      amount: "315.2908013",
      winnerAddress:
        "POPOO6QSUX2UTF4XCRY7WHHLSQTRDRTYIE7YW2DQ2KPGLQRAA7ZTCGLET4",
      txid: "-",
    },
    {
      date: "2024-12-04 00:00:00 UTC",
      amount: "262.4207139",
      winnerAddress:
        "VDEVK22RGTKEE4EVKRTWVBPBPBB3IOFGO25RQCKDZCLZMRBKFBNNECRDLI",
      txid: "-",
    },
    {
      date: "2024-11-27 00:00:00 UTC",
      amount: "241.831476",
      winnerAddress:
        "MUTS5EI5IYSNNM2QDLNPBJ2NNRSRRMUC4S6OTCXM3JZMHUAJOSJT6YUKRA",
      txid: "-",
    },
  ];

  // Add this styled component with other styled components
  const DrawHistorySection = styled(Box)<{ $isDarkTheme: boolean }>`
    margin: 32px 0;
    padding: 24px;
    background-color: ${(props) =>
      props.$isDarkTheme ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.1)"};
    border-radius: 16px;
    border: 1px solid
      ${(props) =>
        props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  `;

  const DrawTable = styled(Box)`
    overflow-x: auto;

    table {
      ${tableStyles}
      min-width: 600px;

      // Additional specific styles for DrawTable...
    }
  `;

  // Add this styled component with other styled components
  const ComparisonTable = styled(Box)`
    overflow-x: auto;
    margin-top: 24px;

    table {
      ${tableStyles}
      min-width: 800px;

      // Additional specific styles for ComparisonTable...
    }
  `;

  // Update the comparison table JSX to use clickable rows and sort by holders
  const renderComparisonTable = () => (
    <ComparisonTable>
      <table>
        <thead>
          <tr>
            <th>Distribution</th>
            <th>Contract</th>
            <th>Total Value</th>
            <th>Holders</th>
          </tr>
        </thead>
        <tbody>
          {CONTRACT_OPTIONS.filter((opt) => opt.id !== 0)
            .sort((a, b) => {
              const statsA = statsResponse?.tokens.find(
                (token) => token.contractId === a.id
              );
              const statsB = statsResponse?.tokens.find(
                (token) => token.contractId === b.id
              );
              return (
                (statsB?.account_count || 0) - (statsA?.account_count || 0)
              );
            })
            .map((contract) => {
              const stats = statsResponse?.tokens.find(
                (token) => token.contractId === contract.id
              );
              return (
                <ClickableTableRow
                  key={contract.id}
                  $isDarkTheme={isDarkTheme}
                  onClick={() => handleContractRowClick(contract)}
                >
                  <td>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "4px",
                      }}
                    >
                      {contract.tokenomics && (
                        <TokenomicsPieChart
                          tokenomics={contract.tokenomics}
                          isDarkTheme={isDarkTheme}
                          size={32}
                          compact={true}
                        />
                      )}
                    </Box>
                  </td>
                  <td>
                    {contract.name}
                    {contract.id === selectedContract && (
                      <RewardBadge $isDarkTheme={isDarkTheme}>
                        Selected
                      </RewardBadge>
                    )}
                  </td>
                  <td>
                    {stats
                      ? `${formatAmount(stats.adjusted_total_balance)} VOI`
                      : "Loading..."}
                  </td>
                  <td>{stats ? stats.account_count : "Loading..."}</td>
                </ClickableTableRow>
              );
            })}
        </tbody>
      </table>
    </ComparisonTable>
  );

  // Add modal component to render contract details
  const renderContractModal = () => {
    if (!selectedContractDetails) return null;

    const tokenomicsData = prepareTokenomicsData(
      selectedContractDetails.tokenomics
    );

    return (
      <ContractModal
        open={!!selectedContractDetails}
        onClose={handleModalClose}
        aria-labelledby="contract-modal-title"
      >
        <ModalContent $isDarkTheme={isDarkTheme}>
          <CloseIcon className="close-button" onClick={handleModalClose} />
          <Typography variant="h6" id="contract-modal-title">
            {selectedContractDetails.name}
          </Typography>
          {renderContractDescription(selectedContractDetails.description)}

          <div className="tokenomics-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tokenomicsData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                >
                  {tokenomicsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="tokenomics-legend">
            {tokenomicsData.map((entry, index) => (
              <div key={`legend-${index}`} className="legend-item">
                <div
                  className="color-box"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="legend-label">{entry.name}</span>
                <span className="legend-value">{entry.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>

          {/* Add tokenomics note if it exists */}
          {selectedContractDetails.tokenomicsNote && (
            <div className="tokenomics-note">
              {selectedContractDetails.tokenomicsNote}
            </div>
          )}

          {/* Add this condition to render the URL link */}
          {selectedContractDetails.url && (
            <Link
              href={selectedContractDetails.url}
              target="_blank"
              rel="noopener noreferrer"
              className="url-link"
            >
              Visit Project <LaunchIcon />
            </Link>
          )}

          <Button
            variant="contained"
            className="select-button"
            onClick={() => {
              handleContractChange(selectedContractDetails.id);
              handleModalClose();
            }}
          >
            Select Contract
          </Button>
        </ModalContent>
      </ContractModal>
    );
  };

  // Add this styled component with other styled components
  const CautionBox = styled(Box)<{ $isDarkTheme: boolean }>`
    padding: 16px;
    margin: 16px 0;
    border-radius: 8px;
    background-color: ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 193, 7, 0.1)"
        : "rgba(255, 193, 7, 0.05)"};
    border: 1px solid
      ${(props) =>
        props.$isDarkTheme
          ? "rgba(255, 193, 7, 0.2)"
          : "rgba(255, 193, 7, 0.1)"};
    color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 193, 7, 0.9)" : "rgba(255, 193, 7, 0.7)"};
    font-size: 0.875rem;
    line-height: 1.5;
    display: flex;
    align-items: center;
    gap: 8px;

    svg {
      color: ${(props) =>
        props.$isDarkTheme
          ? "rgba(255, 193, 7, 0.9)"
          : "rgba(255, 193, 7, 0.7)"};
    }
  `;

  // Add a new function to handle contract selection from modal
  const handleSelectContract = (contract: ContractOption) => {
    handleContractChange(contract.id);
    handleModalClose();
  };

  // Add this styled component with other styled components
  const ManagerSection = styled(Box)<{ $isDarkTheme: boolean }>`
    margin: 24px 0;
    padding: 24px;
    background-color: ${(props) =>
      props.$isDarkTheme ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.1)"};
    border-radius: 16px;
    border: 1px solid
      ${(props) =>
        props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  `;

  return (
    <>
      <HeroSection $isDarkTheme={isDarkTheme}>
        <HeroTitle $isDarkTheme={isDarkTheme}>
          Wrapped Voi Ecosystem Hub
        </HeroTitle>
        <HeroSubtitle $isDarkTheme={isDarkTheme}>
          Explore and participate in Voi's growing ecosystem of tokens and
          applications. Stake, earn rewards, support projects, and be part of
          the community-driven future.
        </HeroSubtitle>
        <StatsHighlight>
          <StatItem $isDarkTheme={isDarkTheme}>
            <div className="stat-value">6</div>
            <div className="stat-label">ACTIVE TOKENS</div>
          </StatItem>
          <StatItem $isDarkTheme={isDarkTheme}>
            <div className="stat-value">
              {formatLargeNumber(
                statsResponse?.tokens
                  ?.reduce(
                    (sum, token) => sum + BigInt(token.adjusted_total_balance),
                    BigInt(0)
                  )
                  .toString() || "0"
              )}{" "}
              VOI
            </div>
            <div className="stat-label">TOTAL VALUE LOCKED</div>
          </StatItem>
          <StatItem $isDarkTheme={isDarkTheme}>
            <div className="stat-value">
              {statsResponse?.tokens?.reduce(
                (sum, token) => sum + token.account_count,
                0
              ) || 0}
            </div>
            <div className="stat-label">TOTAL PARTICIPANTS</div>
          </StatItem>
        </StatsHighlight>
      </HeroSection>
      {/* Add this section after HeroSection */}
      {connected && address && userTokenBalances.length > 0 && (
        <UserBalancesSection $isDarkTheme={isDarkTheme}>
          <Label $isDarkTheme={isDarkTheme}>Your Token Balances</Label>
          <BalanceTable $isDarkTheme={isDarkTheme}>
            <table>
              <thead>
                <tr>
                  <th>Token</th>
                  <th style={{ textAlign: "right" }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {[...userTokenBalances]
                  .sort((a, b) => {
                    // Convert balance strings to BigInt for accurate comparison
                    const balanceA = BigInt(a.balance);
                    const balanceB = BigInt(b.balance);
                    return balanceB > balanceA
                      ? 1
                      : balanceB < balanceA
                      ? -1
                      : 0;
                  })
                  .map((balance) => (
                    <tr key={balance.contractId}>
                      <td>{balance.symbol}</td>
                      <td style={{ textAlign: "right" }}>
                        <span className="balance-value">
                          {formatAmount(balance.balance)}
                        </span>{" "}
                        <span className="token-symbol">{balance.symbol}</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </BalanceTable>

          <TotalBalance $isDarkTheme={isDarkTheme}>
            <span className="total-label">Total Balance</span>
            <span className="total-value">
              {formatAmount(
                userTokenBalances
                  .reduce(
                    (sum, balance) => sum + BigInt(balance.balance),
                    BigInt(0)
                  )
                  .toString()
              )}{" "}
              VOI
            </span>
          </TotalBalance>
        </UserBalancesSection>
      )}
      {/* Add manager section if user is manager */}
      {activeAccount?.address === manager && (
        <Container
          $isDarkTheme={isDarkTheme}
          sx={{ my: 0, borderRadius: "16px" }}
        >
          <ManagerSection $isDarkTheme={isDarkTheme}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Manage Wrapped Voi Token
              </Typography>
              <Typography variant="body2">
                Access advanced management features for wrapped Voi token
                <ul
                  style={{
                    listStyleType: "disc",
                    display: "flex",
                    gap: 16,
                    paddingLeft: 16,
                  }}
                >
                  <li>Withdraw block rewards</li>
                  <li>Update partkeys</li>
                  <li>Transfer ownership</li>
                </ul>
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              component={Link}
              href={`/#/tools/wvoi-man?appId=${selectedContract}`}
              //startIcon={<SettingsIcon />}
            >
              Manage Token
            </Button>
          </ManagerSection>
        </Container>
      )}
      {/* Token Swap Section - Moved here */}
      <Container
        $isDarkTheme={isDarkTheme}
        sx={{ borderRadius: "16px", mb: 5 }}
      >
        <Box sx={{ mt: 0 }}>
          {/*<Typography
            variant="h6"
            gutterBottom
            sx={{ color: isDarkTheme ? "#fff" : "inherit" }}
          >
            Token Swap
          </Typography>*/}

          <Card
            sx={{
              bgcolor: isDarkTheme
                ? "rgba(25, 118, 210, 0.08)"
                : "rgba(255, 255, 255, 0.1)",
              p: 3,
              borderRadius: 2,
              border: `1px solid ${
                isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
              }`,
              boxShadow: "none",
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* From Token */}
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    mb: 1,
                    color: isDarkTheme
                      ? "rgba(255, 255, 255, 0.7)"
                      : "rgba(0, 0, 0, 0.6)",
                  }}
                >
                  From
                </Typography>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <TextField
                    select
                    fullWidth
                    value={fromToken}
                    onChange={(e) => setFromToken(Number(e.target.value))}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": {
                          borderColor: isDarkTheme
                            ? "rgba(255, 255, 255, 0.23)"
                            : "rgba(0, 0, 0, 0.23)",
                        },
                        "&:hover fieldset": {
                          borderColor: isDarkTheme
                            ? "rgba(255, 255, 255, 0.4)"
                            : "rgba(0, 0, 0, 0.4)",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: isDarkTheme ? "#90caf9" : "#1976d2",
                        },
                      },
                      "& .MuiSelect-select": {
                        color: isDarkTheme ? "#fff" : "inherit",
                      },
                    }}
                    SelectProps={{
                      MenuProps: {
                        PaperProps: {
                          sx: {
                            bgcolor: isDarkTheme ? "#1a1a1a" : "#fff",
                            color: isDarkTheme ? "#fff" : "inherit",
                          },
                        },
                      },
                    }}
                  >
                    {CONTRACT_OPTIONS.filter(
                      (option) =>
                        option.id === 0 || // Always include VOI
                        userTokenBalances.some(
                          (balance) =>
                            balance.contractId === option.id &&
                            BigInt(balance.balance) > BigInt(0)
                        )
                    ).map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Box sx={{ position: "relative", width: "40%" }}>
                    <TextField
                      type="number"
                      label="Amount"
                      value={swapAmount}
                      onChange={(e) => setSwapAmount(e.target.value)}
                      fullWidth
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": {
                            borderColor: isDarkTheme
                              ? "rgba(255, 255, 255, 0.23)"
                              : "rgba(0, 0, 0, 0.23)",
                          },
                          "&:hover fieldset": {
                            borderColor: isDarkTheme
                              ? "rgba(255, 255, 255, 0.4)"
                              : "rgba(0, 0, 0, 0.4)",
                          },
                          "&.Mui-focused fieldset": {
                            borderColor: isDarkTheme ? "#90caf9" : "#1976d2",
                          },
                        },
                        "& .MuiInputLabel-root": {
                          color: isDarkTheme
                            ? "rgba(255, 255, 255, 0.7)"
                            : "rgba(0, 0, 0, 0.6)",
                        },
                        "& input": {
                          color: isDarkTheme ? "#fff" : "inherit",
                        },
                      }}
                    />
                    <Button
                      size="small"
                      sx={{
                        position: "absolute",
                        right: "8px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        minWidth: "auto",
                        color: isDarkTheme ? "#90caf9" : "#1976d2",
                        "&:hover": {
                          backgroundColor: isDarkTheme
                            ? "rgba(144, 202, 249, 0.08)"
                            : "rgba(25, 118, 210, 0.08)",
                        },
                      }}
                      onClick={() => {
                        if (fromToken === 0) {
                          setSwapAmount(
                            (
                              Number(balance?.toString() || "0") / 1e6
                            ).toString()
                          );
                        } else {
                          // Find balance for selected fromToken
                          const balance =
                            fromToken === 0
                              ? activeAccount?.amount || "0"
                              : userTokenBalances.find(
                                  (b) => b.contractId === fromToken
                                )?.balance || "0";

                          // Convert to display format (divide by 1e6)
                          const maxAmount = new BigNumber(balance)
                            .dividedBy(1e6)
                            .toString();
                          setSwapAmount(maxAmount);
                        }
                      }}
                    >
                      MAX
                    </Button>
                  </Box>
                </Box>
              </Box>

              {/* Swap Icon */}
              <Box sx={{ display: "flex", justifyContent: "center", my: 1 }}>
                <IconButton
                  onClick={() => {
                    setFromToken(toToken);
                    setToToken(fromToken);
                  }}
                  sx={{
                    color: isDarkTheme ? "#90caf9" : "#1976d2",
                    "&:hover": {
                      bgcolor: isDarkTheme
                        ? "rgba(144, 202, 249, 0.08)"
                        : "rgba(25, 118, 210, 0.08)",
                    },
                  }}
                >
                  <SwapVertIcon />
                </IconButton>
              </Box>

              {/* To Token */}
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    mb: 1,
                    color: isDarkTheme
                      ? "rgba(255, 255, 255, 0.7)"
                      : "rgba(0, 0, 0, 0.6)",
                  }}
                >
                  To
                </Typography>
                <TextField
                  select
                  fullWidth
                  value={toToken}
                  onChange={(e) => setToToken(Number(e.target.value))}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: isDarkTheme
                          ? "rgba(255, 255, 255, 0.23)"
                          : "rgba(0, 0, 0, 0.23)",
                      },
                      "&:hover fieldset": {
                        borderColor: isDarkTheme
                          ? "rgba(255, 255, 255, 0.4)"
                          : "rgba(0, 0, 0, 0.4)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: isDarkTheme ? "#90caf9" : "#1976d2",
                      },
                    },
                    "& .MuiSelect-select": {
                      color: isDarkTheme ? "#fff" : "inherit",
                    },
                  }}
                  SelectProps={{
                    MenuProps: {
                      PaperProps: {
                        sx: {
                          bgcolor: isDarkTheme ? "#1a1a1a" : "#fff",
                          color: isDarkTheme ? "#fff" : "inherit",
                        },
                      },
                    },
                  }}
                >
                  {CONTRACT_OPTIONS.filter(
                    (option) => option.id !== fromToken
                  ).map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              {/* Swap Button */}
              {activeAccount?.address ? (
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() =>
                    handleSwap(
                      activeAccount.address,
                      fromToken,
                      toToken,
                      swapAmount
                    )
                  }
                  disabled={
                    !connected ||
                    isLoading ||
                    !swapAmount ||
                    fromToken === toToken
                  }
                  sx={{
                    mt: 2,
                    bgcolor: isDarkTheme ? "#1976d2" : undefined,
                    "&:hover": {
                      bgcolor: isDarkTheme ? "#1565c0" : undefined,
                    },
                  }}
                >
                  {isLoading ? <CircularProgress size={24} /> : "Swap"}
                </Button>
              ) : (
                <Button fullWidth variant="contained" disabled>
                  Connect Wallet
                </Button>
              )}

              {/* Add warning about fees/slippage if needed */}
              <Typography
                variant="caption"
                sx={{
                  mt: 1,
                  color: isDarkTheme
                    ? "rgba(255, 255, 255, 0.5)"
                    : "rgba(0, 0, 0, 0.5)",
                }}
              >
                Note: Swapping requires two transactions (withdraw + deposit).
                Standard network fees apply.
              </Typography>
            </Box>
          </Card>
        </Box>
      </Container>
      <Container
        $isDarkTheme={isDarkTheme}
        sx={{ borderRadius: "16px", mb: 5, pt: 3 }}
      >
        <Typography variant="h6" gutterBottom>
          Token Comparison
        </Typography>
        {renderComparisonTable()}
      </Container>
      {/* Add new deposit/withdraw section */}
      {selectedContract !== 0 && (
        <Container
          $isDarkTheme={isDarkTheme}
          sx={{ borderRadius: "16px", mb: 5 }}
        >
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 3 }}>
            {/* Deposit Card */}
            <Box sx={{ flex: 1, minWidth: "250px" }}>
              <Card
                sx={{
                  bgcolor: isDarkTheme
                    ? "rgba(25, 118, 210, 0.08)"
                    : "rgba(255, 255, 255, 0.1)",
                  p: 2,
                  borderRadius: 2,
                  border: `1px solid ${
                    isDarkTheme
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.1)"
                  }`,
                  boxShadow: "none",
                }}
              >
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ color: isDarkTheme ? "#fff" : "inherit" }}
                >
                  Deposit VOI to{" "}
                  <Typography variant="body2" sx={{ display: "inline" }}>
                    {CONTRACT_OPTIONS.find((opt) => opt.id === selectedContract)
                      ?.name || "VOI"}
                  </Typography>
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  label="Amount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  sx={{
                    mb: 2,
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: isDarkTheme
                          ? "rgba(255, 255, 255, 0.23)"
                          : "rgba(0, 0, 0, 0.23)",
                      },
                      "&:hover fieldset": {
                        borderColor: isDarkTheme
                          ? "rgba(255, 255, 255, 0.4)"
                          : "rgba(0, 0, 0, 0.4)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: isDarkTheme ? "#90caf9" : "#1976d2",
                      },
                    },
                    "& .MuiInputLabel-root": {
                      color: isDarkTheme
                        ? "rgba(255, 255, 255, 0.7)"
                        : "rgba(0, 0, 0, 0.6)",
                      "&.Mui-focused": {
                        color: isDarkTheme ? "#90caf9" : "#1976d2",
                      },
                    },
                    "& input": {
                      color: isDarkTheme ? "#fff" : "inherit",
                    },
                  }}
                />
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleDeposit}
                  disabled={!connected || isLoading || !depositAmount}
                  sx={{
                    bgcolor: isDarkTheme ? "#1976d2" : undefined,
                    "&:hover": {
                      bgcolor: isDarkTheme ? "#1565c0" : undefined,
                    },
                  }}
                >
                  {isLoading ? <CircularProgress size={24} /> : "Deposit"}
                </Button>
              </Card>
            </Box>

            {/* Withdraw Card */}
            <Box sx={{ flex: 1, minWidth: "250px" }}>
              <Card
                sx={{
                  bgcolor: isDarkTheme
                    ? "rgba(25, 118, 210, 0.08)"
                    : "rgba(255, 255, 255, 0.1)",
                  p: 2,
                  borderRadius: 2,
                  border: `1px solid ${
                    isDarkTheme
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.1)"
                  }`,
                  boxShadow: "none",
                }}
              >
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ color: isDarkTheme ? "#fff" : "inherit" }}
                >
                  Withdraw{" "}
                  <Typography variant="body2" sx={{ display: "inline" }}>
                    {CONTRACT_OPTIONS.find((opt) => opt.id === selectedContract)
                      ?.name || "VOI"}
                    → VOI
                  </Typography>
                </Typography>

                <TextField
                  fullWidth
                  type="number"
                  label="Amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  sx={{
                    mb: 2,
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: isDarkTheme
                          ? "rgba(255, 255, 255, 0.23)"
                          : "rgba(0, 0, 0, 0.23)",
                      },
                      "&:hover fieldset": {
                        borderColor: isDarkTheme
                          ? "rgba(255, 255, 255, 0.4)"
                          : "rgba(0, 0, 0, 0.4)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: isDarkTheme ? "#90caf9" : "#1976d2",
                      },
                    },
                    "& .MuiInputLabel-root": {
                      color: isDarkTheme
                        ? "rgba(255, 255, 255, 0.7)"
                        : "rgba(0, 0, 0, 0.6)",
                      "&.Mui-focused": {
                        color: isDarkTheme ? "#90caf9" : "#1976d2",
                      },
                    },
                    "& input": {
                      color: isDarkTheme ? "#fff" : "inherit",
                    },
                  }}
                />
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleWithdraw}
                  disabled={!connected || isLoading || !withdrawAmount}
                  sx={{
                    bgcolor: isDarkTheme ? "#1976d2" : undefined,
                    "&:hover": {
                      bgcolor: isDarkTheme ? "#1565c0" : undefined,
                    },
                  }}
                >
                  {isLoading ? <CircularProgress size={24} /> : "Withdraw"}
                </Button>
              </Card>
            </Box>
          </Box>

          {/* Balance Display */}
          {connected && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: isDarkTheme
                  ? "rgba(25, 118, 210, 0.08)"
                  : "rgba(255, 255, 255, 0.1)",
                border: `1px solid ${
                  isDarkTheme
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)"
                }`,
                color: isDarkTheme ? "#fff" : "inherit",
              }}
            >
              <Typography variant="body1">
                Your Balance: {formatAmount(userBalance)} VOI
              </Typography>
            </Box>
          )}
        </Container>
      )}
      <Container
        $isDarkTheme={isDarkTheme}
        sx={{ borderRadius: "16px", mb: 5 }}
      >
        <ContractSelect
          sx={{
            mt: 3,
          }}
          select
          label="Select Contract"
          value={selectedContract}
          onChange={(e) => {
            handleContractChange(Number(e.target.value));
          }}
          $isDarkTheme={isDarkTheme}
          fullWidth
          SelectProps={{
            MenuProps: {
              PaperProps: {
                sx: {
                  bgcolor: isDarkTheme ? "#1a1a1a" : "#fff",
                  color: isDarkTheme ? "#fff" : "#000",
                  maxHeight: {
                    xs: "70vh", // Smaller height on mobile
                    sm: "80vh", // Larger height on tablet/desktop
                  },
                  "& .MuiMenuItem-root": {
                    "&:hover": {
                      bgcolor: isDarkTheme
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(0, 0, 0, 0.1)",
                    },
                  },
                },
              },
            },
          }}
        >
          {CONTRACT_OPTIONS.sort((a, b) => a.id - b.id).map((option) => {
            const contractStats = statsResponse?.tokens?.find(
              (token) => token.contractId === option.id
            );

            return (
              <MenuItem key={option.id} value={option.id}>
                <Box sx={{ width: "100%" }}>
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: { xs: 0.5, sm: 1 },
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        }}
                      >
                        {option.name}
                      </Typography>
                      {option.id === 664258 && (
                        <RewardBadge $isDarkTheme={isDarkTheme}>
                          Weekly Draw & Holder Distribution
                        </RewardBadge>
                      )}
                      {option.id === 770561 && (
                        <Tooltip
                          title="Receive a 1% bonus for every 100 Voi staked."
                          arrow
                        >
                          <Link
                            href="https://fountain.voirewards.com/contribute"
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ textDecoration: "none" }}
                          >
                            <RewardBadge $isDarkTheme={isDarkTheme}>
                              Contributor Bonus
                            </RewardBadge>
                          </Link>
                        </Tooltip>
                      )}
                      {(option.id === 828295 || option.id === 888305) && (
                        <RewardBadge
                          $isDarkTheme={isDarkTheme}
                          $variant="ecosystem"
                        >
                          Ecosystem
                        </RewardBadge>
                      )}
                      {option.id === 390001 && (
                        <RewardBadge $isDarkTheme={isDarkTheme}>
                          LP Incentives
                        </RewardBadge>
                      )}
                      {option.id === 913147 && (
                        <RewardBadge $isDarkTheme={isDarkTheme}>
                          Weekly NFT Prize
                        </RewardBadge>
                      )}
                      {option.id === 917261 && (
                        <RewardBadge $isDarkTheme={isDarkTheme}>
                          Arb Voi
                        </RewardBadge>
                      )}
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: isDarkTheme
                          ? "rgba(255, 255, 255, 0.7)"
                          : "rgba(0, 0, 0, 0.7)",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        mt: { xs: 0.5, sm: 1 },
                      }}
                    >
                      {option.description}
                    </Typography>

                    <ContractStats>
                      <StatBox $isDarkTheme={isDarkTheme}>
                        <div className="stat-value">
                          {formatLargeNumber(
                            contractStats?.adjusted_total_balance || "0"
                          )}{" "}
                          VOI
                        </div>
                        <div className="stat-label">TVL</div>
                      </StatBox>
                      <StatBox $isDarkTheme={isDarkTheme}>
                        <div className="stat-value">
                          {contractStats?.account_count || 0}
                        </div>
                        <div className="stat-label">HOLDERS</div>
                      </StatBox>
                      <StatBox $isDarkTheme={isDarkTheme}>
                        <div className="stat-value">
                          {calculateAverageStake(
                            contractStats?.adjusted_total_balance || "0",
                            contractStats?.account_count || 0
                          )}
                        </div>
                        <div className="stat-label">AVG STAKE</div>
                      </StatBox>
                    </ContractStats>
                  </Box>
                </Box>
              </MenuItem>
            );
          })}
        </ContractSelect>
        <HeaderContainer sx={{ mt: { xs: 4, md: 6 } }}>
          <ChestIcon
            viewBox="0 0 24 24"
            $intensity={calculateGlowIntensity(totalInChest)}
          >
            <path
              fill={isDarkTheme ? "#ffd700" : "#ffa000"}
              d={getContractInfo(selectedContract).iconPath}
            />
          </ChestIcon>
          <Typography
            variant="h4"
            sx={{
              textAlign: "center",
              color: isDarkTheme ? "#fff" : "#000",
            }}
          >
            {getContractInfo(selectedContract).title}
          </Typography>
        </HeaderContainer>

        <StorySection $isDarkTheme={isDarkTheme}>
          {renderContractDescription(
            getContractDescription(selectedContract, isDarkTheme) as string
          )}
          {selectedContract === 664258 && (
            <Link
              component="span"
              className="how-it-works-link"
              onClick={() => setHowItWorksOpen(true)}
            >
              Learn how it works →
            </Link>
          )}
          {selectedContract === 770561 && (
            <Link
              href="https://faucet.voirewards.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="how-it-works-link"
            >
              Visit Voi Fountain →
            </Link>
          )}
        </StorySection>

        {/* Add the notification section here */}
        <NotificationSection $isDarkTheme={isDarkTheme}>
          <Label $isDarkTheme={isDarkTheme} style={{ marginBottom: "16px" }}>
            Notifications
          </Label>
          {notifications
            .filter(
              (notification) => notification.contractId === selectedContract
            )
            .slice(0, 3)
            .map((notification, index) => (
              <NotificationItem
                key={index}
                $isDarkTheme={isDarkTheme}
                $type={notification.type}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: isDarkTheme
                        ? "rgba(255, 255, 255, 0.9)"
                        : "rgba(0, 0, 0, 0.9)",
                      fontWeight: 500,
                    }}
                  >
                    {notification.message}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: isDarkTheme
                        ? "rgba(255, 255, 255, 0.6)"
                        : "rgba(0, 0, 0, 0.6)",
                      ml: 2,
                    }}
                  >
                    {formatNotificationDate(notification.date)}
                  </Typography>
                </Box>
              </NotificationItem>
            ))}
        </NotificationSection>

        {![664258, 770561, 913147].includes(selectedContract) && (
          <>
            <CautionBox $isDarkTheme={isDarkTheme}>
              <InfoIcon sx={{ color: "warning.main" }} />
              <Typography
                variant="body2"
                sx={{ color: isDarkTheme ? "warning.light" : "warning.dark" }}
              >
                You are currently viewing{" "}
                {
                  CONTRACT_OPTIONS.find((opt) => opt.id === selectedContract)
                    ?.name
                }{" "}
                statistics. Only CCV and NFV (Community Chest Voi and NFT VOI)
                holders are eligible for weekly rewards and participation in the
                Community Chest. Program offerings vary by contract.
              </Typography>
            </CautionBox>

            <Typography
              variant="body2"
              sx={{
                mt: 2,
                mb: 3,
                px: 2,
                color: isDarkTheme
                  ? "rgba(255, 255, 255, 0.7)"
                  : "rgba(0, 0, 0, 0.7)",
                fontStyle: "italic",
              }}
            >
              {(() => {
                switch (selectedContract) {
                  case 390001:
                    return (
                      <>
                        Wrapped VOI (wVOI) is a wrapped version of the native
                        VOI token, enabling easier integration with DeFi
                        protocols and smart contracts while maintaining 1:1
                        parity with VOI. There are no incentives to hold wVOI.
                        However, community members may support the project by
                        holding wVOI.{" "}
                        <Link
                          href="https://voi.humble.sh/"
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
                          Provide liquidity on Humble Swap →
                        </Link>
                      </>
                    );
                  case 770561:
                    return "Fountain VOI (FV) is a wrapped VOI token that represents staked VOI in the Voi Fountain, allowing users to support the project by holding Fountain VOI and earn extra rewards provided by the Fountain.";
                  case 828295:
                    return "En VOI (EV) is a wrapped VOI token that represents staked VOI in the enVoi Naming Service. Name registrations and renewals are held in En VOI. There are no incentives to hold En VOI. However, community members may support the project by holding En VOI.";
                  case 888305:
                    return "Womp VOI (WV) is a wrapped VOI token that represents staked VOI in WompCrew. There are no incentives to hold WV. However, community members may support the project by holding WV.";
                  case 8471125:
                    return "Buidl VOI (bVoi) is a wrapped VOI token that represents staked VOI in the Buidl program. Holders support ecosystem development and may be eligible for future incentives. There are currently no direct rewards for holding bVoi.";
                  case 39949746:
                    return "Gully Voi (gVOI) is a wrapped VOI token that represents staked VOI in the Gully ecosystem. gVOI holders support the development of Gully's decentralized applications and may be eligible for future incentives.";
                  case 40077073:
                    return "COFFEE is GM's liquid staking token, representing staked VOI to support long-term GM/VOI trading liquidity without earning rewards. This token helps maintain stable liquidity for the GM ecosystem while allowing holders to maintain flexibility with their positions.";
                  case 40227315:
                    return "Virtual Babes VOiconomy (VBV) allows staking VOI to earn $VBV rewards. Rewards are compounded into your stake and can be withdrawn 1:1 with VOI anytime. Regular rewards are distributed after each epoch, with irregular bonus rewards that grow in value over time.";
                  case 40263883:
                    return "Neo Voi (NEO) is a wrapped VOI token that represents staked VOI in the Neo ecosystem. NEO holders support the development of Neo's decentralized applications and may be eligible for future incentives.";
                  default:
                    return "";
                }
              })()}
            </Typography>
          </>
        )}

        <StatsCard
          style={{
            background: "transparent",
            border: "none",
          }}
          $isDarkTheme={isDarkTheme}
        >
          <StatusRow $isDarkTheme={isDarkTheme}>
            <Label $isDarkTheme={isDarkTheme}>Total in Chest</Label>
            {isLoading ? (
              <CircularProgress size={24} />
            ) : (
              <>
                <BigNumberDisplay $isDarkTheme={isDarkTheme}>
                  {formatAmount(totalInChest)}
                </BigNumberDisplay>
                <Typography
                  variant="subtitle2"
                  sx={{ color: isDarkTheme ? "#90caf9" : "#1976d2" }}
                >
                  VOI
                </Typography>
              </>
            )}
          </StatusRow>

          <StatusRow $isDarkTheme={isDarkTheme}>
            <Label $isDarkTheme={isDarkTheme}>Average Stake</Label>
            {isLoading ? (
              <CircularProgress size={24} />
            ) : (
              <>
                <BigNumberDisplay $isDarkTheme={isDarkTheme}>
                  {calculateAverageStake(totalInChest, holders)}
                </BigNumberDisplay>
                <Typography
                  variant="subtitle2"
                  sx={{ color: isDarkTheme ? "#90caf9" : "#1976d2" }}
                >
                  VOI/HOLDER
                </Typography>
              </>
            )}
          </StatusRow>

          <StatusRow $isDarkTheme={isDarkTheme}>
            <Label $isDarkTheme={isDarkTheme}>Number of Holders</Label>
            {isLoading ? (
              <CircularProgress size={24} />
            ) : (
              <>
                <BigNumberDisplay $isDarkTheme={isDarkTheme}>
                  {holders.toLocaleString()}
                </BigNumberDisplay>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: isDarkTheme ? "#90caf9" : "#1976d2" }}
                  >
                    PARTICIPANTS
                  </Typography>
                  <LeaderboardIcon
                    sx={{
                      cursor: "pointer",
                      fontSize: "20px",
                      color: isDarkTheme ? "#90caf9" : "#1976d2",
                      "&:hover": { opacity: 0.8 },
                    }}
                    onClick={() => setShowRankings(true)}
                  />
                </Box>
              </>
            )}
          </StatusRow>
        </StatsCard>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            marginBottom: "24px",
          }}
        >
          <Label
            $isDarkTheme={isDarkTheme}
            style={{ textAlign: "left", marginLeft: "4px" }}
          >
            Block Production History
          </Label>
          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <>
              <BlockProductionGraph
                isDarkTheme={isDarkTheme}
                data={epochSummaries
                  .slice(0, 6)
                  .reverse()
                  .map((epoch, index) => {
                    // For empty array or empty object, return 0
                    const blockCount = Array.isArray(epoch.proposers)
                      ? 0
                      : Object.values(epoch.proposers).reduce(
                          (sum, blocks) => sum + blocks,
                          0
                        );

                    return {
                      count: blockCount,
                      label: `Week ${index}`,
                    };
                  })}
              />
              <Link
                href={`https://voirewards.com/wallet/${algosdk.getApplicationAddress(
                  selectedContract
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: isDarkTheme ? "#90caf9" : "#1976d2",
                  textDecoration: "none",
                  fontSize: "14px",
                  textAlign: "right",
                  mt: 1,
                  "&:hover": {
                    textDecoration: "underline",
                  },
                }}
              >
                View on Voi Rewards →
              </Link>
            </>
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            marginBottom: "24px",
          }}
        >
          <StatusRow $isDarkTheme={isDarkTheme} style={{ flex: 1 }}>
            <Label $isDarkTheme={isDarkTheme}>Current Epoch Tokens</Label>
            {isLoading ? (
              <CircularProgress size={24} />
            ) : (
              <>
                <BigNumberDisplay $isDarkTheme={isDarkTheme}>
                  {currentEpochTokens.toLocaleString()}
                </BigNumberDisplay>
                <Typography
                  variant="subtitle2"
                  sx={{ color: isDarkTheme ? "#90caf9" : "#1976d2" }}
                >
                  VOI
                </Typography>
              </>
            )}
          </StatusRow>

          <StatusRow $isDarkTheme={isDarkTheme} style={{ flex: 1 }}>
            <Label $isDarkTheme={isDarkTheme}>Current Block Reward</Label>
            {isLoading ? (
              <CircularProgress size={24} />
            ) : (
              <>
                <BigNumberDisplay $isDarkTheme={isDarkTheme}>
                  {epochSummaries.length > 0 && Number(currentEpochTokens) > 0
                    ? (() => {
                        const nonBallastBlocks = epochSummaries[0].total_blocks;

                        console.log("nonBallastBlocks", nonBallastBlocks);

                        if (nonBallastBlocks <= 0) return "0";

                        // Calculate percentage through epoch
                        const secondsElapsed =
                          new Date().getTime() / 1000 -
                          new Date(epochSummaries[0].start_date).getTime() /
                            1000;
                        const secondsInEpoch = 7 * 24 * 60 * 60;
                        const percentageThroughEpoch =
                          secondsElapsed / secondsInEpoch;

                        const rewardPerBlock =
                          (Number(currentEpochTokens) *
                            percentageThroughEpoch) /
                          nonBallastBlocks;

                        return isNaN(rewardPerBlock)
                          ? "0"
                          : rewardPerBlock.toFixed(2);
                      })()
                    : "0"}
                </BigNumberDisplay>
                <Typography
                  variant="subtitle2"
                  sx={{ color: isDarkTheme ? "#90caf9" : "#1976d2" }}
                >
                  VOI PER BLOCK
                </Typography>
              </>
            )}
          </StatusRow>
        </Box>

        <StatusRow
          $isDarkTheme={isDarkTheme}
          style={{ flex: 1, marginBottom: "24px" }}
        >
          <Label $isDarkTheme={isDarkTheme}>Time Until Next Epoch</Label>
          {isLoading ? (
            <CircularProgress size={24} />
          ) : (
            <>
              {epochSummaries.length > 0 && (
                <LEDCountdown
                  isDarkTheme={isDarkTheme}
                  days={Math.floor(
                    (new Date(epochSummaries[0].end_date).getTime() -
                      new Date().getTime()) /
                      (1000 * 60 * 60 * 24)
                  )}
                  hours={Math.floor(
                    ((new Date(epochSummaries[0].end_date).getTime() -
                      new Date().getTime()) %
                      (1000 * 60 * 60 * 24)) /
                      (1000 * 60 * 60)
                  )}
                  minutes={Math.floor(
                    ((new Date(epochSummaries[0].end_date).getTime() -
                      new Date().getTime()) %
                      (1000 * 60 * 60)) /
                      (1000 * 60)
                  )}
                />
              )}{" "}
            </>
          )}
        </StatusRow>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            marginBottom: "24px",
          }}
        >
          {selectedContract === 664258 && (
            <StatusRow $isDarkTheme={isDarkTheme} style={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Label $isDarkTheme={isDarkTheme}>Estimated Reward</Label>
                <InfoIcon
                  sx={{
                    fontSize: 16,
                    color: isDarkTheme
                      ? "rgba(255, 255, 255, 0.7)"
                      : "rgba(0, 0, 0, 0.7)",
                    cursor: "pointer",
                    "&:hover": { opacity: 0.8 },
                  }}
                  onClick={() => setShowRewardDistribution(true)}
                />
              </Box>
              {isLoading ? (
                <CircularProgress size={24} />
              ) : (
                <>
                  <BigNumberDisplay $isDarkTheme={isDarkTheme}>
                    {epochSummaries.length > 0 && Number(currentEpochTokens) > 0
                      ? (() => {
                          const nonBallastBlocks =
                            epochSummaries[0].total_blocks;

                          if (nonBallastBlocks <= 0) return "0";

                          const blocksProduced = Array.isArray(
                            epochSummaries[0].proposers
                          )
                            ? 0
                            : Object.values(epochSummaries[0].proposers).reduce(
                                (sum, blocks) => sum + blocks,
                                0
                              );

                          console.log("blocksProduced", blocksProduced);

                          // Calculate percentage through epoch
                          const secondsElapsed =
                            new Date().getTime() / 1000 -
                            new Date(epochSummaries[0].start_date).getTime() /
                              1000;
                          const secondsInEpoch = 7 * 24 * 60 * 60;
                          const percentageThroughEpoch =
                            secondsElapsed / secondsInEpoch;

                          // Calculate rewards based on total blocks in epoch
                          const rewardPerBlock =
                            (Number(currentEpochTokens) *
                              percentageThroughEpoch) /
                            nonBallastBlocks;

                          const totalReward = rewardPerBlock * blocksProduced;
                          const estimatedReward = totalReward * 0.45; // 45% of rewards

                          return isNaN(estimatedReward)
                            ? "0"
                            : estimatedReward.toFixed(2);
                        })()
                      : "0"}
                  </BigNumberDisplay>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: isDarkTheme ? "#90caf9" : "#1976d2" }}
                  >
                    VOI THIS EPOCH
                  </Typography>
                </>
              )}
            </StatusRow>
          )}
        </Box>

        {(selectedContract === 913147 || selectedContract === 664258) && (
          <>
            {selectedContract === 913147 && (
              <>
                <NFTVaultSection $isDarkTheme={isDarkTheme}>
                  <Label
                    $isDarkTheme={isDarkTheme}
                    style={{ marginBottom: "16px" }}
                  >
                    NFT Vault Collection ({nftAssets.length} NFTs)
                  </Label>
                  <ImageList
                    sx={{
                      width: "100%",
                      height: 450,
                      "&::-webkit-scrollbar": {
                        width: "8px",
                      },
                      "&::-webkit-scrollbar-track": {
                        background: isDarkTheme
                          ? "rgba(255, 255, 255, 0.1)"
                          : "rgba(0, 0, 0, 0.1)",
                        borderRadius: "4px",
                      },
                      "&::-webkit-scrollbar-thumb": {
                        background: isDarkTheme
                          ? "rgba(255, 255, 255, 0.2)"
                          : "rgba(0, 0, 0, 0.2)",
                        borderRadius: "4px",
                        "&:hover": {
                          background: isDarkTheme
                            ? "rgba(255, 255, 255, 0.3)"
                            : "rgba(0, 0, 0, 0.3)",
                        },
                      },
                    }}
                    cols={3}
                    gap={8}
                  >
                    {nftAssets.map((asset) => (
                      <ImageListItem
                        key={`${asset.contractId}-${asset.tokenId}`}
                      >
                        <img
                          src={asset.parsedMetadata.image}
                          alt={
                            asset.parsedMetadata.name ||
                            `${asset.collectionName} #${asset.tokenId}`
                          }
                          loading="lazy"
                          style={{
                            borderRadius: "8px",
                            border: `1px solid ${
                              isDarkTheme
                                ? "rgba(255, 255, 255, 0.1)"
                                : "rgba(0, 0, 0, 0.1)"
                            }`,
                            aspectRatio: "1",
                            objectFit: "cover",
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                        <ImageListItemBar
                          title={
                            asset.parsedMetadata.name ||
                            `${asset.collectionName} #${asset.tokenId}`
                          }
                          subtitle={
                            <span>
                              {asset.collectionName} • #{asset.tokenId}
                            </span>
                          }
                          sx={{
                            background: isDarkTheme
                              ? "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 100%)"
                              : "linear-gradient(to top, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.3) 70%, rgba(255,255,255,0) 100%)",
                            borderBottomLeftRadius: "8px",
                            borderBottomRightRadius: "8px",
                            "& .MuiImageListItemBar-title": {
                              color: isDarkTheme ? "#fff" : "#000",
                              fontSize: "14px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            },
                            "& .MuiImageListItemBar-subtitle": {
                              color: isDarkTheme
                                ? "rgba(255, 255, 255, 0.7)"
                                : "rgba(0, 0, 0, 0.7)",
                              fontSize: "12px",
                            },
                          }}
                        />
                      </ImageListItem>
                    ))}
                  </ImageList>
                </NFTVaultSection>
                {selectedContract === 664258 && (
                  <DrawHistorySection $isDarkTheme={isDarkTheme}>
                    <Label
                      $isDarkTheme={isDarkTheme}
                      style={{ marginBottom: "24px" }}
                    >
                      Draw History
                    </Label>
                    <DrawTable $isDarkTheme={isDarkTheme}>
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Winner</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {DRAW_HISTORY.map((draw, index) => (
                            <tr key={index}>
                              <td>{formatReleaseDate(draw.date)}</td>
                              <td className="amount">
                                {Number(draw.amount).toFixed(2)} VOI
                              </td>
                              <td className="address">
                                <Tooltip title="Copy Address">
                                  <Link
                                    component="span"
                                    onClick={() =>
                                      useCopyToClipboard(draw.winnerAddress)
                                    }
                                    sx={{ cursor: "pointer" }}
                                  >
                                    {`${draw.winnerAddress.slice(
                                      0,
                                      4
                                    )}...${draw.winnerAddress.slice(-4)}`}
                                  </Link>
                                </Tooltip>
                              </td>
                              <td>
                                {draw.txid !== "-" ? (
                                  <Link
                                    href={`https://block.voi.network/explorer/transaction/${draw.txid}/global-state-delta`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    Claimed
                                  </Link>
                                ) : (
                                  <Typography
                                    component="span"
                                    sx={{
                                      color: isDarkTheme
                                        ? "rgba(255, 255, 255, 0.5)"
                                        : "rgba(0, 0, 0, 0.5)",
                                      fontStyle: "italic",
                                    }}
                                  >
                                    Pending
                                  </Typography>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </DrawTable>
                  </DrawHistorySection>
                )}
                {selectedContract === 913147 && (
                  <ReleaseScheduleSection $isDarkTheme={isDarkTheme}>
                    <Label
                      $isDarkTheme={isDarkTheme}
                      style={{ marginBottom: "24px" }}
                    >
                      NFT Release Schedule
                    </Label>
                    <ReleaseTable $isDarkTheme={isDarkTheme}>
                      <table>
                        <thead>
                          <tr>
                            <th>Release Date</th>
                            <th>NFT</th>
                            <th>Winner</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {NFT_RELEASES.map((release, index) => (
                            <tr key={index}>
                              <td>{formatReleaseDate(release.date)}</td>
                              <td>
                                <Link
                                  href={release.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {release.name}
                                </Link>
                              </td>
                              <td className="address">
                                {release.winnerAddress ? (
                                  <Tooltip title="Copy Address">
                                    <Link
                                      component="span"
                                      onClick={() =>
                                        copyToClipboard(release.winnerAddress)
                                      }
                                      sx={{ cursor: "pointer" }}
                                    >
                                      {`${release.winnerAddress.slice(
                                        0,
                                        4
                                      )}...${release.winnerAddress.slice(-4)}`}
                                    </Link>
                                  </Tooltip>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td>
                                {release.txid ? (
                                  <Link
                                    href={`https://block.voi.network/explorer/transaction/${release.txid}/global-state-delta`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    Claimed
                                  </Link>
                                ) : (
                                  <Typography
                                    component="span"
                                    sx={{
                                      color: isDarkTheme
                                        ? "rgba(255, 255, 255, 0.5)"
                                        : "rgba(0, 0, 0, 0.5)",
                                      fontStyle: "italic",
                                    }}
                                  >
                                    Upcoming
                                  </Typography>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ReleaseTable>
                  </ReleaseScheduleSection>
                )}

                <NFTPrizeCard $isDarkTheme={isDarkTheme}>
                  <Label $isDarkTheme={isDarkTheme}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      Weekly NFT Prize
                      <InfoIcon
                        sx={{
                          fontSize: 16,
                          color: isDarkTheme
                            ? "rgba(255, 255, 255, 0.7)"
                            : "rgba(0, 0, 0, 0.7)",
                          cursor: "pointer",
                          "&:hover": { opacity: 0.8 },
                        }}
                        onClick={() => setShowRewardDistribution(true)}
                      />
                    </Box>
                  </Label>
                  <NFTImage
                    src="https://prod.cdn.highforge.io/m/398078/24.webp"
                    alt="Weekly NFT Prize"
                    $isDarkTheme={isDarkTheme}
                  />
                  <Typography
                    variant="h6"
                    sx={{
                      color: isDarkTheme ? "#90caf9" : "#1976d2",
                      fontWeight: "bold",
                      mb: 1,
                    }}
                  >
                    Bored Crepe #24
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: isDarkTheme
                        ? "rgba(255, 255, 255, 0.7)"
                        : "rgba(0, 0, 0, 0.7)",
                      mb: 2,
                    }}
                  >
                    This week's prize is a unique digital collectible. Hold NFT
                    VOI for a chance to win!
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: isDarkTheme
                          ? "rgba(255, 255, 255, 0.9)"
                          : "rgba(0, 0, 0, 0.9)",
                      }}
                    >
                      Draw Date:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: isDarkTheme ? "#90caf9" : "#1976d2",
                        fontWeight: "bold",
                      }}
                    >
                      Apr 3, 2025
                    </Typography>
                  </Box>
                </NFTPrizeCard>
              </>
            )}

            <RollDiceSection $isDarkTheme={isDarkTheme}>
              <Typography variant="h6">Feeling Lucky?</Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Roll the dice to randomly select a holder from the current pool.
              </Typography>
              <Button
                variant="contained"
                onClick={handleRollDice}
                disabled={isRolling || holdersList.length === 0}
              >
                {isRolling ? "Rolling..." : "Roll Dice"}
              </Button>
              {selectedAccount && (
                <div className="selected-account">
                  <Typography
                    variant="body1"
                    sx={{ cursor: "pointer" }}
                    onClick={() => copyToClipboard(selectedAccount)}
                  >
                    {selectedAccount}
                  </Typography>
                </div>
              )}
            </RollDiceSection>
          </>
        )}

        {address && (
          <StatusRow
            $isDarkTheme={isDarkTheme}
            style={{ marginBottom: "24px" }}
          >
            <Label $isDarkTheme={isDarkTheme}>Your Balance</Label>
            {isLoading ? (
              <CircularProgress size={24} />
            ) : (
              <>
                <BigNumberDisplay $isDarkTheme={isDarkTheme}>
                  {formatAmount(userBalance)}
                </BigNumberDisplay>
                <Typography
                  variant="subtitle2"
                  sx={{ color: isDarkTheme ? "#90caf9" : "#1976d2" }}
                >
                  VOI
                </Typography>
              </>
            )}
          </StatusRow>
        )}

        {address ? (
          <ActionCard
            style={{
              background: "transparent",
              border: "none",
            }}
            $isDarkTheme={isDarkTheme}
          >
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Deposit
              </Typography>
              <Button
                variant="contained"
                onClick={() => setDepositModalOpen(true)}
                disabled={!connected}
                fullWidth
              >
                Deposit VOI
              </Button>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Withdraw
              </Typography>
              <Button
                variant="contained"
                onClick={() => setWithdrawModalOpen(true)}
                disabled={!connected}
                fullWidth
              >
                Withdraw VOI
              </Button>
            </Box>

            {/*<Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Swap
              </Typography>
              <Button
                variant="contained"
                onClick={() => setSwapModalOpen(true)}
                disabled={!connected}
                fullWidth
                startIcon={<SwapHorizIcon />}
              >
                Swap Tokens
              </Button>
            </Box>*/}
          </ActionCard>
        ) : null}

        <Disclaimer $isDarkTheme={isDarkTheme}>
          DISCLAIMER: The Community Chest is an experimental feature.
          Participants acknowledge and accept all risks associated with using
          this service. While deposits can be withdrawn at any time without
          restrictions, smart contract interactions may take a few seconds to
          process. Past performance does not guarantee future results. Always
          invest responsibly and never commit more than you can afford to lose.
        </Disclaimer>

        {/* Add SwapModal */}
        <SwapModal
          open={swapModalOpen}
          onClose={() => setSwapModalOpen(false)}
          isDarkTheme={isDarkTheme}
          fromBalance={userBalance}
          onSwap={handleSwap}
          isLoading={isLoading}
        />

        <DepositModal
          open={depositModalOpen}
          onClose={() => {
            setDepositModalOpen(false);
            setDepositAmount("");
          }}
          onDeposit={handleDeposit}
          amount={depositAmount}
          setAmount={setDepositAmount}
          isLoading={isLoading}
          isDarkTheme={isDarkTheme}
        />

        <WithdrawModal
          open={withdrawModalOpen}
          onClose={() => {
            setWithdrawModalOpen(false);
            setWithdrawAmount("");
          }}
          onWithdraw={handleWithdraw}
          amount={withdrawAmount}
          setAmount={setWithdrawAmount}
          isLoading={isLoading}
          isDarkTheme={isDarkTheme}
        />

        <HowItWorksModal
          open={howItWorksOpen}
          onClose={() => setHowItWorksOpen(false)}
          isDarkTheme={isDarkTheme}
        />

        <RankingsModal
          open={showRankings}
          onClose={() => setShowRankings(false)}
          isDarkTheme={isDarkTheme}
          holders={holdersList}
          totalSupply={totalInChest}
        />

        {[664258, 913147].includes(selectedContract) && (
          <RewardDistributionModal
            open={showRewardDistribution}
            onClose={() => setShowRewardDistribution(false)}
            isDarkTheme={isDarkTheme}
            selectedContract={selectedContract}
          />
        )}
      </Container>
      {renderContractModal()}
    </>
  );
};

export default CommunityChest;
