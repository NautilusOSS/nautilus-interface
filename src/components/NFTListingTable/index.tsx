import React, { useMemo, useState } from "react";
import { styled as mstyled } from "@mui/system";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import styled from "styled-components";
import { Box, Stack, Tooltip } from "@mui/material";
import {
  CollectionI,
  ListingI,
  RankingI,
  Sale,
  SaleI,
  Token,
  TokenType,
} from "../../types";
import { compactAddress } from "../../utils/mp";
import moment from "moment";
import { Link } from "react-router-dom";
import SelectorIcon from "../../static/icon/icon-selector.svg";
import UpIcon from "../../static/icon/icon-up.svg";
import DownIcon from "../../static/icon/icon-down.svg";
import InfoIcon from "@mui/icons-material/Info";
import VoiIcon from "../../static/crypto-icons/voi/0.svg";
import { HIGHFORGE_CDN } from "@/config/arc72-idx";
import { formatter } from "@/utils/number";
import { useStakingContract } from "@/hooks/staking";
import { useWallet } from "@txnlab/use-wallet-react";
import { getAlgorandClients } from "@/wallets";
import { toast } from "react-toastify";
import BigNumber from "bignumber.js";
import { mp, swap } from "ulujs";
import BuySaleModal, { multiplier } from "../modals/BuySaleModal";
import algosdk from "algosdk";
import { TOKEN_WVOI } from "@/contants/tokens";

const StyledImage = styled(Box)`
  width: 53px;
  height: 53px;
  flex-shrink: 0;
  border-radius: 8px;
  background-size: cover;
`;

const StyledTableCell = mstyled(TableCell)(({ theme }) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  return {
    borderBottom: "none",
    padding: theme.spacing(1),
    color: isDarkTheme ? "#fff" : "#000",
    alignItems: "center",
    textAlign: "center",
    justifyContent: "center",
    "& a": {
      textDecoration: "none",
      color: "inherit",
    },
  };
});

const StyledTableHeading = mstyled(StyledTableCell)(({ theme }) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  return {
    color: isDarkTheme ? "#fff" : "#000",
    textAlign: "center",
    justifyContent: "center",
    fontFamily: "Nohemi",
    fontSize: "20px",
    fontStyle: "normal",
    fontWeight: 600,
    lineHeight: "24px",
  };
});

const StyledTableRow = mstyled(TableRow)(({ theme }) => {
  return {
    borderBottom: "1px solid #3B3B3B",
  };
});

interface Props {
  listings: ListingI[];
  tokens: Token[];
  collections: CollectionI[];
  limit?: number;
  columns?: string[];
  selected?: string;
  onSelect?: (index: string) => void;
  exchangeRate?: number;
  enableSelect?: boolean;
}

interface NFTListingTableRowProps {
  listing: ListingI;
}

