import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  useTheme,
} from '@mui/material';

interface CancelOfferDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  disabled?: boolean;
}

export const CancelOfferDialog = ({ 
  open, 
  onClose, 
  onConfirm,
  disabled = false 
}: CancelOfferDialogProps) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Confirm Cancellation</DialogTitle>
    <DialogContent>
      Are you sure you want to cancel this offer?
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={disabled}>
        Back
      </Button>
      <Button 
        onClick={onConfirm} 
        color="error"
        disabled={disabled}
      >
        {disabled ? 'Cancelling...' : 'Cancel Offer'}
      </Button>
    </DialogActions>
  </Dialog>
);