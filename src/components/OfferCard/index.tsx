import React from "react";
import { Card, CardContent, Typography, Button, Skeleton } from "@mui/material";
import styled from "styled-components";
import { formatAmount } from "../../utils/format";
import { shortenAddress } from "../../utils/string";
import { NFT_NAVIGATOR_API } from "@/config/arc72-idx";

const OfferCardWrapper = styled(Card)<{ $isDark?: boolean }>`
  &.MuiCard-root {
    background: ${({ $isDark }) =>
      $isDark ? "rgba(25, 25, 25, 0.95)" : "#fafafa"};
    border: 1px solid
      ${({ $isDark }) => ($isDark ? "rgba(255, 255, 255, 0.1)" : "#e0e0e0")};
    transition: all 0.2s ease-in-out;
    &:hover {
      transform: translateY(-4px);
      background: ${({ $isDark }) =>
        $isDark ? "rgba(35, 35, 35, 0.95)" : "#fafafa"};
      box-shadow: 0 4px 12px
        rgba(0, 0, 0, ${({ $isDark }) => ($isDark ? "0.5" : "0.1")});
    }
  }
`;

const StyledTypography = styled(Typography)<{ $isDark?: boolean }>`
  && {
    color: ${({ $isDark }) => ($isDark ? "#ffffff" : "#000000")};
  }
`;

const StyledButton = styled(Button)<{ $isDark?: boolean }>`
  && {
    color: ${({ $isDark }) => ($isDark ? "#ffffff" : "#000000")};
    border-color: ${({ $isDark }) => ($isDark ? "#ffffff" : "#000000")};
    margin-top: 1rem;
    &:hover {
      border-color: ${({ $isDark }) => ($isDark ? "#ffffff" : "#000000")};
      background: ${({ $isDark }) =>
        $isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
    }
  }
`;

interface Offer {
  transactionId: string;
  tokenId: string;
  price: number;
  collectionId: number;
  createTimestamp: number;
}

interface TokenInfo {
  name?: string;
  image?: string;
}

interface OfferCardProps {
  offer: Offer;
  isDarkTheme: boolean;
}

const OfferCard: React.FC<OfferCardProps> = ({ offer, isDarkTheme }) => {
  const [tokenInfo, setTokenInfo] = React.useState<TokenInfo>();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!offer.collectionId || !offer.tokenId || tokenInfo) return;
    const fetchTokenInfo = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${NFT_NAVIGATOR_API}/nft-indexer/v1/tokens?contractId=${offer.collectionId}&tokenId=${offer.tokenId}`
        );
        const data = await response.json();
        if (data.tokens.length > 0) {
          const metadata = JSON.parse(data.tokens[0].metadata);
          console.log({ metadata });
          setTokenInfo({
            name: metadata.name,
            image: metadata.image,
          });
        }
      } catch (error) {
        console.error("Error fetching token info:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTokenInfo();
  }, [offer.collectionId, offer.tokenId]);

  const handleViewToken = () => {
    window.open(
      `/#/collection/${offer.collectionId}/token/${offer.tokenId}`,
      "_blank"
    );
  };

  return (
    <OfferCardWrapper $isDark={isDarkTheme}>
      <CardContent>
        {loading ? (
          <>
            <Skeleton 
              variant="rectangular" 
              width="100%" 
              height={200} 
              sx={{ bgcolor: isDarkTheme ? 'grey.800' : 'grey.200', marginBottom: '1rem' }} 
            />
            <Skeleton 
              variant="text" 
              width="60%" 
              sx={{ bgcolor: isDarkTheme ? 'grey.800' : 'grey.200' }} 
            />
            <Skeleton 
              variant="text" 
              width="40%" 
              sx={{ bgcolor: isDarkTheme ? 'grey.800' : 'grey.200' }} 
            />
            <Skeleton 
              variant="rectangular" 
              width="100%" 
              height={36} 
              sx={{ bgcolor: isDarkTheme ? 'grey.800' : 'grey.200', marginTop: '1rem' }} 
            />
          </>
        ) : (
          <>
            {tokenInfo?.name && (
              <StyledTypography variant="h6" $isDark={isDarkTheme}>
                {tokenInfo.name}
              </StyledTypography>
            )}
            {tokenInfo?.image && (
              <img
                style={{ width: "100%", marginBottom: "1rem" }}
                src={tokenInfo.image}
                alt={tokenInfo.name || "Token"}
              />
            )}
            {/*<StyledTypography variant="h6" $isDark={isDarkTheme}>
              Token ID: {offer.tokenId}
            </StyledTypography>*/}
            <StyledTypography $isDark={isDarkTheme}>
              Offer: {formatAmount(offer.price)} VOI
            </StyledTypography>
            {/*<StyledTypography $isDark={isDarkTheme}>
              Collection ID: {offer.collectionId}
            </StyledTypography>*/}
            <StyledTypography $isDark={isDarkTheme}>
              Created: {new Date(offer.createTimestamp * 1000).toLocaleString()}
            </StyledTypography>
            {/*<StyledTypography $isDark={isDarkTheme}>
              Transaction ID: {shortenAddress(offer.transactionId)}
            </StyledTypography>*/}
            <StyledButton
              variant="outlined"
              $isDark={isDarkTheme}
              onClick={handleViewToken}
              fullWidth
            >
              View Token Page
            </StyledButton>
          </>
        )}
      </CardContent>
    </OfferCardWrapper>
  );
};

export default OfferCard;
