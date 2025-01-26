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
import { RootState } from "../../store/store";
import { fetchTokenInfo } from "@/utils/dex";
import { decodeRoyalties } from "@/utils/hf";

const formatter = Intl.NumberFormat("en", { notation: "compact" });

const CollectionName = styled.div<{ isDark?: boolean; inList?: boolean }>`
  color: ${(props) => (props.isDark ? "#fff" : "#161717")};
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: Inter;
  font-size: ${(props) => (props.inList ? "16px" : "20px")};
  font-style: normal;
  font-weight: 800;
  line-height: ${(props) => (props.inList ? "22px" : "24px")};
`;

const CollectionVolume = styled.div<{ isDark?: boolean; inList?: boolean }>`
  color: ${(props) => (props.isDark ? "#fff" : "#161717")};
  font-family: Inter;
  font-size: ${(props) => (props.inList ? "14px" : "16px")};
  font-style: normal;
  font-weight: 600;
  line-height: 140%;
`;

const NFTCardWrapper = styled.div`
  align-items: center;
  background: linear-gradient(
    180deg,
    rgb(245, 211, 19) 0%,
    rgb(55, 19, 18) 100%
  );
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

// Add this styled component for list view
const ListViewWrapper = styled.div<{ isDark?: boolean }>`
  display: flex;
  width: 100%;
  padding: 12px 16px;
  gap: 16px;
  border-radius: 12px;
  background: ${(props) => (props.isDark ? "#202020" : "#fff")};
  border: 1px solid ${(props) => (props.isDark ? "#2b2b2b" : "#eaebf0")};
  cursor: pointer;
  transition: all 0.1s ease;
  margin: 2px;
  position: relative;

  &:hover {
    transform: scale(1.01);
    z-index: 1;
    box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.1);
  }

  .list-image {
    width: 64px;
    height: 64px;
    border-radius: 10px;
    object-fit: cover;
  }

  .list-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .list-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  ${(props) =>
    props.isDark &&
    `
    color: #fff;
    
    .chip {
      background: #2b2b2b;
      color: #fff;
    }
  `}
