import { INDEXER_API } from "@/contants/endpoints";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export const useMarketplaceListings = (contractId: number) => {
  const data = useQuery({
    queryFn: () => {
      return axios
        .get(`${INDEXER_API}/nft-indexer/v1/mp/listings`, {
          params: {
            active: true,
            collectionId: contractId,
          },
        })
        .then(({ data: { listings } }) => listings);
    },
    queryKey: ["marketplaceListings", contractId],
  });
  return data;
};
