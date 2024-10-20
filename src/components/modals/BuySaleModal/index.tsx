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

const formatter = Intl.NumberFormat("en", { notation: "compact" });

export const multiplier = 1.02;

interface BuySaleModalProps {
  token: ListingTokenI | NFTIndexerTokenI;
  listing: NFTIndexerListingI;
  open: boolean;
  loading: boolean;
  handleClose: () => void;
  onSave: (pool?: any, discount?: any) => Promise<void>;
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
}

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
  title = "Enter Address",
  buttonText = "Send",
  priceAU = "0",
  paymentTokenId = 0,
  paymentAltTokenId = "0",
}) => {
  const smartTokens = useSelector((state: any) => state.smartTokens.tokens);
  const smartTokenStatus = useSelector(
    (state: any) => state.smartTokens.status
  );

  const [highestSale, setHighestSale] = useState<number>(0);
  useEffect(() => {
    axios
      .get(
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/mp/sales?collectionId=${listing.collectionId}&tokenId=${listing.tokenId}`
      )
      .then(({ data }) => {
        console.log({ data });
        const highestSale = data.sales
          .map((sale: any) => {
            const smartToken = smartTokens.find(
              (token: TokenType) => `${token.contractId}` === `${sale.currency}`
            );
            console.log({ smartToken });
            const unitPriceStr =
              sale.currency === 0 ? "1" : smartToken?.price || "0";
            const decimals =
              sale.currency === 0 ? 6 : smartToken?.decimals || 6;
            const unitPriceBn = new BigNumber(unitPriceStr);
            const tokenPriceBn = new BigNumber(sale?.price).div(
              new BigNumber(10).pow(decimals)
            );
            const normalPrice = unitPriceBn
              .multipliedBy(tokenPriceBn)
              .toNumber();
            return normalPrice;
          })
          .reduce((acc: any, val: any) => Math.max(acc, val), 0);
        setHighestSale(highestSale);
      });
  }, [smartTokens]);

  const [currencyPrice, setCurrencyPrice] = useState<number>(0);
  const [poolPrice, setPoolPrice] = useState<number>(0);
  const [pool, setPool] = useState<any>();
  useEffect(() => {
    if (currency === "VOI") return;
    axios
      .get(
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/pools?tokenId=${paymentTokenId}`
      )
      .then(({ data }) => {
        const pool = data.pools
          .filter(
            (pool: any) =>
              pool.providerId === "01" && pool.poolId.match(/(-0$)|(^0-)/)
          )
          .reduce(
            (acc: any, val: any) => {
              if (acc.mintRound < val.mintRound) {
                return acc;
              }
              return val;
            },
            { mintRound: Number.MAX_SAFE_INTEGER }
          );
        const priceSUBn = new BigNumber(priceAU).div(
          new BigNumber(10).pow(
            smartTokens.find(
              (token: TokenType) =>
                `${token.contractId}` === `${paymentTokenId}`
            )?.decimals || 0
          )
        );
        const { tokAId, poolBalA, poolBalB } = pool;
        if (tokAId === `${paymentTokenId}`) {
          const currencyPrice = new BigNumber(poolBalB).div(
            new BigNumber(poolBalA)
          );
          setPoolPrice(priceSUBn.multipliedBy(currencyPrice).toNumber());
          setCurrencyPrice(currencyPrice.toNumber());
        } else {
          const currencyPrice = new BigNumber(poolBalA).div(
            new BigNumber(poolBalB)
          );
          setPoolPrice(priceSUBn.multipliedBy(currencyPrice).toNumber());
          setCurrencyPrice(currencyPrice.toNumber());
        }
        setPool(pool);
      });
  }, []);

  const { activeAccount, signTransactions } = useWallet();
  const [netBalance, setNetBalance] = useState("0");
  useEffect(() => {
    if (!activeAccount || paymentAltTokenId !== "0" || !open) return;
    const { algodClient } = getAlgorandClients();
    algodClient
      .accountInformation(activeAccount.address)
      .do()
      .then((res: any) => {
        setNetBalance(res.amount.toString());
      });
  }, [activeAccount, open]);

  const [balance, setBalance] = useState("0");
  useEffect(() => {
    if (!activeAccount || !open) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    new arc200(Number(paymentTokenId), algodClient, indexerClient)
      .arc200_balanceOf(activeAccount.address)
      .then((res: any) => {
        if (res.success) {
          setBalance(res.returnValue.toString());
        }
      });
  }, [activeAccount, open]);
  const displayBalance = useMemo(() => {
    const smartToken = smartTokens.find(
      (token: TokenType) => `${token.contractId}` === `${paymentTokenId}`
    );
    if (paymentTokenId === 0) {
      return new BigNumber(netBalance).div(new BigNumber(10).pow(6)).toFixed(6);
    } else if (smartToken) {
      const decimals = smartToken?.decimals;
      return smartToken?.tokenId === "0"
        ? new BigNumber(balance)
            .plus(new BigNumber(netBalance))
            .div(new BigNumber(10).pow(decimals))
            .toFixed(Math.min(decimals, 6))
        : new BigNumber(balance)
            .div(new BigNumber(10).pow(decimals))
            .toFixed(Math.min(decimals, 6));
    }
  }, [balance, netBalance, smartTokens, smartTokenStatus]);

  const discount = useMemo(() => {
    const smartToken = smartTokens.find(
      (token: TokenType) => `${token.contractId}` === `${paymentTokenId}`
    );

    const priceSUB = new BigNumber(priceAU).dividedBy(
      new BigNumber(10).pow(smartToken?.decimals)
    );

    return priceSUB
      .minus(new BigNumber(displayBalance || 0))
      .multipliedBy(new BigNumber(smartToken?.price || 0))
      .multipliedBy(multiplier)
      .toFixed(6);
  }, [displayBalance]);

  const [manager, setManager] = useState<string>();
  useEffect(() => {
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
    ci.manager().then((res: any) => {
      if (res.success) {
        setManager(res.returnValue);
      }
    });
  }, [activeAccount]);

  const canBuy = useMemo(() => {
    return new BigNumber(balance)
      .plus(new BigNumber(netBalance))
      .gte(new BigNumber(priceAU));
  }, [balance, netBalance]);

  const handleSave = async (pool: any, discount: any) => {
    await onSave(pool, discount);
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

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="address-modal-title"
      aria-describedby="address-modal-description"
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "white",
          padding: "40px",
          minHeight: "300px",
          minWidth: "400px",
          width: "50vw",
          borderRadius: "25px",
        }}
      >
        <h2 id="address-modal-title">{title}</h2>
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
                <Box
                  sx={{
                    p: 1,
                  }}
                >
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
                <Box
                  sx={{
                    p: 1,
                  }}
                >
                  <InputLabel htmlFor="balance">Seller</InputLabel>
                  <Typography variant="h5" gutterBottom>
                    {seller?.slice(0, 4)}...{seller?.slice(-4)}
                  </Typography>
                </Box>

                {currency !== "VOI" ? (
                  <Box
                    sx={{
                      p: 1,
                    }}
                  >
                    <InputLabel htmlFor="balance">VOI Balance</InputLabel>
                    <Typography variant="h5" gutterBottom>
                      {new BigNumber(netBalance)
                        .div(new BigNumber(10).pow(6))
                        .toFixed(6)}
                    </Typography>
                  </Box>
                ) : null}
                <Box
                  sx={{
                    p: 1,
                  }}
                >
                  <InputLabel htmlFor="balance">{currency} Balance</InputLabel>
                  <Typography variant="h5" gutterBottom>
                    {displayBalance}
                  </Typography>
                </Box>
                {poolPrice > 0 ? (
                  <Box
                    sx={{
                      p: 1,
                    }}
                  >
                    <InputLabel htmlFor="balance">{currency} Price</InputLabel>
                    <Typography variant="h5" gutterBottom>
                      {Number(currencyPrice).toFixed(6)} VOI
                    </Typography>
                  </Box>
                ) : null}
                {highestSale > 0 ? (
                  <Box
                    sx={{
                      p: 1,
                    }}
                  >
                    <InputLabel htmlFor="balance">Highest Sale</InputLabel>
                    <Typography variant="h5" gutterBottom>
                      {formatter.format(highestSale)} VOI
                    </Typography>
                  </Box>
                ) : null}
              </Grid>
              {[421076].includes(Number(token.contractId)) ? (
                <Grid item xs={12}>
                  <StakingInformation contractId={Number(token.tokenId)} />
                </Grid>
              ) : null}
              <Grid item xs={12}>
                <Stack sx={{ mt: 3 }} gap={2}>
                  {pool?.contractId ? (
                    <Button
                      color="secondary"
                      size="large"
                      fullWidth
                      variant="contained"
                      onClick={() => {
                        handleSave(pool, 0);
                      }}
                    >
                      Buy {(Number(poolPrice) * multiplier).toFixed(6)} VOI
                    </Button>
                  ) : null}
                  <Button
                    disabled={!canBuy}
                    size="large"
                    fullWidth
                    variant="contained"
                    onClick={() => handleSave(undefined, 0)}
                  >
                    Buy {price} {currency}
                  </Button>
                  {false && pool && Number(discount) > 0 ? (
                    <Button
                      disabled={Number(discount) > Number(netBalance) / 10 ** 6}
                      size="large"
                      fullWidth
                      variant="contained"
                      onClick={() =>
                        handleSave(
                          pool,
                          new BigNumber(displayBalance || 0).toNumber()
                        )
                      }
                    >
                      Buy {discount} VOI + {displayBalance} {currency}
                    </Button>
                  ) : null}
                  {activeAccount?.address === manager ? (
                    <Button
                      size="large"
                      fullWidth
                      variant="outlined"
                      color="warning"
                      onClick={handleDelete}
                    >
                      Delete
                    </Button>
                  ) : null}
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
    </Modal>
  );
};

export default BuySaleModal;
