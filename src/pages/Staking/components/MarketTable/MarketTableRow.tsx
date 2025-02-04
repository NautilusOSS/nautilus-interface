import React from "react";
import {
  TableRow,
  TableCell,
  Button,
  Typography,
  useTheme,
  Tooltip,
  Skeleton,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Link, useNavigate } from "react-router-dom";
import moment from "moment";
import { toast } from "react-toastify";
import VIAIcon from "/src/static/crypto-icons/voi/6779767.svg";
import { useAccountBalance } from "@/hooks/useAccountBalance";
import algosdk from "algosdk";
import { computeListingDiscount } from "@/utils/staking";
import { ListingI } from "@/types";

interface MarketTableRowProps {
  item: any; // Replace with proper type
  isDarkTheme: boolean;
  onOpenModal: (item: any) => void;
}

const MarketTableRow: React.FC<MarketTableRowProps> = ({
  item,
  isDarkTheme,
  onOpenModal,
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { balance, isLoading, error } = useAccountBalance(
    algosdk.getApplicationAddress(Number(item.token.tokenId))
  );

  const cellStyle = {
    color: isDarkTheme ? "white" : theme.palette.text.primary,
    fontWeight: 100,
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`${label} copied to clipboard`))
      .catch(() => toast.error("Failed to copy to clipboard"));
  };

  const formatBalance = (balance: number | null) => {
    if (balance === null) return `${item.totalStaked / 1e6} VOI`;
    return `${(balance / 1e6).toFixed(6)} VOI`;
  };

  const discount = (balance: number | null, item: any) => {
    if (balance === null) return item.discount;
    const modifiedListing = {
      price: item.price,
      staking: {
        global_total: balance,
      },
    };
    return computeListingDiscount(modifiedListing as ListingI);
  };

  const renderBalance = () => {
    if (isLoading) {
      return (
        <Skeleton
          variant="text"
          width={80}
          height={20}
          sx={{
            bgcolor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          }}
        />
      );
    }

    if (error) {
      return (
        <Tooltip title={error}>
          <Typography
            variant="caption"
            sx={{
              color: 'error.main',
              fontSize: '0.75rem',
            }}
          >
            {formatBalance(null)}
          </Typography>
        </Tooltip>
      );
    }

    return (
      <Typography
        variant="body2"
        sx={{
          fontSize: '0.875rem',
        }}
      >
        {formatBalance(balance)}
      </Typography>
    );
  };

  const renderDiscount = () => {
    if (isLoading) {
      return (
        <Skeleton
          variant="text"
          width={60}
          height={20}
          sx={{
            bgcolor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          }}
        />
      );
    }

    const discountValue = discount(balance, item);
    const isNegative = String(discountValue).indexOf("-") === 0;

    return (
      <Typography
        variant="body2"
        sx={{
          color: isNegative ? "error.main" : "success.main",
          fontWeight: 900,
        }}
      >
        {`${discountValue}%`}
      </Typography>
    );
  };

  const handleOpenModal = () => {
    onOpenModal({
      ...item,
      currentBalance: balance,
      isBalanceLoading: isLoading,
      balanceError: error,
    });
  };

  return (
    <TableRow>
      <TableCell style={cellStyle} align="center">
        <Link
          to={`/collection/${item.token.contractId}/token/${item.token.tokenId}`}
        >
          {item.token.contractId}
        </Link>
        <ContentCopyIcon
          style={{
            cursor: "pointer",
            marginLeft: "5px",
            fontSize: "16px",
            color: "inherit",
          }}
          onClick={() =>
            copyToClipboard(item.token.contractId, "Account Address")
          }
        />
      </TableCell>
      <TableCell style={cellStyle} align="center">
        <a
          href={`https://block.voi.network/explorer/account/${item.contractAddress}/transactions`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "inherit" }}
        >
          {item.contractAddress.slice(0, 10)}...
          {item.contractAddress.slice(-10)}
        </a>
        <ContentCopyIcon
          style={{
            cursor: "pointer",
            marginLeft: "5px",
            fontSize: "16px",
            color: "inherit",
          }}
          onClick={() =>
            copyToClipboard(item.contractAddress, "Account Address")
          }
        />
      </TableCell>
      <TableCell style={cellStyle} align="right">
        {renderBalance()}
      </TableCell>
      <TableCell style={cellStyle} align="right">
        {item.lockup}
      </TableCell>
      <TableCell style={cellStyle} align="right">
        {item.vesting}
      </TableCell>
      <TableCell style={cellStyle} align="right">
        {moment.unix(item.unlock).fromNow()}
      </TableCell>
      <TableCell
        style={{
          ...cellStyle,
          fontWeight: 900,
        }}
        align="right"
      >
        {renderDiscount()}
      </TableCell>
      <TableCell style={cellStyle} align="right">
        <Button
          sx={{
            borderRadius: "20px",
            color: "inherit",
          }}
          variant={isDarkTheme ? "outlined" : "contained"}
          size="small"
          onClick={() => {
            navigate(`/collection/${item.token.contractId}/token/${item.token.tokenId}`);
          }}
        >
          <img src={VIAIcon} style={{ height: "12px" }} alt="VOI Icon" />
          <Typography
            variant="body2"
            sx={{
              ml: 1,
              color: "white",
              fontWeight: 500,
            }}
          >
            {item.price / 1e6} VOI
          </Typography>
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default MarketTableRow;
