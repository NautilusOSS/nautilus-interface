import { ARC72_INDEXER_API, NFT_NAVIGATOR_API } from "@/config/arc72-idx";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export const useMarketplaceListings = (contractId: number) => {
  const data = useQuery({
    queryFn: () => {
      return axios
        .get(`${ARC72_INDEXER_API}/nft-indexer/v1/mp/listings`, {
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
  });
  return data;
};
