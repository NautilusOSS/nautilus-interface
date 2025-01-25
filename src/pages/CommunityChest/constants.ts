import React from 'react';

export interface ContractOption {
  id: number;
  name: string;
  description: string;
  iconPath?: string;
  title?: string;
}

export const CONTRACT_OPTIONS: ContractOption[] = [
  {
    id: 664258,
    name: "Community Chest VOI (CCV)",
    description: "The original Community Chest token with weekly rewards and holder distributions",
    iconPath: "M3 21h18v-6H3v6zm2-4h2v2H5v-2zm4 0h8v2H9v-2zm10 0h2v2h-2v-2zM3 11h18V5H3v6zm2-4h2v2H5V7zm4 0h8v2H9V7zm10 0h2v2h-2V7z",
    title: "Community Chest VOI"
  },
  {
    id: 770561,
    name: "Fountain VOI (FV)",
    description: "Earn extra rewards by supporting the Voi Fountain project",
    iconPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z",
    title: "Fountain VOI"
  },
  {
    id: 913147,
    name: "NFT VOI (NFV)",
    description: "Weekly NFT prizes for holders",
    iconPath: "M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z",
    title: "NFT VOI"
  },
  {
    id: 390001,
    name: "Wrapped VOI (wVOI)",
    description: "The standard wrapped VOI token for DeFi applications",
    iconPath: "M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z",
    title: "Wrapped VOI"
  },
  {
    id: 828295,
    name: "En VOI (EV)",
    description: "Support the enVoi Naming Service",
    iconPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2v2h-2zm1-10c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z",
    title: "En VOI"
  },
  {
    id: 888305,
    name: "Womp VOI (WV)",
    description: "Support the WompCrew project",
    iconPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9c.83 0 1.5-.67 1.5-1.5S7.83 8 7 8s-1.5.67-1.5 1.5S6.17 11 7 11zm3-4c.83 0 1.5-.67 1.5-1.5S10.83 4 10 4s-1.5.67-1.5 1.5S9.17 7 10 7zm5 0c.83 0 1.5-.67 1.5-1.5S15.83 4 15 4s-1.5.67-1.5 1.5S14.17 7 15 7zm3 4c.83 0 1.5-.67 1.5-1.5S18.83 8 18 8s-1.5.67-1.5 1.5S17.17 11 18 11z",
    title: "Womp VOI"
  }
];

export const getContractInfo = (contractId: number): ContractOption => {
  return CONTRACT_OPTIONS.find((opt) => opt.id === contractId) || CONTRACT_OPTIONS[0];
};

export const getContractDescription = (contractId: number, isDarkTheme: boolean): string => {
  const contract = getContractInfo(contractId);
  
  switch (contractId) {
    case 664258:
      return "The Community Chest is a decentralized rewards pool that distributes weekly rewards to holders. Stake your VOI to earn a share of block rewards and participate in weekly draws.";
    case 770561:
      return "Fountain VOI represents staked VOI in the Voi Fountain project. Holders receive bonus rewards based on their stake amount, with a 1% bonus for every 100 VOI staked.";
    case 913147:
      return "NFT VOI combines staking rewards with weekly NFT prizes. Hold NFV to earn rewards and get entered into weekly NFT draws featuring unique digital collectibles.";
    default:
      return contract.description;
  }
}; 