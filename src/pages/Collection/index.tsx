import React, { useEffect, useMemo, ReactNode, useState } from "react";
import Layout from "../../layouts/Default";
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Select,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Slider,
  Checkbox,
  FormControlLabel,
  IconButton,
  CircularProgress,
  Switch,
} from "@mui/material";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/store";
import axios from "axios";
import styled from "styled-components";
import { getSales } from "../../store/saleSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { ListingI, NFTIndexerListingI, RankingI, TokenType } from "../../types";
import { getCollections } from "../../store/collectionSlice";
import NFTListingTable from "../../components/NFTListingTable";
import ViewListIcon from "@mui/icons-material/ViewList";
import GridViewIcon from "@mui/icons-material/GridView";
import { getPrices } from "../../store/dexSlice";
import { CTCINFO_LP_WVOI_VOI } from "../../contants/dex";
import NftCard from "../../components/NFTCard";
import { getListings } from "../../store/listingSlice";
import { getTokens } from "../../store/tokenSlice";
import { BigNumber } from "bignumber.js";
import { getSmartTokens } from "../../store/smartTokenSlice";
//import { getRankings } from "../../utils/mp";
import Grid2 from "@mui/material/Unstable_Grid2/Grid2";
import CartNftCard from "../../components/CartNFTCard";
import { ARC72_INDEXER_API, HIGHFORGE_API } from "../../config/arc72-idx";
import { stripTrailingZeroBytes } from "@/utils/string";
import { useWallet } from "@txnlab/use-wallet-react";
import { stakingRewards } from "@/static/staking/staking";
import LayersIcon from "@mui/icons-material/Layers";
import { Dialog, DialogContent, DialogTitle } from "@mui/material";
import { SearchOutlined, Close } from "@mui/icons-material";
import { useDebounceCallback } from "usehooks-ts";
import CollectionSelect from "@/components/CollectionSelect";
import { useMarketplaceListings } from "@/hooks/mp";
import TollIcon from "@mui/icons-material/Toll";
import NorthEastIcon from "@mui/icons-material/NorthEast";
import { Staking } from "../Staking";
import { CONTRACT } from "ulujs";
import { getAlgorandClients } from "@/wallets";
import { useName } from "@/hooks/useName";
import { useEnvoiResolver } from "@/hooks/useEnvoiResolver";
import { formatUnits } from "viem";
import { toast } from "react-hot-toast";
import { mp, abi } from "ulujs";
import party from "party-js";

import { TOKEN_WVOI } from "@/contants/tokens";
import { CTCINFO_MP206_2 } from "@/contants/mp";
import algosdk from "algosdk";
const PriceRangeContainer = styled.div`
  display: flex;
  align-items: center;
  gap: var(--Main-System-10px, 10px);
  align-self: stretch;
`;

