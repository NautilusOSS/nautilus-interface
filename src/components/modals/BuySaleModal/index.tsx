import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Button,
  CircularProgress,
  Stack,
  InputLabel,
  Box,
  Grid,
  Typography,
} from "@mui/material";
import { CONTRACT, abi, arc200 } from "ulujs";
import { getAlgorandClients } from "../../../wallets";
import { useDispatch, useSelector } from "react-redux";
import { UnknownAction } from "@reduxjs/toolkit";
import { getSmartTokens } from "../../../store/smartTokenSlice";
import {
  ListingTokenI,
  NFTIndexerListingI,
  NFTIndexerTokenI,
  TokenType,
} from "../../../types";
import { BigNumber } from "bignumber.js";
import axios from "axios";
import { toast } from "react-toastify";
import { useWallet } from "@txnlab/use-wallet-react";
import StakingInformation from "@/components/StakingInformation/StakingInformation";
import styled from "styled-components";
import { getPaymentTokens, simulateTokenToVoi } from "@/utils/dex";
import { PaymentToken } from "@/types";
import CurrencySelect from "@/components/CurrencySelect";
import { simulatePayment } from "@/utils/dex";
import { useBalances } from "@/hooks/useBalance";

const formatter = Intl.NumberFormat("en", { notation: "compact" });

export const multiplier = 1.01;

interface BuySaleModalProps {
  token: ListingTokenI | NFTIndexerTokenI;
  listing: NFTIndexerListingI;
  open: boolean;
  loading: boolean;
  handleClose: () => void;
  onSave: (
    pool?: any,
    discount?: any,
    simulationResults?: any
  ) => Promise<void>;
  title?: string;
  buttonText?: string;
  image: string;
  price: string;
  priceNormal?: string;
  currency: string;
  priceAU?: string;
  paymentTokenId?: number;
  paymentAltTokenId?: string;
  seller?: string;
  availablePaymentTokens?: PaymentToken[];
}

const StyledDialog = styled(Modal)<{ isDark?: boolean }>`
  .MuiPaper-root {
    background-color: ${(props) => (props.isDark ? "#202020" : "#fff")};
    color: ${(props) => (props.isDark ? "#fff" : "#161717")};
    border: 1px solid ${(props) => (props.isDark ? "#3b3b3b" : "#eaebf0")};
  }

  .MuiDialogTitle-root {
    color: ${(props) => (props.isDark ? "#fff" : "#161717")};
  }

  .MuiDialogContent-root {
    color: ${(props) => (props.isDark ? "#fff" : "#161717")};
  }

  .MuiDialogActions-root {
    border-top: 1px solid ${(props) => (props.isDark ? "#3b3b3b" : "#eaebf0")};
  }

  .MuiButton-root {
    color: ${(props) => (props.isDark ? "#fff" : "#161717")};
    border-color: ${(props) => (props.isDark ? "#3b3b3b" : "#eaebf0")};

    &:hover {
      background-color: ${(props) =>
        props.isDark ? "#2b2b2b" : "rgba(0, 0, 0, 0.04)"};
    }
  }
`;

const VOI_TOKEN: PaymentToken = {
  tokenId: 390001,
  symbol: "VOI",
  name: "VOI",
  decimals: 6,
  price: "1",
};

