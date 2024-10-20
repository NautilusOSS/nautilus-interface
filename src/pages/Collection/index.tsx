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
  padding-top: 16px;
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

export const Collection: React.FC = () => {
  /* Theme */

  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  /* Router */

  const { id } = useParams();

  const navigate = useNavigate();

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

  /* NFT Navigator Listings */
  // const [listings, setListings] = React.useState<any>([]);
  // React.useEffect(() => {
  //   try {
  //     const res = axios
  //       .get(`${ARC72_INDEXER_API}/nft-indexer/v1/mp/listings`, {
  //         params: {
  //           active: true,
  //           collectionId: id,
  //         },
  //       })
  //       .then(({ data }) => {
  //         setListings(data.listings);
  //       });
  //   } catch (e) {
  //     console.log(e);
  //   }
  // }, []);

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
          (`${currency}` === "" ||
            currency.split(",").map(Number).includes(el.currency)) &&
          (`${collection}` === "" ||
            `${collection}` === `${el.collectionId}`) &&
          el.relevancy > 0 &&
          el.price / 1e6 >= (min ? parseInt(min) : 0) &&
          el.price / 1e6 <= (max ? parseInt(max) : Number.MAX_SAFE_INTEGER)
      );
    }
  }, [sortedListings, search, min, max, currency, collection]);

  const [viewMode, setViewMode] = React.useState<"grid" | "list">(
    id === "421076" ? "list" : "grid"
  );

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

  const displayCollectionName = useMemo(() => {
    if (collectionInfo?.project?.title) return collectionInfo?.project?.title;
    if (collectionNfts.length === 0) return "";
    return JSON.parse(collectionNfts[0]?.metadata)?.name?.replace(
      /[0-9]*$/,
      ""
    );
  }, [collectionInfo, collectionNfts]);

  const { activeAccount } = useWallet();

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
            <BannerTitle>{displayCollectionName}</BannerTitle>
          </BannerTitleContainer>
        </BannerContainer>
        <ListingRoot className="!flex !flex-col lg:!flex-row !items-center md:!items-start">
          {viewMode !== "list" ? (
            <div className="!hidden sm:!block">
              <Stack gap={5} sx={{ mt: 3 }}>
                {accounts.length > 0 && id === "421076" ? (
                  <Button
                    size="large"
                    variant="outlined"
                    color="primary"
                    onClick={() => {
                      setIsMintModalVisible(true);
                    }}
                  >
                    Mint
                  </Button>
                ) : null}

                {renderSidebar}
              </Stack>
            </div>
          ) : null}
          <div className="sm:!hidden w-full">
            <DialogSearch>{renderSidebar}</DialogSearch>
          </div>
          <ListingContainer>
            {id === "421076" ? (
              <Stack direction="row" spacing={2} sx={{ justifyContent: "end" }}>
                <ToggleButtonGroup
                  color="primary"
                  value={viewMode}
                  exclusive
                  onChange={() => {
                    setViewMode(viewMode === "list" ? "grid" : "list");
                  }}
                  aria-label="Platform"
                >
                  <ToggleButton value="list">
                    <ViewListIcon />
                  </ToggleButton>
                  <ToggleButton value="grid">
                    <GridViewIcon />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Stack>
            ) : null}
            {viewMode === "list" ? (
              <NFTListingTable
                listings={filteredListings}
                tokens={filteredListings.map((el: any) => el.token)}
                collections={collections}
                columns={["timestamp", "price", "discount"]}
              />
            ) : null}
            {viewMode === "grid" ? (
              <div className="items-center flex flex-col sm:grid md:grid-cols-2 lg:grid-cols-3 sm:w-fit gap-4 sm:gap-2 md:gap-3">
                {filteredListings
                  .slice(0, showing)
                  .map((el: NFTIndexerListingI) => {
                    const pk = `${el.mpContractId}-${el.mpListingId}`;
                    const listedToken = {
                      ...el.token,
                      metadataURI: stripTrailingZeroBytes(el.token.metadataURI),
                    };
                    return (
                      <Grid2 key={pk}>
                        <CartNftCard
                          token={listedToken}
                          listing={el}
                          onClick={() => {
                            navigate(
                              `/collection/${el.token.contractId}/token/${el.token.tokenId}`
                            );
                          }}
                        />
                      </Grid2>
                    );
                  })}
                {showing < sortedListings.length && (
                  <Grid2>
                    <div
                      onClick={() => setShowing(showing + 50)}
                      className={`${
                        isDarkTheme ? "button-dark" : "button-light"
                      } cursor-pointer`}
                    >
                      <Button
                        className={
                          isDarkTheme ? "button-text-dark" : "button-text-light"
                        }
                      >
                        View More
                      </Button>
                    </div>
                  </Grid2>
                )}
              </div>
            ) : null}
          </ListingContainer>
        </ListingRoot>
      </Layout>
      {false && (
        <Layout>
          {!isLoading ? (
            <div>
              <BannerContainer
                style={{
                  backgroundImage: `url(${displayCoverImage})`,
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                }}
              >
                <BannerTitleContainer>
                  <BannerTitle>{displayCollectionName}</BannerTitle>
                </BannerTitleContainer>
              </BannerContainer>
              <Stack direction="row" spacing={2} sx={{ justifyContent: "end" }}>
                <ToggleButtonGroup
                  color="primary"
                  value={viewMode}
                  exclusive
                  onChange={() => {
                    setViewMode(viewMode === "list" ? "grid" : "list");
                  }}
                  aria-label="Platform"
                >
                  <ToggleButton value="list">
                    <ViewListIcon />
                  </ToggleButton>
                  <ToggleButton value="grid">
                    <GridViewIcon />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              <Grid container spacing={2}>
                {/*<Grid
              item
              sx={{ display: { xs: "none", sm: "block" } }}
              xs={12}
              sm={12}
            >
              &nbsp;
            </Grid>
            */}
                <Grid item xs={12} sm={12}>
                  <Stack sx={{ mt: 5 }} gap={2}>
                    <StatContainer
                      sx={{
                        //display: { xs: "none", md: "flex" },
                        flexDirection: { xs: "column", md: "row" },
                        overflow: "hidden",
                        justifyContent: "flex-end",
                        gap: "40px",
                      }}
                    >
                      {[
                        /*
                    {
                      name: "Total NFTs",
                      displayValue: nfts.length,
                      value: nfts.length,
                    },
                    {
                      name: "Listed",
                      displayValue:
                        ((listings.length / nfts.length) * 100).toFixed(2) +
                        "%",
                      value: listings.length,
                    },
                    {
                      name: "Sales",
                      displayValue: collectionSales.length,
                      value: collectionSales.length,
                    },
                    {
                      name: "Volume",
                      displayValue:
                        formatter.format(stats?.volume) +
                        ` ${stats?.scoreUnit || "VOI"}`,
                      value: stats?.volume,
                    },

                    {
                      name: "Floor Price",
                      displayValue: `${formatter.format(stats?.floorPrice)} ${
                        stats?.scoreUnit || "VOI"
                      }`,
                      value: stats?.floorPrice,
                    },
                    {
                      name: "Avg. Sale",
                      displayValue:
                        formatter.format(
                          stats?.volume / collectionSales.length
                        ) + ` ${stats?.scoreUnit || "VOI"}`,
                      value:
                        stats?.volume > 0 && collectionSales.length > 0
                          ? stats?.volume / collectionSales.length
                          : 0,
                    },
                    */
                      ].map((el, i) =>
                        el.value > 0 ? (
                          <Stack
                            sx={{
                              flexShrink: 0,
                            }}
                            key={i}
                          >
                            <Typography sx={{ color: "#717579" }} variant="h6">
                              {el.name}
                            </Typography>
                            <Typography
                              variant="h4"
                              className={isDarkTheme ? "dark" : "light"}
                            >
                              {el.displayValue}
                            </Typography>
                          </Stack>
                        ) : null
                      )}
                    </StatContainer>

                    <Stack
                      direction="row"
                      spacing={2}
                      sx={{ justifyContent: "end" }}
                    >
                      <ToggleButtonGroup
                        color="primary"
                        value={viewMode}
                        exclusive
                        onChange={() => {
                          setViewMode(viewMode === "list" ? "grid" : "list");
                        }}
                        aria-label="Platform"
                      >
                        <ToggleButton value="list">
                          <ViewListIcon />
                        </ToggleButton>
                        <ToggleButton value="grid">
                          <GridViewIcon />
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Stack>
                    {viewMode === "list" ? (
                      <NFTListingTable
                        listings={normalListings}
                        tokens={nfts}
                        collections={collections}
                      />
                    ) : null}
                    {viewMode === "grid" ? (
                      sortedListings?.length > 0 ? (
                        <>
                          <Grid2 container spacing={2}>
                            {sortedListings?.map((el: NFTIndexerListingI) => {
                              return (
                                <Grid2 key={el.transactionId}>
                                  <CartNftCard
                                    token={{
                                      ...el.token,
                                      metadataURI: stripTrailingZeroBytes(
                                        el.token.metadataURI
                                      ),
                                    }}
                                    listing={el}
                                    onClick={() => {
                                      navigate(
                                        `/collection/${el.collectionId}/token/${el.tokenId}`
                                      );
                                    }}
                                  />
                                </Grid2>
                              );
                            })}
                          </Grid2>
                        </>
                      ) : (
                        <Box sx={{ mt: 5 }}>
                          <Typography variant="body2">
                            No NFTs found in this collection
                          </Typography>
                        </Box>
                      )
                    ) : null}
                  </Stack>
                </Grid>
              </Grid>
            </div>
          ) : (
            <Container maxWidth="lg">
              <Stack sx={{ mt: 5 }} gap={2}>
                <Skeleton variant="text" width={280} height={50} />
                <Grid container spacing={2}>
                  {[1, 2, 3, 4, 5, 6].map((el) => (
                    <Grid item xs={6} sm={4} md={3} lg={2}>
                      <Skeleton
                        variant="rectangular"
                        width="100%"
                        height={200}
                      />
                    </Grid>
                  ))}
                </Grid>
                <Skeleton variant="text" width={280} height={50} />
                <Skeleton variant="text" width={180} height={50} />
                <Skeleton variant="text" width={180} height={50} />
              </Stack>
            </Container>
          )}
        </Layout>
      )}
      {id === "421076" ? (
        <MintModal
          collectionId={Number(id)}
          title="Mint Nautilus Voi Staking NFT"
          handleClose={() => {
            setIsMintModalVisible(false);
          }}
          open={isMintModalVisible}
          accounts={accounts}
          buttonText="Mint"
        />
      ) : null}
    </>
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
