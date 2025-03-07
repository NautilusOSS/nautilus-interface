export const navlinks = [
  {
    label: "Listings",
    href: "/listing",
  },
  {
    label: "Stats",
    href: "#",
    children: [
      {
        label: "Collections",
        href: "/collection",
      },
      {
        label: "Sales Activity",
        href: "/sales-activity",
      },
    ],
  },
  {
    label: "Staking",
    href: "/staking",
  },
  {
    label: "Launchpad",
    href: "/create-arc200",
  },
  {
    label: "Community Chest",
    href: "/community-chest",
  },
  {
    label: "Earn",
    href: "/earn",
  },
  {
    label: "Tokens",
    href: "/tokens",
  },
];

export const linkLabels: { [key: string]: string } = {
  "/listings": "Listings",
  "/collection": "Collections",
  "/analytics": "Analytics",
  "/staking": "Staking",
  "/create-arc200": "Launchpad",
  "/community-chest": "Community Chest",
};
