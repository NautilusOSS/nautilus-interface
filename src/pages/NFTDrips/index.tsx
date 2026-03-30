import { Box, Typography, CircularProgress, Tooltip } from "@mui/material";
import { useNFTDrips } from "../../hooks/useNFTDrips";
import Layout from "@/layouts/Default";
import InfoIcon from "@mui/icons-material/Info";
import { useState, useEffect } from "react";
import { RootState } from "@/store/store";
import { useSelector } from "react-redux";

// Replace imports with function definitions
const formatUnits = (value: any, decimals = 18) => {
  const stringValue = value.toString();
  const integerPart = stringValue.slice(0, -decimals) || "0";
  const fractionalPart = stringValue.slice(-decimals).padStart(decimals, "0");
  return `${integerPart}.${fractionalPart}`;
};

const formatCurrency = (
  value: number | string,
  decimals = 2,
  currency = "VOI"
) => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

// Add new interface for price data
interface PriceData {
  symbolA: string;
  symbolB: string;
  price: number;
}

const NFTDripsPage = () => {
  const { drips: nftDrips, loading, error } = useNFTDrips();
  const [prices, setPrices] = useState<PriceData[]>([]);
  const { isDarkTheme } = useSelector((state: RootState) => state.theme);

  const activeDrips = nftDrips?.filter((d) => d.active !== false) ?? [];

  // Add useEffect to fetch prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch(
          "https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/prices"
        );
        const data = await response.json();
        setPrices(data.prices);
      } catch (error) {
        console.error("Error fetching prices:", error);
      }
    };
    fetchPrices();
  }, []);

  // Weekly amount per NFT (biweekly drips count as half per week for value)
  const getWeeklyAmountPerNft = (drip: any) =>
    drip.period === "biweekly"
      ? parseFloat(drip.dripAmount) / 2
      : parseFloat(drip.dripAmount);

  // Add function to calculate weekly value
  const calculateWeeklyValue = (drip: any) => {
    const price = prices.find((p) => p.symbolA === drip.symbol)?.price || 1;
    const weeklyAmountPerNft = getWeeklyAmountPerNft(drip);
    const weeklyAmount = weeklyAmountPerNft * drip.collectionSupply;
    const weeklyValue = weeklyAmount / price;
    return weeklyValue;
  };

  // Update the stats section to include USD value (active drips only)
  const stats = [
    { label: "Total Collections", value: activeDrips.length },
    {
      label: "Total Weekly Value (VOI)",
      value: `${new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(
        activeDrips.reduce((acc, drip) => acc + calculateWeeklyValue(drip), 0)
      )}`,
    },
  ];

  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        gap={4}
        padding={{ xs: 2, sm: 4 }}
      >
        {/* Hero section skeleton */}
        <Box
          sx={{
            background: "linear-gradient(45deg, #1a237e 30%, #0d47a1 90%)",
            padding: { xs: 4, md: 8 },
            opacity: 0.7,
          }}
        >
          <Box
            sx={{
              height: 60,
              bgcolor: "rgba(255,255,255,0.1)",
              borderRadius: 1,
              mb: 2,
            }}
          />
          <Box
            sx={{
              height: 40,
              bgcolor: "rgba(255,255,255,0.1)",
              borderRadius: 1,
              width: "60%",
              mx: "auto",
            }}
          />
        </Box>

        {/* Grid skeleton */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(4, 1fr)",
            },
            gap: 2,
          }}
        >
          {[...Array(8)].map((_, i) => (
            <Box
              key={i}
              sx={{
                height: 300,
                bgcolor: "rgba(0,0,0,0.04)",
                borderRadius: 1,
                animation: "pulse 1.5s infinite",
                "@keyframes pulse": {
                  "0%": { opacity: 0.6 },
                  "50%": { opacity: 0.8 },
                  "100%": { opacity: 0.6 },
                },
              }}
            />
          ))}
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <Typography color="error">Error loading NFT drips data</Typography>
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          background: isDarkTheme
            ? "linear-gradient(45deg, #0d1b2a 30%, #1b263b 90%)"
            : "linear-gradient(45deg, #1a237e 30%, #0d47a1 90%)",
          position: "relative",
          color: "white",
          padding: { xs: 4, md: 8 },
          textAlign: "center",
          marginBottom: 4,
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.1,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          },
        }}
      >
        <Typography
          variant="h2"
          gutterBottom
          sx={{
            fontSize: { xs: "2rem", sm: "3rem", md: "3.75rem" },
          }}
        >
          NFT Drips
        </Typography>
        <Typography
          variant="h6"
          sx={{
            fontSize: { xs: "1rem", sm: "1.25rem" },
          }}
        >
          Discover and track NFT collections with automated weekly distributions
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "center",
            gap: { xs: 2, sm: 4 },
            marginTop: 3,
          }}
        >
          {stats.map((stat) => (
            <Box
              key={stat.label}
              sx={{
                transition: "transform 0.2s",
                "&:hover": {
                  transform: "scale(1.05)",
                },
              }}
            >
              <Typography variant="h4">{stat.value}</Typography>
              <Typography variant="body1">{stat.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
      <Layout>
        <Box padding={{ xs: 2, sm: 4 }}>
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              fontSize: { xs: "1.5rem", sm: "2rem", md: "2.125rem" },
            }}
          >
            NFT Drips
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
                lg: "repeat(4, 1fr)",
              },
              gap: 2,
            }}
          >
            {activeDrips.map((drip, index) => (
              <Box
                key={drip.collectionId.toString()}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  padding: { xs: 1.5, sm: 2 },
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  height: "100%",
                  transition: "all 0.3s ease",
                  backgroundColor: isDarkTheme
                    ? "rgba(0, 0, 0, 0.2)"
                    : "transparent",
                  animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`,
                  "@keyframes fadeIn": {
                    from: { opacity: 0, transform: "translateY(20px)" },
                    to: { opacity: 1, transform: "translateY(0)" },
                  },
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: (theme) => theme.shadows[4],
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    flex: 1,
                  }}
                >
                  <Box
                    component="img"
                    src={
                      drip.collectionImage ||
                      `https://prod.cdn.highforge.io/i/https%3A%2F%2Fprod.cdn.highforge.io%2Fm%2F${drip.collectionId}%2F1.json%23arc3?w=480`
                    }
                    alt={`Collection ${drip.collectionId} image`}
                    sx={{
                      width: "100%",
                      aspectRatio: "1/1",
                      objectFit: "cover",
                      borderRadius: 1,
                      marginBottom: 1,
                    }}
                  />
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontSize: { xs: "1rem", sm: "1.25rem" },
                      }}
                    >
                      {drip.collectionName || `Collection ${drip.collectionId}`}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "0.875rem", sm: "1rem" },
                      }}
                    >
                      {drip.dripAmount}
                      {drip.isPercentage ? "%" : ""} {drip.symbol}{" "}
                      {drip.period === "biweekly" ? "biweekly" : "per week"}
                    </Typography>
                    {!drip.isPercentage && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: (theme) =>
                            isDarkTheme
                              ? "rgba(255, 255, 255, 0.7)"
                              : theme.palette.text.secondary,
                        }}
                      >
                        ≈{" "}
                        {formatCurrency(
                          calculateWeeklyValue(drip) / drip.collectionSupply
                        )}{" "}
                        / week
                      </Typography>
                    )}
                    {drip.note && (
                      <Typography
                        variant="caption"
                        sx={{
                          backgroundColor: "rgba(255, 255,255, 0.7)",
                          display: "block",
                          color: (theme) =>
                            theme.palette.mode === "dark"
                              ? "rgba(255, 255, 255, 0.7)"
                              : "text.secondary",
                          mt: 0.5,
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        }}
                      >
                        {drip.note}
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    marginTop: "auto",
                  }}
                >
                  <a
                    href={
                      drip.collectionId === 40408061
                        ? "/#/tools/frendrip"
                        : drip.collectionId === 447482
                          ? "/#/tools/pxlmobsznonedrip"
                          : drip.collectionId === 313597
                            ? "/#/tools/dorkdrip"
                            : drip.collectionId === 894888
                              ? "/#/tools/dorkv2drip"
                              : `/#/collection/${drip.nftDripAppId ?? drip.collectionId}`
                    }
                    target={
                      drip.collectionId === 40408061 ||
                      drip.collectionId === 447482 ||
                      drip.collectionId === 313597 ||
                      drip.collectionId === 894888
                        ? "_self"
                        : "_blank"
                    }
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none" }}
                  >
                    <Typography
                      component="button"
                      sx={{
                        border: "1px solid",
                        borderColor: "primary.main",
                        color: "primary.main",
                        borderRadius: 1,
                        padding: { xs: "6px 12px", sm: "8px 16px" },
                        fontSize: { xs: "0.875rem", sm: "1rem" },
                        cursor: "pointer",
                        backgroundColor: "transparent",
                        "&:hover": {
                          backgroundColor: "primary.main",
                          color: "white",
                        },
                      }}
                    >
                      {drip.collectionId === 40408061
                        ? "Claim FREN"
                        : drip.collectionId === 447482
                          ? "Claim PIX"
                          : drip.collectionId === 313597 ||
                              drip.collectionId === 894888
                            ? "Claim UNIT"
                            : "View Collection"}
                    </Typography>
                  </a>
                </Box>
              </Box>
            ))}
          </Box>

          {activeDrips.length === 0 && (
            <Typography textAlign="center" color="text.secondary">
              No NFT drips found
            </Typography>
          )}
        </Box>
      </Layout>
    </>
  );
};

export default NFTDripsPage;
