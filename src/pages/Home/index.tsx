import React, { useEffect, useMemo, useState } from "react";
import Layout from "../../layouts/Default";
import { Box, Grid, Skeleton } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/store";
import styled from "styled-components";
import NFTSaleActivityTable from "../../components/NFTSaleActivityTable";
import RankingList from "../../components/RankingList";
import { Stack } from "@mui/material";
import { getTokens } from "../../store/tokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { getCollections } from "../../store/collectionSlice";
import { ListedToken, ListingI, NFTIndexerListingI, TokenI } from "../../types";
import { getSales } from "../../store/saleSlice";
import Marquee from "react-fast-marquee";
import CartNftCard from "../../components/CartNFTCard";
import { getPrices } from "../../store/dexSlice";
import { CTCINFO_LP_WVOI_VOI } from "../../contants/dex";
import { getListings } from "../../store/listingSlice";
import { getRankings } from "../../utils/mp";
import { getSmartTokens } from "../../store/smartTokenSlice";
import Grid2 from "@mui/material/Unstable_Grid2"; // Grid version 2
import LazyLoad from "react-lazy-load";
import axios from "axios";
import { stripTrailingZeroBytes } from "@/utils/string";

const ActivityFilterContainer = styled.div`
  display: flex;
  align-items: flex-start;
  align-content: flex-start;
  gap: 10px var(--Main-System-10px, 10px);
  align-self: stretch;
  flex-wrap: wrap;
  @media (max-width: 768px) {
    display: none;
  }
`;

const Button = styled.div`
  cursor: pointer;
`;

const Filter = styled(Button)`
  display: flex;
  padding: 6px 12px;
  justify-content: center;
  align-items: center;
  gap: var(--Main-System-10px, 10px);
  border-radius: 100px;
  border: 1px solid #717579;
`;

const ActiveFilter = styled(Filter)`
  border-color: #93f;
  background: rgba(153, 51, 255, 0.2);
`;

const FilterLabel = styled.div`
  color: #717579;
  font-feature-settings: "clig" off, "liga" off;
  font-family: Inter;
  font-size: 15px;
  font-style: normal;
  font-weight: 500;
  line-height: normal;
`;

const ActiveFilterLabel = styled(FilterLabel)`
  color: #93f;
`;

const SectionHeading = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 45px;
  & h2.dark {
    color: #fff;
  }
  & h2.light {
    color: #93f;
  }
`;

const SectionTitle = styled.h2`
  /*color: #93f;*/
  text-align: center;
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: Nohemi;
  font-size: 36px;
  font-style: normal;
  font-weight: 700;
  line-height: 100%; /* 40px */
  @media (min-width: 620px) {
    font-size: 40px;
  }
`;

const SectionButtonContainer = styled(Box)`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  & a {
    text-decoration: none;
  }
  & button.button-dark {
    border: 1px solid #fff;
  }

  & div.button-text-dark {
    color: #fff;
  }
  & button.button-light {
    border: 1px solid #93f;
  }
  & div.button-text-light {
    color: #93f;
  }
`;

const SectionMoreButtonContainer = styled(SectionButtonContainer)`
  & button.button-light::after {
    background: url("/arrow-narrow-up-right-light.svg") no-repeat;
  }
  & button.button-dark::after {
    background: url("/arrow-narrow-up-right-dark.svg") no-repeat;
  }
`;

const SectionButton = styled.button`
  /* Layout */
  display: flex;
  padding: 12px 20px;
  justify-content: center;
  align-items: center;
  gap: 6px;
  /* Style */
  border-radius: 100px;
  /* Shadow/XSM */
  box-shadow: 0px 1px 2px 0px rgba(16, 24, 40, 0.04);
  /* Style/Extra */
  background-color: transparent;
`;
const SectionMoreButton = styled(SectionButton)`
  &::after {
    content: "";
    width: 20px;
    height: 20px;
    position: relative;
    display: inline-block;
  }
`;

const SectionMoreButtonText = styled.div`
  font-family: "Inter", sans-serif;
  font-size: 15px;
  font-style: normal;
  font-weight: 600;
  line-height: 22px;
  letter-spacing: 0.1px;
  cursor: pointer;
`;

const SectionBanners = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 45px;
`;

const pageSize = 12;

