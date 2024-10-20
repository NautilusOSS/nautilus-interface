import React, { useContext, useEffect, useMemo } from "react";
import Layout from "../../layouts/Default";
import {
  Avatar,
  Box,
  Button,
  ButtonGroup,
  Container,
  Grid,
  Unstable_Grid2 as Grid2,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import CartNftCard from "../../components/CartNFTCard";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/store";
import axios from "axios";
import { stringToColorCode, stripTrailingZeroBytes } from "../../utils/string";
import styled from "styled-components";
import FireplaceIcon from "@mui/icons-material/Fireplace";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "react-toastify";
import SendIcon from "@mui/icons-material/Send";
import { getAlgorandClients } from "../../wallets";
import { arc72, CONTRACT, abi, arc200, swap, mp } from "ulujs";
import TransferModal from "../../components/modals/TransferModal";
import ListSaleModal from "../../components/modals/ListSaleModal";
import ListAuctionModal from "../../components/modals/ListAuctionModal";
import algosdk from "algosdk";
import {
  ListingBoxCost,
  CTCINFO_MP206,
  CTCINFO_MP206_2,
} from "../../contants/mp";
import { decodeRoyalties } from "../../utils/hf";
import NFTListingTable from "../../components/NFTListingTable";
import { ListingI, MListedNFTTokenI, Token, TokenType } from "../../types";
import ViewListIcon from "@mui/icons-material/ViewList";
import GridViewIcon from "@mui/icons-material/GridView";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { getPrices } from "../../store/dexSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { CTCINFO_LP_WVOI_VOI } from "../../contants/dex";
import StorefrontIcon from "@mui/icons-material/Storefront";
import GavelIcon from "@mui/icons-material/Gavel";
import { ARC72_INDEXER_API } from "../../config/arc72-idx";
import { QUEST_ACTION, getActions, submitAction } from "../../config/quest";
import { BigNumber } from "bignumber.js";
import { getSmartTokens } from "../../store/smartTokenSlice";
import ListBatchModal from "../../components/modals/ListBatchModal";
import { TOKEN_WVOI } from "../../contants/tokens";
import {
  useListings,
  usePrices,
  useSmartTokens,
} from "@/components/Navbar/hooks/collections";
import { GridLoader } from "react-spinners";
import { useWallet } from "@txnlab/use-wallet-react";
import InfoIcon from "@mui/icons-material/Info";

const formatter = Intl.NumberFormat("en", { notation: "compact" });

const { algodClient, indexerClient } = getAlgorandClients();

const ListingGrid = styled.div`
  display: flex;
  align-items: flex-start;
  align-content: flex-start;
  gap: 20px var(--Main-System-20px, 20px);
  flex-wrap: wrap;
  margin-top: 48px;
`;

const StyledLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const AccountLabel = styled.div`
  font-family: Nohemi;
  font-size: 16px;
  font-weight: 500;
  line-height: 36px;
  letter-spacing: 0em;
  text-align: left;
  color: #717579;
`;

const AccountValue = styled.div`
  font-family: Inter;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  letter-spacing: 0px;
  text-align: center;
`;

export const Account: React.FC = () => {
  const dispatch = useDispatch();

  const { data: smartTokens, status: smartTokensStatus } = useSmartTokens();

  /* Dex */
  const { data: prices, status: dexStatus } = usePrices();
  // const prices = useSelector((state: RootState) => state.dex.prices);
  // const dexStatus = useSelector((state: RootState) => state.dex.status);
  // useEffect(() => {
  //   dispatch(getPrices() as unknown as UnknownAction);
  // }, [dispatch]);
  const exchangeRate = useMemo(() => {
    if (!prices || dexStatus !== "success") return 0;
    const voiPrice = prices?.find((p) => p.contractId === CTCINFO_LP_WVOI_VOI);
    if (!voiPrice) return 0;
    return voiPrice.rate;
  }, [prices, dexStatus]);

  /* Router */

  const { id } = useParams();
  const navigate = useNavigate();

  const idArr = id?.indexOf(",") !== -1 ? id?.split(",") || [] : [id];

  /* Selection */
  const [selected, setSelected] = React.useState<number[]>([]);
  const [selected2, setSelected2] = React.useState<number[]>([]);
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");

  /* Wallet */
  const { activeAccount, signTransactions } = useWallet();

  /* Copy to clipboard */

  const [copiedText, copy] = useCopyToClipboard();

  const handleCopy = (text: string) => () => {
    copy(text)
      .then(() => {
        toast.success("Copied to clipboard!");
      })
      .catch((error) => {
        toast.error("Failed to copy to clipboard!");
      });
  };

  /* Theme */

  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  /* NFT Navigator Listings */

  const { data: listings } = useListings({
    seller: idArr,
  });

  const normalListings = useMemo(() => {
    if (!listings || !smartTokens) return [];
    return (
      listings?.map((listing: ListingI) => {
        const paymentCurrency = smartTokens.find(
          (st: TokenType) => `${st.contractId}` === `${listing.currency}`
        );
        return {
          ...listing,
          paymentCurrency,
          normalPrice: 0,
        };
      }) ?? []
    );
  }, [listings, smartTokens]);

  const filteredListings = useMemo(() => {
    return normalListings.map((listing: ListingI) => {
      return {
        ...listing,
        token: {
          ...listing.token,
          metadataURI: stripTrailingZeroBytes(
            listing?.token?.metadataURI || ""
          ),
        },
      };
    });
  }, [normalListings]);

  console.log({ filteredListings });

  /* NFT Navigator Collections */
  const [collections, setCollections] = React.useState<any>(null);
  React.useEffect(() => {
    try {
      (async () => {
        const {
          data: { collections: res },
        } = await axios.get(`${ARC72_INDEXER_API}/nft-indexer/v1/collections`);
        const collections = [];
        for (const c of res) {
          const t = c.firstToken;
          if (!!t?.metadata) {
            const tm = JSON.parse(t.metadata);
            collections.push({
              ...c,
              firstToken: {
                ...t,
                metadata: tm,
              },
            });
          }
        }
        setCollections(collections);
      })();
    } catch (e) {
      console.log(e);
    }
  }, [listings]);

  /* NFT Navigator NFTs */
  const [nfts, setNfts] = React.useState<MListedNFTTokenI[]>(
    [] as MListedNFTTokenI[]
  );
  React.useEffect(() => {
    try {
      (async () => {
        const {
          data: { tokens: res },
        } = await axios.get(`${ARC72_INDEXER_API}/nft-indexer/v1/tokens`, {
          params: {
            owner: idArr,
          },
        });
        const nfts = [];
        for (const t of res) {
          const listing = listings?.find(
            (l: any) =>
              `${l.collectionId}` === `${t.contractId}` &&
              `${l.tokenId}` === `${t.tokenId}`
          );
          nfts.push({
            ...t,
            listing,
            metadataURI: stripTrailingZeroBytes(t.metadataURI),
          });
        }
        nfts.sort((a, b) => (a.listing?.price && a.listing?.currency ? 1 : -1));

        setNfts(nfts);
      })();
    } catch (e) {
      console.log(e);
    }
  }, [listings]);
  console.log({ nfts });

  const listedNfts = useMemo(() => {
    const listedNfts =
      nfts
        ?.filter((nft: any) => {
          return listings?.some(
            (listing: any) =>
              `${listing.collectionId}` === `${nft.contractId}` &&
              `${listing.tokenId}` === `${nft.tokenId}`
          );
        })
        ?.map((nft: any) => {
          const listing = listings?.find(
            (l: any) =>
              `${l.collectionId}` === `${nft.contractId}` &&
              `${l.tokenId}` === `${nft.tokenId}`
          );
          return {
            ...nft,
            listing,
          };
        }) || [];
    listedNfts.sort(
      (a: any, b: any) => b.listing.collectionId - a.listing.collectionId
    );
    return listedNfts;
  }, [nfts, listings]);

  const listedCollections = useMemo(() => {
    const listedCollections =
      collections
        ?.filter((c: any) => {
          return listedNfts?.some(
            (nft: any) => `${nft.contractId}` === `${c.contractId}`
          );
        })
        ?.map((c: any) => {
          return {
            ...c,
            tokens: listedNfts?.filter(
              (nft: any) => `${nft.contractId}` === `${c.contractId}`
            ),
          };
        }) || [];
    listedCollections.sort(
      (a: any, b: any) =>
        b.tokens[0].listing.createTimestamp -
        a.tokens[0].listing.createTimestamp
    );
    return listedCollections;
  }, [collections, listedNfts]);

  const isLoading = useMemo(
    () =>
      !collections || !nfts || !listings || !listedNfts || !listedCollections,
    [collections, nfts, listings, listedNfts, listedCollections]
  );

  /* Transaction */

  const [isTransferring, setIsTransferring] = React.useState(false);
  const [openTransferBatch, setOpenTransferBatch] = React.useState(false);
  const [openListSale, setOpenListSale] = React.useState(false);
  const [openListAuction, setOpenListAuction] = React.useState(false);
  const [openListBatch, setOpenListBatch] = React.useState<boolean>(false);
  const [isListing, setIsListing] = React.useState(false);

  const [activeTab, setActiveTab] = React.useState(0);

  const [nft, setNft] = React.useState<any>(null);
  // useEffect(() => {
  //   if ((selected.length = 0)) return;
  //   const nft: Token = nfts[selected];
  //   //const royalties = decodeRoyalties(nft.metadata.royalties);
  //   setNft({
  //     ...nft,
  //     //royalties,
  //   });
  // }, [nfts, selected]);

  const handleListAuction = async (price: string, currency: string) => {};

  const handleListBatch = async (
    price: string,
    currency: string,
    token: TokenType,
    setProgress: any
  ) => {
    if (!activeAccount || !selected.length) return;
    try {
      console.log({ price, currency, token });

      setIsListing(true);
      const { algodClient, indexerClient } = getAlgorandClients();
      const selectedNfts = selected.map((i) => nfts[i]);

      const priceBn = new BigNumber(price).multipliedBy(
        new BigNumber(10).pow(token.decimals)
      );
      const priceBi = BigInt(priceBn.toFixed(0));

      const paymentTokenId =
        token.contractId === 0 ? Number(token.tokenId) : token.contractId;

      const buildN: any[][] = [];

      // for each collection of nfts ensure

      // use loop but have index

      const paymentToken =
        token.contractId === TOKEN_WVOI
          ? {
              ...token,
              symbol: "VOI", // symbol override
            }
          : token;

      const nautilusVoiStaking = 421076;

      console.log({ selectedNfts });

      for (let i = 0; i < selectedNfts.length; i++) {
        const nft = selectedNfts[i];
        const metadata = JSON.parse(nft.metadata);
        const royalties = decodeRoyalties(metadata.royalties);
        console.log({ nft, metadata, royalties });
        const whichMP206 = CTCINFO_MP206;
        // [nautilusVoiStaking].includes(nft.contractId)
        //   ? CTCINFO_MP206_2
        //   : CTCINFO_MP206;
        const customR = await mp.list(
          activeAccount.address,
          nft,
          priceBi.toString(),
          paymentToken,
          {
            algodClient,
            indexerClient,
            paymentTokenId,
            wrappedNetworkTokenId: TOKEN_WVOI,
            extraTxns: [],
            enforceRoyalties: true,
            mpContractId: whichMP206,
            listingBoxPaymentOverride: ListingBoxCost + i,
            skipEnsure: true,
          }
        );
        console.log({ customR });
        buildN.push([customR.objs]);
      }

      console.log({ buildN });

      let progress = 0;

      // split buildN into groups
      const chunkSize = 3;
      for (let i = 0; i < buildN.length; i += chunkSize) {
        const extraTxns = buildN.slice(i, i + chunkSize).flat();
        console.log({ extraTxns });

        const ci = new CONTRACT(
          CTCINFO_MP206,
          algodClient,
          indexerClient,
          abi.custom,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          }
        );
        ci.setEnableGroupResourceSharing(true);
        ci.setExtraTxns(extraTxns.flat());
        const customR = await ci.custom();
        if (!customR.success) throw new Error(customR.error);
        const stxns = await signTransactions(
          customR.txns.map(
            (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
          )
        );
        await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();
        setProgress(++progress);
      }
      toast.success("Listed successfully!");
    } catch (e: any) {
      console.log(e);
      toast.error(e.message);
    } finally {
      setIsListing(false);
    }
  };

  const handleListSale = async (
    price: string,
    currency: string,
    token: TokenType
  ) => {
    if (!activeAccount || !nft) return;
    try {
      setIsListing(true);
      const { algodClient, indexerClient } = getAlgorandClients();
      // nft

      const priceBn = new BigNumber(price).multipliedBy(
        new BigNumber(10).pow(token.decimals)
      );
      const priceBi = BigInt(priceBn.toFixed(0));

      const paymentTokenId =
        token.contractId === 0 ? Number(token.tokenId) : token.contractId;

      const buildN: any[][] = [];

      for (const skipEnsure of [false, true]) {
        const customR = await mp.list(
          activeAccount.address,
          {
            ...nft,
            tokenId: Number(nft.tokenId),
            contractId: Number(nft.contractId),
          },
          priceBi.toString(),
          currency,
          {
            algodClient,
            indexerClient,
            paymentTokenId,
            wrappedNetworkTokenId: TOKEN_WVOI,
            extraTxns: [],
            enforceRoyalties: true,
            mpContractId: CTCINFO_MP206,
            listingBoxPaymentOverride: ListingBoxCost,
            listingsToDelete: nft.listing ? [nft.listing] : [],
            skipEnsure,
          }
        );
        if (customR.success) {
          buildN.push(customR.objs);
          break;
        }
      }

      if (!buildN.length) throw new Error("no transactions to simulate");

      const ci = new CONTRACT(
        CTCINFO_MP206,
        algodClient,
        indexerClient,
        abi.custom,
        {
          addr: activeAccount.address,
          sk: new Uint8Array(0),
        }
      );

      ci.setEnableGroupResourceSharing(true);
      ci.setExtraTxns(buildN.flat());
      const customR = await ci.custom();

      if (!customR.success) {
        throw new Error("failed in simulate");
      }

      await signTransactions(
        customR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );
      //.then(sendTransactions);

      // ---------------------------------------
      // QUEST HERE
      // list nft for sale
      // ---------------------------------------
      // do {
      //   const address = activeAccount.address;
      //   const actions: string[] = [
      //     QUEST_ACTION.SALE_LIST_ONCE,
      //     QUEST_ACTION.TIMED_SALE_LIST_1MINUTE,
      //     QUEST_ACTION.TIMED_SALE_LIST_15MINUTES,
      //     QUEST_ACTION.TIMED_SALE_LIST_1HOUR,
      //   ];
      //   const {
      //     data: { results },
      //   } = await getActions(address);
      //   for (const action of actions) {
      //     const address = activeAccount.address;
      //     const key = `${action}:${address}`;
      //     const completedAction = results.find((el: any) => el.key === key);
      //     if (!completedAction) {
      //       await submitAction(action, address, {
      //         contractId: nft.contractId,
      //         tokenId: nft.tokenId,
      //       });
      //     }
      //     // TODO notify quest completion here
      //   }
      // } while (0);
      // ---------------------------------------

      toast.success("Listing successful"); // show success message

      // ------------------------------------------
    } catch (e: any) {
      toast.error(e.message); // show error message
    } finally {
      setIsListing(false); // reset loading state
      setOpenListSale(false); // close modal
      setSelected([]); // reset selected
    }
  };

  const handleDeleteListing = async (listingId: number) => {
    try {
      const ci = new CONTRACT(
        CTCINFO_MP206,
        algodClient,
        indexerClient,
        {
          name: "",
          desc: "",
          methods: [
            {
              name: "a_sale_deleteListing",
              args: [
                {
                  type: "uint256",
                  name: "listingId",
                },
              ],
              returns: {
                type: "void",
              },
            },
          ],
          events: [],
        },
        {
          addr: activeAccount?.address || "",
          sk: new Uint8Array(0),
        }
      );
      ci.setFee(3000);
      const a_sale_deleteListingR = await ci.a_sale_deleteListing(listingId);
      if (!a_sale_deleteListingR.success) {
        throw new Error("a_sale_deleteListing failed in simulate");
      }
      const txns = a_sale_deleteListingR.txns;
      const stxns = await signTransactions(
        txns.map((txn: string) => new Uint8Array(Buffer.from(txn, "base64")))
      );
      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();
      toast.success("Unlist successful!");
    } catch (e: any) {
      console.log(e);
      toast.error(e.message);
    } finally {
      setSelected2([]);
    }
  };

  // handleTransfer
  // uses nfts, selected
  const handleTransfer = async (addr: string, amount: string) => {
    if (!selected.length) return;
    try {
      const amountN = Number(amount);
      // TODO validate address
      if (!addr) {
        throw new Error("Address is required");
      }
      if (isNaN(amountN)) {
        throw new Error("Invalid amount");
      }
      if (!activeAccount) {
        throw new Error("No active account");
      }
      setIsTransferring(true);
      const nft: any = nfts[selected[0]];

      const currency = smartTokens.find(
        (el: TokenType) => `${el?.contractId}` === `${nft?.listing?.currency}`
      );
      const currencyDecimals =
        currency?.decimals === 0 ? 0 : currency?.decimals || 6;
      const currencySymbol =
        currency?.tokenId === "0" ? "VOI" : currency?.symbol || "VOI";
      const price = formatter.format(
        new BigNumber(nft?.listing?.price)
          .dividedBy(new BigNumber(10).pow(currencyDecimals))
          .toNumber()
      );

      const { contractId, tokenId } = nft;
      const spec = {
        name: "",
        desc: "",
        methods: [
          {
            name: "custom",
            args: [],
            returns: {
              type: "void",
            },
          },
          {
            name: "a_sale_deleteListing",
            args: [
              {
                type: "uint256",
                name: "listingId",
              },
            ],
            returns: {
              type: "void",
            },
          },
        ],
        events: [],
      };
      // const arc72_ownerOfR = await ci.arc72_ownerOf(tokenId);
      // if (!arc72_ownerOfR.success) {
      //   throw new Error("arc72_ownerOf failed in simulate");
      // }
      // const arc72_ownerOf = arc72_ownerOfR.returnValue;
      //if (arc72_ownerOf !== activeAccount?.address) {
      //  throw new Error("arc72_ownerOf not connected");
      //}
      const selectedNfts = nfts.filter((el, i) => selected.includes(i));

      // split selectedNfts into chunks

      // Split array into chunks
      const chunkArray = (array: any[], chunkSize: number) => {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
          chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
      };

      const chunks = chunkArray(selectedNfts, 1);

      for await (const chunk of chunks) {
        const buildN = [];
        const uniqueContractIds = Array.from(
          new Set(chunk.map((nft: any) => nft.contractId))
        );
        // Provide network tokens for new accounts
        // do {
        // } while(0)
        // Ensure min balance for each contract
        for (let i = 0; i < uniqueContractIds.length; i++) {
          const builder: any = {
            arc72: new CONTRACT(
              nft.contractId,
              algodClient,
              indexerClient,
              abi.arc72,
              { addr: activeAccount?.address || "", sk: new Uint8Array(0) },
              undefined,
              undefined,
              true
            ),
          };
          const accInfo = await algodClient
            .accountInformation(algosdk.getApplicationAddress(contractId))
            .do();
          const availableBalance = accInfo.amount - accInfo["min-balance"];
          if (availableBalance < 28500) {
            do {
              const txnO = await builder.arc72.arc72_setApprovalForAll(
                activeAccount?.address || "",
                true
              );
              buildN.push({
                ...txnO.obj,
                payment: 28501 + i,
                paymentNote: new TextEncoder().encode(`
                payment to application to satisfy min balance for creating future boxes
                `),
                ignore: true,
              });
            } while (0);
          }
        }
        for await (const nft of chunk) {
          const ci = new arc72(nft.contractId, algodClient, indexerClient, {
            acc: { addr: activeAccount?.address || "", sk: new Uint8Array(0) },
          });
          const builder: any = {
            arc72: new CONTRACT(
              nft.contractId,
              algodClient,
              indexerClient,
              abi.arc72,
              { addr: activeAccount?.address || "", sk: new Uint8Array(0) },
              undefined,
              undefined,
              true
            ),
            mp: new CONTRACT(
              CTCINFO_MP206,
              algodClient,
              indexerClient,
              spec,
              {
                addr: activeAccount?.address || "",
                sk: new Uint8Array(0),
              },
              true,
              false,
              true
            ),
          };
          const metadata = JSON.parse(nft.metadata || "{}");
          do {
            const txnO = await builder.arc72.arc72_transferFrom(
              activeAccount?.address || "",
              addr,
              BigInt(nft.tokenId)
            );
            buildN.push({
              ...txnO.obj,
              payment: 28500,
              note: new TextEncoder().encode(`
          arc72_transferFrom ${metadata.name} from ${activeAccount?.address} to ${addr}
          `),
            });
          } while (0);
          const doDeleteListing =
            nft.listing && nft.listing.seller === activeAccount?.address;
          if (nft?.listing && doDeleteListing) {
            const txnO = await builder.mp.a_sale_deleteListing(
              nft.listing.mpListingId
            );
            buildN.push({
              ...txnO.obj,
              note: new TextEncoder().encode(`
          a_sale_deleteListing listId: ${nft.listing.mpListingId} listPrice: ${price} ${currencySymbol}
          `),
            });
          }
        }
        const ciCustom = new CONTRACT(
          contractId,
          algodClient,
          indexerClient,
          abi.custom,
          { addr: activeAccount?.address || "", sk: new Uint8Array(0) }
        );
        ciCustom.setExtraTxns(buildN);
        // ------------------------------------------
        // Add payment if necessary
        //   Aust arc72 pays for the box cost if the ctcAddr balance - minBalance < box cost
        // const BalanceBoxCost = 28501;
        // const accInfo = await algodClient
        //   .accountInformation(algosdk.getApplicationAddress(contractId))
        //   .do();
        // const availableBalance = accInfo.amount - accInfo["min-balance"];
        // const extraPaymentAmount =
        //   availableBalance < BalanceBoxCost
        //     ? BalanceBoxCost // Pay whole box cost instead of partial cost, BalanceBoxCost - availableBalance
        //     : 0;
        // ciCustom.setPaymentAmount(extraPaymentAmount);
        // const transfers = [];
        // if (amountN > 0) {
        //   transfers.push([Math.floor(amountN * 1e6), addr]);
        // }
        // ciCustom.setTransfers(transfers);
        // ------------------------------------------
        ciCustom.setFee(2000);
        ciCustom.setEnableGroupResourceSharing(true);
        const customR = await ciCustom.custom();
        console.log({ customR });
        if (!customR.success) {
          throw new Error("custom failed in simulate");
        }
        const txns = customR.txns;
        const res = await signTransactions(
          txns.map((txn: string) => new Uint8Array(Buffer.from(txn, "base64")))
        );
        //.then(sendTransactions);

        await algodClient.sendRawTransaction(res as Uint8Array[]).do();

        // ---------------------------------------
        // QUEST HERE
        // list nft for sale
        // ---------------------------------------
        // do {
        //   const address = activeAccount.address;
        //   const actions: string[] = [QUEST_ACTION.NFT_TRANSFER];
        //   const {
        //     data: { results },
        //   } = await getActions(address);
        //   for (const action of actions) {
        //     const address = activeAccount.address;
        //     const key = `${action}:${address}`;
        //     const completedAction = results.find((el: any) => el.key === key);
        //     if (!completedAction) {
        //       await submitAction(action, address, {
        //         contractId,
        //       });
        //     }
        //     // TODO notify quest completion here
        //   }
        // } while (0);
        // ---------------------------------------
      }
      toast.success(`NFT Transfer successful!`);
      // if (connectedAccounts.map((a) => a.address).includes(addr)) {
      //   setNfts([
      //     ...nfts.slice(0, selected),
      //     { ...nft, owner: addr },
      //     ...nfts.slice(selected + 1),
      //   ]);
      // } else {
      //   setNfts([...nfts.slice(0, selected), ...nfts.slice(selected + 1)]);
      // }
      // setTimeout(() => {
      //   window.location.reload();
      // }, 4000);
    } catch (e: any) {
      console.log(e);
      toast.error(e.message);
    } finally {
      setIsTransferring(false);
      setOpenTransferBatch(false);
      setSelected([]);
    }
  };

  const handleBurnStaking = async () => {
    if (!activeAccount) return;
    const ci = new CONTRACT(
      Number(nfts[selected[0]].contractId),
      algodClient,
      indexerClient,
      {
        name: "OSARC72Token",
        methods: [
          {
            name: "burn",
            args: [
              {
                type: "uint64",
                name: "tokenId",
              },
            ],
            readonly: false,
            returns: {
              type: "void",
            },
            desc: "Burn an NFT",
          },
        ],
        events: [],
      },
      {
        addr: activeAccount.address,
        sk: new Uint8Array(0),
      }
    );
    ci.setFee(3000);
    const burnR = await ci.burn(BigInt(nfts[selected[0]].tokenId));
    if (burnR.success) {
      signTransactions(
        burnR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      ).then((txns) => {
        algodClient.sendRawTransaction(txns as Uint8Array[]).do();
      });
    }
  };

  const handleBurn = async () => {
    if (!selected.length) return;
    try {
      if (!activeAccount) {
        throw new Error("No active account");
      }
      setIsTransferring(true);
      const nft: any = nfts[selected[0]];
      const { contractId, tokenId } = nft;
      const spec = {
        name: "",
        desc: "",
        methods: [
          {
            name: "custom",
            args: [],
            returns: {
              type: "void",
            },
          },
          {
            name: "a_sale_deleteListing",
            args: [
              {
                type: "uint256",
                name: "listingId",
              },
            ],
            returns: {
              type: "void",
            },
          },
        ],
        events: [],
      };
      const ci = new arc72(contractId, algodClient, indexerClient, {
        acc: { addr: activeAccount?.address || "", sk: new Uint8Array(0) },
      });
      const builder: any = {
        arc72: new CONTRACT(
          contractId,
          algodClient,
          indexerClient,
          {
            name: "arc72",
            desc: "arc72",
            methods: [
              {
                name: "burn",
                desc: "Burns the specified NFT",
                args: [
                  {
                    type: "uint256",
                    name: "tokenId",
                    desc: "The ID of the NFT",
                  },
                ],
                returns: { type: "void" },
              },
            ],
            events: [],
          },
          { addr: activeAccount?.address || "", sk: new Uint8Array(0) },
          undefined,
          undefined,
          true
        ),
        mp: new CONTRACT(
          CTCINFO_MP206,
          algodClient,
          indexerClient,
          spec,
          {
            addr: activeAccount?.address || "",
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
      };
      const arc72_ownerOfR = await ci.arc72_ownerOf(tokenId);
      if (!arc72_ownerOfR.success) {
        throw new Error("arc72_ownerOf failed in simulate");
      }
      const arc72_ownerOf = arc72_ownerOfR.returnValue;
      //if (arc72_ownerOf !== activeAccount?.address) {
      //  throw new Error("arc72_ownerOf not connected");
      //}
      const buildN = [];
      buildN.push(builder.arc72.burn(tokenId));
      const doDeleteListing =
        nft.listing && nft.listing.seller === activeAccount?.address;
      if (doDeleteListing) {
        buildN.push(builder.mp.a_sale_deleteListing(nft.listing.mpListingId));
      }
      const buildP = (await Promise.all(buildN)).map(({ obj }) => obj);
      const ciCustom = new CONTRACT(
        contractId,
        algodClient,
        indexerClient,
        {
          name: "",
          desc: "",
          methods: [
            {
              name: "custom",
              args: [],
              returns: {
                type: "void",
              },
            },
          ],
          events: [],
        },
        { addr: activeAccount?.address || "", sk: new Uint8Array(0) }
      );
      ciCustom.setExtraTxns(buildP);
      // ------------------------------------------
      // Add payment if necessary
      //   Aust arc72 pays for the box cost if the ctcAddr balance - minBalance < box cost
      const BalanceBoxCost = 28500;
      const accInfo = await algodClient
        .accountInformation(algosdk.getApplicationAddress(contractId))
        .do();
      const availableBalance = accInfo.amount - accInfo["min-balance"];
      const extraPaymentAmount =
        availableBalance < BalanceBoxCost
          ? BalanceBoxCost // Pay whole box cost instead of partial cost, BalanceBoxCost - availableBalance
          : 0;
      ciCustom.setPaymentAmount(extraPaymentAmount);
      // ------------------------------------------
      if (doDeleteListing) {
        ciCustom.setFee(2000);
      } else {
        ciCustom.setFee(2000);
      }
      const customR = await ciCustom.custom();

      console.log({ customR });

      if (!customR.success) {
        throw new Error("custom failed in simulate");
      }
      const txns = customR.txns;
      const res = await signTransactions(
        txns.map((txn: string) => new Uint8Array(Buffer.from(txn, "base64")))
      );
      //.then(sendTransactions);
      toast.success(`NFT Transfer successful! Page will reload momentarily.`);
      setNfts([...nfts.slice(0, selected[0]), ...nfts.slice(selected[0] + 1)]);
      setTimeout(() => {
        window.location.reload();
      }, 4000);
    } catch (e: any) {
      console.log(e);
      toast.error(e.message);
    } finally {
      setIsTransferring(false);
      setOpenTransferBatch(false);
      setSelected([]);
    }
  };

  const handleUnlistAll = async () => {
    if (!activeAccount) return;
    try {
      const spec = {
        name: "",
        desc: "",
        methods: [
          {
            name: "custom",
            args: [],
            returns: {
              type: "void",
            },
          },
          {
            name: "a_sale_deleteListing",
            args: [
              {
                type: "uint256",
                name: "listingId",
              },
            ],
            returns: {
              type: "void",
            },
          },
        ],
        events: [],
      };
      const ci = new CONTRACT(CTCINFO_MP206, algodClient, indexerClient, spec, {
        addr: activeAccount?.address || "",
        sk: new Uint8Array(0),
      });
      const builder = {
        mp: new CONTRACT(
          CTCINFO_MP206,
          algodClient,
          indexerClient,
          spec,
          {
            addr: activeAccount?.address || "",
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
      };
      const nftsToUnlist = selected2.map((i) => listedNfts[i]);
      const buildN = [];
      for (const nft of nftsToUnlist) {
        buildN.push({
          ...(await builder.mp.a_sale_deleteListing(nft.listing.mpListingId))
            .obj,
          note: new TextEncoder().encode(
            `a_sale_deleteListing listId: ${nft.listing.mpListingId}`
          ),
        });
      }
      // split into chunks of 12
      const chunkSize = 12;
      const chunks = [];
      for (let i = 0; i < buildN.length; i += chunkSize) {
        chunks.push(buildN.slice(i, i + chunkSize));
      }

      for (const [index, chunk] of Object.entries(chunks)) {
        ci.setFee(2000);
        ci.setEnableGroupResourceSharing(true);
        ci.setExtraTxns(chunk);
        const customR = await ci.custom();

        console.log({ customR });

        const res = await toast.promise(
          signTransactions(
            customR.txns.map(
              (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
            )
          ).then((stxn) =>
            algodClient.sendRawTransaction(stxn as Uint8Array[]).do()
          ),
          {
            pending: `Txn pending to delist nfts (${(
              (Number(index) / chunks.length) *
              100
            ).toFixed(2)}%)...`,
            success: "Unlist successful!",
            error: "Unlist failed",
          }
        );
      }
    } catch (e: any) {
      console.log(e);
      toast.error(e.message);
    } finally {
      setSelected2([]);
    }
  };

  return (
    <Layout>
      <div>
        <Stack spacing={2} direction="row">
          <Avatar
            sx={{
              background: `linear-gradient(45deg, ${stringToColorCode(
                String(id)
              )}, ${isDarkTheme ? "#000" : "#fff"})`,
              width: "145px",
              height: "145px",
            }}
          >
            {String(id).slice(0, 1)}
          </Avatar>
          <Grid container spacing={2}>
            {id?.split(",")?.map((id) => (
              <Grid xs={12} key={id}>
                <Stack
                  gap={0.1}
                  sx={{
                    p: 1,
                  }}
                >
                  <AccountLabel>Account</AccountLabel>
                  <Stack direction="row" gap={1}>
                    <AccountValue>
                      {String(id).slice(0, 4)}...{String(id).slice(-4)}
                    </AccountValue>
                    <ContentCopyIcon
                      onClick={() => {
                        handleCopy(String(id))();
                      }}
                    />
                  </Stack>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Stack>
        <Stack spacing={2} direction="row" sx={{ mt: 3 }}>
          <ButtonGroup>
            {["Collected", "Listed"].map((el: string, i: number) => (
              <Button
                variant={i === activeTab ? "contained" : "outlined"}
                onClick={() => {
                  setActiveTab(i);
                }}
              >
                {el}
              </Button>
            ))}
          </ButtonGroup>
          {activeTab === 1 ? (
            <>
              {selected2.length ? (
                <Button onClick={() => {}} color="warning" variant="text">
                  {selected2.length} Selected
                </Button>
              ) : null}
              {filteredListings?.length > 0 && selected2.length === 0 ? (
                <Button
                  onClick={() => {
                    setSelected2(
                      filteredListings.map((_: any, i: number) => i)
                    );
                  }}
                >
                  Select All
                </Button>
              ) : null}
              <ButtonGroup color="warning">
                {selected2.length === 1 ? (
                  <Button
                    onClick={() => {
                      const selected = filteredListings[selected2[0]].token;
                      navigate(
                        `/collection/${selected.contractId}/token/${selected.tokenId}`
                      );
                    }}
                  >
                    View
                  </Button>
                ) : null}
                {/*selected2.length === 1 ? (
                  <Button
                    onClick={() => {
                      const selected = filteredListings[selected2[0]].token;
                      setNft({
                        ...selected,
                        listing: filteredListings[selected2[0]],
                      });
                      setOpenListSale(true);
                    }}
                  >
                    Update
                  </Button>
                ) : null*/}
                {selected2.length ? (
                  <Button onClick={handleUnlistAll}>Unlist</Button>
                ) : null}
                {selected2.length ? (
                  <Button
                    onClick={() => {
                      setSelected2([]);
                    }}
                  >
                    Clear
                  </Button>
                ) : null}
              </ButtonGroup>
            </>
          ) : null}
          {/*activeTab === 1 && idArr.includes(activeAccount?.address || "") ? (
            <Button onClick={handleUnlistAll} color="warning">
              Unlist All
            </Button>
          ) : null*/}
          {activeTab === 0 &&
          selected.length === 0 &&
          nfts.filter((t: MListedNFTTokenI) => !t.listing).length > 0 ? (
            <>
              <Button
                onClick={() => {
                  setSelected(
                    nfts
                      .filter((t: MListedNFTTokenI) => !t.listing)
                      .map((_, i) => i)
                  );
                }}
              >
                Select All
              </Button>
            </>
          ) : null}

          {activeTab === 0 && selected.length ? (
            <>
              <Button onClick={() => {}} color="warning" variant="text">
                {selected.length} Selected
              </Button>
              <ButtonGroup color="warning" variant="outlined">
                {selected.length === 1 ? (
                  <Button
                    onClick={() => {
                      navigate(
                        `/collection/${nfts[selected[0]].contractId}/token/${
                          nfts[selected[0]].tokenId
                        }`
                      );
                    }}
                  >
                    View
                  </Button>
                ) : null}
                {idArr.includes(activeAccount?.address || "") ? (
                  <>
                    <Button
                      onClick={() => {
                        setOpenListBatch(true);
                      }}
                    >
                      List
                    </Button>
                    {selected.length === 1 ? (
                      <Button
                        onClick={() => {
                          setOpenTransferBatch(true);
                        }}
                      >
                        Transfer
                      </Button>
                    ) : null}
                    {selected.length === 1 &&
                    nfts[selected[0]].contractId === 421076 ? (
                      <Button onClick={handleBurnStaking}>
                        Burn Staking NFT{` `}
                        <Tooltip
                          title={
                            <div>
                              Burn staking NFT to regain ownership of the
                              staking contract.
                            </div>
                          }
                        >
                          <InfoIcon />
                        </Tooltip>
                      </Button>
                    ) : null}
                  </>
                ) : null}

                <Button
                  onClick={() => {
                    setSelected([]);
                  }}
                >
                  Clear
                </Button>
              </ButtonGroup>
            </>
          ) : null}
        </Stack>

        {activeTab === 0 && nfts ? (
          <>
            <Typography variant="h4" sx={{ mt: 3 }}>
              Collected <small>{nfts?.length}</small>
            </Typography>

            <ListingGrid>
              <Grid2 container spacing={2} sx={{ mt: 1 }}>
                {nfts?.map((nft: any, index: number) => (
                  <Grid2 key={`${nft.contractId}-${nft.tokenId}`}>
                    <CartNftCard
                      selected={selected.includes(index)}
                      token={nft}
                      listing={nft.listing}
                      onClick={() => {
                        if (selected.includes(index)) {
                          setSelected(selected.filter((x) => x !== index));
                        } else {
                          setSelected(
                            Array.from(new Set([...selected, index]))
                          );
                        }
                      }}
                    />
                  </Grid2>
                ))}
              </Grid2>
            </ListingGrid>

            {/*nfts ? (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {nfts?.map((nft: any, index: number) => {
                  const pk = `${nft.contractId}-${nft.tokenId}`;

                  console.log({ nft });

                  const currency = smartTokens?.find(
                    (el: TokenType) =>
                      `${el.contractId}` === `${nft?.listing?.currency}`
                  );
                  const currencyDecimals =
                    currency?.decimals === 0 ? 0 : currency?.decimals || 6;
                  const currencySymbol =
                    currency?.tokenId === "0"
                      ? "VOI"
                      : currency?.symbol || "VOI";
                  const price = nft?.listing?.price
                    ? formatter.format(
                        new BigNumber(nft?.listing?.price)
                          .dividedBy(new BigNumber(10).pow(currencyDecimals))
                          .toNumber()
                      )
                    : "";

                  return (
                    <Grid xs={6} sm={4} md={3} lg={2} key={pk}>
                      {selected >= 0 && selected === index ? (
                        <div
                          style={{
                            position: "relative",
                            zIndex: 2,
                          }}
                        >
                          <ButtonGroup
                            sx={{
                              position: "absolute",
                              top: "-50px",
                              right: "-10px",
                              background: isDarkTheme
                                ? "#000000e0"
                                : "#ffffffe0",
                              backdropFilter: "blur(200px) brightness(100%)",
                            }}
                          >
                            <Button
                              onClick={() => {
                                navigate(
                                  `/collection/${nfts[selected].contractId}/token/${nfts[selected].tokenId}`
                                );
                                window.scrollTo({
                                  top: 0,
                                  behavior: "smooth",
                                });
                              }}
                            >
                              <VisibilityIcon />
                            </Button>
                            <Button
                              size="large"
                              variant="outlined"
                              onClick={async () => {
                                try {
                                  // get account available balance
                                  const accInfo = await algodClient
                                    .accountInformation(
                                      activeAccount?.address || ""
                                    )
                                    .do();
                                  const availableBalance =
                                    accInfo.amount - accInfo["min-balance"];
                                  // check that available balance is greater than or equal to 0.1235
                                  if (availableBalance < 123500) {
                                    throw new Error(
                                      `Insufficient balance (${
                                        (availableBalance - 123500) / 1e6
                                      } VOI). Please fund your account.`
                                    );
                                  }

                                  setOpenListSale(true);
                                } catch (e: any) {
                                  console.log(e);
                                  toast.error(e.message);
                                }
                              }}
                            >
                              <StorefrontIcon />
                            </Button>
                            <Button
                              size="large"
                              variant="outlined"
                              onClick={() => {
                                setOpen(true);
                              }}
                            >
                              <SendIcon />
                            </Button>
                            <Tooltip title="Burn">
                              <Button onClick={() => handleBurn()}>
                                <FireplaceIcon />
                              </Button>
                            </Tooltip>
                          </ButtonGroup>
                        </div>
                      ) : null}
                      <NFTCard
                        nftName={nft.metadata.name}
                        owner=""
                        image={nft.metadata.image}
                        price={price}
                        currency={currencySymbol}
                        onClick={() => {
                          if (idArr.includes(activeAccount?.address || "")) {
                            if (selected === index) {
                              setSelected(-1);
                            } else {
                              setSelected(index);
                            }
                          } else {
                            navigate(
                              `/collection/${nft.contractId}/token/${nft.tokenId}`
                            );
                          }
                        }}
                      />
                    </Grid>
                  );
                })}
              </Grid>
              ) : null*/}
          </>
        ) : null}
        {activeTab === 1 ? (
          <>
            <Stack
              spacing={2}
              direction="row"
              sx={{ mt: 4, justifyContent: "space-between" }}
            >
              <Typography variant="h4" sx={{ mt: 3 }}>
                Listed <small>{listedNfts.length}</small>
              </Typography>
              <ToggleButtonGroup
                sx={{ display: { xs: "none", sm: "flex" } }}
                color="primary"
                value={viewMode}
                exclusive
                onChange={() => {
                  setViewMode(viewMode === "list" ? "grid" : "list");
                }}
                aria-label="Platform"
              >
                {/*<ToggleButton value="list">
                  <ViewListIcon />
              </ToggleButton>*/}

                <ToggleButton value="grid">
                  <GridViewIcon />
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            {/*viewMode === "list" && nfts && listings && collections ? (
              <Box sx={{ mt: 4 }}>
                <NFTListingTable
                  enableSelect={idArr.includes(activeAccount?.address || "")}
                  onSelect={(x: string) => {
                    if (x === selected2) {
                      setSelected2("");
                    } else {
                      setSelected2(x);
                    }
                  }}
                  selected={selected2}
                  tokens={nfts}
                  listings={normalListings}
                  collections={collections}
                  columns={["image", "token", "price"]}
                />
              </Box>
                ) : null*/}
            {viewMode == "grid" ? (
              <>
                {/*<Grid container spacing={2} sx={{ mt: 1 }}>
                  {listedNfts?.map((nft: any, index: number) => {
                    const pk = `${nft.listing.mpContractId}-${nft.listing.mpListingId}`;

                    const currency = smartTokens.find(
                      (el: TokenType) =>
                        `${el.contractId}` === `${nft.listing.currency}`
                    );
                    const currencyDecimals =
                      currency?.decimals === 0 ? 0 : currency?.decimals || 6;
                    const currencySymbol =
                      currency?.tokenId === "0"
                        ? "VOI"
                        : currency?.symbol || "VOI";
                    const price = formatter.format(
                      new BigNumber(nft.listing.price)
                        .dividedBy(new BigNumber(10).pow(currencyDecimals))
                        .toNumber()
                    );
                    return nft ? (
                      <Grid xs={6} md={4} lg={3} xl={2} key={nft.id}>
                        {selected2 !== "" && selected2 === pk ? (
                          <div
                            style={{
                              position: "relative",
                              zIndex: 2,
                            }}
                          >
                            <ButtonGroup
                              sx={{
                                position: "absolute",
                                top: "10px",
                                right: "10px",
                                background: isDarkTheme
                                  ? "#000000e0"
                                  : "#ffffffe0",
                                backdropFilter: "blur(200px) brightness(100%)",
                              }}
                            >
                              {viewMode === "grid" ? (
                                <Button
                                  onClick={() => {
                                    const nft = listedNfts.find(
                                      (el: any) =>
                                        `${el.listing.mpContractId}-${el.listing.mpListingId}` ===
                                        selected2
                                    );
                                    navigate(
                                      `/collection/${nft.contractId}/token/${nft.tokenId}`
                                    );
                                    window.scrollTo({
                                      top: 0,
                                      behavior: "smooth",
                                    });
                                  }}
                                >
                                  <VisibilityIcon />
                                </Button>
                              ) : null}
                              <Button
                                onClick={async () => {
                                  try {
                                    // get account available balance
                                    const accInfo = await algodClient
                                      .accountInformation(
                                        activeAccount?.address || ""
                                      )
                                      .do();
                                    const availableBalance =
                                      accInfo.amount - accInfo["min-balance"];
                                    // check that available balance is greater than or equal to 0.1235
                                    if (availableBalance < 123500) {
                                      throw new Error(
                                        `Insufficient balance (${
                                          (availableBalance - 123500) / 1e6
                                        } VOI). Please fund your account.`
                                      );
                                    }
                                    const nft = listedNfts.find(
                                      (el: any) =>
                                        `${el.listing.mpContractId}-${el.listing.mpListingId}` ===
                                        selected2
                                    );
                                    const royalties = decodeRoyalties(
                                      nft.metadata.royalties
                                    );
                                    console.log({ ...nft, royalties });
                                    setNft({
                                      ...nft,
                                      royalties,
                                    });
                                    setOpenListSale(true);
                                  } catch (e: any) {
                                    console.log(e);
                                    toast.error(e.message);
                                  }
                                }}
                              >
                                <EditIcon />
                              </Button>
                              <Button
                                onClick={() => {
                                  const nft = listedNfts.find(
                                    (el: any) =>
                                      `${el.listing.mpContractId}-${el.listing.mpListingId}` ===
                                      selected2
                                  );
                                  handleDeleteListing(nft.listing.mpListingId);
                                }}
                              >
                                <DeleteIcon />
                              </Button>
                            </ButtonGroup>
                          </div>
                        ) : null}
                        <Box
                          style={{
                            width: "100%",
                            cursor: "pointer",
                            borderRadius: "20px",
                          }}
                        >
                          <NFTCard
                            nftName={nft.metadata.name}
                            image={nft.metadata.image}
                            owner={nft.owner}
                            price={price}
                            currency={currencySymbol}
                            onClick={() => {
                              if (
                                idArr.includes(activeAccount?.address || "")
                              ) {
                                if (selected2 === pk) {
                                  setSelected2("");
                                } else {
                                  setSelected2(pk);
                                }
                              } else {
                                navigate(
                                  `/collection/${nft.contractId}/token/${nft.tokenId}`
                                );
                              }
                            }}
                          />
                        </Box>
                      </Grid>
                    ) : null;
                  })}
                </Grid>*/}
                <ListingGrid>
                  <Grid2 container spacing={2} sx={{ mt: 1 }}>
                    {filteredListings?.map((listing: any, index: number) => (
                      <Grid2 key={listing.transactionId}>
                        <CartNftCard
                          selected={selected2.includes(index)}
                          onClick={() => {
                            if (selected2.includes(index)) {
                              setSelected2(
                                selected2.filter((x) => x !== index)
                              );
                            } else {
                              setSelected2(
                                Array.from(new Set([...selected2, index]))
                              );
                            }
                          }}
                          token={listing.token}
                          listing={listing}
                        />
                      </Grid2>
                    ))}
                  </Grid2>
                </ListingGrid>
              </>
            ) : null}
          </>
        ) : null}
      </div>

      {!isLoading ? (
        <>
          {openTransferBatch ? (
            <TransferModal
              nfts={nfts.filter((_, i) => selected.includes(i))}
              title="Transfer NFT"
              loading={isTransferring}
              open={openTransferBatch}
              handleClose={() => setOpenTransferBatch(false)}
              onSave={handleTransfer}
            />
          ) : null}
          {nft ? (
            <ListSaleModal
              title="List NFT for Sale"
              loading={isListing}
              open={openListSale}
              handleClose={() => setOpenListSale(false)}
              onSave={handleListSale}
              nft={nft}
            />
          ) : null}
          {selected?.length && openListBatch ? (
            <ListBatchModal
              action="list-sale"
              title="List NFT for Sale"
              loading={isListing}
              open={openListBatch}
              handleClose={() => setOpenListBatch(false)}
              onSave={handleListBatch}
              nfts={nfts.filter((_, i) => selected.includes(i))}
            />
          ) : null}
          {nft ? (
            <ListAuctionModal
              title="List NFT for Auction"
              loading={isListing}
              open={openListAuction}
              handleClose={() => setOpenListAuction(false)}
              onSave={handleListAuction}
              nft={nft}
            />
          ) : null}
        </>
      ) : (
        <>
          <div className="w-full h-[max(70vh,20rem)]  flex items-center justify-center">
            <GridLoader
              size={30}
              color={isDarkTheme ? "#fff" : "#000"}
              className="sm:!hidden !text-primary "
            />
            <GridLoader
              size={50}
              color={isDarkTheme ? "#fff" : "#000"}
              className="!hidden sm:!block !text-primary "
            />
          </div>
        </>
      )}
    </Layout>
  );
};
