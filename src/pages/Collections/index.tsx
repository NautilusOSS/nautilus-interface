import React, { useEffect, useMemo } from "react";
import Layout from "../../layouts/Default";
import { Container, Grid, Stack, Typography } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/store";
import axios from "axios";
import styled from "styled-components";
import { getTokens } from "../../store/tokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { getCollections } from "../../store/collectionSlice";
import { getSales } from "../../store/saleSlice";
import { getRankings } from "../../utils/mp";
import NFTCollectionTable from "../../components/NFTCollectionTable";
import { getPrices } from "../../store/dexSlice";
import { CTCINFO_LP_WVOI_VOI } from "../../contants/dex";
import { ARC72_INDEXER_API } from "../../config/arc72-idx";
import { getSmartTokens } from "../../store/smartTokenSlice";
import {
  useCollectionInfo,
  useCollections,
  useListings,
  usePrices,
  useSales,
  useSmartTokens,
  useTokens,
} from "@/components/Navbar/hooks/collections";
import { GridLoader } from "react-spinners";

const SectionHeading = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding-top: 45px;
  gap: 10px;
  & h2.dark {
    color: #fff;
  }
  & h2.light {
    color: #93f;
  }
`;

const SectionDescription = styled.div`
  flex: 1 0 0;
  color: #93f;
  font-family: "Advent Pro";
  font-size: 20px;
  font-style: normal;
  font-weight: 500;
  line-height: 24px; /* 120% */
  letter-spacing: 0.2px;
`;

const SectionTitle = styled.h2`
  /*color: #93f;*/
  text-align: center;
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: Nohemi;
  font-size: 40px;
  font-style: normal;
  font-weight: 700;
  line-height: 100%; /* 40px */
`;

const ExternalLinks = styled.ul`
  & li {
    margin-top: 10px;
  }
`;

const StyledLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const Collections: React.FC = () => {
  // !Replaced data fetching and state management with react-query hooks
  const { data: collectionInfo } = useCollectionInfo();

  /* Dex */

  // !Replaced data fetching and state management with react-query hooks
  const { data: prices, status: dexStatus } = usePrices();

  const exchangeRate = useMemo(() => {
    if (!prices || dexStatus !== "success") return 0;
    const voiPrice = prices.find((p) => p.contractId === CTCINFO_LP_WVOI_VOI);
    if (!voiPrice) return 0;
    return voiPrice.rate;
  }, [prices, dexStatus]);

  /* Tokens */
  // !Replaced data fetching and state management with react-query hooks
  const { data: tokens, status: tokenStatus ,error:tokenError} = useTokens();

  /* Collections */
  // !Replaced data fetching and state management with react-query hooks
  const { data: collections, status: collectionStatus } = useCollections();

  /* Sales */

  // !Replaced data fetching and state management with react-query hooks
  const { data: sales, status: salesStatus } = useSales();

  /* Smart Tokens */

  // !Replaced data fetching and state management with react-query hooks
  const { data: smartTokens, status: smartTokenStatus } = useSmartTokens();

  /* Theme */
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  /* NFT Navigator Listings */
  // !Replaced data fetching and state management with react-query hooks
  const { data: listings, status: listingsStatus } = useListings();




  const rankings: any = useMemo(() => {
    if (
      !tokens ||
      !sales ||
      !listings ||
      tokenStatus !== "success" ||
      salesStatus !== "success" ||
      collectionStatus !== "success"
    )
      return new Map();
    return getRankings(tokens, collections, sales, listings, 1, smartTokens);
  }, [sales, tokens, collections, listings]);

  const isLoading = useMemo(
    () =>
      !listings ||
      !rankings ||
      tokenStatus !== "success" ||
      collectionStatus !== "success" ||
      salesStatus !== "success",
    [tokens, listings, rankings, tokenStatus, collectionStatus, salesStatus]
  );

  if (!isLoading) {
    return (
      <Layout>
        <Container maxWidth="xl">
          <SectionHeading>
            <SectionTitle className={isDarkTheme ? "dark" : "light"}>
              Collections
            </SectionTitle>
            <SectionDescription>
              // {rankings?.length} results
            </SectionDescription>
          </SectionHeading>
          <NFTCollectionTable
            rankings={rankings}
            collectionInfo={collectionInfo}
          />
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="xl">
        <SectionHeading>
          <SectionTitle className={isDarkTheme ? "dark" : "light"}>
            Collections
          </SectionTitle>
          {/* <SectionDescription>// {rankings?.length} results</SectionDescription> */}
        </SectionHeading>
        <div className="w-full h-[max(70vh,20rem)]  flex items-center justify-center">
          <GridLoader
            size={30}
            color={isDarkTheme ? "#fff" : "#000"}
            className="sm:!hidden !text-primary "
          />
          <GridLoader
            size={50}
            color={isDarkTheme ? "#fff" : "#000"}
            className="!hidden sm:!block !text-primary "
          />
        </div>
      </Container>
    </Layout>
  );
};
