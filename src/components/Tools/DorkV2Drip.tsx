import React from "react";
import { UnitNftDripTool } from "./UnitNftDripTool";
import { nftDripDorkV2AppId } from "@/hooks/useNFTDrips";

const DORK_V2_DRIP_CONFIG = {
  nftContractId: 894888,
  dripContractId: nftDripDorkV2AppId,
  rewardTokenContractId: 420069,
  rewardTokenDecimals: 8,
  dripPerWeekRaw: 8e7,
  rewardSymbol: "UNIT",
  title: "Dorks V2 Drip",
  subtitle:
    "Your Dorks V2 NFTs earn UNIT over time. Approve UNIT for the drip contract, then claim when you're ready. Total transaction cost: 1 VOI per claim.",
  collectionLabel: "Dorks V2",
  emptyStateEmoji: "🤓",
};

const DorkV2Drip: React.FC = () => (
  <UnitNftDripTool config={DORK_V2_DRIP_CONFIG} />
);

export default DorkV2Drip;
