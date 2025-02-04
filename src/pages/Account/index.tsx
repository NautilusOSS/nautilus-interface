import React, { useContext, useEffect, useMemo } from "react";
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
import { ARC72_INDEXER_API } from "../../config/arc72-idx";
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

const formatter = Intl.NumberFormat("en", { notation: "compact" });

const { algodClient, indexerClient } = getAlgorandClients();

const ListingGrid = styled.div`
  display: grid;
  gap: 20px;
  margin-top: 48px;
  max-width: 1400px;
  width: 100%;
  position: relative;
  left: 50%;
  right: 50%;
  margin-left: -50vw;
  margin-right: -50vw;
  box-sizing: border-box;
  background: ${(props) => props.theme?.palette?.background?.default};

  // Mobile: 2 columns with minimal spacing
  grid-template-columns: repeat(1, 1fr);
  gap: 8px;
  padding: 0 16px;
  margin-top: 24px;

  // Small tablets: 3 columns
  @media (min-width: 600px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    padding: 0 24px;
    margin-top: 32px;
  }

  // Large tablets/small desktop: 4 columns
  @media (min-width: 960px) {
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    padding: 0 32px;
    margin-top: 48px;
  }

  // Large desktop: 5 columns
  @media (min-width: 1280px) {
    grid-template-columns: repeat(5, 1fr);
  }

  &::after {
    content: "";
    margin-left: auto;
    margin-right: auto;
    position: absolute;
    left: 0;
    right: 0;
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
`;

