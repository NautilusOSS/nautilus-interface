import React from "react";
import { Paper, Typography, Grid, Box } from "@mui/material";

interface CostBreakdownProps {
  price: number; // Total sale price of the NFT
  marketplaceFeeRate: number; // Marketplace fee percentage (e.g., 0.025 for 2.5%)
  royaltyFeeRate: number; // Royalty fee percentage (e.g., 0.10 for 10%)
  gamesFeeRate: number; // Games fee percentage (e.g., 0.05 for 5%)
  symbol: string;
  darkMode?: boolean;
  sx?: React.CSSProperties;
}

const CostBreakdown: React.FC<CostBreakdownProps> = ({
  price,
  marketplaceFeeRate,
  royaltyFeeRate,
  gamesFeeRate,
  symbol,
  darkMode = false,
  sx,
}) => {
  // Calculations
  const marketplaceFee = price * marketplaceFeeRate;
  const royaltyFee = price * royaltyFeeRate;
  const gamesFee = price * gamesFeeRate;
  const proceeds = price - marketplaceFee - royaltyFee - gamesFee;

  return (
    <Box
      sx={{
        padding: 2,
        margin: "0 auto",
        background: darkMode ? "rgba(255, 255, 255, 0.05)" : "#F0F0F0",
        color: darkMode ? "white" : "inherit",
        ...sx,
      }}
    >
      <Typography
        variant="h6"
        gutterBottom
        color={darkMode ? "white" : "inherit"}
      >
        Cost Breakdown
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Typography
            variant="body1"
            color={darkMode ? "rgba(255, 255, 255, 0.7)" : "textSecondary"}
          >
            Price:
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="body1" align="right">
            {price.toFixed(2)} {symbol}
          </Typography>
        </Grid>

        <Grid item xs={6}>
          <Typography
            variant="body1"
            color={darkMode ? "rgba(255, 255, 255, 0.7)" : "textSecondary"}
          >
            Marketplace Fee ({(marketplaceFeeRate * 100).toFixed(2)}%):
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="body1" align="right">
            {marketplaceFee.toFixed(2)} {symbol}
          </Typography>
        </Grid>
        {royaltyFee > 0 ? (
          <>
            <Grid item xs={6}>
              <Typography
                variant="body1"
                color={darkMode ? "rgba(255, 255, 255, 0.7)" : "textSecondary"}
              >
                Royalty Fee ({(royaltyFeeRate * 100).toFixed(2)}%):
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body1" align="right">
                {royaltyFee.toFixed(2)} {symbol}
              </Typography>
            </Grid>
          </>
        ) : null}
        {gamesFee > 0 ? (
          <>
            <Grid item xs={6}>
              <Typography
                variant="body1"
                color={darkMode ? "rgba(255, 255, 255, 0.7)" : "textSecondary"}
              >
                Games Fee ({(gamesFeeRate * 100).toFixed(2)}%):
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body1" align="right">
                {gamesFee.toFixed(2)} {symbol}
              </Typography>
            </Grid>
          </>
        ) : null}
        <Grid item xs={6}>
          <Typography
            variant="body1"
            color={darkMode ? "rgba(255, 255, 255, 0.7)" : "textSecondary"}
          >
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
