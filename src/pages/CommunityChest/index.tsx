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
  Tooltip,
  MenuItem,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Modal,
} from "@mui/material";
import styled, { keyframes } from "styled-components";
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
  address?: string;
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
];

// Add these near the top with other interfaces
interface ContractOption {
  id: number;
  name: string;
  description: string;
}

const CONTRACT_OPTIONS: ContractOption[] = [
  {
    id: 664258,
    name: "CCV",
    description: "Community Chest Voi",
  },
  {
    id: 390001,
    name: "wVOI",
    description: "Wrapped VOI",
  },
  {
    id: 770561,
    name: "FV",
    description: "Fountain VOI",
  },
  {
    id: 828295,
    name: "EV",
    description: "En VOI",
  },
  {
    id: 888305,
    name: "WV",
    description: "Womp VOI",
  },
  {
    id: 913147,
    name: "NFV",
    description: "NFT VOI",
  },
  {
    id: 917261,
    name: "ARV",
    description: "Arb Voi",
  },
];

// Update the RewardBadge styled component
const RewardBadge = styled("span")<{
  $isDarkTheme: boolean;
  $variant?: string;
}>`
  background-color: ${(props) => {
    if (props.$variant === "ecosystem") {
      return props.$isDarkTheme ? "#2e7d32" : "#4caf50";
    }
    return props.$isDarkTheme ? "#1976d2" : "#90caf9";
  }};
  color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  margin-left: 8px;
  font-weight: 500;
  white-space: nowrap;

  @media (max-width: 600px) {
    font-size: 10px;
    padding: 2px 6px;
    margin-left: 4px;
  }
`;

// Update the ContractSelect styled component
const ContractSelect = styled(TextField)<{ $isDarkTheme: boolean }>`
  margin-bottom: 24px;

  .MuiOutlinedInput-root {
    color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};
    background-color: ${(props) =>
      props.$isDarkTheme ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.1)"};
    border-radius: 8px;
  }

  .MuiOutlinedInput-notchedOutline {
    border-color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)"};
  }

  &:hover .MuiOutlinedInput-notchedOutline {
    border-color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)"};
  }

  .MuiSelect-icon {
    color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)"};
  }

  // Responsive menu item styling
  .MuiMenuItem-root {
    padding: 16px;
    border-bottom: 1px solid
      ${(props) =>
        props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};

    &:last-child {
      border-bottom: none;
    }

    @media (max-width: 600px) {
      padding: 12px;
    }
  }
`;

// Update ContractStats for responsiveness
const ContractStats = styled(Box)`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 12px;

  @media (max-width: 600px) {
    gap: 8px;
    margin-top: 8px;
  }
`;

const StatBox = styled(Box)<{ $isDarkTheme: boolean }>`
  text-align: center;
  padding: 8px 4px;
  border-radius: 4px;
  background-color: ${(props) =>
    props.$isDarkTheme ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.2)"};

  .stat-value {
    font-weight: 600;
    color: ${(props) => (props.$isDarkTheme ? "#90caf9" : "#1976d2")};
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @media (max-width: 600px) {
      font-size: 12px;
    }
  }

  .stat-label {
    font-size: 12px;
    color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)"};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @media (max-width: 600px) {
      font-size: 10px;
    }
  }
`;

// Add this styled component with other styled components
const CautionBox = styled(Box)<{ $isDarkTheme: boolean }>`
  background-color: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 152, 0, 0.1)" : "rgba(255, 152, 0, 0.05)"};
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 152, 0, 0.3)" : "rgba(255, 152, 0, 0.2)"};
  border-radius: 8px;
  padding: 16px;
  margin: 24px 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

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

const NFTImage = styled.img`
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
    return `${(num / 1_000_000).toFixed(1)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}k`;
  }
  return num.toFixed(1);
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

