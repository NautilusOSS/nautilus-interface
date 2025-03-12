import React from "react";
import MarketTable from "../MarketTable";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { Typography, Box } from "@mui/material";
import { useMarketplaceListings } from "@/hooks/mp";
import { TOKEN_NAUT_VOI_STAKING } from "@/contants/tokens";
import {
  computeListingDiscount,
  getStakingLockupTime,
  getStakingUnlockTime,
  getStakingVestingTime,
} from "@/utils/staking";
import humanizeDuration from "humanize-duration";
import moment from "moment";
import { ListingI } from "@/types";

// This should be replaced with an actual hook to fetch market data
const useMarketData = () => {
  // Simulated data
  const data = [
    {
      contractId: "1",
      contractAddress: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      totalStaked: "1000000",
      lockup: "30",
      vesting: "60",
      unlock: 1735689600, // Example timestamp for 2025-01-01
      apr: "5",
      price: "0.95",
    },
    {
      contractId: "2",
      contractAddress: "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=",
      totalStaked: "2000000",
      lockup: "60",
      vesting: "90",
      unlock: 1751328000, // Example timestamp for 2025-07-01
      apr: "7",
      price: "0.93",
    },
    {
      contractId: "3",
      contractAddress: "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=",
      totalStaked: "3000000",
      lockup: "90",
      vesting: "120",
      unlock: 1767225600, // Example timestamp for 2026-01-01
      apr: "10",
      price: "0.90",
    },
    // Add more simulated data as needed
  ];
  return { data, isLoading: false };
};

const MarketContainer: React.FC = () => {
  const { isDarkTheme } = useSelector((state: RootState) => state.theme);
  const { data: marketData, isLoading } = useMarketplaceListings(
    TOKEN_NAUT_VOI_STAKING
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ marginTop: "20px" }}>
      <Box
        sx={{
          p: 3,
          mb: 3,
          borderRadius: "16px",
          border: "2px solid",
          borderColor: isDarkTheme ? "white" : "divider",
          color: isDarkTheme ? "white" : "inherit",
        }}
      >
        <Typography variant="h6" gutterBottom>
          Staking Market
        </Typography>
        <Typography variant="body1">
          Purchase staking contracts to run on your VOI node and participate in
          the network or use in node as a service.
        </Typography>
      </Box>
      <MarketTable
        marketData={marketData.map((el: any) => ({
          ...el,
          //contractId: el.staking.contractId,
          contractAddress: el.staking.contractAddress,
          totalStaked: el.staking.global_total,
          lockup: humanizeDuration(getStakingLockupTime(el.staking) * 1000, {
            units: ["mo"],
            round: true,
          }),
          vesting: humanizeDuration(getStakingVestingTime(el.staking) * 1000, {
            units: ["mo"],
            round: true,
          }),
          unlock: getStakingUnlockTime(el.staking),
          discount: computeListingDiscount(el),
          //price: Number(el.price) / 1e6,
        }))}
      />
    </div>
  );
};

// const computeListingDiscount = (listing: ListingI) => {
//   if (!listing.rewards || !listing) return 0;
//   const { rewards } = listing;
//   ((Number(rewards.total || listing.staking.global_total) -
//     Number(listing.price / 1e6)) /
//     Number(rewards.total || listing.staking.global_total)) *
//     100;
// };

export default MarketContainer;
