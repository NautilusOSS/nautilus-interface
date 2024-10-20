import React, { useEffect, useMemo } from "react";
import styled from "styled-components";
import { Avatar, Badge, Box, Chip, Fade, Stack, Tooltip } from "@mui/material";
import { stringToColorCode } from "../../utils/string";
import VoiIcon from "../../static/crypto-icons/voi/0.svg";
import ViaIcon from "../../static/crypto-icons/voi/6779767.svg";
import {
  ListedToken,
  ListingTokenI,
  NFTIndexerListingI,
  NFTIndexerTokenI,
  TokenType,
} from "../../types";
import { useNavigate } from "react-router-dom";
import BuySaleModal, { multiplier } from "../modals/BuySaleModal";
import { toast } from "react-toastify";
import algosdk from "algosdk";
import { getAlgorandClients } from "../../wallets";
import { CONTRACT, abi, mp, swap } from "ulujs";
import { BigNumber } from "bignumber.js";
import { QUEST_ACTION, getActions, submitAction } from "../../config/quest";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import { uluClient } from "../../utils/contract";
import { zeroAddress } from "../../contants/accounts";
import { TOKEN_WVOI } from "../../contants/tokens";
import { useSelector } from "react-redux";
import { useWallet } from "@txnlab/use-wallet-react";
import { HIGHFORGE_CDN } from "@/config/arc72-idx";

const formatter = Intl.NumberFormat("en", { notation: "compact" });

const CollectionName = styled.div`
  color: var(--White, #fff);
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: Inter;
  font-size: 20px;
  font-style: normal;
  font-weight: 800;
  line-height: 24px; /* 120% */
`;

const CollectionVolume = styled.div`
  color: var(--White, #fff);
  font-family: Inter;
  font-size: 16px;
  font-style: normal;
  font-weight: 600;
  line-height: 140%; /* 22.4px */
`;

const NFTCardWrapper = styled.div`
  align-items: center;
  background: linear-gradient(
    180deg,
    rgb(245, 211, 19) 0%,
    rgb(55, 19, 18) 100%
  );
  //background-color: rgba(255, 255, 255, 1);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: all 0.1s ease;
  overflow: hidden;
  cursor: pointer;
  &:hover {
    transform: scale(1.05);
  }
  & .image {
    align-self: stretch;
    position: relative;
    width: 100%;
    height: 200px;
  }

  & .NFT-info {
    -webkit-backdrop-filter: blur(200px) brightness(100%);
    align-items: flex-start;
    align-self: stretch;
    backdrop-filter: blur(200px) brightness(100%);
    /*background-color: #20202066;*/
    border-radius: 0px 0px 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    //height: 176px;
    padding: 20px 30px 25px;
    position: relative;
    width: 100%;
    height: 150px;
  }

  & .frame {
    align-items: center;
    align-self: stretch;
    display: flex;
    flex: 0 0 auto;
    gap: 25px;
    position: relative;
    width: 100%;
  }

  & .artist-avatar-name-wrapper {
    align-items: center;
    display: flex;
    flex: 1;
    flex-grow: 1;
    gap: 10px;
    justify-content: space-around;
    position: relative;
  }

  & .artist-avatar-name {
    align-items: center;
    display: flex;
    flex: 1;
    flex-grow: 1;
    gap: 10px;
    position: relative;
  }

  & .avatar-instance {
    background-image: url(./avatar.svg) !important;
    height: 24px !important;
    position: relative !important;
    width: 24px !important;
  }

  & .text-wrapper {
    color: white;
    flex: 1;
    position: relative;
    font-family: Inter;
    font-size: 16px;
    font-weight: 500;
    line-height: 22px;
    letter-spacing: 0em;
    text-align: left;
  }

  & .highest-bid {
    align-items: center;
    display: flex;
    flex: 1;
    flex-grow: 1;
    gap: 16px;
    justify-content: flex-end;
    position: relative;
  }

  & .div {
    align-items: center;
    background-color: #ffffff33;
    border-radius: 100px;
    display: inline-flex;
    flex: 0 0 auto;
    gap: 10px;
    justify-content: flex-end;
    padding: 6px;
    position: relative;
  }

  & .icon-instance-node {
    height: 24px !important;
    position: relative !important;
    width: 24px !important;
  }

  & .artst-info {
    align-items: flex-start;
    align-self: stretch;
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    gap: 5px;
    position: relative;
    width: 100%;
  }

  & .text-wrapper-2 {
    align-self: stretch;
    color: white;
    line-height: 24px;
    margin-top: -1px;
    position: relative;
    font-family: Inter, Helvetica;
    font-size: 20px;
    font-weight: 800;
    line-height: 24px;
    letter-spacing: 0em;
    text-align: left;
  }

  & .additional-info {
    align-items: flex-end;
    align-self: stretch;
    display: flex;
    flex: 0 0 auto;
    justify-content: flex-end;
    position: relative;
    width: 100%;
  }

  & .price {
    align-items: flex-start;
    display: flex;
    flex: 1;
    flex-direction: column;
    flex-grow: 1;
    gap: 8px;
    padding: 0px 21px 0px 0px;
    position: relative;
  }

  & .text-wrapper-3 {
    align-self: stretch;
    color: #ffffff;
    font-family: Inter, Helvetica;
    margin-top: -1px;
    position: relative;
    font-family: Inter;
    font-size: 14px;
    font-weight: 400;
    line-height: 15px;
    letter-spacing: 0em;
    text-align: left;
  }

  & .text-wrapper-4 {
    display: flex;
    align-items: center;
    gap: 5px;
    align-self: stretch;
    color: white;
    position: relative;
    font-family: monospace;
    font-size: 18px;
    font-weight: 700;
    line-height: 20px;
    letter-spacing: 0em;
    text-align: left;
  }
`;