const CollectionHeader = styled(Stack)`
  padding: 16px;
  background: ${(props) =>
    alpha(props.theme?.palette?.background?.paper || "#fff", 0.9)};
  border-radius: 8px;
  margin-bottom: 16px;
  backdrop-filter: blur(8px);
  border: 1px solid
    ${(props) => alpha(props.theme?.palette?.divider || "#000", 0.1)};
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

const MobileActions = styled(Stack)`
  display: none;
  @media (max-width: 600px) {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 16px;
    background: ${(props) =>
      alpha(props.theme?.palette?.background?.paper || "#fff", 0.9)};
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(8px);
    border-top: 1px solid ${(props) => props.theme?.palette?.divider};
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

export const Account: React.FC = () => {
  const dispatch = useDispatch();

  const { data: smartTokens, status: smartTokensStatus } = useSmartTokens();

  /* Dex */
  const { data: prices, status: dexStatus } = usePrices();
  // const prices = useSelector((state: RootState) => state.dex.prices);
  // const dexStatus = useSelector((state: RootState) => state.dex.status);
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
  const [viewMode, setViewMode] = React.useState<
    "grid" | "list" | "collections"
  >("grid");

  /* Wallet */
  const { activeAccount, signTransactions } = useWallet();

  const resolver = useEnvoiResolver();

  const [loadingProfile, setLoadingProfile] = React.useState(false);
  const [name, setName] = React.useState<string | null>("");
  const [profile, setProfile] = React.useState<any>(null);
  useEffect(() => {
    if (id) {
      resolver.http.getNameFromAddress(id).then((res) => {
        if (!!res) {
          setName(res);
          resolver.http.search(res).then((res) => {
            if (res.length === 1) {
              setProfile(res[0]);
            }
            setLoadingProfile(false);
          });
        } else {
          setName(compactAddress(id));
          setLoadingProfile(false);
        }
      });
    }
  }, [id]);

  console.log({ profile });

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
          ...listing.token,
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
        } = await axios.get(`${ARC72_INDEXER_API}/nft-indexer/v1/collections`);
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
          data: { tokens: res },
        } = await axios.get(`${ARC72_INDEXER_API}/nft-indexer/v1/tokens`, {
          params: {
            owner: idArr,
          },
        });
        const nfts = [];
        for (const t of res) {
          // Skip NFTs with collection ID
          // 797610 (enVoi Reverse Registrar)
          // 846601 (enVoi Collection Registrar)
          // 876578 (enVoi Staking Registrar)
          if ([846601, 797610, 876578].includes(t.contractId)) continue;

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
  // useEffect(() => {
  //   if ((selected.length = 0)) return;
  //   const nft: Token = nfts[selected];
  //   //const royalties = decodeRoyalties(nft.metadata.royalties);
  //   setNft({
  //     ...nft,
  //     //royalties,
  //   });
  // }, [nfts, selected]);

  const handleListAuction = async (price: string, currency: string) => {};

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
      const selectedNfts = selected.map((i) => nfts[i]);

      const priceBigInts = prices.map((price) => {
        const priceBn = new BigNumber(price).multipliedBy(
          new BigNumber(10).pow(token.decimals)
        );
        return BigInt(priceBn.toFixed(0));
      });

      const paymentTokenId = 0;

      const buildN: any[][] = [];

      const paymentToken =
        token.contractId === TOKEN_WVOI ? { ...token, symbol: "VOI" } : token;

      for (let i = 0; i < selectedNfts.length; i++) {
        const nft = selectedNfts[i];
        const metadata = JSON.parse(nft.metadata);
        const royalties = decodeRoyalties(metadata.royalties);

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
          priceBigInts[i].toString(),
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

      let progress = 0;

      const chunkSize = 4;
      for (let i = 0; i < buildN.length; i += chunkSize) {
        const extraTxns = buildN.slice(i, i + chunkSize).flat();

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
        const res = await algodClient
          .sendRawTransaction(stxns as Uint8Array[])
          .do();

        setProgress(++progress);
      }
      toast.success("Listed successfully!");
    } catch (e: any) {
      console.log(e);
      toast.error(e.message);
    } finally {
      setIsListing(false);
    }
  };

  const handleListSale = async (
    price: string,
    currency: string,
    token: TokenType
  ) => {
    if (!activeAccount || !nft) return;
    try {
      setIsListing(true);
      const { algodClient, indexerClient } = getAlgorandClients();
      // nft

      const priceBn = new BigNumber(price).multipliedBy(
        new BigNumber(10).pow(token.decimals)
      );
      const priceBi = BigInt(priceBn.toFixed(0));

      const paymentTokenId =
        token.contractId === 0 ? Number(token.tokenId) : token.contractId;

      const buildN: any[][] = [];

      for (const skipEnsure of [false, true]) {
        const customR = await mp.list(
          activeAccount.address,
          {
            ...nft,
            tokenId: BigInt(nft.tokenId),
            contractId: Number(nft.contractId),
          },
          priceBi.toString(),
          currency,
          {
            algodClient,
            indexerClient,
            paymentTokenId,
            wrappedNetworkTokenId: TOKEN_WVOI,
            extraTxns: [],
            enforceRoyalties: [nautilusVoiStaking].includes(
              nft?.listing?.collectionId || 0
            )
              ? false
              : true,
            mpContractId: CTCINFO_MP206,
            listingBoxPaymentOverride: ListingBoxCost,
            listingsToDelete: nft.listing ? [nft.listing] : [],
            skipEnsure,
          }
        );
        if (customR.success) {
          buildN.push(customR.objs);
          break;
        }
      }

      if (!buildN.length) throw new Error("no transactions to simulate");

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
      ci.setExtraTxns(buildN.flat());
      const customR = await ci.custom();

      if (!customR.success) {
        throw new Error("failed in simulate");
      }

      const stxns = await signTransactions(
        customR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );

      const res = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();

      // ---------------------------------------
      // QUEST HERE
      // list nft for sale
      // ---------------------------------------
      // do {
      //   const address = activeAccount.address;
      //   const actions: string[] = [
      //     QUEST_ACTION.SALE_LIST_ONCE,
      //     QUEST_ACTION.TIMED_SALE_LIST_1MINUTE,
      //     QUEST_ACTION.TIMED_SALE_LIST_15MINUTES,
      //     QUEST_ACTION.TIMED_SALE_LIST_1HOUR,
      //   ];
      //   const {
      //     data: { results },
      //   } = await getActions(address);
      //   for (const action of actions) {
      //     const address = activeAccount.address;
      //     const key = `${action}:${address}`;
      //     const completedAction = results.find((el: any) => el.key === key);
      //     if (!completedAction) {
      //       await submitAction(action, address, {
      //         contractId: nft.contractId,
      //         tokenId: nft.tokenId,
      //       });
      //     }
      //     // TODO notify quest completion here
      //   }
      // } while (0);
      // ---------------------------------------

      toast.success("Listing successful"); // show success message

      // ------------------------------------------
    } catch (e: any) {
      toast.error(e.message); // show error message
    } finally {
      setIsListing(false); // reset loading state
      setOpenListSale(false); // close modal
      setSelected([]); // reset selected
    }
  };

  const handleDeleteListing = async (listingId: number) => {
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
      const selectedNfts = selected.map((index) => nfts[index]);
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
          const nft = nfts[selectedIndex];
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

        console.log(customR);

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
            } = await axios.get(`${ARC72_INDEXER_API}/nft-indexer/v1/tokens`, {
              params: { owner: idArr },
            });
            const updatedNfts = [];
            for (const t of res) {
              if ([846601, 797610, 876578].includes(t.contractId)) continue;
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

  const handleUnlistAll = async () => {
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
      const nftsToUnlist = selected2.map((i) => ({
        ...filteredListings[i],
      }));

      const buildN = [];
      for (const nft of nftsToUnlist) {
        const mpListingId = nft.mpListingId || nft.listing.mpListingId;
        buildN.push({
          ...(await builder.mp.a_sale_deleteListing(mpListingId)).obj,
          note: new TextEncoder().encode(
            `a_sale_deleteListing listId: ${mpListingId}`
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

  // Add new memo for grouped collections
  const filteredNfts = useMemo(() => {
    if (!nfts) return [];
    return forSaleOnly ? nfts.filter((nft) => nft.listing) : nfts;
  }, [nfts, forSaleOnly]);

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
        } = await axios.get(`${ARC72_INDEXER_API}/nft-indexer/v1/tokens`, {
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

  const handleBatchAction = () => {
    if (!selected.length) return;

    // Show options based on selection count
    const options = [];

    if (selected.length <= 4) {
      options.push({
        label: "List for Sale",
        icon: <StorefrontIcon />,
        action: () => setOpenListBatch(true),
      });
    }

    options.push({
      label: "Transfer",
      icon: <SendIcon />,
      action: () => setOpenTransferBatch(true),
    });

    // If only one NFT is selected and it's a staking NFT, show staking options
    if (
      selected.length === 1 &&
      nfts[selected[0]].contractId === TOKEN_NAUT_VOI_STAKING
    ) {
      options.push(
        {
          label: "Withdraw Block Rewards",
          action: handleWithdrawStaking,
        },
        {
          label: "Burn Staking NFT",
          action: handleBurnStaking,
        }
      );
    }

    // For now, just show the first available action
    // You could expand this to show a menu of options
    if (options.length > 0) {
      options[0].action();
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
            <Grid item xs={4} sm={4}>
              <StatsCard elevation={0} isDark={isDarkTheme}>
                <Typography variant="h4" color="primary">
                  {formatter.format(filteredNfts?.length || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Items
                </Typography>
              </StatsCard>
            </Grid>
            <Grid item xs={4} sm={4}>
              <StatsCard elevation={0} isDark={isDarkTheme}>
                <Typography variant="h4" color="primary">
                  {formatter.format(groupedCollections?.length || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Collections
                </Typography>
              </StatsCard>
            </Grid>
            <Grid item xs={4} sm={4}>
              <StatsCard elevation={0} isDark={isDarkTheme}>
                <Typography variant="h4" color="primary">
                  {formatter.format(listedNfts?.length || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Listed
                </Typography>
              </StatsCard>
            </Grid>
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
              "& .MuiButtonGroup-root": {
                width: isMobile ? "100%" : "auto",
                "& .MuiButton-root": {
                  flex: isMobile ? 1 : "initial",
                },
              },
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
              <ToggleButtonGroup
                fullWidth={isMobile}
                color="primary"
                value={forSaleOnly}
                exclusive
                onChange={(_, value) => {
                  if (value !== null) {
                    setForSaleOnly(value);
                  }
                }}
                aria-label="for sale filter"
              >
                <ToggleButton value={false}>All</ToggleButton>
                <ToggleButton value={true}>For Sale</ToggleButton>
              </ToggleButtonGroup>

              <ToggleButtonGroup
                fullWidth={isMobile}
                color="primary"
                value={viewMode}
                exclusive
                onChange={(_, newMode) => {
                  if (newMode !== null) {
                    setViewMode(newMode);
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
              </ToggleButtonGroup>
            </Stack>
          </Stack>

          <Stack spacing={2} direction="row" sx={{ mt: 2, mb: 2 }}>
            {selected.length === 0 &&
            nfts.filter((t: MListedNFTTokenI) => !t.listing).length > 0 ? (
              <>
                <Button
                  onClick={() => {
                    setSelected(
                      nfts
                        .filter((t: MListedNFTTokenI) => !t.listing)
                        .map((_, i) => i)
                    );
                  }}
                >
                  Select All
                </Button>
              </>
            ) : null}

            {selected.length > 0 && (
              <>
                <Button onClick={() => {}} color="warning" variant="text">
                  {selected.length} Selected
                </Button>
                <ButtonGroup color="warning" variant="outlined">
                  {selected.length === 1 && (
                    <Button
                      onClick={() => {
                        navigate(
                          `/collection/${nfts[selected[0]].contractId}/token/${
                            nfts[selected[0]].tokenId
                          }`
                        );
                      }}
                    >
                      View
                    </Button>
                  )}
                  {idArr.includes(activeAccount?.address || "") && (
                    <>
                      {selected.length <= 4 && (
                        <Button
                          onClick={() => setOpenListBatch(true)}
                          startIcon={<StorefrontIcon />}
                        >
                          List
                        </Button>
                      )}
                      <Button
                        onClick={() => setOpenTransferBatch(true)}
                        startIcon={<SendIcon />}
                      >
                        Transfer
                      </Button>
                      {selected.length === 1 &&
                      nfts[selected[0]].contractId ===
                        TOKEN_NAUT_VOI_STAKING ? (
                        <Button onClick={handleWithdrawStaking}>
                          Withdraw Block Rewards
                        </Button>
                      ) : null}
                      {selected.length === 1 &&
                      nfts[selected[0]].contractId ===
                        TOKEN_NAUT_VOI_STAKING ? (
                        <Button onClick={handleBurnStaking}>
                          Burn Staking NFT{` `}
                          <Tooltip
                            title={
                              <div>
                                Burn staking NFT to regain ownership of the
                                staking contract.
                              </div>
                            }
                          >
                            <InfoIcon />
                          </Tooltip>
                        </Button>
                      ) : null}
                    </>
                  )}

                  <Button
                    onClick={() => {
                      setSelected([]);
                    }}
                  >
                    Clear
                  </Button>
                </ButtonGroup>
              </>
            )}
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
                : filteredNfts?.map((nft: any, index: number) => {
                    // Find the collection info for this NFT
                    const collection = collections?.find(
                      (c: any) => c.contractId === nft.contractId
                    );

                    return (
                      <CartNftCard
                        viewMode={isMobile ? "list" : "grid"}
                        key={`${nft.contractId}-${nft.tokenId}`}
                        selected={selected.includes(index)}
                        token={nft}
                        listing={nft.listing}
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
                      />
                    );
                  })}
            </ListingGrid>
          ) : (
            <Box>
              {groupedCollections.map((collection: any) => (
                <Box key={collection.contractId} sx={{ width: "100%", mb: 4 }}>
                  <CollectionHeader>
                    <Button
                      fullWidth
                      onClick={() =>
                        handleCollectionToggle(collection.contractId)
                      }
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
                    <Box
                      sx={{
                        display: "grid",
                        gap: "20px",
                        mt: 2,
                        gridTemplateColumns: {
                          xs: "1fr", // Mobile: 1 column
                          sm: "repeat(2, 1fr)", // Tablet: 2 columns
                          md: "repeat(3, 1fr)", // Desktop: 3 columns
                          lg: "repeat(4, 1fr)", // Large Desktop: 4 columns
                        },
                        px: { xs: 2, sm: 4 }, // Add padding on sides
                        maxWidth: "1400px", // Max width for large screens
                        width: "100vw", // Take full viewport width
                        position: "relative", // For positioning
                        left: "50%", // Center the grid
                        right: "50%", // Center the grid
                        mx: "-50vw", // Negative margin to offset the centering
                        boxSizing: "border-box", // Include padding in width calculation
                        backgroundColor: "transparent", // Changed to transparent
                        py: 4, // Add vertical padding
                        "&::after": {
                          // Pseudo-element for centering
                          content: '""',
                          ml: "auto",
                          mr: "auto",
                          position: "absolute",
                          left: 0,
                          right: 0,
                        },
                      }}
                    >
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
                            token={nft}
                            listing={nft.listing}
                            collectionName={collection.name}
                            onClick={() => {
                              if (selected.includes(globalIndex)) {
                                setSelected(
                                  selected.filter((x) => x !== globalIndex)
                                );
                              } else {
                                setSelected(
                                  Array.from(
                                    new Set([...selected, globalIndex])
                                  )
                                );
                              }
                            }}
                            isMobile={isMobile}
                          />
                        );
                      })}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </div>

        {(selected.length > 0 || selected2.length > 0) && !isMobile && (
          <FloatingActionBar>
            <Typography variant="body1" color="text.secondary">
              {selected.length || selected2.length} Selected
            </Typography>

            {selected.length > 0 && (
              <ButtonGroup color="warning" variant="contained" size="small">
                {selected.length === 1 && (
                  <Button
                    onClick={() => {
                      navigate(
                        `/collection/${nfts[selected[0]].contractId}/token/${
                          nfts[selected[0]].tokenId
                        }`
                      );
                    }}
                    startIcon={<VisibilityIcon />}
                  >
                    View
                  </Button>
                )}
                {idArr.includes(activeAccount?.address || "") && (
                  <>
                    {selected.length <= 4 && (
                      <Button
                        onClick={() => setOpenListBatch(true)}
                        startIcon={<StorefrontIcon />}
                      >
                        List
                      </Button>
                    )}
                    <Button
                      onClick={() => setOpenTransferBatch(true)}
                      startIcon={<SendIcon />}
                    >
                      Transfer
                    </Button>
                  </>
                )}
              </ButtonGroup>
            )}
          </FloatingActionBar>
        )}

        {(selected.length > 0 || selected2.length > 0) && isMobile && (
          <MobileActions>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {selected.length || selected2.length} Selected
            </Typography>

            <Stack direction="row" spacing={1}>
              {selected.length === 1 && (
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => {
                    navigate(
                      `/collection/${nfts[selected[0]].contractId}/token/${
                        nfts[selected[0]].tokenId
                      }`
                    );
                  }}
                  startIcon={<VisibilityIcon />}
                >
                  View
                </Button>
              )}

              {idArr.includes(activeAccount?.address || "") && (
                <>
                  {selected.length <= 4 && (
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => setOpenListBatch(true)}
                      startIcon={<StorefrontIcon />}
                    >
                      List
                    </Button>
                  )}
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => setOpenTransferBatch(true)}
                    startIcon={<SendIcon />}
                  >
                    Transfer
                  </Button>
                </>
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
                nfts={nfts.filter((_, i) => selected.includes(i))}
                title="Transfer NFT"
                loading={isTransferring}
                open={openTransferBatch}
                handleClose={() => setOpenTransferBatch(false)}
                onSave={handleTransfer}
                fullScreen={isMobile}
              />
            ) : null}
            {nft ? (
              <ListSaleModal
                title="List NFT for Sale"
                loading={isListing}
                open={openListSale}
                handleClose={() => setOpenListSale(false)}
                onSave={handleListSale}
                nft={nft}
                fullScreen={isMobile}
              />
            ) : null}
            {selected?.length && openListBatch ? (
              <ListBatchModal
                action="list-sale"
                title="List NFT for Sale"
                loading={isListing}
                open={openListBatch}
                handleClose={() => setOpenListBatch(false)}
                onSave={handleListBatch}
                nfts={nfts.filter((_, i) => selected.includes(i))}
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

        {/*filteredNfts?.length === 0 && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <Typography variant="h6">No NFTs Found</Typography>
            <Typography color="text.secondary">
              {forSaleOnly
                ? "You don't have any NFTs listed for sale"
                : "This wallet doesn't have any NFTs yet"}
            </Typography>
          </Box>
        )}*/}

        {/* <FilterBar direction="row" spacing={2} alignItems="center">
          <TextField
            placeholder="Search by name or trait"
            size="small"
            InputProps={{
              startAdornment: <SearchIcon color="action" />,
            }}
          />
          <FormControl size="small">
            <Select value={sortBy} onChange={handleSort}>
              <MenuItem value="recent">Recently Added</MenuItem>
              <MenuItem value="price-asc">Price: Low to High</MenuItem>
              <MenuItem value="price-desc">Price: High to Low</MenuItem>
              <MenuItem value="rarity">Rarity Score</MenuItem>
            </Select>
          </FormControl>
        </FilterBar>*/}

        {/*selected.length > 0 && (
          <SelectionCounter>
            <Typography>{selected.length} selected</Typography>
            <ButtonGroup size="small">
              <Button onClick={handleBatchAction}>Action</Button>
              <Button onClick={() => setSelected([])}>Clear</Button>
            </ButtonGroup>
          </SelectionCounter>
        )*/}

        {selected.length > 0 && (
          <MobileActions direction="row" spacing={1}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<StorefrontIcon />}
            >
              List ({selected.length})
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setSelected([])}
            >
              Clear
            </Button>
          </MobileActions>
        )}
      </Layout>
    </>
  );
};
