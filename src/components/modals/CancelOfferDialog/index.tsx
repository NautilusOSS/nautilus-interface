import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

interface CancelOfferDialogProps {
  open: boolean;
  handleClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  offer?: {
    mpListingId: number;
    contractId: number;
    tokenId: number;
    price: number;
    currency: number;
  };
}

const CancelOfferDialog: React.FC<CancelOfferDialogProps> = ({
  open,
  handleClose,
  onConfirm,
  loading,
  offer,
}) => {
  const isDarkTheme = useSelector((state: RootState) => state.theme.isDarkTheme);

  const formatPrice = (price: number) => {
    return (price / 1e6).toFixed(2);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
        Cancel Offer
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body1" sx={{ color: isDarkTheme ? "#fff" : "#000", mb: 2 }}>
          Are you sure you want to cancel this offer?
        </Typography>

        {offer && (
          <Box sx={{ p: 2, backgroundColor: isDarkTheme ? "#1a1a1a" : "#f5f5f5", borderRadius: 1, mb: 2 }}>
            <Typography variant="body2" sx={{ color: isDarkTheme ? "#ccc" : "#666" }}>
              Collection: #{offer.contractId}
            </Typography>
            <Typography variant="body2" sx={{ color: isDarkTheme ? "#ccc" : "#666" }}>
              Token: #{offer.tokenId}
            </Typography>
            <Typography variant="body2" sx={{ color: isDarkTheme ? "#ccc" : "#666" }}>
              Offer Amount: {formatPrice(offer.price)} {offer.currency === 8324600 ? "VOI" : offer.currency}
            </Typography>
          </Box>
        )}

        <Typography variant="caption" sx={{ color: isDarkTheme ? "#ff9800" : "#f57c00" }}>
          This action cannot be undone. The offer will be permanently cancelled.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          sx={{
            color: isDarkTheme ? "#ccc" : "#666",
            "&:hover": {
              backgroundColor: isDarkTheme ? "#444" : "#f0f0f0",
            },
          }}
        >
          Keep Offer
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color="error"
          sx={{
            backgroundColor: "#f44336",
            "&:hover": {
              backgroundColor: "#d32f2f",
            },
          }}
        >
          {loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            "Cancel Offer"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CancelOfferDialog;
