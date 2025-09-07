import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Chip,
} from "@mui/material";
import axios from "axios";
import Layout from "@/layouts/Default";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

interface Offer {
  mpListingId: number;
  contractId: number;
  tokenId: number;
  offerer: string;
  price: number;
  currency: number;
  createTimestamp: number;
  expireTimestamp: number;
  active: number;
}

const OfferRow: React.FC<{ offer: Offer; isDarkTheme: boolean }> = ({
  offer,
  isDarkTheme,
}) => {
  const formatPrice = (price: number) => {
    return (price / 1e6).toFixed(2);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const isExpired = () => {
    return Date.now() / 1000 > offer.expireTimestamp;
  };

  return (
    <TableRow sx={{ backgroundColor: isDarkTheme ? "#2a2a2a" : "#fff" }}>
      <TableCell sx={{ color: isDarkTheme ? "#fff" : "#000" }}>
        {offer.contractId}
      </TableCell>
      <TableCell sx={{ color: isDarkTheme ? "#fff" : "#000" }}>
        {offer.tokenId}
      </TableCell>
      <TableCell sx={{ color: isDarkTheme ? "#fff" : "#000" }}>
        {offer.offerer}
      </TableCell>
      <TableCell sx={{ color: isDarkTheme ? "#fff" : "#000" }}>
        {formatPrice(offer.price)}{" "}
        {offer.currency === 8324600 ? "VOI" : offer.currency}
      </TableCell>
      <TableCell sx={{ color: isDarkTheme ? "#fff" : "#000" }}>
        {formatDate(offer.createTimestamp)}
      </TableCell>
      <TableCell>
        <Chip
          label={isExpired() ? "Expired" : "Active"}
          color={isExpired() ? "error" : "success"}
          size="small"
        />
      </TableCell>
    </TableRow>
  );
};

const MemoizedOfferRow = React.memo(OfferRow);

export const Offers: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const response = await axios.get(
          "https://mainnet-idx.nautilus.sh/nft-indexer/v1/mp/offers?active=1"
        );
        // Sort offers by createTimestamp in descending order (most recent first)
        const sortedOffers = response.data.offers.sort(
          (a: Offer, b: Offer) => b.createTimestamp - a.createTimestamp
        );
        setOffers(sortedOffers);
      } catch (error) {
        console.error("Error fetching offers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOffers();
  }, []);

  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{ color: isDarkTheme ? "#fff" : "#000", mb: 2 }}
        >
          Active Offers
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: isDarkTheme ? "#ccc" : "#666", mb: 4 }}
        >
          Browse all active offers on the marketplace
        </Typography>
      </Box>

      {isLoading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="200px"
        >
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          sx={{ backgroundColor: isDarkTheme ? "#1a1a1a" : "#fff" }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    color: isDarkTheme ? "#fff" : "#000",
                    fontWeight: "bold",
                  }}
                >
                  Collection ID
                </TableCell>
                <TableCell
                  sx={{
                    color: isDarkTheme ? "#fff" : "#000",
                    fontWeight: "bold",
                  }}
                >
                  Token ID
                </TableCell>
                <TableCell
                  sx={{
                    color: isDarkTheme ? "#fff" : "#000",
                    fontWeight: "bold",
                  }}
                >
                  Offerer
                </TableCell>
                <TableCell
                  sx={{
                    color: isDarkTheme ? "#fff" : "#000",
                    fontWeight: "bold",
                  }}
                >
                  Price
                </TableCell>
                <TableCell
                  sx={{
                    color: isDarkTheme ? "#fff" : "#000",
                    fontWeight: "bold",
                  }}
                >
                  Created
                </TableCell>
                <TableCell
                  sx={{
                    color: isDarkTheme ? "#fff" : "#000",
                    fontWeight: "bold",
                  }}
                >
                  Status
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {offers.map((offer) => (
                <MemoizedOfferRow
                  key={offer.mpListingId}
                  offer={offer}
                  isDarkTheme={isDarkTheme}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Layout>
  );
};

export default Offers;
