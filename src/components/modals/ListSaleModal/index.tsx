import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Button,
  TextField,
  CircularProgress,
  Stack,
  InputLabel,
  Box,
  Grid,
  FormControl,
  Typography,
} from "@mui/material";
import PaymentCurrencyRadio, {
  defaultCurrencies,
} from "../../PaymentCurrencyRadio";
import { collections } from "../../../contants/games";
import axios from "axios";
import { Token } from "@mui/icons-material";
import TokenSelect from "../../TokenSelect";
import RoyaltyCheckbox from "../../checkboxes/RoyaltyCheckbox";
import { TokenType } from "../../../types";
import BigNumber from "bignumber.js";
import { useSelector } from "react-redux";
import { formatter } from "../../../utils/number";
import CartNftCard from "../../CartNFTCard";

interface ListSaleModalProps {
  open: boolean;
  loading: boolean;
  handleClose: () => void;
  onSave: (address: string, amount: string, token: any) => Promise<void>;
  title?: string;
  buttonText?: string;
  //image: string;
  //royalties: number;
  nft: any;
}

const ListSaleModal: React.FC<ListSaleModalProps> = ({
  open,
  loading,
  handleClose,
  onSave,
  //image,
  //royalties,
  nft,
  title = "Enter Address",
  buttonText = "List for Sale",
}) => {
  /* Price */
  const [price, setPrice] = useState("");
  const [royalties, setRoyalties] = useState<boolean>(true);
  const [token, setToken] = useState<any>();

  /* Payment currency */

  // only VIA sales are allowed for the time being
  // TODO add as a something that can be switch on and off by manager later
  // const isGameCollection = useMemo(
  //   () =>
  //     collections
  //       .map((collection) => collection.applicationID)
  //       .includes(nft.contractId),
  //   [nft.contractId]
  // );

  const defaultCurrency: string = "0";
  const [currency, setCurrency] = useState<string>(defaultCurrency);
  const currencies = defaultCurrencies;

  // const handleCurrencyChange = (newCurrency: string) => {
  //   setCurrency(newCurrency);
  // };

  const [tokens, setTokens] = useState<any[]>([]);
  useEffect(() => {
    axios
      .get(`https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/tokens`)
      .then(({ data }) => setTokens(data.tokens));
  }, []);

  useEffect(() => {
    if (currency === "0") {
      setToken(tokens.find((token) => token.contractId === 34099056));
    } else {
      setToken(tokens.find((token) => token.contractId === Number(currency)));
    }
  });

  const smartTokens = useSelector((state: any) => state.smartTokens.tokens);
  const smartTokenStatus = useSelector(
    (state: any) => state.smartTokens.status
  );
  const [highestSale, setHighestSale] = useState<number>(0);
  useEffect(() => {
    axios
      .get(
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/mp/sales?collectionId=${nft.contractId}&tokenId=${nft.tokenId}`
      )
      .then(({ data }) => {
        const highestSale = data.sales
          .map((sale: any) => {
            const smartToken = smartTokens.find(
              (token: TokenType) => `${token.contractId}` === `${sale.currency}`
            );
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
  }, [smartTokens, smartTokenStatus, nft]);

  const royaltyPercent = useMemo(() => {
    return royalties ? nft?.royalties?.royaltyPercent || 0 : 0;
  }, [royalties]);

  const proceeds = useMemo(() => {
    return new BigNumber(price)
      .times(100 - (royaltyPercent + 2.5))
      .div(100)
      .toFixed(token?.decimals || 0);
  }, [price, royaltyPercent, token]);

  /* Modal */

  const handleSave = async () => {
    await onSave(price, currency, token);
    handleClose();
  };

  const onClose = () => {
    setPrice("");
    setCurrency(defaultCurrency); // reset to default VIA
    handleClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
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
                <CartNftCard token={nft} imageOnly={true} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box
                  sx={{
                    p: 1,
                  }}
                >
                  <InputLabel htmlFor="price">Price</InputLabel>
                  <TextField
                    id="price"
                    label="Price"
                    variant="outlined"
                    value={price}
                    fullWidth
                    margin="normal"
                    onChange={(e) => setPrice(e.target.value)}
                  />
                  {highestSale > 0 ? (
                    <Typography variant="caption">
                      Highest Sale: {formatter.format(highestSale)}
                    </Typography>
                  ) : null}
                  {/*<Box sx={{ mt: 2 }}>
                    <PaymentCurrencyRadio
                      selectedValue={currency}
                      // onCurrencyChange={handleCurrencyChange}
                      onCurrencyChange={() => {}}
                      currencies={currencies}
                      disabled={true}
                    />
                </Box>*/}
                  <Box sx={{ mt: 2 }}>
                    <TokenSelect
                      filter={(t: TokenType) =>
                        !["LPT", "ARC200LT"].includes(t.symbol)
                      }
                      onChange={(newValue: any) => {
                        if (!newValue) {
                          setCurrency("");
                          return;
                        }
                        const currency = `${newValue?.contractId || "0"}`;
                        if (currency === "0") {
                          const CTC_INFO_WVOI = 34099056;
                          setCurrency(`0,${CTC_INFO_WVOI}`);
                        } else {
                          setCurrency(`${newValue?.contractId}`);
                        }
                      }}
                    />
                  </Box>
                  {/*<Box sx={{ mt: 2 }}>
                    <RoyaltyCheckbox
                      defaultChecked={royalties}
                      onChange={(e) => {
                        setRoyalties(e.target.checked);
                      }}
                    />
                    </Box>*/}
                </Box>
              </Grid>
              {/*<Grid xs={12}>
                <Box
                  sx={{
                    p: 1,
                  }}
                >
                  <InputLabel htmlFor="royalties">You Recieve</InputLabel>
                  <TextField
                    id="proceeds"
                    label="Proceeds"
                    variant="outlined"
                    value={
                      isNaN(Number(proceeds)) ? "" : proceeds.toLocaleString()
                    }
                    fullWidth
                    margin="normal"
                    disabled
                  />
                </Box>
                  </Grid>*/}
            </Grid>
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
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ListSaleModal;
