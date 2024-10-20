import { TOKEN_WVOI } from "@/contants/tokens";
import { getAlgorandClients } from "@/wallets";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@txnlab/use-wallet-react";
import { arc200 } from "ulujs";

export const useAccountInfo = () => {
  const { activeAccount } = useWallet();
  const { algodClient } = getAlgorandClients();
  const data = useQuery({
    queryFn: () => {
      if (!activeAccount) return null;
      return algodClient.accountInformation(activeAccount?.address).do();
    },
    queryKey: ["accountInfo", activeAccount?.address],
  });
  return data;
};

export const useARC72BalanceOf = (tokenId: number) => {
  const { activeAccount } = useWallet();
  const { algodClient, indexerClient } = getAlgorandClients();
  const data = useQuery({
    queryFn: () => {
      if (!activeAccount) return null;
      const ci = new arc200(TOKEN_WVOI, algodClient, indexerClient);
      const arc200_balanceOfR = ci.arc200_balanceOf(activeAccount.address);
      return arc200_balanceOfR;
    },
    queryKey: ["arc200_balanceOf", activeAccount?.address],
  });
  return data;
};