import React, { useEffect, useMemo } from "react";
import styled from "styled-components";
import {
  Avatar,
  Badge,
  Box,
  Chip,
  Fade,
  Stack,
  SxProps,
  Theme,
  Tooltip,
} from "@mui/material";
import { stringToColorCode } from "../../utils/string";
import VoiIcon from "../../static/crypto-icons/voi/0.svg";
import ViaIcon from "../../static/crypto-icons/voi/6779767.svg";
import {
  ListedToken,
  ListingTokenI,
  NFTIndexerListingI,
  NFTIndexerTokenI,
  TokenType,
} from "../../types";
import { useNavigate } from "react-router-dom";
import BuySaleModal, { multiplier } from "../modals/BuySaleModal";
import { toast } from "react-toastify";
import algosdk from "algosdk";
import { getAlgorandClients } from "../../wallets";
import { CONTRACT, abi, mp, swap } from "ulujs";
import { BigNumber } from "bignumber.js";
import { QUEST_ACTION, getActions, submitAction } from "../../config/quest";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import { uluClient } from "../../utils/contract";
import { zeroAddress } from "../../contants/accounts";
import { TOKEN_WVOI } from "../../contants/tokens";
import { useSelector } from "react-redux";
import { useWallet } from "@txnlab/use-wallet-react";
import { HIGHFORGE_CDN } from "@/config/arc72-idx";
import { RootState } from "../../store/store";
import { fetchTokenInfo } from "@/utils/dex";
import { decodeRoyalties } from "@/utils/hf";
import { useNFTDrips } from "@/hooks/useNFTDrips";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import DiamondIcon from "@mui/icons-material/Diamond";
import { useName } from "@/hooks/useName";
import PersonIcon from "@mui/icons-material/Person";

const formatter = Intl.NumberFormat("en", { notation: "compact" });

const CollectionName = styled.div<{ isDark?: boolean; inList?: boolean }>`
  color: ${(props) => (props.isDark ? "#fff" : "#161717")};
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: Inter;
  font-size: ${(props) => (props.inList ? "16px" : "20px")};
  font-style: normal;
  font-weight: 800;
  line-height: ${(props) => (props.inList ? "22px" : "24px")};
`;

const CollectionVolume = styled.div<{ isDark?: boolean; inList?: boolean }>`
  color: ${(props) => (props.isDark ? "#fff" : "#161717")};
  font-family: Inter;
  font-size: ${(props) => (props.inList ? "14px" : "16px")};
  font-style: normal;
  font-weight: 600;
  line-height: 140%;
`;

