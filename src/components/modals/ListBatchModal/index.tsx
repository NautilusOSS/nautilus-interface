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
  Unstable_Grid2 as Grid2,
} from "@mui/material";
import PaymentCurrencyRadio, {
  defaultCurrencies,
} from "../../PaymentCurrencyRadio";
import { collections } from "../../../contants/games";
import axios from "axios";
import { Token } from "@mui/icons-material";
import TokenSelect from "../../TokenSelect";
import RoyaltyCheckbox from "../../checkboxes/RoyaltyCheckbox";
import { NFTIndexerTokenI, TokenType } from "../../../types";
import BigNumber from "bignumber.js";
import { useSelector } from "react-redux";
import { formatter } from "../../../utils/number";
import CartNftCard from "../../CartNFTCard";
import { TOKEN_WVOI } from "../../../contants/tokens";
import { useSmartTokens } from "@/components/Navbar/hooks/collections";
import StakingInformation from "@/components/StakingInformation/StakingInformation";
import { decode } from "punycode";
import { decodeRoyalties } from "@/utils/hf";
import CostBreakdown from "@/components/CostBreakdown";
import { mp } from "ulujs";

// function to split array into chunks

const chunkArray = (arr: any[], chunkSize: number) => {
  const chunkedArray = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunkedArray.push(arr.slice(i, i + chunkSize));
  }
  return chunkedArray;
};

type BatchAction = "list-sale";

interface ListBatchModalProps {
  action: BatchAction;
  open: boolean;
  loading: boolean;
  handleClose: () => void;
  onSave: any;
  title?: string;
  buttonText?: string;
  nfts: NFTIndexerTokenI[];
}

const ListBatchModal: React.FC<ListBatchModalProps> = ({
  action,
  open,
  loading,
  handleClose,
  onSave,
  title = "Enter Address",
  buttonText = "List for Sale",
  nfts,
}) => {
  const [price, setPrice] = useState("");
  const [royalties, setRoyalties] = useState<boolean>(true);
  const [token, setToken] = useState<any>();

  const defaultCurrency: string = "0";
  const [currency, setCurrency] = useState<string>(defaultCurrency);

  const [showDefaultButton, setShowDefaultButton] = useState<boolean>(true);

  const { isLoading: isLoadingSmartTokens, data: smartTokens } =
    useSmartTokens();
  useEffect(() => {
    if (currency === "0") {
      setToken(
        smartTokens.find((token: TokenType) => token.contractId === TOKEN_WVOI)
      );
    } else {
      /*
      setToken(
        smartTokens.find(
          (token: TokenType) => token.contractId === Number(currency)
        )
      );
      */
    }
  }, [smartTokens, currency]);
  /*
  const smartTokens = useSelector((state: any) => state.smartTokens.tokens);
  const smartTokenStatus = useSelector(
    (state: any) => state.smartTokens.status
  );
  */
  const [progress, setProgress] = useState<number>(0);

  /* Modal */

  const handleSave = async () => {
    await onSave(price, currency, token, setProgress);
    setShowDefaultButton(false);
  };

  const onClose = () => {
    setPrice("");
    setCurrency("0");
    setShowDefaultButton(true);
    handleClose();
  };

  const royaltyInfo = useMemo(() => {
    if (!nfts.length) return null;
    const metadata = JSON.parse(nfts[0]?.metadata || "{}");
    const royalties = metadata.royalties || {};
    return decodeRoyalties(royalties);
  }, [nfts]);

  const [mpFee, royaltyFee] = useMemo(() => {
    const mpFee = 500 / 10000;
    const royaltyFee = (royaltyInfo?.royaltyPoints || 0) / 10000;
    return [mpFee, royaltyFee];
  }, [price, royaltyInfo]);

  console.log({ mpFee, royaltyFee, royaltyInfo });

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
        {true || !loading ? (
          <>
            <Grid2 container spacing={2} gap={2}>
              {chunkArray(nfts, 3).map((nft: NFTIndexerTokenI[], index) => (
                <Grid2
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexDirection: "column",
                    padding: "10px",
                    border: `4px solid ${
                      progress > index ? "green" : "lightgray"
                    }`,
                    borderRadius: "20px",
                  }}
                  key={`${index}`}
                >
                  {nft.map((nft: NFTIndexerTokenI) => (
                    <CartNftCard token={nft} imageOnly={true} size="small" />
                  ))}
                </Grid2>
              ))}
            </Grid2>
            <Stack sx={{ mt: 3 }} gap={2}>
              <Box>
                {!loading && progress === 0 ? (
                  <>
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
                  </>
                ) : null}
              </Box>
              <Box>
                {!loading && progress === 0 ? (
                  <TokenSelect
                    disabled={true}
                    filter={(t: TokenType) =>
                      !["LPT", "ARC200LT"].includes(t.symbol)
                    }
                    onChange={(newValue: any) => {
                      if (!newValue) {
                        setCurrency("");
                        return;
                      }
                      const currency = `${newValue?.contractId || "0"}`;
                      console.log({ currency });
                      setCurrency(currency);
                    }}
                  />
                ) : null}
              </Box>
              {/*<Box>
                <RoyaltyCheckbox
                  defaultChecked={royalties}
                  onChange={(e) => {
                    setRoyalties(e.target.checked);
                  }}
                />
              </Box>*/}
              {nfts.length === 1 && [421076].includes(nfts[0].contractId) ? (
                <Box>
                  <StakingInformation contractId={nfts[0].tokenId} />
                </Box>
              ) : null}
              {nfts.length > 1 ? (
                <Box>
                  <Typography variant="caption">
                    {price ? (
                      <>
                        <span>
                          Listing {nfts.length} assets for sale at price {price}{" "}
                          {token?.contractId === TOKEN_WVOI
                            ? "VOI"
                            : token?.symbol}
                          .
                        </span>{" "}
                        {royalties ? (
                          <span>
                            Royalties will be applied. Proceeds of sales may
                            vary.
                          </span>
                        ) : null}{" "}
                        <span>Reject transaction in wallet to cancel.</span>
                      </>
                    ) : null}
                  </Typography>
                </Box>
              ) : (
                <CostBreakdown
                  price={Number(price)}
                  marketplaceFeeRate={mpFee}
                  royaltyFeeRate={royaltyFee}
                  symbol="VOI"
                />
              )}
              {showDefaultButton ? (
                <Button
                  disabled={loading}
                  size="large"
                  fullWidth
                  variant="contained"
                  onClick={handleSave}
                >
                  {loading ? "Pending transaction..." : buttonText}
                </Button>
              ) : null}
              <Button
                size="large"
                fullWidth
                variant="outlined"
                onClick={handleClose}
              >
                Close
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

export default ListBatchModal;
