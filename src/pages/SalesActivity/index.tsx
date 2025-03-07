import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Typography,
  Container,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { formatDistanceToNow } from "date-fns";
import { useMediaQuery } from "@mui/material";
import { Theme } from "@mui/material/styles";

interface SaleTransaction {
  transactionId: string;
  mpContractId: number;
  mpListingId: number;
  tokenId: string;
  seller: string;
  buyer: string;
  currency: number;
  price: number;
  round: number;
  timestamp: number;
  collectionId: number;
  listing: {
    transactionId: string;
    mpContractId: number;
    mpListingId: number;
    tokenId: string;
    seller: string;
    price: number;
    currency: number;
    createRound: number;
    createTimestamp: number;
    endTimestamp: number;
    royalty: string;
    collectionId: number;
  };
  token: {
    contractId: string;
    tokenId: string;
    tokenIndex: number;
    owner: string;
    approved: string;
    metadataURI: string;
    mintRound: number;
    metadata: string;
  };
  metadata: {
    name?: string;
    image?: string;
  };
}

interface Profile {
  name: string;
  address: string;
  avatar?: string;
}

interface ActivityRowProps {
  sale: SaleTransaction;
  formatAddress: (address: string) => string;
  formatPrice: (price: number) => string;
}

interface CollectionSummary {
  collectionId: number;
  sales: number;
  totalVolume: number;
  transactions: SaleTransaction[];
  name?: string;
  image?: string;
  uniqueTraders: number;
}

interface CollectionSummaryRowProps {
  collection: CollectionSummary;
  formatPrice: (price: number) => string;
}

const CollectionSummaryRow: React.FC<CollectionSummaryRowProps> = ({
  collection,
  formatPrice,
}) => {
  return (
    <TableRow key={collection.collectionId}>
      <TableCell>
        <Box 
          component="a"
          href={`/#/collection/${collection.collectionId}`}
          sx={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 2,
            textDecoration: 'none',
            color: 'inherit',
            '&:hover': {
              textDecoration: 'underline'
            }
          }}
        >
          {collection.image && (
            <Box
              component="img"
              src={collection.image}
              sx={{ width: 40, height: 40, borderRadius: 1 }}
              alt={collection.name || `Collection ${collection.collectionId}`}
            />
          )}
          <Typography>
            {collection.name || `Collection ${collection.collectionId}`}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>{collection.sales}</TableCell>
      <TableCell>{formatPrice(collection.totalVolume)}</TableCell>
    </TableRow>
  );
};

