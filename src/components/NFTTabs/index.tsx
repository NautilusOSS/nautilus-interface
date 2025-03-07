import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import axios from "axios";
import NFTSalesTable from "../NFTSalesTable";
import moment from "moment";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { getSmartTokens } from "../../store/smartTokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { BigNumber } from "bignumber.js";
import { stakingRewards } from "@/static/staking/staking";
import { useStakingContract } from "@/hooks/staking";
import StakingInformation from "../StakingInformation/StakingInformation";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import { Button } from "@mui/material";
import { useWallet } from "@txnlab/use-wallet-react";
import { toast } from "react-toastify";
import { abi, CONTRACT } from "ulujs";
import { getAlgorandClients } from "@/wallets";
import algosdk from "algosdk";
import { CTCINFO_MP206, CTCINFO_MP206_2 } from "@/contants/mp";

const formatter = Intl.NumberFormat("en", { notation: "compact" });

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

interface Offer {
  mpListingId: number;
  offerer: string;
  price: number;
  currency: number;
  active: number;
}

interface NFTTabsProps {
  nft: any;
  loading: boolean;
  exchangeRate: number;
}

const NFTTabs: React.FC<NFTTabsProps> = ({ nft, loading, exchangeRate }) => {
  const dispatch = useDispatch();
  const { activeAccount, signTransactions } = useWallet();
  /* Smart Tokens */
  const smartTokens = useSelector((state: any) => state.smartTokens.tokens);
  const smartTokenStatus = useSelector(
    (state: any) => state.smartTokens.status
  );
  React.useEffect(() => {
    dispatch(getSmartTokens() as unknown as UnknownAction);
  }, [dispatch]);

  const sales = useSelector((state: any) => state.sales.sales);
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  /* Tabs */
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const tokenSales = React.useMemo(() => {
    const tokenSales = sales.filter(
      (sale: any) =>
        sale.collectionId === nft.contractId && sale.tokenId === nft.tokenId
    );
    tokenSales.sort((a: any, b: any) => b.timestamp - a.timestamp);
    return tokenSales;
  }, [sales, nft]);

  const { data: stakingAccountData, isLoading: loadingStakingAccountData } =
    useStakingContract(nft.tokenId);

  const tabs = React.useMemo(() => {
    const baseTabs = [
      { label: "History", index: 0 },
      { label: "Offers", index: 1 },
    ];

    if (stakingAccountData) {
      baseTabs.splice(1, 0, { label: "Staking Information", index: 1 });
    }

    return baseTabs;
  }, [stakingAccountData]);

  const [offers, setOffers] = React.useState<Offer[]>([]);

  React.useEffect(() => {
    const fetchOffers = async () => {
      try {
        const response = await axios.get(
          `https://mainnet-idx.nautilus.sh/nft-indexer/v1/mp/offers?active=1&collectionId=${nft.contractId}&tokenId=${nft.tokenId}`
        );
        setOffers(response.data.offers);
      } catch (error) {
        console.error("Error fetching offers:", error);
        setOffers([]);
      }
    };
    console.log({ offers });

    if (nft.contractId && nft.tokenId) {
      fetchOffers();
    }
  }, [nft.contractId, nft.tokenId]);

  const handleCancelOffer = async (
    offerId: number,
    offerer: string,
    offerAmount: number
  ) => {
    try {
      console.log({ offerId, offerer, offerAmount });
      if (!activeAccount) {
        toast.info("Please connect wallet!");
        return;
      }
      const feeAmountBI = BigInt(
        new BigNumber(offerAmount).multipliedBy(0.1).toFixed(0)
      );
      const offerAmountBI = BigInt(offerAmount);
      const totalAmount = offerAmountBI + feeAmountBI;
      //setIsOffering(true);
      // -------------------------------------
      const { algodClient, indexerClient } = getAlgorandClients();
      const ctcInfoMP213 = 8329112; // mp213 offers
      const ctcInfoNV = 8324600; // Nautilus Voi NV
      const ci = new CONTRACT(
        ctcInfoMP213,
        algodClient,
        indexerClient,
        abi.custom,
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );
      const ciARC200 = new CONTRACT(
        ctcInfoNV,
        algodClient,
        indexerClient,
        abi.nt200,
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );
      const ciARC72 = new CONTRACT(
        ctcInfoNV,
        algodClient,
        indexerClient,
        abi.arc72,
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );
      const builder = {
        arc200: new CONTRACT(
          ctcInfoNV,
          algodClient,
          indexerClient,
          abi.nt200,
          {
            addr: activeAccount?.address || "",
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
        arc72: new CONTRACT(
          nft.contractId,
          algodClient,
          indexerClient,
          abi.arc72,
          { addr: activeAccount.address, sk: new Uint8Array(0) },
          true,
          false,
          true
        ),
        mp: new CONTRACT(
          ctcInfoMP213,
          algodClient,
          indexerClient,
          {
            name: "mp213",
            desc: "mp213",
            methods: [
              // a_offer_deleteListing(uint256)void
              {
                name: "a_offer_deleteListing",
                args: [{ type: "uint256", name: "offerId" }],
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
      // -------------------------------------
      // delete listing
      // -------------------------------------
      {
        const txnO = (await builder.mp.a_offer_deleteListing(BigInt(offerId)))
          ?.obj;
        console.log({ txnO });
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode(`a_offer_deleteListing:${offerId}`),
          foreignApps: [ctcInfoNV, nft.contractId],
          accounts: [
            "RTKWX3FTDNNIHMAWHK5SDPKH3VRPPW7OS5ZLWN6RFZODF7E22YOBK2OGPE",
          ],
        });
      }
      // -------------------------------------
      // withdraw
      // -------------------------------------
      {
        const txnO = (await builder.arc200.withdraw(totalAmount))?.obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode(`withdraw:${totalAmount}`),
        });
      }
      // -------------------------------------
      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);
      ci.setFee(3000);
      const cutsomR = await ci.custom();
      console.log({ cutsomR });
      const stxns = await signTransactions(
        cutsomR.txns.map((el: any) => new Uint8Array(Buffer.from(el, "base64")))
      );
      const txn = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();
      await algosdk.waitForConfirmation(algodClient, txn.txId, 4);
      // -------------------------------------
      // After successful cancellation, remove the offer from the local state
      setOffers(offers.filter((offer) => offer.mpListingId !== offerId));
      toast.success("Offer cancelled successfully!");
      //setOpenOfferModal(false);
    } catch (e: any) {
      console.log(e);
      toast.error(e.message);
    } finally {
      //setIsOffering(false);
    }
  };

  const handleAcceptOffer = async (
    offerId: number,
    offerer: string,
    offerAmount: number
  ) => {
    try {
      if (!activeAccount) {
        toast.info("Please connect wallet!");
        return;
      }
      //setIsOffering(true);
      // -------------------------------------
      const { algodClient, indexerClient } = getAlgorandClients();
      const ctcInfoMP213 = 8329112; // mp213 offers
      const ctcInfoNV = 8324600; // Nautilus Voi NV
      const ci = new CONTRACT(
        ctcInfoMP213,
        algodClient,
        indexerClient,
        abi.custom,
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );
      const ciARC200 = new CONTRACT(
        ctcInfoNV,
        algodClient,
        indexerClient,
        abi.nt200,
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );
      const ciARC72 = new CONTRACT(
        ctcInfoNV,
        algodClient,
        indexerClient,
        abi.arc72,
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );
      const builder = {
        arc200: new CONTRACT(
          ctcInfoNV,
          algodClient,
          indexerClient,
          abi.nt200,
          {
            addr: activeAccount?.address || "",
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
        arc72: new CONTRACT(
          nft.contractId,
          algodClient,
          indexerClient,
          abi.arc72,
          { addr: activeAccount.address, sk: new Uint8Array(0) },
          true,
          false,
          true
        ),
        mp206: new CONTRACT(
          CTCINFO_MP206,
          algodClient,
          indexerClient,
          abi.mp,
          { addr: activeAccount.address, sk: new Uint8Array(0) },
          true,
          false,
          true
        ),
        mp213: new CONTRACT(
          ctcInfoMP213,
          algodClient,
          indexerClient,
          {
            name: "mp213",
            desc: "mp213",
            methods: [
              // a_offer_acceptSC(uint256)void
              {
                name: "a_offer_acceptSC",
                args: [{ type: "uint256", name: "offerId" }],
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
      // -------------------------------------
      // createBalanceBox if needed
      // approve spending
      // -------------------------------------
      // createBalanceBox if needed
      // -------------------------------------
      {
        ciARC200.setPaymentAmount(28500);
        const createBalanceBoxR = await ciARC200.createBalanceBox(
          activeAccount.address
        );
        if (createBalanceBoxR.success) {
          const txnO = (
            await builder.arc200.createBalanceBox(activeAccount.address)
          )?.obj;
          buildN.push({
            ...txnO,
            payment: 28500,
            note: new TextEncoder().encode(
              `createBalanceBox:${activeAccount.address}`
            ),
          });
        }
      }
      // -------------------------------------
      // arc72 approve
      // -------------------------------------
      {
        const txn = (
          await builder.arc72.arc72_approve(
            algosdk.getApplicationAddress(ctcInfoMP213),
            BigInt(nft.tokenId)
          )
        )?.obj;
        buildN.push({
          ...txn,
          note: new TextEncoder().encode(
            `arc72_approve:${algosdk.getApplicationAddress(ctcInfoNV)}:${
              activeAccount.address
            }:${BigInt(nft.tokenId)}`
          ),
        });
      }
      // -------------------------------------
      // mp206 delete listings
      // -------------------------------------
      if (nft.listing && nft.listing.seller === activeAccount.address) {
        const txnO = (
          await builder.mp206.a_sale_deleteListing(
            BigInt(nft.listing.mpListingId)
          )
        )?.obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode(
            `a_sale_deleteListing:${nft.listing.mpListingId}`
          ),
        });
      }
      // -------------------------------------
      // accept offer sc
      // -------------------------------------
      {
        const txnO = (await builder.mp213.a_offer_acceptSC(BigInt(offerId)))
          ?.obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode(`a_offer_acceptSC:${offerId}`),
          //foreignApps: [ctcInfoNV, nft.contractId],
          //accounts: [offerer],
        });
      }
      // -------------------------------------
      // withdraw
      // -------------------------------------
      {
        const txnO = (await builder.arc200.withdraw(offerAmount))?.obj;
        buildN.push({
          ...txnO,
          note: new TextEncoder().encode(`withdraw:${offerAmount}`),
          //accounts: [offerer],
        });
      }
      // -------------------------------------
      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN);
      ci.setFee(3000);
      const cutsomR = await ci.custom();
      console.log({ cutsomR });
      const stxns = await signTransactions(
        cutsomR.txns.map((el: any) => new Uint8Array(Buffer.from(el, "base64")))
      );
      const txn = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();
      await algosdk.waitForConfirmation(algodClient, txn.txId, 4);
      // -------------------------------------
      // After successful acceptance, remove the offer from the local state
      setOffers(offers.filter((offer) => offer.mpListingId !== offerId));
      toast.success("Offer accepted successfully!");
      //setOpenOfferModal(false);
    } catch (e: any) {
      console.log(e);
      toast.error(e.message);
    } finally {
      //setIsOffering(false);
    }
  };

  return !loading ? (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          sx={{
            color: "717579",
            "& .MuiTabs-root": {},
            "& .MuiTabs-indicator": {
              color: "#93F",
              backgroundColor: "#93F",
            },
            "& .Mui-selected": {
              color: "#93F",
              textAlign: "center",
              leadingTrim: "both",
              textEdge: "cap",
              fontFamily: "Nohemi",
              //fontSize: "24px",
              fontStyle: "normal",
              fontWeight: "700",
              lineHeight: "20px",
            },
          }}
          textColor="inherit"
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.index}
              sx={{
                color: "717579",
              }}
              label={tab.label}
              {...a11yProps(tab.index)}
            />
          ))}
        </Tabs>
      </Box>
      <CustomTabPanel value={value} index={0}>
        {tokenSales && tokenSales.length > 0 ? (
          <NFTSalesTable
            sales={
              tokenSales?.map((sale: any) => {
                const currency = smartTokens.find(
                  (token: any) => `${token.contractId}` === `${sale.currency}`
                );
                console.log({ currency });
                const currencySymbol =
                  currency?.tokenId === "0" ? "VOI" : currency?.symbol || "VOI";
                const currencyDecimals =
                  currency?.decimals === 0 ? 0 : currency?.decimals || 6;
                const currencyPrice =
                  currency?.tokenId === "0" ? 0 : currency?.price || 0;
                const priceBn = new BigNumber(sale.price).div(
                  new BigNumber(10).pow(currencyDecimals)
                );
                const price = formatter.format(priceBn.toNumber());
                const normalPrice = formatter.format(
                  new BigNumber(currencyPrice).multipliedBy(priceBn).toNumber()
                );
                return {
                  event: "Sale",
                  price: price,
                  normalPrice: currencyPrice > 0 ? normalPrice : 0,
                  currency: currencySymbol,
                  seller: sale.seller,
                  buyer: sale.buyer,
                  date: moment.unix(sale.timestamp).format("LLL"),
                  round: sale.round,
                };
              }) || []
            }
          />
        ) : (
          <Typography
            variant="body2"
            sx={{
              color: isDarkTheme ? "#fff" : "#000",
              textAlign: "left",
              paddingTop: "20px",
            }}
          >
            No sales found
          </Typography>
        )}
      </CustomTabPanel>
      {stakingAccountData && (
        <CustomTabPanel value={value} index={1}>
          <StakingInformation contractId={Number(nft.tokenId)} />
        </CustomTabPanel>
      )}
      <CustomTabPanel value={value} index={stakingAccountData ? 2 : 1}>
        {offers && offers.length > 0 ? (
          <Box sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: isDarkTheme ? "#fff" : "#000" }}>
                    Event
                  </TableCell>
                  <TableCell sx={{ color: isDarkTheme ? "#fff" : "#000" }}>
                    Offer Amount
                  </TableCell>
                  <TableCell sx={{ color: isDarkTheme ? "#fff" : "#000" }}>
                    Currency
                  </TableCell>
                  <TableCell sx={{ color: isDarkTheme ? "#fff" : "#000" }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {offers.map((offer) => (
                  <TableRow key={offer.mpListingId}>
                    <TableCell sx={{ color: isDarkTheme ? "#fff" : "#000" }}>
                      Offer
                    </TableCell>
                    <TableCell sx={{ color: isDarkTheme ? "#fff" : "#000" }}>
                      {offer.price / 1e6}
                    </TableCell>
                    <TableCell sx={{ color: isDarkTheme ? "#fff" : "#000" }}>
                      {offer.currency === 8324600 ? "VOI" : offer.currency}
                    </TableCell>
                    <TableCell>
                      {offer.offerer !== activeAccount?.address &&
                        nft.owner === activeAccount?.address && (
                          <Button
                            variant="contained"
                            onClick={() =>
                              handleAcceptOffer(
                                offer.mpListingId,
                                offer.offerer,
                                offer.price
                              )
                            }
                          >
                            Accept
                          </Button>
                        )}
                      {offer.offerer === activeAccount?.address && (
                        <Button
                          variant="contained"
                          onClick={() =>
                            handleCancelOffer(
                              offer.mpListingId,
                              offer.offerer,
                              offer.price
                            )
                          }
                        >
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        ) : (
          <Typography
            variant="body2"
            sx={{
              color: isDarkTheme ? "#fff" : "#000",
              textAlign: "left",
              paddingTop: "20px",
            }}
          >
            No offers found
          </Typography>
        )}
      </CustomTabPanel>
    </Box>
  ) : null;
};

export default NFTTabs;