`;

interface NFTCardProps {
  token: ListingTokenI | NFTIndexerTokenI;
  listing?: NFTIndexerListingI;
  onClick?: () => void;
  selected?: boolean;
  size?: "small" | "medium" | "large";
  imageOnly?: boolean;
  viewMode?: "grid" | "list";
}

const CartNftCard: React.FC<NFTCardProps> = ({
  imageOnly = false,
  size = "medium",
  token,
  listing,
  onClick,
  selected,
  viewMode = "grid",
}) => {
  const { activeAccount, signTransactions } = useWallet();

  const metadata = JSON.parse(token.metadata || "{}");

  const royalties = metadata?.royalties
    ? decodeRoyalties(metadata?.royalties || "")
    : null;

  console.log({ royalties });

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

  const handleCartIconClick = async (
    pool: any,
    discount: any,
    simulationResults: any
  ) => {
    console.log({ pool, discount, simulationResults });
    if (!activeAccount || !listing) {
      toast.info("Please connect wallet!");
      return;
    }
    try {
      const doWithdraw = listing.currency === 0;
      setIsBuying(true);
      // -------------------------------------
      // SIM HERE
      // -------------------------------------
      const { algodClient, indexerClient } = getAlgorandClients();

      // approve spending

      // {
      //   const ci = new CONTRACT(
      //     Number(listing?.currency),
      //     algodClient,
      //     indexerClient,
      //     abi.nt200,
      //     {
      //       addr: activeAccount.address,
      //       sk: new Uint8Array(0),
      //     }
      //   );
      //   const approveR = await ci.arc200_approve(
      //     algosdk.getApplicationAddress(pool.contractId),
      //     Number.MAX_SAFE_INTEGER
      //   );
      //   if (!approveR.success) throw new Error("approve failed");
      //   const stxn = await signTransactions(
      //     approveR.txns.map(
      //       (t: string) => new Uint8Array(Buffer.from(t, "base64"))
      //     )
      //   );
      //   await algodClient.sendRawTransaction(stxn as Uint8Array[]).do();
      // }

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
          console.log({ poolId, tokAId, tokBId });
          // -------------------------------------

          // request tokens from api

          const tokA = await fetchTokenInfo(tokAId);
          const tokB = await fetchTokenInfo(tokBId);

          const inToken = tokA?.tokenId === "0" ? tokB : tokA;
          const outToken = tokA?.tokenId !== "0" ? tokB : tokA;

          console.log({ tokA, tokB, inToken, outToken, poolId });

          const amount = new BigNumber(
            simulationResults[inToken?.contractId || 0]?.outputAmount
          )
            .dividedBy(new BigNumber(10).pow(inToken?.decimals || 0))
            .toString();

          console.log({ amount });

          const A = {
            ...inToken,
            amount,
          };
          const B = {
            ...outToken,
          };
          // figure out how much to swap
          const swapR: any = await new swap(
            poolId,
            algodClient,
            indexerClient
          ).swap(activeAccount.address, poolId, A, B, [], {
            doWithdraw,
          }); // withdraws by default

          console.log({ swapR });

          if (!swapR.success) throw new Error("swap failed");
          // const returnValue = swapR.response.txnGroups[0].txnResults
          //   .slice(-1)[0]
          //   .txnResult.logs.slice(-1)[0];

          // const selector = returnValue.slice(0, 4).toString("hex");
          // const outA = algosdk.bytesToBigInt(returnValue.slice(4, 36));
          // const outB = algosdk.bytesToBigInt(returnValue.slice(36, 68));

          // const currencyId =
          //   listing.currency === 0 ? TOKEN_WVOI : listing.currency;

          const currency = {
            contractId: 390001,
            name: "Wrapped Voi",
            symbol: "wVOI",
            decimals: 6,
            tokenId: "0",
          };

          customR = await mp.buy(activeAccount.address, listing, currency, {
            paymentTokenId:
              listing.currency === 0 ? TOKEN_WVOI : listing.currency,
            wrappedNetworkTokenId: TOKEN_WVOI,
            extraTxns: swapR.objs,
            algodClient,
            indexerClient,
            skipEnsure,
            strategy: "default",
          });
          console.log({ customR });
        } else {
          const paymentToken = {
            contractId: 390001,
            name: "Wrapped Voi",
            symbol: "wVOI",
            decimals: 6,
            tokenId: "0",
          };
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

  const url = metadata.image?.includes("ipfs://")
    ? `https://ipfs.io/ipfs/${metadata.image.split("ipfs://")[1]}`
    : !collectionsMissingImage?.includes(Number(token.contractId))
    ? `${HIGHFORGE_CDN}/i/${encodeURIComponent(token.metadataURI)}?w=400`
    : metadata.image;

  const displayName = metadata.name?.includes(".voi")
    ? metadata.name
    : (metadata.name || "").match(/[0-9]/)
    ? metadata.name
    : `${metadata.name} #${token.tokenId}`;

  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  if (viewMode === "list") {
    return (
      <>
        <ListViewWrapper isDark={isDarkTheme} onClick={onClick}>
          <img className="list-image" src={url} alt={displayName} />
          <div className="list-content">
            <div className="list-header">
              <Stack gap={0.25}>
                <CollectionName isDark={isDarkTheme} inList>
                  {displayName}
                </CollectionName>
                <CollectionVolume isDark={isDarkTheme} inList>
                  {price !== "0" ? (
                    <Stack
                      direction="row"
                      gap={0.5}
                      sx={{ alignItems: "center" }}
                    >
                      <span>
                        {`${priceNormal || price} ${
                          priceNormal ? "VOI" : currencySymbol
                        }`}
                      </span>
                      {priceNormal && currencySymbol !== "VOI" ? (
                        <Chip
                          className="chip"
                          size="small"
                          sx={{
                            background: isDarkTheme ? "#2b2b2b" : "#fff",
                            color: isDarkTheme ? "#fff" : "#161717",
                            border: isDarkTheme ? "none" : "1px solid #eaebf0",
                            height: "20px",
                            fontSize: "11px",
                            padding: "0 6px",
                          }}
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
                  height="32"
                  width="32"
                  src="/static/icon-cart.png"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleBuyButtonClick();
                  }}
                />
              ) : null}
            </div>
          </div>
        </ListViewWrapper>
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
      </>
    );
  }

  // Grid view
  return display ? (
    <>
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
          onClick={onClick}
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
                <CollectionName isDark={true}>{displayName}</CollectionName>
                <CollectionVolume isDark={true}>
                  {price !== "0" ? (
                    <Stack
                      direction="row"
                      gap={1}
                      sx={{ alignItems: "center" }}
                    >
                      <span>
                        {`${priceNormal || price} ${
                          priceNormal ? "VOI" : currencySymbol
                        }`}
                      </span>
                      {priceNormal && currencySymbol !== "VOI" ? (
                        <Chip
                          sx={{
                            background: "#fff",
                            color: "#161717",
                            border: "none",
                            fontWeight: 500,
                          }}
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
                    e.stopPropagation();
                    e.preventDefault();
                    handleBuyButtonClick();
                  }}
                />
              ) : null}
            </Stack>
          ) : null}
        </Box>
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
    </>
  ) : null;
};

export default CartNftCard;