const BalanceTable = styled(Box)`
  width: 100%;
  margin-bottom: 16px;

  table {
    width: 100%;
    border-collapse: collapse;

    th,
    td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid
        ${(props) =>
          props.$isDarkTheme
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)"};
    }

    th {
      color: ${(props) =>
        props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)"};
      font-weight: 500;
      font-size: 0.875rem;
    }

    td {
      color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};
      font-size: 0.875rem;
    }

    .balance-value {
      color: ${(props) => (props.$isDarkTheme ? "#90caf9" : "#1976d2")};
      font-weight: 600;
      text-align: right;
    }

    .token-symbol {
      text-align: right;
      color: ${(props) =>
        props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)"};
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
    winnerAddress: "",
    txid: "",
  },
  {
    date: "2025-02-14 00:00:00 UTC",
    name: "DORKS29",
    url: "https://nautilus.sh/#/collection/894888/token/29",
    winnerAddress: "",
    txid: "",
  },
  {
    date: "2025-02-21 00:00:00 UTC",
    name: "Mermaid4",
    url: "https://nautilus.sh/#/collection/864075/token/4",
    winnerAddress: "",
    txid: "",
  },
  {
    date: "2025-02-28 00:00:00 UTC",
    name: "Mermaid2",
    url: "https://nautilus.sh/#/collection/864075/token/2",
    winnerAddress: "",
    txid: "",
  },
  {
    date: "2025-03-07 00:00:00 UTC",
    name: "Chrisbro 16",
    url: "https://nautilus.sh/#/collection/603303/token/16",
    winnerAddress: "",
    txid: "",
  },
  {
    date: "2025-03-14 00:00:00 UTC",
    name: "PixelProphet162",
    url: "https://nautilus.sh/#/collection/450392/token/162",
    winnerAddress: "",
    txid: "",
  },
  {
    date: "2025-03-21 00:00:00 UTC",
    name: "AI Voiager #66",
    url: "https://nautilus.sh/#/collection/398796/token/66",
    winnerAddress: "",
    txid: "",
  },
  {
    date: "2025-03-28 00:00:00 UTC",
    name: "CandyMons90",
    url: "https://nautilus.sh/#/collection/587497/token/90",
    winnerAddress: "",
    txid: "",
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
    width: 100%;
    border-collapse: collapse;
    min-width: 600px;

    th,
    td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid
        ${(props) =>
          props.$isDarkTheme
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)"};
      font-size: 0.875rem;
    }

    th {
      color: ${(props) =>
        props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)"};
      font-weight: 500;
    }

    td {
      color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};
    }

    td a {
      color: ${(props) => (props.$isDarkTheme ? "#90caf9" : "#1976d2")};
      text-decoration: none;
      &:hover {
        text-decoration: underline;
      }
    }

    .address {
      font-family: "IBM Plex Mono", monospace;
      font-size: 0.75rem;
    }
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

const DrawTable = styled(Box)<{
  $isDarkTheme: boolean;
  selectedContract: number;
}>`
  overflow-x: auto;

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 600px;

    th,
    td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid
        ${(props) =>
          props.$isDarkTheme
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)"};
      font-size: 0.875rem;
    }

    th {
      color: ${(props) =>
        props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)"};
      font-weight: 500;
    }

    td {
      color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};
    }

    .amount {
      text-align: right;
      color: ${(props) => (props.$isDarkTheme ? "#90caf9" : "#1976d2")};
      font-family: "IBM Plex Mono", monospace;
    }

    .address {
      font-family: "IBM Plex Mono", monospace;
      font-size: 0.75rem;
    }
  }