const ActivityRow: React.FC<ActivityRowProps> = ({
  sale,
  formatAddress,
  formatPrice,
}) => {
  const [tokenDetails, setTokenDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sellerProfile, setSellerProfile] = useState<Profile | null>(null);
  const [buyerProfile, setBuyerProfile] = useState<Profile | null>(null);
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  const fetchProfile = async (address: string): Promise<Profile | null> => {
    try {
      const response = await fetch(`https://api.envoi.sh/api/name/${address}`);
      const data = await response.json();
      if (data.results.length > 0) {
        const profile = data.results[0];
        return {
          name: profile.name,
          address: profile.address,
          avatar: profile.metadata?.avatar,
        };
      }
      return null;
    } catch (error) {
      console.error(`Error fetching profile for ${address}:`, error);
      return null;
    }
  };

  useEffect(() => {
    const fetchProfiles = async () => {
      const [sellerData, buyerData] = await Promise.all([
        fetchProfile(sale.seller),
        fetchProfile(sale.buyer),
      ]);
      setSellerProfile(sellerData);
      setBuyerProfile(buyerData);
    };

    fetchProfiles();
  }, [sale.seller, sale.buyer]);

  useEffect(() => {
    const fetchTokenDetails = async () => {
      try {
        const response = await fetch(
          `https://arc72-voi-mainnet.nftnavigator.xyz/nft-indexer/v1/tokens?contractId=${sale.token.contractId}&tokenId=${sale.token.tokenId}`
        );
        const data = await response.json();
        const tokenDetails = data.tokens[0];
        setTokenDetails({
          ...tokenDetails,
          metadata: JSON.parse(tokenDetails.metadata || "{}"),
        });
      } catch (error) {
        console.error("Error fetching token details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokenDetails();
  }, [sale.token.contractId, sale.token.tokenId]);

  return (
    <TableRow key={sale.transactionId}>
      <TableCell>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            "& a": {
              textDecoration: "none",
              color: "inherit",
              "&:hover": {
                textDecoration: "underline",
              },
            },
          }}
        >
          {isLoading ? (
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: isDarkTheme ? "rgba(255, 255, 255, 0.12)" : "grey.300",
                borderRadius: 1,
              }}
            />
          ) : (
            sale.metadata?.image && (
              <Box
                component="a"
                href={`/#/collection/${sale.token.contractId}/token/${sale.token.tokenId}`}
                sx={{ display: "block" }}
              >
                <Box
                  component="img"
                  src={sale.metadata.image}
                  sx={{ width: 40, height: 40, borderRadius: 1 }}
                  alt={sale.metadata?.name || "NFT"}
                />
              </Box>
            )
          )}
          <Typography
            component="a"
            href={`/#/collection/${sale.token.contractId}/token/${sale.token.tokenId}`}
          >
            {tokenDetails?.metadata?.name ||
              sale.metadata?.name ||
              sale.tokenId}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Chip
          avatar={
            sellerProfile?.avatar ? (
              <Box
                component="img"
                src={sellerProfile.avatar}
                sx={{ width: 24, height: 24, borderRadius: "50%" }}
                alt={sellerProfile.name}
              />
            ) : undefined
          }
          label={sellerProfile?.name || formatAddress(sale.seller)}
          variant="outlined"
          size="small"
          component="a"
          href={`/#/account/${sale.seller}`}
          clickable
          sx={{
            cursor: "pointer",
            borderColor: isDarkTheme
              ? "rgba(255, 255, 255, 0.23)"
              : "rgba(0, 0, 0, 0.23)",
            color: isDarkTheme ? "rgba(255, 255, 255, 0.87)" : "inherit",
            "&:hover": {
              backgroundColor: isDarkTheme
                ? "rgba(255, 255, 255, 0.08)"
                : "rgba(0, 0, 0, 0.04)",
            },
          }}
        />
      </TableCell>
      <TableCell>
        <Chip
          avatar={
            buyerProfile?.avatar ? (
              <Box
                component="img"
                src={buyerProfile.avatar}
                sx={{ width: 24, height: 24, borderRadius: "50%" }}
                alt={buyerProfile.name}
              />
            ) : undefined
          }
          label={buyerProfile?.name || formatAddress(sale.buyer)}
          variant="outlined"
          size="small"
          component="a"
          href={`/#/account/${sale.buyer}`}
          clickable
          sx={{
            cursor: "pointer",
            borderColor: isDarkTheme
              ? "rgba(255, 255, 255, 0.23)"
              : "rgba(0, 0, 0, 0.23)",
            color: isDarkTheme ? "rgba(255, 255, 255, 0.87)" : "inherit",
            "&:hover": {
              backgroundColor: isDarkTheme
                ? "rgba(255, 255, 255, 0.08)"
                : "rgba(0, 0, 0, 0.04)",
            },
          }}
        />
      </TableCell>
      <TableCell>{formatPrice(sale.price)}</TableCell>
      <TableCell>
        {formatDistanceToNow(new Date(sale.timestamp * 1000), {
          addSuffix: true,
        })}
      </TableCell>
    </TableRow>
  );
};

// Add these new card components after the existing row components
interface ActivityCardProps {
  sale: SaleTransaction;
  formatAddress: (address: string) => string;
  formatPrice: (price: number) => string;
}

