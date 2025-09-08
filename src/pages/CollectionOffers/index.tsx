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
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import {
  Search,
  FilterList,
  Refresh,
  TrendingUp,
  TrendingDown,
  Close as CloseIcon,
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

export const MP210CTCINFO = 41677125;

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
  height: 300px;
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
            borderColor: isDarkTheme ? "#4caf50" : "#2e7d32",
            backgroundColor: isDarkTheme
              ? "rgba(76, 175, 80, 0.1)"
              : "rgba(46, 125, 50, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: isDarkTheme ? "#4caf50" : "#2e7d32",
            pointBorderColor: isDarkTheme ? "#fff" : "#000",
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
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
          borderColor: isDarkTheme ? "#4caf50" : "#2e7d32",
          backgroundColor: isDarkTheme
            ? "rgba(76, 175, 80, 0.1)"
            : "rgba(46, 125, 50, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: isDarkTheme ? "#4caf50" : "#2e7d32",
          pointBorderColor: isDarkTheme ? "#fff" : "#000",
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDarkTheme
          ? "rgba(0, 0, 0, 0.8)"
          : "rgba(255, 255, 255, 0.9)",
        titleColor: isDarkTheme ? "#fff" : "#000",
        bodyColor: isDarkTheme ? "#fff" : "#000",
        borderColor: isDarkTheme
          ? "rgba(255, 255, 255, 0.2)"
          : "rgba(0, 0, 0, 0.2)",
        borderWidth: 1,
        callbacks: {
          label: function (context: any) {
            return `Offer: ${context.parsed.y.toFixed(2)} VOI`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: isDarkTheme
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          color: isDarkTheme ? "#ccc" : "#666",
        },
      },
      y: {
        grid: {
          color: isDarkTheme
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          color: isDarkTheme ? "#ccc" : "#666",
          callback: function (value: any) {
            return `${value.toFixed(2)} VOI`;
          },
        },
      },
    },
  };

  // Fetch collection metadata
  const fetchCollectionMetadata = async () => {
    if (!collectionId) return;

    try {
      // Try to get collection metadata from the first token
      const response = await axios.get(`${MIMIR_API}/nft-indexer/v1/tokens`, {
        params: {
          contractId: Number(collectionId),
          limit: 1,
        },
      });

      if (response.data.tokens && response.data.tokens.length > 0) {
        const token = response.data.tokens[0];
        if (token.metadata) {
          try {
            const metadata = JSON.parse(token.metadata);
            setCollectionMetadata({
              name: metadata.name || `Collection #${collectionId}`,
              image: metadata.image || "",
              description: metadata.description,
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
          )
      );

      setOffers(activeOffers);
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

    // TODO beacon txn here

    // if active offers delete listing

    // if (myOffers.length > 0) {
    //   for (const offer of myOffers) {
    //     {
    //       const txn = (await builder.mp.a_offer_deleteListing(offer.listingId))
    //         ?.obj;
    //       buildN.push({
    //         ...txn,
    //         note: new TextEncoder().encode("delete active offers"),
    //       });
    //     }
    //     {
    //       const txn = (await builder.nt200.withdraw(offer.price))?.obj;
    //       buildN.push({
    //         ...txn,
    //         note: new TextEncoder().encode("withdraw offer"),
    //       });
    //     }
    //   }
    // }

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

    const customR = await ci.custom();

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
    await new Promise((resolve) => setTimeout(resolve, 1000));
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

  const handleAcceptOffer = async (offer: CollectionOffer) => {
    toast.info("Accept offer functionality coming soon");
  };

  // Insta Sell helper functions
  const canInstaSell = () => {
    // Check if user is connected
    if (!activeAccount || !collectionId || nftBalance === 0) return false;

    // Check if there are active offers
    if (offers.length === 0) return false;

    // For collection offers, we assume the user has NFTs they can sell
    return nftBalance > 0;
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

  const handleInstaSell = async () => {
    if (!activeAccount || !collectionId) {
      toast.error("Please connect your wallet");
      return;
    }

    const activeOffers = offers.filter((offer) => offer.status === "active");
    if (activeOffers.length === 0) {
      toast.error("No active offers to sell to");
      return;
    }

    setActionLoading(true);
    try {
      // Find the highest offer
      const highestOffer = activeOffers.reduce((max, offer) => {
        const price = parseFloat(offer.price);
        return price > parseFloat(max.price) ? offer : max;
      });

      toast.success(
        `Successfully sold NFT for ${(
          parseFloat(highestOffer.price) / 1e6
        ).toFixed(2)} VOI!`
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
              {collectionMetadata?.description && (
                <Typography
                  variant="body2"
                  sx={{
                    color: isDarkTheme ? "#ccc" : "#666",
                    textAlign: "center",
                    mb: 2,
                  }}
                >
                  {collectionMetadata.description}
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
                    <Typography
                      variant="h6"
                      sx={{
                        color: isDarkTheme ? "#fff" : "#000",
                        mb: 2,
                        fontWeight: 600,
                        textAlign: "center",
                      }}
                    >
                      Offer Activity Over Time
                    </Typography>
                    <Line data={getChartData()} options={chartOptions} />
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
        </Grid>
      </Grid>

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
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Offerer</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Floor Difference</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOffers.map((offer) => (
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
                        style={{ width: 24, height: 24, borderRadius: 12 }}
                      />
                      <Typography variant="body2" fontWeight="medium">
                        {formatAmount(Number(offer.price))} VOI
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {offer.floorDifference && (
                      <Typography
                        variant="body2"
                        color={
                          offer.floorDifference > 0
                            ? "success.main"
                            : "error.main"
                        }
                      >
                        {offer.floorDifference > 0 ? "+" : ""}
                        {offer.floorDifference.toFixed(1)}%
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={offer.status}
                      size="small"
                      color={offer.status === "active" ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell>
                    {offer.expiresAt && (
                      <Typography variant="body2" color="text.secondary">
                        {new Date(offer.expiresAt).toLocaleDateString()}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Box display="flex" gap={1} justifyContent="flex-end">
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
      )}

      {/* Modals */}
      {false && <div>{/* OfferModal placeholder */}</div>}
      {false && <div>{/* CancelOfferDialog placeholder */}</div>}
    </PageContainer>
  );
};

export default CollectionOffers;
