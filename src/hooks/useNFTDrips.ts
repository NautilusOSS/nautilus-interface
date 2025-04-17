import { useState, useEffect } from "react";

export interface NFTDrip {
  collectionId: number;
  collectionName: string;
  collectionSupply: number;
  paymentTokenId: number;
  dripAmount: number;
  symbol: string;
  note?: string;
  isPercentage?: boolean;
}

const DRIPS_DATA: NFTDrip[] = [
  {
    collectionId: 313597,
    collectionName: "Dorks",
    collectionSupply: 50,
    paymentTokenId: 420069,
    dripAmount: 4, // standard units
    symbol: "UNIT",
  },
  {
    collectionId: 894888,
    collectionName: "Dorks V2",
    collectionSupply: 500,
    paymentTokenId: 420069,
    dripAmount: 0.8, // standard units
    symbol: "UNIT",
  },
  {
    collectionId: 940678,
    collectionName: "GM Voiagers",
    collectionSupply: 100,
    paymentTokenId: 300279,
    dripAmount: 192, // standard units
    symbol: "GM",
  },
  {
    collectionId: 447482,
    collectionName: "PXLMOB SZN ONE",
    collectionSupply: 999,
    paymentTokenId: 410419,
    dripAmount: 70, // standard units
    symbol: "PIX",
  },
  {
    collectionId: 955685,
    collectionName: "Pixel Cups",
    collectionSupply: 1007,
    paymentTokenId: 913147,
    dripAmount: Number((74 / 1007).toFixed(6)),
    symbol: "PXD",
  },
  {
    collectionId: 8301084,
    collectionName: "GM Simpletons",
    collectionSupply: 547,
    paymentTokenId: 913147,
    dripAmount: Number((74 / 547).toFixed(6)),
    symbol: "PXD",
  },
  {
    collectionId: 3819679,
    collectionName: "Voi Bois",
    collectionSupply: 500,
    paymentTokenId: 412682,
    dripAmount: Number((2 / 3).toFixed(6)), // standard units
    symbol: "CORN",
  },
  {
    collectionId: 8392903,
    collectionName: "GN Voiagers",
    collectionSupply: 10000,
    paymentTokenId: 913147,
    dripAmount: Number((74 / 10000).toFixed(6)),
    symbol: "PXD",
  },
  {
    collectionId: 398796,
    collectionName: "AI Voiager",
    collectionSupply: 109,
    paymentTokenId: 913147,
    dripAmount: 300_000,
    symbol: "ROCKET",
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
