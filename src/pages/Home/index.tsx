import React, { useEffect, useMemo, useState } from "react";
import Layout from "../../layouts/Default";
import {
  Box,
  Grid,
  Skeleton,
  Typography,
  Chip,
  Avatar,
  Button as MuiButton,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/store";
import styled from "styled-components";
import NFTSaleActivityTable from "../../components/NFTSaleActivityTable";
import RankingList from "../../components/RankingList";
import { Stack } from "@mui/material";
import { getTokens } from "../../store/tokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { getCollections } from "../../store/collectionSlice";
import { ListedToken, ListingI, NFTIndexerListingI, TokenI } from "../../types";
import { getSales } from "../../store/saleSlice";
import Marquee from "react-fast-marquee";
import CartNftCard from "../../components/CartNFTCard";
import { getPrices } from "../../store/dexSlice";
import { CTCINFO_LP_WVOI_VOI } from "../../contants/dex";
import { getListings } from "../../store/listingSlice";
import { compactAddress, getRankings } from "../../utils/mp";
import { getSmartTokens } from "../../store/smartTokenSlice";
import Grid2 from "@mui/material/Unstable_Grid2"; // Grid version 2
import LazyLoad from "react-lazy-load";
import axios from "axios";
import { stripTrailingZeroBytes } from "@/utils/string";
import { useInView } from "react-intersection-observer";
import moment from "moment";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from "@mui/material";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import CustomPagination from "../../components/Pagination";
import { Tabs, Tab } from "@mui/material";
import { useName } from "@/hooks/useName";
import { useEnvoiResolver } from "@/hooks/useEnvoiResolver";
import { useProjects } from "@/hooks/useProjects";
import FavoriteIcon from "@mui/icons-material/Favorite";
import algosdk from "algosdk";
import { getAlgorandClients } from "@/wallets";
import { FixedSizeList } from "react-window";

const formatPrice = (price: number) => {
  const value = price / 1e6; // Convert to VOI
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const truncateAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const ActivityFilterContainer = styled.div`
  display: flex;
  align-items: flex-start;
  align-content: flex-start;
  gap: 10px var(--Main-System-10px, 10px);
  align-self: stretch;
  flex-wrap: wrap;
  @media (max-width: 768px) {
    display: none;
  }
`;

const Button = styled.div`
  cursor: pointer;
`;

const Filter = styled(Button)`
  display: flex;
  padding: 6px 12px;
  justify-content: center;
  align-items: center;
  gap: var(--Main-System-10px, 10px);
  border-radius: 100px;
  border: 1px solid #717579;
`;

const ActiveFilter = styled(Filter)`
  border-color: #93f;
  background: rgba(153, 51, 255, 0.2);
`;

const FilterLabel = styled.div`
  color: #717579;
  font-feature-settings: "clig" off, "liga" off;
  font-family: Inter;
  font-size: 15px;
  font-style: normal;
  font-weight: 500;
  line-height: normal;
`;

const ActiveFilterLabel = styled(FilterLabel)`
  color: #93f;
`;

const SectionHeading = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 45px;
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
  font-size: 36px;
  font-style: normal;
  font-weight: 700;
  line-height: 100%; /* 40px */
  @media (min-width: 620px) {
    font-size: 40px;
  }
`;

const SectionButtonContainer = styled(Box)`
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

  & div.button-text-dark {
    color: #fff;
  }
  & button.button-light {
    border: 1px solid #93f;
  }
  & div.button-text-light {
    color: #93f;
  }
`;

const SectionMoreButtonContainer = styled(SectionButtonContainer)`
  & button.button-light::after {
    background: url("/arrow-narrow-up-right-light.svg") no-repeat;
  }
  & button.button-dark::after {
    background: url("/arrow-narrow-up-right-dark.svg") no-repeat;
  }
`;

const SectionButton = styled.button`
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
`;
const SectionMoreButton = styled(SectionButton)`
  &::after {
    content: "";
    width: 20px;
    height: 20px;
    position: relative;
    display: inline-block;
  }
`;

const SectionMoreButtonText = styled.div`
  font-family: "Inter", sans-serif;
  font-size: 15px;
  font-style: normal;
  font-weight: 600;
  line-height: 22px;
  letter-spacing: 0.1px;
  cursor: pointer;
`;

const SectionBanners = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 45px;
`;

const pageSize = 12;

interface Sale {
  transactionId: string;
  mpContractId: number;
  tokenId: number;
  seller: string;
  buyer: string;
  price: number;
  timestamp: number;
  collectionId: number;
}

interface TokenInfo {
  contractId: number;
  tokenId: number;
  metadata: {
    name: string;
    image: string;
  };
}

interface TokenCache {
  [key: string]: TokenInfo;
}

interface SellerStats {
  seller: string;
  totalSales: number;
  totalProceeds: number;
}

interface BuyerStats {
  buyer: string;
  totalPurchases: number;
  totalSpent: number;
}

const FEATURED_PAGE_SIZE = 5; // New constant for featured collections

// Add these type definitions at the top of the file
interface CollectionStats {
  collectionId: number;
  totalSales: number;
  totalVolume: number;
  lastSale: number;
  metadata?: any;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const StyledTabs = styled(Tabs)`
  margin-bottom: 24px;

  & .MuiTabs-indicator {
    background-color: ${(props) => (props.theme.isDarkTheme ? "#fff" : "#93f")};
  }
`;

const StyledTab = styled(Tab)`
  color: ${(props) =>
    props.theme.isDarkTheme
      ? "rgba(255, 255, 255, 0.7)"
      : "rgba(0, 0, 0, 0.7)"} !important;

  &.Mui-selected {
    color: ${(props) => (props.theme.isDarkTheme ? "#fff" : "#93f")} !important;
  }
`;

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`collection-tabpanel-${index}`}
      aria-labelledby={`collection-tab-${index}`}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

// Extract TableRow into separate component
const ActivityTableRow = ({
  sale,
  isDarkTheme,
  tokenInfo,
  collectionName,
}: {
  sale: Sale;
  isDarkTheme: boolean;
  tokenInfo: any;
  collectionName: string;
}) => {
  const metadata = JSON.parse(tokenInfo?.metadata || "{}");
  const [sellerName, setSellerName] = useState<string>(sale.seller);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [buyerName, setBuyerName] = useState<string>(sale.buyer);
  const [buyerProfile, setBuyerProfile] = useState<any>(null);
  const { resolver } = useEnvoiResolver();
  useEffect(() => {
    resolver.http.getNameFromAddress(sale.seller).then((res) => {
      if (res.length > 0 && !!res[0]) {
        setSellerName(res[0]);
        resolver.http.search(res[0]).then((res) => {
          if (res.length === 1) {
            setSellerProfile(res[0]);
          }
        });
      }
    });
    resolver.http.getNameFromAddress(sale.buyer).then((res) => {
      if (res.length > 0 && !!res[0]) {
        setBuyerName(res[0]);
        resolver.http.search(res[0]).then((res) => {
          if (res.length === 1) {
            setBuyerProfile(res[0]);
          }
        });
      }
    });
  }, [sale]);
  console.log({ sellerProfile, buyerProfile });

  // Add this function to generate a color from an address
  const getColorFromAddress = (address: string) => {
    // Create a hash from the address
    const hash = address.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    // Generate HSL color with good saturation and lightness for visibility
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 50%)`;
  };

  return (
    <TableRow>
      <TableCell>
        <Link
          to={`/collection/${sale.collectionId}/token/${sale.tokenId}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textDecoration: "none",
            color: isDarkTheme ? "#fff" : "inherit",
          }}
        >
          <Box
            component="img"
            src={
              metadata?.image
                ? metadata.image.indexOf("ipfs") !== -1
                  ? `https://ipfs.io/ipfs/${metadata.image.replace(
                      "ipfs://",
                      ""
                    )}`
                  : metadata.image
                : "/placeholder.png"
            }
            alt={metadata?.name || `Token #${sale.tokenId}`}
            sx={{
              width: 40,
              height: 40,
              borderRadius: "8px",
              objectFit: "cover",
              backgroundColor: "rgba(0, 0, 0, 0.1)",
            }}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              e.currentTarget.src = "/placeholder.png";
            }}
          />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {metadata?.name || `Token #${sale.tokenId}`}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: isDarkTheme
                  ? "rgba(255, 255, 255, 0.5)"
                  : "rgba(0, 0, 0, 0.5)",
                display: "block",
              }}
            >
              {collectionName}
            </Typography>
          </Box>
        </Link>
      </TableCell>
      <TableCell>{formatPrice(sale.price)} VOI</TableCell>
      <TableCell>
        <Link to={`/account/${sale.seller}`} style={{ textDecoration: "none" }}>
          {sellerName ? (
            <Chip
              avatar={
                <Avatar
                  src={sellerProfile?.metadata?.avatar || undefined}
                  alt={sellerName}
                  sx={{
                    bgcolor: !sellerProfile?.metadata?.avatar
                      ? compactAddress(sale.seller) === sellerName
                        ? "silver"
                        : getColorFromAddress(sale.seller)
                      : undefined,
                  }}
                >
                  {!sellerProfile?.metadata?.avatar &&
                    sellerName[0].toUpperCase()}
                </Avatar>
              }
              label={sellerName}
              variant="outlined"
              sx={{
                color: isDarkTheme ? "#fff" : "inherit",
                borderColor: isDarkTheme
                  ? "rgba(255, 255, 255, 0.23)"
                  : "rgba(0, 0, 0, 0.23)",
                "& .MuiChip-label": {
                  maxWidth: "120px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                },
              }}
            />
          ) : (
            <Skeleton width={100} height={32} />
          )}
        </Link>
      </TableCell>
      <TableCell>
        <Link to={`/account/${sale.buyer}`} style={{ textDecoration: "none" }}>
          {buyerName ? (
            <Chip
              avatar={
                <Avatar
                  src={buyerProfile?.metadata?.avatar || undefined}
                  alt={buyerName}
                  sx={{
                    bgcolor: !buyerProfile?.metadata?.avatar
                      ? compactAddress(sale.buyer) == buyerName
                        ? "silver"
                        : getColorFromAddress(sale.buyer)
                      : undefined,
                  }}
                >
                  {!buyerProfile?.metadata?.avatar &&
                    buyerName[0].toUpperCase()}
                </Avatar>
              }
              label={buyerName}
              variant="outlined"
              sx={{
                color: isDarkTheme ? "#fff" : "inherit",
                borderColor: isDarkTheme
                  ? "rgba(255, 255, 255, 0.23)"
                  : "rgba(0, 0, 0, 0.23)",
                "& .MuiChip-label": {
                  maxWidth: "120px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                },
              }}
            />
          ) : (
            <Skeleton width={100} height={32} />
          )}
        </Link>
      </TableCell>
      <TableCell>{moment(sale.timestamp * 1000).fromNow()}</TableCell>
    </TableRow>
  );
};

