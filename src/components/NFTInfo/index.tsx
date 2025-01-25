import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../../layouts/Default";
import { Avatar, Button, Grid, Skeleton, Stack } from "@mui/material";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/store";
import axios from "axios";
import styled from "styled-components";
import IconAlarm from "/src/static/icon-alarm.svg";
import ButtonBuy from "/src/static/button-buy.svg";
import ButtonOffer from "/src/static/button-offer.svg";
import ButtonBid from "/src/static/button-bid.svg";
import { stringToColorCode } from "../../utils/string";
import RowingIcon from "@mui/icons-material/Rowing";

import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "react-toastify";

import algosdk from "algosdk";
//import { MarketplaceContext } from "../../store/MarketplaceContext";
import { compactAddress, decodePrice, decodeTokenId } from "../../utils/mp";
import NftCard from "../../components/NFTCard";
import BuySaleModal, { multiplier } from "../../components/modals/BuySaleModal";
// @ts-ignore
import { CONTRACT, arc72, arc200, mp, abi, swap } from "ulujs";
import { getAlgorandClients } from "../../wallets";
import { ListingBoxCost, CTCINFO_MP206 } from "../../contants/mp";

import VoiIcon from "/src/static/crypto-icons/voi/0.svg";
import ViaIcon from "/src/static/crypto-icons/voi/6779767.svg";

import XIcon from "/src/static/icon/icon-x.svg";
import DiscordIcon from "/src/static/icon/icon-discord.svg";
import LinkIcon from "/src/static/icon/icon-link.svg";
import ListSaleModal from "../modals/ListSaleModal";
//import { QUEST_ACTION, getActions, submitAction } from "../../config/quest";
import { getSmartTokens } from "../../store/smartTokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { NFTIndexerListingI, TokenType } from "../../types";
import { BigNumber } from "bignumber.js";
import { decodeRoyalties } from "../../utils/hf";
import { useWallet } from "@txnlab/use-wallet-react";
import { TOKEN_WVOI } from "@/contants/tokens";
import { useAccountInfo } from "../Navbar/hooks";
import { useStakingContract } from "@/hooks/staking";
import { useEnvoiResolver } from "@/hooks/useEnvoiResolver";

const formatter = Intl.NumberFormat("en", { notation: "compact" });

const CryptoIcon = styled.img`
  width: 16px;
  height: 16px;
`;

const ProjectIcon = styled.img`
  width: 32px;
  height: 31px;
  cursor: pointer;
`;

const ProjectLinkContainer = styled.div`
  margin-top: 27px;
  display: flex;
  align-items: flex-start;
  gap: 7px;
  color: #68727d;
  & .project-link-label-dark {
    color: #fff;
  }
  & .project-link-label-light {
    color: #000;
  }
`;

const ProjectLinkLabelContainer = styled.div`
  display: flex;
  width: 91px;
  height: 31px;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 8px;
`;

const ProjectLinkLabel = styled.div`
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: Inter;
  font-size: 14px;
  font-style: normal;
  font-weight: 600;
  line-height: 12px; /* 85.714% */
  width: 339px;
`;

const AvatarWithName = styled(Stack)`
  dsplay: flex;
  align-items: center;
  color: #68727d;
  & .owner-name {
    cursor: pointer;
    color: #68727d;
    font-family: Inter;
    font-size: 16px;
    font-style: normal;
    font-weight: 500;
    line-height: 140%; /* 22.4px */
  }
`;

const OwnerValue = styled.div`
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: "Advent Pro";
  font-size: 14px;
  font-style: normal;
  font-weight: 700;
  line-height: 12px; /* 85.714% */
`;

const OwnerLabel = styled.div`
  color: #68727d;
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: Inter;
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
  line-height: 12px; /* 85.714% */
`;

const AvatarWithOwnerName = styled(AvatarWithName)`
  & .owner-value-dark {
    color: #fff;
  }
  & .owner-value-light {
    color: #000;
  }
`;

const StyledLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const NFTName = styled.div`
  color: #000;
  font-feature-settings: "clig" off, "liga" off;
  font-family: "Advent Pro";
  font-size: 30px;
  font-style: normal;
  font-weight: 700;
  line-height: 36px; /* 120% */
`;

const PriceDisplay = styled(Stack)`
  gap: 8px;
  & .price-label-dark {
    color: #68727d;
  }
  & .price-label-light {
    color: #000;
  }
  & .price-label {
    leading-trim: both;
    text-edge: cap;
    font-feature-settings: "clig" off, "liga" off;
    font-family: Inter;
    font-size: 14px;
    font-style: normal;
    font-weight: 500;
    line-height: 12px; /* 85.714% */
  }
  & .price-value {
    font-family: Advent Pro;
    font-size: 24px;
    font-weight: 700;
    line-height: 32px;
    letter-spacing: 0em;
    text-align: left;
  }
`;

const BuyButton = styled.img`
  cursor: pointer;
`;

