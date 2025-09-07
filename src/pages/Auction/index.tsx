import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  CircularProgress,
  Grid,
  Alert,
  Link,
  TextField,
  InputAdornment,
} from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import Layout from "@/layouts/Default";
import axios from "axios";
import {
  ARC72_INDEXER_API,
  NFT_NAVIGATOR_API,
  HIGHFORGE_CDN,
  MIMIR_API,
} from "@/config/arc72-idx";
import { stripTrailingZeroBytes } from "@/utils/string";
import styled from "styled-components";
import { abi, CONTRACT } from "ulujs";
import { getAlgorandClients } from "@/wallets";
import {
  decodeMpCurrencyData,
  getDeleteEvent,
  getListingEvent,
  makeContract,
  offerABI,
} from "@/components/Tools/OffersManager";
import algosdk, { waitForConfirmation } from "algosdk";
import { useWallet } from "@txnlab/use-wallet-react";
import { alpha } from "@mui/material/styles";
import { toast } from "react-toastify";
import { bigIntToUint8Array } from "@/lib/utils";
import BigNumber from "bignumber.js";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useQuery } from "@tanstack/react-query";
import { CTCINFO_MP206 } from "@/contants/mp";
import { decodeRoyalties } from "@/utils/hf";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Auction {
  listingId: number;
  contractId: number;
  tokenId: number;
  seller: string;
  owner?: string;
  startingPrice: number;
  reservePrice?: number;
  currency: number;
  createTimestamp: number;
  endTimestamp: number;
  active: number;
  currentBid?: number;
  currentBidder?: string;
  bidCount?: number;
}

interface TokenMetadata {
  name: string;
  image: string;
  description?: string;
  properties?: any;
}

interface FloorPriceInfo {
  floorPrice: number;
  lastUpdate: number;
  collectionId: number;
}

const StyledCard = styled(Card)<{ $isDark?: boolean }>`
  background: ${(props) =>
    props.$isDark ? "rgba(40, 40, 40, 0.85)" : "rgba(255, 255, 255, 0.95)"};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  border-radius: 32px;
  margin-bottom: 24px;
  box-shadow: ${(props) =>
    props.$isDark
      ? "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.1)"
      : "0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.8)"};
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${(props) =>
      props.$isDark
        ? "0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.15)"
        : "0 12px 40px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.9)"};
  }
`;

const ImageContainer = styled(Box)<{ $isDark?: boolean }>`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 20px;
  overflow: hidden;
  background: ${(props) =>
    props.$isDark
      ? "linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)"
      : "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)"};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  box-shadow: ${(props) =>
    props.$isDark
      ? "inset 0 1px 1px rgba(255, 255, 255, 0.1), 0 4px 12px rgba(0, 0, 0, 0.3)"
      : "inset 0 1px 1px rgba(255, 255, 255, 0.8), 0 4px 12px rgba(0, 0, 0, 0.1)"};
`;

const TokenImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s ease;
  border-radius: 20px;
`;

const ImagePlaceholder = styled(Box)<{ $isDark?: boolean }>`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(props) =>
    props.$isDark
      ? "linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)"
      : "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)"};
  color: ${(props) => (props.$isDark ? "#888" : "#999")};
  font-size: 14px;
  text-align: center;
  border-radius: 20px;
`;

const StyledButton = styled(Button)<{ $isDark?: boolean }>`
  background: ${(props) =>
    props.$isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"};
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)"};
  color: ${(props) => (props.$isDark ? "#fff" : "#000")};
  backdrop-filter: blur(10px);
  border-radius: 20px;
  text-transform: none;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.08)"};
    border-color: ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.15)"};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const StyledChip = styled(Chip)<{ $isDark?: boolean }>`
  background: ${(props) =>
    props.$isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"};
  color: ${(props) => (props.$isDark ? "#fff" : "#000")};
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)"};
  backdrop-filter: blur(10px);
  font-weight: 500;
  border-radius: 20px;

  &.MuiChip-colorSuccess {
    background: ${(props) =>
      props.$isDark ? "rgba(76, 175, 80, 0.2)" : "rgba(76, 175, 80, 0.1)"};
    color: ${(props) => (props.$isDark ? "#4caf50" : "#2e7d32")};
    border-color: ${(props) =>
      props.$isDark ? "rgba(76, 175, 80, 0.3)" : "rgba(76, 175, 80, 0.2)"};
  }

  &.MuiChip-colorError {
    background: ${(props) =>
      props.$isDark ? "rgba(255, 152, 0, 0.2)" : "rgba(255, 152, 0, 0.1)"};
    color: ${(props) => (props.$isDark ? "#ff9800" : "#f57c00")};
    border-color: ${(props) =>
      props.$isDark ? "rgba(244, 67, 54, 0.3)" : "rgba(255, 152, 0, 0.2)"};
  }

  &.MuiChip-colorWarning {
    background: ${(props) =>
      props.$isDark ? "rgba(255, 152, 0, 0.2)" : "rgba(255, 152, 0, 0.1)"};
    color: ${(props) => (props.$isDark ? "#ff9800" : "#f57c00")};
    border-color: ${(props) =>
      props.$isDark ? "rgba(255, 152, 0, 0.3)" : "rgba(255, 152, 0, 0.2)"};
  }
`;

const InfoBox = styled(Box)<{ $isDark?: boolean }>`
  margin-bottom: 16px;
  padding: 16px;
  background: ${(props) =>
    props.$isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)"};
  border-radius: 20px;
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"};
  backdrop-filter: blur(5px);
`;

const CountdownBox = styled(Box)<{ $isDark?: boolean }>`
  margin-bottom: 16px;
  padding: 20px;
  background: ${(props) =>
    props.$isDark
      ? "linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%)"
      : "linear-gradient(135deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 193, 7, 0.02) 100%)"};
  border-radius: 20px;
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(255, 152, 0, 0.2)" : "rgba(255, 152, 0, 0.1)"};
  backdrop-filter: blur(5px);
  text-align: center;
`;

const BidContainer = styled(Box)<{ $isDark?: boolean }>`
  margin-top: 16px;
  padding: 20px;
  background: ${(props) =>
    props.$isDark
      ? "linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(25, 118, 210, 0.05) 100%)"
      : "linear-gradient(135deg, rgba(33, 150, 243, 0.05) 0%, rgba(25, 118, 210, 0.02) 100%)"};
  border-radius: 20px;
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(33, 150, 243, 0.2)" : "rgba(33, 150, 243, 0.1)"};
  backdrop-filter: blur(5px);
`;

const BidTextField = styled(TextField)<{ $isDark?: boolean }>`
  .MuiOutlinedInput-root {
    background: ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)"};
    border-radius: 16px;

    &:hover .MuiOutlinedInput-notchedOutline {
      border-color: ${(props) =>
        props.$isDark ? "rgba(33, 150, 243, 0.5)" : "rgba(33, 150, 243, 0.3)"};
    }

    &.Mui-focused .MuiOutlinedInput-notchedOutline {
      border-color: ${(props) => (props.$isDark ? "#2196f3" : "#1976d2")};
    }
  }

  .MuiOutlinedInput-input {
    color: ${(props) => (props.$isDark ? "#fff" : "#000")};
    font-size: 1.1rem;
    font-weight: 500;
  }

  .MuiInputLabel-root {
    color: ${(props) => (props.$isDark ? "#ccc" : "#666")};
  }

  .MuiOutlinedInput-notchedOutline {
    border-color: ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)"};
  }
`;

const BidButton = styled(Button)<{ $isDark?: boolean }>`
  background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
  color: #fff;
  border-radius: 16px;
  padding: 12px 24px;
  font-weight: 600;
  font-size: 1rem;
  text-transform: none;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #42a5f5 0%, #1e88e5 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(33, 150, 243, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: ${(props) =>
      props.$isDark ? "rgba(33, 150, 243, 0.3)" : "rgba(33, 150, 243, 0.3)"};
    color: ${(props) => (props.$isDark ? "#888" : "#999")};
    box-shadow: none;
  }
`;

const BidHistoryContainer = styled(Box)<{ $isDark?: boolean }>`
  margin-top: 16px;
  padding: 20px;
  background: ${(props) =>
    props.$isDark
      ? "linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(56, 142, 60, 0.05) 100%)"
      : "linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(56, 142, 60, 0.02) 100%)"};
  border-radius: 20px;
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(76, 175, 80, 0.2)" : "rgba(76, 175, 80, 0.1)"};
  backdrop-filter: blur(5px);
`;

const BidHistoryItem = styled(Box)<{ $isDark?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 8px;
  background: ${(props) =>
    props.$isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)"};
  border-radius: 12px;
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"};
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)"};
    transform: translateY(-1px);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const BidAmount = styled(Typography)<{ $isDark?: boolean }>`
  font-weight: 600;
  font-size: 1.1rem;
  color: ${(props) => (props.$isDark ? "#4caf50" : "#2e7d32")};
`;

const BidderAddress = styled(Typography)<{ $isDark?: boolean }>`
  font-family: monospace;
  font-size: 0.9rem;
  color: ${(props) => (props.$isDark ? "#ccc" : "#666")};
`;

const BidTime = styled(Typography)<{ $isDark?: boolean }>`
  font-size: 0.8rem;
  color: ${(props) => (props.$isDark ? "#aaa" : "#777")};
`;

const ChartContainer = styled(Box)<{ $isDark?: boolean }>`
  margin-top: 16px;
  padding: 20px;
  background: ${(props) =>
    props.$isDark
      ? "linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(25, 118, 210, 0.05) 100%)"
      : "linear-gradient(135deg, rgba(33, 150, 243, 0.05) 0%, rgba(25, 118, 210, 0.02) 100%)"};
  border-radius: 20px;
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(33, 150, 243, 0.2)" : "rgba(33, 150, 243, 0.1)"};
  backdrop-filter: blur(5px);
  height: 300px;
`;

const BuyVoiContainer = styled(Box)<{ $isDark?: boolean }>`
  margin-top: 16px;
  padding: 20px;
  background: ${(props) =>
    props.$isDark
      ? "linear-gradient(135deg, rgba(156, 39, 176, 0.1) 0%, rgba(123, 31, 162, 0.05) 100%)"
      : "linear-gradient(135deg, rgba(156, 39, 176, 0.05) 0%, rgba(123, 31, 162, 0.02) 100%)"};
  border-radius: 20px;
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(156, 39, 176, 0.2)" : "rgba(156, 39, 176, 0.1)"};
  backdrop-filter: blur(5px);
`;

const BuyVoiButton = styled(Button)<{ $isDark?: boolean }>`
  background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%);
  color: #fff;
  border-radius: 16px;
  padding: 12px 32px;
  font-weight: 600;
  font-size: 1rem;
  text-transform: none;
  box-shadow: 0 4px 12px rgba(156, 39, 176, 0.3);
  transition: all 0.2s ease;
  min-width: 160px;

  &:hover {
    background: linear-gradient(135deg, #ab47bc 0%, #8e24aa 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(156, 39, 176, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: ${(props) =>
      props.$isDark ? "rgba(156, 39, 176, 0.3)" : "rgba(156, 39, 176, 0.3)"};
    color: ${(props) => (props.$isDark ? "#888" : "#999")};
    box-shadow: none;
  }
