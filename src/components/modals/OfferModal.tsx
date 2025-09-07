import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

interface OfferModalProps {
  open: boolean;
  handleClose: () => void;
  onSave: (amount: string) => void;
  loading: boolean;
  token?: any;
  image?: string;
  title?: string;
  buttonText?: string;
  marketplaceFeePercentage?: number;
}

const OfferModal: React.FC<OfferModalProps> = ({
  open,
  handleClose,
  onSave,
  loading,
  token,
  image,
  title = "Make an Offer",
  buttonText = "Make Offer",
  marketplaceFeePercentage = 10,
}) => {
  const [offerAmount, setOfferAmount] = useState("");
  const isDarkTheme = useSelector((state: RootState) => state.theme.isDarkTheme);

  const handleSubmit = () => {
    if (offerAmount && parseFloat(offerAmount) > 0) {
      onSave(offerAmount);
    }
  };

  const handleCloseModal = () => {
    setOfferAmount("");
    handleClose();
  };

  const calculateTotal = () => {
    const amount = parseFloat(offerAmount);
    if (isNaN(amount)) return 0;
    const fee = amount * (marketplaceFeePercentage / 100);
    return amount + fee;
  };

  return (
    <Dialog
      open={open}
      onClose={handleCloseModal}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: isDarkTheme ? "#2a2a2a" : "#fff",
          color: isDarkTheme ? "#fff" : "#000",
        },
      }}
    >
      <DialogTitle sx={{ color: isDarkTheme ? "#fff" : "#000" }}>
        {title}
      </DialogTitle>
      
      <DialogContent>
        {/* Token Image */}
        {image && (
          <Box sx={{ mb: 2, textAlign: "center" }}>
            <img
              src={image}
              alt="NFT"
              style={{
                width: "100px",
                height: "100px",
                objectFit: "cover",
                borderRadius: "8px",
              }}
            />
          </Box>
        )}

        {/* Token Info */}
        {token && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ color: isDarkTheme ? "#fff" : "#000" }}>
              {token.metadata?.name || `Token #${token.tokenId}`}
            </Typography>
            <Typography variant="body2" sx={{ color: isDarkTheme ? "#ccc" : "#666" }}>
              Collection #{token.contractId}
            </Typography>
          </Box>
        )}

        {/* Offer Amount Input */}
        <TextField
          fullWidth
          label="Offer Amount (VOI)"
          type="number"
          value={offerAmount}
          onChange={(e) => setOfferAmount(e.target.value)}
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              color: isDarkTheme ? "#fff" : "#000",
              "& fieldset": {
                borderColor: isDarkTheme ? "#666" : "#ccc",
              },
              "&:hover fieldset": {
                borderColor: isDarkTheme ? "#888" : "#999",
              },
              "&.Mui-focused fieldset": {
                borderColor: isDarkTheme ? "#fff" : "#000",
              },
            },
            "& .MuiInputLabel-root": {
              color: isDarkTheme ? "#ccc" : "#666",
              "&.Mui-focused": {
                color: isDarkTheme ? "#fff" : "#000",
              },
            },
          }}
        />

        {/* Fee Calculation */}
        {offerAmount && parseFloat(offerAmount) > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ color: isDarkTheme ? "#ccc" : "#666" }}>
              Marketplace Fee ({marketplaceFeePercentage}%): {(parseFloat(offerAmount) * marketplaceFeePercentage / 100).toFixed(2)} VOI
            </Typography>
            <Typography variant="body2" sx={{ color: isDarkTheme ? "#ccc" : "#666" }}>
              Total Required: {calculateTotal().toFixed(2)} VOI
            </Typography>
          </Box>
        )}

        {/* Warning */}
        <Typography variant="caption" sx={{ color: isDarkTheme ? "#ff9800" : "#f57c00" }}>
          Note: Offers are binding and will be automatically accepted if the seller accepts.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={handleCloseModal}
          disabled={loading}
          sx={{
            color: isDarkTheme ? "#ccc" : "#666",
            "&:hover": {
              backgroundColor: isDarkTheme ? "#444" : "#f0f0f0",
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !offerAmount || parseFloat(offerAmount) <= 0}
          variant="contained"
          sx={{
            backgroundColor: isDarkTheme ? "#1976d2" : "#1976d2",
            "&:hover": {
              backgroundColor: isDarkTheme ? "#1565c0" : "#1565c0",
            },
          }}
        >
          {loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            buttonText
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OfferModal;