const NFTListingTableRow: React.FC<NFTListingTableRowProps> = ({ listing }) => {
  const token = listing.token as Token;
  const metadata = JSON.parse(token.metadata || "{}");
  const { activeAccount, signTransactions } = useWallet();
  const [isBuying, setIsBuying] = useState(false);
  const { data: stakingContractData, isLoading: loadingStakingContractData } =
    useStakingContract(listing.token?.tokenId || 0);
  const smartTokens = useSelector((state: any) => state.smartTokens.tokens);
  const [openBuyModal, setOpenBuyModal] = React.useState(false);
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
                .times(
                  new BigNumber(listing.price).minus(
                    new BigNumber(discount || 0)
                  )
                )
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

          customR = await mp.buy(
            activeAccount.address,
            listing,
            listing.currency,
            {
              paymentTokenId:
                listing.currency === 0 ? TOKEN_WVOI : listing.currency,
              wrappedNetworkTokenId: TOKEN_WVOI,
              extraTxns: swapR.objs,
              algodClient,
              indexerClient,
              skipEnsure,
            }
          );
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

  return (
    !loadingStakingContractData && (
      <>
        <StyledTableRow>
          <StyledTableCell
            style={{
              color:
                stakingContractData[0].type === "Staking" ? "orange" : "green",
            }}
          >
            {stakingContractData[0].type}
          </StyledTableCell>
          <StyledTableCell>{listing.token?.tokenId}</StyledTableCell>
          <StyledTableCell>
            {stakingContractData[0].global_period_limit > 5
              ? stakingContractData[0].global_period + 1
              : stakingContractData[0].global_period * 12}
          </StyledTableCell>
          <StyledTableCell>
            {stakingContractData[0].global_period_limit > 5
              ? stakingContractData[0].global_distribution_count
              : stakingContractData[0].global_distribution_count}
          </StyledTableCell>
          <StyledTableCell>
            {formatter.format(stakingContractData[0].global_total)} VOI
          </StyledTableCell>

          <StyledTableCell>
            {formatter.format(listing.price / 1e6)} VOI
          </StyledTableCell>
          <StyledTableCell>
            {(
              ((Number(stakingContractData[0].global_total) -
                Number(listing.price / 1e6)) /
                Number(stakingContractData[0].global_total)) *
              100
            ).toFixed(2)}
            %
          </StyledTableCell>
          <StyledTableCell>
            <Button
              variant="text"
              onClick={() => {
                setOpenBuyModal(true);
              }}
            >
              Buy
            </Button>
          </StyledTableCell>
        </StyledTableRow>
        <BuySaleModal
          token={listing.token}
          listing={listing}
          seller={listing.seller}
          open={openBuyModal}
          loading={isBuying}
          handleClose={() => setOpenBuyModal(false)}
          onSave={handleCartIconClick}
          title="Buy NFT"
          buttonText="Buy"
          image={metadata?.image || ""}
          price={(listing?.price || 0) / 10 ** 6}
          priceNormal={""}
          priceAU={listing.price.toString()}
          currency={"VOI"}
          paymentTokenId={listing.currency}
        />
      </>
    )
  );
};

