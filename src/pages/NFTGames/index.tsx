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
  CircularProgress,
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
import { useCountdown } from "@/hooks/useCountdown";

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
  const [sellerName, setSellerName] = useState<string>("");
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [buyerName, setBuyerName] = useState<string>("");
  const [buyerProfile, setBuyerProfile] = useState<any>(null);
  const resolver = useEnvoiResolver();
  useEffect(() => {
    resolver.http.getNameFromAddress(sale.seller).then((res) => {
      if (!!res) {
        setSellerName(res);
        resolver.http.search(res).then((res) => {
          if (res.length === 1) {
            setSellerProfile(res[0]);
          }
        });
      } else {
        setSellerName(compactAddress(sale.seller));
      }
    });
    resolver.http.getNameFromAddress(sale.buyer).then((res) => {
      if (!!res) {
        setBuyerName(res);
        resolver.http.search(res).then((res) => {
          if (res.length === 1) {
            setBuyerProfile(res[0]);
          }
        });
      } else {
        setBuyerName(compactAddress(sale.buyer));
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

// Add styled components for HeroSection
const HeroSection = styled.div`
  padding: 48px 0;
  text-align: center;
  margin-bottom: 48px;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${(props) =>
      props.theme.isDarkTheme
        ? "linear-gradient(to bottom, rgba(0, 0, 0, 0.98), rgba(0, 0, 0, 0.95))"
        : "linear-gradient(to bottom, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.08))"};
    backdrop-filter: blur(8px);
    z-index: 1;
  }
`;

const ProjectCollage = styled.div`
  position: absolute;
  top: -50px;
  left: -50px;
  right: -50px;
  bottom: -50px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
  transform: rotate(-5deg);
  z-index: 0;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 16px;
    opacity: ${(props) => (props.theme.isDarkTheme ? 0.2 : 0.15)};
    filter: ${(props) =>
      props.theme.isDarkTheme
        ? "brightness(0.7) contrast(1.2)"
        : "brightness(1.1) contrast(0.9)"};
    min-height: 300px;
  }
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 2;
  padding: 0 20px;
`;

const HeroTitle = styled.h1<{ $isDarkTheme: boolean }>`
  color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 24px;
  font-family: "Plus Jakarta Sans";
  position: relative;
  z-index: 1;
  text-shadow: ${(props) =>
    props.$isDarkTheme
      ? "0 2px 4px rgba(0,0,0,0.3)"
      : "0 2px 4px rgba(255,255,255,0.3)"};

  @media (max-width: 768px) {
    font-size: 36px;
  }
`;

const HeroSubtitle = styled.p<{ $isDarkTheme: boolean }>`
  color: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)"};
  font-size: 20px;
  margin-bottom: 32px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  position: relative;
  z-index: 1;
  text-shadow: ${(props) =>
    props.$isDarkTheme
      ? "0 1px 2px rgba(0,0,0,0.2)"
      : "0 1px 2px rgba(255,255,255,0.2)"};
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
`;

// Add styled components for countdown
const CountdownContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 24px;
  margin: 32px 0;
`;

const CountdownItem = styled.div<{ $isDarkTheme: boolean }>`
  text-align: center;

  .value {
    font-size: 48px;
    font-weight: 700;
    color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};
    line-height: 1;
  }

  .label {
    font-size: 16px;
    color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)"};
    margin-top: 8px;
  }
`;

// Add the NautilusLogo component
const NautilusLogo = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_1482_1161)">
      <path
        d="M17.9997 36.0005C8.05847 36.0005 -0.000522614 27.9415 -0.000522614 18.0003C-0.000522614 8.05899 8.05847 0 17.9997 0C27.941 0 36 8.05899 36 18.0003C36 27.9415 27.941 36.0005 17.9997 36.0005Z"
        fill="#9933FF"
      />
      <path
        d="M30.2379 17.6352C30.2379 14.3182 28.9305 11.1918 26.5571 8.83119C24.183 6.47059 21.039 5.17023 17.7039 5.17023C14.3688 5.17023 11.2248 6.47 8.85136 8.8306C6.47789 11.1912 5.17051 14.3176 5.16992 17.6346V17.7148C5.16992 20.5964 6.15341 23.2491 7.80416 25.3601C7.36698 23.9877 7.13985 22.544 7.13985 21.0672V17.6346C7.13985 14.8409 8.24251 12.2066 10.2437 10.2159C12.2455 8.22526 14.8945 7.12903 17.7033 7.12903C20.5122 7.12903 23.1618 8.22526 25.1636 10.2159C27.1653 12.2066 28.2674 14.8415 28.2674 17.6399L28.2851 20.8991V21.3115C28.2851 23.1688 27.5518 24.9205 26.2208 26.2439C24.8898 27.5679 23.1281 28.2965 21.2609 28.2965C19.3936 28.2965 17.6319 27.5673 16.301 26.2439C14.97 24.9205 14.2366 23.1682 14.2366 21.3109V18.1166C14.2366 16.2723 15.7458 14.7713 17.6001 14.7713C19.4544 14.7713 20.9635 16.2717 20.9635 18.116V20.076L17.603 16.7343C17.3216 16.454 16.8974 16.3702 16.5299 16.5219C16.1623 16.6735 15.9216 17.0304 15.9216 17.4269V21.7516C15.9216 24.6763 18.314 27.0558 21.255 27.0558C24.196 27.0558 26.5883 24.6763 26.5883 21.7516V17.9202C26.5883 12.9878 22.5535 8.97515 17.5942 8.97515C12.6349 8.97515 8.60003 12.9878 8.60003 17.9184L8.59531 21.154C8.59531 23.6225 9.31154 25.9867 10.6455 28.0151C12.0042 28.9379 13.5552 29.6016 15.226 29.935C14.6915 29.5668 14.1853 29.1491 13.7145 28.6812C11.6838 26.6616 10.5652 23.9883 10.5652 21.1557L10.57 17.9202C10.57 16.0628 11.3033 14.3111 12.6343 12.9878C13.9653 11.6638 15.7269 10.9351 17.5942 10.9351C19.4615 10.9351 21.2231 11.6644 22.5541 12.9878C23.8851 14.3117 24.6184 16.0634 24.6184 17.9208V21.7522C24.6184 23.5966 23.1093 25.0975 21.255 25.0975C19.4007 25.0975 17.8915 23.5972 17.8915 21.7522V19.7922L21.252 23.134C21.534 23.4143 21.957 23.498 22.3252 23.3464C22.6933 23.1948 22.9334 22.8378 22.9334 22.4413V18.1166C22.9334 15.192 20.5405 12.8125 17.6001 12.8125C14.6597 12.8125 12.2667 15.192 12.2667 18.1166V21.3109C12.2667 25.6114 15.3346 29.2122 19.4078 30.0642C20.006 30.1893 20.6261 30.2553 21.2609 30.2553C26.2202 30.2553 30.255 26.2427 30.255 21.3109V20.8932L30.2373 17.634L30.2379 17.6352Z"
        fill="white"
      />
    </g>
    <defs>
      <clipPath id="clip0_1482_1161">
        <rect
          width="36"
          height="36"
          fill="white"
          transform="matrix(-1 0 0 1 36 0)"
        />
      </clipPath>
    </defs>
  </svg>
);

// First, add the HumbleSwapLogo component near the NautilusLogo component
const HumbleSwapLogo = () => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 120 126"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M59.6793 83.4022C27.005 83.4022 1.53809 65.2121 1.53809 42.2374H22.4409C22.4409 51.8096 37.8166 62.5797 59.6793 62.5797C81.5416 62.5797 96.9177 51.8096 96.9177 42.2374H117.82C117.82 65.2121 92.3532 83.4022 59.6793 83.4022Z"
        fill={isDarkTheme ? "#fff" : "#41137E"}
      />
      <path
        d="M22.4412 0.834961H0.338013V125.765H22.4412V73.1131V52.7695V0.834961Z"
        fill={isDarkTheme ? "#fff" : "#41137E"}
      />
      <path
        d="M96.918 1V52.9345V73.2782V125.69H119.021V1H96.918Z"
        fill={isDarkTheme ? "#fff" : "#41137E"}
      />
      <path
        d="M59.6815 46.7852C71.7565 46.7852 81.5441 37.0345 81.5441 25.0057C81.5441 12.9786 71.7565 3.22644 59.6815 3.22644C47.6065 3.22644 37.8188 12.9786 37.8188 25.0057C37.8188 37.0345 47.6065 46.7852 59.6815 46.7852Z"
        fill={isDarkTheme ? "#FFBE1D" : "#FFBE1D"}
      />
    </svg>
  );
};

// Update the KibisisLogo component
const KibisisLogo = () => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  return (
    <img
      src="https://kibis.is/images/logo.svg"
      alt="Kibisis"
      style={{
        filter: isDarkTheme
          ? "brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(0%) hue-rotate(93deg) brightness(103%) contrast(103%)"
          : "none",
        width: "100%",
        height: "100%",
        objectFit: "contain",
      }}
    />
  );
};

// Add new styled components for the Rules section
const RulesSection = styled.div`
  margin: 48px 0;
`;

const RuleCard = styled(Box)<{ $isDarkTheme: boolean }>`
  padding: 24px;
  border-radius: 16px;
  background-color: ${(props) =>
    props.$isDarkTheme
      ? "rgba(255, 255, 255, 0.05)"
      : "rgba(255, 255, 255, 0.8)"};
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  margin-bottom: 24px;
`;

const RuleTitle = styled(Typography)`
  font-family: "Plus Jakarta Sans", sans-serif;
  font-weight: 600;
  margin-bottom: 16px;
`;

// Add new interface for project data
interface NFTGameProject {
  applicationID: string;
  title: string;
  coverImageURL: string;
}

// Add new styled components for project cards
const ProjectCard = styled.div<{
  $isDarkTheme: boolean;
  $isActive: boolean;
  $isAdjacent: boolean;
}>`
  position: relative;
  width: 100%;
  height: 100%;
  cursor: pointer;
  transition: all 0.3s ease;
  filter: ${(props) => (props.$isActive ? "none" : "blur(2px)")};
  transform: ${(props) =>
    props.$isActive
      ? "scale(1.05)"
      : props.$isAdjacent
      ? "scale(0.9)"
      : "scale(0.8)"};
  opacity: ${(props) => (props.$isActive ? 1 : props.$isAdjacent ? 0.7 : 0.5)};
`;

const ProjectImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 16px;
`;

const ProjectOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.5);
  padding: 16px;
  border-radius: 0 0 16px 16px;
`;

const ProjectTitle = styled.h3`
  font-size: 24px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 8px;
`;

export const NFTGames: React.FC = () => {
  /* Dispatch */
  const dispatch = useDispatch();

  const resolver = useEnvoiResolver();

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
        const salesData = response.data.sales.slice(0, 10);

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
    margin-bottom: 24px;
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

  const [tabValue, setTabValue] = useState(0);
  const [trendingCollections, setTrendingCollections] = useState<
    CollectionStats[]
  >([]);
  const [isLoadingTrendingCollections, setIsLoadingTrendingCollections] =
    useState(false);

  // Add tab change handler
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Add useProjects hook
  const { data: projects } = useProjects();

  console.log("projects", projects);

  // Add state for marketplace stats
  const [marketStats, setMarketStats] = useState({
    totalVolume: 4200000000000, // 4.2M VOI in microVOI
    totalSales: 265,
    totalNFTs: 0,
    totalTraders: 0,
    isLoading: false
  });

  // Add effect to fetch marketplace stats
  /*useEffect(() => {
    const fetchMarketStats = async () => {
      try {
        // Fetch total sales and volume
        const salesResponse = await axios.get(
          "https://mainnet-idx.nautilus.sh/nft-indexer/v1/mp/sales",
          {
            params: {
              ["min-round"]: 4727817,
            },
          }
        );

        const totalVolume = salesResponse.data.sales.reduce(
          (sum: number, sale: any) => sum + Number(sale.price),
          0
        );

        setMarketStats({
          totalVolume,
          totalSales: salesResponse.data.sales.length,
          totalNFTs: 0,
          totalTraders: new Set(
            salesResponse.data.sales
              .map((sale: any) => [sale.buyer, sale.seller])
              .flat()
          ).size,
          isLoading: false,
        });
      } catch (error) {
        console.error("Error fetching market stats:", error);
        setMarketStats((prev) => ({ ...prev, isLoading: false }));
      }
    };

    fetchMarketStats();
  }, []);*/

  // Add helper function to format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Update the LAUNCH_DATE constant to match official start time
  const LAUNCH_DATE = new Date("2025-02-14T17:00:00Z").getTime();
  const { days, hours, minutes, seconds, isComplete } =
    useCountdown(LAUNCH_DATE);

  const renderProject = (
    project: NFTGameProject,
    isActive: boolean,
    isNext: boolean,
    isPrev: boolean
  ) => (
    <ProjectCard
      $isDarkTheme={isDarkTheme}
      $isActive={isActive}
      $isAdjacent={isNext || isPrev}
      onClick={() => navigate(`/collection/${project.applicationID}`)}
    >
      <ProjectImage
        src={project.coverImageURL || "/placeholder.png"}
        alt={project.title}
        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
          e.currentTarget.src = "/placeholder.png";
        }}
      />
      <ProjectOverlay>
        <ProjectTitle>{project.title}</ProjectTitle>
      </ProjectOverlay>
    </ProjectCard>
  );

  return (
    <>
      {!isLoading ? (
        <div>
          <HeroSection>
            {projects?.nftGamesProjects && (
              <ProjectCollage>
                {/* Repeat projects to fill the grid */}
                {[
                  ...projects.nftGamesProjects,
                  ...projects.nftGamesProjects,
                  ...projects.nftGamesProjects,
                ]
                  .slice(0, 12)
                  .map((project, index) => (
                    <img
                      key={`${project.applicationID}-${index}`}
                      src={project.coverImageURL || "/placeholder.png"}
                      alt=""
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        e.currentTarget.src = "/placeholder.png";
                      }}
                    />
                  ))}
              </ProjectCollage>
            )}
            <HeroContent>
              <HeroTitle $isDarkTheme={isDarkTheme}>
                🔥 Traders and Creators Collide! ❄️
              </HeroTitle>
              <HeroSubtitle $isDarkTheme={isDarkTheme}>
                Join the VOI NFT Winter Games! Trade, compete as a trader or
                creator, and showcase your creativity. Total potential prize
                pool of 100 Million VOI with real-time leaderboards and exciting
                rewards.
              </HeroSubtitle>

              {/* Add conditional rendering for countdown vs stats */}
              {!isComplete ? (
                <>
                  <Typography
                    variant="h6"
                    sx={{
                      textAlign: "center",
                      color: isDarkTheme
                        ? "rgba(255, 255, 255, 0.7)"
                        : "rgba(0, 0, 0, 0.7)",
                      mb: 2,
                    }}
                  >
                    Game Starts in
                  </Typography>
                  <CountdownContainer>
                    <CountdownItem $isDarkTheme={isDarkTheme}>
                      <div className="value">{days}</div>
                      <div className="label">Days</div>
                    </CountdownItem>
                    <CountdownItem $isDarkTheme={isDarkTheme}>
                      <div className="value">{hours}</div>
                      <div className="label">Hours</div>
                    </CountdownItem>
                    <CountdownItem $isDarkTheme={isDarkTheme}>
                      <div className="value">{minutes}</div>
                      <div className="label">Minutes</div>
                    </CountdownItem>
                    <CountdownItem $isDarkTheme={isDarkTheme}>
                      <div className="value">{seconds}</div>
                      <div className="label">Seconds</div>
                    </CountdownItem>
                  </CountdownContainer>
                </>
              ) : (
                <StatsContainer>
                  {marketStats.isLoading ? (
                    <>
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
                          {formatNumber(marketStats.totalTraders)}
                        </div>
                        <div className="stat-label">Active Traders</div>
                      </StatItem>*/}
                    </>
                  )}
                </StatsContainer>
              )}

              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  justifyContent: "center",
                  mt: 3,
                }}
              >
                <HeroButton
                  $isDarkTheme={isDarkTheme}
                  variant="contained"
                  className="external-link"
                  component="a"
                  href="https://nftnavigator.xyz/nftgames"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Track Progress
                </HeroButton>
                <HeroButton
                  $isDarkTheme={isDarkTheme}
                  variant="contained"
                  className="external-link"
                  onClick={() => navigate("/listing")}
                >
                  Listings
                </HeroButton>
              </Box>
            </HeroContent>
          </HeroSection>
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
            {/*<Box sx={{ mb: 3 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 600,
                  color: isDarkTheme ? "#fff" : "#000",
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                }}
              >
                Featured Collections
              </Typography>
            </Box>
            {isLoadingTopCollections ? (
              <div className="w-full">
                <Skeleton
                  variant="rectangular"
                  height={400}
                  sx={{ borderRadius: 2 }}
                />
              </div>
            ) : (
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
                  // when window width is >= 320px
                  320: {
                    slidesPerView: 1,
                    spaceBetween: 20,
                  },
                  // when window width is >= 640px
                  640: {
                    slidesPerView: 2,
                    spaceBetween: 30,
                  },
                  // when window width is >= 1024px
                  1024: {
                    slidesPerView: 3,
                    spaceBetween: 30,
                  },
                }}
              >
                {topCollections.map((collection) => {
                  const metadata = collection.metadata?.firstToken?.metadata
                    ? JSON.parse(collection.metadata.firstToken.metadata)
                    : null;

                  return (
                    <SwiperSlide key={collection.collectionId}>
                      {({ isActive, isNext, isPrev }) => (
                        <div
                          className="relative w-full h-full cursor-pointer transition-all duration-300"
                          onClick={() =>
                            navigate(`/collection/${collection.collectionId}`)
                          }
                          style={{
                            filter: isActive ? "none" : "blur(2px)",
                            transform: isActive ? "scale(1.05)" : isNext || isPrev ? "scale(0.9)" : "scale(0.8)",
                            opacity: isActive ? 1 : isNext || isPrev ? 0.7 : 0.5,
                          }}
                        >
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
                            className="w-full h-full object-cover rounded-lg"
                            onError={(
                              e: React.SyntheticEvent<HTMLImageElement>
                            ) => {
                              e.currentTarget.src = "/placeholder.png";
                            }}
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 rounded-b-lg">
                            <h3 className="text-xl font-bold mb-2">
                              {metadata?.name?.replace(/\s*#\d+$/, "") ||
                                `Collection #${collection.collectionId}`}
                            </h3>
                            <div className="flex justify-between">
                              <div>
                                <p className="text-sm opacity-80">Total Sales</p>
                                <p className="font-bold">
                                  {collection.totalSales}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm opacity-80">Volume</p>
                                <p className="font-bold">
                                  {formatPrice(collection.totalVolume)} VOI
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </SwiperSlide>
                  );
                })}
              </Swiper>
            )}*/}
            {/*</TabPanel>*/}

            {/*<TabPanel value={tabValue} index={1}>*/}
            {/*<Box sx={{ mb: 3 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 600,
                  color: isDarkTheme ? "#fff" : "#000",
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                }}
              >
                Trending Collections
              </Typography>
            </Box>
            {isLoadingTrendingCollections ? (
              <div className="w-full">
                <Skeleton
                  variant="rectangular"
                  height={400}
                  sx={{ borderRadius: 2 }}
                />
              </div>
            ) : (
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
                  // when window width is >= 320px
                  320: {
                    slidesPerView: 1,
                    spaceBetween: 20,
                  },
                  // when window width is >= 640px
                  640: {
                    slidesPerView: 2,
                    spaceBetween: 30,
                  },
                  // when window width is >= 1024px
                  1024: {
                    slidesPerView: 3,
                    spaceBetween: 30,
                  },
                }}
              >
                {trendingCollections.map((collection) => {
                  const metadata = collection.metadata?.firstToken?.metadata
                    ? JSON.parse(collection.metadata.firstToken.metadata)
                    : null;

                  return (
                    <SwiperSlide key={collection.collectionId}>
                      {({ isActive, isNext, isPrev }) => (
                        <div
                          className="relative w-full h-full cursor-pointer transition-all duration-300"
                          onClick={() =>
                            navigate(`/collection/${collection.collectionId}`)
                          }
                          style={{
                            filter: isActive ? "none" : "blur(2px)",
                            transform: isActive ? "scale(1.05)" : isNext || isPrev ? "scale(0.9)" : "scale(0.8)",
                            opacity: isActive ? 1 : isNext || isPrev ? 0.7 : 0.5,
                          }}
                        >
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
                            className="w-full h-full object-cover rounded-lg"
                            onError={(
                              e: React.SyntheticEvent<HTMLImageElement>
                            ) => {
                              e.currentTarget.src = "/placeholder.png";
                            }}
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 rounded-b-lg">
                            <h3 className="text-xl font-bold mb-2">
                              {metadata?.name?.replace(/\s*#\d+$/, "") ||
                                `Collection #${collection.collectionId}`}
                            </h3>
                            <div className="flex justify-between">
                              <div>
                                <p className="text-sm opacity-80">Recent Sales</p>
                                <p className="font-bold">
                                  {collection.totalSales}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm opacity-80">Volume</p>
                                <p className="font-bold">
                                  {formatPrice(collection.totalVolume)} VOI
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </SwiperSlide>
                  );
                })}
              </Swiper>
            )}*/}
            {/*</TabPanel>*/}
            {/* NFT Games Section */}
            {projects?.nftGamesProjects &&
              projects.nftGamesProjects.length > 0 && (
                <>
                  <Box sx={{ mb: 3, mt: 0 }}>
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
                        10% fee from all NFT trades during the games goes to
                        prize pool.
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <FavoriteIcon sx={{ color: "#ff69b4", fontSize: 16 }} />
                        Voi Foundation matching up to 50M VOI.
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <FavoriteIcon sx={{ color: "#ff69b4", fontSize: 16 }} />
                        These projects are part of the NFT Games.
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
                        {({ isActive, isNext, isPrev }) =>
                          renderProject(project, isActive, isNext, isPrev)
                        }
                      </SwiperSlide>
                    ))}
                  </Swiper>
                </>
              )}

            {/* Players Section */}
            <Box sx={{ mb: 3, mt: 6 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 600,
                  color: isDarkTheme ? "#fff" : "#000",
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                }}
              >
                Players
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
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <FavoriteIcon sx={{ color: "#ff69b4", fontSize: 16 }} />
                  Traders compete for 85% of the prize pool through volume and
                  profit leaderboards.
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <FavoriteIcon sx={{ color: "#ff69b4", fontSize: 16 }} />
                  Creators compete for 15% of the prize pool through minting and
                  social media leaderboards.
                </Box>
              </Typography>
            </Box>

            {/* How to Play: Traders Guide */}
            <Box sx={{ mb: 3, mt: 6 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 600,
                  color: isDarkTheme ? "#fff" : "#000",
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                }}
              >
                How to Play: Traders Guide
              </Typography>
            </Box>

            <Grid container spacing={3} sx={{ mb: 6 }}>
              {[
                {
                  title: "1. Find NFT Games Projects",
                  description:
                    "Browse the NFT Games section above to find participating collections. These projects contribute to the prize pool and are eligible for the competition.",
                  icon: "🔍",
                },
                {
                  title: "2. Buy NFTs",
                  description:
                    "Purchase NFTs from participating collections through any supported marketplace. The base price for profit calculations is set by the mint price or highest previous sale.",
                  icon: "💰",
                },
                {
                  title: "3. List & Trade",
                  description:
                    "List your NFTs for sale and make profitable trades. Every VOI in volume and profit counts as points towards your position on the leaderboards.",
                  icon: "📈",
                },
                {
                  title: "4. Track Progress",
                  description:
                    "Monitor your ranking on the volume and profit leaderboards. Your points automatically convert to raffle tickets for the prize drawing.",
                  icon: "🏆",
                },
              ].map((step, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: isDarkTheme
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(0, 0, 0, 0.1)",
                      backgroundColor: isDarkTheme
                        ? "rgba(255, 255, 255, 0.05)"
                        : "rgba(255, 255, 255, 0.8)",
                      height: "100%",
                      display: "flex",
                      gap: 2,
                    }}
                  >
                    <Box
                      sx={{
                        fontSize: "2rem",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {step.icon}
                    </Box>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          color: isDarkTheme ? "#fff" : "#000",
                          mb: 1,
                          fontFamily: '"Plus Jakarta Sans", sans-serif',
                        }}
                      >
                        {step.title}
                      </Typography>
                      <Typography
                        sx={{
                          color: isDarkTheme
                            ? "rgba(255, 255, 255, 0.7)"
                            : "rgba(0, 0, 0, 0.7)",
                          fontFamily: '"Plus Jakarta Sans", sans-serif',
                        }}
                      >
                        {step.description}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>

            {/* Prize Distribution */}
            <Box sx={{ mb: 3, mt: 6 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 600,
                  color: isDarkTheme ? "#fff" : "#000",
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                }}
              >
                Prize Distribution
              </Typography>
            </Box>

            <Grid container spacing={3} sx={{ mb: 6 }}>
              {/* Left column - Prize Pool Breakdown */}
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: isDarkTheme
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.1)",
                    backgroundColor: isDarkTheme
                      ? "rgba(255, 255, 255, 0.05)"
                      : "rgba(255, 255, 255, 0.8)",
                    height: "100%",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      color: isDarkTheme ? "#fff" : "#000",
                      mb: 3,
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <span style={{ fontSize: "1.5rem" }}>💰</span> Prize Pool
                    Funding
                  </Typography>

                  {/* Circular Progress Indicators */}
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 3 }}
                  >
                    <Box sx={{ textAlign: "center" }}>
                      <Typography
                        sx={{
                          color: isDarkTheme
                            ? "rgba(255, 255, 255, 0.7)"
                            : "rgba(0, 0, 0, 0.7)",
                          mb: 1,
                          fontFamily: '"Plus Jakarta Sans", sans-serif',
                        }}
                      >
                        Traders Competition
                      </Typography>
                      <Box
                        sx={{ position: "relative", display: "inline-flex" }}
                      >
                        <CircularProgress
                          variant="determinate"
                          value={85}
                          size={100}
                          thickness={4}
                          sx={{ color: "#93f" }}
                        />
                        <Box
                          sx={{
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            position: "absolute",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Typography
                            sx={{
                              color: isDarkTheme ? "#fff" : "#000",
                              fontFamily: '"Plus Jakarta Sans", sans-serif',
                              fontWeight: "bold",
                            }}
                          >
                            85%
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box sx={{ textAlign: "center" }}>
                      <Typography
                        sx={{
                          color: isDarkTheme
                            ? "rgba(255, 255, 255, 0.7)"
                            : "rgba(0, 0, 0, 0.7)",
                          mb: 1,
                          fontFamily: '"Plus Jakarta Sans", sans-serif',
                        }}
                      >
                        Creators Competition
                      </Typography>
                      <Box
                        sx={{ position: "relative", display: "inline-flex" }}
                      >
                        <CircularProgress
                          variant="determinate"
                          value={15}
                          size={100}
                          thickness={4}
                          sx={{ color: "#ff69b4" }}
                        />
                        <Box
                          sx={{
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            position: "absolute",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Typography
                            sx={{
                              color: isDarkTheme ? "#fff" : "#000",
                              fontFamily: '"Plus Jakarta Sans", sans-serif',
                              fontWeight: "bold",
                            }}
                          >
                            15%
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Grid>

              {/* Right column - Competition Details */}
              <Grid item xs={12} md={8}>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: isDarkTheme
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.1)",
                    backgroundColor: isDarkTheme
                      ? "rgba(255, 255, 255, 0.05)"
                      : "rgba(255, 255, 255, 0.8)",
                    height: "100%",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      color: isDarkTheme ? "#fff" : "#000",
                      mb: 3,
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <span style={{ fontSize: "1.5rem" }}>🏆</span> Competition
                    Details
                  </Typography>

                  <Grid container spacing={3}>
                    {[
                      {
                        title: "Volume Leaderboard",
                        percentage: "42.5%",
                        details: [
                          "Track total trading volume",
                          "1 VOI = 1 Point",
                          "Points convert to raffle tickets",
                        ],
                      },
                      {
                        title: "Profit Leaderboard",
                        percentage: "42.5%",
                        details: [
                          "Earn points for profitable trades",
                          "Base price from mint or highest sale",
                          "Points convert to raffle tickets",
                        ],
                      },
                      {
                        title: "Minting Leaderboard",
                        percentage: "10%",
                        details: [
                          "Points based on mint price",
                          "Only NFT Games projects eligible",
                          "Points convert to raffle tickets",
                        ],
                      },
                      {
                        title: "Social Media Leaderboard",
                        percentage: "5%",
                        details: [
                          "Track #VoiGames & @Voi_Net",
                          "1 impression = 1 point",
                          "Official project accounts only",
                        ],
                      },
                    ].map((category, index) => (
                      <Grid item xs={12} sm={6} key={index}>
                        <Box sx={{ mb: 2 }}>
                          <Typography
                            sx={{
                              color: isDarkTheme ? "#fff" : "#000",
                              fontFamily: '"Plus Jakarta Sans", sans-serif',
                              fontWeight: "bold",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              mb: 1,
                            }}
                          >
                            {category.title}
                            <span style={{ color: "#93f" }}>
                              {category.percentage}
                            </span>
                          </Typography>
                          <Box component="ul" sx={{ m: 0, pl: 2 }}>
                            {category.details.map((detail, detailIndex) => (
                              <Typography
                                component="li"
                                key={detailIndex}
                                sx={{
                                  color: isDarkTheme
                                    ? "rgba(255, 255, 255, 0.7)"
                                    : "rgba(0, 0, 0, 0.7)",
                                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                                  fontSize: "0.9rem",
                                  mb: 0.5,
                                }}
                              >
                                {detail}
                              </Typography>
                            ))}
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Grid>
            </Grid>

            {/* Participating Projects Section */}
            <Box sx={{ mt: 6, mb: 4 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 600,
                  color: isDarkTheme ? "#fff" : "#000",
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  mb: 3,
                }}
              >
                Participating Projects
              </Typography>

              <Box
                sx={{
                  p: 4,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: isDarkTheme
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                  backgroundColor: isDarkTheme
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(255, 255, 255, 0.8)",
                }}
              >
                {/* Project Categories */}
                <Grid container spacing={4}>
                  {[
                    {
                      category: "Trading & Launch Platforms",
                      description: "Where NFT Games projects begin and trade",
                      platforms: [
                        {
                          name: "Highforge",
                          logo: "https://highforge.io/apple-touch-icon.png",
                          description: "NFT Launchpad. Buy here first.",
                          link: "https://highforge.io",
                        },
                        {
                          name: "Nautilus",
                          logo: <NautilusLogo />,
                          description: "NFT Marketplace. You are here.",
                          link: "https://nautilus.sh",
                        },
                        /*
                        {
                          name: "Mechaswap",
                          logo: "https://prod.cdn.highforge.io/i/https%3A%2F%2Fprod.cdn.highforge.io%2Fm%2F399213%2F1.json%23arc3?w=480",
                          description: "Trustless NFT swaps",
                          link: "https://mechaswap.nautilus.sh",
                        },
                        */
                      ],
                    },
                    {
                      category: "Tools & Infrastructure",
                      description: "Essential services powering the NFT Games",
                      platforms: [
                        {
                          name: "NFT Navigator",
                          logo: "https://nftnavigator.xyz/_app/immutable/assets/android-chrome-192x192.BJQGzsFc.png",
                          description:
                            "Advanced analytics and trading platform. Games tracking.",
                          link: "https://nftnavigator.xyz",
                        },
                        {
                          name: "Voiager Explorer",
                          logo: "https://voirewards.com/logos/voiager-explorer.png",
                          description: "Block Explorer. Token Tracker. Charts.",
                          link: "https://voiager.xyz/tokens",
                        },
                        {
                          name: "HumbleSwap",
                          logo: <HumbleSwapLogo />,
                          description:
                            "Decentralized exchange. Swap cryptocurrencies on-chain.",
                          link: "https://voi.humble.sh",
                        },
                        {
                          name: "Kibisis",
                          logo: <KibisisLogo />,
                          description:
                            "Web Extension Wallet for Voi Network with smart asset token and nft support.",
                          link: "https://kibis.is",
                        },
                        {
                          name: "Lute",
                          logo: "https://voirewards.com/logos/lute.svg",
                          description:
                            "Web Wallet with that supports Ledger Hardward Wallet. Interact with Highforge and sign on mobile.",
                          link: "https://lute.app",
                        },
                        {
                          name: "enVoi",
                          logo: "https://pbs.twimg.com/profile_images/1869235054297137152/K00Ts5Sv_400x400.jpg",
                          description:
                            "Naming service for Voi Network. Claim your name.",
                          link: "https://envoi.sh",
                        },
                      ],
                    },
                  ].map((category, index) => (
                    <Grid item xs={12} key={index}>
                      <Box sx={{ mb: 4 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            color: isDarkTheme ? "#fff" : "#000",
                            fontFamily: '"Plus Jakarta Sans", sans-serif',
                            fontWeight: 600,
                            mb: 1,
                          }}
                        >
                          {category.category}
                        </Typography>
                        <Typography
                          sx={{
                            color: isDarkTheme
                              ? "rgba(255, 255, 255, 0.7)"
                              : "rgba(0, 0, 0, 0.7)",
                            fontFamily: '"Plus Jakarta Sans", sans-serif',
                            mb: 3,
                          }}
                        >
                          {category.description}
                        </Typography>

                        <Grid container spacing={3}>
                          {category.platforms.map((platform) => (
                            <Grid
                              item
                              xs={12}
                              sm={6}
                              md={4}
                              key={platform.name}
                            >
                              <Box
                                component={Link}
                                to={platform.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{
                                  p: 3,
                                  height: "100%",
                                  borderRadius: 2,
                                  border: "1px solid",
                                  borderColor: isDarkTheme
                                    ? "rgba(255, 255, 255, 0.1)"
                                    : "rgba(0, 0, 0, 0.1)",
                                  backgroundColor: isDarkTheme
                                    ? "rgba(255, 255, 255, 0.02)"
                                    : "#fff",
                                  display: "flex",
                                  flexDirection: "column",
                                  transition: "all 0.2s ease-in-out",
                                  textDecoration: "none",
                                  "&:hover": {
                                    transform: "translateY(-4px)",
                                    boxShadow: isDarkTheme
                                      ? "0 4px 20px rgba(0, 0, 0, 0.3)"
                                      : "0 4px 20px rgba(0, 0, 0, 0.1)",
                                    borderColor: "#93f",
                                  },
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 2,
                                    mb: 2,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: 48,
                                      height: 48,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      borderRadius: "12px",
                                      overflow: "hidden",
                                      backgroundColor: isDarkTheme
                                        ? "rgba(255, 255, 255, 0.05)"
                                        : "rgba(0, 0, 0, 0.02)",
                                    }}
                                  >
                                    {typeof platform.logo === "string" ? (
                                      <img
                                        src={platform.logo}
                                        alt={platform.name}
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "contain",
                                        }}
                                      />
                                    ) : (
                                      platform.logo
                                    )}
                                  </Box>
                                  <Typography
                                    variant="h6"
                                    sx={{
                                      color: isDarkTheme ? "#fff" : "#000",
                                      fontFamily:
                                        '"Plus Jakarta Sans", sans-serif',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {platform.name}
                                  </Typography>
                                </Box>
                                <Typography
                                  sx={{
                                    color: isDarkTheme
                                      ? "rgba(255, 255, 255, 0.7)"
                                      : "rgba(0, 0, 0, 0.7)",
                                    fontFamily:
                                      '"Plus Jakarta Sans", sans-serif',
                                  }}
                                >
                                  {platform.description}
                                </Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Box>
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

      {/* Activity */}
      {/*
      <ActivitySection>
        <ActivityTitle $isDarkTheme={isDarkTheme}>
          Recent Activity
        </ActivityTitle>
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
                  <ActivityTableRow
                    key={sale.transactionId}
                    sale={sale}
                    isDarkTheme={isDarkTheme}
                    tokenInfo={getTokenInfo(sale.collectionId, sale.tokenId)}
                    collectionName={getCollectionName(sale.collectionId)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </StyledTableContainer>
        */}

      {/* Add Pagination */}
      {/*
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
      */}
    </>
  );
};
