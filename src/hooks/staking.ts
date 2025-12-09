import { INDEXER_API, SCS_API } from "@/contants/endpoints";
import { AIRDROP_FUNDING } from "@/contants/staking";
import { stakingRewards } from "@/static/staking/staking";
import { getStakingWithdrawableAmount } from "@/utils/staking";
import { getAlgorandClients } from "@/wallets";
import { useQuery, QueryClient } from "@tanstack/react-query";
import algosdk from "algosdk";
import axios from "axios";

const { algodClient } = getAlgorandClients();
const queryClient = new QueryClient();

// Transform globalState array to expected format
const transformGlobalState = (globalState: any[]) => {
  const transformed: any = {};
  
  if (!globalState || !Array.isArray(globalState)) {
    return transformed;
  }

  globalState.forEach((entry) => {
    const key = entry.key;
    const value = entry.value;
    
    // Map keys to expected format
    switch (key) {
      case "owner":
        transformed.global_owner = value;
        break;
      case "total":
        transformed.global_total = typeof value === "string" ? value : String(value);
        break;
      case "initial":
        transformed.global_initial = typeof value === "string" ? value : String(value);
        break;
      case "funding":
        transformed.global_funding = typeof value === "string" ? Number(value) : value;
        break;
      case "lockup_delay":
        transformed.global_lockup_delay = typeof value === "string" ? Number(value) : value;
        break;
      case "vesting_delay":
        transformed.global_vesting_delay = typeof value === "string" ? Number(value) : value;
        break;
      case "period":
        transformed.global_period = typeof value === "string" ? Number(value) : value;
        break;
      case "period_limit":
        transformed.global_period_limit = typeof value === "string" ? Number(value) : value;
        break;
      case "period_seconds":
        transformed.global_period_seconds = typeof value === "string" ? Number(value) : value;
        break;
      case "distribution_count":
        transformed.global_distribution_count = typeof value === "string" ? Number(value) : value;
        break;
      case "distribution_seconds":
        transformed.global_distribution_seconds = typeof value === "string" ? Number(value) : value;
        break;
      case "delegate":
        transformed.global_delegate = value;
        break;
      default:
        // Store other keys as-is with global_ prefix
        transformed[`global_${key}`] = value;
    }
  });

  return transformed;
};

// Transform app data from new API format to expected format
export const transformAppData = (app: any, creator: string) => {
  const globalState = transformGlobalState(app.globalState || []);
  
  return {
    contractId: Number(app.id),
    address: app.address,
    contractAddress: app.address, // Alias for backward compatibility
    creator,
    ...globalState,
  };
};

export const addRewardEstimates = (accounts: any[]) => {
  return accounts.map((account) => {
    const reward = stakingRewards.find(
      (reward) => `${reward.contractId}` === `${account.contractId}`
    );
    const isStaking = account.global_period_limit > 5;
    const global_funding = account?.global_funding || AIRDROP_FUNDING;
    const global_unlock =
      global_funding +
      (account.global_lockup_delay * account.global_period +
        account.global_vesting_delay) *
        account.global_period_seconds +
      account.global_distribution_count * account.global_distribution_seconds;
    return {
      ...account,
      type: isStaking ? "Staking" : "Airdrop",
      // global_initial:
      //   reward?.initial ||
      //   account.global_initial ||
      //   account?.global_initial ||
      //   0,
      // global_total: reward?.total || account?.global_total || 0,
      global_funding,
      global_unlock,
    };
  });
};

interface useOwnedStakingContractOpts {
  includeRewards?: boolean;
  includeWithdrawable?: boolean;
}

export const useOwnedStakingContract = (
  owner: string | undefined,
  opts?: useOwnedStakingContractOpts
) => {
  const data = useQuery({
    queryFn: async () => {
      if (!owner) return [];
      
      const response = await axios.get(`${SCS_API}/apps/query`, {
        params: {
          key: "owner",
          value: owner,
        },
      });
      
      // Transform the response to match expected format
      const accounts = response.data.results.map((result: any) => 
        transformAppData(result.app, result.creator)
      );
      
      let transformedAccounts = addRewardEstimates(accounts);
      
      // Fetch account information to get part_vote_lst and calculate expires
      transformedAccounts = await Promise.all(
        transformedAccounts.map(async (account) => {
          try {
            const appAddress = algosdk.getApplicationAddress(account.contractId);
            const accInfo = await algodClient.accountInformation(appAddress).do();
            
            // Extract part_vote_lst from participation data
            const part_vote_lst = accInfo?.participation?.["vote-last-valid"] || 0;
            
            // Calculate expires value (same as part_vote_lst for sorting/comparison)
            const expires = part_vote_lst;
            
            let result = {
              ...account,
              part_vote_lst: Number(part_vote_lst),
              expires: Number(expires),
            };
            
            // If includeWithdrawable is true, also fetch withdrawable amounts
            if (opts?.includeWithdrawable) {
              const withdrawable = await getStakingWithdrawableAmount(
                algodClient,
                account.contractId,
                account.global_owner
              );
              result = {
                ...result,
                value: accInfo.amount,
                withdrawable: withdrawable.toString(),
                unlockTime:
                  account.global_funding +
                  (account.global_lockup_delay +
                    account.global_vesting_delay * account.global_period) *
                    account.global_period_seconds +
                  account.global_distribution_count *
                    account.global_distribution_seconds,
              };
            }
            
            return result;
          } catch (e) {
            console.warn(`Failed to fetch account info for contract ${account.contractId}`, e);
            return {
              ...account,
              part_vote_lst: 0,
              expires: 0,
            };
          }
        })
      );
      
      return transformedAccounts;
    },
    queryKey: ["stakingAccount", owner, opts],
    enabled: !!owner,
  });
  return data;
};

