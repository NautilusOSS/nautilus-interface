import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Paper,
  Tabs,
  Tab,
  Skeleton,
} from "@mui/material";
import { formatAmount } from "../../utils/format";
import { shortenAddress } from "../../utils/string";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { IconButton } from "@mui/material";
import { toast } from "react-toastify";
import styled from "styled-components";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import Layout from "@/layouts/Default";
import { useName } from "@/hooks/useName";
import { useEnvoiResolver } from "@/hooks/useEnvoiResolver";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import OfferCard from "@/components/OfferCard";
import { useWallet } from "@txnlab/use-wallet-react";
import { getAlgorandClients } from "@/wallets";
import { abi, CONTRACT } from "ulujs";
import algosdk from "algosdk";

const ProfileSection = styled(Paper)<{ $isDark?: boolean }>`
  &.MuiPaper-root {
    padding: 32px;
    margin-bottom: 32px;
    display: flex;
    align-items: center;
    gap: 24px;
    background: ${({ $isDark }) =>
      $isDark ? "rgba(25, 25, 25, 0.95)" : "#ffffff"};
    border-radius: 16px;
    box-shadow: ${({ $isDark }) =>
      $isDark
        ? "0 8px 16px rgba(0, 0, 0, 0.4)"
        : "0 8px 16px rgba(0, 0, 0, 0.1)"};
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: ${({ $isDark }) =>
        $isDark
          ? "0 12px 20px rgba(0, 0, 0, 0.5)"
          : "0 12px 20px rgba(0, 0, 0, 0.15)"};
    }
  }
`;

const StatsCard = styled(Card)<{ $isDark?: boolean }>`
  &.MuiCard-root {
    margin-bottom: 32px;
    background: ${({ $isDark }) =>
      $isDark ? "rgba(25, 25, 25, 0.95)" : "#ffffff"};
    border-radius: 16px;
    box-shadow: ${({ $isDark }) =>
      $isDark
        ? "0 8px 16px rgba(0, 0, 0, 0.4)"
        : "0 8px 16px rgba(0, 0, 0, 0.1)"};
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
    }
  }
`;

const StatsGrid = styled(Grid)`
  padding: 16px;
`;

const StatItem = styled(Box)`
  text-align: center;
  padding: 24px;
  position: relative;

  &:not(:last-child)::after {
    content: "";
    position: absolute;
    right: 0;
    top: 20%;
    height: 60%;
    width: 1px;
    background: ${({ theme }) =>
      theme.isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  }
`;

const LargeAvatar = styled(Avatar)`
  width: 120px;
  height: 120px;
  border: 4px solid
    ${({ theme }) =>
      theme.isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.05);
  }
`;

const AddressBox = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StyledTypography = styled(Typography)<{ $isDark?: boolean }>`
  && {
    color: ${({ $isDark }) => ($isDark ? "#ffffff" : "#000000")};
  }
`;

const SecondaryText = styled(Typography)<{ $isDark?: boolean }>`
  && {
    color: ${({ $isDark }) => ($isDark ? "#999999" : "#666666")};
  }
`;

const StyledContentCopyIcon = styled(ContentCopyIcon)<{ $isDark?: boolean }>`
  && {
    color: ${({ $isDark }) => ($isDark ? "#ffffff" : "#000000")};
  }
`;

const SkeletonCard = styled(Card)<{ $isDark?: boolean }>`
  &.MuiCard-root {
    background: ${({ $isDark }) =>
      $isDark ? "rgba(25, 25, 25, 0.95)" : "#f8f8f8"};
    border: 1px solid
      ${({ $isDark }) => ($isDark ? "rgba(255, 255, 255, 0.1)" : "#e0e0e0")};
  }
`;

const TabsContainer = styled(Box)<{ $isDark?: boolean }>`
  margin-bottom: 16px;

  .MuiTabs-root {
    transition: all 0.3s ease;
  }

  @media (max-width: 600px) {
    .MuiTabs-root {
      border-right: 1px solid
        ${({ $isDark }) =>
          $isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)"};
    }
  }
`;

interface Offer {
  transactionId: string;
  mpContractId: number;
  mpListingId: number;
  contractId: number;
  tokenId: string;
  offerer: string;
  price: number;
  currency: number;
  createRound: number;
  createTimestamp: number;
  accept_id: string | null;
  delete_id: string | null;
  owner: string;
  active: number;
  collectionId: number;
}