const ActivityCard: React.FC<ActivityCardProps> = ({
  sale,
  formatAddress,
  formatPrice,
}) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  // Fix the swapped state variables
  const [tokenDetails, setTokenDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sellerProfile, setSellerProfile] = useState<Profile | null>(null);
  const [buyerProfile, setBuyerProfile] = useState<Profile | null>(null);

  const fetchProfile = async (address: string): Promise<Profile | null> => {
    try {
      const response = await fetch(`https://api.envoi.sh/api/name/${address}`);
      const data = await response.json();
      if (data.results.length > 0) {
        const profile = data.results[0];
        return {
          name: profile.name,
          address: profile.address,
          avatar: profile.metadata?.avatar,
        };
      }
      return null;
    } catch (error) {
      console.error(`Error fetching profile for ${address}:`, error);
      return null;
    }
  };

  useEffect(() => {
    const fetchProfiles = async () => {
      const [sellerData, buyerData] = await Promise.all([
        fetchProfile(sale.seller),
        fetchProfile(sale.buyer),
      ]);
      setSellerProfile(sellerData);
      setBuyerProfile(buyerData);
    };

    fetchProfiles();
  }, [sale.seller, sale.buyer]);

  useEffect(() => {
    const fetchTokenDetails = async () => {
      try {
        const response = await fetch(
          `https://arc72-voi-mainnet.nftnavigator.xyz/nft-indexer/v1/tokens?contractId=${sale.token.contractId}&tokenId=${sale.token.tokenId}`
        );
        const data = await response.json();
        const tokenDetails = data.tokens[0];
        setTokenDetails({
          ...tokenDetails,
          metadata: JSON.parse(tokenDetails.metadata || "{}"),
        });
      } catch (error) {
        console.error("Error fetching token details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokenDetails();
  }, [sale.token.contractId, sale.token.tokenId]);

  return (
    <Paper
      sx={{
        p: 1.5,
        mb: 1.5,
        backgroundColor: isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "#fff",
        borderColor: isDarkTheme
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(0, 0, 0, 0.12)",
        "& .MuiTypography-root": {
          color: isDarkTheme ? "rgba(255, 255, 255, 0.87)" : "inherit",
        },
        "& .MuiTypography-caption": {
          color: isDarkTheme ? "rgba(255, 255, 255, 0.6)" : "text.secondary",
        },
        "& .MuiChip-outlined": {
          borderColor: isDarkTheme
            ? "rgba(255, 255, 255, 0.2)"
            : "rgba(0, 0, 0, 0.23)",
          color: isDarkTheme ? "rgba(255, 255, 255, 0.87)" : "inherit",
          "&:hover": {
            backgroundColor: isDarkTheme
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.04)",
          },
        },
        "& a": {
          textDecoration: "none",
          color: "inherit",
          "&:hover": {
            textDecoration: "underline",
          },
        },
      }}
      elevation={isDarkTheme ? 0 : 1}
      variant={isDarkTheme ? "outlined" : "elevation"}
    >
      <Box
        component="a"
        href={`/#/nft/${sale.token.contractId}/${sale.token.tokenId}`}
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 1.5,
        }}
      >
        {sale.metadata?.image && (
          <Box
            component="img"
            src={sale.metadata.image}
            sx={{ width: 48, height: 48, borderRadius: 1, mr: 1.5 }}
            alt={sale.metadata?.name || "NFT"}
          />
        )}
        <Typography variant="subtitle1">
          {tokenDetails?.metadata?.name || sale.metadata?.name || sale.tokenId}
        </Typography>
      </Box>

      <Grid container spacing={1} sx={{ fontSize: "0.875rem" }}>
        <Grid item xs={6}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Seller
            </Typography>
            <Chip
              avatar={
                sellerProfile?.avatar ? (
                  <Box
                    component="img"
                    src={sellerProfile.avatar}
                    sx={{ width: 20, height: 20, borderRadius: "50%" }}
                    alt={sellerProfile.name}
                  />
                ) : undefined
              }
              label={sellerProfile?.name || formatAddress(sale.seller)}
              variant="outlined"
              size="small"
              component="a"
              href={`/#/account/${sale.seller}`}
              clickable
              sx={{
                height: "24px",
                "& .MuiChip-label": {
                  fontSize: "0.75rem",
                  px: 1,
                },
              }}
            />
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Buyer
            </Typography>
            <Chip
              avatar={
                buyerProfile?.avatar ? (
                  <Box
                    component="img"
                    src={buyerProfile.avatar}
                    sx={{ width: 20, height: 20, borderRadius: "50%" }}
                    alt={buyerProfile.name}
                  />
                ) : undefined
              }
              label={buyerProfile?.name || formatAddress(sale.buyer)}
              variant="outlined"
              size="small"
              component="a"
              href={`/#/account/${sale.buyer}`}
              clickable
              sx={{
                height: "24px",
                "& .MuiChip-label": {
                  fontSize: "0.75rem",
                  px: 1,
                },
              }}
            />
          </Box>
        </Grid>
        <Grid item xs={6} sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Price
          </Typography>
          <Typography variant="body2">{formatPrice(sale.price)} VOI</Typography>
        </Grid>
        <Grid item xs={6} sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Time
          </Typography>
          <Typography variant="body2">
            {formatDistanceToNow(new Date(sale.timestamp * 1000), {
              addSuffix: true,
            })}
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
};