interface NFTCardProps {
  token: ListingTokenI | NFTIndexerTokenI;
  listing?: NFTIndexerListingI;
  onClick?: () => void;
  selected?: boolean;
  size?: "small" | "medium" | "large";
  imageOnly?: boolean;
}

const CartNftCard: React.FC<NFTCardProps> = ({
  imageOnly = false,
  size = "medium",
  token,
  listing,
  onClick,
  selected,
}) => {
  const { activeAccount, signTransactions } = useWallet();

  const metadata = JSON.parse(token.metadata || "{}");

  const navigate = useNavigate();

  const [display, setDisplay] = React.useState(true);

  const [isBuying, setIsBuying] = React.useState(false);
  const [openBuyModal, setOpenBuyModal] = React.useState(false);

  const smartTokens = useSelector((state: any) => state.smartTokens.tokens);

  const currency = smartTokens.find(
    (token: any) => `${token.contractId}` === `${listing?.currency}`
  );

  const currencyDecimals =
    currency?.decimals === 0 ? 0 : currency?.decimals || 6;
  const currencySymbol =
    currency?.tokenId === "0" ? "VOI" : currency?.symbol || "VOI";

  const priceBn = new BigNumber(listing?.price || 0).div(
    new BigNumber(10).pow(currencyDecimals)
  );

  const price = formatter.format(priceBn.toNumber());

  const priceNormal = useMemo(() => {
    if (!currency || !currency.price) return 0;
    const price = priceBn.multipliedBy(new BigNumber(currency.price));
    return formatter.format(price.toNumber());
  }, [currency, priceBn]);

  const handleBuyButtonClick = async () => {
    try {
      if (!activeAccount) {
        toast.info("Please connect wallet!");
        return;
      }
      const { algodClient, indexerClient } = getAlgorandClients();
      const ci = new CONTRACT(
        listing?.mpContractId || 0,
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
        listing?.mpListingId || 0
      );
      if (!v_sale_listingByIndexR.success) {
        throw new Error("Failed to get listing");
      }
      const v_sale_listingByIndex = v_sale_listingByIndexR.returnValue;
      if (v_sale_listingByIndex[1] === BigInt(0)) {
        throw new Error("Listing no longer available");
      }
      switch (listing?.currency || 0) {
        /*
        // VOI
        case 0: {
          const accountInfo = await algodClient
            .accountInformation(activeAccount.address)
            .do();
          const { amount, ["min-balance"]: minBalance } = accountInfo;
          const availableBalance = amount - minBalance;
          if (availableBalance < el.price) {
            throw new Error(
              `Insufficient balance! (${(
                (availableBalance - el.price) /
                1e6
              ).toLocaleString()} VOI)`
            );
          }
          break;
        }
        // VIA
        case 6779767: {
          const ci = new arc200(el.currency, algodClient, indexerClient);
          const arc200_balanceOfR = await ci.arc200_balanceOf(
            activeAccount.address
          );
          if (!arc200_balanceOfR.success) {
            throw new Error("Failed to check balance");
          }
          const arc200_balanceOf = arc200_balanceOfR.returnValue;
          if (arc200_balanceOf < el.price) {
            throw new Error(
              `Insufficient balance! (${(
                (Number(arc200_balanceOf) - el.price) /
                1e6
              ).toLocaleString()}) VIA`
            );
          }
          break;
        }
        */
        default: {
          //throw new Error("Unsupported currency!");
        }
      }
      setOpenBuyModal(true);
    } catch (e: any) {
      console.log(e);
      toast.info(e.message);
    }
  };
  
  const handleCartIconClick = async (pool: any, discount: any) => {
    if (!activeAccount || !listing) {
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

          customR = await mp.buy(activeAccount.address, listing, currency, {
            paymentTokenId:
              listing.currency === 0 ? TOKEN_WVOI : listing.currency,
            wrappedNetworkTokenId: TOKEN_WVOI,
            extraTxns: swapR.objs,
            algodClient,
            indexerClient,
            skipEnsure,
          });
        } else {
          // no pool
          const paymentToken = smartTokens.find(
            (el: any) => `${el.contractId}` === `${listing.currency}`
          );
          customR = await mp.buy(activeAccount.address, listing, paymentToken, {
            paymentTokenId:
              listing.currency === 0 ? TOKEN_WVOI : listing.currency,
            wrappedNetworkTokenId: TOKEN_WVOI,
            extraTxns: [],
            algodClient,
            indexerClient,
            skipEnsure,
          });
        }
        if (customR.success) break;
      }
      console.log({ customR });
      if (!customR.success) throw new Error("custom failed at end"); // abort
      // -------------------------------------
      // SIGM HERE
      // -------------------------------------
      const stxn = await signTransactions(
        customR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );
      await algodClient.sendRawTransaction(stxn as Uint8Array[]).do();
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
      //       const { collectionId: contractId, tokenId } = listing;
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
  const collectionsMissingImage = [35720076];
  const url = !collectionsMissingImage.includes(Number(token.contractId))
    ? `${HIGHFORGE_CDN}/i/${encodeURIComponent(token.metadataURI)}?w=400`
    : metadata.image;

  const displayName = (metadata.name || "").match(/[0-9]/)
    ? metadata.name
    : `${metadata.name} #${token.tokenId}`;

  return display ? (
    <Box
      style={{
        border: `4px solid ${selected ? "green" : "transparent"}`,
        borderRadius: "25px",
      }}
    >
      <Box
        style={{
          cursor: "pointer",
          width: size === "medium" ? "305px" : "100px",
          height: size === "medium" ? "305px" : "100px",
          flexShrink: 0,
          borderRadius: "20px",
          background: `linear-gradient(0deg, rgba(0, 0, 0, 0.50) 10.68%, rgba(0, 0, 0, 0.00) 46.61%), 
            url(${url}), 
            lightgray 50% / cover no-repeat`,
          backgroundSize: "cover",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
        onClick={
          onClick
          /*
          (e) => {
          navigate(`/collection/${token.contractId}/token/${token.tokenId}`);
        }*/
        }
      >
        {!imageOnly ? (
          <Stack
            direction="row"
            spacing={2}
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
              color: "#fff",
              width: "90%",
              height: "52px",
              marginBottom: "27px",
            }}
          >
            <Stack gap={1}>
              <CollectionName>{displayName}</CollectionName>
              <CollectionVolume>
                {price !== "0" ? (
                  <Stack direction="row" gap={1} sx={{ alignItems: "center" }}>
                    <span>
                      {`${priceNormal || price} ${
                        priceNormal ? "VOI" : currencySymbol
                      }`}
                    </span>
                    {priceNormal && currencySymbol !== "VOI" ? (
                      <Chip
                        sx={{ background: "#fff" }}
                        label={`${price} ${currencySymbol}`}
                      />
                    ) : null}
                  </Stack>
                ) : null}
              </CollectionVolume>
            </Stack>
            {price !== "0" ? (
              <img
                style={{ zIndex: 2 }}
                height="40"
                width="40"
                src="/static/icon-cart.png"
                onClick={(e) => {
                  e.stopPropagation(); // Prevents the outer onClick handler from triggering
                  e.preventDefault();
                  handleBuyButtonClick();
                }}
              />
            ) : null}
          </Stack>
        ) : null}
      </Box>
      {activeAccount && openBuyModal && listing ? (
        <BuySaleModal
          token={token}
          listing={listing}
          seller={listing.seller}
          open={openBuyModal}
          loading={isBuying}
          handleClose={() => setOpenBuyModal(false)}
          onSave={handleCartIconClick}
          title="Buy NFT"
          buttonText="Buy"
          image={metadata.image}
          price={price}
          priceNormal={priceNormal || ""}
          priceAU={listing.price.toString()}
          currency={currencySymbol}
          paymentTokenId={listing.currency}
        />
      ) : null}
    </Box>
  ) : null;
};

export default CartNftCard;