export const Home: React.FC = () => {
  /* Collection Info */
  // const [collectionInfo, setCollectionInfo] = React.useState<any>(null);
  // useEffect(() => {
  //   try {
  //     axios
  //       .get(`https://prod-voi.api.highforge.io/projects`)
  //       .then((res: any) => res.data.results)
  //       .then(setCollectionInfo);
  //   } catch (e) {
  //     console.log(e);
  //   }
  // }, []);
  // console.log({ collectionInfo });

  const [showing, setShowing] = useState<number>(pageSize);

  /* Activity */
  const [activeFilter, setActiveFilter] = useState<string[]>(["all"]);
  const handleFilterClick = (value: string) => {
    if (value === "all") return setActiveFilter(["all"]);
    if (activeFilter.length === 1 && activeFilter.includes("all"))
      return setActiveFilter([value]);
    if (activeFilter.includes(value)) {
      const newActiveFilter = activeFilter.filter((filter) => filter !== value);
      if (newActiveFilter.length === 0) return setActiveFilter(["all"]);
      setActiveFilter(activeFilter.filter((filter) => filter !== value));
    } else {
      setActiveFilter([...activeFilter, value]);
    }
  };

  /* Dispatch */
  const dispatch = useDispatch();

  /* Smart Tokens */
  const smartTokens = useSelector((state: any) => state.smartTokens.tokens);
  const smartTokenStatus = useSelector(
    (state: any) => state.smartTokens.status
  );
  useEffect(() => {
    if (smartTokenStatus === "succeeded") return;
    dispatch(getSmartTokens() as unknown as UnknownAction);
  }, []);

  /* Listings */
  const listings = useSelector((state: any) => state.listings.listings);
  const listingsStatus = useSelector((state: any) => state.listings.status);
  useEffect(() => {
    if (listingsStatus === "succeeded") return;
    dispatch(getListings() as unknown as UnknownAction);
  }, []);

  /* Theme */
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  /* Tokens */
  // const tokens = useSelector((state: any) => state.tokens.tokens);
  // const tokenStatus = useSelector((state: any) => state.tokens.status);
  // useEffect(() => {
  //   dispatch(getTokens() as unknown as UnknownAction);
  // }, [dispatch]);
  /* Sales */
  // const sales = useSelector((state: any) => state.sales.sales);
  // const salesStatus = useSelector((state: any) => state.sales.status);
  // useEffect(() => {
  //   dispatch(getSales() as unknown as UnknownAction);
  // }, [dispatch]);
  /* Collections */
  // const collections = useSelector(
  //   (state: any) => state.collections.collections
  // );
  // const collectionStatus = useSelector(
  //   (state: any) => state.collections.status
  // );
  // useEffect(() => {
  //   dispatch(getCollections() as unknown as UnknownAction);
  // }, [dispatch]);

  /* Rankings */
  // const rankings: any = useMemo(() => {
  //   if (
  //     !tokens ||
  //     !sales ||
  //     !listings ||
  //     tokenStatus !== "succeeded" ||
  //     salesStatus !== "succeeded" ||
  //     collectionStatus !== "succeeded"
  //   )
  //     return null;
  //   return getRankings(tokens, collections, sales, listings, 1, smartTokens);
  // }, [sales, tokens, collections, listings]);

  const navigate = useNavigate();

  const isLoading = !listings || !smartTokens || listingsStatus !== "succeeded";

  return (
    <Layout>
      {!isLoading ? (
        <div>
          <SectionHeading className="flex flex-col justify-items-start !items-start gap-2 sm:flex-row  mb-4 sm:mb-0">
            <SectionTitle className={`${isDarkTheme ? "dark" : "light"} `}>
              New Listings
            </SectionTitle>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <SectionMoreButtonContainer>
                <SectionMoreButton
                  className={isDarkTheme ? "button-dark" : "button-light"}
                >
                  <Link to="/listing">
                    <SectionMoreButtonText
                      className={
                        isDarkTheme ? "button-text-dark" : "button-text-light"
                      }
                    >
                      View All
                    </SectionMoreButtonText>
                  </Link>
                </SectionMoreButton>
              </SectionMoreButtonContainer>
            </Stack>
          </SectionHeading>
          {listings ? (
            <>
              <div className=" items-center flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 x sm:w-fit gap-4 sm:gap-2">
                {listings.slice(0, showing).map((el: NFTIndexerListingI) => {
                  const nft = {
                    ...el.token,
                    metadataURI: stripTrailingZeroBytes(
                      el?.token?.metadataURI || ""
                    ),
                  };
                  return (
                    <Grid2 key={el.transactionId}>
                      <CartNftCard
                        token={nft}
                        listing={el}
                        onClick={() => {
                          navigate(
                            `/collection/${el.token.contractId}/token/${el.token.tokenId}`
                          );
                        }}
                      />
                    </Grid2>
                  );
                })}
                <Grid2>
                  <SectionButtonContainer
                    sx={{ height: "305px", width: "305px" }}
                  >
                    <SectionButton
                      onClick={() => setShowing(showing + pageSize * 2)}
                      className={isDarkTheme ? "button-dark" : "button-light"}
                    >
                      <SectionMoreButtonText
                        className={
                          isDarkTheme ? "button-text-dark" : "button-text-light"
                        }
                      >
                        View More
                      </SectionMoreButtonText>
                    </SectionButton>
                  </SectionButtonContainer>
                </Grid2>
              </div>
              {/*
                <SectionButtonContainer sx={{ mt: 5 }}>
                  <SectionButton
                    onClick={() => setShowing(showing + pageSize * 2)}
                    className={isDarkTheme ? "button-dark" : "button-light"}
                  >
                    <SectionMoreButtonText
                      className={
                        isDarkTheme ? "button-text-dark" : "button-text-light"
                      }
                    >
                      View More
                    </SectionMoreButtonText>
                  </SectionButton>
                </SectionButtonContainer>
                    */}
            </>
          ) : (
            <div>"No NFTs available for sale."</div>
          )}

          {/* Top Collections */}
          {/*true ? (
            <>
              <SectionHeading>
                <SectionTitle className={isDarkTheme ? "dark" : "light"}>
                  Top Collections
                </SectionTitle>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ alignItems: "center" }}
                >
                  <SectionMoreButtonContainer>
                    <SectionMoreButton
                      className={isDarkTheme ? "button-dark" : "button-light"}
                    >
                      <Link to="/collection">
                        <SectionMoreButtonText
                          className={
                            isDarkTheme
                              ? "button-text-dark"
                              : "button-text-light"
                          }
                        >
                          View All
                        </SectionMoreButtonText>
                      </Link>
                    </SectionMoreButton>
                  </SectionMoreButtonContainer>
                </Stack>
              </SectionHeading>
              {rankings ? (
                <RankingList
                  rankings={rankings}
                  selectedOption="all"
                  collectionInfo={collectionInfo}
                />
              ) : (
                "Loading..."
              )}
            </>
              ) : null*/}
          {/* Activity */}
          {/*true ? (
            <>
              <SectionHeading>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ alignItems: "center" }}
                >
                  <SectionTitle className={isDarkTheme ? "dark" : "light"}>
                    Activity
                  </SectionTitle>
                  {<ActivityFilterContainer>
                    {[
                      {
                        label: "All",
                        value: "all",
                      },
                      {
                        label: "Listing",
                        value: "listing",
                      },
                      {
                        label: "Sale",
                        value: "sale",
                      },
                    ].map((filter) => {
                      if (activeFilter.includes(filter.value)) {
                        return (
                          <ActiveFilter
                            onClick={() => handleFilterClick(filter.value)}
                          >
                            <ActiveFilterLabel>
                              {filter.label}
                            </ActiveFilterLabel>
                          </ActiveFilter>
                        );
                      }
                      return (
                        <Filter onClick={() => handleFilterClick(filter.value)}>
                          <FilterLabel>{filter.label}</FilterLabel>
                        </Filter>
                      );
                    })}
                  </ActivityFilterContainer>}
                </Stack>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ alignItems: "center" }}
                >
                  {<SectionMoreButtonContainer>
                    <SectionMoreButton
                      className={isDarkTheme ? "button-dark" : "button-light"}
                    >
                      <Link to="/activity">
                        <SectionMoreButtonText
                          className={
                            isDarkTheme
                              ? "button-text-dark"
                              : "button-text-light"
                          }
                        >
                          View All
                        </SectionMoreButtonText>
                      </Link>
                    </SectionMoreButton>
                        </SectionMoreButtonContainer>}
                </Stack>
              </SectionHeading>
              {
                <NFTSaleActivityTable
                  sales={sales}
                  tokens={tokens}
                  collections={collections}
                  listings={listings}
                  activeFilter={activeFilter}
                  limit={10}
                />
              }
            </>
            ) : null*/}
          {/* Banners */}
          {false ? (
            <>
              <SectionBanners>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Link to="https://nftnavigator.xyz/" target="_blank">
                      <img
                        style={{
                          width: "100%",
                          cursor: "pointer",
                          borderRadius: 10,
                        }}
                        src="/img/banner-nft-navigator.png"
                        alt="VOI NFT Navigator Banner"
                      />
                    </Link>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Link to="https://highforge.io/" target="_blank">
                      <img
                        style={{
                          width: "100%",
                          cursor: "pointer",
                          borderRadius: 10,
                        }}
                        src="/img/banner-high-forge.png"
                        alt="High Forge Banner"
                      />
                    </Link>
                  </Grid>
                </Grid>
              </SectionBanners>
            </>
          ) : null}
        </div>
      ) : (
        <div>
          <SectionHeading>
            <Skeleton variant="rounded" width={240} height={40} />
            <Skeleton variant="rounded" width={120} height={40} />
          </SectionHeading>
          <Grid container spacing={2} sx={{ mt: 5 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Grid item xs={6} sm={4} md={3}>
                <Skeleton
                  sx={{ borderRadius: 10 }}
                  variant="rounded"
                  width="100%"
                  height={469}
                />
              </Grid>
            ))}
          </Grid>
          <Grid container spacing={2} sx={{ mt: 5 }}>
            <Grid item xs={12} sm={6}>
              <Skeleton variant="rounded" width="100%" height={240} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Skeleton variant="rounded" width="100%" height={240} />
            </Grid>
          </Grid>
        </div>
      )}
    </Layout>
  );
};
