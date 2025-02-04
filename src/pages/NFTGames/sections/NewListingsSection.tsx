import React from 'react';
import { Grid2, Link } from '@mui/material';
import { stripTrailingZeroBytes } from '@/utils/string';
import CartNftCard from '@/components/CartNFTCard';
import { 
  SectionHeading, 
  SectionTitle, 
  SectionMoreButtonContainer, 
  SectionMoreButton, 
  SectionMoreButtonText 
} from '../components';

export default function NewListingsSection({ listings, isDarkTheme, navigate }) {
  const NEW_LISTINGS_COUNT = 5;

  return (
    <>
      <SectionHeading className="flex flex-col justify-items-start !items-start gap-2 sm:flex-row mb-8">
        <SectionTitle className={`${isDarkTheme ? "dark" : "light"} `}>
          New Listings
        </SectionTitle>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <SectionMoreButtonContainer>
            <SectionMoreButton className={isDarkTheme ? "button-dark" : "button-light"}>
              <Link to="/listing">
                <SectionMoreButtonText className={isDarkTheme ? "button-text-dark" : "button-text-light"}>
                  View All
                </SectionMoreButtonText>
              </Link>
            </SectionMoreButton>
          </SectionMoreButtonContainer>
        </Stack>
      </SectionHeading>

      <div className="items-center flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 sm:w-fit gap-4 sm:gap-2">
        {listings
          .filter((el) => 
            el.collectionId !== 421076 && 
            el.collectionId !== 447482 && 
            el.collectionId !== 425242
          )
          .slice(0, NEW_LISTINGS_COUNT)
          .map((el) => {
            const nft = {
              ...el.token,
              metadataURI: stripTrailingZeroBytes(el?.token?.metadataURI || ""),
            };
            return (
              <Grid2 key={el.transactionId}>
                <CartNftCard
                  token={nft}
                  listing={el}
                  onClick={() => {
                    navigate(`/collection/${el.token.contractId}/token/${el.token.tokenId}`);
                  }}
                />
              </Grid2>
            );
          })}
      </div>
    </>
  );
} 