const OfferButton = styled(BuyButton)``;

const BidButton = styled(BuyButton)``;

const AuctionContainer = styled(Stack)`
  padding: 16px;
  border-radius: 16px;
  border: 1px;
  gap: 8px;
  justify-content: space-between;
  border: 1px solid #eaebf0;
  align-items: center;
  & .auction-left {
    padding: 8px;
    & .auction-label {
      font-family: Inter;
      font-size: 16px;
      font-weight: 500;
      line-height: 22px;
      letter-spacing: 0em;
      text-align: left;
      color: #68727d;
    }
    & .auction-value {
      font-family: Inter;
      font-size: 24px;
      font-weight: 700;
      line-height: 22px;
      letter-spacing: 0em;
      text-align: left;
    }
  }
  & .auction-right {
    display: flex;
    flex-direction: column;
    gap: 10px;
    & .alarm-container {
      align-items: center;
      & .time-remaining {
        font-family: Advent Pro;
        font-size: 14px;
        font-weight: 700;
        line-height: 12px;
        letter-spacing: 0em;
        text-align: left;
      }
    }
  }
`;

const MoreFrom = styled.h3`
  font-family: Advent Pro;
  font-size: 36px;
  font-weight: 700;
  line-height: 40px;
  letter-spacing: 0em;
  text-align: left;
  margin-top: 48px;
`;

const { algodClient, indexerClient } = getAlgorandClients();

interface NFTInfoProps {
  nft: any;
  collection: any;
  collectionInfo: any;
  loading: boolean;
  exchangeRate: number;
  collectionName?: string;
}

