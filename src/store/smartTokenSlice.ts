// reducers.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import db from "../db";
import { RootState } from "./store";
import { TokenType } from "../types";
import { ARC72_INDEXER_API } from "@/config/arc72-idx";

export interface SmartTokensState {
  tokens: TokenType[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

export const getSmartTokens = createAsyncThunk<
  TokenType[],
  void,
  { rejectValue: string; state: RootState }
>("smartTokens/getTokens", async (_, { getState, rejectWithValue }) => {
  try {
    const storedTokens = await db.table("smartTokens").toArray();
    if (storedTokens.length > 0) {
      return storedTokens;
    }
    const response = await axios.get(`${MIMIR_API}/arc200/tokens`);
    const tokens = response.data.tokens;
    await db.table("smartTokens").bulkPut(
      tokens.map((token: TokenType) => {
        return {
          pk: `${token.contractId}`,
          contractId: token.contractId,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          totalSupply: token.totalSupply,
          creator: token.creator,
          mintRound: token.mintRound,
          globalState: token.globalState,
          tokenId: token.tokenId,
          price: token.price,
        };
      })
    );
    return tokens;
  } catch (error: any) {
    console.log(error);
    return rejectWithValue(error.message);
  }
});

const initialState: SmartTokensState = {
  tokens: [],
  status: "idle",
  error: null,
};

const tokenSlice = createSlice({
  name: "tokens",
  initialState,
  reducers: {
    updateToken(state, action) {
      const { tokenId, newData } = action.payload;
      const tokenToUpdate = state.tokens.find(
        (token) => token.tokenId === tokenId
      );
      if (tokenToUpdate) {
        Object.assign(tokenToUpdate, newData);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getSmartTokens.pending, (state) => {
        state.status = "loading";
      })
      .addCase(getSmartTokens.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.tokens = [...action.payload];
      })
      .addCase(getSmartTokens.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export const { updateToken } = tokenSlice.actions;
export default tokenSlice.reducer;
