import React, { useEffect, useState } from "react";
import {
  Modal,
  Button,
  TextField,
  CircularProgress,
  Stack,
  InputLabel,
  Box,
  Typography,
} from "@mui/material";
import { getAlgorandClients } from "../../../wallets";
import { MListedNFTTokenI } from "../../../types";
import Grid2 from "@mui/material/Unstable_Grid2/Grid2";
import CartNftCard from "../../CartNFTCard";
import { useWallet } from "@txnlab/use-wallet-react";
import { useTheme } from "@mui/material/styles";
import styled from "styled-components";
import { RootState } from "@/store/store";
import { useSelector } from "react-redux";

interface AddressModalProps {
  open: boolean;
  loading: boolean;
  handleClose: () => void;
  onSave: (address: string, amount: string) => Promise<void>;
  title?: string;
  buttonText?: string;
  nfts: MListedNFTTokenI[];
}

const StyledModalContent = styled(Box)<{ isDark?: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: ${(props) => (props.isDark ? "#121212" : "#ffffff")};
  padding: 40px;
  min-height: 300px;
  min-width: 400px;
  width: 50vw;
  border-radius: 25px;
  border: ${(props) => (props.isDark ? "1px solid #333" : "1px solid #e0e0e0")};
  box-shadow: 0 4px 20px
    rgba(0, 0, 0, ${(props) => (props.isDark ? "0.5" : "0.15")});
  color: ${(props) => (props.isDark ? "#ffffff" : "#000000")};
`;

const StyledModal = styled(Modal)<{ isDark?: boolean }>`
  .MuiBackdrop-root {
    background-color: rgba(
      0,
      0,
      0,
      ${(props) => (props.isDark ? "0.8" : "0.5")}
    );
  }
`;

const AddressModal: React.FC<AddressModalProps> = ({
  nfts,
  open,
  loading,
  handleClose,
  onSave,
  title = "Enter Address",
  buttonText = "Send",
}) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  const { activeAccount } = useWallet();
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState("");
  const [amount, setAmount] = useState("");

  const theme = useTheme();

  const handleSave = async () => {
    await onSave(address, amount);
    setAddress(""); // Clearing input after save
    handleClose();
  };

  useEffect(() => {
    if (!address) return;
    try {
      const { algodClient } = getAlgorandClients();
      algodClient
        .accountInformation(address)
        .do()
        .then((accountInfo: any) => {
          setBalance(
            (
              (accountInfo.amount - accountInfo["min-balance"]) /
              1e6
            ).toLocaleString()
          );
        })
        .catch((error: any) => {
          setBalance("");
          console.error(error);
        });
    } catch (error) {
      setBalance("");
      console.error(error);
    }
  }, [address]);

  return (
    <StyledModal
      isDark={isDarkTheme}
      open={open}
      onClose={handleClose}
      aria-labelledby="address-modal-title"
      aria-describedby="address-modal-description"
    >
      <StyledModalContent isDark={isDarkTheme}>
        <Typography
          variant="h5"
          component="h2"
          id="address-modal-title"
          sx={{ mb: 3 }}
        >
          {title}
        </Typography>
        {!loading ? (
          <>
            <Box
              sx={{
                overflowY: "scroll",
                maxHeight: {
                  xs: "300px",
                  xl: "500px",
                },
              }}
            >
              <Grid2 container spacing={2}>
                {nfts.map((t: MListedNFTTokenI) => (
                  <Grid2 xs={12} sm={6} xl={4} key={t.id}>
                    <CartNftCard
                      token={t}
                      size="small"
                      imageOnly={true}
                      viewMode="list"
                      hideOverlay={true}
                    />
                  </Grid2>
                ))}
              </Grid2>
            </Box>
            {/*<Box
              sx={{
                p: 5,
                mt: 2,
                border: "1px solid lightgray",
                borderRadius: "25px",
              }}
            >
              <InputLabel htmlFor="address-from">Recipient Address</InputLabel>
              <TextField
                id="address-from"
                label="Address"
                variant="outlined"
                value={activeAccount?.address}
                fullWidth
                disabled
                margin="normal"
              />
            </Box>*/}
            <Box
              sx={{
                //p: 5,
                mt: 2,
                //border: "1px solid lightgray",
                // borderRadius: "25px",
              }}
            >
              {/*<InputLabel htmlFor="address-input">Recipient Address</InputLabel>*/}
              <TextField
                id="address-input"
                label="Recipient Address"
                variant="outlined"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                fullWidth
                margin="normal"
                sx={{
                  '& .MuiInputBase-input': {
                    color: isDarkTheme ? '#fff' : 'inherit',
                  },
                  '& .MuiInputLabel-root': {
                    color: isDarkTheme ? '#fff' : 'inherit',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDarkTheme ? '#fff' : 'rgba(0, 0, 0, 0.23)',
                  },
                }}
              />
              {balance ? <div>Avilable Balance: {balance} VOI</div> : null}
              {balance && address && Number(balance) < 1 ? (
                <>
                  <Typography color="error">
                    Recipient available balance less than 1 VOI
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <InputLabel htmlFor="amount-input">
                      Additional Amount (VOI)
                    </InputLabel>
                    <TextField
                      id="amount-input"
                      label="Amount"
                      variant="outlined"
                      fullWidth
                      margin="normal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      sx={{
                        '& .MuiInputBase-input': {
                          color: isDarkTheme ? '#fff' : 'inherit',
                        },
                        '& .MuiInputLabel-root': {
                          color: isDarkTheme ? '#fff' : 'inherit',
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: isDarkTheme ? '#fff' : 'rgba(0, 0, 0, 0.23)',
                        },
                      }}
                    />
                  </Box>
                </>
              ) : null}
            </Box>
            <Stack sx={{ mt: 3 }} gap={2}>
              <Button
                size="large"
                fullWidth
                variant="contained"
                onClick={handleSave}
              >
                {buttonText}
              </Button>
              <Button
                size="large"
                fullWidth
                variant="outlined"
                onClick={handleClose}
              >
                Cancel
              </Button>
            </Stack>
          </>
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
              padding: "20px",
            }}
          >
            <CircularProgress size={200} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Signature pending
            </Typography>
          </div>
        )}
      </StyledModalContent>
    </StyledModal>
  );
};

export default AddressModal;