const NFTListingTable: React.FC<Props> = ({
  tokens,
  collections,
  listings,
  limit = 0,
  columns = ["timestamp", "token", "image", "seller", "price"],
  selected,
  enableSelect = false,
  onSelect = (x) => {},
}) => {
  const { isDarkTheme } = useSelector((state: RootState) => state.theme);
  type SortOption =
    | "price-asc"
    | "price-dsc"
    | "timestamp-asc"
    | "timestamp-dsc"
    | "token-asc"
    | "token-dsc"
    | "seller-asc"
    | "seller-dsc";
  const [sortBy, setSortBy] = useState<SortOption>("timestamp-dsc");

  const isLoading = !listings || !collections || !tokens;

  const sortFunction = (sortBy: SortOption) => (a: ListingI, b: ListingI) => {
    if (!tokens) {
      return 0;
    }
    const tokenA =
      tokens.find(
        (token) =>
          token.tokenId === a.tokenId && token.contractId === a.collectionId
      ) || ({} as Token);
    const tokenB =
      tokens.find(
        (token) =>
          token.tokenId === b.tokenId && token.contractId === b.collectionId
      ) || ({} as Token);
    if (sortBy === "token-asc") {
      return tokenA.metadata?.name?.localeCompare(tokenB.metadata?.name);
    } else if (sortBy === "token-dsc") {
      return tokenB.metadata?.name.localeCompare(tokenA.metadata?.name);
    } else if (sortBy === "seller-asc") {
      return a.seller.localeCompare(b.seller);
    } else if (sortBy === "seller-dsc") {
      return b.seller.localeCompare(a.seller);
    } else if (sortBy === "price-asc") {
      return (a?.normalPrice || a.price) - (b?.normalPrice || b.price);
    } else if (sortBy === "price-dsc") {
      return (b?.normalPrice || b.price) - (a?.normalPrice || a.price);
    } else if (sortBy === "timestamp-asc") {
      return a.timestamp - b.timestamp;
    } else {
      return b.timestamp - a.timestamp;
    }
  };
  const sortedListings = useMemo(() => {
    return [...listings]
      .sort(sortFunction(sortBy))
      .filter((sale: ListingI) => sale.price > 0)
      .slice(0, limit > 0 ? limit : listings.length);
  }, [sortBy, listings]);
  console.log({ sortedListings });
  return !isLoading ? (
    <TableContainer>
      <Table aria-label="rankings table">
        <TableHead>
          <StyledTableRow>
            <StyledTableHeading>
              <Box>Type</Box>
            </StyledTableHeading>
            <StyledTableHeading>
              <Box>Account Id</Box>
            </StyledTableHeading>
            <StyledTableHeading>
              <Box>Lockup [Months]</Box>
            </StyledTableHeading>
            <StyledTableHeading>
              <Box>Vesting [Months]</Box>
            </StyledTableHeading>
            <StyledTableHeading>
              <Box>Total Tokens</Box>
            </StyledTableHeading>

            {/*columns.includes("timestamp") ? (
              <StyledTableHeading
                sx={{ display: { xs: "none", md: "table-cell" } }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: "center" }}
                >
                  <Box>Time</Box>
                  <img
                    src={
                      ["timestamp-asc", "timestamp-dsc"].includes(sortBy)
                        ? sortBy === "timestamp-asc"
                          ? UpIcon
                          : DownIcon
                        : SelectorIcon
                    }
                    alt="selector"
                    onClick={
                      ["timestamp-asc", "timestamp-dsc"].includes(sortBy)
                        ? sortBy === "timestamp-asc"
                          ? () => setSortBy("timestamp-dsc")
                          : () => setSortBy("timestamp-asc")
                        : () => setSortBy("timestamp-dsc")
                    }
                  />
                </Stack>
              </StyledTableHeading>
            ) : null*/}
            {columns.includes("image") ? (
              <StyledTableCell></StyledTableCell>
            ) : null}
            {columns.includes("token") ? (
              <StyledTableHeading>
                <Stack
                  sx={{ justifyContent: "center" }}
                  direction="row"
                  spacing={1}
                >
                  <Box>Token</Box>
                  <img
                    src={
                      ["token-asc", "token-dsc"].includes(sortBy)
                        ? sortBy === "token-asc"
                          ? UpIcon
                          : DownIcon
                        : SelectorIcon
                    }
                    onClick={() => {
                      setSortBy(
                        ["token-asc", "token-dsc"].includes(sortBy)
                          ? sortBy === "token-asc"
                            ? "token-dsc"
                            : "token-asc"
                          : "token-dsc"
                      );
                    }}
                    alt="selector"
                  />
                </Stack>
              </StyledTableHeading>
            ) : null}
            {columns.includes("seller") ? (
              <StyledTableHeading>
                <Stack
                  sx={{ justifyContent: "center" }}
                  direction="row"
                  spacing={1}
                >
                  <Box>Seller</Box>
                  <img
                    src={
                      ["seller-asc", "seller-dsc"].includes(sortBy)
                        ? sortBy === "seller-asc"
                          ? UpIcon
                          : DownIcon
                        : SelectorIcon
                    }
                    onClick={() => {
                      setSortBy(
                        ["seller-asc", "seller-dsc"].includes(sortBy)
                          ? sortBy === "seller-asc"
                            ? "seller-dsc"
                            : "seller-asc"
                          : "seller-dsc"
                      );
                    }}
                    alt="selector"
                  />
                </Stack>
              </StyledTableHeading>
            ) : null}
            <StyledTableHeading>
              <Stack
                sx={{
                  justifyContent: "center",
                  color: isDarkTheme ? "#fff" : "#000",
                }}
                direction="row"
                spacing={1}
              >
                <Box>Price</Box>
                <img
                  src={
                    ["price-asc", "price-dsc"].includes(sortBy)
                      ? sortBy === "price-asc"
                        ? UpIcon
                        : DownIcon
                      : SelectorIcon
                  }
                  alt="selector"
                  onClick={() => {
                    setSortBy(
                      ["price-asc", "price-dsc"].includes(sortBy)
                        ? sortBy === "price-asc"
                          ? "price-dsc"
                          : "price-asc"
                        : "price-dsc"
                    );
                  }}
                />
              </Stack>
            </StyledTableHeading>
            {columns.includes("discount") ? (
              <StyledTableHeading>
                <Stack
                  sx={{ justifyContent: "center" }}
                  direction="row"
                  spacing={1}
                >
                  <Box>Discount</Box>
                  <img
                    src={
                      ["seller-asc", "seller-dsc"].includes(sortBy)
                        ? sortBy === "seller-asc"
                          ? UpIcon
                          : DownIcon
                        : SelectorIcon
                    }
                    onClick={() => {
                      setSortBy(
                        ["seller-asc", "seller-dsc"].includes(sortBy)
                          ? sortBy === "seller-asc"
                            ? "seller-dsc"
                            : "seller-asc"
                          : "seller-dsc"
                      );
                    }}
                    alt="selector"
                  />
                </Stack>
              </StyledTableHeading>
            ) : null}
            <StyledTableHeading
              sx={{ display: { xs: "none", md: "table-cell" } }}
            >
              <Box>Actions</Box>
            </StyledTableHeading>
          </StyledTableRow>
        </TableHead>
        <TableBody>
          {sortedListings.map((listing, index) => {
            const token = listing.token as Token;
            const collection: CollectionI =
              collections.find(
                (collection) => collection.contractId === listing.collectionId
              ) || ({} as CollectionI);
            const pk = `${listing.mpContractId}-${listing.mpListingId}`;
            if (!token || !collection) return null;
            return (
              <>
                <NFTListingTableRow listing={listing} />
                {false && (
                  <StyledTableRow
                    onClick={() => {
                      if (enableSelect) {
                        onSelect(
                          `${listing.mpContractId}-${listing.mpListingId}`
                        );
                      }
                    }}
                    selected={enableSelect && selected === pk}
                    hover={true}
                    key={index}
                  >
                    <StyledTableCell>
                      <Box>Staking</Box>
                    </StyledTableCell>
                    <StyledTableCell>
                      <Box>{listing.token?.tokenId}</Box>
                    </StyledTableCell>
                    <StyledTableCell>
                      <Box>12</Box>
                    </StyledTableCell>
                    <StyledTableCell>
                      <Box>12</Box>
                    </StyledTableCell>
                    {/*columns.includes("timestamp") ? (
                  <StyledTableCell
                    sx={{ display: { xs: "none", md: "table-cell" } }}
                  >
                    {moment.unix(listing.createTimestamp).fromNow()}
                  </StyledTableCell>
                ) : null*/}
                    {/*columns.includes("image") ? (
                  <StyledTableCell>
                    <Link
                      to={`/collection/${collection.contractId}/token/${token.tokenId}`}
                    >
                      <StyledImage
                        sx={{
                          backgroundImage: `url(${HIGHFORGE_CDN}/i/${token.metadataURI}?w=240)`,
                        }}
                      />
                    </Link>
                  </StyledTableCell>
                ) : null*/}
                    {/*columns.includes("token") ? (
                  <StyledTableCell>
                    <Link
                      to={`/collection/${collection.contractId}/token/${token.tokenId}`}
                    >
                      {token.metadata?.name}
                    </Link>
                  </StyledTableCell>
                ) : null*/}
                    {/*columns.includes("seller") ? (
                  <StyledTableCell>
                    <Link to={`/account/${listing.seller}`}>
                      {compactAddress(listing.seller)}
                    </Link>
                  </StyledTableCell>
                ) : null*/}
                    {columns.includes("price") ? (
                      <StyledTableCell>
                        {formatter.format(listing.price / 1e6)} VOI
                      </StyledTableCell>
                    ) : null}
                    {columns.includes("price") ? (
                      <StyledTableCell>
                        {formatter.format(listing.price / 1e6)} VOI
                      </StyledTableCell>
                    ) : null}

                    {columns.includes("discount") ? (
                      <StyledTableCell>1%</StyledTableCell>
                    ) : null}
                  </StyledTableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  ) : null;
};

export default NFTListingTable;