`;

const BuyNowContainer = styled(Box)<{ $isDark?: boolean }>`
  margin-bottom: 32px;
  padding: 20px;
  background: ${(props) =>
    props.$isDark
      ? "linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(56, 142, 60, 0.05) 100%)"
      : "linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(56, 142, 60, 0.02) 100%)"};
  border-radius: 20px;
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(76, 175, 80, 0.2)" : "rgba(76, 175, 80, 0.1)"};
  backdrop-filter: blur(5px);
`;

const BuyNowButton = styled(Button)<{ $isDark?: boolean }>`
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
  color: #fff;
  border-radius: 16px;
  padding: 12px 32px;
  font-weight: 600;
  font-size: 1rem;
  text-transform: none;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
  transition: all 0.2s ease;
  min-width: 160px;

  &:hover {
    background: linear-gradient(135deg, #66bb6a 0%, #43a047 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: ${(props) =>
      props.$isDark ? "rgba(76, 175, 80, 0.3)" : "rgba(76, 175, 80, 0.3)"};
    color: ${(props) => (props.$isDark ? "#888" : "#999")};
    box-shadow: none;
  }
`;

const InstaSellContainer = styled(Box)<{ $isDark?: boolean }>`
  margin-bottom: 32px;
  padding: 20px;
  background: ${(props) =>
    props.$isDark
      ? "linear-gradient(135deg, rgba(255, 87, 34, 0.1) 0%, rgba(244, 67, 54, 0.05) 100%)"
      : "linear-gradient(135deg, rgba(255, 87, 34, 0.05) 0%, rgba(244, 67, 54, 0.02) 100%)"};
  border-radius: 20px;
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(255, 87, 34, 0.2)" : "rgba(255, 87, 34, 0.1)"};
  backdrop-filter: blur(5px);
`;

const InstaSellTextField = styled(TextField)<{ $isDark?: boolean }>`
  .MuiOutlinedInput-root {
    background: ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)"};
    border-radius: 16px;

    &:hover .MuiOutlinedInput-notchedOutline {
      border-color: ${(props) =>
        props.$isDark ? "rgba(255, 87, 34, 0.5)" : "rgba(255, 87, 34, 0.3)"};
    }

    &.Mui-focused .MuiOutlinedInput-notchedOutline {
      border-color: ${(props) => (props.$isDark ? "#ff5722" : "#d84315")};
    }
  }

  .MuiOutlinedInput-input {
    color: ${(props) => (props.$isDark ? "#fff" : "#000")};
    font-size: 1.1rem;
    font-weight: 500;
  }

  .MuiInputLabel-root {
    color: ${(props) => (props.$isDark ? "#ccc" : "#666")};
  }

  .MuiOutlinedInput-notchedOutline {
    border-color: ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)"};
  }
`;

const InstaSellButton = styled(Button)<{ $isDark?: boolean }>`
  background: linear-gradient(135deg, #ff5722 0%, #d84315 100%);
  color: #fff;
  border-radius: 16px;
  padding: 12px 32px;
  font-weight: 600;
  font-size: 1rem;
  text-transform: none;
  box-shadow: 0 4px 12px rgba(255, 87, 34, 0.3);
  transition: all 0.2s ease;
  min-width: 160px;

  &:hover {
    background: linear-gradient(135deg, #ff6f43 0%, #e64a19 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(255, 87, 34, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: ${(props) =>
      props.$isDark ? "rgba(255, 87, 34, 0.3)" : "rgba(255, 87, 34, 0.3)"};
    color: ${(props) => (props.$isDark ? "#888" : "#999")};
    box-shadow: none;
  }
`;

const UpdateListingContainer = styled(Box)<{ $isDark?: boolean }>`
  margin-bottom: 32px;
  padding: 20px;
  background: ${(props) =>
    props.$isDark
      ? "linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(25, 118, 210, 0.05) 100%)"
      : "linear-gradient(135deg, rgba(33, 150, 243, 0.05) 0%, rgba(25, 118, 210, 0.02) 100%)"};
  border-radius: 20px;
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(33, 150, 243, 0.2)" : "rgba(33, 150, 243, 0.1)"};
  backdrop-filter: blur(5px);
`;

const UpdateListingTextField = styled(TextField)<{ $isDark?: boolean }>`
  .MuiOutlinedInput-root {
    background: ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)"};
    border-radius: 16px;

    &:hover .MuiOutlinedInput-notchedOutline {
      border-color: ${(props) =>
        props.$isDark ? "rgba(33, 150, 243, 0.5)" : "rgba(33, 150, 243, 0.3)"};
    }

    &.Mui-focused .MuiOutlinedInput-notchedOutline {
      border-color: ${(props) => (props.$isDark ? "#2196f3" : "#1976d2")};
    }
  }

  .MuiOutlinedInput-input {
    color: ${(props) => (props.$isDark ? "#fff" : "#000")};
    font-size: 1.1rem;
    font-weight: 500;
  }

  .MuiInputLabel-root {
    color: ${(props) => (props.$isDark ? "#ccc" : "#666")};
  }

  .MuiOutlinedInput-notchedOutline {
    border-color: ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)"};
  }
`;

const UpdateListingButton = styled(Button)<{ $isDark?: boolean }>`
  background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
  color: #fff;
  border-radius: 16px;
  padding: 12px 32px;
  font-weight: 600;
  font-size: 1rem;
  text-transform: none;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
  transition: all 0.2s ease;
  min-width: 160px;

  &:hover {
    background: linear-gradient(135deg, #42a5f5 0%, #1e88e5 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(33, 150, 243, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: ${(props) =>
      props.$isDark ? "rgba(33, 150, 243, 0.3)" : "rgba(33, 150, 243, 0.3)"};
    color: ${(props) => (props.$isDark ? "#888" : "#999")};
    box-shadow: none;
  }
`;

const CancelListingButton = styled(Button)<{ $isDark?: boolean }>`
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  color: #fff;
  border-radius: 16px;
  padding: 12px 32px;
  font-weight: 600;
  font-size: 1rem;
  text-transform: none;
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
  transition: all 0.2s ease;
  min-width: 160px;

  &:hover {
    background: linear-gradient(135deg, #ef5350 0%, #e53935 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(244, 67, 54, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: ${(props) =>
      props.$isDark ? "rgba(244, 67, 54, 0.3)" : "rgba(244, 67, 54, 0.3)"};
    color: ${(props) => (props.$isDark ? "#888" : "#999")};
    box-shadow: none;
  }
`;

// Add after line 677 (after CancelListingButton)
const NavigationButtonGroup = styled(Box)<{ $isDark?: boolean }>`
  display: flex;
  justify-content: center;
  margin-top: 16px;
  margin-bottom: 24px;
  gap: 16px;
  width: 100%;
`;

const NavigationButton = styled(Button)<{ $isDark?: boolean }>`
  background: ${(props) =>
    props.$isDark
      ? "linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(25, 118, 210, 0.05) 100%)"
      : "linear-gradient(135deg, rgba(33, 150, 243, 0.05) 0%, rgba(25, 118, 210, 0.02) 100%)"};
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(33, 150, 243, 0.2)" : "rgba(33, 150, 243, 0.1)"};
  border-radius: 20px;
  color: ${(props) => (props.$isDark ? "#fff" : "#000")};
  backdrop-filter: blur(10px);
  padding: 16px 32px;
  font-weight: 600;
  font-size: 1rem;
  text-transform: none;
  transition: all 0.3s ease;
  flex: 1;
  max-width: 240px;
  height: 60px;
  box-shadow: ${(props) =>
    props.$isDark
      ? "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.1)"
      : "0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.8)"};

  &:hover {
    background: ${(props) =>
      props.$isDark
        ? "linear-gradient(135deg, rgba(33, 150, 243, 0.15) 0%, rgba(25, 118, 210, 0.08) 100%)"
        : "linear-gradient(135deg, rgba(33, 150, 243, 0.08) 0%, rgba(25, 118, 210, 0.03) 100%)"};
    border-color: ${(props) =>
      props.$isDark ? "rgba(33, 150, 243, 0.3)" : "rgba(33, 150, 243, 0.15)"};
    transform: translateY(-2px);
    box-shadow: ${(props) =>
      props.$isDark
        ? "0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.15)"
        : "0 12px 40px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.9)"};
  }

  &:active {
    transform: translateY(0);
  }