// 1. Memoize expensive computations and components
const MemoizedActivityTableRow = React.memo(ActivityTableRow);

// Add new styled component for the animated background
const AnimatedBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  z-index: 0;

  &::before,
  &::after {
    content: "";
    position: absolute;
    width: 150%;
    height: 150%;
    top: -25%;
    left: -25%;
    background: ${(props) =>
      props.theme.isDarkTheme
        ? `radial-gradient(circle, rgba(153, 51, 255, 0.3) 0%, rgba(153, 51, 255, 0) 70%),
         radial-gradient(circle at 70% 40%, rgba(153, 51, 255, 0.25) 0%, rgba(153, 51, 255, 0) 60%),
         radial-gradient(circle at 30% 60%, rgba(255, 105, 180, 0.25) 0%, rgba(255, 105, 180, 0) 60%)`
        : `radial-gradient(circle, rgba(153, 51, 255, 0.08) 0%, rgba(153, 51, 255, 0) 50%),
         radial-gradient(circle at 70% 40%, rgba(153, 51, 255, 0.05) 0%, rgba(153, 51, 255, 0) 45%),
         radial-gradient(circle at 30% 60%, rgba(153, 51, 255, 0.05) 0%, rgba(153, 51, 255, 0) 45%)`};
    animation: rotate 60s linear infinite;
  }

  &::after {
    animation-direction: reverse;
    animation-duration: 45s;
    opacity: ${(props) => (props.theme.isDarkTheme ? "0.9" : "0.7")};
    background: ${(props) =>
      props.theme.isDarkTheme
        ? `radial-gradient(circle at 70% 60%, rgba(255, 105, 180, 0.25) 0%, rgba(255, 105, 180, 0) 50%),
         radial-gradient(circle at 30% 40%, rgba(153, 51, 255, 0.3) 0%, rgba(153, 51, 255, 0) 60%)`
        : `radial-gradient(circle at 70% 60%, rgba(153, 51, 255, 0.05) 0%, rgba(153, 51, 255, 0) 45%),
         radial-gradient(circle at 30% 40%, rgba(153, 51, 255, 0.05) 0%, rgba(153, 51, 255, 0) 45%)`};
  }

  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const Attribution = styled.div`
  position: absolute;
  bottom: 10px;
  right: 10px;
  font-size: 12px;
  opacity: 0.7;
  z-index: 1;

  a {
    color: inherit;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`;

// Update HeroSection component
const HeroSection = styled.div`
  padding: 48px 0;
  text-align: center;
  margin-bottom: 48px;
  position: relative;
  overflow: hidden;
  background: ${(props) =>
    props.theme.isDarkTheme
      ? "linear-gradient(180deg, rgba(0, 0, 139, 0.3) 0%, rgba(0, 0, 0, 0) 100%)"
      : "linear-gradient(180deg, rgba(153, 51, 255, 0.1) 0%, rgba(153, 51, 255, 0) 100%)"};

  // Add these properties for parallax effect
  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url("/hero-bg-blue.jpg");
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    background-attachment: fixed; // This creates the parallax effect
    background-blend-mode: overlay;
    z-index: -2;
  }

  // Keep the grain texture overlay
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url(https://prod.cdn.highforge.io/m/407105/1.png);
    opacity: ${(props) => (props.theme.isDarkTheme ? "0.15" : "0.07")};
    z-index: -1;
    pointer-events: none;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }
`;

const HeroTitle = styled.h1<{ $isDarkTheme: boolean }>`
  color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 24px;
  font-family: "Plus Jakarta Sans";
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    font-size: 36px;
  }
`;

