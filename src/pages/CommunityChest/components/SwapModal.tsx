import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  MenuItem,
  styled,
} from "@mui/material";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import CloseIcon from "@mui/icons-material/Close";
import { CONTRACT_OPTIONS } from "../constants";

const StyledDialog = styled(Dialog)<{ $isDarkTheme: boolean }>`
  .MuiDialog-paper {
    background-color: ${(props) =>
      props.$isDarkTheme ? "#1a1a1a" : "#ffffff"};
    color: ${(props) => (props.$isDarkTheme ? "#ffffff" : "#000000")};
    border-radius: 16px;
    padding: 16px;
  }
`;

const SwapField = styled(TextField)<{ $isDarkTheme: boolean }>`
  .MuiOutlinedInput-root {
    background-color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"};
    border-radius: 8px;

    &:hover .MuiOutlinedInput-notchedOutline {
      border-color: ${(props) =>
        props.$isDarkTheme ? "#90caf9" : "#1976d2"};
    }
  }

  .MuiOutlinedInput-notchedOutline {
    border-color: ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 255, 255, 0.2)"
        : "rgba(0, 0, 0, 0.2)"};
  }

  input, .MuiSelect-select {
    color: ${(props) => (props.$isDarkTheme ? "#ffffff" : "#000000")};
  }

  .MuiFormLabel-root {
    color: ${(props) =>
      props.$isDarkTheme
        ? "rgba(255, 255, 255, 0.7)"
        : "rgba(0, 0, 0, 0.7)"};
  }
`;

const SwapButton = styled(IconButton)<{ $isDarkTheme: boolean }>`
  background-color: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  margin: 16px 0;
  padding: 12px;

  &:hover {
    background-color: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)"};
  }

  svg {
    color: ${(props) => (props.$isDarkTheme ? "#90caf9" : "#1976d2")};
    font-size: 24px;
  }
`;

interface SwapModalProps {
  open: boolean;
  onClose: () => void;
  isDarkTheme: boolean;
  fromBalance: string;
  onSwap: (
    fromToken: number,
    toToken: number,
    amount: string
  ) => Promise<void>;
  isLoading: boolean;
}

const SwapModal: React.FC<SwapModalProps> = ({
  open,
  onClose,
  isDarkTheme,
  fromBalance,
  onSwap,
  isLoading,
}) => {
  const [fromToken, setFromToken] = useState<number>(CONTRACT_OPTIONS[0].id);
  const [toToken, setToToken] = useState<number>(CONTRACT_OPTIONS[1].id);
  const [amount, setAmount] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      if (parseFloat(value) > parseFloat(fromBalance)) {
        setError("Insufficient balance");
      } else {
        setError("");
      }
    }
  };

  const handleSwap = async () => {
    if (!error && amount) {
      await onSwap(fromToken, toToken, amount);
      onClose();
      setAmount("");
    }
  };

  useEffect(() => {
    setError("");
    setAmount("");
  }, [open]);

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      $isDarkTheme={isDarkTheme}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Swap Tokens</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <SwapField
            select
            label="From"
            value={fromToken}
            onChange={(e) => setFromToken(Number(e.target.value))}
            fullWidth
            $isDarkTheme={isDarkTheme}
          >
            {CONTRACT_OPTIONS.map((option) => (
              <MenuItem
                key={option.id}
                value={option.id}
                disabled={option.id === toToken}
              >
                {option.name} - {option.description}
              </MenuItem>
            ))}
          </SwapField>

          <SwapField
            label="Amount"
            type="text"
            value={amount}
            onChange={handleAmountChange}
            fullWidth
            error={!!error}
            helperText={error || `Available: ${fromBalance} VOI`}
            sx={{ mt: 2 }}
            $isDarkTheme={isDarkTheme}
          />

          <Box display="flex" justifyContent="center">
            <SwapButton
              onClick={handleSwapTokens}
              $isDarkTheme={isDarkTheme}
            >
              <SwapVertIcon />
            </SwapButton>
          </Box>

          <SwapField
            select
            label="To"
            value={toToken}
            onChange={(e) => setToToken(Number(e.target.value))}
            fullWidth
            $isDarkTheme={isDarkTheme}
          >
            {CONTRACT_OPTIONS.map((option) => (
              <MenuItem
                key={option.id}
                value={option.id}
                disabled={option.id === fromToken}
              >
                {option.name} - {option.description}
              </MenuItem>
            ))}
          </SwapField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSwap}
          variant="contained"
          disabled={!amount || !!error || isLoading}
        >
          {isLoading ? <CircularProgress size={24} /> : "Swap"}
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

export default SwapModal; 