// Add new CollectionCard component
interface CollectionCardProps {
  collection: CollectionSummary;
  formatPrice: (price: number) => string;
}

const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  formatPrice,
}) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  return (
    <Paper
      sx={{
        p: 1.5,
        mb: 1.5,
        backgroundColor: isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "#fff",
        borderColor: isDarkTheme
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(0, 0, 0, 0.12)",
        "& .MuiTypography-root": {
          color: isDarkTheme ? "rgba(255, 255, 255, 0.87)" : "inherit",
        },
        "& .MuiTypography-caption": {
          color: isDarkTheme ? "rgba(255, 255, 255, 0.6)" : "text.secondary",
        },
      }}
      elevation={isDarkTheme ? 0 : 1}
      variant={isDarkTheme ? "outlined" : "elevation"}
    >
      <Box 
        component="a"
        href={`/#/collection/${collection.collectionId}`}
        sx={{ 
          display: "flex", 
          alignItems: "center", 
          mb: 1.5 
        }}
      >
        {collection.image && (
          <Box
            component="img"
            src={collection.image}
            sx={{ width: 48, height: 48, borderRadius: 1, mr: 1.5 }}
            alt={collection.name || `Collection ${collection.collectionId}`}
          />
        )}
        <Typography variant="subtitle1">
          {collection.name || `Collection ${collection.collectionId}`}
        </Typography>
      </Box>

      <Grid container spacing={1} sx={{ fontSize: "0.875rem" }}>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary" display="block">
            Number of Sales
          </Typography>
          <Typography variant="body2">{collection.sales}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary" display="block">
            Total Volume
          </Typography>
          <Typography variant="body2">
            {formatPrice(collection.totalVolume)} VOI
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
};

