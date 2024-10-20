import React from "react";
import { Paper, Typography, Grid, Box } from "@mui/material";

interface CostBreakdownProps {
  price: number; // Total sale price of the NFT
  marketplaceFeeRate: number; // Marketplace fee percentage (e.g., 0.025 for 2.5%)
  royaltyFeeRate: number; // Royalty fee percentage (e.g., 0.10 for 10%)
  symbol: string;
}

const CostBreakdown: React.FC<CostBreakdownProps> = ({
  price,
  marketplaceFeeRate,
  royaltyFeeRate,
  symbol,
}) => {
  // Calculations
  const marketplaceFee = price * marketplaceFeeRate;
  const royaltyFee = price * royaltyFeeRate;
  const proceeds = price - marketplaceFee - royaltyFee;

  return (
    <Box sx={{ padding: 2, margin: "0 auto", background: "#F0F0F0" }}>
      <Typography variant="h6" gutterBottom>
        Cost Breakdown
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Typography variant="body1" color="textSecondary">
            Price:
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="body1" align="right">
            {price.toFixed(2)} {symbol}
          </Typography>
        </Grid>

        <Grid item xs={6}>
          <Typography variant="body1" color="textSecondary">
            Marketplace Fee ({(marketplaceFeeRate * 100).toFixed(2)}%):
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="body1" align="right">
            {marketplaceFee.toFixed(2)} {symbol}
          </Typography>
        </Grid>

        <Grid item xs={6}>
          <Typography variant="body1" color="textSecondary">
            Royalty Fee ({(royaltyFeeRate * 100).toFixed(2)}%):
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="body1" align="right">
            {royaltyFee.toFixed(2)} {symbol}
          </Typography>
        </Grid>

        <Grid item xs={6}>
          <Typography variant="body1" color="textSecondary">
            Proceeds:
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="body1" align="right" fontWeight="bold">
            {proceeds.toFixed(2)} {symbol}
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CostBreakdown;
