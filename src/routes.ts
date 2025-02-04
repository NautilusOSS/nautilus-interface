import * as Page from "./pages";
export const routes = [
  {
    path: "/",
    Component: Page.Home,
  },
  {
    path: "/collection",
    Component: Page.Collections,
  },
  {
    path: "/collection/:id",
    Component: Page.Collection,
  },
  {
    path: "/collection/:id/token/:tid",
    Component: Page.Token,
  },
  {
    path: "/account/:id",
    Component: Page.Account,
  },
  /*
  {
    path: "/activity",
    Component: Page.Activity,
  },
  */
  {
    path: "/create-arc200",
    Component: Page.CreateARC200,
  },
  {
    path: "/staking",
    Component: Page.Staking,
  },
  {
    path: "/listing",
    Component: Page.Listings,
  },
  {
    path: "/sandbox",
    Component: Page.Sandbox,
  },
  {
    path: "/nft-games",
    Component: Page.NFTGames,
  },
];
