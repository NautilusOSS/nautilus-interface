import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import VoiPurchaseWidget from './index';

/**
 * Example component demonstrating different ways to use VoiPurchaseWidget
 */
const VoiPurchaseWidgetExample: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        VoiPurchaseWidget Examples
      </Typography>
      
      {/* Basic Usage */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Basic Usage
        </Typography>
        <VoiPurchaseWidget 
          walletAddress="EXAMPLE_WALLET_ADDRESS"
        />
      </Box>

      {/* Custom Text */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Custom Text
        </Typography>
        <VoiPurchaseWidget 
          walletAddress="EXAMPLE_WALLET_ADDRESS"
          title="Get VOI Tokens"
          subtitle="Purchase VOI to trade NFTs and participate in DeFi"
          clickText="Start purchasing now"
        />
      </Box>

      {/* Larger Widget */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Larger Widget
        </Typography>
        <VoiPurchaseWidget 
          walletAddress="EXAMPLE_WALLET_ADDRESS"
          width={600}
          height={700}
          title="VOI Token Purchase"
          subtitle="Buy VOI tokens with fiat currency"
        />
      </Box>

      {/* Direct Widget (No Banner) */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Direct Widget (No Banner)
        </Typography>
        <VoiPurchaseWidget 
          walletAddress="EXAMPLE_WALLET_ADDRESS"
          showBanner={false}
          width={400}
          height={500}
        />
      </Box>
    </Container>
  );
};

export default VoiPurchaseWidgetExample;