const getColorFromAddress = (address: string) => {
  // Generate a hash from the address
  const hash = address.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  // Convert hash to HSL color (using hue rotation)
  // Using 50% saturation and 65% lightness for good visibility
  const hue = Math.abs(hash % 360);
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
      resolver.getProfileFromAddress(address).then((profile) => {
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

        await new Promise((resolve) => setTimeout(resolve, 1000));

        setOffers(data.offers);

        // Calculate stats
        const totalValue = data.offers.reduce(
          (sum: number, offer: Offer) => sum + offer.price,
          0
        );
        setStats({
          totalOffers: data.offers.length,
          totalValue: totalValue,
          averageOffer:
            data.offers.length > 0 ? totalValue / data.offers.length : 0,
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
      if (activeAccount && address && activeAccount.address === address) {
        const { algodClient } = getAlgorandClients();
        const ctcInfoNV = 8324600; // Nautilus Voi NV
        const ctcInfoMP213 = 8329112; // mp213 offers
        const ci = new CONTRACT(
          ctcInfoNV, // ctcInfoNV
          algodClient,
          undefined,
          abi.nt200,
          { addr: address, sk: new Uint8Array(0) }
        );
        const arc200_allowanceR = await ci.arc200_allowance(
          address,
          algosdk.getApplicationAddress(ctcInfoMP213)
        );
        console.log({ arc200_allowanceR });
        const arc200_allowance = arc200_allowanceR.success
          ? arc200_allowanceR.returnValue
          : BigInt(0);
        setApproval(arc200_allowance);
      }
    };

    fetchApproval();
  }, [activeAccount, address]);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(address || "");
    toast.success("Address copied to clipboard!");
  };

  if (loading) {
    return (
      <Layout>
        <Box p={3}>
          {/* Profile Link */}
          <Box mb={2}>
            <Link
              to={`/account/${address}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Typography>← Go to profile</Typography>
            </Link>
          </Box>

          {/* Profile Section Skeleton */}
          <ProfileSection $isDark={isDarkTheme}>
            <Skeleton variant="circular" width={96} height={96} />
            <Box sx={{ width: "100%" }}>
              <Skeleton variant="text" width={200} height={32} />
            </Box>
          </ProfileSection>

          {/* Stats Section Skeleton */}
          <StatsCard $isDark={isDarkTheme}>
            <StatsGrid container>
              {[1, 2, 3].map((item) => (
                <Grid item xs={12} sm={4} key={item}>
                  <StatItem>
                    <Skeleton variant="text" width={80} height={32} />
                    <Skeleton variant="text" width={120} height={24} />
                  </StatItem>
                </Grid>
              ))}
            </StatsGrid>
          </StatsCard>

          {/* Tabs Skeleton */}
          <TabsContainer $isDark={isDarkTheme}>
            <Tabs
              value={activeTab}
              orientation={isMobile ? "vertical" : "horizontal"}
              variant={isMobile ? "fullWidth" : "standard"}
              sx={{
                "& .MuiTab-root": {
                  fontSize: "1.1rem",
                  fontWeight: 500,
                  transition: "all 0.3s ease",
                  "&:hover": {
                    opacity: 0.8,
                    transform: isMobile
                      ? "translateX(-2px)"
                      : "translateY(-2px)",
                  },
                },
                "& .Mui-selected": {
                  fontWeight: 600,
                },
                borderBottom: !isMobile ? 1 : 0,
                borderColor: "divider",
              }}
            >
              <Tab
                label="Offers Made"
                value="maker"
                sx={{
                  color: isDarkTheme ? "#ffffff" : "#000000",
                  minHeight: isMobile ? "48px" : undefined,
                }}
              />
              <Tab
                label="Offers Received"
                value="taker"
                sx={{
                  color: isDarkTheme ? "#ffffff" : "#000000",
                  minHeight: isMobile ? "48px" : undefined,
                }}
              />
            </Tabs>
          </TabsContainer>

          {/* Offers Grid Skeleton */}
          <Grid container spacing={2}>
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item}>
                <SkeletonCard $isDark={isDarkTheme}>
                  <CardContent>
                    <Skeleton
                      variant="rectangular"
                      height={200}
                      sx={{
                        bgcolor: isDarkTheme
                          ? "rgba(255, 255, 255, 0.1)"
                          : "rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Box sx={{ mt: 1 }}>
                      <Skeleton
                        variant="text"
                        sx={{
                          bgcolor: isDarkTheme
                            ? "rgba(255, 255, 255, 0.1)"
                            : "rgba(0, 0, 0, 0.1)",
                        }}
                      />
                      <Skeleton
                        variant="text"
                        width="60%"
                        sx={{
                          bgcolor: isDarkTheme
                            ? "rgba(255, 255, 255, 0.1)"
                            : "rgba(0, 0, 0, 0.1)",
                        }}
                      />
                    </Box>
                  </CardContent>
                </SkeletonCard>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box p={3}>
        {/* Profile Link */}
        <Box mb={2}>
          <Link
            to={`/account/${address}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <Typography>← Go to profile</Typography>
          </Link>
        </Box>

        {/* Profile Section */}
        <ProfileSection $isDark={isDarkTheme}>
          <LargeAvatar
            src={profile?.metadata?.avatar}
            sx={{
              bgcolor: !profile?.metadata?.avatar
                ? getColorFromAddress(address || "")
                : "grey.200",
            }}
          >
            {!profile?.metadata?.avatar && (
              <AccountCircleIcon sx={{ width: "100%", height: "100%" }} />
            )}
          </LargeAvatar>
          <Box>
            <AddressBox>
              <StyledTypography variant="h5" $isDark={isDarkTheme}>
                {profile?.name || shortenAddress(address || "")}
              </StyledTypography>
              <IconButton onClick={handleCopyAddress} size="small">
                <StyledContentCopyIcon $isDark={isDarkTheme} />
              </IconButton>
            </AddressBox>
          </Box>
        </ProfileSection>

        {/* Stats Section */}
        <StatsCard $isDark={isDarkTheme}>
          <StatsGrid container>
            <Grid item xs={12} sm={4}>
              <StatItem>
                <StyledTypography variant="h6" $isDark={isDarkTheme}>
                  {stats.totalOffers}
                </StyledTypography>
                <SecondaryText $isDark={isDarkTheme}>
                  Active Offers
                </SecondaryText>
              </StatItem>
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatItem>
                <StyledTypography variant="h6" $isDark={isDarkTheme}>
                  {formatAmount(stats.totalValue)} VOI
                </StyledTypography>
                <SecondaryText $isDark={isDarkTheme}>Total Value</SecondaryText>
              </StatItem>
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatItem>
                <StyledTypography variant="h6" $isDark={isDarkTheme}>
                  {formatAmount(stats.averageOffer)} VOI
                </StyledTypography>
                <SecondaryText $isDark={isDarkTheme}>
                  Average Offer
                </SecondaryText>
              </StatItem>
            </Grid>
            {/*<Grid item xs={12} sm={3}>
              <StatItem>
                <StyledTypography variant="h6" $isDark={isDarkTheme}>
                  {approval !== null
                    ? `${formatAmount(Number(approval))} VOI`
                    : "-"}
                </StyledTypography>
                <SecondaryText $isDark={isDarkTheme}>
                  Spending Approval
                </SecondaryText>
              </StatItem>
            </Grid>*/}
          </StatsGrid>
        </StatsCard>

        {/* Tabs Section */}
        <TabsContainer $isDark={isDarkTheme}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            textColor="primary"
            indicatorColor="primary"
            orientation={window.innerWidth <= 600 ? "vertical" : "horizontal"}
            variant={window.innerWidth <= 600 ? "fullWidth" : "standard"}
            sx={{
              "& .MuiTab-root": {
                fontSize: "1.1rem",
                fontWeight: 500,
                transition: "all 0.3s ease",
                "&:hover": {
                  opacity: 0.8,
                  transform:
                    window.innerWidth <= 600
                      ? "translateX(-2px)"
                      : "translateY(-2px)",
                },
              },
              "& .Mui-selected": {
                fontWeight: 600,
              },
              borderBottom: window.innerWidth > 600 ? 1 : 0,
              borderColor: "divider",
            }}
          >
            <Tab
              label="Offers Made"
              value="maker"
              sx={{
                color: isDarkTheme ? "#ffffff" : "#000000",
                minHeight: window.innerWidth <= 600 ? "48px" : undefined,
              }}
            />
            <Tab
              label="Offers Received"
              value="taker"
              sx={{
                color: isDarkTheme ? "#ffffff" : "#000000",
                minHeight: window.innerWidth <= 600 ? "48px" : undefined,
              }}
            />
          </Tabs>
        </TabsContainer>

        {/* Active Offers Title */}
        <StyledTypography variant="h6" gutterBottom $isDark={isDarkTheme}>
          {activeTab === "maker" ? "Offers Made" : "Offers Received"}
        </StyledTypography>

        {/* Offers Grid */}
        <Grid container spacing={2}>
          {offers.length > 0 ? (
            offers.map((offer) => (
              <Grid item xs={12} sm={6} md={4} key={offer.transactionId}>
                <OfferCard offer={offer} isDarkTheme={isDarkTheme} />
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Box textAlign="center" py={4}>
                <StyledTypography variant="h6" $isDark={isDarkTheme}>
                  {activeTab === "maker"
                    ? "No offers made by this account"
                    : "No offers received by this account"}
                </StyledTypography>
              </Box>
            </Grid>
          )}
        </Grid>
      </Box>
    </Layout>
  );
};

export default AccountOffers;
