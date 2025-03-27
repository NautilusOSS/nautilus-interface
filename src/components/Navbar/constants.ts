export const navlinks = [
  {
    label: "Marketplace",
    type: "dropdown",
    children: [
      {
        label: "Listings",
        href: "/listing",
      },
      {
        label: "Offers",
        href: "/offers",
      },
      {
        label: "Collections",
        href: "/collection",
      },
      {
        label: "Activity",
        href: "/sales-activity",
      },
    ]
  },
  {
    label: "Launchpad",
    href: "/create-arc200",
    type: "sub"
  },
  {
    label: "NFT Drips",
    href: "/nft-drips",
    type: "sub"
  },
  {
    label: "Staking",
    href: "/staking",
    type: "sub"
  },
  {
    label: "Wrapped Voi",
    href: "/community-chest",
    type: "sub"
  },
  {
    label: 'Vibe Arcade',
    href: '/tools',
  },
] as const;


export const linkLabels: { [key: string]: string } = {
  "/listings": "Listings",
  "/collection": "Collections",
  "/analytics": "Analytics",
  "/staking": "Staking",
  "/create-arc200": "Launchpad",
  "/community-chest": "Community Chest",
};