`;

const CommunityChest: React.FC<CommunityChestProps> = ({
  isDarkTheme,
  connected,
  address,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const contractParam = searchParams.get("contract");

  // Update state initialization to use URL parameter if available
  const [selectedContract, setSelectedContract] = useState<number>(
    CONTRACT_OPTIONS.some((opt) => opt.id === Number(contractParam))
      ? Number(contractParam)
      : 664258
  );

  // Update the contract selection handler to modify URL
  const handleContractChange = (newContract: number) => {
    setSelectedContract(newContract);
    setSearchParams({ contract: newContract.toString() });
  };

  const { signTransactions } = useWallet();
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
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/balances?contractId=${selectedContract}`
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
          `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/balances?accountId=${address}`
        );

        const relevantTokens = [
          664258, 390001, 770561, 828295, 888305, 913147, 917261,
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
          `https://mainnet-idx.nautilus.sh/nft-indexer/v1/tokens?owner=MTGLPLANYNVD4OMZUQDIZ62G5LRX3JCC2H33VZNYY5VDWLEYW5JRZ3W3GQ`
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

  // Add handleSwap function
  const handleSwap = async (
    fromToken: number,
    toToken: number,
    amount: string
  ) => {
    if (!connected) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      setIsLoading(true);
      const { algodClient } = getAlgorandClients();

      // Create contract instances
      const fromContract = new CONTRACT(
        fromToken,
        algodClient,
        null,
        abi.nt200,
        {
          addr: address,
          sk: Uint8Array.from([]),
        }
      );

      const toContract = new CONTRACT(toToken, algodClient, null, abi.nt200, {
        addr: address,
        sk: Uint8Array.from([]),
      });

      const amountBI = BigInt(
        new BigNumber(amount).multipliedBy(10 ** 6).toFixed(0)
      );

      // First withdraw from the source contract
      const withdrawR = await fromContract.withdraw(amountBI);
      if (!withdrawR.success) {
        toast.error("Failed to withdraw from source contract");
        return;
      }

      // Then deposit to the destination contract
      const depositR = await toContract.deposit(amountBI);
      if (!depositR.success) {
        toast.error("Failed to deposit to destination contract");
        return;
      }

      // Combine transactions
      const combinedTxns = [...withdrawR.txns, ...depositR.txns];

      // Sign and send transactions
      const stxns = await signTransactions(
        combinedTxns.map((txn) => new Uint8Array(Buffer.from(txn, "base64")))
      );

      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();
      await algosdk.waitForConfirmation(algodClient, txId, 4);

      toast.success("Swap successful!");
      fetchData();
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
      width: 100%;
      border-collapse: collapse;
      min-width: 600px;

      th,
      td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid
          ${(props) =>
            props.$isDarkTheme
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)"};
        font-size: 0.875rem;
      }

      th {
        color: ${(props) =>
          props.$isDarkTheme
            ? "rgba(255, 255, 255, 0.7)"
            : "rgba(0, 0, 0, 0.7)"};
        font-weight: 500;
      }

      td {
        color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};
      }

      .amount {
        text-align: right;
        color: ${(props) => (props.$isDarkTheme ? "#90caf9" : "#1976d2")};
        font-family: "IBM Plex Mono", monospace;
      }

      .address {
        font-family: "IBM Plex Mono", monospace;
        font-size: 0.75rem;
      }
    }
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
          {CONTRACT_OPTIONS.map((option) => {
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
                      {(option.id === 390001 ||
                        option.id === 828295 ||
                        option.id === 888305) && (
                        <RewardBadge
                          $isDarkTheme={isDarkTheme}
                          $variant="ecosystem"
                        >
                          Ecosystem
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
          {getContractDescription(selectedContract, isDarkTheme)}
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
                    return "Wrapped VOI (wVOI) is a wrapped version of the native VOI token, enabling easier integration with DeFi protocols and smart contracts while maintaining 1:1 parity with VOI. There are no incentives to hold wVOI. However, community members may support the project by holding wVOI.";
                  case 770561:
                    return "Fountain VOI (FV) is a wrapped VOI token that represents staked VOI in the Voi Fountain, allowing users to support the project by holding Fountain VOI and earn extra rewards provided by the Fountain.";
                  case 828295:
                    return "En VOI (EV) is a wrapped VOI token that represents staked VOI in the enVoi Naming Service. Name registrations and renewals are held in En VOI. There are no incentives to hold En VOI. However, community members may support the project by holding En VOI.";
                  case 888305:
                    return "Womp VOI (WV) is a wrapped VOI token that represents staked VOI in WompCrew. There are no incentives to hold WV. However, community members may support the project by holding WV.";
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
                    src="https://prod.cdn.highforge.io/m/894888/13.png"
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
                    DORKS13
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
                      {new Date(
                        new Date(
                          epochSummaries[0]?.end_date || Date.now()
                        ).getTime() +
                          3 * 24 * 60 * 60 * 1000
                      ).toLocaleDateString()}
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
    </>
  );
};

export default CommunityChest;