const BuySaleModal: React.FC<BuySaleModalProps> = ({
  token,
  listing,
  seller,
  open,
  loading,
  handleClose,
  onSave,
  image,
  price,
  priceNormal,
  currency,
  buttonText = "Send",
  priceAU = "0",
  paymentTokenId = 0,
  paymentAltTokenId = "0",
  availablePaymentTokens = [],
}) => {
  const isDarkTheme = useSelector((state: any) => state.theme.isDarkTheme);
  const { activeAccount, signTransactions } = useWallet();

  // State declarations
  const [highestSale, setHighestSale] = useState<number>(0);
  const [manager, setManager] = useState<string>();
  const [tokenMetadata, setTokenMetadata] = useState<{
    name?: string;
    unit_name?: string;
  }>({});
  const [paymentTokens, setPaymentTokens] = useState<PaymentToken[]>([]);
  const [selectedPaymentToken, setSelectedPaymentToken] =
    useState<PaymentToken>(VOI_TOKEN);
  const [simulationResults, setSimulationResults] = useState<
    Record<
      number,
      {
        outputAmount: string;
        priceImpact: string;
      }
    >
  >({});

  // Hooks
  const balances = useBalances(activeAccount?.address);

  // Memoized values
  const canBuy = useMemo(() => {
    if (!selectedPaymentToken) return false;

    const balance =
      balances[selectedPaymentToken.tokenId.toString()]?.balance || "0";
    const requiredAmount =
      selectedPaymentToken.tokenId === VOI_TOKEN.tokenId
        ? priceAU
        : simulationResults[selectedPaymentToken.tokenId]?.outputAmount || "0";

    return new BigNumber(balance).gte(new BigNumber(requiredAmount));
  }, [selectedPaymentToken, balances, priceAU, simulationResults]);

  const handleSave = async (
    pool: any,
    discount: any,
    simulationResults: any
  ) => {
    await onSave(pool, discount, simulationResults);
    handleClose();
  };

  const handleDelete = async () => {
    if (!activeAccount) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    const ci = new CONTRACT(
      Number(listing.mpContractId),
      algodClient,
      indexerClient,
      abi.mp,
      {
        addr: activeAccount.address,
        sk: new Uint8Array(0),
      }
    );
    ci.setFee(2000);
    const res = await ci.a_sale_deleteListing(listing.mpListingId);
    if (res.success) {
      await toast.promise(
        signTransactions(
          res.txns.map((t: string) => new Uint8Array(Buffer.from(t, "base64")))
        )
          .then((stxns: any) =>
            algodClient.sendRawTransaction(stxns as Uint8Array[]).do()
          )
          .then(() => handleClose()),
        {
          pending: "Transaction pending...",
          success: "Transaction successful!",
        }
      );
    }
  };

  const displayImage =
    image.indexOf("ipfs://") === -1
      ? image
      : `https://ipfs.io/ipfs/${image.slice(7)}`;

  // Update payment tokens initialization
  useEffect(() => {
    const fetchTokens = async () => {
      if (open) {
        try {
          const tokens = await getPaymentTokens();
          console.log("Available payment tokens:", tokens); // Debug log
          setPaymentTokens(tokens);
          // Initialize with VOI if not already set
          if (!selectedPaymentToken) {
            setSelectedPaymentToken(tokens[0]); // VOI is always first
          }
        } catch (error) {
          console.error("Error fetching payment tokens:", error);
          // Fallback to VOI only
          setPaymentTokens([VOI_TOKEN]);
          setSelectedPaymentToken(VOI_TOKEN);
        }
      }
    };

    fetchTokens();
  }, [open]); // Only depend on open state

  // Add useEffect to fetch token metadata
  useEffect(() => {
    const fetchTokenMetadata = async () => {
      try {
        const { data } = await axios.get(
          `https://mainnet-idx.nautilus.sh/nft-indexer/v1/tokens?contractId=${token.contractId}&tokenId=${token.tokenId}`
        );
        if (data.tokens?.[0]?.metadata) {
          setTokenMetadata(data.tokens[0].metadata);
        }
      } catch (error) {
        console.error("Error fetching token metadata:", error);
      }
    };
    if (token.contractId && token.tokenId) {
      fetchTokenMetadata();
    }
  }, [token.contractId, token.tokenId]);

  // Add effect to simulate swaps
  useEffect(() => {
    const simulateSwaps = async () => {
      if (!priceAU) return;

      const results: Record<
        number,
        { outputAmount: string; priceImpact: string }
      > = {};

      for (const token of paymentTokens) {
        if (token.tokenId === VOI_TOKEN.tokenId || !token.pool) continue;

        try {
          const result = await simulateTokenToVoi(
            priceAU,
            token.pool,
            activeAccount?.address
          );

          results[token.tokenId] = result;
        } catch (error) {
          console.error(
            `Error simulating swap for token ${token.tokenId}:`,
            error
          );
        }
      }

      setSimulationResults(results);
    };

    simulateSwaps();
  }, [paymentTokens, priceAU, activeAccount?.address]);

  console.log({ listing });

  const stakingNFTContractInfo = 421076;
  const stakingInformation =
    stakingNFTContractInfo === Number(token.contractId) ? (
      <Grid item xs={12}>
        <StakingInformation contractId={Number(token.tokenId)} />
      </Grid>
    ) : null;

  return (
    <StyledDialog
      open={open}
      onClose={handleClose}
      isDark={isDarkTheme}
      aria-labelledby="address-modal-title"
      aria-describedby="address-modal-description"
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: isDarkTheme ? "#202020" : "white",
          color: isDarkTheme ? "#fff" : "#161717",
          padding: "40px",
          maxHeight: "90vh",
          minWidth: "300px",
          width: "90vw",
          maxWidth: "800px",
          borderRadius: "25px",
          border: `1px solid ${isDarkTheme ? "#3b3b3b" : "#eaebf0"}`,
          overflowY: "auto",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        }}
      >
        {!loading ? (
          <>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <img
                  src={displayImage}
                  alt="NFT"
                  style={{ width: "100%", borderRadius: "25px" }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 1 }}>
                  <InputLabel htmlFor="name">Name</InputLabel>
                  <Typography variant="h5" gutterBottom>
                    {tokenMetadata.name?.includes(".voi")
                      ? tokenMetadata.name
                      : tokenMetadata.name ||
                        tokenMetadata.unit_name ||
                        `Token #${token.tokenId}`}
                  </Typography>
                </Box>
                <Box sx={{ p: 1 }}>
                  <InputLabel htmlFor="price">Price</InputLabel>
                  <Typography variant="h5" gutterBottom>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "baseline" }}
                    >
                      {price} {currency}
                    </Stack>
                  </Typography>
                </Box>
                <Box sx={{ p: 1 }}>
                  <InputLabel htmlFor="balance">Seller</InputLabel>
                  <Typography variant="h5" gutterBottom>
                    {seller?.slice(0, 4)}...{seller?.slice(-4)}
                  </Typography>
                </Box>
                {currency !== "VOI" && (
                  <Box sx={{ p: 1 }}>
                    <InputLabel htmlFor="balance">VOI Balance</InputLabel>
                    <Typography variant="h5" gutterBottom>
                      {new BigNumber(balances["voi"]?.balance || "0")
                        .div(new BigNumber(10).pow(6))
                        .toFixed(6)}
                    </Typography>
                  </Box>
                )}
                {highestSale > 0 && (
                  <Box sx={{ p: 1 }}>
                    <InputLabel htmlFor="balance">Highest Sale</InputLabel>
                    <Typography variant="h5" gutterBottom>
                      {formatter.format(highestSale)} VOI
                    </Typography>
                  </Box>
                )}
              </Grid>
              {stakingInformation}
              <Grid item xs={12}>
                <Box sx={{ mb: 2 }}>
                  <CurrencySelect
                    value={selectedPaymentToken?.tokenId || VOI_TOKEN.tokenId}
                    onChange={(tokenId) => {
                      const token = paymentTokens.find(
                        (t) => t.tokenId === tokenId
                      );
                      if (token) {
                        setSelectedPaymentToken(token);
                      }
                    }}
                    tokens={paymentTokens}
                    balances={balances}
                    price={priceAU}
                    simulationResults={simulationResults}
                    onBuy={(token) => {
                      if (token.tokenId === VOI_TOKEN.tokenId) {
                        handleSave(undefined, 0, simulationResults);
                      } else {
                        handleSave(token.pool, 0, simulationResults);
                      }
                    }}
                    canBuy={(tokenId) => {
                      const token = paymentTokens.find(
                        (t) => t.tokenId === tokenId
                      );
                      if (!token) return false;
                      const balance =
                        balances[token.tokenId.toString()]?.balance || "0";
                      const requiredAmount =
                        token.tokenId === VOI_TOKEN.tokenId
                          ? priceAU
                          : simulationResults[token.tokenId]?.outputAmount ||
                            "0";
                      return new BigNumber(balance).gte(
                        new BigNumber(requiredAmount)
                      );
                    }}
                  />
                </Box>

                <Stack sx={{ mt: 3 }} gap={2}>
                  {activeAccount?.address === manager && (
                    <Button
                      size="large"
                      fullWidth
                      variant="outlined"
                      color="warning"
                      onClick={handleDelete}
                    >
                      Delete
                    </Button>
                  )}
                  <Button
                    size="large"
                    fullWidth
                    variant="outlined"
                    onClick={handleClose}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Grid>
            </Grid>
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
          </div>
        )}
      </div>
    </StyledDialog>
  );
};

export default BuySaleModal;
