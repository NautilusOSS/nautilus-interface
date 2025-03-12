import React, { FC, useState } from "react";
import { useStakingContract } from "@/hooks/staking";
import { Box, Typography, Skeleton, IconButton, Snackbar } from "@mui/material";
import { formatter } from "@/utils/number";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import humanizeDuration from "humanize-duration";
import { AIRDROP_FUNDING } from "@/contants/staking";
import moment from "moment";
import { useAccountBalance } from "@/hooks/useAccountBalance";
import algosdk from "algosdk";
import { compactAddress } from "@/utils/mp";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface StakingInformationProps {
  contractId: number;
}

const StakingInformation: FC<StakingInformationProps> = ({ contractId }) => {
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const { isDarkTheme } = useSelector((state: RootState) => state.theme);
  const { data: account, isLoading: loadingAccountData } = useStakingContract(
    contractId,
    {
      includeRewards: true,
      includeWithdrawable: true,
    }
  );

  console.log({ account });

  const {
    balance,
    isLoading: loadingBalance,
    error: balanceError,
  } = useAccountBalance(algosdk.getApplicationAddress(contractId));

  const renderBalance = () => {
    if (loadingBalance) {
      return (
        <Skeleton
          variant="text"
          width={120}
          height={24}
          sx={{
            bgcolor: isDarkTheme
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          }}
        />
      );
    }

    if (balanceError) {
      return account.global_total / 1e6;
    }

    return balance ? balance / 1e6 : account.global_total / 1e6;
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setShowCopyToast(true);
    setCopyMessage(`${label} copied to clipboard`);
  };

  return !loadingAccountData ? (
    <Box>
      <Typography variant="h6">Account Information</Typography>
      <Typography variant="body2">
        <strong>Type:</strong>
        {` `}
        {account.global_parent_id === 400350 ? "Staking" : "Airdrop"}
      </Typography>
      <Typography variant="body2">
        <strong>Application ID:</strong>
        {` `}
        <a
          style={{ color: "#93F" }}
          target="_blank"
          rel="noreferrer"
          href={`https://explorer.voi.network/explorer/application/${account.contractId}/transactions`}
        >
          {account.contractId}
        </a>
        <IconButton
          onClick={() => handleCopy(account.contractId.toString(), 'Application ID')}
          size="small"
          sx={{ ml: 0.5, color: isDarkTheme ? '#fff' : '#000', padding: '2px' }}
        >
          <ContentCopyIcon sx={{ fontSize: '16px' }} />
        </IconButton>
      </Typography>
      <Typography variant="body2">
        <strong>Application Address:</strong>
        {` `}
        <a
          style={{ color: "#93F" }}
          target="_blank"
          rel="noreferrer"
          href={`https://explorer.voi.network/explorer/account/${account.contractAddress}/transactions`}
        >
          {compactAddress(account.contractAddress)}
        </a>
        <IconButton
          onClick={() => handleCopy(account.contractAddress, 'Application Address')}
          size="small"
          sx={{ ml: 0.5, color: isDarkTheme ? '#fff' : '#000', padding: '2px' }}
        >
          <ContentCopyIcon sx={{ fontSize: '16px' }} />
        </IconButton>
      </Typography>
      <Typography variant="body2">
        <strong>Lockup:</strong>{" "}
        {humanizeDuration(
          account.global_period_seconds *
            (account.global_lockup_delay * account.global_period +
              account.global_vesting_delay) *
            1000,
          {
            largest: 2,
            round: true,
            units: ["mo"],
          }
        )}
      </Typography>
      <Typography variant="body2">
        <strong>Vesting:</strong>{" "}
        {humanizeDuration(
          account.global_distribution_count *
            account.global_distribution_seconds *
            1000,
          {
            largest: 2,
            round: true,
            units: ["mo"],
          }
        )}
      </Typography>
      <Typography variant="body2">
        <strong>Initial:</strong> {account.global_initial / 1e6} VOI
      </Typography>
      <Typography variant="body2">
        <strong>Total:</strong> {renderBalance()} VOI
      </Typography>

      {moment().unix() < AIRDROP_FUNDING ? (
        <>
          <Typography variant="body2">
            <strong>Stake Amount:</strong>{" "}
            {account.global_period > 5
              ? `${account.global_initial / 10 ** 6} VOI`
              : `${formatter.format(account.global_initial / 10 ** 6)} VOI`}
          </Typography>
          <Typography variant="body2">
            <strong>Est. Total Tokens:</strong>
            {` `}
            {formatter.format(
              balance ? balance : account.global_total / 1e6
            )}{" "}
            VOI
          </Typography>
        </>
      ) : null}
      {moment().unix() > account?.global_funding &&
      moment().unix() < account?.global_unlock ? (
        <>
          <Typography variant="body2">
            <strong>Unlock:</strong>{" "}
            {humanizeDuration(
              (account.global_unlock - moment().unix()) * 1000,
              {
                largest: 2,
                round: true,
                units: ["mo"],
              }
            )}
          </Typography>
        </>
      ) : null}
      <Typography variant="body2">
        <strong>Delegate:</strong>
        {` `}
        <a
          style={{ color: "#93F" }}
          target="_blank"
          rel="noreferrer"
          href={`https://explorer.voi.network/explorer/account/${account.global_delegate}`}
        >
          {compactAddress(account.global_delegate)}
        </a>
        <IconButton
          onClick={() => handleCopy(account.global_delegate, 'Delegate Address')}
          size="small"
          sx={{ ml: 0.5, color: isDarkTheme ? '#fff' : '#000', padding: '2px' }}
        >
          <ContentCopyIcon sx={{ fontSize: '16px' }} />
        </IconButton>
      </Typography>
      {account?.withdrawable ? (
        <Typography variant="body2">
          <strong>Withdrawable amount:</strong>
          {` `}
          {formatter.format(Number(account?.withdrawable || 0) / 1e6)} VOI
        </Typography>
      ) : null}
      <Snackbar
        open={showCopyToast}
        autoHideDuration={2000}
        onClose={() => setShowCopyToast(false)}
        message={copyMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
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
