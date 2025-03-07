// reducers.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import db from "../db";
import { RootState } from "./store";
import { ListingI, NFTIndexerListingI } from "../types";
import { ARC72_INDEXER_API } from "../config/arc72-idx";
import { stripTrailingZeroBytes } from "@/utils/string";

export interface ListingsState {
  listings: ListingI[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const blacklistContracts: number[] = [];

export const getListings = createAsyncThunk<
  NFTIndexerListingI[],
  void,
  { rejectValue: string; state: RootState }
>("listings/getListings", async (_, { getState, rejectWithValue }) => {
  try {
    const lastRound = 0;
    const response = await axios.get(
      `https://arc72-voi-mainnet.nftnavigator.xyz/nft-indexer/v1/mp/listings`,
      {
        params: {
          active: true,
        },
      }
    );
    const response2 = await axios.get(
      `${ARC72_INDEXER_API}/nft-indexer/v1/mp/listings`,
      {
        params: {
          active: true,
          collectionId: "421076",
        },
      }
    );

    const listings = [
      ...response.data.listings,
      ...response2.data.listings,
    ].filter(
      (listing: NFTIndexerListingI) =>
        listing.createRound > lastRound &&
        !blacklistContracts.includes(listing.collectionId)
    );
    await db.table("listings").bulkPut(
      listings.map((listing: NFTIndexerListingI) => {
        return {
          pk: `${listing.mpContractId}-${listing.mpListingId}`,
          mpContractId: listing.mpContractId,
          mpListingId: listing.mpListingId,
          tokenId: listing.tokenId,
          seller: listing.seller,
          currency: listing.currency,
          price: listing.price,
          round: listing.createRound,
          timestamp: listing.createTimestamp,
          collectionId: listing.collectionId,
          endTimestamp: listing.endTimestamp,
          royalty: listing.royalty,
        } as ListingI;
      })
    );
    await db.table("tokens").bulkPut(
      listings.map((listing: NFTIndexerListingI) => {
        return {
          pk: `${listing.token.contractId}-${listing.token.tokenId}`,
          owner: listing.token.owner,
          approved: listing.token.approved,
          tokenId: listing.token.tokenId,
          contractId: listing.token.contractId,
          mintRound: listing.token.mintRound,
          metadataURI: listing?.token?.metadataURI || "",
          metadata: listing.token?.metadata,
        };
      })
    );
    return [...listings]
      .reverse()
      .map((listing: any) => listing) as NFTIndexerListingI[];
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

const initialState: ListingsState = {
  listings: [],
  status: "idle",
  error: null,
};

const listingSlice = createSlice({
  name: "listings",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getListings.pending, (state) => {
        state.status = "loading";
      })
      .addCase(getListings.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.listings = [...action.payload];
      })
      .addCase(getListings.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export default listingSlice.reducer;
