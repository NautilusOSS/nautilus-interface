import React, { FC } from "react";
import { useStakingContract } from "@/hooks/staking";
import { Box, Typography } from "@mui/material";
import { formatter } from "@/utils/number";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

interface StakingInformationProps {
  contractId: number;
}
const StakingInformation: FC<StakingInformationProps> = ({ contractId }) => {
  const { isDarkTheme } = useSelector((state: RootState) => state.theme);
  const { data: stakingAccountData, isLoading: loadingStakingAccountData } =
    useStakingContract(contractId);
  return stakingAccountData && stakingAccountData.length > 0 ? (
    <Box>
      <Typography variant="h6">Account Information</Typography>
      <Typography variant="body2">
        <strong>Type:</strong>
        {` `}
        {stakingAccountData[0].global_parent_id === 400350
          ? "Staking"
          : "Airdrop"}
      </Typography>
      <Typography variant="body2">
        <strong>Account ID:</strong>
        {` `}
        <a
          style={{ color: "#93F" }}
          target="_blank"
          rel="noreferrer"
          href={`https://explorer.voi.network/explorer/application/${stakingAccountData[0].contractId}/transactions`}
        >
          {stakingAccountData[0].contractId}
        </a>
      </Typography>
      <Typography variant="body2">
        <strong>Lockup:</strong>{" "}
        {stakingAccountData[0].global_period_limit > 5
          ? `${stakingAccountData[0].global_period + 1} mo`
          : `${stakingAccountData[0].global_period} years`}
      </Typography>
      <Typography variant="body2">
        <strong>Vesting:</strong>{" "}
        {stakingAccountData[0].global_period > 5
          ? `${stakingAccountData[0].global_distribution_count} mo`
          : `12 years`}
      </Typography>
      <Typography variant="body2">
        <strong>Stake Amount:</strong>{" "}
        {stakingAccountData[0].global_period > 5
          ? `${stakingAccountData[0].global_initial / 10 ** 6} VOI`
          : `${formatter.format(
              stakingAccountData[0].global_initial / 10 ** 6
            )} VOI`}
      </Typography>
      <Typography variant="body2">
        <strong>Est. Total Tokens:</strong>
        {` `}
        {stakingAccountData[0].total || stakingAccountData[0].global_total} VOI
      </Typography>
    </Box>
  ) : (
    <Typography
      variant="body2"
      sx={{
        color: isDarkTheme ? "#fff" : "#000",
        textAlign: "left",
        paddingTop: "20px",
      }}
    >
      No account information found
    </Typography>
  );
};

export default StakingInformation;