const HeroSubtitle = styled.p<{ $isDarkTheme: boolean }>`
  color: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)"};
  font-size: 20px;
  margin-bottom: 32px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  position: relative;
  z-index: 1;
`;

const HeroButton = styled(MuiButton)<{ $isDarkTheme: boolean }>`
  background-color: ${(props) =>
    props.$isDarkTheme ? "#fff" : "#93f"} !important;
  color: ${(props) => (props.$isDarkTheme ? "#000" : "#fff")} !important;
  padding: 12px 32px !important;
  font-size: 16px !important;
  text-transform: none !important;
  border-radius: 100px !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;

  &:hover {
    background-color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.9)" : "#7a2adb"} !important;
  }

  &.external-link {
    display: inline-flex !important;
    align-items: center !important;
    gap: 8px !important;

    .external-link-icon {
      width: 16px;
      height: 16px;
      transition: transform 0.2s;
    }

    &:hover .external-link-icon {
      transform: translate(2px, -2px);
    }
  }
`;

// Add styled components for Stats
const StatsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 48px;
  margin-top: 48px;
  flex-wrap: wrap;
`;

const StatItem = styled.div<{ $isDarkTheme: boolean }>`
  text-align: center;

  .stat-value {
    font-size: 32px;
    font-weight: 700;
    color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};
    margin-bottom: 8px;
  }

  .stat-label {
    font-size: 16px;
    color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)"};
  }

  &.reward-pool {
    .stat-value {
      color: ${(props) => (props.$isDarkTheme ? "#00ffff" : "#93f")};
      text-shadow: ${(props) =>
        props.$isDarkTheme
          ? `0 0 10px rgba(0, 255, 255, 0.7),
             0 0 20px rgba(0, 255, 255, 0.5),
             0 0 30px rgba(0, 255, 255, 0.3)`
          : `0 0 10px rgba(153, 51, 255, 0.7),
             0 0 20px rgba(153, 51, 255, 0.5),
             0 0 30px rgba(153, 51, 255, 0.3)`};
      animation: ${(props) => (props.$isDarkTheme ? "glowCyan" : "glowPurple")}
        1.5s ease-in-out infinite alternate;
    }

    @keyframes glowCyan {
      from {
        text-shadow: 0 0 10px rgba(0, 255, 255, 0.7),
          0 0 20px rgba(0, 255, 255, 0.5), 0 0 30px rgba(0, 255, 255, 0.3);
      }
      to {
        text-shadow: 0 0 20px rgba(0, 255, 255, 0.7),
          0 0 30px rgba(0, 255, 255, 0.5), 0 0 40px rgba(0, 255, 255, 0.3);
      }
    }

    @keyframes glowPurple {
      from {
        text-shadow: 0 0 10px rgba(153, 51, 255, 0.7),
          0 0 20px rgba(153, 51, 255, 0.5), 0 0 30px rgba(153, 51, 255, 0.3);
      }
      to {
        text-shadow: 0 0 20px rgba(153, 51, 255, 0.7),
          0 0 30px rgba(153, 51, 255, 0.5), 0 0 40px rgba(153, 51, 255, 0.3);
      }
    }
  }
`;

// Add these styled components after the existing styled components
const FeaturedSection = styled.div`
  padding: 24px 0;
  margin: -48px 0 48px;
  background: ${(props) =>
    props.theme.isDarkTheme
      ? "rgba(255, 255, 255, 0.05)"
      : "rgba(153, 51, 255, 0.05)"};
`;

const FeaturedContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FeaturedCard = styled.div<{ $isDarkTheme: boolean }>`
  background: ${(props) =>
    props.theme.isDarkTheme
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(153, 51, 255, 0.1)"};
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  }
`;

// Add these type definitions near the top of the file where other interfaces are defined
interface ListingResponse {
  listings: ListingI[];
  status: string;
}

interface ListingState {
  listings: ListingI[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

// The existing ListingI interface should be imported from types.ts
// If it's not already defined there, you can add:
interface ListingI {
  collectionId: number;
  tokenId: number;
  price: number;
  seller: string;
  // Add any other fields that come from the API
}

// Add these interfaces near the top with other interfaces
interface MarketStats {
  totalVolume: number;
  totalSales: number;
  totalNFTs: number;
  uniqueBuyers: number;
  uniqueSellers: number;
  uniqueCollections: number;
  activeUsers: number;
  tenPercent: number;
  rewardPoolBalance: number;
  isLoading: boolean;
  timestamp?: number;
}

// Add this helper function before the Home component
const CACHE_KEY = "market_stats";
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

const getCachedStats = (): MarketStats | null => {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;

  const stats = JSON.parse(cached);
  const now = Date.now();

  if (now - stats.timestamp > CACHE_DURATION) {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }

  return stats;
};

// Add this styled component near other styled components
const ActivityHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center; // This centers items vertically
  margin-bottom: 24px;
`;

// Add these styled components
const CollectionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px; // Reduced from 24px
  margin-bottom: 32px; // Reduced from 48px

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const CollectionCard = styled.div<{ $isDarkTheme: boolean }>`
  position: relative;
  cursor: pointer;
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s ease-in-out;
  background: ${(props) =>
    props.$isDarkTheme
      ? "rgba(255, 255, 255, 0.05)"
      : "rgba(153, 51, 255, 0.05)"};
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(153, 51, 255, 0.1)"};
  display: flex;
  align-items: center;
  padding: 12px;
  gap: 12px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px
      ${(props) =>
        props.$isDarkTheme ? "rgba(0, 0, 0, 0.2)" : "rgba(153, 51, 255, 0.1)"};

    .ranking-overlay {
      opacity: 0;
      background: transparent;
    }
  }
`;

// Update the RankingOverlay styled component
const RankingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${(props) =>
    props.theme.isDarkTheme
      ? "rgba(0, 0, 0, 0.5)"
      : "rgba(255, 255, 255, 0.5)"};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => (props.theme.isDarkTheme ? "#fff" : "#93f")};
  font-weight: 700;
  font-size: 32px;
  text-shadow: ${(props) =>
    props.theme.isDarkTheme
      ? "2px 2px 4px rgba(0, 0, 0, 0.3)"
      : "2px 2px 4px rgba(153, 51, 255, 0.3)"};
  border-radius: 12px;
  z-index: 1;
  transition: all 0.3s ease;

  &:hover {
    opacity: 0;
    background: transparent;
  }
