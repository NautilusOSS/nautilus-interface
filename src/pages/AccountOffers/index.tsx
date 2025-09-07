import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Button,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { useEnvoiResolver } from "@/hooks/useEnvoiResolver";
import OfferCard from "@/components/OfferCard";
import { toast } from "react-toastify";
import { useWallet } from "@txnlab/use-wallet-react";
import { CONTRACT, abi } from "ulujs";
import BigNumber from "bignumber.js";
import { getAlgorandClients } from "@/wallets";
import algosdk from "algosdk";

interface Offer {
  mpListingId: number;
  contractId: number;
  tokenId: number;
  offerer: string;
  owner: string;
  price: number;
  currency: number;
  createTimestamp: number;
  expireTimestamp: number;
  active: number;
}

const getColorFromAddress = (address: string): string => {
  const hash = address.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 50%, 65%)`;
};

const AccountOffers: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const resolver = useEnvoiResolver();
  const [profile, setProfile] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"maker" | "taker">("maker");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const [stats, setStats] = useState({
    totalOffers: 0,
    totalValue: 0,
    averageOffer: 0,
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
  const [approval, setApproval] = useState<any>(null);
  const { activeAccount } = useWallet();

  useEffect(() => {
    if (resolver && address && !profile) {
      resolver.resolveName(address).then((profile) => {
        setProfile(profile);
      });
    }
  }, [resolver, address]);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const queryParam = activeTab === "maker" ? "offerer" : "owner";
        const response = await fetch(
          `https://mainnet-idx.nautilus.sh/nft-indexer/v1/mp/offers?active=1&${queryParam}=${address}`
        );
        const data = await response.json();

        // Normalize offer IDs before setting state
        const normalizedOffers = normalizeOffers(data.offers || []);

        setOffers(normalizedOffers);

        // Calculate stats
        const totalValue = normalizedOffers.reduce(
          (sum: number, offer: Offer) => sum + offer.price,
          0
        );
        setStats({
          totalOffers: normalizedOffers.length,
          totalValue: totalValue,
          averageOffer:
            normalizedOffers.length > 0
              ? totalValue / normalizedOffers.length
              : 0,
        });
      } catch (error) {
        console.error("Error fetching offers:", error);
      } finally {
        setLoading(false);
      }
    };

    if (address) {
      setLoading(true);
      fetchOffers();
    }
  }, [address, activeTab]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 600);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchApproval = async () => {
      if (!activeAccount) return;
      try {
        const ctcInfoMP213 = 8329112; // mp213 offers
        const ctcInfoNV = 8324600; // Nautilus Voi NV
        const { algodClient, indexerClient } = getAlgorandClients();
        const ci = new CONTRACT(
          ctcInfoMP213,
          algodClient,
          indexerClient,
          abi.custom,
          { addr: activeAccount.address, sk: new Uint8Array(0) }
        );
        const ciARC200 = new CONTRACT(
          ctcInfoNV,
          algodClient,
          indexerClient,
          abi.nt200,
          { addr: activeAccount.address, sk: new Uint8Array(0) }
        );
        const arc200_allowanceR = await ciARC200.arc200_allowance(
          activeAccount.address,
          algosdk.getApplicationAddress(ctcInfoMP213)
        );
        console.log({ arc200_allowanceR });
        const arc200_allowance = arc200_allowanceR.success
          ? arc200_allowanceR.returnValue
          : BigInt(0);
        setApproval(arc200_allowance);
      } catch (error) {
        console.error("Error fetching approval:", error);
      }
    };

    fetchApproval();
  }, [activeAccount]);

  const handleOfferCancel = (cancelledOfferId: number) => {
    setOffers((prevOffers) => {
      const offerToCancel = prevOffers.find(
        (offer) => offer.mpListingId === cancelledOfferId
      );
      if (!offerToCancel) {
        console.error("Offer not found for cancellation");
        return prevOffers;
      }

      const updatedOffers = prevOffers.filter((offer) => {
        return offer.mpListingId !== cancelledOfferId;
      });

      // Recalculate stats
      const totalValue = updatedOffers.reduce(
        (sum: number, offer: Offer) => sum + offer.price,
        0
      );
      setStats({
        totalOffers: updatedOffers.length,
        totalValue: totalValue,
        averageOffer:
          updatedOffers.length > 0 ? totalValue / updatedOffers.length : 0,
      });

      return updatedOffers;
    });
  };

  const normalizeOffers = (offers: any[]): Offer[] => {
    return offers.map((offer) => ({
      ...offer,
      mpListingId: offer.mpListingId || offer.listingId || offer.id,
    }));
  };

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Profile Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{ color: isDarkTheme ? "#fff" : "#000", mb: 1 }}
        >
          {profile?.name || address?.slice(0, 8) + "..." + address?.slice(-8)}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: isDarkTheme ? "#ccc" : "#666" }}
        >
          {address}
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ backgroundColor: isDarkTheme ? "#2a2a2a" : "#fff" }}>
            <CardContent>
              <Typography
                variant="h6"
                sx={{ color: isDarkTheme ? "#fff" : "#000" }}
              >
                {stats.totalOffers}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: isDarkTheme ? "#ccc" : "#666" }}
              >
                Active Offers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ backgroundColor: isDarkTheme ? "#2a2a2a" : "#fff" }}>
            <CardContent>
              <Typography
                variant="h6"
                sx={{ color: isDarkTheme ? "#fff" : "#000" }}
              >
                {(stats.totalValue / 1e6).toFixed(2)}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: isDarkTheme ? "#ccc" : "#666" }}
              >
                Total Value (VOI)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ backgroundColor: isDarkTheme ? "#2a2a2a" : "#fff" }}>
            <CardContent>
              <Typography
                variant="h6"
                sx={{ color: isDarkTheme ? "#fff" : "#000" }}
              >
                {(stats.averageOffer / 1e6).toFixed(2)}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: isDarkTheme ? "#ccc" : "#666" }}
              >
                Average Offer (VOI)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            "& .MuiTab-root": {
              color: isDarkTheme ? "#ccc" : "#666",
              "&.Mui-selected": {
                color: isDarkTheme ? "#fff" : "#000",
              },
            },
          }}
        >
          <Tab
            label="Offers Made"
            value="maker"
            sx={{ textTransform: "none" }}
          />
          <Tab
            label="Offers Received"
            value="taker"
            sx={{ textTransform: "none" }}
          />
        </Tabs>
      </Box>

      {/* Offers Grid Skeleton */}
      {loading && (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="200px"
        >
          <CircularProgress />
        </Box>
      )}

      {/* Stats Display */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h6"
          sx={{ color: isDarkTheme ? "#fff" : "#000", mb: 1 }}
        >
          {stats.totalOffers}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: isDarkTheme ? "#ccc" : "#666" }}
        >
          Active Offers
        </Typography>
      </Box>

      {/* Mobile Layout */}
      {isMobile ? (
        <Box>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="fullWidth"
            sx={{
              mb: 2,
              "& .MuiTab-root": {
                color: isDarkTheme ? "#ccc" : "#666",
                "&.Mui-selected": {
                  color: isDarkTheme ? "#fff" : "#000",
                },
              },
            }}
          >
            <Tab
              label="Offers Made"
              value="maker"
              sx={{ textTransform: "none" }}
            />
            <Tab
              label="Offers Received"
              value="taker"
              sx={{ textTransform: "none" }}
            />
          </Tabs>

          {/* Active Offers Title */}
          <Typography
            variant="h6"
            sx={{ color: isDarkTheme ? "#fff" : "#000", mb: 2 }}
          >
            {activeTab === "maker" ? "Offers Made" : "Offers Received"}
          </Typography>

          {/* Offers Grid */}
          <Grid container spacing={2}>
            {offers.length > 0 ? (
              offers.map((offer) => (
                <Grid item xs={12} key={offer.mpListingId}>
                  <OfferCard
                    offer={offer}
                    onCancel={handleOfferCancel}
                    isDarkTheme={isDarkTheme}
                    approval={approval}
                  />
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Card
                  sx={{
                    backgroundColor: isDarkTheme ? "#2a2a2a" : "#fff",
                    p: 3,
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      color: isDarkTheme ? "#ccc" : "#666",
                      textAlign: "center",
                    }}
                  >
                    No offers found
                  </Typography>
                </Card>
              </Grid>
            )}
          </Grid>
        </Box>
      ) : (
        /* Desktop Layout */
        <Box>
          <Typography
            variant="h6"
            sx={{ color: isDarkTheme ? "#fff" : "#000", mb: 2 }}
          >
            {activeTab === "maker" ? "Offers Made" : "Offers Received"}
          </Typography>

          {/* Offers Grid */}
          <Grid container spacing={2}>
            {offers.length > 0 ? (
              offers.map((offer) => (
                <Grid item xs={12} sm={6} md={4} key={offer.mpListingId}>
                  <OfferCard
                    offer={offer}
                    onCancel={handleOfferCancel}
                    isDarkTheme={isDarkTheme}
                    approval={approval}
                  />
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Card
                  sx={{
                    backgroundColor: isDarkTheme ? "#2a2a2a" : "#fff",
                    p: 3,
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      color: isDarkTheme ? "#ccc" : "#666",
                      textAlign: "center",
                    }}
                  >
                    No offers found
                  </Typography>
                </Card>
              </Grid>
            )}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default AccountOffers;
