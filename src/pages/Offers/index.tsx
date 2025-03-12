import React, { useEffect, useState } from "react";
import Layout from "../../layouts/Default";
import {
  Box,
  Grid,
  Skeleton,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Chip,
} from "@mui/material";
import { Link } from "react-router-dom";
import axios from "axios";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import moment from "moment";
import { compactAddress } from "../../utils/mp";
import { useEnvoiResolver } from "@/hooks/useEnvoiResolver";
import styled from "styled-components";

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
  owner: string;
  active: number;
  collectionId: number;
}

const StyledTableContainer = styled(TableContainer)<{ $isDarkTheme: boolean }>`
  background-color: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "#fff"};
  border-radius: 16px;
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "#D8D8E1"};

  .MuiTableCell-root {
    color: ${(props) => (props.$isDarkTheme ? "#fff" : "#000")};
    border-bottom: 1px solid
      ${(props) =>
        props.$isDarkTheme
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(0, 0, 0, 0.1)"};
  }

  .MuiTableRow-root:last-child .MuiTableCell-root {
    border-bottom: none;
  }

  .MuiTableRow-root:hover {
    background-color: ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 255, 255, 0.05)"
        : "rgba(0, 0, 0, 0.02)"};
  }

  .MuiTableHead-root .MuiTableRow-root {
    background-color: ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 255, 255, 0.05)"
        : "rgba(0, 0, 0, 0.02)"};
  }
`;