const NFTCardWrapper = styled.div`
  align-items: center;
  background: linear-gradient(
    180deg,
    rgb(245, 211, 19) 0%,
    rgb(55, 19, 18) 100%
  );
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: all 0.1s ease;
  overflow: visible;
  cursor: pointer;
  &:hover {
    transform: scale(1.05);
  }
  & .image {
    align-self: stretch;
    position: relative;
    width: 100%;
    height: 200px;
  }

  & .NFT-info {
    -webkit-backdrop-filter: blur(200px) brightness(100%);
    align-items: flex-start;
    align-self: stretch;
    backdrop-filter: blur(200px) brightness(100%);
    /*background-color: #20202066;*/
    border-radius: 0px 0px 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    //height: 176px;
    padding: 20px 30px 25px;
    position: relative;
    width: 100%;
    height: 150px;
  }

  & .frame {
    align-items: center;
    align-self: stretch;
    display: flex;
    flex: 0 0 auto;
    gap: 25px;
    position: relative;
    width: 100%;
  }

  & .artist-avatar-name-wrapper {
    align-items: center;
    display: flex;
    flex: 1;
    flex-grow: 1;
    gap: 10px;
    justify-content: space-around;
    position: relative;
  }

  & .artist-avatar-name {
    align-items: center;
    display: flex;
    flex: 1;
    flex-grow: 1;
    gap: 10px;
    position: relative;
  }

  & .avatar-instance {
    background-image: url(./avatar.svg) !important;
    height: 24px !important;
    position: relative !important;
    width: 24px !important;
  }

  & .text-wrapper {
    color: white;
    flex: 1;
    position: relative;
    font-family: Inter;
    font-size: 16px;
    font-weight: 500;
    line-height: 22px;
    letter-spacing: 0em;
    text-align: left;
  }

  & .highest-bid {
    align-items: center;
    display: flex;
    flex: 1;
    flex-grow: 1;
    gap: 16px;
    justify-content: flex-end;
    position: relative;
  }

  & .div {
    align-items: center;
    background-color: #ffffff33;
    border-radius: 100px;
    display: inline-flex;
    flex: 0 0 auto;
    gap: 10px;
    justify-content: flex-end;
    padding: 6px;
    position: relative;
  }

  & .icon-instance-node {
    height: 24px !important;
    position: relative !important;
    width: 24px !important;
  }

  & .artst-info {
    align-items: flex-start;
    align-self: stretch;
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    gap: 5px;
    position: relative;
    width: 100%;
  }

  & .text-wrapper-2 {
    align-self: stretch;
    color: white;
    line-height: 24px;
    margin-top: -1px;
    position: relative;
    font-family: Inter, Helvetica;
    font-size: 20px;
    font-weight: 800;
    line-height: 24px;
    letter-spacing: 0em;
    text-align: left;
  }

  & .additional-info {
    align-items: flex-end;
    align-self: stretch;
    display: flex;
    flex: 0 0 auto;
    justify-content: flex-end;
    position: relative;
    width: 100%;
  }

  & .price {
    align-items: flex-start;
    display: flex;
    flex: 1;
    flex-direction: column;
    flex-grow: 1;
    gap: 8px;
    padding: 0px 21px 0px 0px;
    position: relative;
  }

  & .text-wrapper-3 {
    align-self: stretch;
    color: #ffffff;
    font-family: Inter, Helvetica;
    margin-top: -1px;
    position: relative;
    font-family: Inter;
    font-size: 14px;
    font-weight: 400;
    line-height: 15px;
    letter-spacing: 0em;
    text-align: left;
  }

  & .text-wrapper-4 {
    display: flex;
    align-items: center;
    gap: 5px;
    align-self: stretch;
    color: white;
    position: relative;
    font-family: monospace;
    font-size: 18px;
    font-weight: 700;
    line-height: 20px;
    letter-spacing: 0em;
    text-align: left;
  }
`;

// Add this styled component for list view
const ListViewWrapper = styled.div<{ isDark?: boolean }>`
  display: flex;
  width: 100%;
  padding: 12px 16px;
  gap: 16px;
  border-radius: 12px;
  background: ${(props) => (props.isDark ? "#202020" : "#fff")};
  border: 1px solid ${(props) => (props.isDark ? "#2b2b2b" : "#eaebf0")};
  cursor: pointer;
  transition: all 0.1s ease;
  margin: 2px;
  position: relative;

  &:hover {
    transform: scale(1.01);
    z-index: 1;
    box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.1);
  }

  .list-image {
    width: 64px;
    height: 64px;
    border-radius: 10px;
    object-fit: cover;
  }

  .list-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .list-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  ${(props) =>
    props.isDark &&
    `
    color: #fff;
    
    .chip {
      background: #2b2b2b;
      color: #fff;
    }
  `}
`;

// Add this styled component near the other styled components
const DripBadge = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: help;

  img {
    width: 24px;
    height: 24px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  }
`;

// Add this new component for the tooltip content
const DripTooltipContent = styled.div`
  padding: 8px;

  .drip-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .drip-amount {
    font-family: monospace;
    font-weight: 600;
  }
`;

// Add this SVG component near the top of the file
const DripIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 21C16.4183 21 20 17.4183 20 13C20 8.58172 12 2 12 2C12 2 4 8.58172 4 13C4 17.4183 7.58172 21 12 21Z"
      fill="#00A3FF"
      stroke="#FFFFFF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const getRarityColor = (rarity: string) => {
  switch (rarity.toLowerCase()) {
    case "legendary":
      return "linear-gradient(135deg, #FFD700, #FFA500)"; // Gold gradient
    case "epic":
      return "linear-gradient(135deg, #9400D3, #4B0082)"; // Purple gradient
    case "rare":
      return "linear-gradient(135deg, #0096FF, #0044FF)"; // Blue gradient
    case "uncommon":
      return "linear-gradient(135deg, #50C878, #228B22)"; // Green gradient
    default: // Common
      return "linear-gradient(135deg, #808080, #404040)"; // Gray gradient
  }
};

// Update the RarityBadge styled component
const RarityBadge = styled.div<{ rarity: string }>`
  position: absolute;
  bottom: 16px;
  right: 12px;
  padding: 8px 16px;
  padding-left: 12px;
  padding-right: 12px;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  background: ${(props) => getRarityColor(props.rarity)};
  z-index: 2;
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  transition: all 0.2s ease-in-out;
  white-space: nowrap;
  overflow: hidden;
  max-width: 85px;
  z-index: 999;
  &:hover {
    max-width: 240px;
    transform: scale(1.05);
  }

  .rank {
    font-size: 18px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-right: 6px;
    .gem-icon {
      font-size: 24px;
      opacity: 0.9;
    }
  }

  .label {
    opacity: 0.9;
    margin-right: 6px;
    font-size: 16px;
  }
