import React from "react";
import { Card, CardContent, Typography, Box, Chip, Button } from "@mui/material";
import styled from "styled-components";
import { NFT_NAVIGATOR_API } from "@/config/arc72-idx";
import axios from "axios";
import { useState, useEffect } from "react";

const OfferCardWrapper = styled(Card)<{ $isDark?: boolean }>`
  background-color: ${(props) => (props.$isDark ? "#2a2a2a" : "#fff")};
  border: 1px solid ${(props) => (props.$isDark ? "#444" : "#e0e0e0")};
  transition: all 0.2s ease-in-out;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${(props) => 
      props.$isDark 
        ? "0 4px 20px rgba(255, 255, 255, 0.1)" 
        : "0 4px 20px rgba(0, 0, 0, 0.1)"
    };
  }
`;

const TokenImage = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 8px;
`;

const PriceText = styled(Typography)<{ $isDark?: boolean }>`
  color: ${(props) => (props.$isDark ? "#fff" : "#000")};
  font-weight: bold;
  font-size: 1.2rem;
`;

const AddressText = styled(Typography)<{ $isDark?: boolean }>`
  color: ${(props) => (props.$isDark ? "#ccc" : "#666")};
  font-family: monospace;
  font-size: 0.8rem;
`;

const StatusChip = styled(Chip)<{ $isExpired?: boolean }>`
  background-color: ${(props) => 
    props.$isExpired ? "#f44336" : "#4caf50"
  };
  color: white;
  font-size: 0.7rem;
`;

interface OfferCardProps {
  offer: {
    mpListingId: number;
    contractId: number;
    tokenId: number;
    offerer: string;
    price: number;
    currency: number;
    createTimestamp: number;
    expireTimestamp: number;
    active: number;
  };
  onCancel: (offerId: number) => void;
  isDarkTheme: boolean;
  approval?: any;
}

const OfferCard: React.FC<OfferCardProps> = ({
  offer,
  onCancel,
  isDarkTheme,
  approval,
}) => {
  const [tokenMetadata, setTokenMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTokenMetadata = async () => {
      try {
        const response = await axios.get(
          `${NFT_NAVIGATOR_API}/nft-indexer/v1/tokens?contractId=${offer.collectionId}&tokenId=${offer.tokenId}`
        );
        setTokenMetadata(response.data.tokens[0]);
      } catch (error) {
        console.error("Error fetching token metadata:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTokenMetadata();
  }, [offer.contractId, offer.tokenId]);

  const formatPrice = (price: number) => {
    return (price / 1e6).toFixed(2);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const isExpired = () => {
    return Date.now() / 1000 > offer.expireTimestamp;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <OfferCardWrapper $isDark={isDarkTheme}>
      <CardContent>
        {/* Token Image */}
        <Box sx={{ mb: 2 }}>
          {loading ? (
            <Box
              sx={{
                width: "100%",
                height: 200,
                backgroundColor: isDarkTheme ? "#444" : "#f0f0f0",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="body2" sx={{ color: isDarkTheme ? "#ccc" : "#666" }}>
                Loading...
              </Typography>
            </Box>
          ) : (
            <TokenImage
              src={tokenMetadata?.metadata?.image || "/placeholder-nft.png"}
              alt={`Token #${offer.tokenId}`}
              onError={(e) => {
                e.currentTarget.src = "/placeholder-nft.png";
              }}
            />
          )}
        </Box>

        {/* Token Info */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="h6"
            sx={{ color: isDarkTheme ? "#fff" : "#000", mb: 1 }}
          >
            {tokenMetadata?.metadata?.name || `Token #${offer.tokenId}`}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: isDarkTheme ? "#ccc" : "#666" }}
          >
            Collection #{offer.contractId}
          </Typography>
        </Box>

        {/* Offer Details */}
        <Box sx={{ mb: 2 }}>
          <PriceText $isDark={isDarkTheme}>
            {formatPrice(offer.price)} {offer.currency === 8324600 ? "VOI" : offer.currency}
          </PriceText>
          <AddressText $isDark={isDarkTheme}>
            From: {formatAddress(offer.offerer)}
          </AddressText>
        </Box>

        {/* Status and Dates */}
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <StatusChip
            label={isExpired() ? "Expired" : "Active"}
            $isExpired={isExpired()}
            size="small"
          />
          <Typography
            variant="caption"
            sx={{ color: isDarkTheme ? "#ccc" : "#666" }}
          >
            Expires: {formatDate(offer.expireTimestamp)}
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            fullWidth
            onClick={() => onCancel(offer.mpListingId)}
            sx={{
              color: isDarkTheme ? "#fff" : "#000",
              borderColor: isDarkTheme ? "#666" : "#ccc",
              "&:hover": {
                borderColor: isDarkTheme ? "#888" : "#999",
              },
            }}
          >
            Cancel Offer
          </Button>
        </Box>
      </CardContent>
    </OfferCardWrapper>
  );
};

export default OfferCard;