interface useStakingContractOpts {
  includeRewards?: boolean;
  includeWithdrawable?: boolean;
}
export const useStakingContract = (
  contractId: string,
  opts?: useStakingContractOpts
) => {
  return useQuery({
    queryKey: ["stakingAccount", contractId, opts],
    queryFn: async () => {
      const response = await axios.get(`${SCS_API}/app/${contractId}`);
      const appData = response.data;
      
      // Get creator from appInfo or try to find it from accounts endpoint
      let creator = appData.appInfo?.creator;
      if (!creator) {
        // Fallback: try to get from account endpoint if we have the address
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

      const transformedAccount = addRewardEstimates([account])[0];

      // Fetch account information to get part_vote_lst and calculate expires
      try {
        const appAddress = algosdk.getApplicationAddress(transformedAccount.contractId);
        const accInfo = await algodClient.accountInformation(appAddress).do();
        
        // Extract part_vote_lst from participation data
        const part_vote_lst = accInfo?.participation?.["vote-last-valid"] || 0;
        
        // Calculate expires value (same as part_vote_lst for sorting/comparison)
        const expires = part_vote_lst;
        
        let result = {
          ...transformedAccount,
          part_vote_lst: Number(part_vote_lst),
          expires: Number(expires),
        };
        
        if (opts?.includeWithdrawable) {
          const withdrawable = await getStakingWithdrawableAmount(
            algodClient,
            Number(contractId),
            transformedAccount.global_owner
          );
          result = {
            ...result,
            value: accInfo.amount,
            withdrawable: withdrawable.toString(),
            unlockTime:
              transformedAccount.global_funding +
              (transformedAccount.global_lockup_delay +
                transformedAccount.global_vesting_delay * transformedAccount.global_period) *
                transformedAccount.global_period_seconds +
              transformedAccount.global_distribution_count *
                transformedAccount.global_distribution_seconds,
          };
        }
        
        return result;
      } catch (e) {
        console.warn(`Failed to fetch account info for contract ${contractId}`, e);
        return {
          ...transformedAccount,
          part_vote_lst: 0,
          expires: 0,
        };
      }
    },
    enabled: !!contractId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Function to prefetch data
export const prefetchStakingContract = async (
  contractId: number,
  opts?: useStakingContractOpts
) => {
  await queryClient.prefetchQuery({
    queryKey: ["stakingAccount", contractId, opts],
    queryFn: async () => {
      const response = await axios.get(`${SCS_API}/app/${contractId}`);
      const appData = response.data;
      
      // Get creator from appInfo or try to find it from accounts endpoint
      let creator = appData.appInfo?.creator;
      if (!creator) {
        // Fallback: try to get from account endpoint if we have the address
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

      const transformedAccount = addRewardEstimates([account])[0];

      // Fetch account information to get part_vote_lst and calculate expires
      try {
        const appAddress = algosdk.getApplicationAddress(transformedAccount.contractId);
        const accInfo = await algodClient.accountInformation(appAddress).do();
        
        // Extract part_vote_lst from participation data
        const part_vote_lst = accInfo?.participation?.["vote-last-valid"] || 0;
        
        // Calculate expires value (same as part_vote_lst for sorting/comparison)
        const expires = part_vote_lst;
        
        let result = {
          ...transformedAccount,
          part_vote_lst: Number(part_vote_lst),
          expires: Number(expires),
        };
        
        if (opts?.includeWithdrawable) {
          const withdrawable = await getStakingWithdrawableAmount(
            algodClient,
            contractId,
            transformedAccount.global_owner
          );
          result = {
            ...result,
            withdrawable: withdrawable.toString(),
          };
        }
        
        return result;
      } catch (e) {
        console.warn(`Failed to fetch account info for contract ${contractId}`, e);
        return {
          ...transformedAccount,
          part_vote_lst: 0,
          expires: 0,
        };
      }
    },
  });
};
