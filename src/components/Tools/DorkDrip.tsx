import React from "react";
import { UnitNftDripTool } from "./UnitNftDripTool";
import { nftDripDorkAppId } from "@/hooks/useNFTDrips";

const DORK_DRIP_CONFIG = {
  nftContractId: 313597,
  dripContractId: nftDripDorkAppId,
  rewardTokenContractId: 420069,
  rewardTokenDecimals: 8,
  dripPerWeekRaw: 4e8,
  rewardSymbol: "UNIT",
  title: "Dorks Drip",
  subtitle:
    "Your Dorks NFTs earn UNIT over time. Approve UNIT for the drip contract, then claim when you're ready. Total transaction cost: 1 VOI per claim.",
  collectionLabel: "Dorks",
  emptyStateEmoji: "🤓",
};

const DorkDrip: React.FC = () => (
  <UnitNftDripTool config={DORK_DRIP_CONFIG} />
);

export default DorkDrip;
