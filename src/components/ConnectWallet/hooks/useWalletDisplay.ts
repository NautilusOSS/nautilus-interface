import { useState, useEffect, useMemo, useCallback } from "react";
import { useWallet } from "@txnlab/use-wallet-react";
import { useName } from "@/hooks/useName";
import { useEnvoiResolver } from "@/hooks/useEnvoiResolver";
import { compactAddress } from "@/utils/mp";
import { stripTrailingZeroBytes } from "@/utils/string";
import {
  namehash,
  uint8ArrayToBigInt,
} from "@/utils/namehash";

export const useWalletDisplay = () => {
  const { activeAccount } = useWallet();
  const { fetchName } = useName();
  const { resolver } = useEnvoiResolver();

  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState(
    compactAddress(activeAccount?.address || "")
  );
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  // Memoize the display name calculation
  const calculatedDisplayName = useMemo(() => {
    if (!activeAccount) return "";
    return compactAddress(activeAccount.address);
  }, [activeAccount]);

  // Memoize the expanded width calculation
  const expandedWidth = useMemo(() => {
    return (displayName?.length || 0) * 10 + 48;
  }, [displayName]);

  // Memoize the avatar display logic
  const avatarDisplay = useMemo(() => {
    if (tokenInfo?.metadata?.avatar) {
      return { type: 'image' as const, src: tokenInfo.metadata.avatar };
    }
    return { type: 'text' as const, text: displayName ? displayName[0] : "" };
  }, [tokenInfo, displayName]);

  // Fetch name and token info
  const fetchWalletInfo = useCallback(async () => {
    if (!activeAccount || !resolver) return;

    setLoading(true);
    try {
      const name = await fetchName(activeAccount.address);
      const nameStr = stripTrailingZeroBytes(name);
      
      if (nameStr !== compactAddress(activeAccount.address)) {
        const hash = await namehash(name);
        const tokenId = uint8ArrayToBigInt(hash);
        const tokenInfoResult = await resolver.http.getTokenInfo(tokenId.toString());
        
        if (tokenInfoResult.length > 0) {
          const [token] = tokenInfoResult;
          setTokenInfo(token);
          setDisplayName(token.name);
        }
      } else {
        setDisplayName(nameStr);
        setTokenInfo(null);
      }
    } catch (error) {
      console.error("Error fetching wallet info:", error);
      setDisplayName(calculatedDisplayName);
    } finally {
      setLoading(false);
    }
  }, [activeAccount, resolver, fetchName, calculatedDisplayName]);

  useEffect(() => {
    fetchWalletInfo();
  }, [fetchWalletInfo]);

  return {
    loading,
    displayName,
    tokenInfo,
    expandedWidth,
    avatarDisplay,
    refetch: fetchWalletInfo,
  };
}; 