`;

// Update the PriceTag styled component
const PriceTag = styled.div<{ isDark?: boolean }>`
  position: absolute;
  top: 16px;
  left: 12px;
  padding: 8px 16px;
  padding-left: 12px;
  padding-right: 12px;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #2b2b2b, #1a1a1a);
  z-index: 999;
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  transition: all 0.2s ease-in-out;
  white-space: nowrap;
  overflow: hidden;
  max-width: 85px;

  &:hover {
    max-width: 240px;
    transform: scale(1.05);
  }

  .chip {
    background: rgba(255, 255, 255, 0.9);
    color: #161717;
    border: none;
    font-weight: 500;
    height: 20px;
    font-size: 0.75rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  span {
    font-size: 16px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 6px;
  }
`;

// Add this styled component near the other styled components
const OwnershipBadge = styled.div<{ showDrip?: boolean; isDark?: boolean }>`
  position: absolute;
  top: ${(props) => (props.showDrip ? "52px" : "16px")};
  right: 12px;
  padding: 8px;
  border-radius: 50%;
  background: ${(props) => (props.isDark ? "#2b2b2b" : "#fff")};
  color: ${(props) => (props.isDark ? "#fff" : "#161717")};
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 999;
  transition: all 0.2s ease-in-out;

  &:hover {
    transform: scale(1.1);
  }

  svg {
    font-size: 20px;
  }
`;

// Update the OwnerText component to include the icon
const OwnerText = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;

  .person-icon {
    font-size: 16px;
    opacity: 0.8;
  }
`;

// Add this styled component near the other styled components
const CompactViewWrapper = styled.div<{ isDark?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 8px;
  background: ${(props) => (props.isDark ? "#202020" : "#fff")};
  border: 1px solid ${(props) => (props.isDark ? "#2b2b2b" : "#eaebf0")};
  cursor: pointer;
  transition: all 0.1s ease;
  width: 100%;
  position: relative;

  &:hover {
    transform: scale(1.01);
    z-index: 1;
    box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.1);
  }

  .compact-image {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    object-fit: cover;
  }

  .compact-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .compact-name {
    font-size: 14px;
    font-weight: 600;
    color: ${(props) => (props.isDark ? "#fff" : "#161717")};
  }

  .compact-price {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: ${(props) => (props.isDark ? "rgba(255,255,255,0.7)" : "#666")};

    span {
      font-family: monospace;
      font-weight: 600;
    }
  }

  .compact-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 8px;

    img {
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        transform: scale(1.1);
      }
    }
  }
`;

// Add this styled component near the other styled components
const HighestOfferBadge = styled.div<{ isDark?: boolean }>`
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 8px 16px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #2b2b2b80, #1a1a1a80);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  z-index: 999;
  transition: all 0.2s ease-in-out;
  white-space: nowrap;
  overflow: hidden;
  max-width: 120px;

  &:hover {
    max-width: 240px;
    transform: scale(1.05);
  }

  .offer-icon {
    font-size: 18px;
    opacity: 0.9;
  }

  span {
    font-family: monospace;
    font-weight: 700;
  }
