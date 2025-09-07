import React, { useContext, useEffect, useMemo, useState } from "react";
import Layout from "../../layouts/Default";
import {
  Avatar,
  Box,
  Button,
  ButtonGroup,
  Container,
  Grid,
  Unstable_Grid2 as Grid2,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  Paper,
  IconButton,
  Dialog,
  DialogContent,
  Slider,
  CircularProgress,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  InputAdornment,
  DialogActions,
} from "@mui/material";
import CartNftCard from "../../components/CartNFTCard";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/store";
import axios from "axios";
import { stringToColorCode, stripTrailingZeroBytes } from "../../utils/string";
import styled from "styled-components";
import FireplaceIcon from "@mui/icons-material/Fireplace";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "react-toastify";
import SendIcon from "@mui/icons-material/Send";
import { getAlgorandClients } from "../../wallets";
import { APP_SPEC as ReverseRegistrarSpec } from "@/clients/ReverseRegistrarClient";
import { APP_SPEC as VNSPublicResolverSpec } from "@/clients/VNSPublicResolverClient";
import { APP_SPEC as RegistrySpec } from "@/clients/VNSRegistryClient";
import { APP_SPEC as VNSRegistrarSpec } from "@/clients/VNSRegistrarClient";
import { arc72, CONTRACT, abi, arc200, swap, mp } from "ulujs";
import TransferModal from "../../components/modals/TransferModal";
import ListSaleModal from "../../components/modals/ListSaleModal";
import ListAuctionModal from "../../components/modals/ListAuctionModal";
import algosdk from "algosdk";
import {
  ListingBoxCost,
  CTCINFO_MP206,
  CTCINFO_MP206_2,
} from "../../contants/mp";
import { decodeRoyalties } from "../../utils/hf";
import NFTListingTable from "../../components/NFTListingTable";
import { ListingI, MListedNFTTokenI, Token, TokenType } from "../../types";
import ViewListIcon from "@mui/icons-material/ViewList";
import GridViewIcon from "@mui/icons-material/GridView";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { getPrices } from "../../store/dexSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { CTCINFO_LP_WVOI_VOI } from "../../contants/dex";
import StorefrontIcon from "@mui/icons-material/Storefront";
import GavelIcon from "@mui/icons-material/Gavel";
import { MIMIR_API } from "../../config/arc72-idx";
import { QUEST_ACTION, getActions, submitAction } from "../../config/quest";
import { BigNumber } from "bignumber.js";
import { getSmartTokens } from "../../store/smartTokenSlice";
import ListBatchModal from "../../components/modals/ListBatchModal";
import { TOKEN_NAUT_VOI_STAKING, TOKEN_WVOI } from "../../contants/tokens";
import {
  useListings,
  usePrices,
  useSmartTokens,
} from "@/components/Navbar/hooks/collections";
import { GridLoader } from "react-spinners";
import { useWallet } from "@txnlab/use-wallet-react";
import InfoIcon from "@mui/icons-material/Info";
import { useName } from "@/hooks/useName";
import { useEnvoiResolver } from "@/hooks/useEnvoiResolver";
import { compactAddress } from "@/utils/mp";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import CollectionsIcon from "@mui/icons-material/Collections";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ViewComfyIcon from "@mui/icons-material/ViewComfy";
import ViewQuiltIcon from "@mui/icons-material/ViewQuilt";
import SearchIcon from "@mui/icons-material/Search";
import { TextField, FormControl, Select, MenuItem } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import XIcon from "@mui/icons-material/X"; // Add this import at the top with other icons
import GitHubIcon from "@mui/icons-material/GitHub";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { formatUnits } from "viem";
import party from "party-js";
import CloseIcon from "@mui/icons-material/Close";
import RemoveShoppingCartIcon from "@mui/icons-material/RemoveShoppingCart";
import GroupWorkIcon from "@mui/icons-material/GroupWork";
import {
  namehash,
  stringToUint8Array,
  uint8ArrayToBigInt,
} from "@/utils/namehash";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import LinkIcon from "@mui/icons-material/Link";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import { useAccountPoints } from "@/hooks/useAccountPoints";

// Add these new interfaces above the styled components
interface TraitCount {
  [key: string]: {
    [value: string]: number;
  };
}

interface RarityScore {
  [key: string]: {
    [value: string]: number;
  };
}

interface TokenRarity {
  tokenId: string;
  rarityScore: number;
  traits: {
    [key: string]: string;
  };
  name: string;
  rank: number;
}

const calculateRarityData = (tokens: any[]): TokenRarity[] => {
  // Count occurrences of each trait value
  const traitCounts: TraitCount = {};
  const totalTokens = tokens.length;

  tokens.forEach((token) => {
    try {
      const metadata = JSON.parse(token.metadata);
      const properties = metadata.properties || {};

      // Handle properties object format
      Object.entries(properties).forEach(([traitType, value]) => {
        const valueStr = value?.toString() || "None";

        if (!traitCounts[traitType]) {
          traitCounts[traitType] = {};
        }
        traitCounts[traitType][valueStr] =
          (traitCounts[traitType][valueStr] || 0) + 1;
      });
      return;
    } catch (e) {
      console.error("Error parsing token metadata:", e);
    }
  });

  // Calculate rarity scores
  const rarityScores: RarityScore = {};
  Object.entries(traitCounts).forEach(([traitType, valueCounts]) => {
    rarityScores[traitType] = {};
    Object.entries(valueCounts).forEach(([value, count]) => {
      rarityScores[traitType][value] = 1 / (count / totalTokens);
    });
  });

  // Calculate total rarity score for each token and sort
  const rankedTokens = tokens
    .map((token) => {
      try {
        const metadata = JSON.parse(token.metadata);
        const properties = metadata.properties || {};
        let totalRarityScore = 0;
        const traitValues: { [key: string]: string } = {};

        Object.entries(properties).forEach(([traitType, value]) => {
          const valueStr = value?.toString() || "None";
          traitValues[traitType] = valueStr;
          totalRarityScore += rarityScores[traitType]?.[valueStr] || 0;
        });

        return {
          tokenId: token.tokenId,
          rarityScore: totalRarityScore,
          traits: traitValues,
          name: metadata.name || `Token #${token.tokenId}`,
          rank: 0, // Initial placeholder value
        };
      } catch (e) {
        console.error("Error calculating token rarity:", e);
        return {
          tokenId: token.tokenId,
          rarityScore: 0,
          traits: {},
          name: `Token #${token.tokenId}`,
          rank: 0, // Initial placeholder value
        };
      }
    })
    .sort((a, b) => b.rarityScore - a.rarityScore);

  // Add ranks after sorting (handling ties with same rank)
  let currentRank = 1;
  let previousScore = rankedTokens[0]?.rarityScore;

  return rankedTokens.map((token, index) => {
    if (token.rarityScore < previousScore) {
      currentRank = index + 1;
      previousScore = token.rarityScore;
    }
    return {
      ...token,
      rank: currentRank,
    };
  });
};

const enableTransfer = true;

const formatter = Intl.NumberFormat("en", { notation: "compact" });

const { algodClient, indexerClient } = getAlgorandClients();

const ListingGrid = styled.div`
  display: grid;
  gap: 20px;
  margin-top: 48px;
  width: 100%;
  position: relative;
  box-sizing: border-box;
  background: ${(props) => props.theme?.palette?.background?.default};

  // Mobile: 1 column with full width
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 0;
  margin-top: 24px;

  // Small tablets: 2-3 columns
  @media (min-width: 600px) {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
    padding: 0;
  }

  // Large tablets/small desktop
  @media (min-width: 960px) {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 20px;
  }

  // Large desktop
  @media (min-width: 1280px) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
`;

const StyledLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const AccountLabel = styled.div`
  font-family: Nohemi;
  font-size: 16px;
  font-weight: 500;
  line-height: 36px;
  letter-spacing: 0em;
  text-align: left;
  color: ${(props) => props.theme?.palette?.text?.secondary || "#717579"};
  padding-left: 8px; // Add left padding

  @media (min-width: 600px) {
    padding-left: 0; // Remove padding on desktop
  }
`;

const AccountValue = styled.div`
  font-family: Inter;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  letter-spacing: 0px;
  text-align: center;
  color: ${(props) => props.theme?.palette?.text?.primary};
  padding-left: 8px; // Add left padding

  @media (min-width: 600px) {
    padding-left: 0; // Remove padding on desktop
  }
`;

const FloatingActionBar = styled.div`
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: ${(props) =>
    alpha(props.theme?.palette?.background?.paper || "#fff", 0.9)};
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  gap: 12px;
  z-index: 1000;
  align-items: center;
  backdrop-filter: blur(8px);
  border: 1px solid
    ${(props) => alpha(props.theme?.palette?.divider || "#000", 0.1)};

  // Add loading state styles
  .loading-button {
    position: relative;

    .MuiCircularProgress-root {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
    }

    &.Mui-disabled {
      background: ${(props) =>
        alpha(props.theme?.palette?.action?.disabled || "#000", 0.12)};
      color: ${(props) =>
        alpha(props.theme?.palette?.action?.disabled || "#000", 0.26)};
    }
  }
`;

const CollectionHeader = styled(Stack)<{ isDark: boolean }>`
  padding: 16px;
  background: ${(props) =>
    props.isDark
      ? alpha(props.theme?.palette?.background?.paper || "#000", 0.4)
      : alpha(props.theme?.palette?.background?.paper || "#fff", 0.9)};
  border-radius: 12px;
  margin-bottom: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid
    ${(props) =>
      props.isDark
        ? alpha(props.theme?.palette?.divider || "#fff", 0.1)
        : alpha(props.theme?.palette?.divider || "#000", 0.1)};
  box-shadow: ${(props) =>
    props.isDark
      ? `0 4px 12px ${alpha(
          props.theme?.palette?.common?.black || "#000",
          0.3
        )}`
      : `0 4px 12px ${alpha(
          props.theme?.palette?.common?.black || "#000",
          0.05
        )}`};

  .MuiButton-root {
    background: ${(props) =>
      props.isDark
        ? alpha(props.theme?.palette?.background?.paper || "#000", 0.4)
        : "transparent"};
    border-radius: 8px;
    transition: all 0.2s ease;

    &:hover {
      background: ${(props) =>
        props.isDark
          ? alpha(props.theme?.palette?.action?.hover || "#fff", 0.1)
          : alpha(props.theme?.palette?.action?.hover || "#000", 0.05)};
    }
  }

  .MuiTypography-h6 {
    font-weight: 600;
    color: ${(props) =>
      props.isDark
        ? alpha(props.theme?.palette?.common?.white || "#fff", 0.95)
        : props.theme?.palette?.text?.primary};
  }

  .MuiTypography-body2 {
    color: ${(props) =>
      props.isDark
        ? alpha(props.theme?.palette?.common?.white || "#fff", 0.7)
        : props.theme?.palette?.text?.secondary};
  }
`;

const LoadingContainer = styled(Box)`
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
`;

const FilterBar = styled(Stack)`
  position: sticky;
  top: 0;
  z-index: 2;
  background: ${(props) =>
    alpha(props.theme?.palette?.background?.default || "#fff", 0.9)};
  padding: 16px;
  backdrop-filter: blur(8px);
  flex-direction: column;
  gap: 8px;
  border-bottom: 1px solid ${(props) => props.theme?.palette?.divider};

  @media (min-width: 600px) {
    flex-direction: row;
    align-items: center;
  }

  // Make search full width on mobile
  .MuiTextField-root {
    width: 100%;

    @media (min-width: 600px) {
      width: 240px;
    }
  }
`;

const SelectionCounter = styled(Box)`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: ${(props) =>
    alpha(props.theme?.palette?.primary?.main || "#000", 0.9)};
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      transform: translate(-50%, 100%);
    }
    to {
      transform: translate(-50%, 0);
    }
  }
  border: 1px solid
    ${(props) => alpha(props.theme?.palette?.primary?.light || "#fff", 0.1)};
`;

const NFTCardOverlay = styled(Box)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${(props) =>
    alpha(props.theme?.palette?.background?.paper || "#000", 0.8)};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
`;

const MobileActions = styled(Stack)<{ isDark: boolean }>`
  display: none;
  @media (max-width: 600px) {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 16px;
    background: ${(props) =>
      props.isDark
        ? alpha(props.theme?.palette?.background?.paper || "#000", 0.95)
        : alpha(props.theme?.palette?.background?.paper || "#fff", 0.95)};
    box-shadow: 0 -1px 8px ${(props) => (props.isDark ? alpha(props.theme?.palette?.common?.black || "#000", 0.2) : alpha(props.theme?.palette?.common?.black || "#000", 0.1))};
    backdrop-filter: blur(10px);
    border-top: 1px solid
      ${(props) =>
        props.isDark
          ? alpha(props.theme?.palette?.divider || "#fff", 0.1)
          : props.theme?.palette?.divider};
    z-index: 1200;

    // Add safe area padding for iOS
    padding-bottom: calc(16px + env(safe-area-inset-bottom));

    // Improve button styling
    .MuiButton-root {
      border-radius: 8px;
      text-transform: none;
      font-weight: 600;
      min-height: 44px;

      // Contained button specific styles
      &.MuiButton-contained {
        background: ${(props) => props.theme?.palette?.primary?.main};
        color: ${(props) => props.theme?.palette?.primary?.contrastText};

        &:hover {
          background: ${(props) => props.theme?.palette?.primary?.dark};
        }

        &:disabled {
          background: ${(props) =>
            alpha(props.theme?.palette?.action?.disabled || "#000", 0.12)};
          color: ${(props) =>
            alpha(props.theme?.palette?.action?.disabled || "#000", 0.26)};
        }
      }

      // Outlined button specific styles
      &.MuiButton-outlined {
        border-color: ${(props) =>
          props.isDark
            ? alpha(props.theme?.palette?.divider || "#fff", 0.23)
            : alpha(props.theme?.palette?.divider || "#000", 0.23)};
        color: ${(props) =>
          props.isDark
            ? props.theme?.palette?.common?.white
            : props.theme?.palette?.text?.primary};

        &:hover {
          background: ${(props) =>
            props.isDark
              ? alpha(props.theme?.palette?.action?.hover || "#fff", 0.08)
              : alpha(props.theme?.palette?.action?.hover || "#000", 0.04)};
          border-color: ${(props) =>
            props.isDark
              ? props.theme?.palette?.common?.white
              : props.theme?.palette?.text?.primary};
        }
      }

      // Icon styling
      .MuiSvgIcon-root {
        font-size: 20px;
        margin-right: 8px;
        color: ${(props) =>
          props.isDark ? props.theme?.palette?.common?.white : "inherit"};
      }
    }

    // Selection count text
    .MuiTypography-root {
      color: ${(props) =>
        props.isDark
          ? alpha(props.theme?.palette?.common?.white || "#fff", 0.7)
          : props.theme?.palette?.text?.secondary};
      font-size: 14px;
      font-weight: 500;
    }
  }