`;

// Add this helper function near the top of the file
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

export const Home: React.FC = () => {
  /* Dispatch */
  const dispatch = useDispatch();

  /* Smart Tokens */
  const smartTokens = useSelector((state: any) => state.smartTokens.tokens);
  const smartTokenStatus = useSelector(
    (state: any) => state.smartTokens.status
  );
  useEffect(() => {
    if (smartTokenStatus === "succeeded") return;
    dispatch(getSmartTokens() as unknown as UnknownAction);
  }, []);

  /* Listings */
  const listings = useSelector((state: any) => state.listings.listings);
  const listingsStatus = useSelector((state: any) => state.listings.status);
  useEffect(() => {
    if (listingsStatus === "succeeded") return;
    dispatch(getListings() as unknown as UnknownAction);
  }, []);
  console.log({ listings });

  /* Theme */
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  const [showing, setShowing] = useState<number>(pageSize);
  const { ref: loadMoreRef, inView } = useInView();

  // Add effect for infinite scroll
  useEffect(() => {
    if (inView && listings?.length > showing) {
      setShowing((prev) => prev + pageSize);
    }
  }, [inView, listings?.length, showing]);

  /* Activity */
  const [activeFilter, setActiveFilter] = useState<string[]>(["all"]);
  const handleFilterClick = (value: string) => {
    if (value === "all") return setActiveFilter(["all"]);
    if (activeFilter.length === 1 && activeFilter.includes("all"))
      return setActiveFilter([value]);
    if (activeFilter.includes(value)) {
      const newActiveFilter = activeFilter.filter((filter) => filter !== value);
      if (newActiveFilter.length === 0) return setActiveFilter(["all"]);
      setActiveFilter(activeFilter.filter((filter) => filter !== value));
    } else {
      setActiveFilter([...activeFilter, value]);
    }
  };

  const navigate = useNavigate();

  const isLoading = !listings || !smartTokens || listingsStatus !== "succeeded";

  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [tokenCache, setTokenCache] = useState<TokenCache>({});

  // Add collection info state
  const [collectionInfo, setCollectionInfo] = useState<Record<string, any>>({});
  console.log({ collectionInfo });

  // Update effect to fetch sales and collection info
  useEffect(() => {
    const fetchSales = async () => {
      setIsLoadingSales(true);
      try {
        const response = await axios.get(
          "https://mainnet-idx.nautilus.sh/nft-indexer/v1/mp/sales?sort=-round"
        );
        const salesData = response.data.sales.slice(0, 20);

        // Fetch collection info and token info for each sale
        for (const sale of salesData) {
          const cacheKey = `${sale.collectionId}-${sale.tokenId}`;

          // Check if we already have this token's info cached
          if (!tokenCache[cacheKey]) {
            try {
              // Fetch token info
              const tokenResponse = await axios.get(
                `https://mainnet-idx.nautilus.sh/nft-indexer/v1/tokens?contractId=${sale.collectionId}&tokenId=${sale.tokenId}`
              );

              if (
                tokenResponse.data.tokens &&
                tokenResponse.data.tokens.length > 0
              ) {
                const tokenInfo = tokenResponse.data.tokens[0];
                setTokenCache((prev) => ({
                  ...prev,
                  [cacheKey]: tokenInfo,
                }));
              }

              // Fetch collection info if we don't have it yet
              if (!collectionInfo[sale.collectionId]) {
                const collectionResponse = await axios.get(
                  `https://mainnet-idx.nautilus.sh/nft-indexer/v1/collections?contractId=${sale.collectionId}`
                );

                if (
                  collectionResponse.data.collections &&
                  collectionResponse.data.collections.length > 0
                ) {
                  setCollectionInfo((prev) => ({
                    ...prev,
                    [sale.collectionId]: collectionResponse.data.collections[0],
                  }));
                }
              }
            } catch (error) {
              console.error(`Error fetching info for ${cacheKey}:`, error);
            }
          }
        }

        setSales(salesData);
      } catch (error) {
        console.error("Error fetching sales:", error);
      } finally {
        setIsLoadingSales(false);
      }
    };

    fetchSales();
  }, []);

  // Helper function to get collection name
  const getCollectionName = (collectionId: number) => {
    const collection = collectionInfo[collectionId];
    console.log({ collection });
    if (collection?.firstToken?.metadata) {
      try {
        const metadata = JSON.parse(collection.firstToken.metadata);
        return metadata.name?.includes(".voi")
          ? ".voi"
          : metadata.name?.replace(/\s*#?\d+$/, "") ||
              `Collection #${collectionId}`;
      } catch {
        return `Collection #${collectionId}`;
      }
    }
    return `Collection #${collectionId}`;
  };

  // Helper function to get token info from cache
  const getTokenInfo = (collectionId: number, tokenId: number | string) => {
    return tokenCache[`${collectionId}-${tokenId}`];
  };

  // Add styled components for the Activity section
  const ActivitySection = styled.div`
    margin-top: 48px;
    width: 100%;
  `;

  const ActivityTitle = styled.h2<{ $isDarkTheme: boolean }>`
    color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};
    font-family: "Plus Jakarta Sans";
    font-size: 24px;
    font-weight: 600;
  `;

  const StyledTableContainer = styled(TableContainer)<{
    $isDarkTheme: boolean;
  }>`
    background-color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "#fff"};
    border-radius: 16px;
    border: 1px solid
      ${(props) =>
        props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "#D8D8E1"};

    .MuiTableCell-root {
      color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};
      border-bottom: 1px solid
        ${(props) =>
          props.$isDarkTheme
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)"};
    }

    .MuiTableRow-root:last-child .MuiTableCell-root {
      border-bottom: none;
    }

    .MuiTableRow-root:hover {
      background-color: ${(props) =>
        props.$isDarkTheme
          ? "rgba(255, 255, 255, 0.05)"
          : "rgba(0, 0, 0, 0.02)"};
    }

    .MuiTableHead-root .MuiTableRow-root {
      background-color: ${(props) =>
        props.$isDarkTheme
          ? "rgba(255, 255, 255, 0.05)"
          : "rgba(0, 0, 0, 0.02)"};
    }

    a {
      color: ${(props) => (props.$isDarkTheme ? "#fff" : "inherit")};
      text-decoration: none;
      &:hover {
        text-decoration: underline;
      }
    }
  `;

  const [currentPage, setCurrentPage] = useState(1);
  const salesPerPage = 5;

  // Calculate pagination
  const totalPages = Math.ceil((sales?.length || 0) / salesPerPage);
  const paginatedSales = sales.slice(
    (currentPage - 1) * salesPerPage,
    currentPage * salesPerPage
  );

  // const [topSellers, setTopSellers] = useState<SellerStats[]>([]);
  // const [isLoadingTopSellers, setIsLoadingTopSellers] = useState(false);

  // Add pagination state for top sellers
  const [currentTopSellersPage, setCurrentTopSellersPage] = useState(1);
  const sellersPerPage = 5;

  // Add effect to fetch and process sales data for top sellers
  // useEffect(() => {
  //   const fetchTopSellers = async () => {
  //     setIsLoadingTopSellers(true);
  //     try {
  //       const response = await axios.get(
  //         "https://mainnet-idx.nautilus.sh/nft-indexer/v1/mp/sales?sort=-round&limit=1000"
  //       );

  //       // Group sales by seller and calculate totals
  //       const sellerMap = response.data.sales.reduce(
  //         (acc: Record<string, SellerStats>, sale: any) => {
  //           if (!acc[sale.seller]) {
  //             acc[sale.seller] = {
  //               seller: sale.seller,
  //               totalSales: 0,
  //               totalProceeds: 0,
  //             };
  //           }
  //           acc[sale.seller].totalSales += 1;
  //           acc[sale.seller].totalProceeds += Number(sale.price);
  //           return acc;
  //         },
  //         {}
  //       );

  //       // Convert to array and sort by total sales count
  //       const sortedSellers = Object.values(sellerMap)
  //         .sort((a: SellerStats, b: SellerStats) => b.totalSales - a.totalSales)
  //         .slice(0, 20);

  //       setTopSellers(sortedSellers);
  //     } catch (error) {
  //       console.error("Error fetching top sellers:", error);
  //     } finally {
  //       setIsLoadingTopSellers(false);
  //     }
  //   };

  //   fetchTopSellers();
  // }, []);

  // Calculate pagination for top sellers
  // const totalSellerPages = Math.ceil(topSellers.length / sellersPerPage);
  // const paginatedSellers = topSellers.slice(
  //   (currentTopSellersPage - 1) * sellersPerPage,
  //   currentTopSellersPage * sellersPerPage
  // );

  // const [topBuyers, setTopBuyers] = useState<BuyerStats[]>([]);
  // const [isLoadingTopBuyers, setIsLoadingTopBuyers] = useState(false);
  // const [currentTopBuyersPage, setCurrentTopBuyersPage] = useState(1);
  // const buyersPerPage = 5;

  // Add effect to fetch and process sales data for top buyers

  // useEffect(() => {
  //   const fetchTopBuyers = async () => {
  //     setIsLoadingTopBuyers(true);
  //     try {
  //       const response = await axios.get(
  //         "https://mainnet-idx.nautilus.sh/nft-indexer/v1/mp/sales?sort=-round&limit=1000"
  //       );

  //       // Group sales by buyer and calculate totals
  //       const buyerMap = response.data.sales.reduce(
  //         (acc: Record<string, BuyerStats>, sale: any) => {
  //           if (!acc[sale.buyer]) {
  //             acc[sale.buyer] = {
  //               buyer: sale.buyer,
  //               totalPurchases: 0,
  //               totalSpent: 0,
  //             };
  //           }
  //           acc[sale.buyer].totalPurchases += 1;
  //           acc[sale.buyer].totalSpent += Number(sale.price);
  //           return acc;
  //         },
  //         {}
  //       );

  //       // Convert to array and sort by total purchases
  //       const sortedBuyers = Object.values(buyerMap)
  //         .sort(
  //           (a: BuyerStats, b: BuyerStats) =>
  //             b.totalPurchases - a.totalPurchases
  //         )
  //         .slice(0, 20); // Get top 20 buyers for pagination

  //       setTopBuyers(sortedBuyers as BuyerStats[]);
  //     } catch (error) {
  //       console.error("Error fetching top buyers:", error);
  //     } finally {
  //       setIsLoadingTopBuyers(false);
  //     }
  //   };

  //   fetchTopBuyers();
  // }, []);

  // Calculate pagination for top buyers
  // const totalBuyerPages = Math.ceil(topBuyers.length / buyersPerPage);
  // const paginatedBuyers = topBuyers.slice(
  //   (currentTopBuyersPage - 1) * buyersPerPage,
  //   currentTopBuyersPage * buyersPerPage
  // );

  //const NEW_LISTINGS_COUNT = 5; // New constant for number of listings to show

  const [topCollections, setTopCollections] = useState<
    {
      collectionId: number;
      totalSales: number;
      totalVolume: number;
      lastSale?: number;
      metadata?: any;
    }[]
  >([]);
  const [isLoadingTopCollections, setIsLoadingTopCollections] = useState(false);

  // Add this effect to fetch top collections by sales
  useEffect(() => {
    const fetchTopCollections = async () => {
      setIsLoadingTopCollections(true);
      try {
        // First get collections with their total supply
        const collectionsResponse = await axios.get(
          "https://mainnet-idx.nautilus.sh/nft-indexer/v1/collections"
        );

        // Get all sales to calculate total volume
        const allSalesResponse = await axios.get(
          "https://mainnet-idx.nautilus.sh/nft-indexer/v1/mp/sales"
        );

        // Calculate total volume and sales for each collection
        const collectionStats = allSalesResponse.data.sales.reduce(
          (
            acc: Record<number, { totalSales: number; totalVolume: number }>,
            sale: any
          ) => {
            if (!acc[sale.collectionId]) {
              acc[sale.collectionId] = {
                totalSales: 0,
                totalVolume: 0,
              };
            }
            acc[sale.collectionId].totalSales += 1;
            acc[sale.collectionId].totalVolume += Number(sale.price);
            return acc;
          },
          {}
        );

        // Combine collection data with total volumes and sales
        const collections = collectionsResponse.data.collections.map(
          (collection: any) => ({
            collectionId: collection.contractId,
            totalSales: collectionStats[collection.contractId]?.totalSales || 0,
            totalVolume:
              collectionStats[collection.contractId]?.totalVolume || 0,
            metadata: collection,
          })
        );

        // Sort by total all-time volume and take top 5
        const sortedCollections = collections
          .sort(
            (a: CollectionStats, b: CollectionStats) =>
              b.totalVolume - a.totalVolume
          )
          .slice(0, 10);

        setTopCollections(sortedCollections);
      } catch (error) {
        console.error("Error fetching top collections:", error);
      } finally {
        setIsLoadingTopCollections(false);
      }
    };

    fetchTopCollections();
  }, []);

  // const [tabValue, setTabValue] = useState(0);
  // const [trendingCollections, setTrendingCollections] = useState<
  //   CollectionStats[]
  // >([]);
  // const [isLoadingTrendingCollections, setIsLoadingTrendingCollections] =
  //   useState(false);

  // Add tab change handler
  // const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
  //   setTabValue(newValue);
  // };

  // Add effect to fetch trending collections
  // useEffect(() => {
  //   const fetchTrendingCollections = async () => {
  //     setIsLoadingTrendingCollections(true);
  //     try {
  //       // Get only the last 100 sales
  //       const response = await axios.get(
  //         "https://mainnet-idx.nautilus.sh/nft-indexer/v1/mp/sales?sort=-round&limit=100"
  //       );

  //       // Group sales by collection and calculate totals from ONLY these 100 sales
  //       const collectionMap = response.data.sales.reduce(
  //         (acc: Record<number, CollectionStats>, sale: any) => {
  //           const collectionId = sale.collectionId;
  //           if (!acc[collectionId]) {
  //             acc[collectionId] = {
  //               collectionId: collectionId,
  //               totalSales: 0,
  //               totalVolume: 0,
  //               lastSale: sale.timestamp,
  //               recentSales: [], // Add array to track recent sales
  //             };
  //           }

  //           // Add this sale to recent sales and update totals
  //           acc[collectionId].totalSales += 1;
  //           acc[collectionId].totalVolume += Number(sale.price);
  //           acc[collectionId].recentSales.push(sale);

  //           return acc;
  //         },
  //         {}
  //       );

  //       // Convert to array and sort by recent volume
  //       const sortedCollections = Object.values(collectionMap)
  //         .map((collection: any) => ({
  //           collectionId: collection.collectionId,
  //           totalSales: collection.totalSales,
  //           totalVolume: collection.recentSales.reduce(
  //             (sum: number, sale: any) => sum + Number(sale.price),
  //             0
  //           ),
  //           lastSale: collection.lastSale,
  //         }))
  //         .sort((a, b) => b.totalVolume - a.totalVolume)
  //         .slice(0, 5);

  //       // Fetch metadata for each collection
  //       for (const collection of sortedCollections) {
  //         try {
  //           const collectionResponse = await axios.get(
  //             `https://mainnet-idx.nautilus.sh/nft-indexer/v1/collections?contractId=${collection.collectionId}`
  //           );
  //           if (collectionResponse.data.collections?.[0]) {
  //             collection.metadata = collectionResponse.data.collections[0];
  //           }
  //         } catch (error) {
  //           console.error(
  //             `Error fetching collection ${collection.collectionId} metadata:`,
  //             error
  //           );
  //         }
  //       }

  //       setTrendingCollections(sortedCollections);
  //     } catch (error) {
  //       console.error("Error fetching trending collections:", error);
  //     } finally {
  //       setIsLoadingTrendingCollections(false);
  //     }
  //   };

  //   fetchTrendingCollections();
  // }, []);

  // Add useProjects hook
  const { data: projects } = useProjects();

  console.log("projects", projects);

  // Add state for marketplace stats
  const [marketStats, setMarketStats] = useState({
    totalVolume: 0,
    totalSales: 0,
    totalNFTs: 0,
    uniqueBuyers: 0,
    uniqueSellers: 0,
    uniqueCollections: 0,
    activeUsers: 0,
    tenPercent: 0,
    rewardPoolBalance: 0,
    isLoading: true,
  });

  // Update effect to fetch marketplace stats
  useEffect(() => {
    const fetchMarketStats = async () => {
      // Check cache first
      const cachedStats = getCachedStats();
      if (cachedStats) {
        setMarketStats(cachedStats);
        return;
      }

      try {
        const statsResponse = await axios.get(
          "https://mainnet-idx.nautilus.sh/nft-indexer/v1/mp/stats"
        );
        const { algodClient } = getAlgorandClients();
        const accountInfo = await algodClient
          .accountInformation(
            "GAMESB74MIL32A5FZTS2F4YYDGG6YQKBO6TDG6PHITCIIVQAA77GE253CQ"
          )
          .do();
        const stats = statsResponse.data.stats[0];
        const newStats = {
          totalVolume: Number(stats.total_volume),
          totalSales: stats.total_sales,
          totalNFTs: stats.unique_pairs,
          activeUsers: stats.active_users,
          uniqueBuyers: stats.unique_buyers,
          uniqueSellers: stats.unique_sellers,
          uniqueCollections: stats.total_collections,
          tenPercent: stats.ten_percent,
          rewardPoolBalance:
            2 * (accountInfo.amount + Number(stats.ten_percent) * 10 ** 6),
          isLoading: false,
          timestamp: Date.now(),
        };

        // Cache the stats
        localStorage.setItem(CACHE_KEY, JSON.stringify(newStats));
        setMarketStats(newStats);
      } catch (error) {
        console.error("Error fetching market stats:", error);
        setMarketStats((prev) => ({ ...prev, isLoading: false }));
      }
    };
    fetchMarketStats();
  }, []);

  console.log("marketStats", marketStats);

  // Add helper function to format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // 2. Add loading states for better UX
  const [isLoadingCollectionInfo, setIsLoadingCollectionInfo] = useState(true);

  // Add error boundaries and fallback UI
  const [error, setError] = useState<Error | null>(null);

  // Add error handling in data fetching
  try {
    // ... fetch data
  } catch (err) {
    setError(err as Error);
    // Show user-friendly error message
  }

  return (
    <>
      {!isLoading ? (
        <div>
          <HeroSection>
            {/*<Attribution>
              <a
                href="https://nautilus.sh/#/collection/407105/token/1"
                target="_blank"
                rel="noopener noreferrer"
              >
                Villains Only Scene 1
              </a>
            </Attribution>*/}

            <HeroTitle $isDarkTheme={isDarkTheme}>
              Discover, Collect, and Trade NFTs on Voi
            </HeroTitle>
            <HeroSubtitle $isDarkTheme={isDarkTheme}>
              The premier marketplace for NFTs on the Voi Network. Explore
              unique digital collectibles, join the community, and start your
              collection today.
            </HeroSubtitle>
            <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
              <HeroButton
                $isDarkTheme={isDarkTheme}
                variant="contained"
                component={Link}
                to="/listing"
                className="external-link"
              >
                Listings
              </HeroButton>
              <HeroButton
                $isDarkTheme={isDarkTheme}
                variant="contained"
                component={Link}
                to="/offers"
                className="external-link"
              >
                Offers
              </HeroButton>
              {/*<HeroButton
                $isDarkTheme={isDarkTheme}
                variant="contained"
                component={Link}
                to="/collection"
                className="external-link"
              >
                Collections
              </HeroButton>*/}
            </Box>

            {/* Add Stats Section */}
            <StatsContainer>
              {marketStats.isLoading ? (
                <>
                  <Skeleton variant="rounded" width={150} height={80} />
                  <Skeleton variant="rounded" width={150} height={80} />
                  <Skeleton variant="rounded" width={150} height={80} />
                  <Skeleton variant="rounded" width={150} height={80} />
                  <Skeleton variant="rounded" width={150} height={80} />
                  <Skeleton variant="rounded" width={150} height={80} />
                </>
              ) : (
                <>
                  <StatItem $isDarkTheme={isDarkTheme}>
                    <div className="stat-value">
                      {formatPrice(marketStats.totalVolume)} VOI
                    </div>
                    <div className="stat-label">Total Volume</div>
                  </StatItem>
                  <StatItem $isDarkTheme={isDarkTheme}>
                    <div className="stat-value">
                      {formatNumber(marketStats.totalSales)}
                    </div>
                    <div className="stat-label">Total Sales</div>
                  </StatItem>
                  {/*<StatItem $isDarkTheme={isDarkTheme}>
                    <div className="stat-value">
                      {formatNumber(marketStats.totalNFTs)}
                    </div>
                    <div className="stat-label">Total NFTs</div>
                  </StatItem>
                  <StatItem $isDarkTheme={isDarkTheme}>
                    <div className="stat-value">
                      {formatNumber(marketStats.uniqueBuyers)}
                    </div>
                    <div className="stat-label">Unique Buyers</div>
                  </StatItem>
                  <StatItem $isDarkTheme={isDarkTheme}>
                    <div className="stat-value">
                      {formatNumber(marketStats.uniqueSellers)}
                    </div>
                    <div className="stat-label">Unique Sellers</div>
                  </StatItem>
                  <StatItem $isDarkTheme={isDarkTheme}>
                    <div className="stat-value">
                      {formatNumber(marketStats.uniqueCollections)}
                    </div>
                    <div className="stat-label">Total Collections</div>
                  </StatItem>*/}
                  <StatItem $isDarkTheme={isDarkTheme}>
                    <div className="stat-value">
                      {formatNumber(marketStats.activeUsers)}
                    </div>
                    <div className="stat-label">Active Users</div>
                  </StatItem>
                </>
              )}
            </StatsContainer>
            {/*<StatsContainer>
              <StatItem $isDarkTheme={isDarkTheme} className="reward-pool">
                <div className="stat-value">
                  {formatPrice(marketStats.rewardPoolBalance)} VOI
                </div>
                <div className="stat-label">Reward Pool</div>
              </StatItem>
            </StatsContainer>*/}
          </HeroSection>

          <FeaturedSection>
            <FeaturedContainer>
              <FeaturedCard
                $isDarkTheme={isDarkTheme}
                onClick={() => window.open("/#/nft-drips", "_blank")}
              >
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 600,
                    color: isDarkTheme ? "#fff" : "#000",
                    mb: 2,
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                  }}
                >
                  NFT Drips
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: isDarkTheme
                      ? "rgba(255, 255, 255, 0.7)"
                      : "rgba(0, 0, 0, 0.7)",
                  }}
                >
                  Discover and track NFT collections with automated weekly
                  distributions
                </Typography>
              </FeaturedCard>

              <FeaturedCard
                $isDarkTheme={isDarkTheme}
                onClick={() => window.open("/#/staking", "_blank")}
              >
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 600,
                    color: isDarkTheme ? "#fff" : "#000",
                    mb: 2,
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                  }}
                >
                  Staking Market
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: isDarkTheme
                      ? "rgba(255, 255, 255, 0.7)"
                      : "rgba(0, 0, 0, 0.7)",
                  }}
                >
                  Buy and sell tokenized staking contracts and manage your
                  positions
                </Typography>
              </FeaturedCard>

              <FeaturedCard
                $isDarkTheme={isDarkTheme}
                onClick={() => window.open("/#/community-chest", "_blank")}
              >
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 600,
                    color: isDarkTheme ? "#fff" : "#000",
                    mb: 2,
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                  }}
                >
                  Wrapped Voi
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: isDarkTheme
                      ? "rgba(255, 255, 255, 0.7)"
                      : "rgba(0, 0, 0, 0.7)",
                  }}
                >
                  Wrap your VOI tokens to use them in DeFi applications and earn
                  rewards
                </Typography>
              </FeaturedCard>
            </FeaturedContainer>
          </FeaturedSection>

          <Layout>
            {/*<StyledTabs
            value={tabValue}
            onChange={handleTabChange}
            theme={{ isDarkTheme }}
          >
            <StyledTab label="Top Collections" />
            <StyledTab label="Trending Volume" />
          </StyledTabs>*/}

            {/*<TabPanel value={tabValue} index={0}>*/}
            <Box
              sx={{
                mb: 3,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <ActivityTitle $isDarkTheme={isDarkTheme}>
                Top Collections
              </ActivityTitle>

              <HeroButton
                $isDarkTheme={isDarkTheme}
                variant="outlined"
                component={Link}
                to="/collection"
                sx={{
                  backgroundColor: "transparent !important",
                  border: `2px solid ${
                    isDarkTheme ? "#fff" : "#93f"
                  } !important`,
                  color: `${isDarkTheme ? "#fff" : "#93f"} !important`,
                  height: "fit-content",
                  "&:hover": {
                    backgroundColor: `${
                      isDarkTheme
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(153, 51, 255, 0.1)"
                    } !important`,
                  },
                }}
              >
                View More
              </HeroButton>
            </Box>
            {isLoadingTopCollections ? (
              <CollectionGrid>
                {[1, 2, 3, 4].map((i) => (
                  <Box
                    key={i}
                    sx={{
                      display: "flex",
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 1.5,
                      border: "1px solid",
                      borderColor: isDarkTheme
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <Skeleton
                      variant="rectangular"
                      width={80}
                      height={80}
                      sx={{ borderRadius: 1.5 }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton
                        variant="text"
                        width="80%"
                        height={24}
                        sx={{ mb: 0.5 }}
                      />
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Skeleton variant="text" width={50} height={16} />
                          <Skeleton variant="text" width={30} height={20} />
                        </Grid>
                        <Grid item xs={6}>
                          <Skeleton variant="text" width={50} height={16} />
                          <Skeleton variant="text" width={30} height={20} />
                        </Grid>
                      </Grid>
                    </Box>
                  </Box>
                ))}
              </CollectionGrid>
            ) : (
              <CollectionGrid>
                {topCollections.map((collection, index) => {
                  const metadata = collection.metadata?.firstToken?.metadata
                    ? JSON.parse(collection.metadata.firstToken.metadata)
                    : null;

                  return (
                    <CollectionCard
                      key={collection.collectionId}
                      $isDarkTheme={isDarkTheme}
                      onClick={() => {
                        scrollToTop();
                        navigate(`/collection/${collection.collectionId}`);
                      }}
                    >
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          flexShrink: 0,
                          borderRadius: "12px",
                          overflow: "hidden",
                          position: "relative",
                        }}
                      >
                        {/* Add className to the RankingOverlay */}
                        <RankingOverlay
                          theme={{ isDarkTheme }}
                          className="ranking-overlay"
                        >
                          {index + 1}
                        </RankingOverlay>

                        <img
                          src={
                            metadata?.image
                              ? metadata.image.replace(
                                  "ipfs://",
                                  "https://ipfs.io/ipfs/"
                                )
                              : "/placeholder.png"
                          }
                          alt={
                            metadata?.name ||
                            `Collection #${collection.collectionId}`
                          }
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                          onError={(
                            e: React.SyntheticEvent<HTMLImageElement>
                          ) => {
                            e.currentTarget.src = "/placeholder.png";
                          }}
                        />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="subtitle1" // Changed from h6
                          sx={{
                            fontWeight: 600,
                            mb: 0.5, // Reduced from 1
                            color: isDarkTheme ? "#fff" : "#000",
                            fontFamily: '"Plus Jakarta Sans", sans-serif',
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: "0.9rem", // Added specific size
                          }}
                        >
                          {metadata?.name?.replace(/\s*#\d+$/, "") ||
                            `Collection #${collection.collectionId}`}
                        </Typography>
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography
                              variant="caption" // Changed from body2
                              sx={{
                                color: isDarkTheme
                                  ? "rgba(255,255,255,0.7)"
                                  : "rgba(0,0,0,0.7)",
                                fontSize: "0.75rem",
                                display: "block",
                              }}
                            >
                              Total Sales
                            </Typography>
                            <Typography
                              variant="body2" // Changed from body1
                              sx={{
                                fontWeight: 600,
                                color: isDarkTheme ? "#fff" : "#000",
                                fontSize: "0.875rem",
                              }}
                            >
                              {collection.totalSales}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography
                              variant="caption" // Changed from body2
                              sx={{
                                color: isDarkTheme
                                  ? "rgba(255,255,255,0.7)"
                                  : "rgba(0,0,0,0.7)",
                                fontSize: "0.75rem",
                                display: "block",
                              }}
                            >
                              Volume
                            </Typography>
                            <Typography
                              variant="body2" // Changed from body1
                              sx={{
                                fontWeight: 600,
                                color: isDarkTheme ? "#fff" : "#000",
                                fontSize: "0.875rem",
                              }}
                            >
                              {formatPrice(collection.totalVolume)} VOI
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    </CollectionCard>
                  );
                })}
              </CollectionGrid>
            )}
            {/*</TabPanel>*/}

            {/* Add Active Listings Section */}
            {/*<Box sx={{ mb: 3, mt: 6 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 600,
                  color: isDarkTheme ? "#fff" : "#000",
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                }}
              >
                Active Listings
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  mt: 1,
                  color: isDarkTheme
                    ? "rgba(255, 255, 255, 0.7)"
                    : "rgba(0, 0, 0, 0.7)",
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                }}
              >
                Explore the latest NFTs available for purchase
              </Typography>
            </Box>

            <Swiper
              modules={[Navigation, Pagination]}
              spaceBetween={30}
              slidesPerView={4}
              navigation
              pagination={{ clickable: true }}
              className="w-full mb-12"
              style={{
                borderRadius: "16px",
                height: "400px",
              }}
              breakpoints={{
                320: {
                  slidesPerView: 1,
                  spaceBetween: 20,
                },
                640: {
                  slidesPerView: 2,
                  spaceBetween: 30,
                },
                1024: {
                  slidesPerView: 4,
                  spaceBetween: 30,
                },
              }}
            >
              {listings.slice(0, 8).map((listing: NFTIndexerListingI) => {
                const { token } = listing;
                const metadata = token?.metadata
                  ? JSON.parse(token.metadata)
                  : null;
                const name = metadata?.name || `Token #${listing.tokenId}`;
                console.log({ listing, token, metadata, name });
                return (
                  <SwiperSlide
                    key={`${listing.collectionId}-${listing.tokenId}`}
                  >
                    <div
                      className="relative w-full h-full cursor-pointer"
                      onClick={() =>
                        navigate(
                          `/collection/${listing.collectionId}/token/${listing.tokenId}`
                        )
                      }
                    >
                      <img
                        src={
                          metadata?.image
                            ? metadata.image.indexOf("ipfs://") !== -1
                              ? metadata.image.replace(
                                  "ipfs://",
                                  "https://ipfs.io/ipfs/"
                                )
                              : metadata.image
                        }
                        alt={metadata?.name || `Token #${listing.tokenId}`}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(
                          e: React.SyntheticEvent<HTMLImageElement>
                        ) => {
                          e.currentTarget.src = "/placeholder.png";
                        }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 rounded-b-lg">
                        <h3 className="text-lg font-bold mb-2">
                          {metadata?.name || `Token #${listing.tokenId}`}
                        </h3>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm opacity-80">Price</p>
                            <p className="font-bold">
                              {formatPrice(listing.price)} VOI
                            </p>
                          </div>
                          <MuiButton
                            variant="contained"
                            size="small"
                            sx={{
                              backgroundColor: "#93f",
                              "&:hover": {
                                backgroundColor: "#7a2adb",
                              },
                            }}
                          >
                            Buy Now
                          </MuiButton>
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>*/}

            {/* NFT Games Section */}
            {/*projects?.nftGamesProjects &&
              projects.nftGamesProjects.length > 0 && (
                <>
                  <Box sx={{ mb: 3, mt: 6 }}>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 600,
                        color: isDarkTheme ? "#fff" : "#000",
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                      }}
                    >
                      NFT Games
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        mt: 1,
                        color: isDarkTheme
                          ? "rgba(255, 255, 255, 0.7)"
                          : "rgba(0, 0, 0, 0.7)",
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <FavoriteIcon sx={{ color: "#ff69b4", fontSize: 16 }} />
                        10% of this project's proceeds goes to NFT Game Rewards.
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <FavoriteIcon sx={{ color: "#ff69b4", fontSize: 16 }} />
                        This project is part of the NFT Games.
                      </Box>
                    </Typography>
                  </Box>
                  <Swiper
                    modules={[Navigation, Pagination]}
                    spaceBetween={30}
                    slidesPerView={3}
                    centeredSlides={true}
                    loop={true}
                    navigation
                    pagination={{ clickable: true }}
                    autoplay={false}
                    className="w-full mb-12"
                    style={{
                      borderRadius: "16px",
                      height: "400px",
                    }}
                    breakpoints={{
                      320: {
                        slidesPerView: 1,
                        spaceBetween: 20,
                      },
                      640: {
                        slidesPerView: 2,
                        spaceBetween: 30,
                      },
                      1024: {
                        slidesPerView: 3,
                        spaceBetween: 30,
                      },
                    }}
                  >
                    {projects.nftGamesProjects.map((project) => (
                      <SwiperSlide key={project.applicationID}>
                        {({ isActive, isNext, isPrev }) => (
                          <div
                            className="relative w-full h-full cursor-pointer transition-all duration-300"
                            onClick={() =>
                              navigate(`/collection/${project.applicationID}`)
                            }
                            style={{
                              filter: isActive ? "none" : "blur(2px)",
                              transform: isActive
                                ? "scale(1.05)"
                                : isNext || isPrev
                                ? "scale(0.9)"
                                : "scale(0.8)",
                              opacity: isActive
                                ? 1
                                : isNext || isPrev
                                ? 0.7
                                : 0.5,
                            }}
                          >
                            <img
                              src={project.coverImageURL || "/placeholder.png"}
                              alt={project.title}
                              className="w-full h-full object-cover rounded-lg"
                              onError={(
                                e: React.SyntheticEvent<HTMLImageElement>
                              ) => {
                                e.currentTarget.src = "/placeholder.png";
                              }}
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 rounded-b-lg">
                              <h3 className="text-xl font-bold mb-2">
                                {project.title}
                              </h3>
                            </div>
                          </div>
                        )}
                      </SwiperSlide>
                    ))}
                  </Swiper>
                </>
              )*/}

            {/* Activity */}
            <ActivitySection>
              <ActivityHeader>
                <ActivityTitle $isDarkTheme={isDarkTheme}>
                  Recent Activity
                </ActivityTitle>
                <HeroButton
                  $isDarkTheme={isDarkTheme}
                  variant="outlined"
                  component={Link}
                  to="/sales-activity"
                  sx={{
                    backgroundColor: "transparent !important",
                    border: `2px solid ${
                      isDarkTheme ? "#fff" : "#93f"
                    } !important`,
                    color: `${isDarkTheme ? "#fff" : "#93f"} !important`,
                    "&:hover": {
                      backgroundColor: `${
                        isDarkTheme
                          ? "rgba(255, 255, 255, 0.1)"
                          : "rgba(153, 51, 255, 0.1)"
                      } !important`,
                    },
                  }}
                >
                  View More
                </HeroButton>
              </ActivityHeader>
              <StyledTableContainer $isDarkTheme={isDarkTheme}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Collection</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>From</TableCell>
                      <TableCell>To</TableCell>
                      <TableCell>Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isLoadingSales ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <CircularProgress
                            size={24}
                            sx={{ color: isDarkTheme ? "#fff" : "inherit" }}
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedSales.map((sale) => (
                        <MemoizedActivityTableRow
                          key={sale.transactionId}
                          sale={sale}
                          isDarkTheme={isDarkTheme}
                          tokenInfo={getTokenInfo(
                            sale.collectionId,
                            sale.tokenId
                          )}
                          collectionName={getCollectionName(sale.collectionId)}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </StyledTableContainer>

              {/* Add Pagination */}
              {sales.length > salesPerPage && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                  <CustomPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    isDarkTheme={isDarkTheme}
                  />
                </Box>
              )}
            </ActivitySection>
          </Layout>
        </div>
      ) : (
        <div>
          <SectionHeading>
            <Skeleton variant="rounded" width={240} height={40} />
            <Skeleton variant="rounded" width={120} height={40} />
          </SectionHeading>
          <Grid container spacing={2} sx={{ mt: 5 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Grid item xs={6} sm={4} md={3} key={i}>
                <Skeleton
                  sx={{ borderRadius: 10 }}
                  variant="rounded"
                  width="100%"
                  height={469}
                />
              </Grid>
            ))}
          </Grid>
          <Grid container spacing={2} sx={{ mt: 5 }}>
            <Grid item xs={12} sm={6}>
              <Skeleton variant="rounded" width="100%" height={240} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Skeleton variant="rounded" width="100%" height={240} />
            </Grid>
          </Grid>
        </div>
      )}
    </>
  );
};