`;

interface NFTCardProps {
  token: ListingTokenI | NFTIndexerTokenI;
  listing?: NFTIndexerListingI;
  offers?: any[];
  onClick?: () => void;
  selected?: boolean;
  size?: "small" | "medium" | "large";
  imageOnly?: boolean;
  viewMode?: "grid" | "list" | "compact";
  sx?: SxProps<Theme>;
  hideOverlay?: boolean;
  rarity?: any;
  showDrip?: boolean;
  isOwned?: boolean;
}

const CartNftCard: React.FC<NFTCardProps> = ({
  imageOnly = false,
  size = "medium",
  token,
  listing,
  offers,
  onClick,
  selected,
  viewMode = "grid",
  sx,
  hideOverlay = false,
  rarity,
  showDrip = false,
  isOwned = false,
}) => {
  const { drips, loading, error } = useNFTDrips();
  const { activeAccount, signTransactions } = useWallet();

  const { fetchName } = useName();

  const metadata = JSON.parse(token.metadata || "{}");

  const [display, setDisplay] = React.useState(true);

  const [isBuying, setIsBuying] = React.useState(false);
  const [openBuyModal, setOpenBuyModal] = React.useState(false);

  const smartTokens = useSelector((state: any) => state.smartTokens.tokens);

  const currency = smartTokens.find(
    (token: any) => `${token.contractId}` === `${listing?.currency}`
  );

  const currencyDecimals =
    currency?.decimals === 0 ? 0 : currency?.decimals || 6;

  const currencySymbol =
    currency?.tokenId === "0" ? "VOI" : currency?.symbol || "VOI";

  const priceBn = new BigNumber(listing?.price || 0).div(
    new BigNumber(10).pow(currencyDecimals)
  );

  const price =
    priceBn.toNumber() === 0 ? "0" : formatter.format(priceBn.toNumber());

  const priceNormal = useMemo(() => {
    if (!listing?.price) return "0";
    const normalPrice = new BigNumber(listing.price).div(
      new BigNumber(10).pow(currencyDecimals)
    );
    return formatter.format(normalPrice.toNumber());
  }, [listing?.price, currencyDecimals]);

  const [resolvedName, setResolvedName] = React.useState<string | null>(null);

  // Add this helper function for IndexedDB operations
  const initDB = async () => {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("envoiNamesDB", 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("names")) {
          db.createObjectStore("names", { keyPath: "tokenId" });
        }
      };
    });
  };

  // Update the useEffect hook
  useEffect(() => {
    const resolveEnVoiName = async () => {
      if (metadata.name?.toLowerCase().includes("envoi name")) {
        try {
          const db = await initDB();

          // Check IndexedDB first
          const cachedData = await new Promise((resolve, reject) => {
            const transaction = db.transaction("names", "readonly");
            const store = transaction.objectStore("names");
            const request = store.get(token.tokenId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });

          if (cachedData) {
            const { name, timestamp } = cachedData as {
              name: string;
              timestamp: number;
            };
            // Check if cache is still valid (less than 24 hours old)
            if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
              setResolvedName(name);
              return;
            }
          }

          // If no valid cache, fetch from API
          const response = await fetch(
            `https://api.envoi.sh/api/token/${token.tokenId}`
          );
          const data = await response.json();

          if (data.results?.[0]?.name) {
            // Cache the result with timestamp in IndexedDB
            const transaction = db.transaction("names", "readwrite");
            const store = transaction.objectStore("names");
            store.put({
              tokenId: token.tokenId,
              name: data.results[0].name,
              timestamp: Date.now(),
            });

            setResolvedName(data.results[0].name);
          }
        } catch (error) {
          console.error("Failed to resolve enVoi name:", error);
        }
      }
    };
    resolveEnVoiName();
  }, [token.tokenId, metadata.name]);

  const [ownerName, setOwnerName] = React.useState<string | null>(null);

  useEffect(() => {
    const resolveOwnerName = async () => {
      if (token.owner) {
        try {
          const db = await initDB();

          // Check IndexedDB first
          const cachedData = await new Promise((resolve, reject) => {
            const transaction = db.transaction("names", "readonly");
            const store = transaction.objectStore("names");
            const request = store.get(token.owner);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });

          if (cachedData) {
            const { name, timestamp } = cachedData as {
              name: string;
              timestamp: number;
            };
            // Check if cache is still valid (less than 24 hours old)
            if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
              setOwnerName(name);
              return;
            }
          }

          // If no valid cache, fetch from API
          const name = await fetchName(token.owner);
          if (name) {
            // Cache the result with timestamp in IndexedDB
            const transaction = db.transaction("names", "readwrite");
            const store = transaction.objectStore("names");
            store.put({
              tokenId: token.owner, // Using owner address as key
              name: name,
              timestamp: Date.now(),
            });

            setOwnerName(name);
          }
        } catch (error) {
          console.error("Failed to resolve owner's enVoi name:", error);
        }
      }
    };
    resolveOwnerName();
  }, [token.owner]);

  const displayName = useMemo(() => {
    if (resolvedName) return resolvedName;
    if (metadata.name?.includes(".voi")) return metadata.name;
    if ((metadata.name || "").match(/[0-9]/)) return metadata.name;
    return `${metadata.name} #${token.tokenId}`;
  }, [metadata.name, token.tokenId, resolvedName]);

  const handleBuyButtonClick = async () => {
    try {
      if (!activeAccount) {
        toast.info("Please connect wallet!");
        return;
      }
      const { algodClient, indexerClient } = getAlgorandClients();

      const ci = new CONTRACT(
        listing?.mpContractId || 0,
        algodClient,
        indexerClient,
        {
          name: "",
          desc: "",
          methods: [
            //v_sale_listingByIndex(uint256)(uint64,uint256,address,(byte,byte[40]),uint64,uint64,uint64,uint64,uint64,uint64,address,address,address)
            {
              name: "v_sale_listingByIndex",
              args: [
                {
                  type: "uint256",
                },
              ],
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
        listing?.mpListingId || 0
      );
      if (!v_sale_listingByIndexR.success) {
        throw new Error("Failed to get listing");
      }
      const v_sale_listingByIndex = v_sale_listingByIndexR.returnValue;
      if (v_sale_listingByIndex[1] === BigInt(0)) {
        throw new Error("Listing no longer available");
      }
      switch (listing?.currency || 0) {
        /*
        // VOI
        case 0: {
          const accountInfo = await algodClient
            .accountInformation(activeAccount.address)
            .do();
          const { amount, ["min-balance"]: minBalance } = accountInfo;
          const availableBalance = amount - minBalance;
          if (availableBalance < el.price) {
            throw new Error(
              `Insufficient balance! (${(
                (availableBalance - el.price) /
                1e6
              ).toLocaleString()} VOI)`
            );
          }
          break;
        }
        // VIA
        case 6779767: {
          const ci = new arc200(el.currency, algodClient, indexerClient);
          const arc200_balanceOfR = await ci.arc200_balanceOf(
            activeAccount.address
          );
          if (!arc200_balanceOfR.success) {
            throw new Error("Failed to check balance");
          }
          const arc200_balanceOf = arc200_balanceOfR.returnValue;
          if (arc200_balanceOf < el.price) {
            throw new Error(
              `Insufficient balance! (${(
                (Number(arc200_balanceOf) - el.price) /
                1e6
              ).toLocaleString()}) VIA`
            );
          }
          break;
        }
        */
        default: {
          //throw new Error("Unsupported currency!");
        }
      }
      setOpenBuyModal(true);
    } catch (e: any) {
      console.log(e);
      toast.info(e.message);
    }
  };

  const handleCartIconClick = async (
    pool: any,
    discount: any,
    simulationResults: any
  ) => {
    try {
      if (!activeAccount || !listing) {
        toast.info("Please connect wallet!");
        return;
      }
      const doWithdraw = listing.currency === 0;
      setIsBuying(true);

      const { algodClient, indexerClient } = getAlgorandClients();

      const defaultPaymentToken = {
        contractId: 390001,
        name: "Wrapped Voi",
        symbol: "wVOI",
        decimals: 6,
        tokenId: "0",
      };

      let customR;
      for (const skipEnsure of [true, false]) {
        if (pool) {
          const {
            contractId: poolId,
            tokAId,
            tokBId,
            poolBalA,
            poolBalB,
          } = pool;
          const tokA = await fetchTokenInfo(tokAId);
          const tokB = await fetchTokenInfo(tokBId);
          const inToken = tokA?.tokenId === "0" ? tokB : tokA;
          const outToken = tokA?.tokenId !== "0" ? tokB : tokA;
          const amount = new BigNumber(
            simulationResults[inToken?.contractId || 0]?.outputAmount
          )
            .dividedBy(new BigNumber(10).pow(inToken?.decimals || 0))
            .toString();
          const A = {
            ...inToken,
            amount,
          };
          const B = {
            ...outToken,
          };
          // figure out how much to swap
          const swapR: any = await new swap(
            poolId,
            algodClient,
            indexerClient
          ).swap(activeAccount.address, poolId, A, B, [], {
            doWithdraw,
          }); // withdraws by default
          if (!swapR.success) throw new Error("swap failed");
          customR = await mp.buy(
            activeAccount.address,
            listing,
            defaultPaymentToken,
            {
              paymentTokenId:
                listing.currency === 0 ? TOKEN_WVOI : listing.currency,
              wrappedNetworkTokenId: TOKEN_WVOI,
              extraTxns: swapR.objs,
              algodClient,
              indexerClient,
              skipEnsure,
              strategy: "default",
            }
          );
        } else {
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
            }
          );
        }
        if (customR.success) break;
      }
      if (!customR.success) throw new Error("custom failed at end"); // abort
      // -------------------------------------
      // SIGM HERE
      // -------------------------------------
      const stxn = await signTransactions(
        customR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );
      await algodClient.sendRawTransaction(stxn as Uint8Array[]).do();
      // -------------------------------------
      // QUEST HERE buy
      // -------------------------------------
      // do {
      //   const address = activeAccount.address;
      //   const actions: string[] = [QUEST_ACTION.SALE_BUY_ONCE];
      //   const {
      //     data: { results },
      //   } = await getActions(address);
      //   for (const action of actions) {
      //     const address = activeAccount.address;
      //     const key = `${action}:${address}`;
      //     const completedAction = results.find((el: any) => el.key === key);
      //     if (!completedAction) {
      //       const { collectionId: contractId, tokenId } = listing;
      //       await submitAction(action, address, {
      //         contractId,
      //         tokenId,
      //       });
      //     }
      //     // TODO notify quest completion here
      //   }
      // } while (0);
      // -------------------------------------
      toast.success("Purchase successful!");
    } catch (e: any) {
      console.log(e);
      toast.error(e.message);
    } finally {
      setIsBuying(false);
      setOpenBuyModal(false);
    }
  };
  const collectionsMissingImage = [35720076, 797609];

  const url = metadata.image?.startsWith("https://ipfs.io/ipfs/")
    ? metadata.image
    : metadata.image?.startsWith("ipfs://")
    ? `https://ipfs.io/ipfs/${metadata.image.split("ipfs://")[1]}`
    : !collectionsMissingImage?.includes(Number(token.contractId))
    ? `${HIGHFORGE_CDN}/i/${encodeURIComponent(token.metadataURI)}?w=400`
    : metadata.image;

  console.log({ metadata, url });

  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  // Update the getRarity helper function
  const getRarity = useMemo(() => {
    if (rarity?.rank) {
      // Define rarity tiers based on rank
      if (rarity.rank === 1)
        return { label: "Legendary", rank: rarity.rank, show: true };
      if (rarity.rank <= 9)
        return { label: "Epic", rank: rarity.rank, show: true };
      if (rarity.rank <= 25)
        return { label: "Rare", rank: rarity.rank, show: true };
      if (rarity.rank <= 99)
        return { label: "Uncommon", rank: rarity.rank, show: true };
      return { label: "Common", rank: rarity.rank, show: true };
    }

    // Check metadata.attributes array first
    const rarityAttribute = metadata.attributes?.find(
      (attr: any) => attr.trait_type?.toLowerCase() === "rarity"
    );

    return {
      label: metadata.rarity || rarityAttribute?.value || "Common",
      rank: null,
      show: !!(metadata.rarity || rarityAttribute?.value),
    };
  }, [metadata, rarity]);

  const getDrips = useMemo(() => {
    const drip = drips.filter(
      (drip) => Number(drip.collectionId) === Number(token.contractId)
    );
    return drip;
  }, [drips, token.contractId]);

  // Add this helper function to get highest offer
  const getHighestOffer = useMemo(() => {
    if (!offers || offers.length === 0) return null;

    const highestOffer = offers.reduce((max, offer) => {
      const offerAmount = new BigNumber(offer.price || 0).div(
        new BigNumber(10).pow(currencyDecimals)
      );
      const maxAmount = new BigNumber(max.price || 0).div(
        new BigNumber(10).pow(currencyDecimals)
      );

      return offerAmount.gt(maxAmount) ? offer : max;
    }, offers[0]);

    return {
      amount: new BigNumber(highestOffer.price).div(
        new BigNumber(10).pow(currencyDecimals)
      ),
      currency: highestOffer.currency,
    };
  }, [offers, currencyDecimals]);

  // Add this debug log right before the render
  // console.log("Rarity:", getRarity, rarity);

  if (
    displayName.indexOf("undefined") !== -1 ||
    displayName === "enVoi name .voi"
  )
    return null;

  // Add this before the return statement
  if (viewMode === "compact") {
    return (
      <>
        <CompactViewWrapper isDark={isDarkTheme} onClick={onClick} sx={sx}>
          <img className="compact-image" src={url} alt={displayName} />
          <div className="compact-content">
            <div className="compact-name">{displayName}</div>
            {listing?.price && Number(listing.price) > 0 && (
              <div className="compact-price">
                <span>
                  {`${priceNormal || price} ${
                    priceNormal ? "VOI" : currencySymbol
                  }`}
                </span>
                {priceNormal && currencySymbol !== "VOI" && (
                  <Chip
                    className="chip"
                    size="small"
                    sx={{
                      background: isDarkTheme ? "#2b2b2b" : "#fff",
                      color: isDarkTheme ? "#fff" : "#161717",
                      border: isDarkTheme ? "none" : "1px solid #eaebf0",
                      height: "16px",
                      fontSize: "10px",
                      padding: "0 4px",
                    }}
                    label={`${price} ${currencySymbol}`}
                  />
                )}
              </div>
            )}
          </div>
          {listing?.price && Number(listing.price) > 0 && (
            <div className="compact-actions">
              <img
                height="24"
                width="24"
                src="/static/icon-cart.png"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleBuyButtonClick();
                }}
              />
            </div>
          )}
        </CompactViewWrapper>
        {activeAccount && openBuyModal && listing ? (
          <BuySaleModal
            token={token}
            listing={listing}
            seller={listing.seller}
            open={openBuyModal}
            loading={isBuying}
            handleClose={() => setOpenBuyModal(false)}
            onSave={handleCartIconClick}
            title="Buy NFT"
            buttonText="Buy"
            image={metadata.image}
            price={price}
            priceNormal={priceNormal || ""}
            priceAU={listing.price.toString()}
            currency={currencySymbol}
            paymentTokenId={listing.currency}
          />
        ) : null}
      </>
    );
  }

  // Add list view condition here
  if (viewMode === "list") {
    return (
      <>
        <ListViewWrapper isDark={isDarkTheme} onClick={onClick} sx={sx}>
          <img className="list-image" src={url} alt={displayName} />
          <div className="list-content">
            <div className="list-header">
              <CollectionName isDark={isDarkTheme} inList>
                {displayName}
              </CollectionName>
              {listing?.price && Number(listing.price) > 0 && (
                <div className="list-actions">
                  <img
                    height="24"
                    width="24"
                    src="/static/icon-cart.png"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleBuyButtonClick();
                    }}
                  />
                </div>
              )}
            </div>
            <div className="list-footer">
              {listing?.price && Number(listing.price) > 0 && (
                <CollectionVolume isDark={isDarkTheme} inList>
                  <Stack direction="row" gap={1} alignItems="center">
                    <span>
                      {`${priceNormal || price} ${
                        priceNormal ? "VOI" : currencySymbol
                      }`}
                    </span>
                    {priceNormal && currencySymbol !== "VOI" && (
                      <Chip
                        className="chip"
                        size="small"
                        label={`${price} ${currencySymbol}`}
                      />
                    )}
                  </Stack>
                </CollectionVolume>
              )}
            </div>
          </div>
        </ListViewWrapper>
        {activeAccount && openBuyModal && listing ? (
          <BuySaleModal
            token={token}
            listing={listing}
            seller={listing.seller}
            open={openBuyModal}
            loading={isBuying}
            handleClose={() => setOpenBuyModal(false)}
            onSave={handleCartIconClick}
            title="Buy NFT"
            buttonText="Buy"
            image={metadata.image}
            price={price}
            priceNormal={priceNormal || ""}
            priceAU={listing.price.toString()}
            currency={currencySymbol}
            paymentTokenId={listing.currency}
          />
        ) : null}
      </>
    );
  }

  // Grid view (default)
  return display ? (
    <>
      <Box
        sx={{
          border: `4px solid ${selected ? "green" : "transparent"}`,
          borderRadius: "25px",
          position: "relative",
          overflow: "visible",
          width: size === "medium" ? "305px" : "100%",
          ...sx,
        }}
      >
        {rarity ? (
          <RarityBadge rarity={getRarity.label}>
            <span className="rank">
              <DiamondIcon className="gem-icon" />
              {padRarityRank(getRarity.rank)}
            </span>
            <span className="label">{getRarity.label}</span>
          </RarityBadge>
        ) : null}
        {listing?.price && Number(listing.price) > 0 && (
          <PriceTag isDark={isDarkTheme}>
            <span>
              {`${priceNormal || price} ${
                priceNormal ? "VOI" : currencySymbol
              }`}
            </span>
            {priceNormal && currencySymbol !== "VOI" && (
              <Chip
                className="chip"
                size="small"
                label={`${price} ${currencySymbol}`}
              />
            )}
          </PriceTag>
        )}
        {isOwned && (
          <Tooltip title="You own this NFT" arrow placement="right">
            <OwnershipBadge
              showDrip={showDrip && getDrips.length > 0}
              isDark={isDarkTheme}
            >
              <AccountBalanceWalletIcon />
            </OwnershipBadge>
          </Tooltip>
        )}
        {showDrip && getDrips.length > 0 && (
          <Tooltip
            title={
              <DripTooltipContent>
                {getDrips.map((drip, index) => (
                  <div key={index} className="drip-item">
                    <span className="drip-amount">
                      {formatter.format(drip.dripAmount)}
                    </span>
                    <span>{drip.symbol}/wk</span>
                  </div>
                ))}
              </DripTooltipContent>
            }
            arrow
            placement="right"
          >
            <DripBadge>
              <DripIcon />
            </DripBadge>
          </Tooltip>
        )}
        {getHighestOffer && (
          <HighestOfferBadge isDark={isDarkTheme}>
            <CurrencyExchangeIcon className="offer-icon" />
            <span>
              {formatter.format(getHighestOffer.amount.toNumber())}{" "}
              {currencySymbol}
            </span>
          </HighestOfferBadge>
        )}
        <Box
          style={{
            cursor: "pointer",
            width: size === "medium" ? "305px" : "100%",
            height: size === "medium" ? "305px" : "100%",
            flexShrink: 0,
            borderRadius: "20px",
            backgroundSize: "cover",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
          onClick={onClick}
        >
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url(${url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              zIndex: 0,
            }}
          />
          {!hideOverlay && (
            <>
              <Box
                sx={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "90px",
                  background: `linear-gradient(to top,
                    rgba(0, 0, 0, 0.7) 0%,
                    rgba(0, 0, 0, 0.4) 50%,
                    rgba(0, 0, 0, 0) 100%)`,
                  //backdropFilter: "blur(2px)",
                  zIndex: 1,
                }}
              />
              {!imageOnly && (
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: "#fff",
                    width: "90%",
                    height: "52px",
                    marginBottom: "27px",
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  <Stack gap={1}>
                    <CollectionName isDark={true}>{displayName}</CollectionName>
                    <OwnerText>
                      <PersonIcon className="person-icon" />
                      {ownerName}
                    </OwnerText>
                  </Stack>
                </Stack>
              )}
            </>
          )}
        </Box>
      </Box>
      {activeAccount && openBuyModal && listing ? (
        <BuySaleModal
          token={token}
          listing={listing}
          seller={listing.seller}
          open={openBuyModal}
          loading={isBuying}
          handleClose={() => setOpenBuyModal(false)}
          onSave={handleCartIconClick}
          title="Buy NFT"
          buttonText="Buy"
          image={metadata.image}
          price={price}
          priceNormal={priceNormal || ""}
          priceAU={listing.price.toString()}
          currency={currencySymbol}
          paymentTokenId={listing.currency}
        />
      ) : null}
    </>
  ) : null;
};

// Add this helper function near the top of the file
const padRarityRank = (rank: number) => {
  return rank.toString().padStart(3, "0");
};

export default CartNftCard;
