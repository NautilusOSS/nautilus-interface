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
  Tabs,
  Tab,
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
import MintModal from "@/components/modals/MintModal";
import { stakingRewards } from "@/static/staking/staking";
import LayersIcon from "@mui/icons-material/Layers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SearchOutlined } from "@mui/icons-material";
import { useDebounceCallback } from "usehooks-ts";
import CollectionSelect from "@/components/CollectionSelect";
import DiamondIcon from "@mui/icons-material/Diamond";
import { useMarketplaceListings } from "@/hooks/mp";
import TollIcon from "@mui/icons-material/Toll";
import NorthEastIcon from "@mui/icons-material/NorthEast";
import PositionContainer from "./components/PositionContainer";
import MarketContainer from "./components/MarketContainer";
import { styled as mStyled } from "@mui/material/styles";
import MintContainer from "./components/MintContainer";

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
  margin-top: 44px;
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
  /*
  padding-top: 16px;
*/
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
  /* font-size: 48px; */
  font-style: normal;
  font-weight: 700;
  line-height: 40px; /* 83.333% */
  letter-spacing: 0.5px;
  &.dark {
    color: #fff;
  }
  &.light {
    color: #93f;
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
  display: flex;
  align-items: flex-start;
  align-content: flex-start;
  gap: 20px var(--Main-System-20px, 20px);
  flex-wrap: wrap;
  margin-top: 48px;
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
  overflow: hidden;
  border-radius: 16px;
  background-size: cover;
  padding-bottom: 50px;
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

const BannerTitle = styled.h1`
  flex: 1 0 0;
  color: #fff;
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: Nohemi;
  font-size: 40px;
  font-style: normal;
  font-weight: 700;
  line-height: 100%; /* 40px */
`;

const StyledLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const formatter = Intl.NumberFormat("en", { notation: "compact" });

const StyledTabs = styled(Tabs)<{ $isDarkTheme: boolean }>`
  .MuiTab-root {
    color: ${props => props.$isDarkTheme ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'};
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

export const Staking: React.FC = () => {
  /* Theme */

  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  /* Router */

  const id = "421076";

  const dispatch = useDispatch();

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
      axios
        .get(`${HIGHFORGE_API}/projects/info/${id}`)
        .then((res: any) => res.data)
        .then(setCollectionInfo);
    } catch (e) {
      console.log(e);
    }
  }, [id]);

  console.log("collectionInfo", collectionInfo);

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

  const displayCollectionName = useMemo(() => {
    if (collectionInfo?.project?.title) return collectionInfo?.project?.title;
    if (collectionNfts.length === 0) return "";
    return JSON.parse(collectionNfts[0]?.metadata)?.name?.replace(
      /[0-9]*$/,
      ""
    );
  }, [collectionInfo, collectionNfts]);

  const { activeAccount } = useWallet();

  const [selectedTab, setSelectedTab] = useState(0);
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };
  return (
    <>
      <Layout>
        <BannerContainer
          style={{
            backgroundImage: `url(${displayCoverImage})`,
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        >
          <BannerTitleContainer>
            <BannerTitle>Nautilus Voi Staking</BannerTitle>
          </BannerTitleContainer>
        </BannerContainer>

        <StyledTabs 
          value={selectedTab} 
          onChange={handleTabChange}
          $isDarkTheme={isDarkTheme}
        >
          <Tab label="Market" />
          <Tab label="Positions" />
          {/*<Tab label="Mint" />*/}
        </StyledTabs>

        {selectedTab === 0 && (
          <div style={{ marginTop: "20px" }}>
            <MarketContainer />
          </div>
        )}
        {selectedTab === 1 && (
          <div style={{ marginTop: "20px" }}>
            <PositionContainer />
          </div>
        )}
        {/*selectedTab === 2 && (
          <div style={{ marginTop: "20px" }}>
            <MintContainer />
          </div>
        )*/}
      </Layout>
    </>
  );
};