const SalesActivity: React.FC = () => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const [salesData, setSalesData] = useState<SaleTransaction[]>([]);
  const [timeRange, setTimeRange] = useState<"24H" | "7D" | "30D" | "90D">(
    "24H"
  );
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [collectionData, setCollectionData] = useState<CollectionSummary[]>([]);
  const [collectionPage, setCollectionPage] = useState(0);
  const [collectionRowsPerPage, setCollectionRowsPerPage] = useState(5);

  // Add useMediaQuery hook
  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("sm")
  );

  // Add new state for collection filter
  const [selectedCollection, setSelectedCollection] = useState<number | "all">(
    "all"
  );

  // Add table styles for dark mode
  const tableStyles = {
    "& .MuiTableCell-root": {
      borderColor: isDarkTheme
        ? "rgba(255, 255, 255, 0.12)"
        : "rgba(224, 224, 224, 1)",
      color: isDarkTheme ? "rgba(255, 255, 255, 0.87)" : "inherit",
    },
    "& .MuiTableHead-root .MuiTableCell-root": {
      color: isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.87)",
      fontWeight: 600,
    },
    "& .MuiTableRow-root:hover": {
      backgroundColor: isDarkTheme
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(0, 0, 0, 0.04)",
    },
  };

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        const now = Math.floor(Date.now() / 1000);
        const timeRanges = {
          "24H": 24 * 60 * 60,
          "7D": 7 * 24 * 60 * 60,
          "30D": 30 * 24 * 60 * 60,
          "90D": 90 * 24 * 60 * 60,
        };
        const minTime = now - timeRanges[timeRange];

        const response = await fetch(
          `https://mainnet-idx.nautilus.sh/nft-indexer/v1/mp/sales?min-time=${minTime}&max-time=${now}&sort=-round`
        );
        const data = await response.json();
        const salesData = data.sales.map((sale: SaleTransaction) => ({
          ...sale,
          tokenId: sale.token.tokenId,
          collectionId: sale.listing.collectionId,
          metadata: JSON.parse(sale.token.metadata),
        }));

        // Group sales by collection and fetch collection info
        const groupedByCollection = await Promise.all(
          Object.entries(
            salesData.reduce(
              (acc: { [key: number]: CollectionSummary }, sale) => {
                const collectionId = sale.listing.collectionId;
                if (!acc[collectionId]) {
                  acc[collectionId] = {
                    collectionId,
                    sales: 0,
                    totalVolume: 0,
                    transactions: [],
                    name: undefined,
                    image: undefined,
                    uniqueTraders: 0,
                  };
                }
                acc[collectionId].sales += 1;
                acc[collectionId].totalVolume += sale.price;
                acc[collectionId].transactions.push(sale);
                return acc;
              },
              {}
            )
          ).map(async ([_, collection]) => {
            // Calculate unique traders
            const uniqueAddresses = new Set();
            collection.transactions.forEach((sale) => {
              uniqueAddresses.add(sale.seller);
              uniqueAddresses.add(sale.buyer);
            });
            collection.uniqueTraders = uniqueAddresses.size;

            try {
              const collectionResponse = await fetch(
                `https://arc72-voi-mainnet.nftnavigator.xyz/nft-indexer/v1/collections?contractId=${collection.collectionId}`
              );
              const collectionData = await collectionResponse.json();
              if (collectionData.collections?.[0]?.firstToken?.metadata) {
                const metadata = JSON.parse(
                  collectionData.collections[0].firstToken.metadata
                );
                collection.name = metadata.name?.replace(/[\s#]*\d+$/, "");
                collection.image = metadata.image;
              }
            } catch (error) {
              console.error(
                `Error fetching collection ${collection.collectionId}:`,
                error
              );
            }
            return collection;
          })
        );

        // Sort collections by total volume in descending order
        setCollectionData(
          groupedByCollection.sort((a, b) => b.totalVolume - a.totalVolume)
        );
        setSalesData(salesData);
      } catch (error) {
        console.error("Error fetching sales data:", error);
      }
    };

    fetchSalesData();
  }, [timeRange]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleTimeRangeChange = (period: "24H" | "7D" | "30D" | "90D") => {
    setTimeRange(period);
    setPage(0);
  };

  const handleCollectionPageChange = (event: unknown, newPage: number) => {
    setCollectionPage(newPage);
  };

  const handleCollectionRowsPerPageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCollectionRowsPerPage(parseInt(event.target.value, 10));
    setCollectionPage(0);
  };

  // Filter sales based on selected collection
  const filteredSales = salesData.filter(
    (sale) =>
      selectedCollection === "all" ||
      sale.listing.collectionId === selectedCollection
  );

  // Update pagination to use filtered sales
  const paginatedSales = filteredSales.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Add collection filter change handler
  const handleCollectionFilterChange = (
    event: SelectChangeEvent<number | "all">
  ) => {
    setSelectedCollection(event.target.value as number | "all");
    setPage(0); // Reset to first page when filter changes
  };

  const formatAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const formatPrice = (price: number) =>
    (price / 1e6).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Calculate pagination for collection data
  const paginatedCollections = collectionData.slice(
    collectionPage * collectionRowsPerPage,
    collectionPage * collectionRowsPerPage + collectionRowsPerPage
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" }, // Stack vertically on mobile
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" }, // Stretch buttons on mobile
          gap: 2, // Add gap between elements
          mb: 3,
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontSize: { xs: "1.5rem", sm: "2rem" }, // Smaller font on mobile
          }}
        >
          NFT Sales Activity
        </Typography>
        <ButtonGroup
          size="small"
          aria-label="time range selection"
          sx={{
            display: "flex", // Make buttons fill width on mobile
            "& .MuiButton-root": {
              flex: { xs: 1, sm: "initial" }, // Equal width buttons on mobile
            },
          }}
        >
          {["24H", "7D", "30D", "90D"].map((period) => (
            <Button
              key={period}
              onClick={() =>
                handleTimeRangeChange(period as "24H" | "7D" | "30D" | "90D")
              }
              variant={timeRange === period ? "contained" : "outlined"}
            >
              {period}
            </Button>
          ))}
        </ButtonGroup>
      </Box>

      <Grid container spacing={3}>
        {/* Collection Summary Table */}
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 3,
              backgroundColor: isDarkTheme ? "#161717" : "#fff",
              color: isDarkTheme ? "#fff" : "#000",
              mb: 3,
            }}
          >
            <Typography variant="h6" gutterBottom>
              Collection Summary
            </Typography>

            {isMobile ? (
              // Mobile Card View
              <Box>
                {paginatedCollections.map((collection) => (
                  <CollectionCard
                    key={collection.collectionId}
                    collection={collection}
                    formatPrice={formatPrice}
                  />
                ))}
              </Box>
            ) : (
              // Updated Desktop Table View
              <TableContainer>
                <Table sx={tableStyles}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Collection</TableCell>
                      <TableCell>Number of Sales</TableCell>
                      <TableCell>Total Volume (VOI)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedCollections.map((collection) => (
                      <CollectionSummaryRow
                        key={collection.collectionId}
                        collection={collection}
                        formatPrice={formatPrice}
                      />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <TablePagination
                component="div"
                count={collectionData.length}
                page={collectionPage}
                onPageChange={handleCollectionPageChange}
                rowsPerPage={collectionRowsPerPage}
                onRowsPerPageChange={handleCollectionRowsPerPageChange}
                rowsPerPageOptions={[5, 10, 25]}
                sx={{
                  color: isDarkTheme ? "#fff" : "#000",
                }}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Add Collection Filter before Sales Activity section */}
        <Grid item xs={12}>
          <FormControl
            fullWidth
            variant="outlined"
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                color: isDarkTheme ? "#fff" : "#000",
                "& fieldset": {
                  borderColor: isDarkTheme
                    ? "rgba(255, 255, 255, 0.23)"
                    : "rgba(0, 0, 0, 0.23)",
                },
                "&:hover fieldset": {
                  borderColor: isDarkTheme
                    ? "rgba(255, 255, 255, 0.4)"
                    : "rgba(0, 0, 0, 0.4)",
                },
              },
              "& .MuiFormLabel-root": {
                color: isDarkTheme
                  ? "rgba(255, 255, 255, 0.7)"
                  : "rgba(0, 0, 0, 0.7)",
              },
            }}
          >
            <InputLabel id="collection-filter-label">
              Filter by Collection
            </InputLabel>
            <Select
              labelId="collection-filter-label"
              value={selectedCollection}
              onChange={handleCollectionFilterChange}
              label="Filter by Collection"
            >
              <MenuItem value="all">All Collections</MenuItem>
              {collectionData.map((collection) => (
                <MenuItem
                  key={collection.collectionId}
                  value={collection.collectionId}
                >
                  {collection.name || `Collection ${collection.collectionId}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Sales Activity Table */}
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 3,
              backgroundColor: isDarkTheme ? "#161717" : "#fff",
              color: isDarkTheme ? "#fff" : "#000",
            }}
          >
            <Typography variant="h6" gutterBottom>
              Transactions
            </Typography>

            {isMobile ? (
              // Mobile Card View
              <Box>
                {paginatedSales.map((sale) => (
                  <ActivityCard
                    key={sale.transactionId}
                    sale={sale}
                    formatAddress={formatAddress}
                    formatPrice={formatPrice}
                  />
                ))}
              </Box>
            ) : (
              // Updated Desktop Table View
              <TableContainer>
                <Table sx={tableStyles}>
                  <TableHead>
                    <TableRow>
                      <TableCell>NFT</TableCell>
                      <TableCell>Seller</TableCell>
                      <TableCell>Buyer</TableCell>
                      <TableCell>Price (VOI)</TableCell>
                      <TableCell>Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedSales.map((sale) => (
                      <ActivityRow
                        key={sale.transactionId}
                        sale={sale}
                        formatAddress={formatAddress}
                        formatPrice={formatPrice}
                      />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <TablePagination
                component="div"
                count={filteredSales.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25, 50]}
                sx={{
                  color: isDarkTheme ? "#fff" : "#000",
                }}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default SalesActivity;