export const NFTInfo: React.FC<NFTInfoProps> = ({
  nft,
  collection,
  collectionInfo,
  loading,
  exchangeRate,
  collectionName,
}) => {
  /* Wallet */
  const { activeAccount, signTransactions } = useWallet();
  // EnVoi
  const resolver = useEnvoiResolver();
  /* Modal */
  const [openBuyModal, setOpenBuyModal] = React.useState(false);
  const [isBuying, setIsBuying] = React.useState(false);
  const [openListSale, setOpenListSale] = React.useState(false);
  const [isListing, setIsListing] = React.useState(false);
  /* Router */
  const { id, tid } = useParams();
  const navigate = useNavigate();
  /* Theme */
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  const [manager, setManager] = useState<string>("");
  useEffect(() => {
    if (!nft.listing) return;
    new mp(nft.listing.mpContractId, algodClient, indexerClient)
      .manager()
      .then((r: any) => {
        setManager(r.returnValue);
      });
  }, [nft.listing]);

  const dispatch = useDispatch();

  const smartTokens = useSelector((state: any) => state.smartTokens.tokens);
  const smartTokenStatus = useSelector(
    (state: any) => state.smartTokens.status
  );
  useEffect(() => {
    dispatch(getSmartTokens() as unknown as UnknownAction);
  }, [dispatch]);

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
      toast.error(e.message);
    } finally {
    }
  };

  const handleListSale = async (price: string, currency: string) => {
    const listedNft = nft;
    const priceN = Number(price);
    const currencyN = Number(currency);
    try {
      if (isNaN(priceN)) {
        throw new Error("Invalid price");
      }
      if (isNaN(currencyN)) {
        throw new Error("Invalid currency");
      }
      if (!activeAccount) {
        throw new Error("No active account");
      }
      setIsListing(true);

      const contractId = nft?.contractId || 0;
      const tokenId = nft?.tokenId || 0;

      if (!contractId || !tokenId) {
        throw new Error("Invalid contractId or tokenId");
      }

      const ciArc72 = new arc72(contractId, algodClient, indexerClient, {
        acc: { addr: activeAccount?.address || "", sk: new Uint8Array(0) },
      });
      const arc72_ownerOfR = await ciArc72.arc72_ownerOf(tokenId);
      if (!arc72_ownerOfR.success) {
        throw new Error("arc72_ownerOf failed in simulate");
      }
      const arc72_ownerOf = arc72_ownerOfR.returnValue;

      const builder = {
        arc200: new CONTRACT(
          currencyN,
          algodClient,
          indexerClient,
          abi.arc200,
          {
            addr: activeAccount?.address || "",
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
        arc72: new CONTRACT(
          contractId,
          algodClient,
          indexerClient,
          abi.arc72,
          {
            addr: arc72_ownerOf,
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
        mp: new CONTRACT(
          CTCINFO_MP206,
          algodClient,
          indexerClient,
          {
            name: "mp",
            desc: "mp",
            methods: [
              // a_sale_deleteListing(ListingId)
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
              // a_sale_listNet(CollectionId, TokenId, ListPrice, EndTime, RoyaltyPoints, CreatePoints1, CreatorPoint2, CreatorPoint3, CreatorAddr1, CreatorAddr2, CreatorAddr3)ListId
              {
                name: "a_sale_listNet",
                args: [
                  {
                    name: "collectionId",
                    type: "uint64",
                  },
                  {
                    name: "tokenId",
                    type: "uint256",
                  },
                  {
                    name: "listPrice",
                    type: "uint64",
                  },
                  {
                    name: "endTime",
                    type: "uint64",
                  },
                  {
                    name: "royalty",
                    type: "uint64",
                  },
                  {
                    name: "createPoints1",
                    type: "uint64",
                  },
                  {
                    name: "creatorPoint2",
                    type: "uint64",
                  },
                  {
                    name: "creatorPoint3",
                    type: "uint64",
                  },
                  {
                    name: "creatorAddr1",
                    type: "address",
                  },
                  {
                    name: "creatorAddr2",
                    type: "address",
                  },
                  {
                    name: "creatorAddr3",
                    type: "address",
                  },
                ],
                returns: {
                  type: "uint256",
                },
              },
              {
                name: "a_sale_listSC",
                args: [
                  {
                    name: "collectionId",
                    type: "uint64",
                  },
                  {
                    name: "tokenId",
                    type: "uint256",
                  },
                  {
                    name: "paymentTokenId",
                    type: "uint64",
                  },
                  {
                    name: "listPrice",
                    type: "uint256",
                  },
                  {
                    name: "endTime",
                    type: "uint64",
                  },
                  {
                    name: "royalty",
                    type: "uint64",
                  },
                  {
                    name: "createPoints1",
                    type: "uint64",
                  },
                  {
                    name: "creatorPoint2",
                    type: "uint64",
                  },
                  {
                    name: "creatorPoint3",
                    type: "uint64",
                  },
                  {
                    name: "creatorAddr1",
                    type: "address",
                  },
                  {
                    name: "creatorAddr2",
                    type: "address",
                  },
                  {
                    name: "creatorAddr3",
                    type: "address",
                  },
                ],
                returns: {
                  type: "uint256",
                },
              },
            ],
            events: [],
          },
          {
            addr: arc72_ownerOf,
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
      };
      const ciArc200 = new arc200(currencyN, algodClient, indexerClient);
      const ci = new CONTRACT(
        CTCINFO_MP206,
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
        {
          addr: arc72_ownerOf,
          sk: new Uint8Array(0),
        }
      );
      // VOI Sale
      if (currencyN === 0) {
        const customPaymentAmount = [ListingBoxCost];
        const buildP = [
          builder.mp.a_sale_listNet(
            contractId, // CollectionId
            tokenId, // TokenId
            priceN * 1e6, // ListPrice
            Number.MAX_SAFE_INTEGER, // EndTime
            Math.min(nft?.royalties?.royaltyPoints || 0, 9500), // RoyaltyPoints
            nft?.royalties?.creator1Points || 0, // CreatePoints1
            nft?.royalties?.creator2Points || 0, // CreatePoints1
            nft?.royalties?.creator3Points || 0, // CreatePoints1
            nft?.royalties?.creator1Address ||
              "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ", // CreatePoints1
            nft?.royalties?.creator2Address ||
              "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ", // CreatePoints1
            nft?.royalties?.creator3Address ||
              "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ" // CreatePoints1
          ),
          builder.arc72.arc72_approve(
            algosdk.getApplicationAddress(CTCINFO_MP206), // Address
            tokenId // TokenId
          ),
        ];
        if (listedNft.listing) {
          buildP.push(
            builder.mp.a_sale_deleteListing(listedNft.listing.mpListingId)
          );
        }
        const customTxns = (await Promise.all(buildP)).map(({ obj }) => obj);
        ci.setAccounts([
          "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ", // mp206 D
        ]);
        ci.setFee(2000);
        ci.setPaymentAmount(
          customPaymentAmount.reduce((acc, val) => acc + val, 0)
        );
        ci.setExtraTxns(customTxns);
        // -----------------------------------------
        // eat auto optins
        /*
        if (contractId === 29088600) {
          // Cassette
          ci.setOptins([29103397]);
        } else if (contractId === 29085927) {
          // Treehouse
          ci.setOptins([33611293]);
        }
        */
        // -----------------------------------------
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
        // QUEST HERE list voi
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
        //         contractId,
        //         tokenId,
        //       });
        //     }
        //     // TODO notify quest completion here
        //   }
        // } while (0);
        // ---------------------------------------
      }
      // VIA Sale
      else {
        // ------------------------------------------d
        // Setup recipient accounts
        // ------------------------------------------d
        do {
          const ciMp = new CONTRACT(
            CTCINFO_MP206,
            algodClient,
            indexerClient,
            {
              name: "",
              desc: "",
              methods: [
                {
                  name: "manager",
                  args: [],
                  returns: {
                    type: "address",
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
          const ci = new CONTRACT(
            currencyN,
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
            {
              addr: arc72_ownerOf,
              sk: new Uint8Array(0),
            }
          );
          const managerR = await ciMp.manager();
          if (!managerR.success) {
            throw new Error("manager failed in simulate");
          }
          const manager = managerR.returnValue;
          const candidates = [
            manager,
            activeAccount?.address || "",
            nft?.royalties?.creator1Address,
            nft?.royalties?.creator2Address,
            nft?.royalties?.creator3Address,
          ];
          const addrs = [];
          for (const addr of candidates) {
            const hasBalanceR = await ciArc200.hasBalance(addr);

            if (!hasBalanceR.success) {
              throw new Error("hasBalance failed in simulate");
            }
            const hasBalance = hasBalanceR.returnValue;
            if (hasBalance === 0) {
              addrs.push(addr);
            }
          }
          const uniqAddrs = Array.from(new Set(addrs));
          if (uniqAddrs.length === 0) {
            break;
          }
          for (let i = 0; i < uniqAddrs.length; i++) {
            const addr = uniqAddrs[i];
            const buildP = [addr].map((addr) =>
              builder.arc200.arc200_transfer(addr, 0)
            );
            const customTxns = (await Promise.all(buildP)).map(
              ({ obj }) => obj
            );
            ci.setFee(1000);
            ci.setPaymentAmount(28500);
            ci.setExtraTxns(customTxns);
            const customR = await ci.custom();

            if (!customR.success) {
              throw new Error("failed in simulate");
            }
            await toast.promise(
              signTransactions(
                customR.txns.map(
                  (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
                )
              ),
              //.then(sendTransactions),
              {
                pending: `Transaction signature pending setup recipient account (${
                  i + 1
                }/${uniqAddrs.length})`,
                success: "Recipient account setup successful",
                error: "Recipient account setup failed",
              }
            );
          }
        } while (0);
        // ------------------------------------------d

        const customPaymentAmount = [ListingBoxCost];
        const buildP = [
          builder.mp.a_sale_listSC(
            contractId,
            tokenId,
            currencyN,
            priceN * 1e6,
            Number.MAX_SAFE_INTEGER,
            Math.min(nft?.royalties?.royaltyPoints || 0, 9500), // RoyaltyPoints
            nft?.royalties?.creator1Points || 0, // CreatePoints1
            nft?.royalties?.creator2Points || 0, // CreatePoints1
            nft?.royalties?.creator3Points || 0, // CreatePoints1
            nft?.royalties?.creator1Address ||
              "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ", // CreatePoints1
            nft?.royalties?.creator2Address ||
              "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ", // CreatePoints1
            nft?.royalties?.creator3Address ||
              "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ" // CreatePoints1
          ),
          builder.arc72.arc72_approve(
            algosdk.getApplicationAddress(CTCINFO_MP206),
            tokenId
          ),
        ];
        if (listedNft.listing) {
          buildP.push(
            builder.mp.a_sale_deleteListing(listedNft.listing.mpListingId)
          );
        }
        const customTxns = (await Promise.all(buildP)).map(({ obj }) => obj);
        ci.setAccounts([
          "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
        ]);
        ci.setFee(2000);
        ci.setExtraTxns(customTxns);
        // -----------------------------------------
        // eat auto optins
        /*
        if (contractId === 29088600) {
          // Cassette
          ci.setOptins([29103397]);
        } else if (contractId === 29085927) {
          // Treehouse
          ci.setOptins([33611293]);
        }
        */
        // -----------------------------------------
        ci.setPaymentAmount(
          customPaymentAmount.reduce((acc, val) => acc + val, 0)
        );
        const customR = await ci.custom();

        if (!customR.success) {
          throw new Error("failed in simulate");
        }
        await toast.promise(
          signTransactions(
            customR.txns.map(
              (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
            )
          ),
          //.then(sendTransactions),
          {
            pending: `Transaction signature pending... ${((str) =>
              str[0].toUpperCase() + str.slice(1))(
              activeAccount.providerId
            )} will prompt you to sign the transaction.`,
            success: "List successful!",
            error: "List failed",
          }
        );
        // ---------------------------------------
        // // QUEST HERE list via
        // ---------------------------------------
      }
    } catch (e: any) {
      console.log(e);
      toast.error(e.message);
    } finally {
    }
  };

  const handleMangerDelete = useCallback(async () => {
    if (!activeAccount || !manager || !nft.listing) return;
    const ci = new mp(nft.listing.mpContractId, algodClient, indexerClient, {
      acc: {
        addr: activeAccount.address,
        sk: new Uint8Array(0),
      },
    });
    const res = await ci.deleteListing(nft.listing.mpListingId);
    if (!res.success) throw new Error("failed to delete listing");
    await toast.promise(
      signTransactions(
        res.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      ),
      //.then(sendTransactions),
      {
        pending: "Transaction pending...",
        success: "Listing deleted!",
        error: "Failed to delete listing",
      }
    );
  }, [activeAccount, manager, nft.listing]);

  const { data: stakingAccountData, isLoading: isLoadingStakingAccountData } =
    useStakingContract(nft.tokenId);

  // handleBuy
  const handleBuyClick = async (pool: any, discount: any) => {
    if (!activeAccount) {
      toast.info("Please connect wallet!");
      return;
    }
    try {
      setIsBuying(true);
      // -------------------------------------
      // SIM HERE
      // -------------------------------------
      const { algodClient, indexerClient } = getAlgorandClients();
      let customR;
      for (const skipEnsure of [true, false]) {
        if (pool) {
          // -------------------------------------
          const {
            contractId: poolId,
            tokAId,
            tokBId,
            poolBalA,
            poolBalB,
          } = pool;
          // -------------------------------------
          const tokA: TokenType = smartTokens.find(
            (el: any) => `${el.contractId}` === tokAId
          );
          const tokB: TokenType = smartTokens.find(
            (el: any) => `${el.contractId}` === tokBId
          );
          const inToken = tokA?.tokenId === "0" ? tokA : tokB;
          const outToken = tokA?.tokenId !== "0" ? tokA : tokB;
          const ratio =
            inToken === tokA
              ? new BigNumber(poolBalA).div(poolBalB).toNumber()
              : new BigNumber(poolBalB).div(poolBalA).toNumber();
          // figure out how much to swap
          const swapR: any = await new swap(
            poolId,
            algodClient,
            indexerClient
          ).swap(
            activeAccount.address,
            poolId,
            {
              amount: new BigNumber(ratio)
                .times(priceBn.minus(new BigNumber(discount || 0)))
                .times(multiplier)
                .toFixed(6),
              contractId: inToken?.contractId,
              tokenId: "0",
              symbol: "VOI",
            },
            {
              contractId: outToken?.contractId,
              symbol: outToken?.symbol,
              decimals: `${outToken?.decimals}`,
            }
          );
          if (!swapR.success) throw new Error("swap failed");
          const returnValue = swapR.response.txnGroups[0].txnResults
            .slice(-1)[0]
            .txnResult.logs.slice(-1)[0];
          const selector = returnValue.slice(0, 4).toString("hex");
          const outA = algosdk.bytesToBigInt(returnValue.slice(4, 36));
          const outB = algosdk.bytesToBigInt(returnValue.slice(36, 68));

          customR = await mp.buy(activeAccount.address, nft.listing, currency, {
            paymentTokenId:
              nft.listing.currency === 0 ? TOKEN_WVOI : nft.listing.currency,
            wrappedNetworkTokenId: TOKEN_WVOI,
            extraTxns: swapR.objs,
            algodClient,
            indexerClient,
            skipEnsure,
            strategy: "merge", // prevent resource exhaustion
          });
        } else {
          // no pool
          const paymentToken = smartTokens.find(
            (el: any) => `${el.contractId}` === `${nft.listing.currency}`
          );
          customR = await mp.buy(
            activeAccount.address,
            nft.listing,
            paymentToken,
            {
              paymentTokenId:
                nft.listing.currency === 0 ? TOKEN_WVOI : nft.listing.currency,
              wrappedNetworkTokenId: TOKEN_WVOI,
              extraTxns: [],
              algodClient,
              indexerClient,
              skipEnsure,
              strategy: "merge", // prevent resource exhaustion
            }
          );
        }
        if (customR.success) break;
      }
      console.log({ customR });
      if (!customR.success) throw new Error("custed failed at end"); // abort
      // -------------------------------------
      // SIGN HERE
      // -------------------------------------
      const stxns = await signTransactions(
        customR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );
      await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();
      // TODO update balance
      // -------------------------------------
      // QUEST HERE buy
      // -------------------------------------
      // do {
      //   const address = activeAccount.address;
      //   const actions: string[] = [QUEST_ACTION.SALE_BUY_ONCE];
      //   const {
      //     data: { results },
      //   } = await getActions(address);
      //   for (const action of actions) {
      //     const address = activeAccount.address;
      //     const key = `${action}:${address}`;
      //     const completedAction = results.find((el: any) => el.key === key);
      //     if (!completedAction) {
      //       const { collectionId: contractId, tokenId } = nft.listing;
      //       await submitAction(action, address, {
      //         contractId,
      //         tokenId,
      //       });
      //     }
      //     // TODO notify quest completion here
      //   }
      // } while (0);
      // -------------------------------------
      toast.success("Purchase successful!");
    } catch (e: any) {
      console.log(e);
      toast.error(e.message);
    } finally {
      setIsBuying(false);
      setOpenBuyModal(false);
    }
  };

  const handleBuyButtonClick = async () => {
    try {
      if (!activeAccount) {
        toast.info("Please connect wallet!");
        return;
      }
      const ci = new CONTRACT(
        nft.listing.mpContractId,
        algodClient,
        indexerClient,
        {
          name: "",
          desc: "",
          methods: [
            //v_sale_listingByIndex(uint256)(uint64,uint256,address,(byte,byte[40]),uint64,uint64,uint64,uint64,uint64,uint64,address,address,address)
            {
              name: "v_sale_listingByIndex",
              args: [
                {
                  type: "uint256",
                },
              ],
              readonly: true,
              returns: {
                type: "(uint64,uint256,address,(byte,byte[40]),uint64,uint64,uint64,uint64,uint64,uint64,address,address,address)",
              },
            },
          ],
          events: [],
        },
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );
      const v_sale_listingByIndexR = await ci.v_sale_listingByIndex(
        nft.listing.mpListingId
      );
      if (!v_sale_listingByIndexR.success) {
        throw new Error("Failed to get listing");
      }
      const v_sale_listingByIndex = v_sale_listingByIndexR.returnValue;
      if (v_sale_listingByIndex[1] === BigInt(0)) {
        throw new Error("Listing no longer available");
      }

      // switch (nft.listing.currency) {
      //   // VOI
      //   case 0: {
      //     const accountInfo = await algodClient
      //       .accountInformation(activeAccount.address)
      //       .do();
      //     const { amount, ["min-balance"]: minBalance } = accountInfo;
      //     const availableBalance = amount - minBalance;
      //     if (availableBalance < nft.listing.price) {
      //       throw new Error(
      //         `Insufficient balance! (${(
      //           (availableBalance - nft.listing.price) /
      //           1e6
      //         ).toLocaleString()} VOI)`
      //       );
      //     }
      //     break;
      //   }
      //   // VIA
      //   default:
      //   case 6779767: {
      //     const ci = new arc200(
      //       nft.listing.currency,
      //       algodClient,
      //       indexerClient
      //     );
      //     const arc200_balanceOfR = await ci.arc200_balanceOf(
      //       activeAccount.address
      //     );
      //     if (!arc200_balanceOfR.success) {
      //       throw new Error("Failed to check balance");
      //     }
      //     const arc200_balanceOf = arc200_balanceOfR.returnValue;
      //     if (arc200_balanceOf < nft.listing.price) {
      //       throw new Error(
      //         `Insufficient balance! (${(
      //           (Number(arc200_balanceOf) - nft.listing.price) /
      //           1e6
      //         ).toLocaleString()}) VIA`
      //       );
      //     }
      //     break;
      //   }
      //   //default: {
      //   //  throw new Error("Unsupported currency!");
      //   //}
      // }
      setOpenBuyModal(true);
    } catch (e: any) {
      console.log(e);
      toast.info(e.message);
    }
  };

  const currency = smartTokens?.find(
    (el: TokenType) => `${el.contractId}` === `${nft.listing?.currency}`
  );
  const currencySymbol =
    currency?.tokenId === "0" ? "VOI" : currency?.symbol || "VOI";
  const currencyDecimals =
    currency?.decimals === 0 ? 0 : currency?.decimals || 6;
  const priceBn = new BigNumber(nft.listing?.price).div(
    new BigNumber(10).pow(currencyDecimals)
  );
  const price = formatter.format(priceBn.toNumber());
  const priceAU = new BigNumber(nft.listing?.price).toFixed(0);

  const displayImage =
    (nft.metadata?.image || "").indexOf("ipfs://") >= 0
      ? `https://ipfs.io/ipfs/${nft.metadata?.image?.replace("ipfs://", "")}`
      : nft.metadata?.image;

  const displayCoverImage =
    (collection[0]?.metadata?.image || "").indexOf("ipfs://") >= 0
      ? `https://ipfs.io/ipfs/${collection[0].metadata.image?.replace(
          "ipfs://",
          ""
        )}`
      : collection[0]?.metadata?.image;

  const displayName =
    nft?.collectionName || (nft.metadata?.name || "").match(/[0-9]/)
      ? nft.metadata?.name
      : nft.metadata?.name + " #" + nft.tokenId;

  const [loadingOwnerProfile, setLoadingOwnerProfile] = useState(false);
  const [owner, setOwner] = useState<string | undefined>(nft.owner);
  const [ownerName, setOwnerName] = useState<string>("");
  const [ownerProfile, setOwnerProfile] = useState<any>(null);
  useEffect(() => {
    if (!nft) return;
    setLoadingOwnerProfile(true);
    const ci = new arc72(nft.contractId, algodClient, indexerClient);
    const tokenId = Number(nft.tokenId);
    ci.arc72_ownerOf(tokenId).then((res: any) => {
      if (res.success) {
        const owner = res.returnValue;
        setOwner(owner);
        resolver.http.getNameFromAddress(owner).then((res) => {
          if (!!res) {
            setOwnerName(res);
            resolver.http.search(res).then((res) => {
              if (res.length === 1) {
                setOwnerProfile(res[0]);
                setLoadingOwnerProfile(false);
              }
            });
          } else {
            setOwnerName(compactAddress(owner));
            setLoadingOwnerProfile(false);
          }
        });
      }
    });
  }, [nft]);
  console.log({ loadingOwnerProfile, ownerName, ownerProfile });

  const discount = useMemo(() => {
    if (
      !nft.listing ||
      !priceAU ||
      !stakingAccountData ||
      isLoadingStakingAccountData ||
      stakingAccountData.length === 0
    )
      return 0;
    const priceN = new BigNumber(priceAU).div(1e6).toNumber();
    const totalN = Number(stakingAccountData?.global_total) / 1e6;

    return priceN < totalN ? formatter.format(totalN) : "";
  }, [nft, priceAU, stakingAccountData, isLoadingStakingAccountData]);

  return !loading ? (
    <>
      <Grid
        sx={{
          border: "1px",
          alignItems: "center",
        }}
        container
        spacing="60px"
      >
        <Grid item xs={12} md={6}>
          {!loading ? (
            <img
              src={displayImage}
              style={{ width: "100%", borderRadius: "16px" }}
            />
          ) : (
            <Skeleton
              variant="rounded"
              height={600}
              width={600}
              sx={{
                maxWidth: "100%",
                maxHeight: "100%",
                borderRadius: "16px",
              }}
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6}>
          <Stack style={{ gap: "27px" }}>
            <Stack style={{ gap: "18px" }}>
              {((addr) => (
                <AvatarWithName
                  direction="row"
                  gap={1}
                  sx={{ alignItems: "end" }}
                >
                  <Avatar
                    sx={{
                      height: "45px",
                      width: "45px",
                      background: `url(${
                        collectionInfo?.project?.coverImageURL ||
                        displayCoverImage
                      })`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    &nbsp;
                  </Avatar>
                  <span
                    className="owner-name"
                    onClick={() => {
                      navigate(`/collection/${nft.contractId}`);
                    }}
                  >
                    {nft?.collectionName ||
                      collectionInfo?.project?.title ||
                      nft.metadata?.name?.replace(/[#0123456789 ]*$/, "") ||
                      ""}
                  </span>
                </AvatarWithName>
              ))(algosdk.getApplicationAddress(nft?.contractId || 0))}
              <NFTName style={{ color: isDarkTheme ? "#FFFFFF" : undefined }}>
                {displayName}
              </NFTName>
              {loadingOwnerProfile ? (
                <Skeleton variant="text" width={150} height={24} />
              ) : (
                <AvatarWithOwnerName direction="row" style={{ gap: "6px" }}>
                  <Avatar
                    src={ownerProfile?.metadata?.avatar || undefined}
                    sx={{
                      height: "24px",
                      width: "24px",
                      background: `linear-gradient(45deg, ${stringToColorCode(
                        nft.owner
                      )}, ${isDarkTheme ? "#000" : "#fff"})`,
                    }}
                  >
                    {nft.owner.slice(0, 1)}
                  </Avatar>
                  <Stack style={{ gap: "6px" }}>
                    <OwnerLabel>Owner</OwnerLabel>
                    <StyledLink to={`/account/${nft.owner}`}>
                      <OwnerValue
                        className={
                          isDarkTheme ? "owner-value-dark" : "owner-value-light"
                        }
                      >
                        {ownerName}
                      </OwnerValue>
                    </StyledLink>
                  </Stack>
                </AvatarWithOwnerName>
              )}

              <ProjectLinkContainer>
                <ProjectLinkLabelContainer>
                  <ProjectLinkLabel
                    className={
                      isDarkTheme
                        ? "project-link-label-dark"
                        : "project-link-label-light"
                    }
                  >
                    Project Links:
                  </ProjectLinkLabel>
                </ProjectLinkLabelContainer>
                {collectionInfo?.project?.twitter ? (
                  <Link to={collectionInfo.project.twitter} target="_blank">
                    <ProjectIcon src={XIcon} alt="X Icon" />
                  </Link>
                ) : null}
                {collectionInfo?.project?.discord ? (
                  <Link to={collectionInfo.project.discord} target="_blank">
                    <ProjectIcon src={DiscordIcon} alt="Discord Icon" />
                  </Link>
                ) : null}
                {collectionInfo?.project?.website ? (
                  <Link to={collectionInfo.project.website} target="_blank">
                    <ProjectIcon src={LinkIcon} alt="Link Icon" />
                  </Link>
                ) : null}
                <Link
                  target="_blank"
                  to={`https://nftnavigator.xyz/collection/${nft.contractId}`}
                >
                  <Avatar
                    style={{
                      height: "32px",
                      width: "32px",
                      background: "black",
                    }}
                  >
                    <RowingIcon sx={{ color: "white" }} />
                  </Avatar>
                  {/*<ProjectIcon
                    height="25"
                    width="25"
                    style={{
                      borderRadius: "50%",
                    }}
                    src={
                      "https://nftnavigator.xyz/_app/immutable/assets/android-chrome-192x192.BJQGzsFc.png"
                    }
                    alt="Navigator Icon"
                  />*/}
                </Link>
              </ProjectLinkContainer>
            </Stack>
            {!loading ? (
              <PriceDisplay gap={0.5}>
                <div
                  className={[
                    "price-label",
                    isDarkTheme ? "price-label-dark" : "price-label-light",
                  ].join(" ")}
                >
                  Price
                </div>
                <Stack
                  direction="row"
                  gap={1}
                  style={{
                    alignItems: "center",
                  }}
                >
                  {nft.listing ? (
                    <CryptoIcon
                      src={
                        `${nft.listing.currency}` === "0" ||
                        currency?.tokenId === "0"
                          ? VoiIcon
                          : ViaIcon
                      }
                      alt={`${nft.listing.currency}` === "0" ? "VOI" : "VIA"}
                    />
                  ) : null}
                  {discount ? (
                    <div
                      className="price-value"
                      style={{
                        color: "#FF5733",
                        textDecoration: "line-through",
                      }}
                    >
                      {discount} {currencySymbol}
                    </div>
                  ) : null}
                  <div
                    className="price-value"
                    style={{
                      color: isDarkTheme ? "#FFFFFF" : undefined,
                    }}
                  >
                    {!nft.listing ||
                    nft.approved ===
                      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ"
                      ? "Not Available"
                      : `${price} ${currencySymbol}`}
                    {/*!nft.listing ||
                    nft.approved ===
                      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ" ? null : (
                      <span
                        style={{
                          fontSize: "16px",
                          color: "#68727d",
                        }}
                      >
                        {`${nft.listing.currency}` === "0"
                          ? `(~${Math.round(
                              nft.listing.price / exchangeRate / 1e6
                            ).toLocaleString()} VIA)`
                          : `(~${Math.round(
                              (nft.listing.price * exchangeRate) / 1e6
                            ).toLocaleString()} VOI)`}
                      </span>
                          )*/}
                  </div>
                </Stack>
              </PriceDisplay>
            ) : (
              <Skeleton variant="text" width={150} height={24} />
            )}
            {nft.approved !==
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ" ? (
              <>
                <Stack direction="row" gap={2} sx={{ alignItems: "center" }}>
                  {nft?.listing || "" ? (
                    nft.owner !== activeAccount?.address ? (
                      <BuyButton
                        src={ButtonBuy}
                        alt="Buy Button"
                        onClick={handleBuyButtonClick}
                      />
                    ) : (
                      <>
                        {/*<Button
                          variant="text"
                          onClick={() => {
                            setOpenListSale(true);
                          }}
                        >
                          Update
                        </Button>*/}
                        <Button
                          variant="text"
                          onClick={() => {
                            handleDeleteListing(nft.listing.mpListingId);
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    )
                  ) : nft.owner === activeAccount?.address ? null /*
                    <Button
                      variant="text"
                      onClick={() => setOpenListSale(true)}
                    >
                      List for Sale
                    </Button>
                    */ : null}
                  {false && (
                    <OfferButton src={ButtonOffer} alt="Offer Button" />
                  )}
                  {activeAccount?.address === manager ? (
                    <Button color="warning" onClick={handleMangerDelete}>
                      Delete
                    </Button>
                  ) : null}
                </Stack>
                {false ? (
                  <AuctionContainer direction="row">
                    <div className="auction-left">
                      <Stack gap={0.5}>
                        <div className="auction-label">Auction</div>
                        <div
                          className="auction-value"
                          style={{
                            color: isDarkTheme ? "#FFFFFF" : undefined,
                          }}
                        >
                          1,000 VOI
                        </div>
                      </Stack>
                    </div>
                    <div className="auction-right">
                      <Stack
                        className="alarm-container"
                        direction="row"
                        gap={2}
                      >
                        <img src={IconAlarm} alt="Alarm Icon" />
                        <div
                          className="time-remaining"
                          style={{
                            color: isDarkTheme ? "#FFFFFF" : undefined,
                          }}
                        >
                          36h 10m 34s
                        </div>
                      </Stack>
                      <BidButton src={ButtonBid} alt="Bid Button" />
                    </div>
                  </AuctionContainer>
                ) : null}
              </>
            ) : null}
          </Stack>
        </Grid>
      </Grid>
      <ListSaleModal
        title="List NFT for Sale"
        loading={isListing}
        open={openListSale}
        handleClose={() => setOpenListSale(false)}
        onSave={handleListSale}
        nft={nft}
      />
      {nft.listing ? (
        <BuySaleModal
          token={nft}
          listing={nft.listing}
          seller={nft.listing.seller}
          image={nft?.metadata?.image}
          price={price}
          priceAU={priceAU}
          currency={currencySymbol}
          title="Buy NFT for Sale"
          loading={isBuying}
          open={openBuyModal}
          handleClose={() => setOpenBuyModal(false)}
          onSave={handleBuyClick}
          buttonText={`Buy`}
          paymentTokenId={nft.listing.currency}
          paymentAltTokenId={currency?.tokenId || "0"}
        />
      ) : null}
    </>
  ) : null;
};
