// reducers.ts
import axios from "axios";
import db from "../db";
import { NFTIndexerTokenI, Token } from "../types";
import { decodeRoyalties } from "../utils/hf";
import { MIMIR_API } from "../config/arc72-idx";

export const getToken = async (contractId: number, tokenId: number) => {
  const token = await db.table("tokens").get(`${contractId}-${tokenId}`);
  if (token) return token;
  const response = await axios.get(
    `${MIMIR_API}/nft-indexer/v1/tokens/${contractId}/${tokenId}`
  );
  const newToken = response.data;
  await db.table("tokens").put({
    pk: `${newToken.contractId}-${newToken.tokenId}`,
    owner: newToken.owner,
    approved: newToken.approved,
    tokenId: newToken.tokenId,
    contractId: newToken.contractId,
    mintRound: newToken["mint-round"],
    metadataURI: newToken?.metadataURI || "",
    metadata: newToken?.metadata,
  });
  return newToken;
};

export const getTokens = async () => {
  try {
    const tokenTable = db.table("tokens");
    const tokens = await tokenTable.toArray();
    const lastRound =
      tokens?.length > 0
        ? Math.max(...tokens.map((token) => token.mintRound))
        : 0;
    const response = await axios.get(`${MIMIR_API}/nft-indexer/v1/tokens`, {
      params: {
        "mint-min-round": lastRound,
      },
    });

    const newTokens = response?.data?.tokens.filter(
      (token: NFTIndexerTokenI) => token["mint-round"] > lastRound
    );
    await db.table("tokens").bulkPut(
      newTokens?.map((token: NFTIndexerTokenI) => {
        return {
          pk: `${token.contractId}-${token.tokenId}`,
          owner: token.owner,
          approved: token.approved,
          tokenId: token.tokenId,
          contractId: token.contractId,
          mintRound: token["mint-round"],
          metadataURI: token?.metadataURI || "",
          metadata: token?.metadata,
        };
      })
    );
    return [...tokens, ...newTokens]?.map((token: any) => {
      const metadata = JSON.parse(token?.metadata || "{}");
      const royalties = metadata?.royalties
        ? decodeRoyalties(metadata?.royalties || "")
        : null;
      return {
        ...token,
        metadata: JSON.parse(token?.metadata || "{}"),
        royalties,
      };
    }) as Token[];
  } catch (error: any) {
    return console.error(error.message);
  }
};
