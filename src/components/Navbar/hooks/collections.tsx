import { ARC72_INDEXER_API } from "@/config/arc72-idx";
import { getCollections } from "@/getters/collectionSlice";
import { getPrices } from "@/getters/dexSlice";
import { getSales } from "@/getters/saleSlice";
import { getSmartTokens } from "@/getters/smartTokenSlice";
import { getTokens } from "@/getters/tokenSlice";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export const usePrices = () => {
  const data = useQuery({
    queryFn: () => {
      return getPrices();
    },
    queryKey: ["collection-prices"],
    staleTime: 60 * 1000 * 2,
  });
  return data;
};

export const useTokens = () => {
  const data = useQuery({
    queryFn: () => {
      return getTokens();
    },
    queryKey: ["collection-tokens"],
    staleTime: 60 * 1000 * 2,
  });
  return data;
};

export const useCollections = () => {
  const data = useQuery({
    queryFn: () => {
      return getCollections();
    },
    queryKey: ["collection-collections"],
    staleTime: 60 * 1000 * 2,
  });
  return data;
};
export const useSales = () => {
  const data = useQuery({
    queryFn: () => {
      return getSales();
    },
    queryKey: ["collection-sales"],
    staleTime: 60 * 1000 * 2,
  });
  return data;
};
export const useSmartTokens = () => {
  const data = useQuery({
    queryFn: () => {
      return getSmartTokens();
    },
    queryKey: ["collection-smart-tokens"],
    staleTime: 60 * 1000 * 2,
  });
  return data;
};

/* 
    Useffect Replacements
 */
export const useCollectionInfo = () => {
  const data = useQuery({
    queryFn: () => {
      return axios
        .get(`https://prod-voi.api.highforge.io/projects`)
        .then((res: any) => res.data.results);
    },
    queryKey: ["collection-collection-info"],
    staleTime: 60 * 1000 * 2,
  });
  return data;
};
export const useListings = (options?: { seller?: string[] }) => {
  const data = useQuery({
    queryFn: () => {
      return axios
        .get(`${ARC72_INDEXER_API}/nft-indexer/v1/mp/listings`, {
          params: {
            active: true,
            ...(options ?? {}),
          },
        })
        .then((res) => res?.data?.listings);
    },
    queryKey: ["collection-listings", JSON.stringify(options ?? {})],
    staleTime: 60 * 1000 * 2,
  });
  return data;
};
