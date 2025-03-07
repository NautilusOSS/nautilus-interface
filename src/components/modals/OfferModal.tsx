import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

interface OfferModalProps {
  token: any;
  image?: string;
  title: string;
  loading?: boolean;
  open: boolean;
  handleClose: () => void;
  onSave: (amount: string) => void;
  buttonText: string;
  marketplaceFeePercentage?: number;
}

const StyledDialog = styled(Dialog)<{ isDarkTheme: boolean }>(
  ({ isDarkTheme }) => ({
    "& .MuiDialogContent-root": {
      padding: "16px",
      backgroundColor: isDarkTheme ? "#1a1a1a" : "#ffffff",
      color: isDarkTheme ? "#ffffff" : "#000000",
    },
    "& .MuiDialogActions-root": {
      padding: "8px",
      backgroundColor: isDarkTheme ? "#1a1a1a" : "#ffffff",
    },
    "& .MuiDialogTitle-root": {
      backgroundColor: isDarkTheme ? "#1a1a1a" : "#ffffff",
      color: isDarkTheme ? "#ffffff" : "#000000",
    },
    "& .MuiTextField-root": {
      "& .MuiOutlinedInput-root": {
        "& fieldset": {
          borderColor: isDarkTheme
            ? "rgba(255, 255, 255, 0.23)"
            : "rgba(0, 0, 0, 0.23)",
        },
        "&:hover fieldset": {
          borderColor: isDarkTheme ? "#ffffff" : "#000000",
        },
        "&.Mui-focused fieldset": {
          borderColor: isDarkTheme ? "#90caf9" : "#1976d2",
        },
      },
      "& .MuiInputLabel-root": {
        color: isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
        "&.Mui-focused": {
          color: isDarkTheme ? "#90caf9" : "#1976d2",
        },
      },
      "& input": {
        color: isDarkTheme ? "#ffffff" : "#000000",
      },
    },
  })
);

const OfferModal: React.FC<OfferModalProps> = ({
  token,
  image,
  title,
  loading,
  open,
  handleClose,
  onSave,
  buttonText,
  marketplaceFeePercentage = 2.5,
}) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  const [offerAmount, setOfferAmount] = useState("");

  const handleSubmit = () => {
    onSave(offerAmount);
  };

  const calculateFee = (amount: string): number => {
    const numAmount = parseFloat(amount) || 0;
    const totalFee = (numAmount * marketplaceFeePercentage) / 100;
    const platformFee = totalFee * 0.25;
    const royaltyFee = totalFee * 0.25;
    //const gamesFee = totalFee * 0.5;
    const gamesFee = totalFee * 0;
    return totalFee;
  };

  const calculateTotal = (amount: string): number => {
    const numAmount = parseFloat(amount) || 0;
    return numAmount + calculateFee(amount);
  };

  return (
    <StyledDialog
      isDarkTheme={isDarkTheme}
      onClose={handleClose}
      aria-labelledby="customized-dialog-title"
      open={open}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {image && (
            <img
              src={image}
              alt="NFT"
              style={{
                width: "100%",
                maxHeight: "300px",
                objectFit: "contain",
              }}
            />
          )}
          <TextField
            label="Offer Amount (VOI)"
            type="number"
            value={offerAmount}
            onChange={(e) => setOfferAmount(e.target.value)}
            fullWidth
          />
          {offerAmount && (
            <Stack
              spacing={1}
              sx={{ mt: 2, color: isDarkTheme ? "#ffffff" : "#000000" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Offer Amount:</span>
                <span>{offerAmount} VOI</span>
              </div>
              {/*<div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Marketplace Fee ({marketplaceFeePercentage}%):</span>
                <span>{calculateFee(offerAmount).toFixed(4)} VOI</span>
              </div>*/}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Platform Fee ({marketplaceFeePercentage * 0.25}%):</span>
                <span>{(calculateFee(offerAmount) * 0.25).toFixed(4)} VOI</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Royalty Fee ({marketplaceFeePercentage * 0.25}%):</span>
                <span>{(calculateFee(offerAmount) * 0.25).toFixed(4)} VOI</span>
              </div>
              {/*<div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Games Fee ({marketplaceFeePercentage * 0.5}%):</span>
                  <span>{(calculateFee(offerAmount) * 0.5).toFixed(4)} VOI</span>
                </div>*/}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: "bold",
                }}
              >
                <span>Total Cost:</span>
                <span>{calculateTotal(offerAmount).toFixed(4)} VOI</span>
              </div>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleClose}
          sx={{ color: isDarkTheme ? "#ffffff" : "#000000" }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !offerAmount}
          variant="contained"
        >
          {loading ? "Processing..." : buttonText}
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

export default OfferModal;
