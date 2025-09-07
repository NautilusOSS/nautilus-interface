import { MIMIR_API } from "@/config/arc72-idx";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export const useMarketplaceListings = (contractId: number) => {
  const query = useQuery({
    queryFn: () => {
      return axios
        .get(`${MIMIR_API}/nft-indexer/v1/mp/listings`, {
          params: {
            active: true,
            collectionId: contractId,
          },
        })
        .then(({ data: { listings } }) => {
          return listings.map((listing: any) => {
            return listing;
          });
        });
    },
    queryKey: ["marketplaceListings", contractId],
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  return {
    ...query,
    refetch: query.refetch,
  };
};