const Min = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  flex: 1 0 0;
  /* Text M/Regular */
  font-family: Inter;
  font-size: 15px;
  font-style: normal;
  font-weight: 400;
  line-height: 22px; /* 146.667% */
  color: var(--text-icons-base-second, #68727d);
`;

const MinInputContainer = styled.div`
  display: flex;
  height: 20px;
  padding: 9px 12px;
  align-items: center;
  gap: var(--Main-System-8px, 8px);
  align-self: stretch;
  border-radius: var(--Roundness-Inside-M, 6px);
  /* Shadow/XSM */
  box-shadow: 0px 1px 2px 0px rgba(16, 24, 40, 0.04);
  &.dark {
    border: 1px solid #3b3b3b;
    background: #2b2b2b;
  }
  &.light {
    border: 1px solid var(--Stroke-Base, #eaebf0);
    background: var(--Background-Base-Main, #fff);
  }
`;

const MinInputLabelContainer = styled.div`
  display: flex;
  align-items: flex-start;
  gap: var(--Main-System-8px, 8px);
  flex: 1 0 0;
`;

const MinInputLabel = styled.div`
  flex: 1 0 0;
`;

const To = styled.div`
  color: #2b2b2b;
  /* Text M/Regular */
  font-family: Inter;
  font-size: 15px;
  font-style: normal;
  font-weight: 400;
  line-height: 22px; /* 146.667% */
`;

const Max = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  flex: 1 0 0;
`;

const SidebarFilterContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  align-self: stretch;
`;

const SidebarFilter = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  align-self: stretch;
  margin-top: 24px;
`;

const SidebarLabel = styled.div`
  font-family: Nohemi;
  font-size: 18px;
  font-style: normal;
  font-weight: 600;
  line-height: 28px; /* 155.556% */
  flex-grow: 1;
  &.dark {
    color: #fff;
  }
  &.light {
    color: #161717;
  }
`;

const SearchContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  align-self: stretch;
`;

const SearchLabel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  align-self: stretch;
`;

const SearchInput = styled.div`
  display: flex;
  padding: var(--Main-System-10px, 10px) var(--Main-System-12px, 12px);
  align-items: center;
  gap: var(--Main-System-8px, 8px);
  align-self: stretch;
  border-radius: var(--Roundness-Inside-M, 6px);
  /* Shadow/XSM */
  box-shadow: 0px 1px 2px 0px rgba(16, 24, 40, 0.04);
  &.dark {
    border: 1px solid #3b3b3b;
    background: #2b2b2b;
  }
  &.light {
    border: 1px solid var(--Stroke-Base, #eaebf0);
    background: var(--Background-Base-Main, #fff);
  }
`;

const SearchIcon = styled.svg`
  width: var(--Main-System-16px, 16px);
  height: var(--Main-System-16px, 16px);
`;

const SearchPlaceholderText = styled.input`
  flex: 1 0 0;
  /* Text S/Medium */
  font-family: Inter;
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
  line-height: 20px; /* 142.857% */
  color: #68727d;
  &.dark.has-value {
    color: #fff;
  }
  &.light.has-value {
    color: #000;
  }
`;

const ListingRoot = styled.div`
  display: flex;
  align-items: flex-start;
  gap: var(--Main-System-20px, 20px);
  margin-top: 32px;
  padding-top: 0px;
`;

const SidebarFilterRoot = styled(Stack)`
  display: flex;
  width: 270px;
  padding: var(--Main-System-24px, 24px);
  /*
  flex-direction: column;
  align-items: flex-start;
  */
  gap: var(--Main-System-24px, 24px);
  border-radius: var(--Main-System-10px, 10px);
  flex-shrink: 0;
  &.dark {
    border: 1px solid #2b2b2b;
    background: #202020;
  }
  &.light {
    border: 1px solid #eaebf0;
    background: var(--Background-Base-Main, #fff);
  }
`;

const ListingContainer = styled.div`
  overflow: hidden;
  flex-grow: 1;
`;

const ListingHeading = styled.div`
  display: flex;
  /*
  width: 955px;
  */
  justify-content: space-between;
  align-items: flex-start;
`;

const HeadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-end;
  /*
  gap: var(--Main-System-2px, 2px);
  */
  gap: 6px;
`;

const HeadingTitle = styled.div`
  text-align: center;
  font-family: Nohemi;
  font-style: normal;
  font-weight: 700;
  line-height: 100%;
  letter-spacing: 0.5px;
  &.dark {
    color: #fff;
  }
  &.light {
    color: #93f;
  }

  // Add responsive font sizes
  font-size: 32px; // Default for mobile
  @media (min-width: 768px) {
    font-size: 48px; // Larger screens
  }
`;

const HeadingDescriptionContainer = styled.div`
  display: flex;
  width: 174px;
  align-items: center;
  gap: var(--Main-System-8px, 8px);
`;

const HeadingDescription = styled.div`
  flex: 1 0 0;
  color: #93f;
  font-family: "Advent Pro";
  font-size: 20px;
  font-style: normal;
  font-weight: 500;
  line-height: 24px; /* 120% */
  letter-spacing: 0.2px;
`;

const ListingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 24px;
  width: 100%;
  margin-top: 48px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: 1280px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

// ------------------------------

const SectionDescription = styled.div`
  flex: 1 0 0;
  color: #93f;
  font-family: "Advent Pro";
  font-size: 20px;
  font-style: normal;
  font-weight: 500;
  line-height: 24px; /* 120% */
  letter-spacing: 0.2px;
`;

const SectionHeading = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  /*
  padding-top: 45px;
  */
  margin-top: 0px;
  gap: 10px;
  & h2.dark {
    color: #fff;
  }
  & h2.light {
    color: #93f;
  }
`;

const SectionTitle = styled.h2`
  /*color: #93f;*/
  text-align: center;
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: Nohemi;
  font-size: 40px;
  font-style: normal;
  font-weight: 700;
  line-height: 100%; /* 40px */
`;

const SectionMoreButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  & a {
    text-decoration: none;
  }
  & button.button-dark {
    border: 1px solid #fff;
  }
  & button.button-dark::after {
    background: url("/arrow-narrow-up-right-dark.svg") no-repeat;
  }
  & div.button-text-dark {
    color: #fff;
  }
  & button.button-light {
    border: 1px solid #93f;
  }
  & button.button-light::after {
    background: url("/arrow-narrow-up-right-light.svg") no-repeat;
  }
  & div.button-text-light {
    color: #93f;
  }
`;

const SectionMoreButton = styled.button`
  /* Layout */
  display: flex;
  padding: 12px 20px;
  justify-content: center;
  align-items: center;
  gap: 6px;
  /* Style */
  border-radius: 100px;
  /* Shadow/XSM */
  box-shadow: 0px 1px 2px 0px rgba(16, 24, 40, 0.04);
  /* Style/Extra */
  background-color: transparent;
  &::after {
    content: "";
    width: 20px;
    height: 20px;
    position: relative;
    display: inline-block;
  }
`;

// ------------------------------

const StatContainer = styled(Stack)`
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  gap: var(--Main-System-24px, 24px);
  & .dark {
    color: #fff;
  }
  & .light {
    color: #000;
  }
`;

const BannerContainer = styled.div`
  display: flex;
  width: 100%;
  height: 200px;
  align-items: flex-end;
  flex-shrink: 0;
  border-radius: 16px;
  background-size: cover;
  position: relative;
  margin-bottom: 100px;

  @media (min-width: 769px) {
    margin-bottom: 24px;
    padding-bottom: 0;
  }
`;

const BannerOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 0 20px 20px;
  border-radius: 16px;

  @media (min-width: 769px) {
    padding: 0 40px 50px;
  }
`;

const BannerTitleContainer = styled.div`
  display: flex;
  /*
  width: 400px;
  */
  height: 80px;
  padding: 28px;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--Main-System-8px, 8px);
  flex-shrink: 0;
  border-radius: var(--Main-System-16px, 16px);
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(50px);
  margin-left: 40px;
`;

const BannerTitle = styled.h1<{ $isDarkTheme: boolean }>`
  flex: 1 0 0;
  color: #fff;
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: Nohemi;
  font-style: normal;
  font-weight: 700;
  line-height: 100%;

  // Add responsive font sizes
  font-size: 28px; // Default for mobile
  @media (min-width: 768px) {
    font-size: 40px; // Larger screens
  }
  z-index: 2;
`;

const BannerUrlContainer = styled.a`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 100px;
  text-decoration: none;
  color: white;
  transition: all 0.2s;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 2;

  &:hover {
    background: rgba(0, 0, 0, 0.8);
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
  }
`;

const BannerLinksContainer = styled.div`
  display: flex;
  gap: 12px;
  z-index: 2;
  position: relative;
  margin-top: 24px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    width: 100%;
  }
`;

const StyledLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const formatter = Intl.NumberFormat("en", { notation: "compact" });

const HeroSection = styled.div<{ $isDarkTheme: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  background-size: cover;
  background-position: center;
  position: relative;
  margin-bottom: 48px;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.7) 0%,
      rgba(0, 0, 0, 0.5) 50%,
      rgba(0, 0, 0, 0.3) 100%
    );
    z-index: 1;
  }
`;

const HeroTitle = styled.h1<{ $isDarkTheme: boolean }>`
  font-family: Nohemi;
  font-size: 48px;
  font-weight: 700;
  color: #fff;
  text-align: center;
  margin-bottom: 16px;
  position: relative;
  z-index: 2;

  @media (max-width: 600px) {
    font-size: 32px;
  }
`;

const HeroSubtitle = styled.div<{ $isDarkTheme: boolean }>`
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 auto;
  line-height: 1.6;
  text-align: center;
  padding: 0 24px;
  max-width: 800px;
  position: relative;
  z-index: 2;

  @media (max-width: 600px) {
    font-size: 1rem;
  }
`;

const StatsHighlight = styled.div`
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 32px;
  flex-wrap: wrap;
  position: relative;
  z-index: 2;
`;

const StatItem = styled.div<{ $isDarkTheme: boolean }>`
  text-align: center;

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #fff;
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.7);
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`;

// Add new styled component for the modal
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

const SweepSliderContainer = styled.div`
  padding: 0 12px;
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
  border-radius: 16px;
  background: ${(props) =>
    props.$isDarkTheme ? "rgba(60, 60, 60, 0.7)" : "rgba(255, 255, 255, 0.7)"};
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
`;

const SweepNFTImage = styled.img<{ $isDarkTheme: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  object-fit: cover;
`;

