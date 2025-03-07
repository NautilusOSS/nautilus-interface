import React, {
  ReactNode,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import Layout from "../../layouts/Default";
import {
  Box,
  CircularProgress,
  Grid,
  Skeleton,
  Unstable_Grid2,
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
  Autocomplete,
  TextField,
  Chip,
  Paper,
  Stack,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/store";
import axios from "axios";
//import { MarketplaceContext } from "../../store/MarketplaceContext";
import NftCard from "../../components/NFTCard";
import { decodePrice, decodeTokenId, getRankings } from "../../utils/mp";
import styled from "styled-components";
import NFTCollectionTable from "../../components/NFTCollectionTable";
import NFTSalesTable from "../../components/NFTSalesTable";
import NFTSaleActivityTable from "../../components/NFTSaleActivityTable";
import NFTListingTable from "../../components/NFTListingTable";
import RankingList from "../../components/RankingList";
import ToggleButtons from "../../components/RankingFilterToggleButtons";
import MyAutocomplete from "../../components/Autocomplete";
import { getTokens, updateToken } from "../../store/tokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { getCollections } from "../../store/collectionSlice";
import {
  CollectionI,
  ListedToken,
  ListingI,
  NFTIndexerListingI,
  RankingI,
  Token,
  TokenI,
  TokenType,
} from "../../types";
import { getSales } from "../../store/saleSlice";
import { getPrices } from "../../store/dexSlice";
import { CTCINFO_LP_WVOI_VOI } from "../../contants/dex";
import { getListings } from "../../store/listingSlice";
//import NFTCard from "../../components/NFTCard2";
import { Search, SearchOutlined } from "@mui/icons-material";
import { useDebounceCallback } from "usehooks-ts";
import { lazy } from "react";
import { getSmartTokens } from "../../store/smartTokenSlice";
import { BigNumber } from "bignumber.js";
import CartNftCard from "../../components/CartNFTCard";
import Grid2 from "@mui/material/Unstable_Grid2/Grid2";
import LazyLoad from "react-lazy-load";
import TokenSelect from "../../components/TokenSelect";
import LayersIcon from "@mui/icons-material/Layers";
import {
  useListings,
  useSmartTokens,
} from "@/components/Navbar/hooks/collections";
import { GridLoader } from "react-spinners";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { stripTrailingZeroBytes } from "@/utils/string";
import { GridView, List } from "@mui/icons-material";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import InfiniteScroll from "react-infinite-scroll-component";
import { setTimeFilter } from "../../store/userSlice";
import { useQuery } from "@tanstack/react-query";

const formatter = Intl.NumberFormat("en", { notation: "compact" });

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
  min-height: calc(100vh - 88px);
  position: relative;
  width: 100%;

  @media (max-width: 768px) {
    margin-top: 0;
  }
`;

const SidebarFilterRoot = styled(Stack)`
  display: flex;
  width: 270px;
  padding: var(--Main-System-24px, 24px);
  gap: var(--Main-System-24px, 24px);
  border-radius: var(--Main-System-10px, 10px);
  flex-shrink: 0;
  position: sticky;
  top: 88px;
  height: fit-content;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  align-self: flex-start;
  flex-direction: column;
  justify-content: space-between;

  &.dark {
    border: 1px solid #2b2b2b;
    background: #202020;
  }
  &.light {
    border: 1px solid #eaebf0;
    background: var(--Background-Base-Main, #fff);
  }

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${(props) => (props.theme.isDarkTheme ? "#3b3b3b" : "#eaebf0")};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${(props) => (props.theme.isDarkTheme ? "#4b4b4b" : "#d0d0d0")};
  }
`;

const ListingContainer = styled.div<{ viewMode?: "grid" | "list" | "compact" }>`
  padding: 16px;
  overflow: hidden;
  flex-grow: 1;
  width: 100%;
  min-height: calc(100vh - 88px);

  // Add padding for hover effects
  & > div {
    padding: ${(props) => (props.viewMode === "list" ? "0" : "8px")};
  }

  // Responsive padding
  @media (min-width: 768px) {
    padding: ${(props) => (props.viewMode === "list" ? "24px" : "20px")};
  }

  @media (max-width: 768px) {
    padding: 12px;
    min-height: calc(100vh - 88px - 56px);
  }
`;

const ListingHeading = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const HeadingLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HeadingRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const StyledToggleButtonGroup = styled(ToggleButtonGroup)<{
  theme: { isDarkTheme: boolean };
}>`
  border: 1px solid
    ${(props) => (props.theme.isDarkTheme ? "#3b3b3b" : "#eaebf0")};
  background: ${(props) => (props.theme.isDarkTheme ? "#2b2b2b" : "#fff")};
  border-radius: 8px;

  .MuiToggleButton-root {
    border: none;
    color: ${(props) => (props.theme.isDarkTheme ? "#fff" : "#000")};

    &:hover {
      background: ${(props) =>
        props.theme.isDarkTheme ? "#3b3b3b" : "#f5f5f5"};
    }

    &.Mui-selected {
      background: ${(props) =>
        props.theme.isDarkTheme ? "#3b3b3b" : "#f5f5f5"};
      color: ${(props) => (props.theme.isDarkTheme ? "#fff" : "#000")};

      &:hover {
        background: ${(props) =>
          props.theme.isDarkTheme ? "#4b4b4b" : "#e5e5e5"};
      }
    }
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

const SectionMoreButtonText = styled.div`
  /* Text Button/Semibold Large */
  font-family: "Inter", sans-serif;
  font-size: 15px;
  font-style: normal;
  font-weight: 600;
  line-height: 22px; /* 146.667% */
  letter-spacing: 0.1px;
  cursor: pointer;
`;

const SectionBanners = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 45px;
`;

function shuffleArray<T>(array: T[]): T[] {
  // Create a copy of the original array to avoid mutating the original array
  const shuffledArray = [...array];
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    // Generate a random index between 0 and i
    const randomIndex = Math.floor(Math.random() * (i + 1));
    // Swap elements between randomIndex and i
    [shuffledArray[i], shuffledArray[randomIndex]] = [
      shuffledArray[randomIndex],
      shuffledArray[i],
    ];
  }
  return shuffledArray;
}

//const CartNFTCard = lazy(() => import("../../components/CartNFTCard"));

interface CollectionData {
  contractId: number;
  totalSupply: number;
  creator: string;
  globalState: Array<{
    key: string;
    value: any;
  }>;
  mintRound: number;
  burnedSupply: number;
  firstToken: any;
}

const useCollections = () => {
  return useQuery({
    queryKey: ["collections"],
    queryFn: async () => {
      const { data } = await axios.get(
        //"https://arc72-voi-mainnet.nftnavigator.xyz/nft-indexer/v1/collections"
        "https://mainnet-idx.nautilus.sh/nft-indexer/v1/collections"
      );
      return data.collections as CollectionData[];
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

// Add this helper function near the top of the file
const getCollectionName = (collection: CollectionData) => {
  try {
    if (!collection.firstToken?.metadata) return `#${collection.contractId}`;
    const metadata = JSON.parse(collection.firstToken.metadata);
    // Try to get collection name from standard metadata fields
    const name =
      metadata.collection_name ||
      metadata.collectionName ||
      metadata.collection ||
      metadata.name;
    if (!name) return `#${collection.contractId}`;

    // Remove trailing numbers with optional # prefix
    const cleanedName = name.replace(/[#\s]*\d+$/, "").trim();
    return cleanedName || `#${collection.contractId}`;
  } catch (e) {
    return `#${collection.contractId}`;
  }
};

const StyledSelect = styled(Select)<{ isDark?: boolean }>`
  .MuiSelect-select {
    padding: 6px 12px;
    color: ${(props) => (props.isDark ? "#fff" : "#000")};
    font-size: 0.875rem;
  }

  .MuiOutlinedInput-notchedOutline {
    border-color: ${(props) => (props.isDark ? "#3b3b3b" : "#eaebf0")};
  }

  &:hover .MuiOutlinedInput-notchedOutline {
    border-color: ${(props) => (props.isDark ? "#4b4b4b" : "#d0d0d0")};
  }

  &.Mui-focused .MuiOutlinedInput-notchedOutline {
    border-color: ${(props) => (props.isDark ? "#4b4b4b" : "#93f")};
  }

  .MuiSvgIcon-root {
    color: ${(props) => (props.isDark ? "#fff" : "#000")};
  }

  .MuiPaper-root {
    background-color: ${(props) => (props.isDark ? "#2b2b2b" : "#fff")};
    border: 1px solid ${(props) => (props.isDark ? "#3b3b3b" : "#eaebf0")};
  }
`;

const StyledMenuItem = styled(MenuItem)<{ isDark?: boolean }>`
  &.MuiMenuItem-root {
    font-size: 0.875rem;
    color: ${(props) => (props.isDark ? "#fff" : "#000")};

    &:hover {
      background-color: ${(props) => (props.isDark ? "#3b3b3b" : "#f5f5f5")};
    }

    &.Mui-selected {
      background-color: ${(props) => (props.isDark ? "#2b2b2b" : "#f0f0f0")};

      &:hover {
        background-color: ${(props) => (props.isDark ? "#3b3b3b" : "#e5e5e5")};
      }
    }
  }
`;

export const Listings: React.FC = () => {
  const dispatch = useDispatch();
  const timeFilter = useSelector((state: RootState) => state.user.timeFilter);

  const { data: listings, status: listingsStatus } = useListings();

  const { status: smartTokenStatus, data: smartTokens } = useSmartTokens();

  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  const navigate = useNavigate();

  const [selectedOption, setSelectedOption] = useState<string | null>("all");

  const handleOptionChange = (
    event: React.MouseEvent<HTMLElement>,
    newOption: string | null
  ) => {
    if (newOption !== null) {
      setSelectedOption(newOption);
    }
  };

  const [search, setSearch] = useState<string>("");
  const [searchValue, setSearchValue] = useState<string>("");
  const [min, setMin] = useState<string>("");
  const [max, setMax] = useState<string>("");
  const [currency, setCurrency] = useState<string>("");
  const [showing, setShowing] = useState(50);

  const debouncedSearch = useDebounceCallback(setSearch, 500);
  const debouncedMin = useDebounceCallback(setMin, 500);
  const debouncedMax = useDebounceCallback(setMax, 500);

  const { data: collections, isLoading: collectionsLoading } = useCollections();

  const listCurencies: number[] = useMemo(() => {
    const tokenIds = new Set();
    for (const listing of listings ?? []) {
      tokenIds.add(listing.currency);
    }
    return Array.from(tokenIds) as number[];
  }, [listings]);

  const normalListings = useMemo(() => {
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

  const [selectedCollections, setSelectedCollections] = useState<
    CollectionData[]
  >([]);

  const filteredListings = useMemo(() => {
    const listings = normalListings.map((listing: ListingI) => {
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

    // Time filtering with fallback logic
    const now = Date.now();
    const get24hListings = () => {
      return listings.filter((listing: any) => {
        const listingTime = listing.createTimestamp * 1000;
        return now - listingTime <= 24 * 60 * 60 * 1000;
      });
    };

    const get7dListings = () => {
      return listings.filter((listing: any) => {
        const listingTime = listing.createTimestamp * 1000;
        return now - listingTime <= 7 * 24 * 60 * 60 * 1000;
      });
    };

    let timeFilteredListings;
    const currentTimeFilter = timeFilter || "24h";

    if (currentTimeFilter === "24h") {
      timeFilteredListings = get24hListings();
      if (timeFilteredListings.length === 0) {
        timeFilteredListings = get7dListings();
        if (timeFilteredListings.length === 0) {
          timeFilteredListings = listings;
          dispatch(setTimeFilter("all"));
        } else {
          dispatch(setTimeFilter("7d"));
        }
      }
    } else if (currentTimeFilter === "7d") {
      timeFilteredListings = get7dListings();
      if (timeFilteredListings.length === 0) {
        timeFilteredListings = listings;
        dispatch(setTimeFilter("all"));
      }
    } else {
      timeFilteredListings = listings;
    }

    if (search === "") {
      timeFilteredListings?.sort(
        (a: any, b: any) => b.mpListingId - a.mpListingId
      );
      return timeFilteredListings.filter(
        (el: any) =>
          (`${currency}` === "" ||
            currency.split(",").map(Number).includes(el.currency)) &&
          (selectedCollections.length === 0 ||
            selectedCollections.some(
              (c) => c.contractId === el.collectionId
            )) &&
          el.price / 1e6 >= (min ? parseInt(min) : 0) &&
          el.price / 1e6 <= (max ? parseInt(max) : Number.MAX_SAFE_INTEGER)
      );
    } else {
      timeFilteredListings?.sort((a: any, b: any) => b.relevancy - a.relevancy);
      return timeFilteredListings?.filter(
        (el: any) =>
          (`${currency}` === "" ||
            currency.split(",").map(Number).includes(el.currency)) &&
          (selectedCollections.length === 0 ||
            selectedCollections.some(
              (c) => c.contractId === el.collectionId
            )) &&
          el.relevancy > 0 &&
          el.price / 1e6 >= (min ? parseInt(min) : 0) &&
          el.price / 1e6 <= (max ? parseInt(max) : Number.MAX_SAFE_INTEGER)
      );
    }
  }, [
    normalListings,
    search,
    min,
    max,
    currency,
    selectedCollections,
    timeFilter,
    dispatch,
  ]);

  const [viewMode, setViewMode] = useState<"grid" | "list" | "compact">("list");
  const [displayedItems, setDisplayedItems] = useState<NFTIndexerListingI[]>(
    []
  );

  console.log({ viewMode });

  console.log({ displayedItems });

  const [hasMore, setHasMore] = useState(true);
  const itemsPerLoad = 50;

  const handleTimeFilterChange = (
    event: SelectChangeEvent<"24h" | "7d" | "all">
  ) => {
    dispatch(setTimeFilter(event.target.value as "24h" | "7d" | "all"));
  };

  const handleViewChange = (
    event: React.MouseEvent<HTMLElement>,
    newView: "grid" | "list" | "compact" | null
  ) => {
    if (newView !== null) {
      setViewMode(newView);
    }
  };

  const renderSidebar = (
    <SidebarFilterRoot
      className={`${isDarkTheme ? "dark" : "light"} p-3 md:!block`}
    >
      <div className="flex flex-col gap-6">
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
                  d="M8.5 14.6667C8.5 15.9553 9.54467 17 10.8333 17H13C14.3807 17 15.5 15.8807 15.5 14.5C15.5 13.1193 14.3807 12 13 12H11C9.61929 12 8.5 10.8807 8.5 9.5C8.5 8.11929 9.61929 7 11 7H13.1667C14.4553 7 15.5 8.04467 15.5 9.33333M12 5.5V7M12 17V18.5M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
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
            <TokenSelect
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
            />
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
      </div>

      <div className="mt-auto pt-4">
        <Stack
          direction="row"
          sx={{
            justifyContent: "flex-start",
            width: "100%",
            gap: "12px",
            marginBottom: "12px",
          }}
        >
          <LayersIcon sx={{ color: isDarkTheme ? "white" : "black" }} />
          <SidebarLabel className={isDarkTheme ? "dark" : "light"}>
            Collections
          </SidebarLabel>
        </Stack>
        <Autocomplete
          multiple
          size="small"
          id="collection-filter"
          options={collections?.filter((c) => c.totalSupply > 0) ?? []}
          value={selectedCollections}
          onChange={(event, newValue: CollectionData[]) => {
            setSelectedCollections(newValue);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              placeholder="Filter by collection"
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": {
                  padding: "4px 8px",
                  "& fieldset": {
                    borderColor: isDarkTheme ? "#3b3b3b" : "#eaebf0",
                  },
                  "&:hover fieldset": {
                    borderColor: isDarkTheme ? "#4b4b4b" : "#d0d0d0",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: isDarkTheme ? "#4b4b4b" : "#93f",
                  },
                },
                "& .MuiInputBase-input": {
                  color: isDarkTheme ? "#fff" : "#000",
                  padding: "4px 8px",
                  fontSize: "0.875rem",
                },
                "& .MuiAutocomplete-endAdornment": {
                  top: "50%",
                  transform: "translateY(-50%)",
                },
              }}
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((collection, index) => (
              <Chip
                size="small"
                label={getCollectionName(collection)}
                {...getTagProps({ index })}
                sx={{
                  height: "20px",
                  fontSize: "0.75rem",
                  backgroundColor: isDarkTheme ? "#2b2b2b" : "#f5f5f5",
                  color: isDarkTheme ? "#fff" : "#000",
                  "& .MuiChip-deleteIcon": {
                    width: "16px",
                    height: "16px",
                    color: isDarkTheme ? "#fff" : "#000",
                  },
                }}
              />
            ))
          }
          getOptionLabel={(collection) => getCollectionName(collection)}
          isOptionEqualToValue={(option, value) =>
            option.contractId === value.contractId
          }
          filterSelectedOptions
          componentsProps={{
            popper: {
              placement: "top-start",
              style: { maxHeight: "200px" },
            },
          }}
        />
      </div>
    </SidebarFilterRoot>
  );

  const renderHeading = (
    <ListingHeading>
      <HeadingLeft>
        <Typography
          variant="body1"
          sx={{
            color: isDarkTheme ? "#fff" : "#000",
            fontSize: "0.875rem",
            wordWrap: "nowrap",
            paddingRight: "12px",
          }}
        >
          {filteredListings.length} Results
        </Typography>
      </HeadingLeft>
      <HeadingRight>
        <FormControl size="small">
          <StyledSelect
            value={timeFilter}
            onChange={handleTimeFilterChange}
            isDark={isDarkTheme}
            MenuProps={{
              PaperProps: {
                sx: {
                  bgcolor: isDarkTheme ? "#2b2b2b" : "#fff",
                  borderRadius: "8px",
                  boxShadow: isDarkTheme
                    ? "0 4px 12px rgba(0, 0, 0, 0.3)"
                    : "0 4px 12px rgba(0, 0, 0, 0.1)",
                  border: isDarkTheme
                    ? "1px solid #3b3b3b"
                    : "1px solid #eaebf0",
                  "& .MuiMenuItem-root": {
                    color: isDarkTheme ? "#fff" : "#000",
                    fontSize: "0.875rem",
                    padding: "8px 16px",
                    "&:hover": {
                      backgroundColor: isDarkTheme ? "#3b3b3b" : "#f5f5f5",
                    },
                    "&.Mui-selected": {
                      backgroundColor: isDarkTheme ? "#2b2b2b" : "#f0f0f0",
                      "&:hover": {
                        backgroundColor: isDarkTheme ? "#3b3b3b" : "#e5e5e5",
                      },
                    },
                  },
                },
              },
            }}
          >
            <StyledMenuItem value="24h" isDark={isDarkTheme}>
              Last 24 hours
            </StyledMenuItem>
            <StyledMenuItem value="7d" isDark={isDarkTheme}>
              Last 7 days
            </StyledMenuItem>
            <StyledMenuItem value="all" isDark={isDarkTheme}>
              All time
            </StyledMenuItem>
          </StyledSelect>
        </FormControl>

        <Box sx={{ width: "16px" }} />

        <StyledToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewChange}
          aria-label="view mode"
          size="small"
          theme={{ isDarkTheme }}
        >
          {/*<ToggleButton value="compact" aria-label="compact view">
            <GridView sx={{ transform: "scale(0.8)" }} />
          </ToggleButton>*/}
          <ToggleButton value="grid" aria-label="grid view">
            <GridView />
          </ToggleButton>
          <ToggleButton value="list" aria-label="list view">
            <List />
          </ToggleButton>
        </StyledToggleButtonGroup>
      </HeadingRight>
    </ListingHeading>
  );

  useEffect(() => {
    setDisplayedItems(filteredListings.slice(0, itemsPerLoad));
    setHasMore(filteredListings.length > itemsPerLoad);
  }, [filteredListings]);

  const fetchMoreData = () => {
    const currentLength = displayedItems.length;
    const nextItems = filteredListings.slice(
      currentLength,
      currentLength + itemsPerLoad
    );

    if (nextItems.length > 0) {
      setDisplayedItems((prev) => [...prev, ...nextItems]);
      setHasMore(currentLength + nextItems.length < filteredListings.length);
    } else {
      setHasMore(false);
    }
  };

  const isLoading = useMemo(
    () =>
      !listings ||
      !smartTokens ||
      listingsStatus !== "success" ||
      collectionsLoading,
    [listings, smartTokens, listingsStatus, collectionsLoading]
  );

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  if (isLoading) {
    return (
      <Layout>
        <ListingRoot className="!flex !flex-col lg:!flex-row !items-center md:!items-start">
          <div className="!hidden sm:!block">{renderSidebar}</div>
          <div className="sm:!hidden w-full">
            <DialogSearch>{renderSidebar}</DialogSearch>
          </div>
          <div className="w-full">
            {renderHeading}
            <div className="w-full h-[max(70vh,20rem)]  flex items-center justify-center">
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
            </div>
          </div>
        </ListingRoot>
      </Layout>
    );
  }
  return (
    <Layout>
      <ListingRoot className="!flex !flex-col lg:!flex-row !items-start">
        <div className="!hidden lg:!block !sticky !top-[88px] !h-[calc(100vh-88px)] !overflow-auto">
          {renderSidebar}
        </div>
        <div className="lg:!hidden w-full px-4 mb-4">
          <SearchInput className={isDarkTheme ? "dark" : "light"}>
            <SearchIcon
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <g clipPath="url(#clip0_1018_4041)">
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
              placeholder="Search listings..."
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
        </div>
        <ListingContainer viewMode={viewMode} className="!flex-1">
          {renderHeading}
          <InfiniteScroll
            dataLength={displayedItems.length}
            next={fetchMoreData}
            hasMore={hasMore}
            loader={
              <div className="w-full flex justify-center p-4">
                <GridLoader
                  size={30}
                  color={isDarkTheme ? "#fff" : "#000"}
                  className="!text-primary"
                />
              </div>
            }
            className={
              viewMode === "list"
                ? "flex flex-col gap-4 w-full"
                : viewMode === "compact"
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-3 md:gap-4"
                : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5"
            }
          >
            {displayedItems.map((el: NFTIndexerListingI) => {
              const pk = `${el.mpContractId}-${el.mpListingId}`;
              const listedToken = {
                ...el.token,
                metadataURI: stripTrailingZeroBytes(el.token.metadataURI),
              };
              return (
                <Grid2
                  key={pk}
                  className={`
                    ${viewMode === "list" ? "w-full" : ""}
                    ${viewMode === "compact" ? "!p-0" : ""}
                    transition-transform hover:scale-[1.02] duration-200
                  `}
                  sx={{
                    overflow: "hidden",
                  }}
                >
                  <CartNftCard
                    token={listedToken}
                    listing={el}
                    viewMode={viewMode}
                    onClick={() => {
                      navigate(
                        `/collection/${el.token.contractId}/token/${el.token.tokenId}`
                      );
                      window.scrollTo({
                        top: 0,
                        behavior: "smooth",
                      });
                    }}
                    showDrip={true}
                  />
                </Grid2>
              );
            })}
          </InfiniteScroll>
        </ListingContainer>
      </ListingRoot>
    </Layout>
  );
};

const DialogSearch = ({ children }: { children: ReactNode }) => {
  return (
    <Dialog>
      <DialogTrigger className="w-full">
        <div className="rounded p-2 border w-full">
          Search <SearchOutlined />
        </div>
      </DialogTrigger>
      <DialogContent>
        {/* <DialogHeader>
      <DialogTitle>Are you absolutely sure?</DialogTitle>
      <DialogDescription>
        This action cannot be undone. This will permanently delete your account
        and remove your data from our servers.
      </DialogDescription>
    </DialogHeader> */}
        {/* <DialogDescription> */}

        <div className="flex items-center mx-auto">{children}</div>
        {/* </DialogDescription> */}
      </DialogContent>
    </Dialog>
  );
};

const HeroSection = styled.div<{ isDark?: boolean }>`
  background: ${(props) => (props.isDark ? "#202020" : "#fff")};
  padding: 24px;
  border-bottom: 1px solid ${(props) => (props.isDark ? "#2b2b2b" : "#eaebf0")};
`;

const HeroContent = styled(Stack)`
  max-width: 1200px;
  margin: 0 auto;
`;

const StatsCard = styled(Paper)<{ isDark?: boolean }>`
  padding: 16px;
  text-align: center;
  background: ${(props) => (props.isDark ? "#2b2b2b" : "#fff")};
  border: 1px solid ${(props) => (props.isDark ? "#3b3b3b" : "#eaebf0")};
`;
