import { useEffect, useState } from "react";
import { getAlgorandClients } from "@/wallets";

interface Arc200Balance {
  assetId: string;
  balance: string;
  loading: boolean;
  error: string | null;
  assetType: number; // 0 for VOI, 1 for ARC200, 2 for ASA, 3 for LPT
  decimals: number;
  availableBalance?: string;
}

interface IndexerBalanceResponse {
  "current-round": number;
  balances: Array<{
    accountId: string;
    contractId: number;
    balance: string;
    tokenId?: string;
  }>;
  "next-token": string | null;
}

interface TokenInfoResponse {
  "current-round": number;
  tokens: Array<{
    contractId: number;
    decimals: number;
    name: string;
    symbol: string;
    tokenId?: string;
  }>;
}

interface AsaBalance {
  amount: number;
  "asset-id": number;
  deleted: boolean;
  "is-frozen": boolean;
  "opted-in-at-round": number;
}

const TXN_FEE = 10000; // 0.01 VOI transaction fee

// Token info cache
const tokenInfoCache: Record<string, TokenInfoResponse["tokens"][0]> = {};

export const useBalances = (address?: string) => {
  const [balances, setBalances] = useState<Record<string, Arc200Balance>>({});

  useEffect(() => {
    const fetchTokenInfo = async (contractId: number) => {
      const cacheKey = contractId.toString();
      if (tokenInfoCache[cacheKey]) {
        return tokenInfoCache[cacheKey];
      }

      const tokenResponse = await fetch(
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/tokens?includes=all&contractId=${contractId}`
      );
      const tokenData: TokenInfoResponse = await tokenResponse.json();
      const tokenInfo = tokenData.tokens[0];

      if (tokenInfo) {
        tokenInfoCache[cacheKey] = tokenInfo;
      }

      return tokenInfo;
    };

    const fetchBalances = async () => {
      if (!address) return;

      // Initialize VOI balance with loading state
      setBalances({
        voi: {
          assetId: "voi",
          balance: "0",
          loading: true,
          error: null,
          assetType: 0,
          decimals: 6,
        },
      });

      try {
        const { algodClient, indexerClient } = getAlgorandClients();

        // Fetch VOI balance and account info
        const accountInfo = await algodClient.accountInformation(address).do();
        console.log("VOI balance:", accountInfo);

        // Calculate available balance for VOI
        const totalBalance = accountInfo.amount;
        const minBalance = accountInfo["min-balance"];
        const availableBalance = Math.max(
          0,
          totalBalance - minBalance - TXN_FEE
        );

        // Fetch ASA balances
        const accountAssets = await indexerClient
          .lookupAccountAssets(address)
          .do();
        console.log("ASA balances:", accountAssets);

        // Create a map of ASA balances by asset-id
        const asaBalancesMap: Record<string, AsaBalance> = {};
        accountAssets.assets.forEach((asset: AsaBalance) => {
          asaBalancesMap[asset["asset-id"].toString()] = asset;
        });

        // Fetch ARC200 balances from indexer
        const response = await fetch(
          `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/balances?accountId=${address}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch ARC200 balances from indexer");
        }

        const data: IndexerBalanceResponse = await response.json();

        // if wvoi is missing add it
        if (!data.balances.find((b) => b.contractId === 390001)) {
          data.balances.push({
            accountId: address,
            contractId: 390001,
            balance: "0",
            tokenId: "0",
          });
        }

        // Convert indexer balances to our format
        const arc200Balances: Record<string, Arc200Balance> = {};

        // Process each balance and determine if it's ARC200 or LPT
        for (const balance of data.balances) {
          // Get token info from cache or fetch it
          const tokenInfo = await fetchTokenInfo(balance.contractId);

          // Check if it's a Liquidity Pool Token (has comma in tokenId)
          const isLPT = balance.tokenId?.includes(",");

          if (tokenInfo?.tokenId === "0") {
            // This is VOI - use VOI balance
            arc200Balances[balance.contractId.toString()] = {
              assetId: balance.contractId.toString(),
              balance: accountInfo.amount.toString(),
              availableBalance: availableBalance.toString(),
              loading: false,
              error: null,
              assetType: 0,
              decimals: 6,
            };
          } else if (tokenInfo?.tokenId && asaBalancesMap[tokenInfo.tokenId]) {
            // This is an ASA token - use the ASA balance
            const asaBalance = asaBalancesMap[tokenInfo.tokenId];
            arc200Balances[balance.contractId.toString()] = {
              assetId: balance.contractId.toString(),
              balance: asaBalance.amount.toString(),
              loading: false,
              error: null,
              assetType: 2,
              decimals: tokenInfo.decimals || 6,
            };
          } else {
            // This is an ARC200 or LPT token
            arc200Balances[balance.contractId.toString()] = {
              assetId: balance.contractId.toString(),
              balance: balance.balance,
              loading: false,
              error: null,
              assetType: isLPT ? 3 : 1,
              decimals: tokenInfo?.decimals || 6,
            };
          }
        }

        // Merge all balances
        setBalances((prev) => ({
          voi: {
            assetId: "voi",
            balance: accountInfo.amount.toString(),
            availableBalance: availableBalance.toString(),
            loading: false,
            error: null,
            assetType: 0,
            decimals: 6,
          },
          ...arc200Balances,
        }));
      } catch (error) {
        console.error("Error fetching balances:", error);
        setBalances((prev) => ({
          voi: {
            assetId: "voi",
            balance: "0",
            availableBalance: "0",
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to fetch balances",
            assetType: 0,
            decimals: 6,
          },
        }));
      }
    };

    fetchBalances();
  }, [address]);

  return balances;
};