const SweepTotalContainer = styled.div<{ $isDarkTheme: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-radius: 16px;
  background: ${(props) =>
    props.$isDarkTheme ? "rgba(60, 60, 60, 0.7)" : "rgba(255, 255, 255, 0.7)"};
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  margin-top: auto;
`;

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

// Add this new function before the Collection component
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

export const Collection: React.FC = () => {
  /* Theme */

  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  /* Router */

  const { id } = useParams();

  const dispatch = useDispatch();

  /* Listings */
  // const listings = useSelector((state: any) => state.listings.listings);
  // const listingsStatus = useSelector((state: any) => state.listings.status);
  // useEffect(() => {
  //   dispatch(getListings() as unknown as UnknownAction);
  // }, [dispatch]);

  const listCollectionIds: number[] = useMemo(() => [id].map(Number), [id]);

  /* Tokens */
  // const tokens = useSelector((state: any) => state.tokens.tokens);
  // const tokenStatus = useSelector((state: any) => state.tokens.status);
  // useEffect(() => {
  //   dispatch(getTokens() as unknown as UnknownAction);
  // }, [dispatch]);

  /* Smart Tokens */
  const smartTokens = useSelector((state: any) => state.smartTokens.tokens);
  const smartTokenStatus = useSelector(
    (state: any) => state.smartTokens.status
  );
  useEffect(() => {
    dispatch(getSmartTokens() as unknown as UnknownAction);
  }, [dispatch]);

  /* Dex */
  const prices = useSelector((state: RootState) => state.dex.prices);
  const dexStatus = useSelector((state: RootState) => state.dex.status);
  useEffect(() => {
    dispatch(getPrices() as unknown as UnknownAction);
  }, [dispatch]);
  const exchangeRate = 1;
  /*useMemo(() => {
    if (!prices || dexStatus !== "succeeded") return 0;
    const voiPrice = prices.find((p) => p.contractId === CTCINFO_LP_WVOI_VOI);
    if (!voiPrice) return 0;
    return voiPrice.rate;
  }, [prices, dexStatus]);
  */

  /* Sales */
  const sales = useSelector((state: any) => state.sales.sales);
  const salesStatus = useSelector((state: any) => state.sales.status);
  useEffect(() => {
    dispatch(getSales() as unknown as UnknownAction);
  }, [dispatch]);

  /* Collections */
  const collections = useSelector(
    (state: any) => state.collections.collections
  );
  const collectionStatus = useSelector(
    (state: any) => state.collections.status
  );
  useEffect(() => {
    dispatch(getCollections() as unknown as UnknownAction);
  }, [dispatch]);

  /* Collection Info */

  const [collectionInfo, setCollectionInfo] = React.useState<any>(null);
  useEffect(() => {
    try {
      axios.get(`${HIGHFORGE_API}/projects/info/${id}`).then((res: any) => {
        if (res.status === 200) {
          setCollectionInfo(res.data);
        }
      });
    } catch (e) {
      console.log(e);
    }
  }, [id]);

  console.log("collectionInfo", collectionInfo);

  const { fetchCollectionName, fetchText } = useName();

  const [search, setSearch] = useState<string>("");
  const [searchValue, setSearchValue] = useState<string>("");
  const [min, setMin] = useState<string>("");
  const [max, setMax] = useState<string>("");
  const [currency, setCurrency] = useState<string>("");
  const [collection, setCollection] = useState<string>("");
  const [showing, setShowing] = useState(50);
  const [lockups, setLockups] = useState<number[]>([]);

  const debouncedSearch = useDebounceCallback(setSearch, 500);
  const debouncedMin = useDebounceCallback(setMin, 500);
  const debouncedMax = useDebounceCallback(setMax, 500);

  const { data: listings, isLoading: collectionListingsLoading } =
    useMarketplaceListings(Number(id));

  const normalListings = useMemo(() => {
    if (collectionListingsLoading) return [];
    return listings?.map((listing: NFTIndexerListingI) => {
      const smartToken = smartTokens.find(
        (token: TokenType) => `${token.contractId}` === `${listing.currency}`
      );
      const currencyDecimals =
        smartToken?.decimals === 0 ? 0 : smartToken?.decimals || 6;
      const unitPriceBn = new BigNumber(
        listing.currency === 0 ? "1" : smartToken?.price || "0"
      );
      const tokenPriceBn = new BigNumber(listing.price).div(
        new BigNumber(10).pow(currencyDecimals)
      );
      const normalPriceBn = unitPriceBn.multipliedBy(tokenPriceBn);
      return {
        ...listing,
        normalPrice: normalPriceBn.toNumber(),
      };
    });
  }, [listings, smartTokens]);

  const sortedListings = useMemo(() => {
    return normalListings?.sort((a: any, b: any) => {
      return a.normalPrice - b.normalPrice;
    });
  }, [normalListings]);

  // Add new state to track purchased listing IDs
  const [purchasedListingIds, setPurchasedListingIds] = useState<Set<string>>(
    new Set()
  );

  // Modify the filteredListings useMemo to exclude purchased items
  const filteredListings = useMemo(() => {
    const listings = sortedListings?.map((listing: ListingI) => {
      const nft = listing.token;
      const metadata = JSON.parse(`${nft?.metadata}`);
      const properties = metadata?.properties || {};
      const traitKeys = Object.keys(properties).join("").toLowerCase();
      const traitValues = Object.values(properties).join("").toLowerCase();
      let relevancy = 0;
      do {
        if (search) {
          if (metadata?.name?.toLowerCase().includes(search.toLowerCase())) {
            relevancy +=
              256 - metadata?.name?.toLowerCase().indexOf(search.toLowerCase());
            break;
          }
          if (
            metadata?.description?.toLowerCase().includes(search.toLowerCase())
          ) {
            relevancy +=
              128 -
              metadata?.description
                ?.toLowerCase()
                .indexOf(search.toLowerCase());
            break;
          }
          if (traitKeys.indexOf(search) !== -1) {
            relevancy += 1;
            break;
          }
          if (traitValues.indexOf(search) !== -1) {
            relevancy += 1;
            break;
          }
        }
      } while (0);
      return {
        ...listing,
        relevancy,
      };
    });
    if (search === "") {
      listings?.sort((a: any, b: any) => b.round - a.round);
      return listings.filter(
        (el: any) =>
          // Add check for purchased items
          !purchasedListingIds.has(`${el.mpContractId}-${el.mpListingId}`) &&
          (`${currency}` === "" ||
            currency.split(",").map(Number).includes(el.currency)) &&
          (`${collection}` === "" ||
            `${collection}` === `${el.collectionId}`) &&
          el.price / 1e6 >= (min ? parseInt(min) : 0) &&
          el.price / 1e6 <= (max ? parseInt(max) : Number.MAX_SAFE_INTEGER)
      );
    } else {
      listings?.sort((a: any, b: any) => b.relevancy - a.relevancy);
      return listings?.filter(
        (el: any) =>
          // Add check for purchased items
          !purchasedListingIds.has(`${el.mpContractId}-${el.mpListingId}`) &&
          (`${currency}` === "" ||
            currency.split(",").map(Number).includes(el.currency)) &&
          (`${collection}` === "" ||
            `${collection}` === `${el.collectionId}`) &&
          el.relevancy > 0 &&
          el.price / 1e6 >= (min ? parseInt(min) : 0) &&
          el.price / 1e6 <= (max ? parseInt(max) : Number.MAX_SAFE_INTEGER)
      );
    }
  }, [
    sortedListings,
    search,
    min,
    max,
    currency,
    collection,
    purchasedListingIds,
  ]);

  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");

  // const stats: any = useMemo(() => {
  //   if (
  //     //tokenStatus !== "succeeded" ||
  //     //listingsStatus !== "succeeded" ||
  //     salesStatus !== "succeeded" ||
  //     collectionStatus !== "succeeded" ||
  //     smartTokenStatus !== "succeeded" ||
  //     //!tokens ||
  //     !collections ||
  //     !sales ||
  //     //!listings ||
  //     !smartTokens
  //   )
  //     return null;
  //   const rankings = getRankings(
  //     //tokens,
  //     collections,
  //     sales,
  //     listings,
  //     1,
  //     smartTokens
  //   );
  //   return rankings.find((el: RankingI) => `${el.collectionId}` === `${id}`);
  // }, [
  //   sales,
  //   tokens,
  //   collections,
  //   //listings,
  //   smartTokens,
  //   id,
  //   tokenStatus,
  //   //listingsStatus,
  //   salesStatus,
  //   collectionStatus,
  //   smartTokenStatus,
  // ]);

  // const [tokenPrices, setTokenPrices] = React.useState<Map<number, string>>();
  // useEffect(() => {
  //   const tokenPrices = new Map();
  //   for (const token of smartTokens) {
  //     if (!token?.price) {
  //       tokenPrices.set(token.contractId, token?.price || "0");
  //     }
  //   }
  //   setTokenPrices(tokenPrices);
  // }, [smartTokens]);

  // const normalListings = useMemo(() => {
  //   if (!listings || !exchangeRate) return [];
  //   return listings.map((listing: ListingI) => {
  //     return {
  //       ...listing,
  //       normalPrice:
  //         listing.currency === 0 ? listing.price : listing.price * exchangeRate,
  //     };
  //   });
  // }, [listings, exchangeRate]);

  const nfts: any[] = [];
  // const nfts = useMemo(() => {
  //   return tokens?.filter((token: any) => `${token.contractId}` === `${id}`);
  // }, [tokens]);

  // const listedNfts = useMemo(() => {
  //   const listedNfts =
  //     nfts
  //       ?.filter((nft: any) => {
  //         return normalListings?.some(
  //           (listing: any) =>
  //             `${listing.collectionId}` === `${nft.contractId}` &&
  //             `${listing.tokenId}` === `${nft.tokenId}`
  //         );
  //       })
  //       ?.map((nft: any) => {
  //         const listing = normalListings.find(
  //           (l: any) =>
  //             `${l.collectionId}` === `${nft.contractId}` &&
  //             `${l.tokenId}` === `${nft.tokenId}`
  //         );
  //         return {
  //           ...nft,
  //           listing,
  //         };
  //       }) || [];
  //   listedNfts.sort(
  //     (a: any, b: any) => a.listing.normalPrice - b.listing.normalPrice
  //   );
  //   return listedNfts;
  // }, [nfts, normalListings]);

  // const listedCollections = useMemo(() => {
  //   const listedCollections =
  //     collections
  //       ?.filter((c: any) => {
  //         return listedNfts?.some(
  //           (nft: any) => `${nft.contractId}` === `${c.contractId}`
  //         );
  //       })
  //       .map((c: any) => {
  //         return {
  //           ...c,
  //           tokens: listedNfts?.filter(
  //             (nft: any) => `${nft.contractId}` === `${c.contractId}`
  //           ),
  //         };
  //       }) || [];
  //   listedCollections.sort(
  //     (a: any, b: any) =>
  //       b.tokens[0].listing.createTimestamp -
  //       a.tokens[0].listing.createTimestamp
  //   );
  //   return listedCollections;
  // }, [collections, listedNfts]);

  const collectionSales = useMemo(() => {
    return (
      sales?.filter((sale: any) => `${sale.collectionId}` === `${id}`) || []
    );
  }, [sales]);

  const isLoading = useMemo(
    () =>
      //tokenStatus !== "succeeded" ||
      //listingsStatus !== "succeeded" ||
      salesStatus !== "succeeded" ||
      collectionStatus !== "succeeded" ||
      smartTokenStatus !== "succeeded" ||
      //!tokens ||
      !collectionSales ||
      !collections ||
      //!nfts ||
      //!listings ||
      //!listedNfts ||
      //!listedCollections ||
      !sales,
    [
      collections,
      nfts,
      //listings,
      //listedNfts, listedCollections,
      //stats,
    ]
  );

  const [collectionNfts, setCollectionNfts] = React.useState<any[]>([]);
  useEffect(() => {
    try {
      axios
        .get(`${ARC72_INDEXER_API}/nft-indexer/v1/tokens`, {
          params: {
            contractId: id,
          },
        })
        .then(({ data }) => {
          setCollectionNfts(data.tokens);
        });
    } catch (e) {
      console.log(e);
    }
  }, [id]);

  const displayCoverImage = useMemo(() => {
    if (collectionInfo?.project?.coverImageURL)
      return collectionInfo?.project?.coverImageURL;
    if (collectionNfts.length === 0) return "";
    return collectionInfo?.project?.coverImageURL ||
      (collectionNfts[0]?.metadata?.image || "").indexOf("ipfs") > -1
      ? collectionNfts[0]?.metadata?.image
      : `https://ipfs.io/ipfs/${JSON.parse(
          collectionNfts[0]?.metadata
        )?.image.slice(7)}`;
  }, [collectionInfo, collectionNfts]);

  // TODO use name
  const displayCollectionName = useMemo(() => {
    if (id === "797609") return ".voi";
    if (collectionInfo?.project?.title) return collectionInfo?.project?.title;
    if (collectionNfts.length === 0) return "";
    return JSON.parse(collectionNfts[0]?.metadata)?.name?.replace(
      /[0-9]*$/,
      ""
    );
  }, [collectionInfo, collectionNfts]);

  const navigate = useNavigate();

  const { activeAccount, signTransactions } = useWallet();

  const resolver = useEnvoiResolver();
  const [collectionProfile, setCollectionProfile] = React.useState<any>(null);
  useEffect(() => {
    if (!id) return;
    // get name from Resolver
    fetchCollectionName(id).then((name: string) => {
      if (!name) return;
      resolver.http.search(name).then((results: any[]) => {
        console.log({ results });
        if (results.length === 1) {
          setCollectionProfile(results[0]);
        }
      });
      /*
      fetchText(name, "url").then((text: string) => {
        const sanitizeText = (text: string) => {
          return stripTrailingZeroBytes(text);
        };
        setCollectionUrl(sanitizeText(text));
      });
      fetchText(name, "com.twitter").then((text: string) => {
        const sanitizeText = (text: string) => {
          return text
            .replace(/https?:\/\//, "")
            .replace(/@/g, "")
            .replace(/#/g, "")
            .replace(/ /g, "");
        };
        setCollectionTwitter(sanitizeText(text));
      });
      */
    });
  }, [id]);

  console.log({ collectionProfile });

  const [accounts, setAccounts] = React.useState<any[]>([]);
  React.useEffect(() => {
    if (!activeAccount) return;
    axios
      .get(`https://mainnet-idx.nautilus.sh/v1/scs/accounts`, {
        params: {
          owner: activeAccount.address,
        },
      })
      .then(({ data: { accounts } }) => {
        setAccounts(
          accounts.map((account: any) => {
            const reward = stakingRewards.find(
              (reward) => `${reward.contractId}` === `${account.contractId}`
            );
            return {
              ...account,
              global_initial:
                reward?.initial ||
                account.global_initial ||
                account?.global_initial ||
                0,
              global_total:
                reward?.total ||
                reward?.global_total ||
                account?.global_total ||
                0,
            };
          })
        );
      });
  }, [activeAccount]);

  const [isMintModalVisible, setIsMintModalVisible] = React.useState(false);

  const handleLockups = (
    event: React.MouseEvent<HTMLElement>,
    newLockups: number[]
  ) => {
    console.log({ newLockups, lockups });
    if (
      //lockups.length === 1 &&
      lockups.length === newLockups.length
      //lockups[0] === newLockups[0]
    ) {
      setLockups([]);
    } else if (newLockups.length) {
      setLockups(newLockups);
    }
  };

  const [hasNFTNavigatorData, setHasNFTNavigatorData] = useState(false);

  // Add effect to check NFT Navigator data
  useEffect(() => {
    if (!id) return;
    axios
      .get(
        `https://arc72-voi-mainnet.nftnavigator.xyz/nft-indexer/v1/collections?includes=unique-owners&contractId=${id}`
      )
      .then(({ data }) => {
        setHasNFTNavigatorData(data.collections && data.collections.length > 0);
      })
      .catch(() => {
        setHasNFTNavigatorData(false);
      });
  }, [id]);

  const [isSweepModalOpen, setIsSweepModalOpen] = useState(false);
  const [selectedCount, setSelectedCount] = useState(1);

  const [isPurchasePending, setIsPurchasePending] = useState(false);

  const handleSweepPurchase = async () => {
    if (!activeAccount) {
      alert("Please connect wallet!");
      return;
    }

    setIsPurchasePending(true);
    try {
      const { algodClient, indexerClient } = getAlgorandClients();

      const defaultPaymentToken = {
        contractId: 390001,
        name: "Wrapped Voi",
        symbol: "wVOI",
        decimals: 6,
        tokenId: "0",
      };

      const ci = new CONTRACT(
        CTCINFO_MP206_2,
        algodClient,
        indexerClient,
        abi.custom,
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );

      // Get the listings to purchase
      const listingsToPurchase = filteredListings.slice(0, selectedCount);

      // Process each listing sequentially
      const simTxns: any[] = [];
      //for (const listing of listingsToPurchase) {
      for (let i = 0; i < listingsToPurchase.length; i++) {
        const listing = listingsToPurchase[i];
        try {
          // Verify listing is still available
          const ci = new CONTRACT(
            listing.mpContractId,
            algodClient,
            indexerClient,
            {
              name: "",
              desc: "",
              methods: [
                {
                  name: "v_sale_listingByIndex",
                  args: [{ type: "uint256" }],
                  readonly: true,
                  returns: {
                    type: "(uint64,uint256,address,(byte,byte[40]),uint64,uint64,uint64,uint64,uint64,uint64,address,address,address)",
                  },
                },
              ],
              events: [],
            },
            { addr: activeAccount.address, sk: new Uint8Array(0) }
          );

          const v_sale_listingByIndexR = await ci.v_sale_listingByIndex(
            listing.mpListingId
          );
          if (!v_sale_listingByIndexR.success) {
            throw new Error("Failed to get listing");
          }

          const v_sale_listingByIndex = v_sale_listingByIndexR.returnValue;
          if (v_sale_listingByIndex[1] === BigInt(0)) {
            throw new Error("Listing no longer available");
          }

          // Attempt purchase with and without skipEnsure
          let customR;
          for (const skipEnsure of [true, false]) {
            customR = await mp.buy(
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
                skipEnsure,
                strategy: "default",
                //skipFundCollection: true,
                paymentOffset: i,
              }
            );
            console.log({ customR });
            if (customR.success) break;
          }

          if (!customR.success) throw new Error("Purchase failed");

          simTxns.push(customR);
        } catch (e: any) {
          console.error(`Failed to purchase NFT #${listing.tokenId}:`, e);
          toast.error(
            `Failed to purchase NFT #${listing.tokenId}: ${e.message}`
          );
        }
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
      console.log({ customR });

      if (!customR.success) throw new Error("Purchase failed");

      // Sign and send transaction
      const stxn = await signTransactions(
        customR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );
      const res = await algodClient
        .sendRawTransaction(stxn as Uint8Array[])
        .do();
      console.log({ res });

      // After successful purchase, update the purchasedListingIds
      const newPurchasedIds = new Set(purchasedListingIds);
      listingsToPurchase.forEach((listing) => {
        newPurchasedIds.add(`${listing.mpContractId}-${listing.mpListingId}`);
      });
      setPurchasedListingIds(newPurchasedIds);

      setIsPurchasePending(false);
      setIsSweepModalOpen(false);
      setSelectedCount(1);

      // Enhanced party effect
      const button = document.querySelector("button");
      if (button) {
        // First burst of confetti
        party.confetti(button, {
          count: party.variation.range(40, 60),
          size: party.variation.range(1, 1.5),
          speed: party.variation.range(300, 500),
          spread: 50,
          shapes: ["square", "circle", "star"],
        });

        // Second burst after a small delay
        setTimeout(() => {
          party.confetti(button, {
            count: party.variation.range(30, 50),
            size: party.variation.range(0.8, 1.2),
            speed: party.variation.range(200, 400),
            spread: 40,
          });
        }, 200);
      }

      // Success notification
      toast.success(
        `🎉 Successfully purchased ${selectedCount} NFTs! Welcome to the collection!`,
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
    } catch (e: any) {
      console.error("Sweep purchase failed:", e);
      toast.error(`Sweep purchase failed: ${e.message}`);
      setIsPurchasePending(false);
    }
  };

  const renderSidebar = (
    <SidebarFilterRoot
      className={`${isDarkTheme ? "dark" : "light"} p-3  md:!block `}
      // sx={{
      //   display: { xs: "none", md: "block" },
      // }}
    >
      <SearchContainer className="">
        <SearchInput className={isDarkTheme ? "dark" : "light"}>
          <SearchIcon
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <g clip-path="url(#clip0_1018_4041)">
              <path
                d="M14.6673 14.6667L11.6673 11.6667M13.334 7.33333C13.334 10.647 10.6477 13.3333 7.33398 13.3333C4.02028 13.3333 1.33398 10.647 1.33398 7.33333C1.33398 4.01962 4.02028 1.33333 7.33398 1.33333C10.6477 1.33333 13.334 4.01962 13.334 7.33333Z"
                stroke="#68727D"
                strokeWidth="1.77778"
                strokeLinecap="round"
              />
            </g>
            <defs>
              <clipPath id="clip0_1018_4041">
                <rect width="16" height="16" fill="white" />
              </clipPath>
            </defs>
          </SearchIcon>
          <SearchPlaceholderText
            type="text"
            className={[
              search ? "has-value" : "",
              isDarkTheme ? "dark" : "light",
            ].join(" ")}
            placeholder="Search"
            value={searchValue}
            onChange={(e) => {
              if (e.target.value === "") {
                setSearch("");
                setSearchValue("");
              }
              debouncedSearch(e.target.value);
              setSearchValue(e.target.value);
            }}
          />
        </SearchInput>
      </SearchContainer>
      <SidebarFilterContainer>
        <SidebarFilter>
          <Stack
            direction="row"
            sx={{
              justifyContent: "flex-start",
              width: "100%",
              gap: "12px",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M8.5 14.6667C8.5 15.9553 9.54467 17 10.8333 17H13C14.3807 17 15.5 15.8807 15.5 14.5C15.5 13.1193 14.3807 12 13 12H11C9.61929 12 8.5 10.8807 8.5 9.5C8.5 8.11929 9.61929 7 11 7H13.1667C14.4553 7 15.5 8.04467 15.5 9.33333M12 5.5V7M12 17V18.5M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12 2C17.5228 2 22 6.47715 22 12Z"
                stroke={isDarkTheme ? "white" : "black"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <SidebarLabel className={isDarkTheme ? "dark" : "light"}>
              Price
            </SidebarLabel>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M5 12H19"
                stroke={isDarkTheme ? "white" : "black"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Stack>
          {/*<TokenSelect
            filter={(t: TokenType) => listCurencies.includes(t.contractId)}
            onChange={(newValue: any) => {
              if (!newValue) {
                setCurrency("");
                return;
              }
              const currency = `${newValue?.contractId || "0"}`;
              if (currency === "0") {
                const CTC_INFO_WVOI = 34099056;
                setCurrency(`0,${CTC_INFO_WVOI}`);
              } else {
                setCurrency(`${newValue?.contractId}`);
              }
            }}
          />*/}
          <PriceRangeContainer>
            <Min>
              <MinInputContainer className={isDarkTheme ? "dark" : "light"}>
                <MinInputLabelContainer>
                  <input
                    placeholder="Min"
                    onChange={(e) => {
                      if (
                        e.target.value === "" &&
                        isNaN(parseInt(e.target.value))
                      )
                        return;
                      debouncedMin(e.target.value);
                    }}
                    style={{
                      color: isDarkTheme ? "white" : "black",
                      width: "100%",
                    }}
                    type="text"
                  />
                </MinInputLabelContainer>
              </MinInputContainer>
            </Min>
            <To>to</To>
            <Min>
              <MinInputContainer className={isDarkTheme ? "dark" : "light"}>
                <MinInputLabelContainer>
                  <input
                    placeholder="Max"
                    onChange={(e) => {
                      if (
                        e.target.value !== "" &&
                        isNaN(parseInt(e.target.value))
                      )
                        return;
                      debouncedMax(e.target.value);
                    }}
                    style={{
                      color: isDarkTheme ? "white" : "black",
                      width: "100%",
                    }}
                    type="text"
                  />
                </MinInputLabelContainer>
              </MinInputContainer>
            </Min>
          </PriceRangeContainer>
        </SidebarFilter>
      </SidebarFilterContainer>
      {/** Staking Filters  **/}
      {/*<SidebarFilterContainer>
        <SidebarFilter>
          <Stack
            direction="row"
            sx={{
              justifyContent: "flex-start",
              width: "100%",
              gap: "12px",
            }}
          >
            <SidebarLabel className={isDarkTheme ? "dark" : "light"}>
              Lockup
            </SidebarLabel>
          </Stack>
          <Stack direction="row" gap={1}>
            <Paper>
              <ToggleButtonGroup
                fullWidth
                orientation="horizontal"
                value={lockups}
                onChange={handleLockups}
              >
                {[0, 1, 2, 3, 4, 5].map((year) => (
                  <ToggleButton value={year}>
                    <Typography variant="body2" color="textSecondary">
                      {year}
                    </Typography>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Paper>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography
                variant="body2"
                color="textSecondary"
                sx={{
                  color: isDarkTheme ? "white" : "black",
                }}
              >
                Years
              </Typography>
            </Box>
          </Stack>
        </SidebarFilter>
      </SidebarFilterContainer>*/}
      {/*<SidebarFilterContainer>
        <SidebarFilter>
          <Stack
            direction="row"
            sx={{
              justifyContent: "flex-start",
              width: "100%",
              gap: "12px",
            }}
          >
            <LayersIcon />
            <SidebarLabel className={isDarkTheme ? "dark" : "light"}>
              Collection
            </SidebarLabel>
           
          </Stack>
          <CollectionSelect
            filter={(c: any) => {
              return listCollectionIds.includes(c.contractId);
            }}
            onChange={(newValue: any) => {
              if (!newValue) {
                setCollection("");
                return;
              }
              setCollection(`${newValue?.contractId}`);
            }}
          />
        </SidebarFilter>
      </SidebarFilterContainer>*/}
    </SidebarFilterRoot>
  );

  const [collectionTokens, setCollectionTokens] = useState<any[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchTokens = async () => {
      setIsLoadingTokens(true);
      setTokenError(null);
      try {
        const response = await getCollectionTokens(id);
        setCollectionTokens(response.tokens || []);
      } catch (error) {
        console.error("Failed to fetch collection tokens:", error);
        setTokenError("Failed to load collection tokens");
      } finally {
        setIsLoadingTokens(false);
      }
    };
    fetchTokens();
  }, [id]);

  const [showRarity, setShowRarity] = useState(false);
  const [rarityData, setRarityData] = useState<TokenRarity[]>([]);

  useEffect(() => {
    if (collectionTokens.length > 0 || showRarity) {
      const rarity = calculateRarityData(collectionTokens);
      setRarityData(rarity);
    }
  }, [collectionTokens, showRarity]);

  console.log({ collectionTokens, rarityData });

  return (
    <>
      <HeroSection
        $isDarkTheme={isDarkTheme}
        style={{
          backgroundImage: `url(${displayCoverImage})`,
        }}
      >
        <HeroTitle $isDarkTheme={isDarkTheme}>
          {displayCollectionName}
        </HeroTitle>
        <HeroSubtitle $isDarkTheme={isDarkTheme}>
          {collectionInfo?.project?.description ||
            "Explore this unique collection of digital assets on the Voi blockchain."}
        </HeroSubtitle>
        <BannerLinksContainer>
          {collectionInfo && (
            <BannerUrlContainer
              href={`https://highforge.io/project/${id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://highforge.io/apple-touch-icon.png"
                alt="HighForge"
                style={{ width: 24, height: 24 }}
              />
              HighForge
            </BannerUrlContainer>
          )}

          {hasNFTNavigatorData && (
            <BannerUrlContainer
              href={`https://nftnavigator.xyz/collection/${id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://nftnavigator.xyz/_app/immutable/assets/android-chrome-192x192.BJQGzsFc.png"
                alt="NFT Navigator"
                style={{ width: 24, height: 24 }}
              />
              NFT Navigator
            </BannerUrlContainer>
          )}
          {collectionProfile && (
            <>
              <BannerUrlContainer
                href={`https://app.envoi.sh/#/${collectionProfile.name}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={
                    collectionProfile.metadata.avatar ||
                    "https://app.envoi.sh/favicon.ico"
                  }
                  alt="Envoi"
                  style={{ width: 24, height: 24, borderRadius: "50%" }}
                />
                {collectionProfile.name}
              </BannerUrlContainer>

              {collectionProfile.metadata["com.twitter"] && (
                <BannerUrlContainer
                  href={`https://x.com/${collectionProfile.metadata["com.twitter"]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  {collectionProfile.metadata["com.twitter"]}
                </BannerUrlContainer>
              )}
            </>
          )}
        </BannerLinksContainer>
        <StatsHighlight>
          <StatItem $isDarkTheme={isDarkTheme}>
            <div className="stat-value">{collectionNfts.length}</div>
            <div className="stat-label">TOTAL ITEMS</div>
          </StatItem>
          <StatItem $isDarkTheme={isDarkTheme}>
            <div className="stat-value">{filteredListings.length}</div>
            <div className="stat-label">LISTED ITEMS</div>
          </StatItem>
          <StatItem $isDarkTheme={isDarkTheme}>
            <div className="stat-value">{collectionSales.length}</div>
            <div className="stat-label">TOTAL SALES</div>
          </StatItem>
        </StatsHighlight>
      </HeroSection>
      <Layout>
        <ListingRoot className="!flex !flex-col lg:!flex-row !items-center md:!items-start">
          {renderSidebar}
          <ListingContainer>
            {viewMode === "list" ? (
              <Box sx={{ mt: 3 }}>
                <NFTListingTable
                  listings={filteredListings}
                  tokens={filteredListings.map((el: any) => el.token)}
                  collections={collections}
                  columns={["timestamp", "price", "discount"]}
                />
              </Box>
            ) : null}
            {viewMode === "grid" ? (
              <Box sx={{ mt: 3 }}>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <Typography
                      variant="body2"
                      sx={{
                        color: isDarkTheme ? "#fff" : "textSecondary",
                      }}
                    >
                      {filteredListings.length} items
                    </Typography>
                  </div>

                  <div className="flex items-center gap-3">
                    <FormControlLabel
                      control={
                        <Switch
                          checked={showRarity}
                          onChange={(e) => setShowRarity(e.target.checked)}
                          sx={{
                            "& .MuiSwitch-switchBase.Mui-checked": {
                              color: "#93f",
                              "&:hover": {
                                backgroundColor: "rgba(153, 51, 255, 0.04)",
                              },
                            },
                            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                              {
                                backgroundColor: "#93f",
                              },
                          }}
                        />
                      }
                      label={
                        <Typography
                          sx={{
                            color: isDarkTheme ? "#fff" : "textSecondary",
                          }}
                        >
                          Show Rarity
                        </Typography>
                      }
                    />
                    <Button
                      variant="outlined"
                      startIcon={<LayersIcon />}
                      onClick={() => setIsSweepModalOpen(true)}
                      sx={{
                        borderColor: isDarkTheme ? "#fff" : "#93f",
                        color: isDarkTheme ? "#fff" : "#93f",
                        "&:hover": {
                          borderColor: isDarkTheme ? "#fff" : "#93f",
                          backgroundColor: "rgba(153, 51, 255, 0.04)",
                        },
                      }}
                    >
                      Sweep Mode
                    </Button>
                  </div>
                </div>

                <ListingGrid>
                  {filteredListings
                    .slice(0, showing)
                    .map((el: NFTIndexerListingI) => {
                      const pk = `${el.mpContractId}-${el.mpListingId}`;
                      const listedToken = {
                        ...el.token,
                        metadataURI: stripTrailingZeroBytes(
                          el.token.metadataURI
                        ),
                      };
                      // Only pass rarity data if showRarity is true
                      const rarity = showRarity
                        ? rarityData.find(
                            (token) => token.tokenId === el.token.tokenId
                          )
                        : undefined;
                      return (
                        <CartNftCard
                          key={pk}
                          token={listedToken}
                          listing={el}
                          rarity={rarity}
                          onClick={() => {
                            navigate(
                              `/collection/${el.token.contractId}/token/${el.token.tokenId}`
                            );
                          }}
                        />
                      );
                    })}

                  {showing < sortedListings.length && (
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => setShowing(showing + 50)}
                      sx={{
                        borderColor: isDarkTheme ? "#fff" : "#93f",
                        color: isDarkTheme ? "#fff" : "#93f",
                        height: "48px",
                        "&:hover": {
                          borderColor: isDarkTheme ? "#fff" : "#93f",
                          backgroundColor: "rgba(153, 51, 255, 0.04)",
                        },
                      }}
                    >
                      View More
                    </Button>
                  )}
                </ListingGrid>
              </Box>
            ) : null}
          </ListingContainer>
        </ListingRoot>
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
              <Close />
            </IconButton>
          </Box>
          <SweepModalContent>
            <div>
              <Typography
                variant="h6"
                sx={{ mb: 2, color: isDarkTheme ? "#fff" : "#000" }}
              >
                Sweep Mode
              </Typography>
              <Typography
                variant="body2"
                sx={{ mb: 3, color: isDarkTheme ? "#fff" : "#000" }}
              >
                Select how many NFTs you want to purchase from lowest to highest
                price
              </Typography>
            </div>

            <SweepSliderContainer>
              <Typography gutterBottom color={isDarkTheme ? "#fff" : "#000"}>
                Number of NFTs: {selectedCount}
              </Typography>
              <Slider
                value={selectedCount}
                onChange={(_, value) => setSelectedCount(value as number)}
                min={1}
                max={Math.min(5, filteredListings.length)}
                valueLabelDisplay="auto"
                sx={{
                  color: "#93f",
                  "& .MuiSlider-thumb": {
                    backgroundColor: isDarkTheme ? "#2b2b2b" : "#fff",
                    border: "2px solid #93f",
                  },
                  "& .MuiSlider-track": {
                    backgroundColor: "#93f",
                  },
                  "& .MuiSlider-rail": {
                    backgroundColor: isDarkTheme ? "#4b4b4b" : "#e0e0e0",
                  },
                  "& .MuiSlider-valueLabel": {
                    backgroundColor: isDarkTheme ? "#2b2b2b" : "#fff",
                    color: isDarkTheme ? "#fff" : "#000",
                  },
                }}
              />
            </SweepSliderContainer>

            <SweepNFTList>
              {filteredListings
                .slice(0, selectedCount)
                .map((listing: NFTIndexerListingI) => {
                  const metadata = JSON.parse(listing.token.metadata || "{}");
                  const imageUrl = metadata.image?.startsWith("ipfs://")
                    ? `https://ipfs.io/ipfs/${metadata.image.slice(7)}`
                    : metadata.image;

                  return (
                    <SweepNFTItem
                      $isDarkTheme={isDarkTheme}
                      key={`${listing.mpContractId}-${listing.mpListingId}`}
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
                        <Typography variant="caption" color="textSecondary">
                          {formatUnits(BigInt(listing.price), 6)} VOI
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
                  filteredListings
                    .slice(0, selectedCount)
                    .reduce(
                      (acc, listing) => acc + BigInt(listing.price),
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
                `Purchase ${selectedCount} NFTs`
              )}
            </Button>
          </SweepModalContent>
        </StyledDialogContent>
      </SweepModal>
    </>
  );
};

const DialogSearch = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <div
        className="rounded p-2 border w-full cursor-pointer"
        onClick={() => setOpen(true)}
      >
        Search <SearchOutlined />
      </div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent>
          <div className="flex items-center mx-auto">{children}</div>
        </DialogContent>
      </Dialog>
    </>
  );
};

async function getCollectionTokens(collectionId: string) {
  try {
    const response = await fetch(
      `https://arc72-voi-mainnet.nftnavigator.xyz/nft-indexer/v1/tokens?contractId=${collectionId}`
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