`;

const AccountHeader = styled(Stack)`
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
  margin-bottom: 2rem; // Add margin bottom

  @media (min-width: 600px) {
    flex-direction: row;
    align-items: flex-start;
    text-align: left;
    margin-bottom: 3rem; // More space on desktop
  }
`;

const LocationText = styled(Typography)`
  color: ${(props) => props.theme?.palette?.text?.secondary};
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.875rem;
`;

const HeroSection = styled.div<{ isDark: boolean }>`
  position: relative;
  padding: 32px 16px;
  margin-bottom: 32px;
  min-height: 240px;
  background: ${(props) =>
    props.isDark
      ? `linear-gradient(135deg, 
          #2A0845 0%, 
          #6441A5 50%, 
          #2A0845 100%)`
      : `linear-gradient(135deg, 
          #9795f0 0%, 
          #E3E3FA 50%, 
          #9795f0 100%)`};
  background-size: 200% 200%;
  animation: gradientShift 15s ease infinite;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${(props) =>
      props.isDark
        ? `radial-gradien90ircle at 50% 50%,
            rgba(103, 58, 183, 0.1) 0%,
            rgba(103, 58, 183, 0.05) 50%,
            transparent 100%)`
        : `radial-gradient(circle at 50% 50%,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(255, 255, 255, 0.05) 50%,
            transparent 100%)`};
    pointer-events: none;
  }

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${(props) =>
      props.isDark ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.1)"};
    backdrop-filter: blur(1px);
    pointer-events: none;
  }

  @media (min-width: 600px) {
    padding: 48px 32px;
    min-height: 320px;
  }

  @keyframes gradientShift {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
`;

const BackgroundImage = styled.div<{ imageUrl?: string; isDark: boolean }>`
  position: absolute;
  top: -20px;
  left: -20px;
  right: -20px;
  bottom: -20px;
  background: ${(props) =>
    props.isDark
      ? "linear-gradient(135deg, #6b46c1 0%, #4299e1 100%)"
      : "linear-gradient(135deg, #6b46c1 0%, #4299e1 100%)"}; // Purple to blue gradient
  opacity: 0.3;
  z-index: 0;

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      to bottom,
      ${(props) =>
        alpha(props.theme?.palette?.background?.default || "#000", 0.7)},
      ${(props) => props.theme?.palette?.background?.default || "#000"}
    );
  }
`;

const HeroContent = styled(Stack)`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const StatsCard = styled(Paper)<{ isDark: boolean }>`
  padding: 8px;
  text-align: center;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(8px);
  transition: all 0.2s ease;
  box-shadow: inset 0 1px 1px
      ${(props) =>
        props.isDark
          ? alpha(props.theme?.palette?.common?.white || "#fff", 0.05)
          : alpha(props.theme?.palette?.common?.white || "#fff", 0.1)},
    0 1px 1px
      ${(props) =>
        props.isDark
          ? alpha(props.theme?.palette?.common?.black || "#000", 0.2)
          : alpha(props.theme?.palette?.common?.black || "#000", 0.05)};
  @media (min-width: 600px) {
    padding: 16px;
  }
  &:hover {
    transform: translateY(-2px);
    box-shadow: inset 0 1px 1px
        ${(props) =>
          props.isDark
            ? alpha(props.theme?.palette?.common?.white || "#fff", 0.07)
            : alpha(props.theme?.palette?.common?.white || "#fff", 0.1)},
      0 4px 12px
        ${(props) =>
          props.isDark
            ? alpha(props.theme?.palette?.common?.black || "#000", 0.3)
            : alpha(props.theme?.palette?.common?.black || "#000", 0.1)};
  }

  // Glass effect overlay
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${(props) =>
      props.isDark
        ? alpha(props.theme?.palette?.background?.paper || "#000", 0.2)
        : alpha(props.theme?.palette?.background?.paper || "#fff", 0.1)};
    backdrop-filter: blur(4px);
    z-index: 0;
  }

  // Content positioning
  & > * {
    position: relative;
    z-index: 1;
  }
  &.MuiPaper-root {
    background: ${(props) =>
      props.isDark
        ? alpha(props.theme?.palette?.background?.paper || "#000", 0.1)
        : alpha(props.theme?.palette?.background?.paper || "#fff", 0.8)};
    box-shadow: inset 0 1px 1px
        ${(props) =>
          props.isDark
            ? alpha(props.theme?.palette?.common?.white || "#fff", 0.05)
            : alpha(props.theme?.palette?.common?.white || "#fff", 0.1)},
      0 1px 1px
        ${(props) =>
          props.isDark
            ? alpha(props.theme?.palette?.common?.black || "#000", 0.2)
            : alpha(props.theme?.palette?.common?.black || "#000", 0.05)};
  }
  .MuiTypography-h4 {
    font-size: 1.25rem;
    line-height: 1.2;
    margin-bottom: 4px;
    font-weight: 600;
    color: ${(props) =>
      props.isDark
        ? alpha(props.theme?.palette?.common?.white || "#fff", 0.95)
        : props.theme?.palette?.text?.primary};

    @media (min-width: 600px) {
      font-size: 1.5rem;
    }
  }
  .MuiTypography-body2 {
    font-size: 0.75rem;
    line-height: 1;
    opacity: ${(props) => (props.isDark ? 0.7 : 0.8)};
    color: ${(props) =>
      props.isDark
        ? alpha(props.theme?.palette?.common?.white || "#fff", 0.7)
        : props.theme?.palette?.text?.secondary};

    @media (min-width: 600px) {
      font-size: 0.813rem;
    }
  }
`;

// Add this styled component after other styled components
const SocialLinks = styled(Stack)`
  display: flex;
  flex-direction: row;
  gap: 8px;
  margin-top: 4px;

  .MuiIconButton-root {
    color: ${(props) =>
      props.isDarkTheme
        ? alpha(props.theme?.palette?.common?.white || "#fff", 0.7)
        : props.theme?.palette?.text?.secondary};
    padding: 4px;

    &:hover {
      color: ${(props) =>
        props.isDarkTheme
          ? props.theme?.palette?.common?.white
          : props.theme?.palette?.text?.primary};
      background-color: ${(props) =>
        alpha(props.theme?.palette?.action?.hover || "#000", 0.1)};
    }
  }
`;

// Add this new styled component for the collection grid
const CollectionGrid = styled(Box)`
  display: grid;
  gap: 20px;
  margin-top: 2rem;
  width: 100%;
  position: relative;
  box-sizing: border-box;

  // Mobile: 1 column with full width
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 0;
  margin-top: 24px;

  // Small tablets: 2-3 columns
  @media (min-width: 600px) {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
    padding: 0;
  }

  // Large tablets/small desktop
  @media (min-width: 960px) {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 20px;
  }

  // Large desktop
  @media (min-width: 1280px) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
`;

const SweepModal = styled(Dialog)<{ $isDarkTheme: boolean }>`
  .MuiDialog-paper {
    background: transparent;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: none;
  }
  .MuiDialog-root {
    max-width: 800px;
    width: 90%;
    border-radius: 20px;
    padding: 24px;
  }

  .MuiBackdrop-root {
    background-color: ${(props) =>
      props.$isDarkTheme ? "rgba(0, 0, 0, 0.7)" : "rgba(255, 255, 255, 0.7)"};
  }
`;

const StyledToggleButtonGroup = styled(ToggleButtonGroup)<{ isDark: boolean }>`
  border: 1px solid ${(props) => (props.isDark ? "#3b3b3b" : "#eaebf0")};
  background: ${(props) => (props.isDark ? "#2b2b2b" : "#fff")};
  border-radius: 8px;

  .MuiToggleButton-root {
    border: none;
    color: ${(props) => (props.isDark ? "#fff" : "#000")};

    &:hover {
      background: ${(props) => (props.isDark ? "#3b3b3b" : "#f5f5f5")};
    }

    &.Mui-selected {
      background: ${(props) => (props.isDark ? "#3b3b3b" : "#f5f5f5")};
      color: ${(props) => (props.isDark ? "#fff" : "#000")};

      &:hover {
        background: ${(props) => (props.isDark ? "#4b4b4b" : "#e5e5e5")};
      }
    }
  }
`;

const StyledDialogContent = styled(DialogContent)<{ $isDarkTheme: boolean }>`
  background: ${(props) =>
    props.$isDarkTheme
      ? "rgba(40, 40, 40, 0.85)"
      : "rgba(245, 245, 245, 0.85)"};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
`;

const SweepModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const SweepNFTList = styled.div`
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SweepNFTItem = styled.div<{ $isDarkTheme: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"};

  // Add styles for the price text
  .price-text {
    color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.6)"};
  }
`;

