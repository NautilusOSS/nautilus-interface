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
  Select,
  MenuItem,
  SelectChangeEvent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
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
import { useWallet } from "@txnlab/use-wallet-react";
import { get } from "http";
import { getAlgorandClients } from "@/wallets";
import { abi, CONTRACT } from "ulujs";
import algosdk from "algosdk";

interface MultipleSelectNativeProps {
  options: any[];
  onChange: (newValue: any) => void;
}
function MultipleSelectNative(props: MultipleSelectNativeProps) {
  const [contractId, setContractId] = React.useState<string[]>([]);
  const handleChangeMultiple = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const { options } = event.target;
    const value: string[] = [];
    for (let i = 0, l = options.length; i < l; i += 1) {
      if (options[i].selected) {
        value.push(options[i].value);
      }
    }
    setContractId(value);
    props.onChange(value);
  };

  return (
    <div>
      <FormControl sx={{ width: "100%", minHeight: "160px" }}>
        <InputLabel shrink htmlFor="select-multiple-native">
          Contract Id
        </InputLabel>
        <Select<string[]>
          multiple
          native
          value={contractId}
          // @ts-ignore Typings are not considering `native`
          onChange={handleChangeMultiple}
          label="Contract Id"
          inputProps={{
            id: "select-multiple-native",
          }}
        >
          {props.options.map((option: any) => (
            <option key={option.contractId} value={option.contractId}>
              {option.contractId}
            </option>
          ))}
        </Select>
      </FormControl>
    </div>
  );
}

interface MintModalProps {
  open: boolean;
  loading: boolean;
  handleClose: () => void;
  onSave: (address: string, amount: string, token: any) => Promise<void>;
  title?: string;
  buttonText?: string;
  image: string;
  accounts: any[];
  collectionId: number;
}

const MintModal: React.FC<MintModalProps> = ({
  open,
  loading,
  handleClose,
  onSave,
  accounts,
  image,
  title = "Enter Address",
  buttonText = "List for Sale",
  collectionId,
}) => {
  const { activeAccount, signTransactions } = useWallet();
  const [contractId, setContractId] = useState("");
  const handleChange = (newValue: any) => {
    setContractId(newValue[0]);
  };

  /* Modal */

  const handleMint = async () => {
    if (!activeAccount) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    const apid = Number(collectionId);
    const to = activeAccount.address;
    const tokenId = Number(contractId);
    const ci = new CONTRACT(apid, algodClient, indexerClient, abi.custom, {
      addr: activeAccount.address,
      sk: new Uint8Array(0),
    });
    const builder = {
      arc72: new CONTRACT(
        apid,
        algodClient,
        indexerClient,
        {
          name: "OSARC72Token",
          methods: [
            {
              name: "mint",
              args: [
                {
                  type: "address",
                  name: "to",
                },
                {
                  type: "uint64",
                  name: "tokenId",
                },
              ],
              readonly: false,
              returns: {
                type: "uint256",
              },
              desc: "Mint a new NFT",
            },
          ],
          events: [],
        },
        {
          addr: activeAccount.address,
          sk: new Uint8Array(0),
        },
        true,
        false,
        true
      ),
      ownable: new CONTRACT(
        tokenId,
        algodClient,
        indexerClient,
        {
          name: "Ownable",
          methods: [
            {
              name: "transfer",
              args: [
                {
                  type: "address",
                  name: "new_owner",
                },
              ],
              readonly: false,
              returns: {
                type: "void",
              },
            },
          ],
          events: [],
        },
        {
          addr: activeAccount.address,
          sk: new Uint8Array(0),
        },
        true,
        false,
        true
      ),
    };
    const buildN = [];
    const txnO = (
      await builder.ownable.transfer(algosdk.getApplicationAddress(apid))
    ).obj;
    console.log({ transfer: txnO });
    buildN.push({
      ...txnO,
    });
    const txn1 = (await builder.arc72.mint(to, tokenId)).obj;
    console.log({ mint: txn1 });
    buildN.push({
      ...txn1,
      payment: 336700,
    });
    ci.setFee(3000);
    ci.setEnableGroupResourceSharing(true);
    ci.setExtraTxns(buildN);
    const customR = await ci.custom();
    if (customR.success) {
      await signTransactions(
        customR.txns.map(
          (t: string) => new Uint8Array(Buffer.from(t, "base64"))
        )
      )
        .then((stxns: any) =>
          algodClient.sendRawTransaction(stxns as Uint8Array[]).do()
        )
        .then(() => handleClose());
    }
  };

  const onClose = () => {
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
        <Typography variant="h6">{title}</Typography>
        {!loading ? (
          <Box sx={{ mt: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <img
                  src="https://prod.cdn.highforge.io/i/ipfs%3A%2F%2FQmVbGFgCgeW9mMBHHRmTY5TPA3kVLxFHpb2ztP3GArzzEQ%23arc3?w=400"
                  alt="NFT"
                  style={{ width: "100%", borderRadius: "25px" }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <MultipleSelectNative
                  options={accounts}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6">Contract Details</Typography>
              </Grid>
              {accounts
                .filter((el) => el.contractId === Number(contractId))
                .map((el) => (
                  <Grid item xs={12}>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell>Contract Id</TableCell>
                          <TableCell align="right">
                            <a
                              href={`https://explorer.voi.network/explorer/application/${el.contractId}/transactions`}
                              target="_blank"
                            >
                              {el.contractId}
                            </a>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Contract Address</TableCell>
                          <TableCell align="right">
                            <a
                              href={`https://explorer.voi.network/explorer/account/${el.contractAddress}/transactions`}
                              target="_blank"
                            >
                              {el.contractAddress.slice(0, 10)}...
                              {el.contractAddress.slice(-10)}
                            </a>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Stake Amount</TableCell>
                          <TableCell align="right">
                            {formatter.format(el.global_initial / 10 ** 6)} VOI
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Total Tokens</TableCell>
                          <TableCell align="right">
                            {el.global_period > 5
                              ? formatter.format(el.global_total)
                              : formatter.format(el.global_total)}{" "}
                            VOI
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Lockup</TableCell>
                          <TableCell align="right">
                            {el.global_period > 5
                              ? `${el.global_period + 1} mo`
                              : `${el.global_period} yrs`}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Vesting</TableCell>
                          <TableCell align="right">
                            {el.global_period > 5
                              ? `${Math.min(12, el.global_period)} mo`
                              : `12 mo`}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </Grid>
                ))}
            </Grid>
            <Stack sx={{ mt: 3 }} gap={2}>
              <Button
                disabled={contractId === ""}
                size="large"
                fullWidth
                variant="contained"
                onClick={handleMint}
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
          </Box>
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

export default MintModal;