const formatPrice = (price: number) => {
  const value = price / 1e6;
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getColorFromAddress = (address: string) => {
  const hash = address.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 50%)`;
};

const OfferRow = ({ offer, isDarkTheme }: { offer: Offer; isDarkTheme: boolean }) => {
  const [offererName, setOffererName] = useState<string>(offer.offerer);
  const [offererProfile, setOffererProfile] = useState<any>(null);
  const [ownerName, setOwnerName] = useState<string>(offer.owner);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const { resolver } = useEnvoiResolver();

  useEffect(() => {
    // Fetch names and profiles
    resolver.http.getNameFromAddress(offer.offerer).then((res) => {
      if (res.length > 0 && !!res[0]) {
        setOffererName(res[0]);
        resolver.http.search(res[0]).then((res) => {
          if (res.length === 1) {
            setOffererProfile(res[0]);
          }
        });
      }
    });

    resolver.http.getNameFromAddress(offer.owner).then((res) => {
      if (res.length > 0 && !!res[0]) {
        setOwnerName(res[0]);
        resolver.http.search(res[0]).then((res) => {
          if (res.length === 1) {
            setOwnerProfile(res[0]);
          }
        });
      }
    });

    // Fetch token info
    axios
      .get(
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/tokens?contractId=${offer.contractId}&tokenId=${offer.tokenId}`
      )
      .then((response) => {
        if (response.data.tokens && response.data.tokens.length > 0) {
          setTokenInfo(response.data.tokens[0]);
        }
      })
      .catch(console.error);
  }, [offer]);

  const metadata = tokenInfo?.metadata ? JSON.parse(tokenInfo.metadata) : null;

  return (
    <TableRow>
      <TableCell>
        <Link
          to={`/collection/${offer.collectionId}/token/${offer.tokenId}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textDecoration: "none",
            color: isDarkTheme ? "#fff" : "inherit",
          }}
        >
          <Box
            component="img"
            src={
              metadata?.image
                ? metadata.image.indexOf("ipfs") !== -1
                  ? `https://ipfs.io/ipfs/${metadata.image.replace("ipfs://", "")}`
                  : metadata.image
                : "/placeholder.png"
            }
            alt={metadata?.name || `Token #${offer.tokenId}`}
            sx={{
              width: 40,
              height: 40,
              borderRadius: "8px",
              objectFit: "cover",
              backgroundColor: "rgba(0, 0, 0, 0.1)",
            }}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              e.currentTarget.src = "/placeholder.png";
            }}
          />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {metadata?.name || `Token #${offer.tokenId}`}
            </Typography>
          </Box>
        </Link>
      </TableCell>
      <TableCell>{formatPrice(offer.price)} VOI</TableCell>
      <TableCell>
        <Link to={`/account/${offer.offerer}`} style={{ textDecoration: "none" }}>
          <Chip
            avatar={
              <Avatar
                src={offererProfile?.metadata?.avatar || undefined}
                alt={offererName}
                sx={{
                  bgcolor: !offererProfile?.metadata?.avatar
                    ? compactAddress(offer.offerer) === offererName
                      ? "silver"
                      : getColorFromAddress(offer.offerer)
                    : undefined,
                }}
              >
                {!offererProfile?.metadata?.avatar && offererName[0].toUpperCase()}
              </Avatar>
            }
            label={offererName}
            variant="outlined"
            sx={{
              color: isDarkTheme ? "#fff" : "inherit",
              borderColor: isDarkTheme
                ? "rgba(255, 255, 255, 0.23)"
                : "rgba(0, 0, 0, 0.23)",
              "& .MuiChip-label": {
                maxWidth: "120px",
                overflow: "hidden",
                textOverflow: "ellipsis",
              },
            }}
          />
        </Link>
      </TableCell>
      <TableCell>
        <Link to={`/account/${offer.owner}`} style={{ textDecoration: "none" }}>
          <Chip
            avatar={
              <Avatar
                src={ownerProfile?.metadata?.avatar || undefined}
                alt={ownerName}
                sx={{
                  bgcolor: !ownerProfile?.metadata?.avatar
                    ? compactAddress(offer.owner) === ownerName
                      ? "silver"
                      : getColorFromAddress(offer.owner)
                    : undefined,
                }}
              >
                {!ownerProfile?.metadata?.avatar && ownerName[0].toUpperCase()}
              </Avatar>
            }
            label={ownerName}
            variant="outlined"
            sx={{
              color: isDarkTheme ? "#fff" : "inherit",
              borderColor: isDarkTheme
                ? "rgba(255, 255, 255, 0.23)"
                : "rgba(0, 0, 0, 0.23)",
              "& .MuiChip-label": {
                maxWidth: "120px",
                overflow: "hidden",
                textOverflow: "ellipsis",
              },
            }}
          />
        </Link>
      </TableCell>
      <TableCell>{moment(offer.createTimestamp * 1000).fromNow()}</TableCell>
    </TableRow>
  );
};

const MemoizedOfferRow = React.memo(OfferRow);

export const Offers: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isDarkTheme = useSelector((state: RootState) => state.theme.isDarkTheme);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const response = await axios.get(
          "https://mainnet-idx.nautilus.sh/nft-indexer/v1/mp/offers?active=1"
        );
        // Sort offers by createTimestamp in descending order (most recent first)
        const sortedOffers = response.data.offers.sort((a: Offer, b: Offer) => 
          b.createTimestamp - a.createTimestamp
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
          sx={{
            fontWeight: 600,
            color: isDarkTheme ? "#fff" : "#000",
            mb: 2,
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}
        >
          Active Offers
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
          }}
        >
          Browse all active offers for NFTs on the marketplace
        </Typography>
      </Box>

      <StyledTableContainer $isDarkTheme={isDarkTheme}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>NFT</TableCell>
              <TableCell>Offer Amount</TableCell>
              <TableCell>From</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Skeleton variant="rectangular" height={53} />
                </TableCell>
              </TableRow>
            ) : offers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No active offers found
                </TableCell>
              </TableRow>
            ) : (
              offers.map((offer) => (
                <MemoizedOfferRow
                  key={offer.transactionId}
                  offer={offer}
                  isDarkTheme={isDarkTheme}
                />
              ))
            )}
          </TableBody>
        </Table>
      </StyledTableContainer>
    </Layout>
  );
}; 