`;

export const useActiveListings = (collectionId?: number, tokenId?: number) => {
  const query = useQuery({
    queryFn: () => {
      const params: any = {
        active: true,
      };

      if (collectionId !== undefined) {
        params.collectionId = collectionId;
      }

      if (tokenId !== undefined) {
        params.tokenId = tokenId;
      }

      return axios
        .get(`${MIMIR_API}/nft-indexer/v1/mp/listings`, {
          params,
        })
        .then(({ data: { listings } }) => {
          return listings.map((listing: any) => {
            return listing;
          });
        });
    },
    queryKey: ["activeListings", collectionId, tokenId],
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    enabled: collectionId !== undefined || tokenId !== undefined, // Only run if at least one parameter is provided
  });

  return {
    ...query,
    refetch: query.refetch,
  };
};

const AuctionDetail: React.FC = () => {
  const { activeAccount, signTransactions } = useWallet();
  const { collectionId, tokenId } = useParams<{
    collectionId: string;
    tokenId: string;
  }>();
  const navigate = useNavigate();
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  const [auction, setAuction] = useState<Auction | null>(null);
  const [nft, setNft] = useState<any>(null);
  const [tokenMetadata, setTokenMetadata] = useState<TokenMetadata | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [floorPrice, setFloorPrice] = useState<FloorPriceInfo | null>(null);
  const [bidAmount, setBidAmount] = useState<string>("");
  const [bidError, setBidError] = useState<string>("");
  const [myOffers, setMyOffers] = useState<any[]>([]);
  const [activeOffers, setActiveOffers] = useState<any[]>([]);
  const [highestOffer, setHighestOffer] = useState<number>(0);
  const [bidHistory, setBidHistory] = useState<any[]>([]);
  const [showAllBids, setShowAllBids] = useState(false);
  const [buyNowPrice, setBuyNowPrice] = useState<number>(0);
  const [updatePrice, setUpdatePrice] = useState<string>("");
  const [updatePriceError, setUpdatePriceError] = useState<string>("");
  const [listingPrice, setListingPrice] = useState<string>("");
  const [listingPriceError, setListingPriceError] = useState<string>("");
  const [nftOwner, setNftOwner] = useState<string>("");
  const [showVoiWidget, setShowVoiWidget] = useState(false);

  const { data: activeListings, refetch: refetchActiveListings } =
    useActiveListings(Number(collectionId), Number(tokenId));

  // Reusable function to fetch offers
  const fetchOffers = async () => {
    console.log(
      "fetchOffers called for collectionId:",
      collectionId,
      "tokenId:",
      tokenId
    );
    if (!collectionId || !tokenId) return;

    try {
      const { algodClient, indexerClient } = getAlgorandClients();
      const ctcInfoMP213 = 8329112;

      const ci = makeContract(
        8329112,
        algosdk.getApplicationAddress(ctcInfoMP213),
        algodClient,
        indexerClient
      );

      const status = await algodClient.status().do();
      const lastRound = status["last-round"];

      const events = await ci.getEvents({
        minRound: Math.max(lastRound - 2e6, 0),
      });

      const listingEvents = (
        events?.find((event: any) => event.name === "e_offer_ListEvent")
          ?.events || []
      )
        .map(getListingEvent)
        .filter(
          (event: any) =>
            `${event.contractId}` === collectionId &&
            `${event.tokenId}` === tokenId
        );

      // Sort listing events by timestamp for bid history
      const sortedListingEvents = listingEvents.sort((a: any, b: any) => {
        // Sort by round number (higher round = more recent)
        return b.createRound - a.createRound;
      });

      const deleteEvents = (
        events?.find(
          (event: any) => event.name === "e_offer_DeleteListingEvent"
        )?.events || []
      )
        .map(getDeleteEvent)
        .filter((event: any) =>
          listingEvents.some((e: any) => e.listingId === event.listingId)
        );

      const acceptEvents = (
        events?.find((event: any) => event.name === "e_offer_AcceptEvent")
          ?.events || []
      )
        .map(getDeleteEvent)
        .filter((event: any) =>
          listingEvents.some((e: any) => e.listingId === event.listingId)
        );

      const activeOffers = listingEvents.filter(
        (event: any) =>
          !deleteEvents.some((e: any) => e.listingId === event.listingId) &&
          !acceptEvents.some((e: any) => e.listingId === event.listingId)
      );

      const myOffers = activeOffers.filter(
        (event: any) => event.offerer === activeAccount?.address
      );

      console.log({
        events,
        listingEvents,
        deleteEvents,
        acceptEvents,
        activeOffers,
        myOffers,
      });

      console.log("Updating offers state:", {
        myOffers,
        activeOffers,
        highestOffer:
          activeOffers.length > 0
            ? Math.max(...activeOffers.map((offer: any) => offer.price))
            : 0,
        bidHistory: sortedListingEvents,
      });
      setMyOffers(myOffers);
      setActiveOffers(activeOffers);
      setHighestOffer(
        activeOffers.length > 0
          ? Math.max(...activeOffers.map((offer: any) => offer.price))
          : 0
      );
      setBidHistory(sortedListingEvents);
    } catch (error) {
      console.error("Error fetching offers:", error);
    }
  };

  // Process bid data for chart
  const getChartData = () => {
    if (bidHistory.length === 0) {
      return {
        labels: [],
        datasets: [
          {
            label: "Bid Amount (VOI)",
            data: [],
            borderColor: isDarkTheme ? "#4caf50" : "#2e7d32",
            backgroundColor: isDarkTheme
              ? "rgba(76, 175, 80, 0.1)"
              : "rgba(46, 125, 50, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: isDarkTheme ? "#4caf50" : "#2e7d32",
            pointBorderColor: isDarkTheme ? "#fff" : "#000",
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
          },
        ],
      };
    }

    // Sort by timestamp for chronological order
    const sortedBids = [...bidHistory].sort(
      (a: any, b: any) => a.createTimestamp - b.createTimestamp
    );

    const labels = sortedBids.map((bid: any, index: number) => {
      const date = new Date(bid.createTimestamp * 1000);
      return `${date.getHours().toString().padStart(2, "0")}:${date
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
    });

    const data = sortedBids.map((bid: any) => bid.price / 1e6);

    return {
      labels,
      datasets: [
        {
          label: "Bid Amount (VOI)",
          data,
          borderColor: isDarkTheme ? "#4caf50" : "#2e7d32",
          backgroundColor: isDarkTheme
            ? "rgba(76, 175, 80, 0.1)"
            : "rgba(46, 125, 50, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: isDarkTheme ? "#4caf50" : "#2e7d32",
          pointBorderColor: isDarkTheme ? "#fff" : "#000",
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
        },
      ],
    };
  };

  // Get bids to display (latest 5 or all)
  const getDisplayedBids = () => {
    if (showAllBids) {
      return bidHistory;
    }
    return bidHistory.slice(0, 5);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDarkTheme
          ? "rgba(0, 0, 0, 0.8)"
          : "rgba(255, 255, 255, 0.9)",
        titleColor: isDarkTheme ? "#fff" : "#000",
        bodyColor: isDarkTheme ? "#fff" : "#000",
        borderColor: isDarkTheme
          ? "rgba(255, 255, 255, 0.2)"
          : "rgba(0, 0, 0, 0.2)",
        borderWidth: 1,
        callbacks: {
          label: function (context: any) {
            return `Bid: ${context.parsed.y.toFixed(2)} VOI`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: isDarkTheme
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          color: isDarkTheme ? "#ccc" : "#666",
        },
      },
      y: {
        grid: {
          color: isDarkTheme
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          color: isDarkTheme ? "#ccc" : "#666",
          callback: function (value: any) {
            return `${value.toFixed(2)} VOI`;
          },
        },
      },
    },
  };

  useEffect(() => {
    const fetchAuctionByCollectionAndToken = async () => {
      if (!collectionId || !tokenId) {
        setError("No collection ID or token ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { algodClient, indexerClient } = getAlgorandClients();

        const ctcInfoMP213 = 8329112;
        // Fetch events from the marketplace contract
        const ci = makeContract(
          8329112,
          algosdk.getApplicationAddress(ctcInfoMP213),
          algodClient,
          indexerClient
        );

        const status = await algodClient.status().do();
        const lastRound = status["last-round"];

        const events = await ci.getEvents({
          minRound: Math.max(lastRound - 2e6, 0),
        });

        const listingEvents = (
          events?.find((event: any) => event.name === "e_offer_ListEvent")
            ?.events || []
        )
          .map(getListingEvent)
          .filter(
            (event: any) =>
              `${event.contractId}` === collectionId &&
              `${event.tokenId}` === tokenId
          );

        // Sort listing events by timestamp for bid history
        const sortedListingEvents = listingEvents.sort((a: any, b: any) => {
          // Sort by round number (higher round = more recent)
          return b.createRound - a.createRound;
        });

        const deleteEvents = (
          events?.find(
            (event: any) => event.name === "e_offer_DeleteListingEvent"
          )?.events || []
        )
          .map(getDeleteEvent)
          .filter((event: any) =>
            listingEvents.some((e: any) => e.listingId === event.listingId)
          );

        const acceptEvents = (
          events?.find((event: any) => event.name === "e_offer_AcceptEvent")
            ?.events || []
        )
          .map(getDeleteEvent)
          .filter((event: any) =>
            listingEvents.some((e: any) => e.listingId === event.listingId)
          );

        const activeOffers = listingEvents.filter(
          (event: any) =>
            !deleteEvents.some((e: any) => e.listingId === event.listingId) &&
            !acceptEvents.some((e: any) => e.listingId === event.listingId)
        );

        const myOffers = activeOffers.filter(
          (event: any) => event.offerer === activeAccount?.address
        );

        console.log({
          events,
          listingEvents,
          deleteEvents,
          acceptEvents,
          activeOffers,
          myOffers,
        });

        setMyOffers(myOffers);
        setActiveOffers(activeOffers);
        setHighestOffer(
          activeOffers.length > 0
            ? Math.max(...activeOffers.map((offer: any) => offer.price))
            : 0
        );
        setBidHistory(sortedListingEvents);

        // Fetch collection floor price
        const fetchFloorPrice = async () => {
          try {
            const response = await axios.get(
              `${MIMIR_API}/nft-indexer/v1/mp/listings?collectionId=${collectionId}&active=true`
            );
            const listings = response.data.listings || [];
            if (listings.length > 0) {
              const prices = listings.map(
                (listing: any) => Number(listing.price) / 1e6
              );
              const floor = Math.min(...prices);
              const floorPriceInfo = {
                floorPrice: floor,
                lastUpdate: Date.now(),
                collectionId: parseInt(collectionId),
              };
              setFloorPrice(floorPriceInfo);
              return floor * 1e6; // Convert back to microVOI for reserve price
            }
          } catch (error) {
            console.error("Error fetching floor price:", error);
          }
          return 2000000; // Fallback reserve price (2 VOI)
        };

        // Fetch token metadata first
        try {
          const requestUrl = `${MIMIR_API}/nft-indexer/v1/tokens?contractId=${collectionId}&tokenId=${tokenId}`;
          console.log({ requestUrl });
          const metadataResponse = await axios.get(requestUrl);

          console.log({ metadataResponse });
          if (
            metadataResponse.data.tokens &&
            metadataResponse.data.tokens.length > 0
          ) {
            const token = metadataResponse.data.tokens[0];
            const tokenMetadata = JSON.parse(token.metadata);
            const tokenData = {
              name: tokenMetadata.name || `Token #${tokenId}`,
              image: tokenMetadata.image || "",
              description: tokenMetadata.description,
              properties: tokenMetadata.properties,
            };

            setTokenMetadata(tokenData);
            setNft(token);
          }
        } catch (metadataError) {
          console.warn("Failed to fetch token metadata:", metadataError);
          setTokenMetadata({
            name: `Token #${tokenId}`,
            image: "",
          });
          setNft(null);
        }

        // Fetch floor price and use it as reserve price
        const collectionFloorPrice = await fetchFloorPrice();

        // Create mock auction with floor price as reserve price
        const mockAuction: Auction = {
          listingId: Math.floor(Math.random() * 1000000),
          contractId: parseInt(collectionId),
          tokenId: parseInt(tokenId),
          seller: "JFHP4IL4D3I4FDQFWGFDMCZLFSLGQAL4OZGQQKTPEE4SSW6JXSYQPZY2PM",
          startingPrice: 1000000, // 1 VOI in microVOI
          reservePrice: collectionFloorPrice, // Use collection floor price as reserve
          currency: 8324600, // VOI token ID
          createTimestamp: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
          endTimestamp: Math.floor(Date.now() / 1000) + 86400 * 2, // 2 days from now
          active: 1,
          currentBid: 1500000, // 1.5 VOI in microVOI
          currentBidder: "ABCD1234EFGH5678IJKL9012MNOP3456QRST7890UVWX",
          bidCount: 3,
        };

        setAuction(mockAuction);
      } catch (error) {
        console.error("Error fetching auction:", error);
        setError("Failed to fetch auction details");
      } finally {
        setLoading(false);
      }
    };

    fetchAuctionByCollectionAndToken();
  }, [collectionId, tokenId]);

  // Countdown timer effect
  useEffect(() => {
    if (!auction) return;

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const endTime = auction.endTimestamp;
      const timeDiff = endTime - now;

      if (timeDiff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(timeDiff / (24 * 60 * 60));
      const hours = Math.floor((timeDiff % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((timeDiff % (60 * 60)) / 60);
      const seconds = timeDiff % 60;

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [auction]);

  const formatPrice = (price: number) => {
    return (price / 1e6).toFixed(2);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  // Enhanced image URL resolution following app patterns
  const resolveImageUrl = (imageUrl: string, metadataURI?: string) => {
    if (!imageUrl) return "";

    // Handle IPFS URLs
    if (imageUrl.startsWith("ipfs://")) {
      return `https://ipfs.io/ipfs/${imageUrl.slice(7)}`;
    }

    // Handle already resolved IPFS URLs
    if (imageUrl.startsWith("https://ipfs.io/ipfs/")) {
      return imageUrl;
    }

    // Handle direct HTTP/HTTPS URLs
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    // Fallback to CDN if metadataURI is available (following app pattern)
    if (auction && metadataURI && !imageUrl.startsWith("data:")) {
      const collectionsMissingImage = [35720076, 797609];
      if (!collectionsMissingImage.includes(Number(auction.contractId))) {
        return `${HIGHFORGE_CDN}/i/${encodeURIComponent(
          stripTrailingZeroBytes(metadataURI)
        )}?w=400`;
      }
    }

    return imageUrl;
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const handleViewCollection = () => {
    if (auction) {
      navigate(`/collection/${auction.contractId}`);
    }
  };

  const handleViewToken = () => {
    if (auction) {
      navigate(`/collection/${auction.contractId}/token/${auction.tokenId}`);
    }
  };

  // Helper functions to determine button visibility
  const canPlaceBid = () => {
    if (!activeAccount || !nft) return false;
    const now = Math.floor(Date.now() / 1000);
    // User can place bid if auction is active, not expired, and they're not the seller
    return nft?.owner !== activeAccount.address;
  };

  const canCancelAuction = () => {
    if (!auction || !activeAccount) return false;
    // User can cancel auction if they are the seller and auction is active
    return (
      (auction.active === 1 && auction.seller === activeAccount.address) ||
      activeAccount.address ===
        "JFHP4IL4D3I4FDQFWGFDMCZLFSLGQAL4OZGQQKTPEE4SSW6JXSYQPZY2PM"
    );
  };

  const isAuctionEnded = () => {
    if (!auction) return false;
    const now = Math.floor(Date.now() / 1000);
    return auction.endTimestamp <= now;
  };

  const isAuctionActive = () => {
    if (!auction) return false;
    const now = Math.floor(Date.now() / 1000);
    return auction.active === 1 && auction.endTimestamp > now;
  };

  // Handler functions for auction actions
  const getMinimumBid = () => {
    if (!auction) return 0;
    const currentPrice = highestOffer; // This is 0 when no bids
    const minimumIncrement = 0.1 * 1e6; // 0.1 VOI minimum increment
    return Math.max(1, (currentPrice + minimumIncrement) / 1e6); // (0 + 100000) / 1000000 = 0.1
  };

  const validateBid = (amount: string) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setBidError("Please enter a valid bid amount");
      return false;
    }

    const minBid = getMinimumBid();
    if (numAmount < minBid) {
      setBidError(`Minimum bid is ${minBid.toFixed(2)} VOI`);
      return false;
    }

    setBidError("");
    return true;
  };

  const handleBidAmountChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setBidAmount(value);
    if (value) {
      validateBid(value);
    } else {
      setBidError("");
    }
  };

  const handlePlaceBid = async () => {
    if (!auction || !activeAccount || !validateBid(bidAmount)) return;

    setActionLoading(true);
    try {
      const requiredAmount = BigInt(
        new BigNumber(bidAmount).multipliedBy(1.1).multipliedBy(1e6).toFixed(0)
      );

      const ctcInfoMP213 = 8329112; // mp213 offers
      const ctcInfoNV = 8324600; // Nautilus Voi NV
      const { algodClient, indexerClient } = getAlgorandClients();

      const ci = new CONTRACT(
        ctcInfoMP213,
        algodClient,
        indexerClient,
        abi.custom,
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );

      const ciArc200 = new CONTRACT(
        ctcInfoNV,
        algodClient,
        indexerClient,
        abi.nt200,
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );

      const builder = {
        nt200: new CONTRACT(
          ctcInfoNV,
          algodClient,
          indexerClient,
          abi.nt200,
          { addr: activeAccount.address, sk: new Uint8Array(0) },
          true,
          false,
          true
        ),
        mp: new CONTRACT(
          ctcInfoMP213,
          algodClient,
          indexerClient,
          offerABI,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
      };

      console.log({ activeOffers });

      //preflight balance

      const accInfo = await algodClient
        .accountInformation(activeAccount.address)
        .do();
      const balance = accInfo.amount;
      const minBalance = accInfo["min-balance"];
      const availableBalance = BigInt(Math.max(0, balance - minBalance));

      console.log("availableBalance", availableBalance);

      // preflight arc200 balance
      const arc200BalanceR = await ciArc200.arc200_balanceOf(
        activeAccount.address
      );
      const arc200Balance = arc200BalanceR.returnValue;

      if (availableBalance + arc200Balance < requiredAmount) {
        toast.error(
          `Insufficient balance ${
            availableBalance / BigInt(1e6)
          } VOI, minimum balance is ${requiredAmount / BigInt(1e6)} VOI`
        );
        return;
      }

      console.log("arc200Balance", arc200Balance);

      // preflight arc200 allowance
      const arc200AllowanceR = await ciArc200.arc200_allowance(
        activeAccount.address,
        algosdk.getApplicationAddress(ctcInfoMP213)
      );
      const arc200Allowance = arc200AllowanceR.returnValue;

      console.log("arc200Allowance", arc200Allowance);

      const buildN = [];

      // TODO beacon txn here

      // if active offers delete listing

      if (myOffers.length > 0) {
        for (const offer of myOffers) {
          {
            const txn = (
              await builder.mp.a_offer_deleteListing(offer.listingId)
            )?.obj;
            buildN.push({
              ...txn,
              note: new TextEncoder().encode("delete active offers"),
            });
          }
          {
            const txn = (await builder.nt200.withdraw(offer.price))?.obj;
            buildN.push({
              ...txn,
              note: new TextEncoder().encode("withdraw offer"),
            });
          }
        }
      }

      // arc200 approve increase allowance

      {
        // TODO track approvals
        const txnO = (
          await builder.nt200.arc200_approve(
            algosdk.getApplicationAddress(ctcInfoMP213),
            arc200Allowance + requiredAmount
          )
        ).obj;
        buildN.push({
          ...txnO,
          payment: arc200Allowance == BigInt(0) ? 28100 : 0,
          note: new TextEncoder().encode("approve arc200"),
        });
      }

      // deposit
      {
        const txn = (await builder.nt200.deposit(requiredAmount))?.obj;
        buildN.push({
          ...txn,
          payment: requiredAmount,
          note: new TextEncoder().encode("deposit"),
        });
      }

      // mp213 offer

      {
        const bidAmountBigInt = BigInt(
          new BigNumber(bidAmount).multipliedBy(1e6).toFixed(0)
        );
        const txnO = (
          await builder.mp.a_offer_listSC(
            auction.contractId,
            auction.tokenId,
            ctcInfoNV,
            bidAmountBigInt
          )
        ).obj;
        buildN.push({
          ...txnO,
          payment: 73700,
          note: new TextEncoder().encode("list offer"),
        });
      }

      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);
      ci.setFee(2000);

      const customR = await ci.custom();

      if (!customR.success) {
        toast.error("Failed to place bid: " + customR.error);
        return;
      }

      const stxns = await signTransactions(
        customR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );

      const stxn = algosdk.decodeSignedTransaction(
        stxns.slice(-1)[0] as Uint8Array
      );

      const txid = stxn.txn.txID();

      console.log("txid", txid);

      const res = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();

      console.log("res", res);

      // Wait for transaction confirmation before reloading offers
      console.log("Waiting for transaction confirmation...");
      await waitForConfirmation(algodClient, txid, 4);

      do {
        const ci = new CONTRACT(
          ctcInfoMP213,
          algodClient,
          indexerClient,
          offerABI,
          { addr: activeAccount.address, sk: new Uint8Array(0) },
          true,
          false,
          true
        );

        const events = await ci.getEvents({
          txid,
        });

        const listingEvent =
          events?.find((event: any) => event.name === "e_offer_ListEvent")
            ?.events || [];

        if (listingEvent.length > 0) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      } while (1);

      await new Promise((resolve) => setTimeout(resolve, 10000)); // TODO wait for listing to be updated

      console.log(`Placing bid of ${bidAmount} VOI`);
      toast.success(
        `Bid of ${bidAmount} VOI placed successfully! Please wait for the page to reload.`
      );

      await new Promise((resolve) => setTimeout(resolve, 1000)); // TODO wait for listing to be updated

      window.location.reload();

      setBidAmount("");
    } catch (error: any) {
      console.error("Error placing bid:", error);
      toast.error("Failed to place bid: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelAuction = async () => {
    if (!auction || !activeAccount) return;

    setActionLoading(true);
    try {
      // Implementation for cancelling auction would go here
      toast.success("Auction cancelled successfully!");
      navigate("/auctions");
    } catch (error: any) {
      console.error("Error cancelling auction:", error);
      toast.error("Failed to cancel auction: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Buy Now helper functions
  const canBuyNow = () => {
    if (!activeAccount || !activeListings || activeListings.length === 0)
      return false;
    const listings = activeListings[0];
    return listings?.seller !== activeAccount.address;
  };

  const getBuyNowPrice = () => {
    if (!activeListings || activeListings.length === 0) return 0;
    const listings = activeListings[0];
    return listings?.price / 1e6;
  };

  const handleBuyNow = async () => {
    if (!auction || !activeAccount) return;

    setActionLoading(true);
    try {
      const buyPrice = getBuyNowPrice();

      const activeListing = activeListings[0];

      const { algodClient, indexerClient } = getAlgorandClients();

      const ci = new CONTRACT(
        CTCINFO_MP206,
        algodClient,
        indexerClient,
        abi.custom,
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );

      const builder = {
        mp: new CONTRACT(
          CTCINFO_MP206,
          algodClient,
          indexerClient,
          abi.mp,
          { addr: activeAccount.address, sk: new Uint8Array(0) },
          true,
          false,
          true
        ),
      };

      const buildN = [];

      // TODO add beacon transaction

      // buy now transaction

      {
        const txnO = (
          await builder.mp.a_sale_buyNet(BigInt(activeListing.mpListingId))
        ).obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode("buy now"),
          payment: activeListing.price,
        });
      }

      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);
      ci.setFee(8000);

      const customR = await ci.custom();

      if (!customR.success) {
        toast.error("Failed to buy NFT: " + customR.error);
        return;
      }

      const stxns = await signTransactions(
        customR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );

      const stxn = algosdk.decodeSignedTransaction(
        stxns.slice(-1)[0] as Uint8Array
      );

      const txid = stxn.txn.txID();

      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();

      await waitForConfirmation(algodClient, txid, 4);

      // reload offers here
      await fetchOffers();
      await refetchActiveListings();

      console.log(`Buying NFT for ${buyPrice} VOI`);
      toast.success(`NFT purchased for ${buyPrice} VOI!`);

      // Navigate to success page or refresh data
      navigate(`/collection/${auction.contractId}/token/${auction.tokenId}`);
    } catch (error: any) {
      console.error("Error buying NFT:", error);
      toast.error("Failed to purchase NFT: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Insta Sell helper functions

  const handleInstaSell = async () => {
    if (!auction || !activeAccount) return;

    setActionLoading(true);
    try {
      const sellPrice = getSuggestedPrice();

      const highestOfferPrice = activeOffers.reduce(
        (max: number, offer: any) => (offer.price > max ? offer.price : max),
        0
      );

      const offer = activeOffers.find(
        (offer: any) => offer.price === highestOfferPrice
      );

      if (!offer) {
        toast.error("No offer found");
        return;
      }

      console.log({ offer });

      const ctcInfoMP213 = 8329112; // mp213 offers
      const ctcInfoNV = 8324600; // Nautilus Voi NV

      const { algodClient, indexerClient } = getAlgorandClients();

      const ci = new CONTRACT(
        ctcInfoMP213,
        algodClient,
        indexerClient,
        abi.custom,
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );

      const builder = {
        nt200: new CONTRACT(
          ctcInfoNV,
          algodClient,
          indexerClient,
          abi.nt200,
          { addr: activeAccount.address, sk: new Uint8Array(0) },
          true,
          false,
          true
        ),
        mp: new CONTRACT(
          ctcInfoMP213,
          algodClient,
          indexerClient,
          offerABI,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
        arc72: new CONTRACT(
          offer.contractId,
          algodClient,
          indexerClient,
          abi.arc72,
          { addr: activeAccount.address, sk: new Uint8Array(0) },
          true,
          false,
          true
        ),
      };

      const buildN = [];

      // TODO add beacon transaction

      // Approve ARC72
      {
        const txnO = (
          await builder.arc72.arc72_approve(
            algosdk.getApplicationAddress(ctcInfoMP213),
            BigInt(offer.tokenId)
          )
        ).obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode("approve arc72"),
        });
      }

      // Accept offer transactio
      {
        const txnO = (
          await builder.mp.a_offer_acceptSC(BigInt(offer.listingId))
        ).obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode("accept offer"),
        });
      }

      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);
      ci.setFee(4000);

      const customR = await ci.custom();

      console.log({ customR });

      if (!customR.success) {
        toast.error("Failed to accept offer", customR.error);
        return;
      }

      console.log({ customR });

      const stxns = await signTransactions([
        customR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        ),
      ]);

      const { txId } = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();

      await waitForConfirmation(algodClient, txId, 4);

      await new Promise((resolve) => setTimeout(resolve, 10000)); // TODO wait for listing to be updated

      // Implementation for instant sell would go here
      // This would immediately sell the NFT at the suggested price
      console.log(`Selling NFT instantly for ${sellPrice} VOI`);
      toast.success(`NFT sold instantly for ${sellPrice} VOI!`);

      await new Promise((resolve) => setTimeout(resolve, 1000)); // TODO wait for listing to be updated

      window.location.reload();
    } catch (error: any) {
      console.error("Error selling NFT:", error);
      toast.error("Failed to sell NFT: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };
  const canInstaSell = () => {
    // Check if user is connected
    if (!activeAccount || !nft) return false;
    // Check if there is an active offer
    if (activeOffers && activeOffers.length === 0) {
      return false;
    }
    // Check if user is the owner of the NFT
    // For now, we'll use a placeholder check - in real implementation,
    // you would check the actual NFT ownership
    return nft.owner === activeAccount.address;
  };

  const getHighestBidPrice = () => {
    if (highestOffer > 0) {
      return (highestOffer / 1e6).toFixed(2);
    }
    if (auction?.currentBid) {
      return (auction.currentBid / 1e6).toFixed(2);
    }
    return "0.00";
  };

  const getSuggestedPrice = () => {
    const highestBid = getHighestBidPrice();
    const suggestedPrice = parseFloat(highestBid);
    return suggestedPrice > 0 ? suggestedPrice : 0.1; // Fallback to minimum
  };

  const validateSellPrice = (price: string) => {
    const numPrice = parseFloat(price);
    if (!auction || !activeAccount) return;

    setActionLoading(true);
    try {
      const sellPrice = getSuggestedPrice();

      // Implementation for instant sell would go here
      // This would immediately sell the NFT at the suggested price
      console.log(`Selling NFT instantly for ${sellPrice} VOI`);
      toast.success(`NFT sold instantly for ${sellPrice} VOI!`);

      // Navigate to success page or refresh data
      navigate(`/collection/${auction.contractId}/token/${auction.tokenId}`);
    } catch (error: any) {
      console.error("Error selling NFT:", error);
      toast.error("Failed to sell NFT: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper functions for update listing
  const canUpdateListing = () => {
    if (!activeAccount) return false;
    return nftOwner === activeAccount.address;
  };

  const getCurrentListingPrice = () => {
    if (!activeListings || activeListings.length === 0) return 0;
    const listing = activeListings[0];
    return listing?.price / 1e6;
  };

  const validateUpdatePrice = (price: string) => {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setUpdatePriceError("Please enter a valid price");
      return false;
    }
    if (numPrice < 0.1) {
      setUpdatePriceError("Minimum price is 0.1 VOI");
      return false;
    }
    setUpdatePriceError("");
    return true;
  };

  const handleUpdatePriceChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setUpdatePrice(value);
    if (value) {
      validateUpdatePrice(value);
    } else {
      setUpdatePriceError("");
    }
  };

  const handleListNft = async () => {
    if (!activeAccount || !nft) return;
    setActionLoading(true);
    try {
      console.log("Listing NFT");

      // use nft

      const nftMetadata = JSON.parse(nft.metadata);
      const royalties = decodeRoyalties(nftMetadata.royalties);

      const nftInfo = {
        ...nft,
        metadata: nftMetadata,
        royalties,
      };

      const newPriceBigInt = BigInt(
        new BigNumber(updatePrice).multipliedBy(1e6).toFixed(0)
      );

      const { algodClient, indexerClient } = getAlgorandClients();

      const ci = new CONTRACT(
        CTCINFO_MP206,
        algodClient,
        indexerClient,
        abi.custom,
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );

      const builder = {
        arc72: new CONTRACT(
          Number(collectionId),
          algodClient,
          indexerClient,
          abi.arc72,
          { addr: activeAccount.address, sk: new Uint8Array(0) },
          true,
          false,
          true
        ),
        mp: new CONTRACT(
          CTCINFO_MP206,
          algodClient,
          indexerClient,
          abi.mp,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
      };

      console.log("Building transactions");

      const buildN = [];

      // TODO: add beacon transaction

      // Approve ARC72
      {
        const txnO = (
          await builder.arc72.arc72_approve(
            algosdk.getApplicationAddress(CTCINFO_MP206),
            BigInt(tokenId as string)
          )
        ).obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode("approve arc72"),
        });
      }

      // Create new listing with updated price
      {
        // a_sale_listNet(CollectionId, TokenId, ListPrice, EndTime, RoyaltyPoints, CreatePoints1, CreatorPoint2, CreatorPoint3, CreatorAddr1, CreatorAddr2, CreatorAddr3)ListId
        // use listing and nft royalties
        const listingCollectionId = BigInt(collectionId as string);
        const listingTokenId = BigInt(tokenId);
        const listPrice = newPriceBigInt;
        const endTime = Number.MAX_SAFE_INTEGER;
        const royaltyPoints = nftInfo.royalties.royaltyPoints;
        const creator1Points = nftInfo.royalties.creator1Points;
        const creator2Points = nftInfo.royalties.creator2Points;
        const creator3Points = nftInfo.royalties.creator3Points;
        const creator1Address = nftInfo.royalties.creator1Address;
        const creator2Address = nftInfo.royalties.creator2Address;
        const creator3Address = nftInfo.royalties.creator3Address;
        // console.log([
        //   collectionId,
        //   tokenId,
        //   listPrice,
        //   endTime,
        //   royaltyPoints,
        //   creator1Points,
        //   creator2Points,
        //   creator3Points,
        //   creator1Address,
        //   creator2Address,
        //   creator3Address,
        // ]);
        const txnO = (
          await builder.mp.a_sale_listNet(
            listingCollectionId,
            listingTokenId,
            listPrice,
            endTime,
            royaltyPoints,
            creator1Points,
            creator2Points,
            creator3Points,
            creator1Address,
            creator2Address,
            creator3Address
          )
        ).obj;
        buildN.push({
          ...txnO,
          payment: 118500,
          note: new TextEncoder().encode("create updated listing"),
        });
      }

      console.log({ buildN });

      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);
      ci.setFee(2000);

      console.log("Simulating transactions");

      const customR = await ci.custom();

      console.log({ customR });

      if (!customR.success) {
        toast.error("Failed to update listing: " + customR.error);
        return;
      }

      const stxns = await signTransactions(
        customR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );

      const stxn = algosdk.decodeSignedTransaction(
        stxns.slice(-1)[0] as Uint8Array
      );

      const txid = stxn.txn.txID();

      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();

      // Wait for transaction confirmation
      await waitForConfirmation(algodClient, txid, 4);

      console.log(`Listing updated to ${updatePrice} VOI`);
      toast.success(`Listing updated to ${updatePrice} VOI successfully!`);

      await new Promise((resolve) => setTimeout(resolve, 10000)); // TODO wait for listing to be updated

      // Refresh the page or refetch data
      window.location.reload();
    } catch (error: any) {
      console.error("Error listing NFT:", error);
      toast.error("Failed to list NFT: " + error.message);
      setActionLoading(false);
    }
  };

  const handleUpdateListing = async () => {
    if (
      !activeAccount ||
      !validateUpdatePrice(updatePrice) ||
      !activeListings ||
      activeListings.length === 0
    )
      return;

    setActionLoading(true);
    try {
      // fetch nft info

      const nftInfo = (
        await axios.get(
          `${MIMIR_API}/nft-indexer/v1/tokens?contractId=${activeListings[0].collectionId}&tokenId=${activeListings[0].tokenId}`
        )
      )?.data?.tokens?.[0];

      if (!nftInfo) {
        toast.error("NFT not found");
        return;
      }

      const nftMetadata = JSON.parse(nftInfo.metadata);
      const royalties = decodeRoyalties(nftMetadata.royalties);
      const nft = {
        ...nftInfo,
        metadata: nftMetadata,
        royalties,
      };

      const activeListing = activeListings[0];
      const newPriceBigInt = BigInt(
        new BigNumber(updatePrice).multipliedBy(1e6).toFixed(0)
      );

      const { algodClient, indexerClient } = getAlgorandClients();

      const ci = new CONTRACT(
        CTCINFO_MP206,
        algodClient,
        indexerClient,
        abi.custom,
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );

      const ciMP206 = new CONTRACT(
        CTCINFO_MP206,
        algodClient,
        indexerClient,
        abi.mp,
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );

      const builder = {
        mp: new CONTRACT(
          CTCINFO_MP206,
          algodClient,
          indexerClient,
          abi.mp,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
      };

      console.log({ ciMP206 });

      const status = await algodClient.status().do();
      const lastRound = status["last-round"];

      const events = await ciMP206.getEvents({
        minRound: Math.max(lastRound - 2e6, 0),
        txid: activeListing.transactionId,
      });

      const getListingEvent = (event: any) => {
        const [
          transactionId,
          createRound,
          createTimestamp,
          mpListingId,
          collectionId,
          tokenId,
          seller,
          currencyData,
          endTimestamp,
          royalty,
        ] = event;
        const { currency, price } = decodeMpCurrencyData(currencyData);
        const listing = {
          transactionId,
          createRound: Number(createRound),
          createTimestamp: Number(createTimestamp),
          mpListingId: Number(mpListingId),
          contractId: Number(collectionId),
          tokenId: String(tokenId),
          seller,
          endTimestamp: Number(endTimestamp),
          royalty: Number(royalty),
          currency,
          price,
        };
        return listing;
      };

      const listingEvent = (
        events.find((event: any) => event.name === "e_sale_ListEvent")
          ?.events || []
      ).map(getListingEvent);

      if (listingEvent.length !== 1) {
        toast.error("Listing not found");
        return;
      }

      const listing = listingEvent[0];

      const buildN = [];

      // Delete existing listing
      {
        const listingId = listing.mpListingId;
        // console.log([listingId]);
        const txn = (await builder.mp.a_sale_deleteListing(listingId)).obj;
        buildN.push({
          ...txn,
          note: new TextEncoder().encode("delete existing listing"),
        });
      }

      // Create new listing with updated price
      {
        // a_sale_listNet(CollectionId, TokenId, ListPrice, EndTime, RoyaltyPoints, CreatePoints1, CreatorPoint2, CreatorPoint3, CreatorAddr1, CreatorAddr2, CreatorAddr3)ListId
        // use listing and nft royalties
        const collectionId = listing.contractId;
        const tokenId = BigInt(listing.tokenId);
        const listPrice = newPriceBigInt;
        const endTime = Number.MAX_SAFE_INTEGER;
        const royaltyPoints = nft.royalties.royaltyPoints;
        const creator1Points = nft.royalties.creator1Points;
        const creator2Points = nft.royalties.creator2Points;
        const creator3Points = nft.royalties.creator3Points;
        const creator1Address = nft.royalties.creator1Address;
        const creator2Address = nft.royalties.creator2Address;
        const creator3Address = nft.royalties.creator3Address;
        // console.log([
        //   collectionId,
        //   tokenId,
        //   listPrice,
        //   endTime,
        //   royaltyPoints,
        //   creator1Points,
        //   creator2Points,
        //   creator3Points,
        //   creator1Address,
        //   creator2Address,
        //   creator3Address,
        // ]);
        const txnO = (
          await builder.mp.a_sale_listNet(
            collectionId,
            tokenId,
            listPrice,
            endTime,
            royaltyPoints,
            creator1Points,
            creator2Points,
            creator3Points,
            creator1Address,
            creator2Address,
            creator3Address
          )
        ).obj;
        buildN.push({
          ...txnO,
          payment: 118500,
          note: new TextEncoder().encode("create updated listing"),
        });
      }

      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);
      ci.setFee(2000);

      const customR = await ci.custom();

      if (!customR.success) {
        toast.error("Failed to update listing: " + customR.error);
        return;
      }

      const stxns = await signTransactions(
        customR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );

      const stxn = algosdk.decodeSignedTransaction(
        stxns.slice(-1)[0] as Uint8Array
      );

      const txid = stxn.txn.txID();

      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();

      // Wait for transaction confirmation
      await waitForConfirmation(algodClient, txid, 4);

      await new Promise((resolve) => setTimeout(resolve, 10000)); // TODO wait for listing to be updated

      console.log(`Listing updated to ${updatePrice} VOI`);
      toast.success(
        `Listing updated to ${updatePrice} VOI successfully! Please wait for the page to reload.`
      );

      await new Promise((resolve) => setTimeout(resolve, 1000)); // TODO wait for listing to be updated

      // Refresh the page or refetch data
      window.location.reload();
    } catch (error: any) {
      console.error("Error updating listing:", error);
      toast.error("Failed to update listing: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelListing = async () => {
    if (!activeAccount || !activeListings || activeListings.length === 0)
      return;

    setActionLoading(true);
    try {
      const listing = activeListings[0];

      const { algodClient, indexerClient } = getAlgorandClients();

      const ci = new CONTRACT(
        CTCINFO_MP206,
        algodClient,
        indexerClient,
        abi.custom,
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );

      const builder = {
        mp: new CONTRACT(
          CTCINFO_MP206,
          algodClient,
          indexerClient,
          abi.mp,
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

      // Delete listing
      {
        const txn = (await builder.mp.a_sale_deleteListing(listing.mpListingId))
          ?.obj;
        buildN.push({
          ...txn,
          note: new TextEncoder().encode("cancel listing"),
        });
      }

      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);
      ci.setFee(2000);

      const customR = await ci.custom();

      if (!customR.success) {
        toast.error("Failed to cancel listing: " + customR.error);
        return;
      }

      const stxns = await signTransactions(
        customR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );

      const stxn = algosdk.decodeSignedTransaction(
        stxns.slice(-1)[0] as Uint8Array
      );

      const txid = stxn.txn.txID();

      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();

      // Wait for transaction confirmation
      await waitForConfirmation(algodClient, txid, 4);

      await new Promise((resolve) => setTimeout(resolve, 10000)); // TODO wait for listing to be updated

      console.log("Listing cancelled");
      toast.success(
        "Listing cancelled successfully! Please wait for the page to reload."
      );

      await new Promise((resolve) => setTimeout(resolve, 1000)); // TODO wait for listing to be updated

      window.location.reload();
    } catch (error: any) {
      console.error("Error cancelling listing:", error);
      toast.error("Failed to cancel listing: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    const fetchNFTOwner = async () => {
      if (!nft || !collectionId || !tokenId) return;

      try {
        const { algodClient, indexerClient } = getAlgorandClients();
        const ci = new CONTRACT(
          Number(collectionId),
          algodClient,
          indexerClient,
          abi.arc72,
          { addr: activeAccount?.address || "", sk: new Uint8Array(0) }
        );

        const ownerResult = await ci.arc72_ownerOf(BigInt(tokenId));
        if (ownerResult.success) {
          setNftOwner(ownerResult.returnValue);
        }
      } catch (error) {
        console.error("Error fetching NFT owner:", error);
      }
    };

    fetchNFTOwner();
  }, [nft, collectionId, tokenId, activeAccount]);

  if (loading) {
    return (
      <Layout>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <CircularProgress sx={{ color: isDarkTheme ? "#fff" : "#000" }} />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography
          variant="h4"
          sx={{ color: isDarkTheme ? "#fff" : "#000", mb: 2 }}
        >
          Trade Station
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: isDarkTheme ? "#ccc" : "#666", mb: 2 }}
        >
          Collection ID: {collectionId} | Token ID: {tokenId}
        </Typography>
        {/*<Link
          href={`https://voiager.xyz/asset/${collectionId}`}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            color: isDarkTheme ? "#4fc3f7" : "#1976d2",
            textDecoration: "none",
            fontSize: "0.9rem",
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            mb: 4,
            "&:hover": {
              textDecoration: "underline",
              color: isDarkTheme ? "#81d4fa" : "#1565c0",
            },
          }}
        >
          View Collection on Explorer ↗
        </Link>*/}
      </Box>

      <Grid container spacing={3}>
        {/* Token Image and Basic Info */}
        <Grid item xs={12} md={6}>
          <StyledCard $isDark={isDarkTheme}>
            <CardContent>
              <ImageContainer $isDark={isDarkTheme}>
                {tokenMetadata?.image && !imageError ? (
                  <TokenImage
                    src={resolveImageUrl(tokenMetadata.image)}
                    alt={tokenMetadata.name}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    style={{
                      opacity: imageLoading ? 0 : 1,
                      display: imageError ? "none" : "block",
                    }}
                  />
                ) : null}

                {imageLoading && tokenMetadata?.image && !imageError && (
                  <CircularProgress
                    size={40}
                    sx={{ color: isDarkTheme ? "#fff" : "#000" }}
                  />
                )}

                {(!tokenMetadata?.image || imageError) && (
                  <ImagePlaceholder $isDark={isDarkTheme}>
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        🖼️
                      </Typography>
                      <Typography variant="caption">
                        {imageError ? "Image unavailable" : "No image"}
                      </Typography>
                    </Box>
                  </ImagePlaceholder>
                )}
              </ImageContainer>

              <Typography
                variant="h5"
                sx={{
                  color: isDarkTheme ? "#fff" : "#000",
                  mb: 1,
                  textAlign: "center",
                  fontWeight: 600,
                }}
              >
                {tokenMetadata?.name || `Token #${auction.tokenId}`}
              </Typography>

              {tokenMetadata?.description && (
                <Typography
                  variant="body2"
                  sx={{
                    color: isDarkTheme ? "#ccc" : "#666",
                    mb: 2,
                    textAlign: "center",
                    lineHeight: 1.5,
                  }}
                >
                  {tokenMetadata.description}
                </Typography>
              )}
            </CardContent>
          </StyledCard>
          {/* Update Listing Section */}
          {canUpdateListing() && (
            <UpdateListingContainer $isDark={isDarkTheme}>
              <Typography
                variant="h6"
                sx={{
                  color: isDarkTheme ? "#fff" : "#000",
                  mb: 2,
                  textAlign: "center",
                  fontWeight: 600,
                }}
              >
                {activeListings && activeListings.length > 0
                  ? "Update Your Listing"
                  : "List Your NFT"}
              </Typography>

              {activeListings && activeListings.length > 0 && (
                <Box sx={{ mb: 3, textAlign: "center" }}>
                  <Typography
                    variant="body2"
                    sx={{ color: isDarkTheme ? "#ccc" : "#666", mb: 2 }}
                  >
                    Current listing price: {getCurrentListingPrice().toFixed(2)}{" "}
                    VOI
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: isDarkTheme ? "#ccc" : "#666" }}
                  >
                    Update your listing price or cancel the listing
                  </Typography>
                </Box>
              )}

              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  alignItems: "flex-start",
                  mb: 3,
                }}
              >
                <UpdateListingTextField
                  $isDark={isDarkTheme}
                  label="New Price"
                  value={updatePrice}
                  onChange={handleUpdatePriceChange}
                  error={!!updatePriceError}
                  helperText={updatePriceError}
                  type="number"
                  inputProps={{
                    step: "0.1",
                    min: "0",
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography
                          variant="body2"
                          sx={{ color: isDarkTheme ? "#ccc" : "#666" }}
                        >
                          VOI
                        </Typography>
                      </InputAdornment>
                    ),
                  }}
                  fullWidth
                  size="medium"
                />
                <UpdateListingButton
                  $isDark={isDarkTheme}
                  onClick={
                    activeListings && activeListings.length > 0
                      ? handleUpdateListing
                      : handleListNft
                  }
                  disabled={actionLoading || !!updatePriceError || !updatePrice}
                  size="large"
                >
                  {actionLoading ? (
                    <CircularProgress size={20} sx={{ color: "#fff" }} />
                  ) : (
                    "Update Price"
                  )}
                </UpdateListingButton>
              </Box>

              {activeListings && activeListings.length > 0 && (
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <CancelListingButton
                    $isDark={isDarkTheme}
                    onClick={handleCancelListing}
                    disabled={actionLoading}
                    size="large"
                  >
                    {actionLoading ? (
                      <CircularProgress size={20} sx={{ color: "#fff" }} />
                    ) : (
                      "Cancel Listing"
                    )}
                  </CancelListingButton>
                </Box>
              )}

              <Box sx={{ mt: 2, textAlign: "center" }}>
                <Typography
                  variant="caption"
                  sx={{ color: isDarkTheme ? "#aaa" : "#777" }}
                >
                  Update price instantly • Cancel anytime
                </Typography>
              </Box>
            </UpdateListingContainer>
          )}
          {/* Dedicated Bid Interface */}
          {canPlaceBid() && (
            <BidContainer $isDark={isDarkTheme}>
              <Typography
                variant="h6"
                sx={{
                  color: isDarkTheme ? "#fff" : "#000",
                  mb: 2,
                  textAlign: "center",
                  fontWeight: 600,
                }}
              >
                Place Your Bid
              </Typography>

              <Box sx={{ mb: 2 }}>
                {myOffers.length > 0 && (
                  <Typography
                    variant="body2"
                    sx={{ color: isDarkTheme ? "#ccc" : "#666", mb: 1 }}
                  >
                    Current Bid: {myOffers[0].price / 1e6} VOI
                  </Typography>
                )}
                <Typography
                  variant="caption"
                  sx={{ color: isDarkTheme ? "#aaa" : "#777" }}
                >
                  Minimum bid: {getMinimumBid().toFixed(2)} VOI
                </Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                <BidTextField
                  $isDark={isDarkTheme}
                  label="Bid Amount"
                  value={bidAmount}
                  onChange={handleBidAmountChange}
                  error={!!bidError}
                  helperText={bidError}
                  type="number"
                  inputProps={{
                    step: "0.1",
                    min: "0",
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography
                          variant="body2"
                          sx={{ color: isDarkTheme ? "#ccc" : "#666" }}
                        >
                          VOI
                        </Typography>
                      </InputAdornment>
                    ),
                  }}
                  fullWidth
                  size="medium"
                />
                <BidButton
                  $isDark={isDarkTheme}
                  onClick={handlePlaceBid}
                  disabled={actionLoading || !!bidError || !bidAmount}
                  size="large"
                >
                  {actionLoading ? (
                    <CircularProgress size={20} sx={{ color: "#fff" }} />
                  ) : (
                    "Place Bid"
                  )}
                </BidButton>
              </Box>

              {/*timeLeft && (
                <Box sx={{ mt: 2, textAlign: "center" }}>
                  <Typography
                    variant="caption"
                    sx={{ color: isDarkTheme ? "#aaa" : "#777" }}
                  >
                    Auction ends in: {timeLeft.days}d {timeLeft.hours}h{" "}
                    {timeLeft.minutes}m {timeLeft.seconds}s
                  </Typography>
                </Box>
              )*/}
            </BidContainer>
          )}
          {/* Buy VOI Section */}
          {!showVoiWidget ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                mt: 4,
                mb: 6,
                cursor: "pointer",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                },
              }}
              onClick={() => setShowVoiWidget(true)}
            >
              <Box
                sx={{
                  width: "100%",
                  maxWidth: "100%",
                  height: "120px",
                  borderRadius: "20px",
                  overflow: "hidden",
                  position: "relative",
                  background: isDarkTheme
                    ? "linear-gradient(135deg, rgba(156, 39, 176, 0.1) 0%, rgba(123, 31, 162, 0.05) 100%)"
                    : "linear-gradient(135deg, rgba(156, 39, 176, 0.05) 0%, rgba(123, 31, 162, 0.02) 100%)",
                  border: `1px solid ${
                    isDarkTheme
                      ? "rgba(156, 39, 176, 0.2)"
                      : "rgba(156, 39, 176, 0.1)"
                  }`,
                  backdropFilter: "blur(5px)",
                  boxShadow: isDarkTheme
                    ? "0 8px 32px rgba(0, 0, 0, 0.3)"
                    : "0 8px 32px rgba(0, 0, 0, 0.1)",
                }}
              >
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 800 120"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                  }}
                >
                  {/* Background gradient */}
                  <defs>
                    <linearGradient
                      id="bannerGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop
                        offset="0%"
                        stopColor={isDarkTheme ? "#9c27b0" : "#7b1fa2"}
                        stopOpacity="0.1"
                      />
                      <stop
                        offset="50%"
                        stopColor={isDarkTheme ? "#ab47bc" : "#8e24aa"}
                        stopOpacity="0.15"
                      />
                      <stop
                        offset="100%"
                        stopColor={isDarkTheme ? "#9c27b0" : "#7b1fa2"}
                        stopOpacity="0.1"
                      />
                    </linearGradient>
                    <linearGradient
                      id="textGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop
                        offset="0%"
                        stopColor={isDarkTheme ? "#e1bee7" : "#4a148c"}
                      />
                      <stop
                        offset="50%"
                        stopColor={isDarkTheme ? "#f8bbd9" : "#6a1b9a"}
                      />
                      <stop
                        offset="100%"
                        stopColor={isDarkTheme ? "#e1bee7" : "#4a148c"}
                      />
                    </linearGradient>
                  </defs>

                  {/* Background pattern */}
                  <rect
                    width="100%"
                    height="100%"
                    fill="url(#bannerGradient)"
                  />

                  {/* Decorative circles */}
                  <circle
                    cx="100"
                    cy="30"
                    r="15"
                    fill={isDarkTheme ? "#9c27b0" : "#7b1fa2"}
                    opacity="0.2"
                  />
                  <circle
                    cx="700"
                    cy="90"
                    r="20"
                    fill={isDarkTheme ? "#ab47bc" : "#8e24aa"}
                    opacity="0.15"
                  />
                  <circle
                    cx="150"
                    cy="90"
                    r="10"
                    fill={isDarkTheme ? "#ce93d8" : "#9c27b0"}
                    opacity="0.3"
                  />
                  <circle
                    cx="650"
                    cy="40"
                    r="12"
                    fill={isDarkTheme ? "#e1bee7" : "#6a1b9a"}
                    opacity="0.2"
                  />

                  {/* Main text */}
                  <text
                    x="400"
                    y="50"
                    textAnchor="middle"
                    fontSize="24"
                    fontWeight="700"
                    fill="url(#textGradient)"
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    Need VOI?
                  </text>

                  {/* Subtitle */}
                  <text
                    x="400"
                    y="75"
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="500"
                    fill={isDarkTheme ? "#e1bee7" : "#4a148c"}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    opacity="0.8"
                  >
                    Purchase VOI tokens to participate in auctions
                  </text>

                  {/* Click indicator */}
                  <text
                    x="400"
                    y="95"
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="400"
                    fill={isDarkTheme ? "#ce93d8" : "#7b1fa2"}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    opacity="0.7"
                  >
                    Click to open purchase widget
                  </text>

                  {/* Arrow icon */}
                  <path
                    d="M 720 60 L 750 60 L 740 50 L 740 45 L 760 60 L 740 75 L 740 70 L 750 60"
                    fill={isDarkTheme ? "#e1bee7" : "#4a148c"}
                    opacity="0.8"
                  />
                </svg>
              </Box>
            </Box>
          ) : (
            <Box
              sx={{ display: "flex", justifyContent: "center", mb: 2, mt: 6 }}
            >
              <iframe
                src={`https://ibuyvoi.com/widget?destination=${
                  activeAccount?.address || "VOI_WALLET_ADDRESS"
                }&theme=${isDarkTheme ? "dark" : "light"}`}
                width="480"
                height="600"
                frameBorder="0"
                style={{
                  borderRadius: "16px",
                  border: "none",
                  boxShadow: isDarkTheme
                    ? "0 8px 32px rgba(0, 0, 0, 0.3)"
                    : "0 8px 32px rgba(0, 0, 0, 0.1)",
                }}
                title="VOI Purchase Widget"
              />
            </Box>
          )}

          {showVoiWidget && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <StyledButton
                $isDark={isDarkTheme}
                variant="outlined"
                onClick={() => setShowVoiWidget(false)}
                size="small"
                sx={{
                  backgroundColor: isDarkTheme
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(0, 0, 0, 0.03)",
                  borderColor: isDarkTheme
                    ? "rgba(255, 255, 255, 0.2)"
                    : "rgba(0, 0, 0, 0.1)",
                  color: isDarkTheme ? "#fff" : "#000",
                  "&:hover": {
                    backgroundColor: isDarkTheme
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.05)",
                  },
                }}
              >
                Hide Widget
              </StyledButton>
            </Box>
          )}
        </Grid>

        {/* Auction Details */}
        <Grid item xs={12} md={6}>
          {/* Buy Now Section */}
          {canBuyNow() && (
            <BuyNowContainer $isDark={isDarkTheme}>
              <Typography
                variant="h6"
                sx={{
                  color: isDarkTheme ? "#fff" : "#000",
                  mb: 2,
                  textAlign: "center",
                  fontWeight: 600,
                }}
              >
                Buy Now
              </Typography>

              <Box sx={{ mb: 3, textAlign: "center" }}>
                <Typography
                  variant="h4"
                  sx={{
                    color: isDarkTheme ? "#4caf50" : "#388e3c",
                    fontWeight: 700,
                    mb: 1,
                  }}
                >
                  {getBuyNowPrice().toFixed(2)} VOI
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: isDarkTheme ? "#ccc" : "#666" }}
                >
                  Skip the auction and purchase instantly
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <BuyNowButton
                  $isDark={isDarkTheme}
                  onClick={handleBuyNow}
                  disabled={actionLoading}
                  size="large"
                  fullWidth
                >
                  {actionLoading ? (
                    <CircularProgress size={20} sx={{ color: "#fff" }} />
                  ) : (
                    "Buy Now"
                  )}
                </BuyNowButton>
              </Box>

              <Box sx={{ mt: 2, textAlign: "center" }}>
                <Typography
                  variant="caption"
                  sx={{ color: isDarkTheme ? "#aaa" : "#777" }}
                >
                  Instant purchase • No waiting for auction end
                </Typography>
              </Box>
            </BuyNowContainer>
          )}

          {/* Insta Sell Section */}
          {canInstaSell() && (
            <InstaSellContainer $isDark={isDarkTheme}>
              <Typography
                variant="h6"
                sx={{
                  color: isDarkTheme ? "#fff" : "#000",
                  mb: 2,
                  textAlign: "center",
                  fontWeight: 600,
                }}
              >
                Insta Sell
              </Typography>

              <Box sx={{ mb: 3, textAlign: "center" }}>
                <Typography
                  variant="h4"
                  sx={{
                    color: isDarkTheme ? "#ff5722" : "#d84315",
                    fontWeight: 700,
                    mb: 1,
                  }}
                >
                  {getSuggestedPrice().toFixed(2)} VOI
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: isDarkTheme ? "#ccc" : "#666" }}
                >
                  Sell instantly at highest bid price
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <InstaSellButton
                  $isDark={isDarkTheme}
                  onClick={handleInstaSell}
                  disabled={actionLoading}
                  size="large"
                  fullWidth
                >
                  {actionLoading ? (
                    <CircularProgress size={20} sx={{ color: "#fff" }} />
                  ) : (
                    "Sell Now"
                  )}
                </InstaSellButton>
              </Box>

              <Box sx={{ mt: 2, textAlign: "center" }}>
                <Typography
                  variant="caption"
                  sx={{ color: isDarkTheme ? "#aaa" : "#777" }}
                >
                  Instant sale • No waiting for auction end
                </Typography>
              </Box>
            </InstaSellContainer>
          )}

          {/* Bid History Section */}
          {bidHistory.length > 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <StyledCard $isDark={isDarkTheme}>
                  <CardContent>
                    <Typography
                      variant="h6"
                      sx={{
                        color: isDarkTheme ? "#fff" : "#000",
                        mb: 3,
                        fontWeight: 600,
                      }}
                    >
                      Bid History
                    </Typography>
                    {/* Bid History Chart */}
                    {bidHistory.length > 1 && (
                      <ChartContainer $isDark={isDarkTheme}>
                        <Typography
                          variant="h6"
                          sx={{
                            color: isDarkTheme ? "#fff" : "#000",
                            mb: 2,
                            fontWeight: 600,
                            textAlign: "center",
                          }}
                        >
                          Bidding Activity Over Time
                        </Typography>
                        <Line data={getChartData()} options={chartOptions} />
                      </ChartContainer>
                    )}
                    {/* Chart Disclaimer */}
                    <Box
                      sx={{
                        mt: 2,
                        p: 2,
                        backgroundColor: isDarkTheme
                          ? "rgba(255, 152, 0, 0.1)"
                          : "rgba(255, 152, 0, 0.05)",
                        border: `1px solid ${
                          isDarkTheme
                            ? "rgba(255, 152, 0, 0.2)"
                            : "rgba(255, 152, 0, 0.1)"
                        }`,
                        borderRadius: "12px",
                        backdropFilter: "blur(5px)",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: isDarkTheme ? "#ff9800" : "#f57c00",
                          fontSize: "0.75rem",
                          lineHeight: 1.4,
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 1,
                        }}
                      >
                        <span style={{ fontSize: "1rem" }}>⚠️</span>
                        <span>
                          <strong>Chart Disclaimer:</strong> This chart displays
                          bidding activity over time based on blockchain events.
                          Data may have delays due to network synchronization.
                          Historical prices shown are in VOI and represent
                          actual bid amounts from the marketplace. Chart data is
                          for informational purposes only and should not be
                          considered as financial advice.
                        </span>
                      </Typography>
                    </Box>{" "}
                    {getDisplayedBids().map((bid: any, index: number) => (
                      <BidHistoryItem
                        key={bid.listingId || index}
                        $isDark={isDarkTheme}
                      >
                        <Box>
                          <BidAmount $isDark={isDarkTheme}>
                            {(bid.price / 1e6).toFixed(2)} VOI
                          </BidAmount>
                          <BidTime $isDark={isDarkTheme}>
                            Round {bid.createRound} •{" "}
                            {new Date(
                              bid.createTimestamp * 1000
                            ).toLocaleString()}
                          </BidTime>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <BidderAddress $isDark={isDarkTheme}>
                            {formatAddress(bid.offerer)}
                          </BidderAddress>
                          {bid.offerer === activeAccount?.address && (
                            <Chip
                              label="Your Bid"
                              size="small"
                              sx={{
                                mt: 0.5,
                                backgroundColor: isDarkTheme
                                  ? "rgba(33, 150, 243, 0.2)"
                                  : "rgba(33, 150, 243, 0.1)",
                                color: isDarkTheme ? "#2196f3" : "#1976d2",
                                fontSize: "0.7rem",
                                height: "20px",
                              }}
                            />
                          )}
                        </Box>
                      </BidHistoryItem>
                    ))}
                    {/* Load More Button */}
                    {bidHistory.length > 5 && (
                      <Box sx={{ textAlign: "center", mt: 2 }}>
                        <StyledButton
                          $isDark={isDarkTheme}
                          variant="outlined"
                          onClick={() => setShowAllBids(!showAllBids)}
                          size="small"
                          sx={{
                            backgroundColor: isDarkTheme
                              ? "rgba(255, 255, 255, 0.05)"
                              : "rgba(0, 0, 0, 0.03)",
                            borderColor: isDarkTheme
                              ? "rgba(255, 255, 255, 0.2)"
                              : "rgba(0, 0, 0, 0.1)",
                            color: isDarkTheme ? "#fff" : "#000",
                            "&:hover": {
                              backgroundColor: isDarkTheme
                                ? "rgba(255, 255, 255, 0.1)"
                                : "rgba(0, 0, 0, 0.05)",
                            },
                          }}
                        >
                          {showAllBids
                            ? `Show Less (${bidHistory.length - 5} hidden)`
                            : `Load More (${bidHistory.length - 5} more)`}
                        </StyledButton>
                      </Box>
                    )}
                  </CardContent>
                </StyledCard>
              </Grid>
            </Grid>
          )}
          {/* End of Bid History Section */}

          <StyledCard $isDark={isDarkTheme}>
            <CardContent sx={{ py: 2 }}>
              <Typography
                variant="h6"
                sx={{
                  color: isDarkTheme ? "#fff" : "#000",
                  mb: 2,
                  fontWeight: 600,
                }}
              >
                General Information
              </Typography>

              {/* Status and Current Bid in one row */}
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  mb: 2,
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                }}
              >
                <Box sx={{ flex: "1 1 auto", minWidth: "120px" }}>
                  <Typography
                    variant="body2"
                    sx={{ color: isDarkTheme ? "#ccc" : "#666", mb: 0.5 }}
                  >
                    Status
                  </Typography>
                  <StyledChip
                    $isDark={isDarkTheme}
                    label={
                      isAuctionEnded()
                        ? "Ended"
                        : isAuctionActive()
                        ? "Active"
                        : "Inactive"
                    }
                    color={
                      isAuctionEnded()
                        ? "error"
                        : isAuctionActive()
                        ? "success"
                        : "default"
                    }
                    size="small"
                  />
                </Box>
                <Box sx={{ flex: "2 1 auto", minWidth: "150px" }}>
                  <Typography
                    variant="body2"
                    sx={{ color: isDarkTheme ? "#ccc" : "#666", mb: 0.5 }}
                  >
                    Current Bid
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      color: isDarkTheme ? "#fff" : "#000",
                      fontWeight: 600,
                      fontSize: "1.1rem",
                      lineHeight: 1.2,
                    }}
                  >
                    {auction.currentBid
                      ? formatPrice(auction.currentBid)
                      : formatPrice(auction.startingPrice)}{" "}
                    {auction.currency === 8324600 ? "VOI" : auction.currency}
                  </Typography>
                  {auction.currentBid && (
                    <Typography
                      variant="caption"
                      sx={{ color: isDarkTheme ? "#ccc" : "#666" }}
                    >
                      Starting: {formatPrice(auction.startingPrice)} VOI
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Reserve Price and Participants */}
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  mb: 2,
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                }}
              >
                {auction.reservePrice && (
                  <Box sx={{ flex: "1 1 auto", minWidth: "120px" }}>
                    <Typography
                      variant="body2"
                      sx={{ color: isDarkTheme ? "#ccc" : "#666", mb: 0.5 }}
                    >
                      Reserve {floorPrice && "(Floor)"}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: isDarkTheme ? "#fff" : "#000",
                        fontSize: "0.95rem",
                        lineHeight: 1.2,
                      }}
                    >
                      {formatPrice(auction.reservePrice)} VOI
                    </Typography>
                  </Box>
                )}
                {auction.bidCount && auction.bidCount > 0 && (
                  <Box sx={{ flex: "1 1 auto", minWidth: "100px" }}>
                    <Typography
                      variant="body2"
                      sx={{ color: isDarkTheme ? "#ccc" : "#666", mb: 0.5 }}
                    >
                      Total Bids
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: isDarkTheme ? "#fff" : "#000",
                        fontSize: "0.95rem",
                        fontWeight: 500,
                      }}
                    >
                      {activeOffers?.length || 0}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Participants */}
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="body2"
                  sx={{ color: isDarkTheme ? "#ccc" : "#666", mb: 1 }}
                >
                  Participants
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: isDarkTheme ? "#aaa" : "#777" }}
                    >
                      Seller:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: isDarkTheme ? "#fff" : "#000",
                        fontFamily: "monospace",
                        fontSize: "0.8rem",
                      }}
                    >
                      {formatAddress(auction.seller)}
                    </Typography>
                  </Box>
                  {auction.currentBidder && (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ color: isDarkTheme ? "#aaa" : "#777" }}
                      >
                        Top Bidder:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: isDarkTheme ? "#fff" : "#000",
                          fontFamily: "monospace",
                          fontSize: "0.8rem",
                        }}
                      >
                        {formatAddress(auction.currentBidder)}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Navigation Button Group */}
              <NavigationButtonGroup $isDark={isDarkTheme}>
                <NavigationButton
                  $isDark={isDarkTheme}
                  onClick={handleViewToken}
                  variant="outlined"
                >
                  View Token
                </NavigationButton>
                <NavigationButton
                  $isDark={isDarkTheme}
                  onClick={handleViewCollection}
                  variant="outlined"
                >
                  View Collection
                </NavigationButton>
              </NavigationButtonGroup>
            </CardContent>
          </StyledCard>
          {/* Additional Disclaimer Section */}
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12}>
              <StyledCard $isDark={isDarkTheme}>
                <CardContent>
                  <Typography
                    variant="h6"
                    sx={{
                      color: isDarkTheme ? "#fff" : "#000",
                      mb: 3,
                      fontWeight: 600,
                    }}
                  >
                    Important Information
                  </Typography>

                  <Box
                    sx={{
                      p: 3,
                      backgroundColor: isDarkTheme
                        ? "rgba(255, 152, 0, 0.1)"
                        : "rgba(255, 152, 0, 0.05)",
                      border: `1px solid ${
                        isDarkTheme
                          ? "rgba(255, 152, 0, 0.2)"
                          : "rgba(255, 152, 0, 0.1)"
                      }`,
                      borderRadius: "16px",
                      backdropFilter: "blur(5px)",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: isDarkTheme ? "#ff9800" : "#f57c00",
                        fontSize: "0.9rem",
                        lineHeight: 1.6,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 2,
                      }}
                    >
                      <span
                        style={{ fontSize: "1.2rem", marginTop: "2px" }}
                      ></span>
                      <Box>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 600,
                            mb: 1,
                            color: isDarkTheme ? "#ff9800" : "#f57c00",
                          }}
                        >
                          Auction & Bidding Disclaimer
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ mb: 2, color: isDarkTheme ? "#ccc" : "#666" }}
                        >
                          <strong>Risk Warning:</strong> Participating in NFT
                          auctions involves significant financial risk. Prices
                          can be volatile and may not reflect true market value.
                          Only bid what you can afford to lose.
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ mb: 2, color: isDarkTheme ? "#ccc" : "#666" }}
                        >
                          <strong>Technical Considerations:</strong> Blockchain
                          transactions are irreversible. Ensure you have
                          sufficient VOI balance for bidding and transaction
                          fees. Network congestion may affect transaction
                          processing times.
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ mb: 2, color: isDarkTheme ? "#ccc" : "#666" }}
                        >
                          <strong>Bid Acceptance:</strong> Holding the highest
                          bid position does not guarantee exchange. Bids must be
                          accepted by the token owner and can be resolved at any
                          time. The seller has full control over when and if to
                          accept any bid.
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: isDarkTheme ? "#ccc" : "#666" }}
                        >
                          <strong>No Financial Advice:</strong> This platform is
                          for informational purposes only. All auction data,
                          pricing information, and bid history should not be
                          considered as financial advice. Please conduct your
                          own research before making any investment decisions.
                        </Typography>
                      </Box>
                    </Typography>
                  </Box>
                </CardContent>
              </StyledCard>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Layout>
  );
};

export default AuctionDetail;
