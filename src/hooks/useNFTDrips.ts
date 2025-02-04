import { useState, useEffect } from "react";

export interface NFTDrip {
  collectionId: number;
  paymentTokenId: number;
  dripAmount: number;
  symbol: string;
}

const DRIPS_DATA: NFTDrip[] = [
  {
    collectionId: 313597,
    paymentTokenId: 420069,
    dripAmount: 4, // standard units
    symbol: "UNIT",
  },
  {
    collectionId: 940678,
    paymentTokenId: 300279,
    dripAmount: 192, // standard units
    symbol: "GM",
  },
];

export const useNFTDrips = () => {
  const [drips, setDrips] = useState<NFTDrip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDrips = async () => {
      try {
        setLoading(true);
        setDrips(DRIPS_DATA);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch NFT drips"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDrips();
  }, []);

  return {
    drips,
    loading,
    error,
  };
};
