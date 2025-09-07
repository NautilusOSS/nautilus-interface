import React, { useEffect, useMemo, useRef } from "react";
import Layout from "../../layouts/Default";
import { Container, Grid, Skeleton, Stack } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/store";
import axios from "axios";
import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "react-toastify";
import { CONTRACT, arc72 } from "ulujs";
import { getAlgorandClients } from "../../wallets";
import NFTTabs from "../../components/NFTTabs";
import { NFTInfo } from "../../components/NFTInfo";
import { getPrices } from "../../store/dexSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { CTCINFO_LP_WVOI_VOI } from "../../contants/dex";
import { decodeRoyalties } from "../../utils/hf";
import { getListings } from "../../store/listingSlice";
import { getTokens } from "../../store/tokenSlice";
import { getSales } from "../../store/saleSlice";
import { getSmartTokens } from "../../store/smartTokenSlice";
import {
  ARC72_INDEXER_API,
  HIGHFORGE_API,
  MIMIR_API,
} from "../../config/arc72-idx";
import { useWallet } from "@txnlab/use-wallet-react";
import { useName } from "@/hooks/useName";

const TokenSkeleton: React.FC = () => (
  <Container sx={{ mt: 5 }} maxWidth="lg">
    <Grid
      sx={{
        border: "1px",
        alignItems: "center",
      }}
      container
      spacing="60px"
    >
      <Grid item xs={12} md={6}>
        <Skeleton
          variant="rounded"
          height={459}
          width={459}
          sx={{
            maxWidth: "100%",
            maxHeight: "100%",
            borderRadius: "16px",
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Stack gap={2}>
          <Skeleton variant="text" height={24} width={100} />
          <Skeleton variant="text" height={24} width={75} />
          <Skeleton variant="text" height={24} width={150} />
          <Skeleton variant="text" height={24} width={25} />
          <Skeleton variant="text" height={24} width={150} />
        </Stack>
      </Grid>
      <Grid item xs={12}>
        <Skeleton variant="text" height={48} width={200} />
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map(() => (
            <Grid item xs={6} sm={4} md={3}>
              <Skeleton
                variant="rounded"
                height={400}
                width="100%"
                sx={{
                  borderRadius: "16px",
                }}
              />
            </Grid>
          ))}
        </Grid>
      </Grid>
    </Grid>
  </Container>
);

export const Token: React.FC = () => {
  const { activeAccount } = useWallet();

  const dispatch = useDispatch();
  /* Sales */
  const sales = useSelector((state: any) => state.sales.sales);
  const salesStatus = useSelector((state: any) => state.sales.status);
  useEffect(() => {
    dispatch(getSales() as unknown as UnknownAction);
  }, [dispatch]);
  /* Tokens */
  const tokens = useSelector((state: any) => state.tokens.tokens);
  const tokenStatus = useSelector((state: any) => state.tokens.status);
  useEffect(() => {
    dispatch(getTokens() as unknown as UnknownAction);
  }, [dispatch]);
  /* Smart Tokens */
  const smartTokens = useSelector((state: any) => state.smartTokens.tokens);
  const smartTokenStatus = useSelector(
    (state: any) => state.smartTokens.status
  );
  useEffect(() => {
    dispatch(getSmartTokens() as unknown as UnknownAction);
  }, [dispatch]);

  /* Listings */
  /*
  const listings = useSelector((state: any) => state.listings.listings);
  const listingsStatus = useSelector((state: any) => state.listings.status);
  useEffect(() => {
    dispatch(getListings() as unknown as UnknownAction);
  }, [dispatch]);
  */
  const listings: any[] = [];
  const listingsStatus = "succeeded";

  /* Dex */
  const prices = useSelector((state: RootState) => state.dex.prices);
  const dexStatus = useSelector((state: RootState) => state.dex.status);
  useEffect(() => {
    dispatch(getPrices() as unknown as UnknownAction);
  }, [dispatch]);
  const exchangeRate = useMemo(() => {
    if (!prices || dexStatus !== "succeeded") return 0;
    const voiPrice = prices.find((p) => p.contractId === CTCINFO_LP_WVOI_VOI);
    if (!voiPrice) return 0;
    return voiPrice.rate;
  }, [prices, dexStatus]);
  /* Router */
  const { id, tid } = useParams();
  const navigate = useNavigate();
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

  /* Carousel */
  const listingsRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = React.useState<number>(0);
  const handleClick = () => {
    const width = listingsRef?.current?.children?.length || 0;
    if (-(offset - 500) > width * 250) {
      setOffset(0);
    } else {
      setOffset(offset - 500);
    }
  };

  const collection = useMemo(() => {
    const collectionTokens =
      tokens?.filter((t: any) => `${t.contractId}` === `${id}`) || [];
    return collectionTokens;
  }, [tokens, id]);

  const collectionListings = useMemo(() => {
    return listings?.filter((l: any) => `${l.collectionId}` === `${id}`) || [];
  }, [listings, id]);

  const [collectionInfo, setCollectionInfo] = React.useState<any>(null);
  useEffect(() => {
    try {
      axios
        .get(`${HIGHFORGE_API}/projects/info/${id}`)
        .then((res: any) => res.data)
        .then(setCollectionInfo);
    } catch (e) {
      console.log(e);
    }
  }, [id]);
  console.log({ collectionInfo });

  //const { fetchName } = useName(activeAccount?.address);

  const [nft, setNft] = React.useState<any>(null);
  useEffect(() => {
    if (
      !collection ||
      //!collectionInfo ||
      !tid ||
      !collectionListings ||
      !listings
    )
      return;
    (async () => {
      const {
        data: {
          tokens: [nftData],
        },
      } = await axios.get(
        `${MIMIR_API}/nft-indexer/v1/tokens?contractId=${id}&tokenId=${tid}`
      );
      // TODO handle missing data

      const metadata = JSON.parse(nftData.metadata || "{}");

      if (!nftData) throw new Error("NFT not found");

      const { algodClient, indexerClient } = getAlgorandClients();
      const ciARC72 = new arc72(Number(id), algodClient, indexerClient, {
        acc: {
          addr: "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
          sk: new Uint8Array(0),
        },
      });
      const arc72_ownerOfR = await ciARC72.arc72_ownerOf(Number(tid));
      const arc72_getApprovedR = await ciARC72.arc72_getApproved(Number(tid));
      if (!arc72_ownerOfR.success) throw new Error("Failed to get owner");
      if (!arc72_getApprovedR.success)
        throw new Error("Failed to get approved");
      const arc72_ownerOf = arc72_ownerOfR.returnValue;
      const arc72_getApproved = arc72_getApprovedR.returnValue;

      const nft = collection.find((el: any) => el.tokenId === Number(tid));

      const listing = [...collectionListings]
        .filter(
          (l: any) =>
            `${l.collectionId}` === `${id}` &&
            `${l.tokenId}` === `${tid}` &&
            `${l.seller}` === `${arc72_ownerOf}`
        )
        .sort((a: any, b: any) => b.timestamp - a.timestamp)
        .pop();

      // check listing
      let validListing = true;
      if (listing) {
        const ci = new CONTRACT(
          listing.mpContractId,
          algodClient,
          indexerClient,
          {
            name: "",
            desc: "",
            methods: [
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
          {
            addr:
              activeAccount?.address ||
              "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
            sk: new Uint8Array(0),
          }
        );
        const v_sale_listingByIndexR = await ci.v_sale_listingByIndex(
          listing.mpListingId
        );
        if (!v_sale_listingByIndexR.success) {
          validListing = false;
        }
      }
      const royalties = nft?.metadata?.royalties
        ? decodeRoyalties(nft?.metadata?.royalties || "")
        : {};

      //const ownerName = await fetchName(arc72_ownerOf);
      let ownerName = "a";

      const displayNft = {
        ...nftData,
        metadata,
        royalties,
        approved: arc72_getApproved,
        owner: arc72_ownerOf,
        ownerName,
        listing: validListing ? listing : undefined,
      };
      setNft(displayNft);
    })().catch((e) => {
      console.log(e);
      toast.error(e.message);
    });
  }, [id, tid]);
  console.log({ nft });

  const [tokenName, setTokenName] = React.useState<string | null>(null);
  useEffect(() => {
    console.log({ tid });
    if ([797609].includes(Number(id))) {
      axios
        .get(`https://api.envoi.sh/api/token/${tid}`)
        .then(({ data }) => {
          if (data.results.length > 0) {
            const result = data.results[0];
            setTokenName(result.name);
          }
        })
        .catch((e) => {
          console.log(e);
        });
    }
  }, [id, tid]);

  /* NFT Navigator Listings */

  const [listings2, setListings] = React.useState<any>([]);
  React.useEffect(() => {
    if (!id) return;
    try {
      axios
        .get(`${MIMIR_API}/nft-indexer/v1/mp/listings`, {
          params: {
            active: true,
            collectionId: id,
          },
        })
        .then(({ data }) => {
          setListings(data.listings);
        });
    } catch (e) {
      console.log(e);
    }
  }, [id]);

  const listedNfts = useMemo(() => {
    const listedNfts =
      collection
        ?.filter((nft: any) => {
          return listings?.some(
            (listing: any) =>
              `${listing.collectionId}` === `${nft.contractId}` &&
              `${listing.tokenId}` === `${nft.tokenId}`
          );
        })
        ?.map((nft: any) => {
          const listing = listings.find(
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
      (a: any, b: any) => b.listing.timestamp - a.listing.timestamp
    );
    return listedNfts;
  }, [collection, listings]);

  // const moreNfts = useMemo(() => {
  //   if (!nft) return [];
  //   return listedNfts?.filter((el: any) => el.tokenId !== nft.tokenId);
  // }, [nft, listedNfts]);

  const isLoading = React.useMemo(
    () =>
      salesStatus !== "succeeded" ||
      tokenStatus !== "succeeded" ||
      listingsStatus !== "succeeded" ||
      dexStatus !== "succeeded" ||
      !sales ||
      !prices ||
      !nft ||
      !listings ||
      !tokens ||
      !collection,
    [nft, listings, tokens, collection]
  );

  return (
    <Layout>
      {!isLoading ? (
        <Container sx={{ pt: 5 }} maxWidth="xl">
          <Stack style={{ gap: "64px" }}>
            <NFTInfo
              tokenName={tokenName || undefined}
              collectionName={nft?.collectionName}
              nft={nft}
              collection={collection}
              collectionInfo={collectionInfo}
              loading={isLoading}
              exchangeRate={exchangeRate}
            />
          </Stack>
        </Container>
      ) : (
        <TokenSkeleton />
      )}
    </Layout>
  );
};
