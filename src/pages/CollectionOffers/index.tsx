import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Chip,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { styled, alpha, useTheme } from "@mui/material/styles";
import {
  Search,
  FilterList,
  Refresh,
  TrendingUp,
  TrendingDown,
  Close as CloseIcon,
  ExpandMore,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { useWallet } from "@txnlab/use-wallet-react";
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

import { RootState } from "../../store/store";
import { useCollectionInfo } from "../../hooks/useCollectionInfo";
import { useName } from "../../hooks/useName";
import { formatAmount } from "../../utils/format";
import { shortenAddress } from "../../utils/string";
import ConnectWallet from "../../components/ConnectWallet";
import CryptoIconPlaceholder from "../../components/CryptoIconPlaceholder";
import { TOKEN_WVOI } from "../../contants/tokens";
import { MIMIR_API } from "../../config/arc72-idx";
import axios from "axios";
import { getAlgorandClients } from "@/wallets";
import { abi, CONTRACT } from "ulujs";
import algosdk, { waitForConfirmation } from "algosdk";
import VoiPurchaseWidget from "@/components/VoiPurchaseWidget";
import InstaSellModal from "./InstaSellModal";

export const MP210CTCINFO = 41700380;

export const decodeMpCurrencyData = (currencyData: any) => {
  const ct = currencyData[0];
  const currency = ct == "00" ? 0 : parseInt(currencyData[1], 16);
  const price =
    ct == "00" ? Number(currencyData[1]) : parseInt(currencyData[2], 16);
  return { currency, price };
};

export const getListingEvent = (event: any[]) => {
  // Parse listing event data
  const { currency, price } = decodeMpCurrencyData(event[6]);
  return {
    transactionId: event[0],
    createRound: Number(event[1]),
    createTimestamp: Number(event[2]),
    listingId: Number(event[3]),
    contractId: Number(event[4]),
    offerer: event[5],
    price,
    currency,
  };
};

export const getDeleteEvent = (event: any) => {
  // Parse delete event data
  return {
    transactionId: event[0],
    createRound: Number(event[1]),
    createTimestamp: Number(event[2]),
    listingId: Number(event[3]),
  };
};

export const getAcceptEvent = (event: any) => {
  // Parse accept event data
  return {
    transactionId: event[0],
    createRound: Number(event[1]),
    createTimestamp: Number(event[2]),
    listingId: Number(event[3]),
    tokenId: Number(event[4]),
  };
};

export const collectionOfferABI = {
  name: "mp210",
  desc: "mp210",
  methods: [
    // a_collection_offer_listSC(uint64,uint64,uint256)uint256
    {
      name: "a_collection_offer_listSC",
      args: [
        { type: "uint64", name: "contractId" },
        { type: "uint64", name: "tokenId" },
        { type: "uint256", name: "price" },
      ],
      returns: {
        type: "uint256",
      },
    },
    // a_collection_offer_acceptSC(uint256,uint256)void
    {
      name: "a_collection_offer_acceptSC",
      args: [
        {
          type: "uint256",
          name: "listingId",
        },
        {
          type: "uint256",
          name: "tokenId",
        },
      ],
      returns: {
        type: "void",
      },
    },
    // a_collection_offer_deleteListing(uint256)void
    {
      name: "a_collection_offer_deleteListing",
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
  events: [
    // ListEvent: [UInt256, Contract, UInt256, Address, Price], // ListId, CollectionId, TokenId, ListAddr, ListPrice
    // AcceptEvent: [UInt256], // ListId
    // DeleteListingEvent: [UInt256], // ListId
    {
      name: "e_collection_offer_ListEvent",
      args: [
        {
          type: "uint256",
          name: "listingId",
        },
        {
          type: "uint64",
          name: "contractId",
        },
        {
          type: "address",
          name: "listAddr",
        },
        {
          type: "(byte,byte[40])",
          name: "listPrice",
        },
      ],
    },
    {
      name: "e_collection_offer_AcceptEvent",
      args: [
        {
          type: "uint256",
          name: "listingId",
        },
        {
          type: "uint256",
          name: "tokenId",
        },
      ],
    },
    {
      name: "e_collection_offer_DeleteListingEvent",
      args: [
        {
          type: "uint256",
          name: "listingId",
        },
      ],
    },
  ],
};

// Styled components from Auction page
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

const TokenImage = styled("img")`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s ease;
  border-radius: 20px;
`;

const ImagePlaceholder = styled(Box)<{ $isDark?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: ${(props) => (props.$isDark ? "#666" : "#999")};
  font-size: 2rem;
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
  background: ${(props) =>
    props.$isDark
      ? "linear-gradient(135deg, #2196f3 0%, #1976d2 100%)"
      : "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)"};
  color: white;
  border-radius: 16px;
  padding: 12px 24px;
  font-weight: 600;
  font-size: 1rem;
  text-transform: none;
  box-shadow: ${(props) =>
    props.$isDark
      ? "0 4px 12px rgba(33, 150, 243, 0.3)"
      : "0 4px 12px rgba(25, 118, 210, 0.3)"};
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${(props) =>
      props.$isDark
        ? "0 6px 16px rgba(33, 150, 243, 0.4)"
        : "0 6px 16px rgba(25, 118, 210, 0.4)"};
  }

  &:disabled {
    background: ${(props) =>
      props.$isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
    color: ${(props) => (props.$isDark ? "#666" : "#999")};
    transform: none;
    box-shadow: none;
  }
`;

const PageContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: "1200px",
  margin: "0 auto",
}));

const HeaderSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: theme.spacing(2),
}));

const StatsCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(2),
  background: alpha(theme.palette.primary.main, 0.05),
  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
}));

const OfferCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(1),
  "&:hover": {
    backgroundColor: alpha(theme.palette.action.hover, 0.05),
  },
}));

const FilterSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  display: "flex",
  gap: theme.spacing(2),
  alignItems: "center",
  flexWrap: "wrap",
}));

const ChartContainer = styled(Box)<{ $isDark?: boolean }>`
  margin-top: 24px;
  padding: 0;
  background: ${(props) =>
    props.$isDark
      ? "linear-gradient(135deg, rgba(33, 150, 243, 0.08) 0%, rgba(25, 118, 210, 0.04) 100%)"
      : "linear-gradient(135deg, rgba(33, 150, 243, 0.04) 0%, rgba(25, 118, 210, 0.02) 100%)"};
  border-radius: 24px;
  border: 1px solid
    ${(props) =>
      props.$isDark ? "rgba(33, 150, 243, 0.15)" : "rgba(33, 150, 243, 0.08)"};
  backdrop-filter: blur(10px);
  height: 400px;
  overflow: hidden;
  box-shadow: ${(props) =>
    props.$isDark
      ? "0 8px 32px rgba(33, 150, 243, 0.15)"
      : "0 8px 32px rgba(33, 150, 243, 0.08)"};
  position: relative;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #2196f3, #1976d2);
    z-index: 1;
  }
`;

// Insta Sell styled components
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
    background: linear-gradient(135deg, #ff6633 0%, #e64a19 100%);
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

// Interfaces
interface CollectionOffer {
  id: string;
  collectionId: string;
  offerAmount: string;
  price: string; // Add missing price property
  currency: string | number;
  offerer: string;
  timestamp: number;
  createTimestamp: number; // Add missing createTimestamp property
  status: "active" | "expired" | "accepted" | "cancelled";
  expiresAt?: number;
  floorDifference?: number;
  listingId: number; // Add missing listingId property
}

interface CollectionStats {
  totalOffers: number;
  highestOffer: string;
  averageOffer: string;
  floorPrice: string;
}

interface CollectionMetadata {
  name: string;
  image: string;
  description?: string;
}

const CollectionOffers: React.FC = () => {
  const { id: collectionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { activeAccount, signTransactions } = useWallet();
  const theme = useTheme();
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  // State
  const [offers, setOffers] = useState<CollectionOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"amount" | "timestamp">("amount");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<CollectionOffer | null>(
    null
  );
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [collectionMetadata, setCollectionMetadata] =
    useState<CollectionMetadata | null>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState<string>("");
  const [bidError, setBidError] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);

  // Insta Sell Modal state
  const [instaSellModalOpen, setInstaSellModalOpen] = useState(false);
  const [userNFTs, setUserNFTs] = useState<any[]>([]);
  const [selectedNFT, setSelectedNFT] = useState<any>(null);
  const [nftsLoading, setNftsLoading] = useState(false);
  const [showVoiWidget, setShowVoiWidget] = useState(false);
  const [nftBalance, setNftBalance] = useState<number>(0);
  const [listings, setListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [showAllListings, setShowAllListings] = useState(false);
  const [sales, setSales] = useState<any[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);

  // Hooks - Fix the type error by converting string to number
  const collectionInfo = useCollectionInfo(
    collectionId ? Number(collectionId) : 0
  );
  const { name: collectionName } = useName(collectionId || "");

  // Process offer data for chart
  const getChartData = () => {
    if (offers.length === 0) {
      return {
        labels: [],
        datasets: [
          {
            label: "Offer Amount (VOI)",
            data: [],
            borderColor: isDarkTheme ? "#2196f3" : "#1976d2",
            backgroundColor: isDarkTheme
              ? "rgba(33, 150, 243, 0.15)"
              : "rgba(25, 118, 210, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: isDarkTheme ? "#2196f3" : "#1976d2",
            pointBorderColor: isDarkTheme ? "#fff" : "#fff",
            pointBorderWidth: 3,
            pointRadius: 8,
            pointHoverRadius: 12,
            pointHoverBackgroundColor: isDarkTheme ? "#42a5f5" : "#1565c0",
            pointHoverBorderColor: "#fff",
            pointHoverBorderWidth: 4,
          },
        ],
      };
    }

    // Sort by timestamp for chronological order
    const sortedOffers = [...offers].sort(
      (a: any, b: any) => a.createTimestamp - b.createTimestamp
    );

    const labels = sortedOffers.map((offer: any, index: number) => {
      const date = new Date(offer.createTimestamp);
      return `${date.getHours().toString().padStart(2, "0")}:${date
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
    });

    const data = sortedOffers.map((offer: any) => offer.price / 1e6);

    return {
      labels,
      datasets: [
        {
          label: "Offer Amount (VOI)",
          data,
          borderColor: isDarkTheme ? "#2196f3" : "#1976d2",
          backgroundColor: isDarkTheme
            ? "rgba(33, 150, 243, 0.15)"
            : "rgba(25, 118, 210, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: isDarkTheme ? "#2196f3" : "#1976d2",
          pointBorderColor: isDarkTheme ? "#fff" : "#fff",
          pointBorderWidth: 3,
          pointRadius: 8,
          pointHoverRadius: 12,
          pointHoverBackgroundColor: isDarkTheme ? "#42a5f5" : "#1565c0",
          pointHoverBorderColor: "#fff",
          pointHoverBorderWidth: 4,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: "index" as const,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDarkTheme
          ? "rgba(0, 0, 0, 0.9)"
          : "rgba(255, 255, 255, 0.95)",
        titleColor: isDarkTheme ? "#fff" : "#000",
        bodyColor: isDarkTheme ? "#fff" : "#000",
        borderColor: isDarkTheme
          ? "rgba(33, 150, 243, 0.3)"
          : "rgba(25, 118, 210, 0.3)",
        borderWidth: 2,
        cornerRadius: 12,
        padding: 12,
        titleFont: {
          size: 14,
          weight: "bold" as const,
        },
        bodyFont: {
          size: 13,
          weight: "bold" as const,
        },
        callbacks: {
          title: function (context: any) {
            return `📈 Offer Activity`;
          },
          label: function (context: any) {
            return `Amount: ${context.parsed.y.toFixed(2)} VOI`;
          },
          afterLabel: function (context: any) {
            return `Time: ${context.label}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: isDarkTheme
            ? "rgba(255, 255, 255, 0.08)"
            : "rgba(0, 0, 0, 0.08)",
          drawBorder: false,
        },
        ticks: {
          color: isDarkTheme ? "#aaa" : "#666",
          font: {
            size: 12,
            weight: "normal" as const,
          },
          padding: 8,
        },
        border: {
          display: false,
        },
      },
      y: {
        grid: {
          color: isDarkTheme
            ? "rgba(255, 255, 255, 0.08)"
            : "rgba(0, 0, 0, 0.08)",
          drawBorder: false,
        },
        ticks: {
          color: isDarkTheme ? "#aaa" : "#666",
          font: {
            size: 12,
            weight: "normal" as const,
          },
          padding: 8,
          callback: function (value: any) {
            return `${value.toFixed(1)} VOI`;
          },
        },
        border: {
          display: false,
        },
      },
    },
    elements: {
      point: {
        hoverBorderWidth: 4,
      },
    },
  };

  const fetchUserNFTs = async () => {
    try {
      setNftsLoading(true);
      const response = await axios.get(
        `${MIMIR_API}/nft-indexer/v1/tokens?contractId=${collectionId}&owner=${activeAccount?.address}`
      );

      if (response.data.tokens) {
        const nfts = response.data.tokens.map((token: any) => {
          let metadata = null;
          let image = "";
          let name = `#${token.tokenId}`;

          if (token.metadata) {
            try {
              metadata = JSON.parse(token.metadata);
              image = metadata.image || "";
              name = metadata.name || `#${token.tokenId}`;
            } catch (e) {
              console.warn("Failed to parse metadata for token", token.tokenId);
            }
          }

          return {
            tokenId: token.tokenId,
            metadata,
            image: resolveImageUrl(image),
            name,
          };
        });

        setUserNFTs(nfts);
      }
    } catch (error) {
      console.error("Error fetching user NFTs:", error);
    } finally {
      setNftsLoading(false);
    }
  };

  useEffect(() => {
    if (activeAccount) {
      fetchUserNFTs();
    }
  }, [activeAccount]);

  // Fetch current listings
  const fetchListings = async () => {
    try {
      setListingsLoading(true);
      const response = await axios.get(
        `https://voi-mainnet-mimirapi.nftnavigator.xyz/nft-indexer/v1/mp/listings?collectionId=${collectionId}&active=true`
      );

      if (response.data.listings) {
        const processedListings = response.data.listings.map((listing: any) => {
          let metadata = null;
          let image = "";
          let name = `#${listing.tokenId}`;

          if (listing.token.metadata) {
            try {
              metadata = JSON.parse(listing.token.metadata);
              image = metadata.image || "";
              name = metadata.name || `#${listing.tokenId}`;
            } catch (e) {
              console.warn(
                "Failed to parse metadata for listing",
                listing.tokenId
              );
            }
          }

          return {
            ...listing,
            metadata,
            image: resolveImageUrl(image),
            name,
          };
        });

        setListings(processedListings);
      }
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setListingsLoading(false);
    }
  };

  useEffect(() => {
    if (collectionId) {
      fetchListings();
      fetchSales();
    }
  }, [collectionId]);

  // Fetch sales history
  const fetchSales = async () => {
    try {
      setSalesLoading(true);
      const response = await axios.get(
        `https://voi-mainnet-mimirapi.nftnavigator.xyz/nft-indexer/v1/mp/sales?collectionId=${collectionId}`
      );

      console.log("Sales API response:", response.data);

      // Handle different response formats
      if (response.data.sales) {
        setSales(response.data.sales);
      } else if (response.data.listings) {
        // If the sales endpoint returns listings data, filter for completed sales
        const completedSales = response.data.listings.filter(
          (listing: any) => listing.sale && listing.sale.buyer
        );
        setSales(completedSales);
      } else {
        setSales([]);
      }
    } catch (error) {
      console.error("Error fetching sales:", error);
      setSales([]);
    } finally {
      setSalesLoading(false);
    }
  };

  // Calculate linear regression for trend line
  const calculateLinearRegression = (data: number[]) => {
    if (data.length < 2) return data;

    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);

    // Calculate means
    const xMean = x.reduce((sum, val) => sum + val, 0) / n;
    const yMean = data.reduce((sum, val) => sum + val, 0) / n;

    // Calculate slope and intercept
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (x[i] - xMean) * (data[i] - yMean);
      denominator += Math.pow(x[i] - xMean, 2);
    }

    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = yMean - slope * xMean;

    // Generate trend line points
    return x.map((xVal) => slope * xVal + intercept);
  };

  // Process sales data for chart
  const getSalesChartData = () => {
    if (sales.length === 0) {
      return {
        labels: [],
        datasets: [
          {
            label: "Sales Price (VOI)",
            data: [],
            borderColor: isDarkTheme ? "#ff9800" : "#f57c00",
            backgroundColor: isDarkTheme
              ? "rgba(255, 152, 0, 0.15)"
              : "rgba(245, 124, 0, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: isDarkTheme ? "#ff9800" : "#f57c00",
            pointBorderColor: isDarkTheme ? "#fff" : "#fff",
            pointBorderWidth: 3,
            pointRadius: 8,
            pointHoverRadius: 12,
            pointHoverBackgroundColor: isDarkTheme ? "#ffb74d" : "#ef6c00",
            pointHoverBorderColor: "#fff",
            pointHoverBorderWidth: 4,
          },
        ],
      };
    }

    // Sort by timestamp for chronological order
    const sortedSales = [...sales].sort(
      (a: any, b: any) => a.timestamp - b.timestamp
    );

    const labels = sortedSales.map((sale: any, index: number) => {
      const date = new Date(sale.timestamp);
      return `${date.getHours().toString().padStart(2, "0")}:${date
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
    });

    const data = sortedSales.map((sale: any) => sale.price / 1e6);
    const trendLineData = calculateLinearRegression(data);

    // Calculate floor price from listings
    const floorPrice =
      listings.length > 0
        ? Math.min(...listings.map((l) => Number(l.price))) / 1e6
        : 0;

    // Create horizontal floor line data
    const floorLineData = labels.map(() => floorPrice);

    return {
      labels,
      datasets: [
        {
          label: "Sales Price (VOI)",
          data,
          borderColor: isDarkTheme ? "#ff9800" : "#f57c00",
          backgroundColor: isDarkTheme
            ? "rgba(255, 152, 0, 0.15)"
            : "rgba(245, 124, 0, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: isDarkTheme ? "#ff9800" : "#f57c00",
          pointBorderColor: isDarkTheme ? "#fff" : "#fff",
          pointBorderWidth: 3,
          pointRadius: 8,
          pointHoverRadius: 12,
          pointHoverBackgroundColor: isDarkTheme ? "#ffb74d" : "#ef6c00",
          pointHoverBorderColor: "#fff",
          pointHoverBorderWidth: 4,
        },
        {
          label: "Trend Line",
          data: trendLineData,
          borderColor: isDarkTheme ? "#2196f3" : "#1976d2",
          backgroundColor: "transparent",
          borderWidth: 2,
          fill: false,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 0,
          borderDash: [5, 5],
          pointBackgroundColor: "transparent",
          pointBorderColor: "transparent",
        },
        {
          label: "Floor Price",
          data: floorLineData,
          borderColor: isDarkTheme ? "#f44336" : "#d32f2f",
          backgroundColor: "transparent",
          borderWidth: 2,
          fill: false,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 0,
          borderDash: [10, 5],
          pointBackgroundColor: "transparent",
          pointBorderColor: "transparent",
        },
      ],
    };
  };

  const salesChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: "index" as const,
    },
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
        labels: {
          usePointStyle: true,
          pointStyle: "line",
          padding: 20,
          font: {
            size: 12,
            weight: "normal" as const,
          },
          color: isDarkTheme ? "#fff" : "#000",
          generateLabels: function (chart: any) {
            const original =
              ChartJS.defaults.plugins.legend.labels.generateLabels;
            const labels = original.call(this, chart);
            labels.forEach((label: any) => {
              if (label.text === "Trend Line") {
                label.borderDash = [5, 5];
              }
              if (label.text === "Floor Price") {
                label.borderDash = [10, 5];
              }
            });
            return labels;
          },
        },
      },
      tooltip: {
        backgroundColor: isDarkTheme
          ? "rgba(0, 0, 0, 0.9)"
          : "rgba(255, 255, 255, 0.95)",
        titleColor: isDarkTheme ? "#fff" : "#000",
        bodyColor: isDarkTheme ? "#fff" : "#000",
        borderColor: isDarkTheme
          ? "rgba(255, 152, 0, 0.3)"
          : "rgba(245, 124, 0, 0.3)",
        borderWidth: 2,
        cornerRadius: 12,
        padding: 12,
        titleFont: {
          size: 14,
          weight: "bold" as const,
        },
        bodyFont: {
          size: 13,
          weight: "bold" as const,
        },
        callbacks: {
          title: function (context: any) {
            return `💰 Sales History`;
          },
          label: function (context: any) {
            const datasetLabel = context.dataset.label;
            if (datasetLabel === "Trend Line") {
              return `Trend: ${context.parsed.y.toFixed(2)} VOI`;
            }
            if (datasetLabel === "Floor Price") {
              return `Floor: ${context.parsed.y.toFixed(2)} VOI`;
            }
            return `Sale Price: ${context.parsed.y.toFixed(2)} VOI`;
          },
          afterLabel: function (context: any) {
            return `Time: ${context.label}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: isDarkTheme
            ? "rgba(255, 255, 255, 0.08)"
            : "rgba(0, 0, 0, 0.08)",
          drawBorder: false,
        },
        ticks: {
          color: isDarkTheme ? "#aaa" : "#666",
          font: {
            size: 12,
            weight: "normal" as const,
          },
          padding: 8,
        },
        border: {
          display: false,
        },
      },
      y: {
        grid: {
          color: isDarkTheme
            ? "rgba(255, 255, 255, 0.08)"
            : "rgba(0, 0, 0, 0.08)",
          drawBorder: false,
        },
        ticks: {
          color: isDarkTheme ? "#aaa" : "#666",
          font: {
            size: 12,
            weight: "normal" as const,
          },
          padding: 8,
          callback: function (value: any) {
            return `${value.toFixed(1)} VOI`;
          },
        },
        border: {
          display: false,
        },
      },
    },
    elements: {
      point: {
        hoverBorderWidth: 4,
      },
    },
  };

  // Fetch collection metadata
  const fetchCollectionMetadata = async () => {
    if (!collectionId) return;

    try {
      // Try to get collection metadata from the first token
      const response = await axios.get(
        `${MIMIR_API}/nft-indexer/v1/collections?contractId=${collectionId}`
      );

      if (response.data.collections && response.data.collections.length > 0) {
        const collection = response.data.collections[0];
        if (collection) {
          try {
            const metadata = JSON.parse(collection.metadata);
            setCollectionMetadata({
              ...collection,
              image: collection.imageUrl,
              description: metadata.description,
              metadata,
            });
          } catch (error) {
            console.warn("Failed to parse collection metadata:", error);
            setCollectionMetadata({
              name: `Collection #${collectionId}`,
              image: "",
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching collection metadata:", error);
      setCollectionMetadata({
        name: `Collection #${collectionId}`,
        image: "",
      });
    }
  };

  // Enhanced image URL resolution following app patterns
  const resolveImageUrl = (imageUrl: string) => {
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

  // Fetch offers data
  const fetchOffers = async () => {
    if (!collectionId || !activeAccount) return;

    try {
      setLoading(true);
      setError(null);

      const { algodClient, indexerClient } = getAlgorandClients();

      const ci = new CONTRACT(
        MP210CTCINFO,
        algodClient,
        indexerClient,
        collectionOfferABI,
        {
          addr: activeAccount?.address,
          sk: new Uint8Array(0),
        },
        true,
        false,
        true
      );

      const status = await algodClient.status().do();
      const lastRound = status["last-round"];

      const events = await ci.getEvents({
        minRound: Math.max(lastRound - 2e6, 0),
      });

      console.log({ events });

      const listingEvents = (
        events.find(
          (event: any) => event.name === "e_collection_offer_ListEvent"
        )?.events || []
      ).map(getListingEvent);

      const deleteEvents = (
        events.find(
          (event: any) => event.name === "e_collection_offer_DeleteListingEvent"
        )?.events || []
      ).map(getDeleteEvent);

      const acceptEvents = (
        events.find(
          (event: any) => event.name === "e_collection_offer_AcceptEvent"
        )?.events || []
      ).map(getAcceptEvent);

      console.log({ listingEvents, deleteEvents, acceptEvents });

      const activeOffers = listingEvents.filter(
        (event: any) =>
          !deleteEvents.some(
            (deleteEvent: any) => deleteEvent.listingId === event.listingId
          ) &&
          !acceptEvents.some(
            (acceptEvent: any) => acceptEvent.listingId === event.listingId
          ) &&
          event.contractId === Number(collectionId)
      );

      // Calculate floor difference for each offer
      const offersWithFloorDifference = activeOffers.map((offer: any) => {
        // Get current floor price from listings
        const floorPrice =
          listings.length > 0
            ? Math.min(...listings.map((l) => Number(l.price)))
            : 0;

        // Calculate floor difference percentage
        const offerPrice = Number(offer.price);
        const floorDifference =
          floorPrice > 0 ? ((offerPrice - floorPrice) / floorPrice) * 100 : 0;

        return {
          ...offer,
          floorDifference: floorDifference,
        };
      });

      setOffers(offersWithFloorDifference);
    } catch (err) {
      console.error("Error fetching offers:", err);
      setError("Failed to fetch collection offers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
    fetchCollectionMetadata();
  }, [collectionId]);

  // Recalculate floor differences when listings change
  useEffect(() => {
    if (offers.length > 0 && listings.length > 0) {
      const floorPrice = Math.min(...listings.map((l) => Number(l.price)));

      const updatedOffers = offers.map((offer) => {
        const offerPrice = Number(offer.price);
        const floorDifference =
          floorPrice > 0 ? ((offerPrice - floorPrice) / floorPrice) * 100 : 0;

        return {
          ...offer,
          floorDifference: floorDifference,
        };
      });

      setOffers(updatedOffers);
    }
  }, [listings]);

  useEffect(() => {
    if (!activeAccount) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    const ci = new CONTRACT(
      Number(collectionId),
      algodClient,
      indexerClient,
      abi.arc72,
      {
        addr: activeAccount?.address,
        sk: new Uint8Array(0),
      },
      true,
      false,
      true
    );
    ci.arc72_balanceOf(activeAccount.address).then((res: any) => {
      if (res.success) {
        setNftBalance(Number(res.returnValue));
      }
    });
  }, [activeAccount]);

  // Filtered and sorted offers
  const filteredOffers = useMemo(() => {
    let filtered = offers.filter((offer) => {
      if (
        searchTerm &&
        !offer.offerer.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false;
      return true;
    });

    filtered.sort((a, b) => {
      let aValue, bValue;

      if (sortBy === "amount") {
        aValue = new BigNumber(a.price);
        bValue = new BigNumber(b.price);
        return sortOrder === "desc"
          ? bValue.minus(aValue).toNumber()
          : aValue.minus(bValue).toNumber();
      } else {
        aValue = a.createTimestamp;
        bValue = b.createTimestamp;
        return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
      }
    });

    return filtered;
  }, [offers, searchTerm, sortBy, sortOrder, filterStatus]);

  const handleBidAmountChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setBidAmount(value);

    if (value && parseFloat(value) <= 0) {
      setBidError("Bid amount must be greater than 0");
    } else {
      setBidError("");
    }
  };

  const handlePlaceOffer = async () => {
    if (!activeAccount || !bidAmount || bidError) {
      toast.error("Please enter a valid bid amount");
      return;
    }
    // ----------------------------
    const requiredAmount = BigInt(
      new BigNumber(bidAmount).multipliedBy(1.1).multipliedBy(1e6).toFixed(0)
    );

    const ctcInfoNV = 8324600; // Nautilus Voi NV
    const { algodClient, indexerClient } = getAlgorandClients();

    const ci = new CONTRACT(
      MP210CTCINFO,
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
        MP210CTCINFO,
        algodClient,
        indexerClient,
        collectionOfferABI,
        {
          addr: activeAccount.address,
          sk: new Uint8Array(0),
        },
        true,
        false,
        true
      ),
    };

    console.log({ offers });

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
      algosdk.getApplicationAddress(MP210CTCINFO)
    );
    const arc200Allowance = arc200AllowanceR.returnValue;

    console.log("arc200Allowance", arc200Allowance);

    const buildN = [];

    let customR;
    for (const p1 of [0, 1]) {
      // TODO beacon txn here

      // arc200 approve increase allowance

      {
        // TODO track approvals
        const txnO = (
          await builder.nt200.arc200_approve(
            algosdk.getApplicationAddress(MP210CTCINFO),
            arc200Allowance + requiredAmount
          )
        ).obj;
        buildN.push({
          ...txnO,
          payment: arc200Allowance == BigInt(0) ? 28100 : 0,
          note: new TextEncoder().encode("approve arc200"),
        });
      }

      // nt200 createBalanceBox if needed

      if (p1 > 0) {
        const txnO = (
          await builder.nt200.createBalanceBox(activeAccount.address)
        )?.obj;
        buildN.push({
          ...txnO,
          payment: 28500,
          note: new TextEncoder().encode("createBalanceBox"),
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
          await builder.mp.a_collection_offer_listSC(
            Number(collectionId),
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

      customR = await ci.custom();

      if (customR.success) {
        break;
      }
    }

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
        MP210CTCINFO,
        algodClient,
        indexerClient,
        collectionOfferABI,
        { addr: activeAccount.address, sk: new Uint8Array(0) },
        true,
        false,
        true
      );

      const events = await ci.getEvents({
        txid,
      });

      const listingEvent =
        events?.find(
          (event: any) => event.name === "e_collection_offer_ListEvent"
        )?.events || [];

      if (listingEvent.length > 0) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } while (1);

    toast.success(`Collection offer of ${bidAmount} VOI placed successfully!`);
    // ----------------------------
    fetchOffers();
  };

  const handleMakeOffer = () => {
    if (!activeAccount) {
      toast.error("Please connect your wallet to make an offer");
      return;
    }
    setShowOfferModal(true);
  };

  const handleCancelOffer = (offer: CollectionOffer) => {
    setSelectedOffer(offer);
    setShowCancelModal(true);
  };

  const cancelSelectedOffer = async () => {
    if (!selectedOffer || !activeAccount || !signTransactions) {
      toast.error("Unable to cancel offer. Please check your connection.");
      return;
    }

    try {
      setActionLoading(true);

      const ctcInfoNV = 8324600; // Nautilus Voi NV
      const { algodClient, indexerClient } = getAlgorandClients();

      const ci = new CONTRACT(
        MP210CTCINFO,
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
          MP210CTCINFO,
          algodClient,
          indexerClient,
          collectionOfferABI,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
      };

      const buildN: any[] = [];

      // nt200 withdraw offer amount
      {
        const amountToWithdraw = BigInt(
          new BigNumber(selectedOffer.price).multipliedBy(1.1).toFixed(0)
        );
        const txnO = (await builder.nt200.withdraw(amountToWithdraw))?.obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode("withdraw offer amount"),
        });
      }

      // Delete the offer listing
      const deleteTxn = (
        await builder.mp.a_collection_offer_deleteListing(
          selectedOffer.listingId
        )
      )?.obj;
      if (deleteTxn) {
        buildN.push({
          ...deleteTxn,
          note: new TextEncoder().encode("delete collection offer"),
        });
      }

      console.log({ buildN });

      if (buildN.length === 0) {
        toast.error("Failed to build cancel offer transaction");
        return;
      }

      ci.setFee(2000);
      ci.setExtraTxns(buildN);
      ci.setEnableGroupResourceSharing(true);

      const customR = await ci.custom();

      console.log({ customR });

      if (!customR.success) {
        toast.error("Failed to cancel offer: " + customR.error);
        return;
      }

      // Sign and send transactions
      const stxns = await signTransactions(
        customR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );

      if (stxns.length === 0 || !stxns[0]) {
        toast.error("Failed to sign transactions");
        return;
      }

      const stxn = algosdk.decodeSignedTransaction(
        stxns[stxns.length - 1] as Uint8Array
      );
      const txId = stxn.txn.txID();

      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();

      toast.success(
        `Successfully canceled offer for ${(
          parseFloat(selectedOffer.price) / 1e6
        ).toFixed(2)} VOI!`
      );

      // Optimistically remove the offer from local state
      setOffers((prevOffers) =>
        prevOffers.filter(
          (offer) => offer.listingId !== selectedOffer.listingId
        )
      );

      // Close modal and reset state
      setShowCancelModal(false);
      setSelectedOffer(null);
    } catch (error: any) {
      console.error("Error canceling offer:", error);
      toast.error(
        `Failed to cancel offer: ${error.message || "Unknown error"}`
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptOffer = async (offer: CollectionOffer) => {
    toast.info("Accept offer functionality coming soon");
  };

  // Insta Sell helper functions
  const canInstaSell = () => {
    // Check if user is connected
    if (!activeAccount || !collectionId || nftBalance === 0) return false;

    // Check if there are active offers/arc7
    if (offers.length === 0) return false;

    // For collection offers, we assume the user has NFTs they can sell
    return nftBalance > 0 && getSuggestedPrice() > 0;
  };

  const getSuggestedPrice = () => {
    if (offers.length === 0) return 0;

    // Get the highest offer price
    const highestOffer = offers.reduce((max, offer) => {
      const price =
        offer.offerer !== activeAccount?.address
          ? parseFloat(offer.price) / 1e6
          : 0;
      return price > max ? price : max;
    }, 0);

    return highestOffer;
  };

  const handleInstaSell = () => {
    if (!activeAccount || !collectionId) {
      toast.error("Please connect your wallet");
      return;
    }

    // Open the modal to let user select which NFT to sell
    setInstaSellModalOpen(true);
  };

  const handleConfirmInstaSell = async (
    selectedNFT: any,
    selectedOffer: any
  ) => {
    if (!activeAccount || !collectionId || !selectedNFT) {
      toast.error("Missing required information");
      return;
    }

    setActionLoading(true);
    setInstaSellModalOpen(false);

    try {
      // Find the highest offer
      const highestOffer = offers.reduce((max, offer) => {
        const price =
          offer.offerer !== activeAccount?.address
            ? parseFloat(offer.price) / 1e6
            : 0;
        return price > parseFloat(max.price) ? offer : max;
      });

      const ctcInfoNV = 8324600; // Nautilus Voi NV

      const { algodClient, indexerClient } = getAlgorandClients();

      const ci = new CONTRACT(
        MP210CTCINFO,
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
          MP210CTCINFO,
          algodClient,
          indexerClient,
          collectionOfferABI,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
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
      };

      const buildN = [];

      // TODO add beacon transaction

      // Approve ARC72
      {
        const txnO = (
          await builder.arc72.arc72_approve(
            algosdk.getApplicationAddress(MP210CTCINFO),
            BigInt(selectedNFT.tokenId)
          )
        ).obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode("approve arc72"),
          payment: 28100,
        });
      }

      // Accept offer transaction

      {
        const txnO = (
          await builder.mp.a_collection_offer_acceptSC(
            BigInt(selectedOffer.listingId),
            BigInt(selectedNFT.tokenId)
          )
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
      console.log(
        `Selling NFT instantly for ${parseFloat(highestOffer.price) / 1e6} VOI`
      );
      toast.success(
        `NFT sold instantly for ${parseFloat(highestOffer.price) / 1e6} VOI!`
      );

      toast.success(
        `Successfully sold ${
          selectedNFT.name || `#${selectedNFT.tokenId}`
        } for ${(parseFloat(selectedOffer.price) / 1e6).toFixed(2)} VOI!`
      );

      // Refresh offers
      await fetchOffers();
    } catch (error) {
      console.error("Error selling NFT:", error);
      toast.error("Failed to sell NFT");
    } finally {
      setActionLoading(false);
    }
  };

  if (!collectionId) {
    return (
      <PageContainer>
        <Alert severity="error">Collection ID is required</Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <HeaderSection>
        <Box>
          <Typography variant="h4" gutterBottom>
            Trading Station
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {collectionName ||
              collectionMetadata?.name ||
              `Collection ${collectionId}`}
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => {
              window.location.reload();
            }}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </HeaderSection>

      {/* Main Content - Auction-style layout */}
      <Grid container spacing={3}>
        {/* Collection Image and Basic Info */}
        <Grid item xs={12} md={6}>
          <StyledCard $isDark={isDarkTheme}>
            <CardContent>
              <ImageContainer $isDark={isDarkTheme}>
                {collectionMetadata?.image && !imageError ? (
                  <TokenImage
                    src={resolveImageUrl(collectionMetadata.image)}
                    alt={collectionMetadata.name}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    style={{
                      opacity: imageLoading ? 0 : 1,
                      display: imageError ? "none" : "block",
                    }}
                  />
                ) : null}

                {imageLoading && collectionMetadata?.image && !imageError && (
                  <CircularProgress
                    size={40}
                    sx={{ color: isDarkTheme ? "#fff" : "#000" }}
                  />
                )}

                {(!collectionMetadata?.image || imageError) && (
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
                {collectionMetadata?.name || `Collection #${collectionId}`}
              </Typography>
              {collectionMetadata?.metadata?.description && (
                <Typography
                  variant="body2"
                  sx={{
                    color: isDarkTheme ? "#ccc" : "#666",
                    textAlign: "center",
                    mb: 2,
                  }}
                >
                  {collectionMetadata.metadata.description}
                </Typography>
              )}
              <Box sx={{ mt: 2 }}>
                <Typography
                  variant="body2"
                  sx={{ color: isDarkTheme ? "#ccc" : "#666", mb: 1 }}
                >
                  Collection ID: {collectionId}
                </Typography>
                {collectionInfo?.collectionInfo && (
                  <Typography
                    variant="body2"
                    sx={{ color: isDarkTheme ? "#ccc" : "#666", mb: 1 }}
                  >
                    Total Supply: {collectionInfo.collectionInfo.totalSupply}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </StyledCard>

          {/* Bid Section */}
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
              <Typography
                variant="body2"
                sx={{ color: isDarkTheme ? "#ccc" : "#666", mb: 1 }}
              >
                Make an offer for any token in this collection
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: isDarkTheme ? "#aaa" : "#777" }}
              >
                Your offer will be valid for any available token
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
              <BidTextField
                $isDark={isDarkTheme}
                label="Offer Amount"
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
                onClick={handlePlaceOffer}
                disabled={actionLoading || !!bidError || !bidAmount}
                size="large"
              >
                {actionLoading ? (
                  <CircularProgress size={20} sx={{ color: "#fff" }} />
                ) : (
                  "Place Offer"
                )}
              </BidButton>
            </Box>

            <Box sx={{ mt: 2, textAlign: "center" }}>
              <Typography
                variant="caption"
                sx={{ color: isDarkTheme ? "#aaa" : "#777" }}
              >
                Collection offers are valid for any token in the collection
              </Typography>
            </Box>
          </BidContainer>
          {activeAccount && (
            <Box sx={{ mt: 2, textAlign: "center" }}>
              <VoiPurchaseWidget address={activeAccount?.address} />
            </Box>
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          {/* Insta Sell Section */}
          {canInstaSell() && (
            <Grid item xs={12}>
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
                    Sell instantly to highest collection offer
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
                    Instant sale • Sell to highest collection offer
                  </Typography>
                </Box>
              </InstaSellContainer>
            </Grid>
          )}
          {/* Current Offers */}
          {filteredOffers.length > 0 && (
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
                  Current Offers
                </Typography>

                {/* Offer Activity Chart */}
                {offers.length > 1 && (
                  <ChartContainer $isDark={isDarkTheme}>
                    <Box
                      sx={{
                        p: 3,
                        borderBottom: `1px solid ${alpha(
                          theme.palette.primary.main,
                          0.08
                        )}`,
                        background: `linear-gradient(135deg, ${alpha(
                          theme.palette.primary.main,
                          0.05
                        )} 0%, ${alpha(
                          theme.palette.secondary.main,
                          0.03
                        )} 100%)`,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 2 }}
                        >
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 2,
                              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: `0 4px 16px ${alpha(
                                theme.palette.primary.main,
                                0.3
                              )}`,
                            }}
                          >
                            <Typography
                              sx={{
                                color: "white",
                                fontWeight: 700,
                                fontSize: "1rem",
                              }}
                            >
                              📊
                            </Typography>
                          </Box>
                          <Box>
                            <Typography
                              variant="h6"
                              sx={{ fontWeight: 700, color: "text.primary" }}
                            >
                              Offer Activity Over Time
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: "text.secondary", fontWeight: 500 }}
                            >
                              Track offer trends and patterns
                            </Typography>
                          </Box>
                        </Box>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 2 }}
                        >
                          <Chip
                            label={`${offers.length} Data Points`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{
                              fontWeight: 600,
                              borderColor: alpha(
                                theme.palette.primary.main,
                                0.3
                              ),
                            }}
                          />
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              backgroundColor: theme.palette.success.main,
                              boxShadow: `0 0 8px ${alpha(
                                theme.palette.success.main,
                                0.5
                              )}`,
                            }}
                          />
                        </Box>
                      </Box>
                    </Box>
                    <Box sx={{ p: 2, height: "calc(100% - 80px)" }}>
                      <Line data={getChartData()} options={chartOptions} />
                    </Box>
                  </ChartContainer>
                )}

                <TableContainer sx={{ mt: 4 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Offerer</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredOffers.slice(0, 5).map((offer) => (
                        <TableRow key={offer.id} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Avatar sx={{ width: 24, height: 24 }}>
                                {offer.offerer.slice(2, 4).toUpperCase()}
                              </Avatar>
                              <Typography variant="body2">
                                {shortenAddress(offer.offerer)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Box
                              display="flex"
                              alignItems="center"
                              justifyContent="flex-end"
                              gap={1}
                            >
                              <img
                                src={`https://asset-verification.nautilus.sh/icons/0.png`}
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 12,
                                }}
                              />
                              <Typography variant="body2" fontWeight="medium">
                                {formatAmount(Number(offer.price))} VOI
                              </Typography>
                            </Box>
                          </TableCell>

                          <TableCell align="right">
                            <Box
                              display="flex"
                              gap={1}
                              justifyContent="flex-end"
                            >
                              {offer.status === "active" && (
                                <>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => handleAcceptOffer(offer)}
                                  >
                                    Accept
                                  </Button>
                                  {offer.offerer === activeAccount?.address && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="error"
                                      onClick={() => handleCancelOffer(offer)}
                                    >
                                      Cancel
                                    </Button>
                                  )}
                                </>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {filteredOffers.length > 5 && (
                  <Box sx={{ textAlign: "center", mt: 2 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() =>
                        navigate(`/collection/${collectionId}/offers`)
                      }
                    >
                      View All Offers ({filteredOffers.length})
                    </Button>
                  </Box>
                )}
              </CardContent>
            </StyledCard>
          )}
          {nftBalance > 0 && (
            <Card
              sx={{
                p: 3,
                background: `linear-gradient(135deg, ${alpha(
                  theme.palette.primary.main,
                  0.08
                )} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                borderRadius: 3,
                width: "100%",
                boxShadow: `0 4px 20px ${alpha(
                  theme.palette.primary.main,
                  0.1
                )}`,
                position: "relative",
                overflow: "hidden",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "3px",
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      backgroundImage: collectionMetadata?.image
                        ? `url(${collectionMetadata.image})`
                        : `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: `0 4px 12px ${alpha(
                        theme.palette.primary.main,
                        0.3
                      )}`,
                      border: `2px solid ${alpha(
                        theme.palette.primary.main,
                        0.2
                      )}`,
                    }}
                  >
                    {!collectionMetadata?.image && (
                      <Typography
                        sx={{
                          color: "white",
                          fontWeight: 700,
                          fontSize: "1.2rem",
                        }}
                      >
                        {collectionMetadata?.name?.charAt(0) || "N"}
                      </Typography>
                    )}
                  </Box>
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary", fontWeight: 500, mb: 0.5 }}
                    >
                      Collection Balance
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 600, color: "text.primary" }}
                    >
                      {collectionMetadata?.name || "Unknown Collection"}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", fontWeight: 500, mb: 0.5 }}
                  >
                    NFTs Owned
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: theme.palette.primary.main }}
                  >
                    {nftBalance}
                  </Typography>
                </Box>
              </Box>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Stats Section */}
      <Card
        sx={{
          mt: 3,
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.12)}`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
          background: `linear-gradient(135deg, ${alpha(
            theme.palette.background.paper,
            0.8
          )} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
          backdropFilter: "blur(10px)",
        }}
      >
        <Box
          sx={{
            p: 3,
            borderBottom: `1px solid ${alpha(
              theme.palette.primary.main,
              0.08
            )}`,
            background: `linear-gradient(135deg, ${alpha(
              theme.palette.primary.main,
              0.05
            )} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 4px 12px ${alpha(
                    theme.palette.primary.main,
                    0.3
                  )}`,
                }}
              >
                <Typography
                  sx={{
                    color: "white",
                    fontWeight: 700,
                    fontSize: "1.1rem",
                  }}
                >
                  📊
                </Typography>
              </Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "text.primary" }}
              >
                Collection Stats
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ p: 3 }}>
          <Grid container spacing={2}>
            {/* Highest Sale Section */}
            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  p: 2,
                  height: 140,
                  background: `linear-gradient(135deg, ${alpha(
                    theme.palette.success.main,
                    0.08
                  )} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                  border: `1px solid ${alpha(
                    theme.palette.success.main,
                    0.15
                  )}`,
                  borderRadius: 3,
                  width: "100%",
                  boxShadow: `0 4px 20px ${alpha(
                    theme.palette.success.main,
                    0.1
                  )}`,
                  position: "relative",
                  overflow: "hidden",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: `linear-gradient(90deg, ${theme.palette.success.main}, ${theme.palette.secondary.main})`,
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.secondary.main})`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: `0 4px 12px ${alpha(
                          theme.palette.success.main,
                          0.3
                        )}`,
                        border: `2px solid ${alpha(
                          theme.palette.success.main,
                          0.2
                        )}`,
                      }}
                    >
                      <Typography
                        sx={{
                          color: "white",
                          fontWeight: 700,
                          fontSize: "1.2rem",
                        }}
                      >
                        🏆
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                          fontWeight: 500,
                          mb: 0.5,
                        }}
                      >
                        Highest Sale
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 600, color: "text.primary" }}
                      >
                        All-time Record
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary", fontWeight: 500, mb: 0.5 }}
                    >
                      Sale Price
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 700,
                        color: theme.palette.success.main,
                      }}
                    >
                      {sales.length > 0
                        ? formatAmount(
                            Math.max(
                              ...sales.map((sale) => {
                                const price = sale.price || sale.sale?.price;
                                return price ? Number(price) : 0;
                              })
                            )
                          ) + " VOI"
                        : "No Sales"}
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>

            {/* Average Sale Section */}
            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  p: 2,
                  height: 140,
                  background: `linear-gradient(135deg, ${alpha(
                    theme.palette.info.main,
                    0.08
                  )} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.info.main, 0.15)}`,
                  borderRadius: 3,
                  width: "100%",
                  boxShadow: `0 4px 20px ${alpha(
                    theme.palette.info.main,
                    0.1
                  )}`,
                  position: "relative",
                  overflow: "hidden",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: `linear-gradient(90deg, ${theme.palette.info.main}, ${theme.palette.secondary.main})`,
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, ${theme.palette.info.main}, ${theme.palette.secondary.main})`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: `0 4px 12px ${alpha(
                          theme.palette.info.main,
                          0.3
                        )}`,
                        border: `2px solid ${alpha(
                          theme.palette.info.main,
                          0.2
                        )}`,
                      }}
                    >
                      <Typography
                        sx={{
                          color: "white",
                          fontWeight: 700,
                          fontSize: "1.2rem",
                        }}
                      >
                        📊
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                          fontWeight: 500,
                          mb: 0.5,
                        }}
                      >
                        Average Sale
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 600, color: "text.primary" }}
                      >
                        Collection Average
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary", fontWeight: 500, mb: 0.5 }}
                    >
                      Average Price
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 700, color: theme.palette.info.main }}
                    >
                      {sales.length > 0
                        ? formatAmount(
                            sales.reduce((sum, sale) => {
                              const price = sale.price || sale.sale?.price;
                              return sum + (price ? Number(price) : 0);
                            }, 0) / sales.length
                          ) + " VOI"
                        : "No Sales"}
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>

            {/* Collection Floor Section */}
            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  p: 2,
                  height: 140,
                  background: `linear-gradient(135deg, ${alpha(
                    theme.palette.primary.main,
                    0.08
                  )} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                  border: `1px solid ${alpha(
                    theme.palette.primary.main,
                    0.15
                  )}`,
                  borderRadius: 3,
                  width: "100%",
                  boxShadow: `0 4px 20px ${alpha(
                    theme.palette.primary.main,
                    0.1
                  )}`,
                  position: "relative",
                  overflow: "hidden",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: `0 4px 12px ${alpha(
                          theme.palette.primary.main,
                          0.3
                        )}`,
                        border: `2px solid ${alpha(
                          theme.palette.primary.main,
                          0.2
                        )}`,
                      }}
                    >
                      <Typography
                        sx={{
                          color: "white",
                          fontWeight: 700,
                          fontSize: "1.2rem",
                        }}
                      >
                        🏠
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                          fontWeight: 500,
                          mb: 0.5,
                        }}
                      >
                        Collection Floor
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 600, color: "text.primary" }}
                      >
                        Floor Price
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary", fontWeight: 500, mb: 0.5 }}
                    >
                      Floor Price
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 700,
                        color: theme.palette.primary.main,
                      }}
                    >
                      {listings.length > 0
                        ? formatAmount(
                            Math.min(...listings.map((l) => Number(l.price)))
                          ) + " VOI"
                        : "No Listings"}
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Card>

      {/* Current Listings Section */}
      <Card
        sx={{
          mt: 3,
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.12)}`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
          background: `linear-gradient(135deg, ${alpha(
            theme.palette.background.paper,
            0.8
          )} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
          backdropFilter: "blur(10px)",
        }}
      >
        <Box
          sx={{
            p: 3,
            borderBottom: `1px solid ${alpha(
              theme.palette.primary.main,
              0.08
            )}`,
            background: `linear-gradient(135deg, ${alpha(
              theme.palette.primary.main,
              0.05
            )} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 4px 16px ${alpha(
                    theme.palette.primary.main,
                    0.3
                  )}`,
                }}
              >
                <Typography
                  sx={{ color: "white", fontWeight: 700, fontSize: "1rem" }}
                >
                  🏪
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: "text.primary" }}
                >
                  Current Listings
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", fontWeight: 500 }}
                >
                  Active marketplace listings for this collection
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Chip
                label={`${listings.length} Listings`}
                size="medium"
                color="primary"
                variant="filled"
                sx={{
                  fontWeight: 600,
                  boxShadow: `0 2px 8px ${alpha(
                    theme.palette.primary.main,
                    0.2
                  )}`,
                }}
              />
              {listingsLoading && (
                <CircularProgress
                  size={20}
                  sx={{ color: theme.palette.primary.main }}
                />
              )}
            </Box>
          </Box>
        </Box>

        <Box sx={{ p: 0 }}>
          {listingsLoading ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: 4,
                gap: 2,
              }}
            >
              <CircularProgress
                size={32}
                sx={{ color: theme.palette.primary.main }}
              />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                Loading listings...
              </Typography>
            </Box>
          ) : listings.length === 0 ? (
            <Box
              sx={{
                p: 4,
                textAlign: "center",
                background: `linear-gradient(135deg, ${alpha(
                  theme.palette.primary.main,
                  0.02
                )} 0%, ${alpha(theme.palette.secondary.main, 0.01)} 100%)`,
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                }}
              >
                <Typography sx={{ fontSize: "2rem" }}>🏪</Typography>
              </Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, mb: 1, color: "text.primary" }}
              >
                No Active Listings
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                No NFTs from this collection are currently listed for sale
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                p: 3,
                background: `linear-gradient(135deg, ${alpha(
                  theme.palette.background.paper,
                  0.5
                )} 0%, ${alpha(theme.palette.primary.main, 0.01)} 100%)`,
              }}
            >
              <Grid container spacing={3}>
                {(showAllListings ? listings : listings.slice(0, 3)).map(
                  (listing, index) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                      <Card
                        sx={{
                          p: 0,
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          borderRadius: 3,
                          overflow: "hidden",
                          background: `linear-gradient(135deg, ${alpha(
                            theme.palette.background.paper,
                            0.9
                          )} 0%, ${alpha(
                            theme.palette.primary.main,
                            0.02
                          )} 100%)`,
                          border: `1px solid ${alpha(
                            theme.palette.primary.main,
                            0.08
                          )}`,
                          boxShadow: `0 4px 20px ${alpha(
                            theme.palette.primary.main,
                            0.08
                          )}`,
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          position: "relative",
                          "&:hover": {
                            transform: "translateY(-8px) scale(1.02)",
                            boxShadow: `0 12px 40px ${alpha(
                              theme.palette.primary.main,
                              0.15
                            )}`,
                            border: `1px solid ${alpha(
                              theme.palette.primary.main,
                              0.2
                            )}`,
                          },
                          "&::before": {
                            content: '""',
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            height: "2px",
                            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            opacity: 0,
                            transition: "opacity 0.3s ease",
                          },
                          "&:hover::before": {
                            opacity: 1,
                          },
                        }}
                      >
                        <Box
                          sx={{
                            width: "100%",
                            height: 160,
                            position: "relative",
                            overflow: "hidden",
                            backgroundImage: listing.image
                              ? `url(${listing.image})`
                              : "none",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                            "&::before": {
                              content: '""',
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background: listing.image
                                ? `linear-gradient(135deg, ${alpha(
                                    "#000",
                                    0.1
                                  )} 0%, ${alpha("#000", 0.3)} 100%)`
                                : `linear-gradient(135deg, ${alpha(
                                    theme.palette.primary.main,
                                    0.1
                                  )} 0%, ${alpha(
                                    theme.palette.secondary.main,
                                    0.05
                                  )} 100%)`,
                            },
                          }}
                        >
                          {!listing.image && (
                            <Box
                              sx={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                width: 80,
                                height: 80,
                                borderRadius: 3,
                                backgroundColor: alpha(
                                  theme.palette.primary.main,
                                  0.1
                                ),
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: `2px solid ${alpha(
                                  theme.palette.primary.main,
                                  0.2
                                )}`,
                                backdropFilter: "blur(10px)",
                              }}
                            >
                              <Typography
                                sx={{
                                  color: theme.palette.primary.main,
                                  fontWeight: 700,
                                  fontSize: "2rem",
                                }}
                              >
                                #
                              </Typography>
                            </Box>
                          )}
                          <Box
                            sx={{
                              position: "absolute",
                              top: 12,
                              right: 12,
                              backgroundColor: alpha(
                                theme.palette.background.paper,
                                0.9
                              ),
                              borderRadius: 2,
                              px: 1.5,
                              py: 0.5,
                              backdropFilter: "blur(10px)",
                              border: `1px solid ${alpha(
                                theme.palette.primary.main,
                                0.1
                              )}`,
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 600, color: "text.primary" }}
                            >
                              #{listing.tokenId || index + 1}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              position: "absolute",
                              bottom: 12,
                              left: 12,
                              backgroundColor: alpha(
                                theme.palette.success.main,
                                0.9
                              ),
                              borderRadius: 2,
                              px: 1.5,
                              py: 0.5,
                              backdropFilter: "blur(10px)",
                              border: `1px solid ${alpha(
                                theme.palette.success.main,
                                0.3
                              )}`,
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 600, color: "white" }}
                            >
                              Listed
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ p: 2.5, flexGrow: 1 }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: 700,
                              mb: 1,
                              color: "text.primary",
                              lineHeight: 1.2,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {listing.name ||
                              `NFT #${listing.tokenId || index + 1}`}
                          </Typography>

                          {listing.price && (
                            <Box sx={{ mb: 1 }}>
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 700,
                                  color: theme.palette.primary.main,
                                  fontSize: "1rem",
                                }}
                              >
                                {formatAmount(Number(listing.price))} VOI
                              </Typography>
                              {/*<Typography
                                variant="caption"
                                sx={{ color: "text.secondary", fontWeight: 500 }}
                              >
                                ${((Number(listing.price) / 1e6) * 0.1).toFixed(2)} USD
                              </Typography>*/}
                            </Box>
                          )}

                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                backgroundColor: theme.palette.warning.main,
                                boxShadow: `0 0 8px ${alpha(
                                  theme.palette.warning.main,
                                  0.5
                                )}`,
                              }}
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontWeight: 500 }}
                            >
                              For Sale
                            </Typography>
                          </Box>
                        </Box>
                      </Card>
                    </Grid>
                  )
                )}

                {/* Show More Card - only show if there are more than 3 listings and not showing all */}
                {!showAllListings && listings.length > 3 && (
                  <Grid item xs={12} sm={6} md={4} lg={3}>
                    <Card
                      sx={{
                        p: 0,
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        borderRadius: 3,
                        overflow: "hidden",
                        background: `linear-gradient(135deg, ${alpha(
                          theme.palette.background.paper,
                          0.9
                        )} 0%, ${alpha(
                          theme.palette.primary.main,
                          0.02
                        )} 100%)`,
                        border: `1px solid ${alpha(
                          theme.palette.primary.main,
                          0.08
                        )}`,
                        boxShadow: `0 4px 20px ${alpha(
                          theme.palette.primary.main,
                          0.08
                        )}`,
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        position: "relative",
                        cursor: "pointer",
                        "&:hover": {
                          transform: "translateY(-8px) scale(1.02)",
                          boxShadow: `0 12px 40px ${alpha(
                            theme.palette.primary.main,
                            0.15
                          )}`,
                          border: `1px solid ${alpha(
                            theme.palette.primary.main,
                            0.2
                          )}`,
                        },
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: "2px",
                          background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                          opacity: 0,
                          transition: "opacity 0.3s ease",
                        },
                        "&:hover::before": {
                          opacity: 1,
                        },
                      }}
                      onClick={() => setShowAllListings(true)}
                    >
                      <Box
                        sx={{
                          width: "100%",
                          height: 160,
                          position: "relative",
                          overflow: "hidden",
                          background: `linear-gradient(135deg, ${alpha(
                            theme.palette.primary.main,
                            0.1
                          )} 0%, ${alpha(
                            theme.palette.secondary.main,
                            0.05
                          )} 100%)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          <Box
                            sx={{
                              width: 60,
                              height: 60,
                              borderRadius: "50%",
                              backgroundColor: alpha(
                                theme.palette.primary.main,
                                0.1
                              ),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: `2px solid ${alpha(
                                theme.palette.primary.main,
                                0.2
                              )}`,
                            }}
                          >
                            <Typography
                              sx={{
                                color: theme.palette.primary.main,
                                fontWeight: 700,
                                fontSize: "1.5rem",
                              }}
                            >
                              +
                            </Typography>
                          </Box>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 700,
                              color: theme.palette.primary.main,
                              textAlign: "center",
                            }}
                          >
                            Show More
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              color: "text.secondary",
                              textAlign: "center",
                              fontWeight: 500,
                            }}
                          >
                            {listings.length - 3} more listings
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ p: 2.5, flexGrow: 1 }}>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              backgroundColor: theme.palette.info.main,
                              boxShadow: `0 0 8px ${alpha(
                                theme.palette.info.main,
                                0.5
                              )}`,
                            }}
                          />
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontWeight: 500 }}
                          >
                            View All Listings
                          </Typography>
                        </Box>
                      </Box>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </Box>
      </Card>

      {/* Sales History Section */}
      <Card
        sx={{
          mt: 3,
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.12)}`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
          background: `linear-gradient(135deg, ${alpha(
            theme.palette.background.paper,
            0.8
          )} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
          backdropFilter: "blur(10px)",
        }}
      >
        <Box
          sx={{
            p: 3,
            borderBottom: `1px solid ${alpha(
              theme.palette.primary.main,
              0.08
            )}`,
            background: `linear-gradient(135deg, ${alpha(
              theme.palette.primary.main,
              0.05
            )} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 4px 16px ${alpha(
                    theme.palette.primary.main,
                    0.3
                  )}`,
                }}
              >
                <Typography
                  sx={{ color: "white", fontWeight: 700, fontSize: "1rem" }}
                >
                  📈
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: "text.primary" }}
                >
                  Sales History
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", fontWeight: 500 }}
                >
                  Historical sales data and trends for this collection
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Chip
                label={`${sales.length} Sales`}
                size="medium"
                color="primary"
                variant="filled"
                sx={{
                  fontWeight: 600,
                  boxShadow: `0 2px 8px ${alpha(
                    theme.palette.primary.main,
                    0.2
                  )}`,
                }}
              />
              {salesLoading && (
                <CircularProgress
                  size={20}
                  sx={{ color: theme.palette.primary.main }}
                />
              )}
            </Box>
          </Box>
        </Box>

        <Box sx={{ p: 0 }}>
          {salesLoading ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: 4,
                gap: 2,
              }}
            >
              <CircularProgress
                size={32}
                sx={{ color: theme.palette.primary.main }}
              />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                Loading sales history...
              </Typography>
            </Box>
          ) : sales.length === 0 ? (
            <Box
              sx={{
                p: 4,
                textAlign: "center",
                background: `linear-gradient(135deg, ${alpha(
                  theme.palette.primary.main,
                  0.02
                )} 0%, ${alpha(theme.palette.secondary.main, 0.01)} 100%)`,
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                }}
              >
                <Typography sx={{ fontSize: "2rem" }}>📈</Typography>
              </Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, mb: 1, color: "text.primary" }}
              >
                No Sales Data
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                No sales have been recorded for this collection yet
              </Typography>
            </Box>
          ) : (
            <>
              {/* Sales Chart */}
              {sales.length > 1 && (
                <Box
                  sx={{
                    p: 3,
                    borderBottom: `1px solid ${alpha(
                      theme.palette.primary.main,
                      0.08
                    )}`,
                    background: `linear-gradient(135deg, ${alpha(
                      theme.palette.primary.main,
                      0.02
                    )} 0%, ${alpha(theme.palette.secondary.main, 0.01)} 100%)`,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 2,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 2,
                          background: `linear-gradient(135deg, #ff9800, #f57c00)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: `0 4px 16px ${alpha("#ff9800", 0.3)}`,
                        }}
                      >
                        <Typography
                          sx={{
                            color: "white",
                            fontWeight: 700,
                            fontSize: "0.875rem",
                          }}
                        >
                          📊
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 700, color: "text.primary" }}
                        >
                          Sales Price Trends
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: "text.secondary", fontWeight: 500 }}
                        >
                          Track sales performance over time
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Chip
                        label={`${sales.length} Data Points`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{
                          fontWeight: 600,
                          borderColor: alpha(theme.palette.primary.main, 0.3),
                        }}
                      />
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: "#ff9800",
                          boxShadow: `0 0 8px ${alpha("#ff9800", 0.5)}`,
                        }}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ height: 300 }}>
                    <Line
                      data={getSalesChartData()}
                      options={salesChartOptions}
                    />
                  </Box>
                </Box>
              )}

              {/* Sales Table */}
              <Box
                sx={{
                  p: 3,
                  background: `linear-gradient(135deg, ${alpha(
                    theme.palette.background.paper,
                    0.5
                  )} 0%, ${alpha(theme.palette.primary.main, 0.01)} 100%)`,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, mb: 2, color: "text.primary" }}
                >
                  Recent Sales
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow
                        sx={{
                          background: `linear-gradient(135deg, ${alpha(
                            theme.palette.primary.main,
                            0.03
                          )} 0%, ${alpha(
                            theme.palette.secondary.main,
                            0.02
                          )} 100%)`,
                        }}
                      >
                        <TableCell
                          sx={{ fontWeight: 700, color: "text.primary", py: 2 }}
                        >
                          Token ID
                        </TableCell>
                        <TableCell
                          sx={{ fontWeight: 700, color: "text.primary", py: 2 }}
                        >
                          Buyer
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 700, color: "text.primary", py: 2 }}
                        >
                          Price
                        </TableCell>
                        <TableCell
                          sx={{ fontWeight: 700, color: "text.primary", py: 2 }}
                        >
                          Date
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sales.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            sx={{ textAlign: "center", py: 4 }}
                          >
                            <Typography
                              variant="body1"
                              sx={{ color: "text.secondary", fontWeight: 500 }}
                            >
                              No sales data available for this collection
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        sales.slice(0, 10).map((sale, index) => {
                          // Handle different data structures
                          const buyer = sale.buyer || sale.sale?.buyer;
                          const price = sale.price || sale.sale?.price;
                          const timestamp =
                            sale.timestamp ||
                            sale.sale?.timestamp ||
                            sale.createTimestamp;
                          const tokenId = sale.tokenId || sale.token?.tokenId;

                          // Skip invalid timestamps (like the large placeholder number)
                          const isValidTimestamp =
                            timestamp && timestamp < 2000000000; // Reasonable timestamp check

                          return (
                            <TableRow
                              key={index}
                              sx={{
                                "&:hover": {
                                  backgroundColor: alpha(
                                    theme.palette.primary.main,
                                    0.04
                                  ),
                                  transform: "scale(1.001)",
                                },
                                transition: "all 0.2s ease-in-out",
                                borderBottom: `1px solid ${alpha(
                                  theme.palette.primary.main,
                                  0.05
                                )}`,
                              }}
                            >
                              <TableCell sx={{ py: 2.5 }}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 600,
                                    color: "text.primary",
                                  }}
                                >
                                  #{tokenId || index + 1}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 2.5 }}>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 2,
                                  }}
                                >
                                  <Avatar
                                    sx={{
                                      width: 32,
                                      height: 32,
                                      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                      fontWeight: 700,
                                      fontSize: "0.75rem",
                                    }}
                                  >
                                    {buyer?.slice(2, 4).toUpperCase() || "??"}
                                  </Avatar>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: 600,
                                      color: "text.primary",
                                    }}
                                  >
                                    {buyer ? shortenAddress(buyer) : "Unknown"}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="right" sx={{ py: 2.5 }}>
                                <Box sx={{ textAlign: "right" }}>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: 700,
                                      color: theme.palette.success.main,
                                    }}
                                  >
                                    {price
                                      ? formatAmount(Number(price))
                                      : "N/A"}{" "}
                                    VOI
                                  </Typography>
                                  {/*<Typography
                                variant="caption"
                                sx={{ color: "text.secondary" }}
                              >
                                    {price
                                      ? `$${(
                                          (Number(price) / 1e6) *
                                          0.1
                                        ).toFixed(2)} USD`
                                      : "N/A"}
                                  </Typography>*/}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ py: 2.5 }}>
                                {isValidTimestamp ? (
                                  <>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontWeight: 600,
                                        color: "text.primary",
                                      }}
                                    >
                                      {new Date(
                                        timestamp * 1000
                                      ).toLocaleDateString()}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      sx={{ color: "text.secondary" }}
                                    >
                                      {new Date(
                                        timestamp * 1000
                                      ).toLocaleTimeString()}
                                    </Typography>
                                  </>
                                ) : (
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: 600,
                                      color: "text.secondary",
                                    }}
                                  >
                                    N/A
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </>
          )}
        </Box>
      </Card>

      {/* Holdings Accordion */}
      <Accordion
        sx={{
          mt: 3,
          boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.12)}`,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
          background: `linear-gradient(135deg, ${alpha(
            theme.palette.background.paper,
            0.8
          )} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
          backdropFilter: "blur(10px)",
          "&:before": { display: "none" },
          "&.Mui-expanded": {
            margin: 0,
            boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.15)}`,
          },
        }}
      >
        <AccordionSummary
          expandIcon={
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.3s ease",
                "&:hover": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                  transform: "scale(1.1)",
                },
              }}
            >
              <ExpandMore
                sx={{ color: theme.palette.primary.main, fontSize: 20 }}
              />
            </Box>
          }
          sx={{
            background: `linear-gradient(135deg, ${alpha(
              theme.palette.primary.main,
              0.08
            )} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            borderRadius: 3,
            minHeight: 64,
            "&.Mui-expanded": {
              borderRadius: "12px 12px 0 0",
              minHeight: 64,
            },
            "&:hover": {
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.primary.main,
                0.12
              )} 0%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              width: "100%",
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 4px 16px ${alpha(
                  theme.palette.primary.main,
                  0.3
                )}`,
              }}
            >
              <Typography
                sx={{ color: "white", fontWeight: 700, fontSize: "1.2rem" }}
              >
                📦
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, mb: 0.5, color: "text.primary" }}
              >
                Your Holdings
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", fontWeight: 500 }}
              >
                Manage and view your NFT collection
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Chip
                label={`${userNFTs.length} NFTs`}
                size="medium"
                color="primary"
                variant="filled"
                sx={{
                  fontWeight: 600,
                  boxShadow: `0 2px 8px ${alpha(
                    theme.palette.primary.main,
                    0.2
                  )}`,
                }}
              />
              {nftsLoading && (
                <CircularProgress
                  size={20}
                  sx={{ color: theme.palette.primary.main }}
                />
              )}
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          {nftsLoading ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: 4,
                gap: 2,
              }}
            >
              <CircularProgress
                size={32}
                sx={{ color: theme.palette.primary.main }}
              />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                Loading your NFTs...
              </Typography>
            </Box>
          ) : userNFTs.length === 0 ? (
            <Box
              sx={{
                p: 4,
                textAlign: "center",
                background: `linear-gradient(135deg, ${alpha(
                  theme.palette.primary.main,
                  0.02
                )} 0%, ${alpha(theme.palette.secondary.main, 0.01)} 100%)`,
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                }}
              >
                <Typography sx={{ fontSize: "2rem" }}>📭</Typography>
              </Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, mb: 1, color: "text.primary" }}
              >
                No NFTs Found
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                You don't own any NFTs from this collection yet
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                p: 3,
                background: `linear-gradient(135deg, ${alpha(
                  theme.palette.background.paper,
                  0.5
                )} 0%, ${alpha(theme.palette.primary.main, 0.01)} 100%)`,
              }}
            >
              <Grid container spacing={3}>
                {userNFTs.map((nft, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                    <Card
                      sx={{
                        p: 0,
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        borderRadius: 3,
                        overflow: "hidden",
                        background: `linear-gradient(135deg, ${alpha(
                          theme.palette.background.paper,
                          0.9
                        )} 0%, ${alpha(
                          theme.palette.primary.main,
                          0.02
                        )} 100%)`,
                        border: `1px solid ${alpha(
                          theme.palette.primary.main,
                          0.08
                        )}`,
                        boxShadow: `0 4px 20px ${alpha(
                          theme.palette.primary.main,
                          0.08
                        )}`,
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        position: "relative",
                        "&:hover": {
                          transform: "translateY(-8px) scale(1.02)",
                          boxShadow: `0 12px 40px ${alpha(
                            theme.palette.primary.main,
                            0.15
                          )}`,
                          border: `1px solid ${alpha(
                            theme.palette.primary.main,
                            0.2
                          )}`,
                        },
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: "2px",
                          background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                          opacity: 0,
                          transition: "opacity 0.3s ease",
                        },
                        "&:hover::before": {
                          opacity: 1,
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: "100%",
                          height: 160,
                          position: "relative",
                          overflow: "hidden",
                          backgroundImage: nft.image
                            ? `url(${nft.image})`
                            : "none",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                          "&::before": {
                            content: '""',
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: nft.image
                              ? `linear-gradient(135deg, ${alpha(
                                  "#000",
                                  0.1
                                )} 0%, ${alpha("#000", 0.3)} 100%)`
                              : `linear-gradient(135deg, ${alpha(
                                  theme.palette.primary.main,
                                  0.1
                                )} 0%, ${alpha(
                                  theme.palette.secondary.main,
                                  0.05
                                )} 100%)`,
                          },
                        }}
                      >
                        {!nft.image && (
                          <Box
                            sx={{
                              position: "absolute",
                              top: "50%",
                              left: "50%",
                              transform: "translate(-50%, -50%)",
                              width: 80,
                              height: 80,
                              borderRadius: 3,
                              backgroundColor: alpha(
                                theme.palette.primary.main,
                                0.1
                              ),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: `2px solid ${alpha(
                                theme.palette.primary.main,
                                0.2
                              )}`,
                              backdropFilter: "blur(10px)",
                            }}
                          >
                            <Typography
                              sx={{
                                color: theme.palette.primary.main,
                                fontWeight: 700,
                                fontSize: "2rem",
                              }}
                            >
                              #
                            </Typography>
                          </Box>
                        )}
                        <Box
                          sx={{
                            position: "absolute",
                            top: 12,
                            right: 12,
                            backgroundColor: alpha(
                              theme.palette.background.paper,
                              0.9
                            ),
                            borderRadius: 2,
                            px: 1.5,
                            py: 0.5,
                            backdropFilter: "blur(10px)",
                            border: `1px solid ${alpha(
                              theme.palette.primary.main,
                              0.1
                            )}`,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 600, color: "text.primary" }}
                          >
                            #{nft.tokenId || index + 1}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ p: 2.5, flexGrow: 1 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 700,
                            mb: 1,
                            color: "text.primary",
                            lineHeight: 1.2,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {nft.name || `NFT #${nft.tokenId || index + 1}`}
                        </Typography>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              backgroundColor: theme.palette.success.main,
                              boxShadow: `0 0 8px ${alpha(
                                theme.palette.success.main,
                                0.5
                              )}`,
                            }}
                          />
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontWeight: 500 }}
                          >
                            Owned
                          </Typography>
                        </Box>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* My Collection Offers Accordion */}
      <Accordion
        sx={{
          mt: 3,
          boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.12)}`,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
          background: `linear-gradient(135deg, ${alpha(
            theme.palette.background.paper,
            0.8
          )} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
          backdropFilter: "blur(10px)",
          "&:before": { display: "none" },
          "&.Mui-expanded": {
            margin: 0,
            boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.15)}`,
          },
        }}
      >
        <AccordionSummary
          expandIcon={
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 4px 16px ${alpha(
                  theme.palette.primary.main,
                  0.3
                )}`,
              }}
            >
              <Typography
                sx={{ color: "white", fontWeight: 700, fontSize: "1rem" }}
              >
                📋
              </Typography>
            </Box>
          }
          sx={{
            borderRadius: 3,
            px: 3,
            py: 2,
            "&.Mui-expanded": {
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
            },
          }}
        >
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 2, flexGrow: 1 }}
          >
            <Box sx={{ flexGrow: 1 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, mb: 0.5, color: "text.primary" }}
              >
                My Collection Offers
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", fontWeight: 500 }}
              >
                Offers you've made on this collection
              </Typography>
            </Box>
            <Chip
              label={`${
                offers.filter(
                  (offer) => offer.offerer === activeAccount?.address
                ).length
              } My Offers`}
              size="medium"
              color="secondary"
              variant="filled"
              sx={{
                fontWeight: 600,
                boxShadow: `0 2px 8px ${alpha(
                  theme.palette.secondary.main,
                  0.2
                )}`,
              }}
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          {offers.filter((offer) => offer.offerer === activeAccount?.address)
            .length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No offers made
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You haven't made any offers on this collection yet
              </Typography>
            </Box>
          ) : (
            <Box sx={{ p: 3 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{ fontWeight: 700, color: "text.primary", py: 2 }}
                      >
                        Amount
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: "text.primary", py: 2 }}
                      >
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {offers
                      .filter(
                        (offer) => offer.offerer === activeAccount?.address
                      )
                      .map((offer, index) => (
                        <TableRow
                          key={offer.id}
                          sx={{
                            "&:hover": {
                              backgroundColor: alpha(
                                theme.palette.primary.main,
                                0.04
                              ),
                              transform: "scale(1.001)",
                            },
                            transition: "all 0.2s ease-in-out",
                            borderBottom: `1px solid ${alpha(
                              theme.palette.primary.main,
                              0.05
                            )}`,
                          }}
                        >
                          <TableCell sx={{ py: 2.5 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: "50%",
                                  background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  boxShadow: `0 2px 8px ${alpha(
                                    theme.palette.success.main,
                                    0.3
                                  )}`,
                                }}
                              >
                                <Typography
                                  sx={{
                                    color: "white",
                                    fontWeight: 700,
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  V
                                </Typography>
                              </Box>
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 700,
                                    color: "text.primary",
                                  }}
                                >
                                  {formatAmount(Number(offer.price))} VOI
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 2.5 }}>
                            <Box
                              sx={{
                                display: "flex",
                                gap: 1,
                                justifyContent: "flex-end",
                              }}
                            >
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => handleCancelOffer(offer)}
                                sx={{
                                  borderRadius: 2,
                                  fontWeight: 600,
                                  textTransform: "none",
                                  borderColor: alpha(
                                    theme.palette.error.main,
                                    0.3
                                  ),
                                  "&:hover": {
                                    backgroundColor: alpha(
                                      theme.palette.error.main,
                                      0.05
                                    ),
                                    borderColor: theme.palette.error.main,
                                    transform: "translateY(-1px)",
                                  },
                                }}
                              >
                                Cancel
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Filters */}
      <FilterSection sx={{ mt: 4 }}>
        <TextField
          placeholder="Search by offerer address..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filterStatus}
            label="Status"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="expired">Expired</MenuItem>
            <MenuItem value="accepted">Accepted</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={sortBy}
            label="Sort By"
            onChange={(e) =>
              setSortBy(e.target.value as "amount" | "timestamp")
            }
          >
            <MenuItem value="amount">Amount</MenuItem>
            <MenuItem value="timestamp">Time</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          size="small"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          startIcon={sortOrder === "desc" ? <TrendingDown /> : <TrendingUp />}
        >
          {sortOrder === "desc" ? "High to Low" : "Low to High"}
        </Button>
      </FilterSection>

      {/* Content */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : filteredOffers.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No offers found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filterStatus === "active"
              ? "No active offers for this collection"
              : "Try adjusting your filters"}
          </Typography>
        </Box>
      ) : (
        <Card
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.12)}`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
            background: `linear-gradient(135deg, ${alpha(
              theme.palette.background.paper,
              0.8
            )} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
            backdropFilter: "blur(10px)",
          }}
        >
          <Box
            sx={{
              p: 3,
              borderBottom: `1px solid ${alpha(
                theme.palette.primary.main,
                0.08
              )}`,
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.primary.main,
                0.05
              )} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 4px 16px ${alpha(
                      theme.palette.primary.main,
                      0.3
                    )}`,
                  }}
                >
                  <Typography
                    sx={{ color: "white", fontWeight: 700, fontSize: "1rem" }}
                  >
                    💰
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: "text.primary" }}
                  >
                    Collection Offers
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", fontWeight: 500 }}
                  >
                    {filteredOffers.length} active offers
                  </Typography>
                </Box>
              </Box>
              <Chip
                label={`${filteredOffers.length} Offers`}
                size="medium"
                color="primary"
                variant="filled"
                sx={{
                  fontWeight: 600,
                  boxShadow: `0 2px 8px ${alpha(
                    theme.palette.primary.main,
                    0.2
                  )}`,
                }}
              />
            </Box>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    background: `linear-gradient(135deg, ${alpha(
                      theme.palette.primary.main,
                      0.03
                    )} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
                  }}
                >
                  <TableCell
                    sx={{ fontWeight: 700, color: "text.primary", py: 2 }}
                  >
                    Offerer
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 700, color: "text.primary", py: 2 }}
                  >
                    Amount
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 700, color: "text.primary", py: 2 }}
                  >
                    Floor Difference
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOffers.map((offer, index) => (
                  <TableRow
                    key={offer.id}
                    sx={{
                      "&:hover": {
                        backgroundColor: alpha(
                          theme.palette.primary.main,
                          0.04
                        ),
                        transform: "scale(1.001)",
                      },
                      transition: "all 0.2s ease-in-out",
                      borderBottom: `1px solid ${alpha(
                        theme.palette.primary.main,
                        0.05
                      )}`,
                    }}
                  >
                    <TableCell sx={{ py: 2.5 }}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            fontWeight: 700,
                            fontSize: "0.875rem",
                          }}
                        >
                          {offer.offerer.slice(2, 4).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, color: "text.primary" }}
                          >
                            {shortenAddress(offer.offerer)}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: "text.secondary" }}
                          >
                            Wallet Address
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 2.5 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: 1.5,
                        }}
                      >
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: `0 2px 8px ${alpha(
                              theme.palette.success.main,
                              0.3
                            )}`,
                          }}
                        >
                          <Typography
                            sx={{
                              color: "white",
                              fontWeight: 700,
                              fontSize: "0.75rem",
                            }}
                          >
                            V
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700, color: "text.primary" }}
                          >
                            {formatAmount(Number(offer.price))} VOI
                          </Typography>
                          {/*<Typography
                            variant="caption"
                            sx={{ color: "text.secondary" }}
                          >
                            ${(Number(offer.price) * 0.1).toFixed(2)} USD
                          </Typography>*/}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 2.5 }}>
                      <Box sx={{ textAlign: "right" }}>
                        {offer.floorDifference !== undefined &&
                        offer.floorDifference !== null ? (
                          <Chip
                            label={`${
                              offer.floorDifference > 0 ? "+" : ""
                            }${offer.floorDifference.toFixed(1)}%`}
                            size="small"
                            sx={{
                              backgroundColor:
                                offer.floorDifference > 0
                                  ? alpha(theme.palette.success.main, 0.1)
                                  : alpha(theme.palette.error.main, 0.1),
                              color:
                                offer.floorDifference > 0
                                  ? theme.palette.success.main
                                  : theme.palette.error.main,
                              fontWeight: 600,
                              border: `1px solid ${
                                offer.floorDifference > 0
                                  ? alpha(theme.palette.success.main, 0.2)
                                  : alpha(theme.palette.error.main, 0.2)
                              }`,
                            }}
                          />
                        ) : (
                          <Typography
                            variant="caption"
                            sx={{ color: "text.secondary", fontWeight: 500 }}
                          >
                            N/A
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Modals */}
      <InstaSellModal
        open={instaSellModalOpen}
        onClose={() => setInstaSellModalOpen(false)}
        onConfirm={handleConfirmInstaSell}
        collectionId={collectionId || ""}
        activeAccount={activeAccount?.address || null}
        isDarkTheme={isDarkTheme}
        offers={offers.filter(
          (offer) => offer.offerer !== activeAccount?.address
        )}
        loading={actionLoading}
      />
      {false && <div>{/* OfferModal placeholder */}</div>}
      {/* Cancel Offer Modal */}
      <Dialog
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 24px 48px ${alpha(theme.palette.primary.main, 0.2)}`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            background: `linear-gradient(135deg, ${alpha(
              theme.palette.background.paper,
              0.95
            )} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
            backdropFilter: "blur(20px)",
          },
        }}
      >
        <DialogTitle
          sx={{
            textAlign: "center",
            py: 3,
            px: 4,
            borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              mb: 2,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 8px 24px ${alpha(theme.palette.error.main, 0.3)}`,
              }}
            >
              <Typography
                sx={{ color: "white", fontWeight: 700, fontSize: "1.5rem" }}
              >
                ⚠️
              </Typography>
            </Box>
          </Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, color: "text.primary", mb: 1 }}
          >
            Cancel Collection Offer
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", fontWeight: 500 }}
          >
            Are you sure you want to cancel this offer?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          {selectedOffer && (
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                mb: 3,
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, color: "text.primary", mb: 2 }}
              >
                Offer Details
              </Typography>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Amount:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: "text.primary" }}
                >
                  {formatAmount(Number(selectedOffer.price))} VOI
                </Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Offerer:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: "text.primary" }}
                >
                  {shortenAddress(selectedOffer.offerer)}
                </Typography>
              </Box>
            </Box>
          )}

          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Typography
              variant="body1"
              sx={{ color: "text.secondary", fontWeight: 500 }}
            >
              This action cannot be undone. The offer will be permanently
              removed from the marketplace.
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              gap: 2,
              justifyContent: "center",
              mt: 3,
            }}
          >
            <Button
              variant="outlined"
              onClick={() => setShowCancelModal(false)}
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                textTransform: "none",
                px: 4,
                py: 1.5,
                borderColor: alpha(theme.palette.grey[500], 0.3),
                "&:hover": {
                  backgroundColor: alpha(theme.palette.grey[500], 0.05),
                  borderColor: theme.palette.grey[500],
                },
              }}
            >
              Keep Offer
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={cancelSelectedOffer}
              disabled={actionLoading}
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                textTransform: "none",
                px: 4,
                py: 1.5,
                boxShadow: `0 4px 16px ${alpha(theme.palette.error.main, 0.3)}`,
                "&:hover": {
                  backgroundColor: theme.palette.error.dark,
                  boxShadow: `0 6px 20px ${alpha(
                    theme.palette.error.main,
                    0.4
                  )}`,
                  transform: "translateY(-1px)",
                },
                "&:disabled": {
                  backgroundColor: alpha(theme.palette.error.main, 0.3),
                  color: alpha(theme.palette.error.contrastText, 0.5),
                },
              }}
            >
              {actionLoading ? "Canceling..." : "Cancel Offer"}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default CollectionOffers;
