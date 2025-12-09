import { AIRDROP_FUNDING } from "@/contants/staking";
import { ListingI } from "@/types";
import algosdk from "algosdk";
import { CONTRACT } from "ulujs";

export const computeListingDiscount = (listing: ListingI) => {
  if (!listing) return 0;
  return (
    ((Number(listing.staking.global_total) - Number(listing.price)) /
      Number(listing.staking.global_total)) *
    100
  ).toFixed(2);
};

export const getStakingUnlockTime = (stakingContract: any) => {
  const funding = stakingContract?.global_funding || stakingContract?.funding || AIRDROP_FUNDING;
  return (
    funding +
    getStakingLockupTime(stakingContract) +
    getStakingVestingTime(stakingContract)
  );
};

export const getStakingTotalTokens = (stakingContract: any) => {
  const total = Number(stakingContract?.global_total || 0);
  const initial = Number(stakingContract?.global_initial || 0);
  return total > initial ? total / 1e6 : initial / 1e6;
};

export const getStakingVestingTime = (stakingContract: any) => {
  const distributionCount = stakingContract?.global_distribution_count || 0;
  const distributionSeconds = stakingContract?.global_distribution_seconds || 0;
  return distributionCount * distributionSeconds;
};

export const getStakingLockupTime = (stakingContract: any) => {
  const lockupDelay = stakingContract?.global_lockup_delay || 0;
  const period = stakingContract?.global_period || 0;
  const vestingDelay = stakingContract?.global_vesting_delay || 0;
  const periodSeconds = stakingContract?.global_period_seconds || 0;
  return (lockupDelay * period + vestingDelay) * periodSeconds;
};

export const getStakingWithdrawableAmount = async (
  algodClient: any,
  apid: number,
  owner: string
) => {
  const { amount, ["min-balance"]: minBalance } = await algodClient
    .accountInformation(algosdk.getApplicationAddress(apid))
    .do();
  const availableBalance = amount - Number(minBalance);
  const ci = new CONTRACT(
    apid,
    algodClient,
    undefined,
    {
      name: "AirdropClient",
      methods: [
        {
          name: "withdraw",
          args: [
            {
              type: "uint64",
              name: "amount",
            },
          ],
          readonly: false,
          returns: {
            type: "uint64",
          },
          desc: "Withdraw funds from contract.",
        },
      ],
      events: [],
    },
    {
      addr: owner,
      sk: new Uint8Array(0),
    }
  );
  ci.setFee(3000);
  const withdrawR = await ci.withdraw(0);
  if (!withdrawR.success) {
    throw new Error("withdraw failed in simulate");
  }
  const withdraw = withdrawR.returnValue;
  const withdrawableBalance = BigInt(availableBalance) - BigInt(withdraw);
  return withdrawableBalance;
};
