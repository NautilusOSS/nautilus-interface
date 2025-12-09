import { ARC72_INDEXER_API } from "@/config/arc72-idx";
import { SCS_API } from "@/contants/endpoints";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  addRewardEstimates,
  prefetchStakingContract,
  useStakingContract,
  transformAppData,
} from "./staking";

interface UseOwnedARC72TokenOpts {
  includeStaking?: boolean;
}
export const useOwnedARC72Token = (
  owner: string,
  contractId: number,
  opts: UseOwnedARC72TokenOpts
) => {
  const data = useQuery({
    queryFn: () => {
      return axios
        .get(`${ARC72_INDEXER_API}/nft-indexer/v1/tokens`, {
          params: {
            owner,
            contractId,
          },
        })
        .then(async ({ data }) => {
          if (opts?.includeStaking) {
            return Promise.all(
              data.tokens.map(async (token: any) => {
                try {
                  const response = await axios.get(`${SCS_API}/app/${token.tokenId}`);
                  const appData = response.data;
                  
                  // Get creator from appInfo or try to find it from accounts endpoint
                  let creator = appData.appInfo?.creator;
                  if (!creator) {
                    try {
                      const accountResponse = await axios.get(`${SCS_API}/account/${appData.address}`);
                      creator = accountResponse.data.creator;
                    } catch (e) {
                      console.warn("Could not fetch creator from account endpoint", e);
                    }
                  }
                  
                  const account = transformAppData(
                    {
                      id: appData.id,
                      address: appData.address,
                      globalState: appData.appInfo?.globalState || [],
                    },
                    creator || ""
                  );
                  
                  const stakingData = addRewardEstimates([account])[0];
                  
                  return {
                    ...token,
                    staking: stakingData || null,
                  };
                } catch (e) {
                  console.warn(`Failed to fetch staking data for token ${token.tokenId}`, e);
                  return {
                    ...token,
                    staking: null,
                  };
                }
              })
            );
          }
          return data.tokens;
        });
    },
    queryKey: ["arc72Tokens", owner, contractId, JSON.stringify(opts)],
    staleTime: opts?.includeStaking ? 5 * 60 * 1000 : undefined, // 5 minutes
  });
  return data;
};