const SweepNFTImage = styled.img<{ $isDarkTheme: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
`;

const SweepTotalContainer = styled.div<{ $isDarkTheme: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  background: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"};
`;

const StyledNameDialog = styled(Dialog)<{ $isDarkTheme: boolean }>`
  .MuiDialog-paper {
    background: ${(props) =>
      props.$isDarkTheme
        ? "rgba(40, 40, 40, 0.95)"
        : "rgba(255, 255, 255, 0.95)"};
    backdrop-filter: blur(10px);
    border: 1px solid
      ${(props) =>
        props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  }
`;

const NameList = styled(List)`
  max-height: 400px;
  overflow-y: auto;
`;

// Add new styled component for the name list item
const StyledListItemButton = styled(ListItemButton)<{ $isDarkTheme: boolean }>`
  &:hover {
    background-color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"};
  }
`;

// Add new styled component for the avatar
const StyledAvatar = styled(Avatar)<{ $isDarkTheme: boolean }>`
  width: 40px;
  height: 40px;
  margin-right: 16px;
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
`;

// Add these type definitions near the top of the file, after other imports
interface EnvoiProfileMetadata {
  avatar?: string;
  twitter?: string;
  location?: string;
  "com.github"?: string;
  "com.twitter"?: string;
  [key: string]: any;
}

interface EnvoiProfileResult {
  token_id: string;
  name: string;
  address: string;
  metadata: EnvoiProfileMetadata;
  cached: boolean;
}

interface EnvoiProfileResponse {
  data: {
    results: EnvoiProfileResult[];
  };
  status: number;
  statusText: string;
  headers: {
    "cache-control": string;
    "content-length": string;
    "content-type": string;
  };
  config: {
    transitional: {
      silentJSONParsing: boolean;
      forcedJSONParsing: boolean;
      clarifyTimeoutError: boolean;
    };
    adapter: string[];
    transformRequest: any[];
    transformResponse: any[];
    timeout: number;
    xsrfCookieName: string;
    xsrfHeaderName: string;
    maxContentLength: number;
    maxBodyLength: number;
    env: Record<string, any>;
    headers: {
      Accept: string;
    };
    method: string;
    url: string;
  };
  request: Record<string, any>;
}

// Add this new type definition
interface AccountStats {
  nftCount: number;
  collectionCount: number;
  listingCount: number;
  points?: number; // Make optional since not all accounts may have points
}

export const Account: React.FC = () => {
  const dispatch = useDispatch();

  const resolver = useName();

  const { data: smartTokens, status: smartTokensStatus } = useSmartTokens();

  /* Dex */
  const { data: prices, status: dexStatus } = usePrices();
  // const prices = useSelector((state: RootState) => state.dex.prices);
  // useEffect(() => {
  //   dispatch(getPrices() as unknown as UnknownAction);
  // }, [dispatch]);
  const exchangeRate = useMemo(() => {
    if (!prices || dexStatus !== "success") return 0;
    const voiPrice = prices?.find((p) => p.contractId === CTCINFO_LP_WVOI_VOI);
    if (!voiPrice) return 0;
    return voiPrice.rate;
  }, [prices, dexStatus]);

  /* Router */

  const { id } = useParams();
  const navigate = useNavigate();

  const idArr = id?.indexOf(",") !== -1 ? id?.split(",") || [] : [id];

  /* Selection */
  const [selected, setSelected] = React.useState<number[]>([]);
  const [selected2, setSelected2] = React.useState<number[]>([]);
  const [viewMode, setViewMode] = React.useState<"grid" | "collections">(
    "grid"
  );

  const [collectionTokens, setCollectionTokens] = useState<any[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const fetchTokens = async (contractId: string) => {
    setIsLoadingTokens(true);
    setTokenError(null);
    try {
      const response = await getCollectionTokens(contractId);
      console.log({ response });
      setCollectionTokens(response.tokens || []);
    } catch (error) {
      console.error("Failed to fetch collection tokens:", error);
      setTokenError("Failed to load collection tokens");
    } finally {
      setIsLoadingTokens(false);
    }
  };

  const [rarityData, setRarityData] = useState<TokenRarity[]>([]);
  useEffect(() => {
    if (collectionTokens.length > 0) {
      console.log("calculating rarity", collectionTokens.length);
      const rarity = calculateRarityData(collectionTokens);
      console.log("rarity", rarity);
      setRarityData(rarity);
    }
  }, [collectionTokens]);

  console.log({ collectionTokens, rarityData });

  /* Wallet */
  const { activeAccount, signTransactions } = useWallet();
  const { points, isLoading: isLoadingPoints } = useAccountPoints(id);

  const {
    resolver: envoiResolver,
    activeProfile,
    setActiveProfile,
    getProfileFromName,
  } = useEnvoiResolver();

  const [loadingProfile, setLoadingProfile] = React.useState(false);
  const [name, setName] = React.useState<string | null>(compactAddress(id));
  const [profile, setProfile] = React.useState<any | null>(null);
  useEffect(() => {
    if (id) {
      resolver.fetchName(id).then((name) => {
        if (!name) return;
        namehash(name).then((hash) => {
          envoiResolver.http
            .getTokenInfo(uint8ArrayToBigInt(hash).toString())
            .then((res) => {
              if (res.length > 0 && !!res[0].name) {
                setName(name);
                setProfile(res[0]);
                setLoadingProfile(false);
              }
            });
        });
      });
    }
  }, [id]);

  console.log({ profile, name, id });

  useEffect(() => {
    if (activeAccount && activeProfile && id === activeAccount?.address) {
      setName(activeProfile?.name);
      setProfile(activeProfile);
      setLoadingProfile(false);
    }
  }, [activeProfile, id, activeAccount]);

  /* Copy to clipboard */

  const [copiedText, copy] = useCopyToClipboard();

  const handleCopy = (text: string) => () => {
    copy(text)
      .then(() => {
        toast.success("Address copied to clipboard!");
      })
      .catch((error) => {
        toast.error("Failed to copy to clipboard!");
      });
  };

  /* Theme */

  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  /* NFT Navigator Listings */

  const { data: listings } = useListings({
    seller: idArr,
  });

  const normalListings = useMemo(() => {
    if (!listings || !smartTokens) return [];
    return (
      listings?.map((listing: ListingI) => {
        const paymentCurrency = smartTokens.find(
          (st: TokenType) => `${st.contractId}` === `${listing.currency}`
        );
        return {
          ...listing,
          paymentCurrency,
          normalPrice: 0,
        };
      }) ?? []
    );
  }, [listings, smartTokens]);

  const filteredListings = useMemo(() => {
    return normalListings.map((listing: ListingI) => {
      return {
        ...listing,
        token: {
          ...listing?.token,
          metadataURI: stripTrailingZeroBytes(
            listing?.token?.metadataURI || ""
          ),
        },
      };
    });
  }, [normalListings]);

  /* NFT Navigator Collections */
  const [collections, setCollections] = React.useState<any>(null);
  React.useEffect(() => {
    try {
      (async () => {
        const {
          data: { collections: res },
        } = await axios.get(`${MIMIR_API}/nft-indexer/v1/collections`);
        const collections = [];
        for (const c of res) {
          const t = c.firstToken;
          if (!!t?.metadata) {
            const tm = JSON.parse(t.metadata);
            collections.push({
              ...c,
              firstToken: {
                ...t,
                metadata: tm,
              },
            });
          }
        }
        setCollections(collections);
      })();
    } catch (e) {
      console.log(e);
    }
  }, [listings]);

  /* NFT Navigator NFTs */
  const [nfts, setNfts] = React.useState<MListedNFTTokenI[]>(
    [] as MListedNFTTokenI[]
  );
  React.useEffect(() => {
    try {
      (async () => {
        const {
          data: { tokens: tokens },
        } = await axios.get(`${MIMIR_API}/nft-indexer/v1/tokens`, {
          params: {
            owner: idArr.join(","),
            limit: 1000,
          },
        });
        const nfts = [];
        for (const t of tokens) {
          // Skip NFTs with collection ID
          // 797610 (enVoi Reverse Registrar)
          // 846601 (enVoi Collection Registrar)
          // 876578 (enVoi Staking Registrar)
          if ([846601, 797610, 876578].includes(t.contractId)) continue;
          if (!t.metadataURI) continue;
          const listing = listings?.find(
            (l: any) =>
              `${l.collectionId}` === `${t.contractId}` &&
              `${l.tokenId}` === `${t.tokenId}`
          );
          nfts.push({
            ...t,
            listing,
            metadataURI: stripTrailingZeroBytes(t.metadataURI),
          });
        }
        nfts.sort((a, b) => (a.listing?.price && a.listing?.currency ? 1 : -1));

        setNfts(nfts);
      })();
    } catch (e) {
      console.log(e);
    }
  }, [listings]);

  const listedNfts = useMemo(() => {
    const listedNfts =
      nfts
        ?.filter((nft: any) => {
          return listings?.some(
            (listing: any) =>
              `${listing.collectionId}` === `${nft.contractId}` &&
              `${listing.tokenId}` === `${nft.tokenId}`
          );
        })
        ?.map((nft: any) => {
          const listing = listings?.find(
            (l: any) =>
              `${l.collectionId}` === `${nft.contractId}` &&
              `${l.tokenId}` === `${nft.tokenId}`
          );
          return {
            ...nft,
            listing,
          };
        }) || [];
    listedNfts.sort(
      (a: any, b: any) => b.listing.collectionId - a.listing.collectionId
    );
    return listedNfts;
  }, [nfts, listings]);

  const listedCollections = useMemo(() => {
    const listedCollections =
      collections
        ?.filter((c: any) => {
          return listedNfts?.some(
            (nft: any) => `${nft.contractId}` === `${c.contractId}`
          );
        })
        ?.map((c: any) => {
          return {
            ...c,
            tokens: listedNfts?.filter(
              (nft: any) => `${nft.contractId}` === `${c.contractId}`
            ),
          };
        }) || [];
    listedCollections.sort(
      (a: any, b: any) =>
        b.tokens[0].listing.createTimestamp -
        a.tokens[0].listing.createTimestamp
    );
    return listedCollections;
  }, [collections, listedNfts]);

  const isLoading = useMemo(
    () =>
      !collections || !nfts || !listings || !listedNfts || !listedCollections,
    [collections, nfts, listings, listedNfts, listedCollections]
  );

  /* Transaction */

  const [isTransferring, setIsTransferring] = React.useState(false);
  const [openTransferBatch, setOpenTransferBatch] = React.useState(false);
  const [openListSale, setOpenListSale] = React.useState(false);
  const [openListAuction, setOpenListAuction] = React.useState(false);
  const [openListBatch, setOpenListBatch] = React.useState<boolean>(false);
  const [isListing, setIsListing] = React.useState(false);

  const [forSaleOnly, setForSaleOnly] = React.useState(false);

  const [nft, setNft] = React.useState<any>(null);

  // Add new state for sort mode BEFORE the filteredNfts memo
  const [sortMode, setSortMode] = React.useState<"collection" | "none">("none");

  // Add new state for sort direction BEFORE the filteredNfts memo
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(
    "desc"
  );

  const [offers, setOffers] = React.useState<any[]>([]);
  const [showOffers, setShowOffers] = React.useState<boolean | null>(null);

  const handleListAuction = async (price: string, currency: string) => {};

  // Add this new state to track the flattened NFT array for selections
  const [flattenedNfts, setFlattenedNfts] = useState<any[]>([]);

  // Now filteredNfts can access sortMode
  const filteredNfts = useMemo(() => {
    if (!nfts) return [];
    if (forSaleOnly === null && !showOffers) return nfts;

    // First filter by sale status or offers
    let filtered = nfts;
    if (forSaleOnly) {
      filtered = nfts.filter((nft) => nft.listing);
    } else if (showOffers) {
      // Filter NFTs that have active offers
      filtered = nfts.filter((nft) =>
        offers.some(
          (offer) =>
            offer.contractId === nft.contractId &&
            offer.tokenId === nft.tokenId &&
            offer.active === 1
        )
      );
    } else if (forSaleOnly === false) {
      filtered = nfts.filter((nft) => !nft.listing);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortMode === "collection") {
        if (a.contractId !== b.contractId) {
          return sortDirection === "asc"
            ? a.contractId - b.contractId
            : b.contractId - a.contractId;
        }
      }

      return sortDirection === "asc"
        ? Number(a.tokenId) - Number(b.tokenId)
        : Number(b.tokenId) - Number(a.tokenId);
    });

    return filtered;
  }, [nfts, forSaleOnly, showOffers, offers, sortMode, sortDirection]);

  const groupedCollections = useMemo(() => {
    if (!filteredNfts || !collections) return [];

    const grouped = collections
      ?.filter((c: any) => {
        return filteredNfts?.some(
          (nft: any) => `${nft.contractId}` === `${c.contractId}`
        );
      })
      .map((c: any) => {
        return {
          ...c,
          tokens: filteredNfts?.filter(
            (nft: any) => `${nft.contractId}` === `${c.contractId}`
          ),
        };
      });

    grouped.sort((a: any, b: any) => b.tokens.length - a.tokens.length);
    return grouped;
  }, [collections, filteredNfts]);

  // Update this useEffect to maintain the flattened array
  useEffect(() => {
    if (viewMode === "collections" && groupedCollections) {
      // Flatten the grouped collections into a single array
      const flattened = groupedCollections.reduce(
        (acc: any[], collection: any) => {
          return [...acc, ...collection.tokens];
        },
        []
      );
      setFlattenedNfts(flattened);
    } else {
      setFlattenedNfts(filteredNfts);
    }
  }, [viewMode, groupedCollections, filteredNfts]);

  const handleListBatch = async (
    prices: string[],
    currency: string,
    token: TokenType,
    setProgress: any
  ) => {
    if (!activeAccount || !selected.length) return;
    try {
      setIsListing(true);
      const { algodClient, indexerClient } = getAlgorandClients();
      // Use flattenedNfts instead of filteredNfts
      const selectedNfts = selected
        .sort((a, b) => a - b)
        .map((i) => flattenedNfts[i]);

      const priceBigInts = prices.map((price) => {
        const priceBn = new BigNumber(price).multipliedBy(
          new BigNumber(10).pow(token.decimals)
        );
        return BigInt(priceBn.toFixed(0));
      });

      const paymentTokenId = 0;
      const paymentToken =
        token.contractId === TOKEN_WVOI ? { ...token, symbol: "VOI" } : token;

      // Split into chunks of 4
      const chunkSize = 4;
      const chunks = [];
      for (let i = 0; i < selectedNfts.length; i += chunkSize) {
        chunks.push(selectedNfts.slice(i, i + chunkSize));
      }

      let progress = 0;
      const totalChunks = chunks.length;

      // Process each chunk
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const currentChunk = chunks[chunkIndex];
        const currentPrices = priceBigInts.slice(
          chunkIndex * chunkSize,
          (chunkIndex + 1) * chunkSize
        );

        const buildN: any[][] = [];

        // Build transactions for current chunk
        for (let i = 0; i < currentChunk.length; i++) {
          const nft = currentChunk[i];

          const whichMP206 = CTCINFO_MP206;
          const enforceRoyalties = ![TOKEN_NAUT_VOI_STAKING].includes(
            nft?.contractId || 0
          );

          const customR = await mp.list(
            activeAccount.address,
            {
              ...nft,
              tokenId: BigInt(nft.tokenId),
            },
            currentPrices[i].toString(),
            paymentToken,
            {
              algodClient,
              indexerClient,
              paymentTokenId,
              wrappedNetworkTokenId: TOKEN_WVOI,
              extraTxns: [],
              enforceRoyalties,
              mpContractId: whichMP206,
              listingBoxPaymentOverride: ListingBoxCost + i,
              skipEnsure: true,
            }
          );
          buildN.push([customR.objs]);
        }

        // Process current chunk
        const extraTxns = buildN.flat();
        const ci = new CONTRACT(
          CTCINFO_MP206,
          algodClient,
          indexerClient,
          abi.custom,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          }
        );
        ci.setEnableGroupResourceSharing(true);
        ci.setExtraTxns(extraTxns.flat());
        const customR = await ci.custom();
        if (!customR.success) throw new Error(customR.error);

        const stxns = await signTransactions(
          customR.txns.map(
            (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
          )
        );
        const { txId } = await algodClient
          .sendRawTransaction(stxns as Uint8Array[])
          .do();

        await algosdk.waitForConfirmation(algodClient, txId, 4);

        // Update progress
        progress = ((chunkIndex + 1) / totalChunks) * 100;
        setProgress(progress);

        // Add delay between chunks to prevent rate limiting
        if (chunkIndex < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Show progress toast for each chunk
        toast.success(`Listed chunk ${chunkIndex + 1} of ${totalChunks}`);
      }

      toast.success("All NFTs listed successfully!");
    } catch (e: any) {
      console.log(e);
      toast.error(e.message);
    } finally {
      setIsListing(false);
    }
  };

  const handleDeleteListing = async (listingId: number) => {
    if (!activeAccount) return;
    try {
      const ci = new CONTRACT(
        CTCINFO_MP206,
        algodClient,
        indexerClient,
        {
          name: "",
          desc: "",
          methods: [
            {
              name: "a_sale_deleteListing",
              args: [
                {
                  type: "uint256",
                  name: "listingId",
                },
              ],
              returns: {
                type: "void",
              },
            },
          ],
          events: [],
        },
        {
          addr: activeAccount?.address || "",
          sk: new Uint8Array(0),
        }
      );
      ci.setFee(3000);
      const a_sale_deleteListingR = await ci.a_sale_deleteListing(listingId);
      if (!a_sale_deleteListingR.success) {
        throw new Error("a_sale_deleteListing failed in simulate");
      }
      const txns = a_sale_deleteListingR.txns;
      const stxns = await signTransactions(
        txns.map((txn: string) => new Uint8Array(Buffer.from(txn, "base64")))
      );
      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();
      toast.success("Unlist successful!");
    } catch (e: any) {
      console.log(e);
      toast.error(e.message);
    } finally {
      setSelected2([]);
    }
  };

  // handleTransfer
  // uses nfts, selected
  const handleTransfer = async (addr: string, amount: string) => {
    if (!selected.length) return;
    try {
      const amountN = Number(amount);
      if (!addr) {
        throw new Error("Address is required");
      }
      if (isNaN(amountN)) {
        throw new Error("Invalid amount");
      }
      if (!activeAccount) {
        throw new Error("No active account");
      }
      setIsTransferring(true);

      // Check if all selected NFTs are from the same collection
      const selectedNfts = selected.map((index) => flattenedNfts[index]);

      const uniqueCollections = new Set(
        selectedNfts.map((nft) => nft.contractId)
      );
      const isSingleCollection = uniqueCollections.size === 1;

      // Add balance check for single collection
      let availableBalance = 0;
      if (isSingleCollection) {
        const collectionId = selectedNfts[0].contractId;
        const collectionAddress = algosdk.getApplicationAddress(collectionId);
        const accInfo = await algodClient
          .accountInformation(collectionAddress)
          .do();
        availableBalance = accInfo.amount - accInfo["min-balance"];
      }

      // Adjust chunk size based on whether it's a single collection
      const chunkSize = isSingleCollection ? 15 : 4;
      const selectedChunks = [];
      for (let i = 0; i < selected.length; i += chunkSize) {
        selectedChunks.push(selected.slice(i, i + chunkSize));
      }

      let transactionCount = 0;

      for (
        let chunkIndex = 0;
        chunkIndex < selectedChunks.length;
        chunkIndex++
      ) {
        const currentChunk = selectedChunks[chunkIndex];

        // Add delay between chunks
        if (chunkIndex > 0) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        const buildN = [];

        // Build transfer transactions
        for (const selectedIndex of currentChunk) {
          const nft = flattenedNfts[selectedIndex];
          const builder = {
            arc72: new CONTRACT(
              nft.contractId,
              algodClient,
              indexerClient,
              abi.arc72,
              { addr: activeAccount?.address || "", sk: new Uint8Array(0) },
              undefined,
              undefined,
              true
            ),
            mp: new CONTRACT(
              CTCINFO_MP206,
              algodClient,
              indexerClient,
              {
                name: "",
                desc: "",
                methods: [
                  { name: "custom", args: [], returns: { type: "void" } },
                  {
                    name: "a_sale_deleteListing",
                    args: [{ type: "uint256", name: "listingId" }],
                    returns: { type: "void" },
                  },
                ],
                events: [],
              },
              { addr: activeAccount?.address || "", sk: new Uint8Array(0) },
              true,
              false,
              true
            ),
          };

          const metadata = JSON.parse(nft.metadata || "{}");
          const txnO = await builder.arc72.arc72_transferFrom(
            activeAccount?.address || "",
            addr,
            BigInt(nft.tokenId)
          );

          buildN.push({
            ...txnO.obj,
            payment: isSingleCollection ? 0 : 28500 + transactionCount++,
            note: new TextEncoder().encode(
              `arc72_transferFrom ${metadata.name} from ${activeAccount?.address} to ${addr}`
            ),
          });

          // Handle listing deletion if needed
          if (nft.listing && nft.listing.seller === activeAccount?.address) {
            const txnO = await builder.mp.a_sale_deleteListing(
              nft.listing.mpListingId
            );
            buildN.push({
              ...txnO.obj,
              note: new TextEncoder().encode(
                `a_sale_deleteListing listId: ${nft.listing.mpListingId}`
              ),
            });
          }
        }

        // Execute transactions
        const ciCustom = new CONTRACT(
          nfts[currentChunk[0]].contractId,
          algodClient,
          indexerClient,
          {
            name: "",
            desc: "",
            methods: [{ name: "custom", args: [], returns: { type: "void" } }],
            events: [],
          },
          { addr: activeAccount?.address || "", sk: new Uint8Array(0) }
        );

        if (isSingleCollection) {
          const requiredAmount = Math.max(
            0,
            Math.min(28500 * chunkSize, 28500 * chunkSize - availableBalance)
          );
          if (requiredAmount > 0) {
            ciCustom.setTransfers([
              [
                28500 * chunkSize,
                algosdk.getApplicationAddress(nfts[currentChunk[0]].contractId),
              ],
            ]);
          }
          ciCustom.setGroupResourceSharingStrategy("merge");
        }
        ciCustom.setExtraTxns(buildN);
        ciCustom.setFee(2000);
        ciCustom.setEnableGroupResourceSharing(true);

        const customR = await ciCustom.custom();

        if (!customR.success) {
          throw new Error("Transaction simulation failed");
        }

        // Sign and send transactions
        const stxns = await signTransactions(
          customR.txns.map(
            (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
          )
        );

        // Wait for confirmation before proceeding
        const result = await algodClient
          .sendRawTransaction(stxns as Uint8Array[])
          .do();
        await algosdk.waitForConfirmation(algodClient, result.txId, 4);

        // Only show progress toast if there are multiple chunks and not the last chunk
        if (
          selectedChunks.length > 1 &&
          chunkIndex < selectedChunks.length - 1
        ) {
          toast.success(
            `Transferred chunk ${chunkIndex + 1}/${selectedChunks.length}`
          );
        }
      }

      toast.success("Transfer completed successfully!");

      // Update local state
      const newNfts = nfts.filter((_, index) => !selected.includes(index));
      setNfts(newNfts);

      // Trigger refetch after a delay
      setTimeout(() => {
        try {
          (async () => {
            const {
              data: { tokens: res },
            } = await axios.get(`${MIMIR_API}/nft-indexer/v1/tokens`, {
              params: { owner: idArr },
            });
            console.log(res);
            const updatedNfts = [];
            for (const t of res) {
              //if ([846601, 797610, 876578].includes(t.contractId)) continue;
              const listing = listings?.find(
                (l: any) =>
                  `${l.collectionId}` === `${t.contractId}` &&
                  `${l.tokenId}` === `${t.tokenId}`
              );
              updatedNfts.push({
                ...t,
                listing,
                metadataURI: stripTrailingZeroBytes(t.metadataURI),
              });
            }
            setNfts(updatedNfts);
          })();
        } catch (e) {
          console.error("Error refetching NFTs:", e);
        }
      }, 5000);
    } catch (e: any) {
      console.log(e);
      toast.error(e.message);
    } finally {
      setIsTransferring(false);
      setOpenTransferBatch(false);
      setSelected([]);
    }
  };

  const handleWithdrawStaking = async () => {
    if (!activeAccount) return;
    const apid = Number(nfts[selected[0]].tokenId);
    const apid2 = Number(nfts[selected[0]].contractId);
    const owner = algosdk.getApplicationAddress(apid2);
    const { amount, ["min-balance"]: minBalance } = await algodClient
      .accountInformation(algosdk.getApplicationAddress(apid))
      .do();
    const availableBalance = amount - Number(minBalance);
    const ci = new CONTRACT(
      apid,
      algodClient,
      indexerClient,
      {
        name: "AirdropClient",
        methods: [
          {
            name: "withdraw",
            args: [
              {
                type: "uint64",
                name: "amount",
              },
            ],
            readonly: false,
            returns: {
              type: "uint64",
            },
            desc: "Withdraw funds from contract.",
          },
        ],
        events: [],
      },
      {
        addr: owner,
        sk: new Uint8Array(0),
      }
    );
    ci.setFee(3000);
    const withdrawR = await ci.withdraw(0);
    if (!withdrawR.success) {
      throw new Error("withdraw failed in simulate");
    }
    const withdraw = withdrawR.returnValue;
    const withdrawableBalance = BigInt(availableBalance) - BigInt(withdraw);
    if (withdrawableBalance === BigInt(0)) {
      toast.info("No funds to withdraw");
      return;
    }
    const ci2 = new CONTRACT(
      apid2,
      algodClient,
      indexerClient,
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
    ci2.setFee(5000);
    const withdrawR2 = await ci2.withdraw(apid, Number(withdrawableBalance));

    if (!withdrawR2.success) {
      throw new Error("withdraw failed in simulate");
    }
    const stxns = await signTransactions(
      withdrawR2.txns.map(
        (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
      )
    );
    await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();
  };

  const handleBurnStaking = async () => {
    if (!activeAccount) return;
    const ci = new CONTRACT(
      Number(nfts[selected[0]].contractId),
      algodClient,
      indexerClient,
      {
        name: "OSARC72Token",
        methods: [
          {
            name: "burn",
            args: [
              {
                type: "uint64",
                name: "tokenId",
              },
            ],
            readonly: false,
            returns: {
              type: "void",
            },
            desc: "Burn an NFT",
          },
        ],
        events: [],
      },
      {
        addr: activeAccount.address,
        sk: new Uint8Array(0),
      }
    );
    ci.setFee(3000);
    const burnR = await ci.burn(BigInt(nfts[selected[0]].tokenId));
    if (burnR.success) {
      signTransactions(
        burnR.txns
          .map((txn: string) => new Uint8Array(Buffer.from(txn, "base64")))
          .then((txns: any) => {
            algodClient.sendRawTransaction(txns as Uint8Array[]).do();
          })
      );
    }
  };

  const handleBurn = async () => {
    if (!selected.length) return;
    try {
      if (!activeAccount) {
        throw new Error("No active account");
      }
      setIsTransferring(true);
      const nft: any = nfts[selected[0]];
      const { contractId, tokenId } = nft;
      const spec = {
        name: "",
        desc: "",
        methods: [
          {
            name: "custom",
            args: [],
            returns: {
              type: "void",
            },
          },
          {
            name: "a_sale_deleteListing",
            args: [
              {
                type: "uint256",
                name: "listingId",
              },
            ],
            returns: {
              type: "void",
            },
          },
        ],
        events: [],
      };
      const ci = new arc72(contractId, algodClient, indexerClient, {
        acc: { addr: activeAccount?.address || "", sk: new Uint8Array(0) },
      });
      const builder: any = {
        arc72: new CONTRACT(
          contractId,
          algodClient,
          indexerClient,
          {
            name: "arc72",
            desc: "arc72",
            methods: [
              {
                name: "burn",
                desc: "Burns the specified NFT",
                args: [
                  {
                    type: "uint256",
                    name: "tokenId",
                    desc: "The ID of the NFT",
                  },
                ],
                returns: { type: "void" },
              },
            ],
            events: [],
          },
          { addr: activeAccount?.address || "", sk: new Uint8Array(0) },
          undefined,
          undefined,
          true
        ),
        mp: new CONTRACT(
          CTCINFO_MP206,
          algodClient,
          indexerClient,
          spec,
          {
            addr: activeAccount?.address || "",
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
      };
      const arc72_ownerOfR = await ci.arc72_ownerOf(tokenId);
      if (!arc72_ownerOfR.success) {
        throw new Error("arc72_ownerOf failed in simulate");
      }
      const arc72_ownerOf = arc72_ownerOfR.returnValue;
      //if (arc72_ownerOf !== activeAccount?.address) {
      //  throw new Error("arc72_ownerOf not connected");
      //}
      const buildN = [];
      buildN.push(builder.arc72.burn(tokenId));
      const doDeleteListing =
        nft.listing && nft.listing.seller === activeAccount?.address;
      if (doDeleteListing) {
        buildN.push(builder.mp.a_sale_deleteListing(nft.listing.mpListingId));
      }
      const buildP = (await Promise.all(buildN)).map(({ obj }) => obj);
      const ciCustom = new CONTRACT(
        contractId,
        algodClient,
        indexerClient,
        {
          name: "",
          desc: "",
          methods: [
            {
              name: "custom",
              args: [],
              returns: {
                type: "void",
              },
            },
          ],
          events: [],
        },
        { addr: activeAccount?.address || "", sk: new Uint8Array(0) }
      );
      ciCustom.setExtraTxns(buildP);
      // ------------------------------------------
      // Add payment if necessary
      //   Aust arc72 pays for the box cost if the ctcAddr balance - minBalance < box cost
      const BalanceBoxCost = 28500;
      const accInfo = await algodClient
        .accountInformation(algosdk.getApplicationAddress(contractId))
        .do();
      const availableBalance = accInfo.amount - accInfo["min-balance"];
      const extraPaymentAmount =
        availableBalance < BalanceBoxCost
          ? BalanceBoxCost // Pay whole box cost instead of partial cost, BalanceBoxCost - availableBalance
          : 0;
      ciCustom.setPaymentAmount(extraPaymentAmount);
      // ------------------------------------------
      if (doDeleteListing) {
        ciCustom.setFee(2000);
      } else {
        ciCustom.setFee(2000);
      }
      const customR = await ciCustom.custom();

      if (!customR.success) {
        throw new Error("custom failed in simulate");
      }
      const txns = customR.txns;
      const res = await signTransactions(
        txns.map((txn: string) => new Uint8Array(Buffer.from(txn, "base64")))
      );
      //.then(sendTransactions);
      toast.success(`NFT Transfer successful! Page will reload momentarily.`);
      setNfts([...nfts.slice(0, selected[0]), ...nfts.slice(selected[0] + 1)]);
      setTimeout(() => {
        window.location.reload();
      }, 4000);
    } catch (e: any) {
      console.log(e);
      toast.error(e.message);
    } finally {
      setIsTransferring(false);
      setOpenTransferBatch(false);
      setSelected([]);
    }
  };

  const handleUnlistAll = async (listingIds: number[]) => {
    if (!activeAccount) return;
    try {
      const spec = {
        name: "",
        desc: "",
        methods: [
          {
            name: "custom",
            args: [],
            returns: {
              type: "void",
            },
          },
          {
            name: "a_sale_deleteListing",
            args: [
              {
                type: "uint256",
                name: "listingId",
              },
            ],
            returns: {
              type: "void",
            },
          },
        ],
        events: [],
      };
      const ci = new CONTRACT(CTCINFO_MP206, algodClient, indexerClient, spec, {
        addr: activeAccount?.address || "",
        sk: new Uint8Array(0),
      });
      const builder = {
        mp: new CONTRACT(
          CTCINFO_MP206,
          algodClient,
          indexerClient,
          spec,
          {
            addr: activeAccount?.address || "",
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
      };

      const buildN = [];
      for (const listingId of listingIds) {
        buildN.push({
          ...(await builder.mp.a_sale_deleteListing(listingId)).obj,
          note: new TextEncoder().encode(
            `a_sale_deleteListing listId: ${listingId}`
          ),
        });
      }

      // split into chunks of 12
      const chunkSize = 12;
      const chunks = [];
      for (let i = 0; i < buildN.length; i += chunkSize) {
        chunks.push(buildN.slice(i, i + chunkSize));
      }

      for (const [index, chunk] of Object.entries(chunks)) {
        ci.setFee(2000);
        ci.setEnableGroupResourceSharing(true);
        ci.setExtraTxns(chunk);
        const customR = await ci.custom();

        const res = await toast.promise(
          signTransactions(
            customR.txns.map(
              (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
            )
          ).then((stxn) =>
            algodClient.sendRawTransaction(stxn as Uint8Array[]).do()
          ),
          {
            pending: `Txn pending to delist nfts (${(
              (Number(index) / chunks.length) *
              100
            ).toFixed(2)}%)...`,
            success: "Unlist successful!",
            error: "Unlist failed",
          }
        );
      }
    } catch (e: any) {
      console.log(e);
      toast.error(e.message);
    } finally {
      setSelected2([]);
    }
  };

  // Add this state to track expanded collections
  const [expandedCollections, setExpandedCollections] = React.useState<
    number[]
  >([]);

  // Add this handler function
  const handleCollectionToggle = (contractId: number) => {
    setExpandedCollections((prev) =>
      prev.includes(contractId)
        ? prev.filter((id) => id !== contractId)
        : [...prev, contractId]
    );
  };

  // Add loading stage state
  const [loadingStage, setLoadingStage] = React.useState<
    "initial" | "metadata" | "prices"
  >("initial");

  // Update loading stage in relevant useEffects
  React.useEffect(() => {
    try {
      (async () => {
        setLoadingStage("metadata");
        const {
          data: { tokens: res },
        } = await axios.get(`${MIMIR_API}/nft-indexer/v1/tokens`, {
          params: {
            owner: idArr,
          },
        });
        // ... existing code ...
        setLoadingStage("prices");
      })();
    } catch (e) {
      console.log(e);
    }
  }, [listings]);

  // Add sort state
  const [sortBy, setSortBy] = React.useState<string>("recent");

  // Add sort handler
  const handleSort = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSortBy(event.target.value);
  };

  const handleBatchAction = async () => {
    if (!selected.length) return;

    try {
      setIsReviewLoading(true);

      const options = [];

      options.push({
        label: "List for Sale",
        icon: <StorefrontIcon />,
        action: () => {
          setIsReviewLoading(false);
          setOpenListBatch(true);
        },
      });

      options.push({
        label: "Transfer",
        icon: <SendIcon />,
        action: () => {
          setIsReviewLoading(false);
          setOpenTransferBatch(true);
        },
      });

      if (
        selected.length === 1 &&
        nfts[selected[0]].contractId === TOKEN_NAUT_VOI_STAKING
      ) {
        options.push(
          {
            label: "Withdraw Block Rewards",
            action: async () => {
              await handleWithdrawStaking();
              setIsReviewLoading(false);
            },
          },
          {
            label: "Burn Staking NFT",
            action: async () => {
              await handleBurnStaking();
              setIsReviewLoading(false);
            },
          }
        );
      }

      if (options.length > 0) {
        await options[0].action();
      }
    } catch (error) {
      console.error("Error in batch action:", error);
      toast.error("Failed to process batch action");
      setIsReviewLoading(false);
    }
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  // Get a featured image from the collection
  const featuredImage = useMemo(() => {
    if (!nfts || nfts.length === 0) return undefined;

    // Try to find an NFT with metadata and image
    for (const nft of nfts) {
      try {
        const metadata = JSON.parse(nft.metadata || "{}");
        if (metadata.image) {
          return metadata.image;
        }
      } catch (e) {
        continue;
      }
    }

    return undefined;
  }, [nfts]);

  // Add this check to determine if viewing own account
  const isOwnAccount = useMemo(() => {
    if (!activeAccount || !id) return false;
    return idArr.includes(activeAccount.address);
  }, [activeAccount, id, idArr]);

  const isAdmin = useMemo(() => {
    if (!activeAccount) return false;
    return (
      activeAccount.address ===
      "JFHP4IL4D3I4FDQFWGFDMCZLFSLGQAL4OZGQQKTPEE4SSW6JXSYQPZY2PM"
    );
  }, [activeAccount]);

  const [isSweepModalOpen, setIsSweepModalOpen] = React.useState(false);
  const [isPurchasePending, setIsPurchasePending] = React.useState(false);

  const handleSweepPurchase = async () => {
    if (!activeAccount) return;
    try {
      const defaultPaymentToken = {
        contractId: 390001,
        name: "Wrapped Voi",
        symbol: "wVOI",
        decimals: 6,
        tokenId: "0",
      };
      const sweepNfts = selected.map((index) => filteredNfts[index]);
      console.log({ sweepNfts, activeAccount });
      setIsPurchasePending(true);
      // Use selected.length instead of selectedCount
      const listingsToPurchase = sweepNfts.map((nft) => nft.listing);
      console.log({ listingsToPurchase });
      const ci = new CONTRACT(
        CTCINFO_MP206,
        algodClient,
        indexerClient,
        { name: "", desc: "", methods: [], events: [] },
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );
      const simTxns = [];
      for (let i = 0; i < listingsToPurchase.length; i++) {
        const listing = listingsToPurchase[i];
        console.log({ listing });
        if (!listing) continue;
        console.log({ listing });
        let customR = await mp.buy(
          activeAccount.address,
          listing,
          defaultPaymentToken,
          {
            paymentTokenId:
              listing.currency === 0 ? TOKEN_WVOI : listing.currency,
            wrappedNetworkTokenId: TOKEN_WVOI,
            extraTxns: [],
            algodClient,
            indexerClient,
            skipEnsure: true,
            strategy: "default",
            paymentOffset: i,
          }
        );
        console.log({ customR });
        if (customR.success) break;
        if (!customR.success) throw new Error("Purchase failed");
        simTxns.push(customR);
      }

      console.log({ simTxns });

      ci.setFee(100000);
      ci.setEnableGroupResourceSharing(true);
      ci.setTransfers([
        [28500 * simTxns.length, algosdk.getApplicationAddress(Number(id))],
      ]);
      const extraTxns = [...simTxns.map((txn) => txn.objs)];
      ci.setExtraTxns(extraTxns.flat());
      const customR = await ci.custom();

      if (!customR.success) throw new Error("Purchase failed");

      const stxn = await signTransactions(
        customR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );
      const res = await algodClient
        .sendRawTransaction(stxn as Uint8Array[])
        .do();

      // Party effects and success message
      const button = document.querySelector("button");
      if (button) {
        party.confetti(button, {
          count: party.variation.range(40, 60),
          size: party.variation.range(1, 1.5),
          speed: party.variation.range(300, 500),
          spread: 50,
          shapes: ["square", "circle", "star"],
        });

        setTimeout(() => {
          party.confetti(button, {
            count: party.variation.range(30, 50),
            size: party.variation.range(0.8, 1.2),
            speed: party.variation.range(200, 400),
            spread: 40,
          });
        }, 200);
      }

      toast.success(
        `🎉 Successfully purchased ${selected.length} NFTs! Welcome to the collection!`,
        {
          duration: 5000,
          style: {
            background: "#10B981",
            color: "#fff",
            fontSize: "16px",
            padding: "16px",
            borderRadius: "8px",
          },
        }
      );

      setIsPurchasePending(false);
      setIsSweepModalOpen(false);
    } catch (e: any) {
      console.error("Sweep purchase failed:", e);
      toast.error(`Sweep purchase failed: ${e.message}`);
      setIsPurchasePending(false);
    }
  };

  const [isNameModalOpen, setIsNameModalOpen] = React.useState(false);
  const [availableNames, setAvailableNames] = React.useState<
    EnvoiProfileResult[]
  >([]);
  const [loadingNames, setLoadingNames] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedName, setSelectedName] = React.useState("");

  const handleSetName = async (name: string) => {
    try {
      setIsPending(true);

      const profile = await getProfileFromName(name);

      if (!activeAccount) {
        toast.error("Please connect your wallet first");
        return;
      }

      if (!name) {
        toast.error("Please select a valid name");
        return;
      }

      // MAINNET
      const vns = {
        register: 797607,
        resolver: 797608,
        registrar: 797609,
        reverseRegistrar: 797610,
      };
      const wVOI = {
        tokenId: 828295, // en Voi
      };
      const { algodClient, indexerClient } = getAlgorandClients();
      const ci = new CONTRACT(
        vns.reverseRegistrar,
        algodClient,
        indexerClient,
        abi.custom,
        {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        }
      );
      const ciRegistry = new CONTRACT(
        vns.register,
        algodClient,
        indexerClient,
        {
          name: "registry",
          description: "Registry",
          methods: RegistrySpec.contract.methods,
          events: [],
        },
        {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        }
      );
      const builder = {
        arc200: new CONTRACT(
          wVOI.tokenId,
          algodClient,
          indexerClient,
          abi.nt200,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(),
          },
          true,
          false,
          true
        ),
        registrar: new CONTRACT(
          vns.registrar,
          algodClient,
          indexerClient,
          {
            name: "registrar",
            description: "Registrar",
            methods: VNSRegistrarSpec.contract.methods,
            events: [],
          },
          {
            addr: activeAccount.address,
            sk: new Uint8Array(),
          },
          true,
          false,
          true
        ),
        reverseRegistrar: new CONTRACT(
          vns.reverseRegistrar,
          algodClient,
          indexerClient,
          {
            name: "reverse-registrar",
            description: "Reverse Registrar",
            methods: ReverseRegistrarSpec.contract.methods,
            events: [],
          },
          {
            addr: activeAccount.address,
            sk: new Uint8Array(),
          },
          true,
          false,
          true
        ),
        resolver: new CONTRACT(
          vns.resolver,
          algodClient,
          indexerClient,
          {
            name: "vns-public-resolver",
            description: "VNS Public Resolver",
            methods: VNSPublicResolverSpec.contract.methods,
            events: [],
          },
          {
            addr: activeAccount.address,
            sk: new Uint8Array(),
          },
          true,
          false,
          true
        ),
      };

      const label = `${activeAccount.address}.addr.reverse`;

      const nodeReverse = await namehash(label);

      const nodeName = await namehash(name);

      const leafName = stringToUint8Array(name.split(".")[0], 32);

      const registryOwnerOfR = await ciRegistry.ownerOf(nodeReverse);
      if (!registryOwnerOfR.success) {
        throw new Error("Failed to get owner of node");
      }
      const registryOwnerOf = registryOwnerOfR.returnValue;

      const nameOwnerOfR = await ciRegistry.ownerOf(nodeName);
      if (!nameOwnerOfR.success) {
        throw new Error("Failed to get owner of node");
      }
      const nameOwnerOf = nameOwnerOfR.returnValue;

      const doRegister = registryOwnerOf !== activeAccount.address;

      const doReclaim = registryOwnerOf !== nameOwnerOf;

      const buildN = [];

      let customR;
      {
        if (doReclaim) {
          // -------------------------------
          // reclaim registrar
          // -------------------------------
          // ci.setTransfers([
          //   [1000 * 1e6, algosdk.getApplicationAddress(wVOI.tokenId)],
          // ]);
          const txnO = await builder.registrar.reclaim(leafName);
          buildN.push({
            ...(txnO?.obj || {}),
            note: new TextEncoder().encode(`registrar reclaim ${name}`),
          });
        }
        if (doRegister) {
          // -------------------------------
          // Create wVOI Balance for user
          // -------------------------------
          // if (p0 > 0) {
          //   const txnO = (
          //     await builder.arc200.createBalanceBox(activeAccount.address)
          //   )?.obj;
          //   buildN.push({
          //     ...txnO,
          //     payment: p0,
          //     note: new TextEncoder().encode(
          //       `envoi createBalanceBox ${paymentAssetSymbol}`
          //     ),
          //   });
          // }
          // -------------------------------
          // deposit wVOI (NET -> ARC200)
          // -------------------------------
          // {
          //   const txnO = (await builder.arc200.deposit(1000 * 1e6))?.obj;
          //   buildN.push({
          //     ...txnO,
          //     payment: 1000 * 1e6,
          //     note: new TextEncoder().encode(
          //       `envoi deposit 1000 ${paymentAssetSymbol}`
          //     ),
          //   });
          // }
          // -------------------------------
          // approve spending for register
          // -------------------------------
          // {
          //   const txnO = (
          //     await builder.arc200.arc200_approve(
          //       algosdk.getApplicationAddress(vns.reverseRegistrar),
          //       1000 * 1e6
          //     )
          //   )?.obj;
          //   buildN.push({
          //     ...txnO,
          //     payment: 28501,
          //     note: new TextEncoder().encode(
          //       `arc200 approve ${algosdk.getApplicationAddress(
          //         vns.reverseRegistrar
          //       )} ${1000}`
          //     ),
          //   });
          // }
          // -------------------------------
          // register with reverse registrar
          // -------------------------------
          {
            const txnO = (
              await builder.reverseRegistrar.register(
                algosdk.decodeAddress(activeAccount.address).publicKey,
                activeAccount.address,
                0
              )
            )?.obj;
            buildN.push({
              ...txnO,
              //payment: 336700,
              note: new TextEncoder().encode(
                `reverse-registrar register ${activeAccount.address}.addr.reverse`
              ),
            });
          }
        }
        // -------------------------------
        // set name with resolver
        // -------------------------------
        {
          const txnO = (
            await builder.resolver.setName(
              await namehash(`${activeAccount.address}.addr.reverse`),
              stringToUint8Array(name)
            )
          )?.obj;
          buildN.push({
            ...txnO,
            //payment: 336700,
            note: new TextEncoder().encode(
              `resolver setName ${activeAccount.address}.addr.reverse ${name}`
            ),
          });
        }
        // -------------------------------
        ci.setBeaconId(vns.reverseRegistrar);
        ci.setFee(2000);
        ci.setEnableGroupResourceSharing(true);
        ci.setExtraTxns(buildN);
        customR = await ci.custom();
        console.log({ customR });
      }
      if (!customR.success) {
        throw new Error("Failed to register name");
      }
      const stxns = await signTransactions(
        customR.txns.map((t: string) => {
          return new Uint8Array(Buffer.from(t, "base64"));
        })
      );
      const { txId } = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();

      await algosdk.waitForConfirmation(algodClient, txId, 4);

      // Add profile refresh logic here
      setActiveProfile(profile);

      // Close modals
      setConfirmNameData(null);
      setIsNameModalOpen(false);
    } catch (err: any) {
      console.error("Error setting name:", err);
      toast.error(err.message || "Failed to set name");
    } finally {
      setIsPending(false);
    }
  };

  // Add new state for confirmation dialog
  const [confirmNameData, setConfirmNameData] =
    React.useState<EnvoiProfileResult | null>(null);

  // Update handleNameSelect to show confirmation instead of immediately opening envoi
  const handleNameSelect = (nameData: EnvoiProfileResult) => {
    setConfirmNameData(nameData);
  };

  // Add new handler for confirmation
  const handleConfirmName = async () => {
    if (!confirmNameData) return;
    try {
      // Show loading state
      setIsPending(true);

      // Extract name from confirmNameData
      const name = confirmNameData.name;

      // Call handleSetName with the selected name
      await handleSetName(name);

      // Show success message
      toast.success("Name updated successfully!", {
        position: "top-center",
      });
      party.confetti(document.body, {
        count: party.variation.range(200, 300),
        size: party.variation.range(1, 1.4),
      });

      // Close both dialogs
      setConfirmNameData(null);
      setIsNameModalOpen(false);

      // Optional: Refresh profile data
      // This depends on how your app handles profile updates
      // You might want to trigger a refetch of the profile data
    } catch (error: any) {
      console.error("Error setting name:", error);
      toast.error(error.message || "Failed to update name");
    } finally {
      setIsPending(false);
    }
  };

  const handleOpenNameModal = async () => {
    setIsNameModalOpen(true);
    setLoadingNames(true);
    try {
      const response = await axios.get(`${MIMIR_API}/nft-indexer/v1/tokens`, {
        params: {
          contractId: 797609, // .voi names contract
          owner: activeAccount?.address,
        },
      });
      const tokenIds: string[] = response.data.tokens.map((token: any) =>
        String(token.tokenId)
      );
      console.log({ tokenIds });
      // TODO request in batches of 50
      const profileResponse = await axios.get<EnvoiProfileResponse>(
        `https://api.envoi.sh/api/token/${tokenIds.slice(0, 50).join(",")}`
      );
      console.log({ profileResponse });
      // Update to map the names from the results
      const availableNames = profileResponse.data.results.filter(
        (result: any) => !!result.name
      );
      setAvailableNames(
        availableNames.map((profile: any) => ({
          ...profile,
          address: activeAccount?.address,
        }))
      );
    } catch (error) {
      console.error("Error fetching names:", error);
      toast.error("Failed to load available names");
    } finally {
      setLoadingNames(false);
    }
  };

  const [isPending, setIsPending] = React.useState(false);

  // Add new state for expanded collections in grid view
  const [expandedGridCollections, setExpandedGridCollections] = React.useState<
    number[]
  >([]);

  // Add offers fetching to the existing useEffect or create a new one
  React.useEffect(() => {
    const fetchOffers = async () => {
      if (!id) return;

      try {
        const response = await axios.get(
          `https://mainnet-idx.nautilus.sh/nft-indexer/v1/mp/offers`,
          {
            params: {
              active: 1,
              offerer: id, // Changed from owner to offerer
            },
          }
        );
        setOffers(response.data.offers || []);
      } catch (error) {
        console.error("Error fetching offers:", error);
      }
    };
    fetchOffers();
  }, [id]);

  // Add new state for offers made by the account
  const [accountOffers, setAccountOffers] = React.useState<any[]>([]);

  // Add offers fetching to the existing useEffect or create a new one
  React.useEffect(() => {
    const fetchAccountOffers = async () => {
      if (!id) return;

      try {
        const response = await axios.get(
          `https://mainnet-idx.nautilus.sh/nft-indexer/v1/mp/offers`,
          {
            params: {
              active: 1,
              owner: id,
            },
          }
        );
        setAccountOffers(response.data.offers || []);
      } catch (error) {
        console.error("Error fetching account offers:", error);
      }
    };
    fetchAccountOffers();
  }, [id]);

  // Add the stats calculation
  const accountStats: AccountStats = useMemo(() => {
    if (!nfts || !groupedCollections || !listedNfts) {
      return {
        nftCount: 0,
        collectionCount: 0,
        listingCount: 0,
      };
    }
    return {
      nftCount: nfts.length,
      collectionCount: groupedCollections.length,
      listingCount: listedNfts.length,
    };
  }, [nfts, groupedCollections, listedNfts]);

  return (
    <>
      <HeroSection isDark={isDarkTheme}>
        {/*<BackgroundImage imageUrl={featuredImage} isDark={isDarkTheme} />*/}
        <HeroContent spacing={4}>
          <AccountHeader>
            {loadingProfile ? (
              <Skeleton
                variant="circular"
                width={isMobile ? 80 : 120}
                height={isMobile ? 80 : 120}
                sx={{ flexShrink: 0 }}
              />
            ) : (
              <Box sx={{ position: "relative", cursor: "pointer" }}>
                <Avatar
                  sx={{
                    background: `linear-gradient(45deg, ${stringToColorCode(
                      String(id)
                    )}, ${isDarkTheme ? "#000" : "#fff"})`,
                    width: isMobile ? "80px" : "120px",
                    height: isMobile ? "80px" : "120px",
                  }}
                  src={profile?.metadata?.avatar || undefined}
                >
                  {String(id).slice(0, 1)}
                </Avatar>

                {/* Add hover overlay */}
                {isOwnAccount && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(0,0,0,0.5)",
                      borderRadius: "50%",
                      opacity: 0,
                      transition: "opacity 0.2s",
                      "&:hover": {
                        opacity: 1,
                      },
                    }}
                    onClick={() => handleOpenNameModal()}
                  >
                    <Stack alignItems="center" spacing={0.5}>
                      <EditIcon sx={{ color: "white" }} />
                      <Typography
                        variant="caption"
                        sx={{
                          color: "white",
                          textAlign: "center",
                          px: 1,
                          fontSize: isMobile ? "0.6rem" : "0.75rem",
                        }}
                      >
                        {profile ? "Change Name" : "Set Name"}
                      </Typography>
                    </Stack>
                  </Box>
                )}
              </Box>
            )}

            <Grid container spacing={1}>
              {" "}
              {/* Reduced spacing from 2 to 1 */}
              {id?.split(",")?.map((id) => (
                <Grid xs={12} key={id}>
                  <Stack gap={0.1}>
                    <AccountLabel>Account</AccountLabel>
                    <Stack direction="row" gap={1} alignItems="center">
                      <AccountValue>
                        {!loadingProfile ? (
                          name
                        ) : (
                          <Skeleton width={100} height={16} />
                        )}
                      </AccountValue>
                      {/* Only show copy icon if showing address (no profile name) */}
                      {!profile && (
                        <Tooltip title="Copy address">
                          <IconButton
                            size="small"
                            onClick={handleCopy(String(id))}
                          >
                            <ContentCopyIcon
                              fontSize="small"
                              sx={{
                                color: isDarkTheme ? "#717579" : undefined,
                              }}
                            />
                          </IconButton>
                        </Tooltip>
                      )}
                      {/* Social links */}
                      {profile?.metadata["com.twitter"] && (
                        <Tooltip title="X">
                          <IconButton
                            size="small"
                            href={`https://x.com/${profile.metadata["com.twitter"]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ color: "inherit" }} // This will inherit from SocialLinks
                          >
                            <XIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {profile?.metadata["com.github"] && (
                        <Tooltip title="GitHub">
                          <IconButton
                            size="small"
                            href={`https://github.com/${profile.metadata["com.github"]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ color: "inherit" }} // This will inherit from SocialLinks
                          >
                            <GitHubIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {profile?.metadata?.url && (
                        <Tooltip title="Url">
                          <IconButton
                            size="small"
                            href={profile.metadata.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ color: "inherit" }} // This will inherit from SocialLinks
                          >
                            <LinkIcon />
                            <Typography variant="caption" sx={{ ml: 0.5 }}>
                              {profile.metadata.url.replace(/^https?:\/\//, "")}
                            </Typography>
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                    {/* Add location if available */}
                    {profile?.metadata?.location && (
                      <LocationText>
                        <LocationOnIcon fontSize="small" />
                        {profile.metadata.location}
                      </LocationText>
                    )}
                  </Stack>
                </Grid>
              ))}
            </Grid>
          </AccountHeader>

          <Grid container spacing={1}>
            {" "}
            {/* Reduced spacing from 2 to 1 */}
            <Grid item xs={4} sm={3}>
              <StatsCard elevation={0} isDark={isDarkTheme}>
                <Typography variant="h4" color="primary">
                  {formatter.format(filteredNfts?.length || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Items
                </Typography>
              </StatsCard>
            </Grid>
            <Grid item xs={4} sm={3}>
              <StatsCard elevation={0} isDark={isDarkTheme}>
                <Typography variant="h4" color="primary">
                  {formatter.format(groupedCollections?.length || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Collections
                </Typography>
              </StatsCard>
            </Grid>
            <Grid item xs={4} sm={3}>
              <StatsCard elevation={0} isDark={isDarkTheme}>
                <Typography variant="h4" color="primary">
                  {formatter.format(listedNfts?.length || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Listed
                </Typography>
              </StatsCard>
            </Grid>
            {!isLoadingPoints && (
              <Grid item xs={12} sm={3}>
                <StatsCard elevation={0} isDark={isDarkTheme}>
                  <Typography variant="h4" color="primary">
                    {points?.estimatedAirdrop.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="center"
                    spacing={0.5}
                  >
                    <Typography variant="body2" color="text.secondary">
                      PXD
                    </Typography>
                    <Tooltip
                      title="Estimated Pixel Dust airdrop based on your NFT trading activity and PXD balance"
                      componentsProps={{
                        tooltip: {
                          sx: {
                            bgcolor: isDarkTheme ? "#333" : "#f5f5f5",
                            color: isDarkTheme ? "#fff" : "#000",
                            border: "1px solid",
                            borderColor: isDarkTheme ? "#444" : "#ddd",
                            "& .MuiTooltip-arrow": {
                              color: isDarkTheme ? "#333" : "#f5f5f5",
                            },
                          },
                        },
                      }}
                    >
                      <InfoIcon
                        sx={{
                          fontSize: 14,
                          color: "text.secondary",
                          cursor: "help",
                          ml: 0.5,
                        }}
                      />
                    </Tooltip>
                  </Stack>
                </StatsCard>
              </Grid>
            )}
          </Grid>
        </HeroContent>
      </HeroSection>
      <Layout>
        <div style={{ marginTop: "2rem", padding: isMobile ? "0 16px" : "0" }}>
          <Stack
            spacing={2}
            direction={isMobile ? "column" : "row"}
            sx={{
              mt: 4,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              variant="h4"
              sx={{ fontSize: isMobile ? "1.5rem" : "2rem" }}
            >
              Showing <small>{filteredNfts?.length}</small>
            </Typography>

            <Stack
              direction={isMobile ? "column" : "row"}
              spacing={2}
              width={isMobile ? "100%" : "auto"}
            >
              <StyledToggleButtonGroup
                fullWidth={isMobile}
                isDark={isDarkTheme}
                color="primary"
                value={
                  forSaleOnly === null
                    ? "all"
                    : forSaleOnly
                    ? "listed"
                    : "unlisted"
                }
                exclusive
                onChange={(_, value) => {
                  if (value !== null) {
                    switch (value) {
                      case "listed":
                        setForSaleOnly(true);
                        setShowOffers(false);
                        setSelected([]);
                        setSelected2([]);
                        break;
                      case "unlisted":
                        setForSaleOnly(false);
                        setShowOffers(false);
                        setSelected([]);
                        setSelected2([]);
                        break;
                      default:
                        setForSaleOnly(null);
                        setShowOffers(null);
                        setSelected([]);
                        setSelected2([]);
                    }
                  }
                }}
                aria-label="listing filter"
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="listed">Listed</ToggleButton>
                <ToggleButton value="unlisted">Unlisted</ToggleButton>
              </StyledToggleButtonGroup>

              {/* Add new sort mode toggle */}
              <StyledToggleButtonGroup
                fullWidth={isMobile}
                isDark={isDarkTheme}
                color="primary"
                value={sortMode}
                exclusive
                onChange={(_, newMode) => {
                  if (newMode !== null) {
                    setSortMode(newMode);
                    setSelected([]);
                    setSelected2([]);
                  }
                }}
                aria-label="sort mode"
              >
                <ToggleButton value="none">None</ToggleButton>
                <ToggleButton value="collection">Collection</ToggleButton>
              </StyledToggleButtonGroup>

              {/* Add new sort direction toggle */}
              <StyledToggleButtonGroup
                fullWidth={isMobile}
                isDark={isDarkTheme}
                color="primary"
                value={sortDirection}
                exclusive
                onChange={(_, newDirection) => {
                  if (newDirection !== null) {
                    setSortDirection(newDirection);
                    setSelected([]);
                    setSelected2([]);
                  }
                }}
                aria-label="sort direction"
              >
                <ToggleButton value="asc">
                  <Tooltip title="Ascending">
                    <ArrowUpwardIcon />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="desc">
                  <Tooltip title="Descending">
                    <ArrowDownwardIcon />
                  </Tooltip>
                </ToggleButton>
              </StyledToggleButtonGroup>

              {/*<ToggleButtonGroup
                fullWidth={isMobile}
                color="primary"
                value={viewMode}
                exclusive
                onChange={(_, newMode) => {
                  if (newMode !== null) {
                    setViewMode(newMode);
                    setSelected([]);
                    setSelected2([]);
                  }
                }}
                aria-label="view mode"
              >
                <ToggleButton value="grid">
                  <GridViewIcon />
                </ToggleButton>
                <ToggleButton value="collections">
                  <CollectionsIcon />
                </ToggleButton>
              </ToggleButtonGroup>*/}
            </Stack>

            {/* Add Offers button */}
            <Button
              size="large"
              variant="outlined"
              onClick={() => navigate(`/account/${id}/offers`)} // Changed from setIsOffersModalOpen(true)
              startIcon={<LocalOfferIcon />}
              sx={{ ml: 1 }}
            >
              Offers ({accountOffers.length + offers.length})
            </Button>
          </Stack>

          {viewMode === "grid" ? (
            <ListingGrid>
              {isLoading
                ? Array(isMobile ? 4 : isTablet ? 8 : 12)
                    .fill(0)
                    .map((_, i) => (
                      <Skeleton
                        key={i}
                        variant="rectangular"
                        width="100%"
                        height={isMobile ? 240 : 320}
                      />
                    ))
                : sortMode === "collection"
                ? groupedCollections?.map((collection: any) => {
                    const isExpanded = expandedGridCollections.includes(
                      collection.contractId
                    );

                    return (
                      <React.Fragment key={collection.contractId}>
                        {/* Collection Card */}
                        <CartNftCard
                          viewMode={isMobile ? "list" : "grid"}
                          selected={false}
                          isDark={isDarkTheme}
                          token={collection.tokens[0]}
                          listing={collection.tokens[0].listing}
                          offers={offers.filter(
                            (offer) =>
                              offer.contractId ===
                                collection.tokens[0].contractId &&
                              offer.tokenId === collection.tokens[0].tokenId
                          )}
                          collectionName={collection.name}
                          onClick={() => {
                            fetchTokens(collection.contractId);
                            setExpandedGridCollections((prev) =>
                              prev.includes(collection.contractId)
                                ? prev.filter(
                                    (id) => id !== collection.contractId
                                  )
                                : [...prev, collection.contractId]
                            );
                          }}
                          isMobile={isMobile}
                        >
                          <Box
                            sx={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              bgcolor: "rgba(0,0,0,0.7)",
                              color: "white",
                              p: 1,
                              textAlign: "center",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Typography variant="body2">
                              {collection.tokens.length} Items
                            </Typography>
                            {isExpanded ? (
                              <ExpandLessIcon />
                            ) : (
                              <ExpandMoreIcon />
                            )}
                          </Box>
                        </CartNftCard>

                        {/* Expanded Collection Items */}
                        {isExpanded && (
                          <Box
                            sx={{
                              gridColumn: "1 / -1",
                              display: "flex",
                              flexDirection: "column",
                              gap: 2,
                              p: 2,
                              bgcolor: (theme) =>
                                isDarkTheme
                                  ? theme.palette.grey[900]
                                  : theme.palette.grey[100],
                              borderRadius: 1,
                              mt: -1,
                              mb: 2,
                              border: (theme) =>
                                `1px solid ${
                                  isDarkTheme
                                    ? theme.palette.grey[800]
                                    : theme.palette.grey[300]
                                }`,
                              boxShadow: (theme) =>
                                `0 4px 6px -1px ${
                                  isDarkTheme
                                    ? "rgba(0, 0, 0, 0.3)"
                                    : "rgba(0, 0, 0, 0.1)"
                                }`,
                            }}
                          >
                            <Typography
                              variant="subtitle1"
                              sx={{
                                px: 1,
                                py: 1,
                                borderBottom: (theme) =>
                                  `1px solid ${
                                    isDarkTheme
                                      ? theme.palette.grey[800]
                                      : theme.palette.grey[300]
                                  }`,
                              }}
                            >
                              Collection Items
                            </Typography>
                            <Box
                              sx={{
                                display: "grid",
                                gridTemplateColumns: {
                                  xs: "repeat(2, 1fr)",
                                  sm: "repeat(3, 1fr)",
                                  md: "repeat(4, 1fr)",
                                  lg: "repeat(5, 1fr)",
                                },
                                gap: 2,
                                width: "100%",
                              }}
                            >
                              {collection.tokens.map((nft: any) => {
                                // Removed .slice(1) to include first item
                                const index = filteredNfts.findIndex(
                                  (item) =>
                                    item.contractId === nft.contractId &&
                                    item.tokenId === nft.tokenId
                                );
                                const rarity = rarityData.find(
                                  (r) => r.tokenId === nft.tokenId
                                );
                                return (
                                  <CartNftCard
                                    viewMode={isMobile ? "list" : "grid"}
                                    key={`${nft.contractId}-${nft.tokenId}`}
                                    selected={selected.includes(index)}
                                    isDark={isDarkTheme}
                                    token={nft}
                                    rarity={rarity}
                                    listing={nft.listing}
                                    offers={offers.filter(
                                      (offer) =>
                                        offer.contractId === nft.contractId &&
                                        offer.tokenId === nft.tokenId
                                    )}
                                    collectionName={collection.name}
                                    onClick={() => {
                                      if (selected.includes(index)) {
                                        setSelected(
                                          selected.filter((x) => x !== index)
                                        );
                                      } else {
                                        setSelected(
                                          Array.from(
                                            new Set([...selected, index])
                                          )
                                        );
                                      }
                                    }}
                                    isMobile={isMobile}
                                  >
                                    {selected.includes(index) && (
                                      <div className="selection-overlay" />
                                    )}
                                  </CartNftCard>
                                );
                              })}
                            </Box>
                          </Box>
                        )}
                      </React.Fragment>
                    );
                  })
                : filteredNfts?.map((nft: any, index: number) => {
                    const collection = collections?.find(
                      (c: any) => c.contractId === nft.contractId
                    );

                    return (
                      <CartNftCard
                        viewMode={isMobile ? "list" : "grid"}
                        key={`${nft.contractId}-${nft.tokenId}`}
                        selected={selected.includes(index)}
                        isDark={isDarkTheme}
                        token={nft}
                        listing={nft.listing}
                        offers={offers.filter(
                          (offer) =>
                            offer.contractId === nft.contractId &&
                            offer.tokenId === nft.tokenId
                        )}
                        collectionName={collection?.name}
                        onClick={() => {
                          if (selected.includes(index)) {
                            setSelected(selected.filter((x) => x !== index));
                          } else {
                            setSelected(
                              Array.from(new Set([...selected, index]))
                            );
                          }
                        }}
                        isMobile={isMobile}
                      >
                        {selected.includes(index) && (
                          <div className="selection-overlay" />
                        )}
                      </CartNftCard>
                    );
                  })}
            </ListingGrid>
          ) : (
            <Box>
              {groupedCollections.map((collection: any, index: number) => (
                <Box
                  key={collection.contractId}
                  sx={{
                    width: "100%",
                    mb: 4,
                    mt: index === 0 ? 4 : 0, // Add top margin only to first collection
                  }}
                >
                  <CollectionHeader isDark={isDarkTheme}>
                    <Button
                      fullWidth
                      onClick={() => {
                        handleCollectionToggle(collection.contractId);
                      }}
                      sx={{
                        justifyContent: "space-between",
                        textAlign: "left",
                        p: 2,
                      }}
                      endIcon={
                        expandedCollections.includes(collection.contractId) ? (
                          <ExpandLessIcon />
                        ) : (
                          <ExpandMoreIcon />
                        )
                      }
                    >
                      <Stack
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        flex={1}
                      >
                        <Avatar src={collection.firstToken?.metadata?.image} />
                        <Box>
                          <Typography variant="h6">
                            {collection.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {collection.tokens.length} items
                          </Typography>
                        </Box>
                      </Stack>
                    </Button>
                  </CollectionHeader>

                  {expandedCollections.includes(collection.contractId) && (
                    <CollectionGrid>
                      {collection.tokens.map((nft: any) => {
                        const globalIndex = nfts.findIndex(
                          (n) =>
                            n.contractId === nft.contractId &&
                            n.tokenId === nft.tokenId
                        );
                        return (
                          <CartNftCard
                            key={`${nft.contractId}-${nft.tokenId}`}
                            viewMode={isMobile ? "list" : "grid"}
                            selected={selected.includes(globalIndex)}
                            isDark={isDarkTheme}
                            token={nft}
                            listing={nft.listing}
                            offers={offers.filter(
                              (offer) =>
                                offer.contractId === nft.contractId &&
                                offer.tokenId === nft.tokenId
                            )}
                            collectionName={collection.name}
                            onClick={() => {
                              if (selected.includes(globalIndex)) {
                                setSelected(
                                  selected.filter((x) => x !== globalIndex)
                                );
                              } else {
                                // For non-owners, only allow selecting items with listings
                                if (!isOwnAccount && !nft.listing) {
                                  toast.warning(
                                    "You can only select items that are listed for sale"
                                  );
                                  return;
                                }
                                setSelected(
                                  Array.from(
                                    new Set([...selected, globalIndex])
                                  )
                                );
                              }
                            }}
                            isMobile={isMobile}
                          >
                            {/* Add selection overlay div */}
                            {selected.includes(globalIndex) && (
                              <div className="selection-overlay" />
                            )}
                            {/* ... existing card content ... */}
                          </CartNftCard>
                        );
                      })}
                    </CollectionGrid>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </div>

        {/* Keep the FloatingActionBar for desktop */}
        {(selected.length > 0 || selected2.length > 0) && !isMobile && (
          <FloatingActionBar>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body1" color="text.secondary">
                {selected.length || selected2.length} Selected
              </Typography>
              {/* Add Select All button when at least one item is selected */}
              {selected.length > 0 && selected.length < filteredNfts.length && (
                <Button
                  size="small"
                  onClick={() => {
                    // For non-owners, only select items with listings
                    if (!isOwnAccount) {
                      const allListedIndexes = filteredNfts
                        .map((nft, index) => (nft.listing ? index : -1))
                        .filter((index) => index !== -1);
                      setSelected(allListedIndexes);
                    } else {
                      // For owners, select all items
                      setSelected(
                        Array.from(Array(filteredNfts.length).keys())
                      );
                    }
                  }}
                >
                  Select All
                </Button>
              )}
            </Stack>

            {selected.length > 0 && (
              <Stack
                direction="row"
                spacing={1}
                sx={{ flex: 1, justifyContent: "flex-end" }}
              >
                <ButtonGroup
                  color="warning"
                  variant="contained"
                  size="small"
                  sx={{
                    boxShadow: "none",
                    gap: 0,
                  }}
                >
                  {/* Add Group Similar button when all selected are from same collection */}
                  {selected.length > 1 &&
                    new Set(
                      selected.map((index) => filteredNfts[index].contractId)
                    ).size === 1 && (
                      <Button
                        onClick={() => {
                          // Get the collection ID
                          const collectionId =
                            filteredNfts[selected[0]].contractId;

                          // Find all NFTs from this collection
                          const allCollectionIndexes = filteredNfts
                            .map((nft, index) =>
                              nft.contractId === collectionId ? index : -1
                            )
                            .filter((index) => index !== -1);

                          // Update selection to include all NFTs from collection
                          setSelected(allCollectionIndexes);

                          toast.success(
                            `Grouped ${allCollectionIndexes.length} NFTs from the same collection`
                          );
                        }}
                        startIcon={<GroupWorkIcon />}
                      >
                        Group Similar
                      </Button>
                    )}

                  {selected.length === 1 && (
                    <>
                      <Button
                        onClick={() => {
                          navigate(
                            `/collection/${
                              filteredNfts[selected[0]].contractId
                            }/token/${filteredNfts[selected[0]].tokenId}`
                          );
                          // Scroll to the top of the page
                          window.scrollTo({
                            top: 0,
                            behavior: "smooth",
                          });
                        }}
                        startIcon={<VisibilityIcon />}
                      >
                        NFT
                      </Button>

                      {/* Add Buy button for single listed NFT */}
                      {!isOwnAccount && filteredNfts[selected[0]]?.listing && (
                        <Button
                          onClick={() => {
                            navigate(
                              `/collection/${
                                filteredNfts[selected[0]].contractId
                              }/token/${filteredNfts[selected[0]].tokenId}`
                            );
                            // Scroll to the top of the page
                            window.scrollTo({
                              top: 0,
                              behavior: "smooth",
                            });
                          }}
                          startIcon={<ShoppingCartIcon />}
                        >
                          Buy
                        </Button>
                      )}
                    </>
                  )}

                  {/* Moved Collection button outside of selected.length === 1 check */}
                  {selected.length > 0 &&
                    new Set(
                      selected.map((index) => filteredNfts[index].contractId)
                    ).size === 1 && (
                      <Button
                        onClick={() => {
                          navigate(
                            `/collection/${
                              filteredNfts[selected[0]].contractId
                            }`
                          );
                          window.scrollTo({
                            top: 0,
                            behavior: "smooth",
                          });
                        }}
                        startIcon={<CollectionsIcon />}
                        sx={{
                          color: "inherit",
                          "& .MuiButton-startIcon": {
                            color: "inherit",
                          },
                        }}
                      >
                        Collection
                      </Button>
                    )}

                  {/* Add Sweep Mode button for multiple selections */}
                  {selected.length > 1 &&
                    selected.length <= 5 &&
                    !isOwnAccount &&
                    selected.every((index) => filteredNfts[index]?.listing) && (
                      <Button
                        onClick={() => setIsSweepModalOpen(true)}
                        startIcon={<ShoppingCartIcon />}
                      >
                        Sweep Mode ({selected.length})
                      </Button>
                    )}
                </ButtonGroup>

                {/* Add Unlist button when forSaleOnly is true and user is owner */}
                {forSaleOnly &&
                  (isOwnAccount || isAdmin) &&
                  selected.length >= 1 && (
                    <Button
                      variant="contained"
                      color="error"
                      size="small"
                      onClick={() =>
                        handleUnlistAll(
                          filteredNfts
                            .filter((_, i) => selected.includes(i))
                            .map((nft) => nft.listing?.mpListingId || 0)
                        )
                      }
                      startIcon={<RemoveShoppingCartIcon />}
                    >
                      Unlist
                    </Button>
                  )}

                <ButtonGroup color="primary" variant="contained" size="small">
                  {/* Add List button for owners */}
                  {isOwnAccount &&
                    !forSaleOnly &&
                    selected.length > 0 &&
                    selected.every((index) => !filteredNfts[index].listing) && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => setOpenListBatch(true)}
                        startIcon={<StorefrontIcon />}
                      >
                        List
                      </Button>
                    )}

                  {/* Add Transfer button for owners */}
                  {enableTransfer &&
                    isOwnAccount &&
                    !forSaleOnly &&
                    selected.length > 0 &&
                    selected.every((index) => !filteredNfts[index].listing) && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => setOpenTransferBatch(true)}
                        startIcon={<SendIcon />}
                      >
                        Transfer
                      </Button>
                    )}
                </ButtonGroup>

                {/* Add Clear button */}
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setSelected([])}
                  startIcon={<DeleteIcon />}
                >
                  Clear
                </Button>
              </Stack>
            )}
          </FloatingActionBar>
        )}

        {/* Keep the MobileActions for mobile, but simplify the selection display */}
        {(selected.length > 0 || selected2.length > 0) && isMobile && (
          <MobileActions isDark={isDarkTheme}>
            <Box sx={{ width: "100%", mb: 1 }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="body2" color="text.secondary">
                  {selected.length || selected2.length} Selected
                </Typography>
                {selected.length > 0 &&
                  selected.length < filteredNfts.length && (
                    <Button
                      size="small"
                      onClick={() => {
                        if (!isOwnAccount) {
                          const allListedIndexes = filteredNfts
                            .map((nft, index) => (nft.listing ? index : -1))
                            .filter((index) => index !== -1);
                          setSelected(allListedIndexes);
                        } else {
                          setSelected(
                            Array.from(Array(filteredNfts.length).keys())
                          );
                        }
                      }}
                    >
                      Select All
                    </Button>
                  )}
              </Stack>
            </Box>

            {selected.length > 0 && (
              <Box sx={{ flexShrink: 0 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    overflowX: "auto",
                    pb: 1,
                    "&::-webkit-scrollbar": {
                      height: 4,
                    },
                    "&::-webkit-scrollbar-track": {
                      background: "transparent",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      background: (theme) =>
                        isDarkTheme
                          ? theme.palette.grey[700]
                          : theme.palette.grey[300],
                      borderRadius: 2,
                    },
                  }}
                >
                  {selected.map(
                    (index) =>
                      filteredNfts[index] && (
                        <Box
                          key={`${filteredNfts[index].contractId}-${filteredNfts[index].tokenId}`}
                          sx={{
                            minWidth: 48,
                            width: 48,
                            height: 48,
                            borderRadius: 1,
                            overflow: "hidden",
                            flexShrink: 0,
                            border: (theme) =>
                              `1px solid ${theme.palette.divider}`,
                            position: "relative",
                          }}
                        >
                          <img
                            src={(() => {
                              try {
                                const metadata = JSON.parse(
                                  filteredNfts[index].metadata || "{}"
                                );
                                const imageUrl = metadata.image;
                                // Handle IPFS URLs
                                if (imageUrl?.startsWith("ipfs://")) {
                                  return `https://ipfs.io/ipfs/${imageUrl.slice(
                                    7
                                  )}`;
                                }
                                return imageUrl || "";
                              } catch (e) {
                                return "";
                              }
                            })()}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                          {nfts[index]?.listing && (
                            <Box
                              sx={{
                                position: "absolute",
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: (theme) =>
                                  isDarkTheme
                                    ? "rgba(0,0,0,0.7)"
                                    : "rgba(255,255,255,0.7)",
                                padding: "2px 4px",
                                fontSize: "10px",
                                textAlign: "center",
                                color: (theme) =>
                                  isDarkTheme
                                    ? theme.palette.common.white
                                    : theme.palette.common.black,
                              }}
                            >
                              {/* Add null check for listing and price */}
                              {filteredNfts[index]?.listing?.price
                                ? `${formatter.format(
                                    filteredNfts[index].listing.price / 10 ** 6
                                  )} VOI`
                                : "Price not available"}
                            </Box>
                          )}
                        </Box>
                      )
                  )}
                </Stack>
              </Box>
            )}

            {/* Action Buttons */}
            <Stack direction="column" spacing={0.5} sx={{ width: "100%" }}>
              {selected.length === 1 && (
                <Stack direction="row" spacing={0.5}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => {
                      navigate(
                        `/collection/${
                          filteredNfts[selected[0]].contractId
                        }/token/${filteredNfts[selected[0]].tokenId}`
                      );
                      window.scrollTo({
                        top: 0,
                        behavior: "smooth",
                      });
                    }}
                    startIcon={<VisibilityIcon />}
                  >
                    View
                  </Button>
                  {/* Add Unlist button when forSaleOnly is true and user is owner */}
                  {forSaleOnly && isOwnAccount && selected.length >= 1 && (
                    <Button
                      fullWidth
                      variant="contained"
                      color="error"
                      onClick={() =>
                        handleUnlistAll(
                          filteredNfts
                            .filter((_, i) => selected.includes(i))
                            .map((nft) => nft.listing?.mpListingId || 0)
                        )
                      }
                      startIcon={<RemoveShoppingCartIcon />}
                    >
                      Unlist
                    </Button>
                  )}
                  {!isOwnAccount && filteredNfts[selected[0]]?.listing && (
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => {
                        navigate(
                          `/collection/${
                            filteredNfts[selected[0]].contractId
                          }/token/${filteredNfts[selected[0]].tokenId}`
                        );
                        window.scrollTo({
                          top: 0,
                          behavior: "smooth",
                        });
                      }}
                      startIcon={<ShoppingCartIcon />}
                    >
                      Buy
                    </Button>
                  )}
                </Stack>
              )}
              {/* Owner actions */}
              {enableTransfer &&
                (isOwnAccount || isAdmin) &&
                selected.length > 0 &&
                selected.every((index) => !filteredNfts[index].listing) && (
                  <Stack direction="row" spacing={0.5}>
                    {" "}
                    {/* Reduced spacing from 1 to 0.5 */}
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => setOpenListBatch(true)}
                      startIcon={<StorefrontIcon />}
                    >
                      List
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => setOpenTransferBatch(true)}
                      startIcon={<SendIcon />}
                    >
                      Transfer
                    </Button>
                  </Stack>
                )}
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setSelected([])}
                startIcon={<DeleteIcon />}
              >
                Clear
              </Button>
            </Stack>
          </MobileActions>
        )}

        {!isLoading ? (
          <>
            {openTransferBatch ? (
              <TransferModal
                nfts={filteredNfts.filter((_, i) => selected.includes(i))}
                title="Transfer NFT"
                loading={isTransferring}
                open={openTransferBatch}
                handleClose={() => setOpenTransferBatch(false)}
                onSave={handleTransfer}
                fullScreen={isMobile}
              />
            ) : null}
            {/* {nft ? (
              <ListSaleModal
                title="List NFT for Sale"
                loading={isListing}
                open={openListSale}
                handleClose={() => setOpenListSale(false)}
                onSave={handleListSale}
                nft={nft}
                fullScreen={isMobile}
              />
            ) : null} */}
            {selected?.length && openListBatch ? (
              <ListBatchModal
                action="list-sale"
                title="List NFT for Sale"
                loading={isListing}
                open={openListBatch}
                handleClose={() => setOpenListBatch(false)}
                onSave={handleListBatch}
                nfts={filteredNfts.filter((_, i) => selected.includes(i))}
                clearSelection={() => setSelected([])}
                fullScreen={isMobile}
              />
            ) : null}
            {nft ? (
              <ListAuctionModal
                title="List NFT for Auction"
                loading={isListing}
                open={openListAuction}
                handleClose={() => setOpenListAuction(false)}
                onSave={handleListAuction}
                nft={nft}
                fullScreen={isMobile}
              />
            ) : null}
          </>
        ) : (
          <>
            <LoadingContainer>
              <GridLoader
                size={30}
                color={isDarkTheme ? "#fff" : "#000"}
                className="sm:!hidden !text-primary "
              />
              <GridLoader
                size={50}
                color={isDarkTheme ? "#fff" : "#000"}
                className="!hidden sm:!block !text-primary "
              />
              <Typography variant="body2" color="text.secondary">
                {loadingStage === "metadata"
                  ? "Loading NFT metadata..."
                  : loadingStage === "prices"
                  ? "Fetching current prices..."
                  : "Loading your collection..."}
              </Typography>
            </LoadingContainer>
          </>
        )}
      </Layout>

      <SweepModal
        $isDarkTheme={isDarkTheme}
        open={isSweepModalOpen}
        onClose={() => !isPurchasePending && setIsSweepModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <StyledDialogContent $isDarkTheme={isDarkTheme}>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
            <IconButton
              onClick={() => setIsSweepModalOpen(false)}
              sx={{
                color: isDarkTheme ? "#fff" : "#000",
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <SweepModalContent>
            <div>
              <Typography
                variant="h6"
                sx={{ mb: 2, color: isDarkTheme ? "#fff" : "#000" }}
              >
                Buy NFTs
              </Typography>
              <Typography
                variant="body2"
                sx={{ mb: 3, color: isDarkTheme ? "#fff" : "#000" }}
              >
                Review your selected NFTs before purchase
              </Typography>
            </div>

            <SweepNFTList>
              {selected.map((index) => {
                const nft = filteredNfts[index];
                const metadata = JSON.parse(nft.metadata || "{}");
                const imageUrl = metadata.image?.startsWith("ipfs://")
                  ? `https://ipfs.io/ipfs/${metadata.image.slice(7)}`
                  : metadata.image;

                return (
                  <SweepNFTItem
                    $isDarkTheme={isDarkTheme}
                    key={`${nft.contractId}-${nft.tokenId}`}
                  >
                    <SweepNFTImage
                      src={imageUrl}
                      alt={metadata.name}
                      $isDarkTheme={isDarkTheme}
                    />
                    <div style={{ flex: 1 }}>
                      <Typography
                        variant="body2"
                        color={isDarkTheme ? "#fff" : "#000"}
                      >
                        {metadata.name}
                      </Typography>
                      <Typography variant="caption" className="price-text">
                        {formatUnits(BigInt(nft.listing?.price || "0"), 6)} VOI
                      </Typography>
                    </div>
                  </SweepNFTItem>
                );
              })}
            </SweepNFTList>

            <SweepTotalContainer $isDarkTheme={isDarkTheme}>
              <Typography
                variant="subtitle1"
                color={isDarkTheme ? "#fff" : "#000"}
              >
                Total Cost
              </Typography>
              <Typography variant="h6" color={isDarkTheme ? "#fff" : "#000"}>
                {formatUnits(
                  selected
                    .map((index) => nfts[index])
                    .reduce(
                      (acc, nft) => acc + BigInt(nft.listing?.price || "0"),
                      BigInt(0)
                    ),
                  6
                )}{" "}
                VOI
              </Typography>
            </SweepTotalContainer>

            <Button
              variant="contained"
              fullWidth
              onClick={handleSweepPurchase}
              disabled={isPurchasePending}
              sx={{
                backgroundColor: "#93f",
                color: "#fff",
                "&:hover": {
                  backgroundColor: "#7a29cc",
                },
                padding: "16px",
                fontSize: "1.1rem",
                fontWeight: "600",
                marginTop: "16px",
              }}
            >
              {isPurchasePending ? (
                <CircularProgress size={24} sx={{ color: "white" }} />
              ) : (
                `Purchase ${selected.length} NFTs`
              )}
            </Button>
          </SweepModalContent>
        </StyledDialogContent>
      </SweepModal>

      {/* Update the name selection dialog */}
      <StyledNameDialog
        open={isNameModalOpen && !confirmNameData} // Close when showing confirmation
        onClose={() => setIsNameModalOpen(false)}
        $isDarkTheme={isDarkTheme}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">Select Name</Typography>
            <IconButton onClick={() => setIsNameModalOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {loadingNames ? (
            <Stack spacing={2} alignItems="center" py={4}>
              <CircularProgress />
              <Typography>Loading available names...</Typography>
            </Stack>
          ) : availableNames.length === 0 ? (
            <Stack spacing={2} alignItems="center" py={4}>
              <Typography>No names found</Typography>
            </Stack>
          ) : (
            <NameList>
              {availableNames
                .filter(
                  (nameData) => !!nameData.name //&& nameData.name !== "enVoi name .voi"
                )
                .map((nameData) => (
                  <StyledListItemButton
                    key={nameData.token_id}
                    onClick={() => handleNameSelect(nameData)}
                    $isDarkTheme={isDarkTheme}
                  >
                    <StyledAvatar
                      src={nameData.metadata?.avatar}
                      $isDarkTheme={isDarkTheme}
                    >
                      {nameData.name.charAt(0).toUpperCase()}
                    </StyledAvatar>
                    <ListItemText
                      primary={nameData.name}
                      secondary={compactAddress(nameData?.address || "", 10)}
                    />
                  </StyledListItemButton>
                ))}
            </NameList>
          )}
        </DialogContent>
      </StyledNameDialog>

      {/* Add confirmation dialog */}
      <StyledNameDialog
        open={!!confirmNameData}
        onClose={() => !isPending && setConfirmNameData(null)} // Prevent closing while pending
        $isDarkTheme={isDarkTheme}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">Confirm Name Selection</Typography>
            <IconButton
              onClick={() => !isPending && setConfirmNameData(null)} // Prevent closing while pending
              disabled={isPending}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} py={2}>
            <Box sx={{ textAlign: "center" }}>
              <StyledAvatar
                src={confirmNameData?.metadata?.avatar}
                $isDarkTheme={isDarkTheme}
                sx={{ width: 80, height: 80, margin: "0 auto 16px" }}
              >
                {confirmNameData?.name.charAt(0).toUpperCase()}
              </StyledAvatar>
              <Typography variant="h5" gutterBottom>
                {confirmNameData?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {compactAddress(confirmNameData?.address || "", 10)}
              </Typography>
            </Box>

            <Typography align="center">
              {isPending
                ? "Setting your primary name..."
                : "Are you sure you want to set this as your primary name?"}
            </Typography>

            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="outlined"
                onClick={() => setConfirmNameData(null)}
                disabled={isPending}
                sx={{ minWidth: 120 }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleConfirmName}
                disabled={isPending}
                sx={{ minWidth: 120 }}
              >
                {isPending ? (
                  <CircularProgress size={24} sx={{ color: "white" }} />
                ) : (
                  "Confirm"
                )}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </StyledNameDialog>
    </>
  );
};

async function getCollectionTokens(collectionId: string) {
  try {
    const response = await fetch(
      collectionId !== "421076"
        ? `https://arc72-voi-mainnet.nftnavigator.xyz/nft-indexer/v1/tokens?contractId=${collectionId}`
        : `https://mainnet-idx.nautilus.sh/nft-indexer/v1/tokens?contractId=${collectionId}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const collectionTokens = await response.json();
    return collectionTokens;
  } catch (error) {
    console.error("Error fetching collection tokens:", error);
    throw error;
  }
}
