import React, { useEffect, useState } from "react";
import styled from "styled-components";
import algosdk from "algosdk";
import { useWallet } from "@txnlab/use-wallet-react";
import { toast } from "react-toastify";
import { MIMIR_API } from "@/config/arc72-idx";
import { getAlgorandClients } from "@/wallets";
import { CONTRACT, abi } from "ulujs";

/** PXLMOB SZN ONE: PIX token (ARC200) for approvals. */
const PIX_TOKEN_CONTRACT_ID = 410419;
/** PXLMOB SZN ONE NFT collection. */
const PXLMOB_NFT_CONTRACT_ID = 447482;
const MAX_SELECT = 6;
const INDEXER_URL = `${MIMIR_API}/nft-indexer/v1/tokens`;
const PAGE_SIZE = 12;

/** Drip contract app ID (shared multi-collection drip). */
const DRIP_CONTRACT_ID = 48567463;

/** Drip accrual: 70e6 (raw PIX) per week, capped by availableClaimAmount. */
const ONE_WEEK_SECONDS = 7 * 24 * 3600;
const PIX_DRIP_PER_WEEK = 70e6;

export interface NftDripInfo {
  collectionId: number;
  tokenId: string;
  lastDripTimestamp: number;
  claimAmount: number;
  maxClaimAmount: number;
  availableClaimAmount: number;
  claimableAmount: number;
}

/** Safely convert contract return value (bigint/number) to number. */
function toNum(v: unknown): number {
  if (v === undefined || v === null) return 0;
  if (typeof v === "bigint") return Number(v);
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function computeClaimableAmount(
  lastDripTimestamp: number,
  availableClaimAmount: number
): number {
  if (availableClaimAmount <= 0) return 0;
  if (lastDripTimestamp <= 0) {
    return availableClaimAmount;
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  const elapsed = Math.max(0, nowSeconds - lastDripTimestamp);
  const accrued = (elapsed / ONE_WEEK_SECONDS) * PIX_DRIP_PER_WEEK;
  const amountDivisible = Math.floor(accrued / PIX_DRIP_PER_WEEK) * PIX_DRIP_PER_WEEK;
  return Math.min(amountDivisible, availableClaimAmount);
}

interface TokenMetadata {
  name?: string;
  description?: string;
  image?: string;
  properties?: Record<string, string>;
}

interface IndexerToken {
  owner: string;
  tokenId: string;
  contractId: number;
  metadata: string;
  isBurned: boolean;
}

interface ParsedToken {
  tokenId: string;
  contractId: number;
  name: string;
  image: string;
  metadata?: TokenMetadata;
}

async function getNftDripInfoFromContract(
  nftContractId: number,
  tokenId: string,
  owner: string
): Promise<NftDripInfo | null> {
  if (!DRIP_CONTRACT_ID) return null;

  const tryDrip = async (readonly: boolean): Promise<NftDripInfo | null> => {
    const { algodClient, indexerClient } = getAlgorandClients();
    const CONTRACT_CI = new CONTRACT(
      DRIP_CONTRACT_ID,
      algodClient,
      indexerClient,
      {
        name: "drip",
        desc: "drip",
        methods: [
          {
            name: "drip",
            args: [
              { type: "uint64", name: "collection_id" },
              { type: "uint256", name: "token_id" },
            ],
            readonly,
            returns: { type: "(uint64,uint256,uint64,uint256,uint256)" },
          },
        ],
        events: [],
      },
      { addr: owner, sk: new Uint8Array(0) }
    );
    const result = await CONTRACT_CI.drip(Number(nftContractId), Number(tokenId));
    if (!result.success) {
      console.warn("[PxlMobSznOneDrip] drip() returned success=false", { nftContractId, tokenId, result });
      return null;
    }
    const rv = result.returnValue;
    if (rv === undefined || rv === null) {
      console.warn("[PxlMobSznOneDrip] missing returnValue", result);
      return null;
    }
    const r = rv as Record<number, unknown>;
    const claimAmount = toNum(r[3]);
    const maxClaimAmount = toNum(r[4]);
    const lastDripTimestamp = toNum(r[2]);
    const availableClaimAmount = Math.max(0, maxClaimAmount - claimAmount);
    const claimableAmount = computeClaimableAmount(lastDripTimestamp, availableClaimAmount);
    return {
      collectionId: toNum(r[0]),
      tokenId: r[1] != null ? String(r[1]) : tokenId,
      lastDripTimestamp,
      claimAmount,
      maxClaimAmount,
      availableClaimAmount,
      claimableAmount,
    };
  };

  try {
    const info = await tryDrip(true);
    if (info !== null) return info;
    return await tryDrip(false);
  } catch (e) {
    console.error("[PxlMobSznOneDrip] getNftDripInfoFromContract error:", e);
    return null;
  }
}

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
`;

const Card = styled.div`
  background: var(--background-secondary);
  border-radius: 20px;
  padding: 2.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #7c3aed 0%, #5b21b6 50%, #4c1d95 100%);
    opacity: 0.9;
  }
`;

const Hero = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  margin: 0 0 0.5rem;
  color: var(--text-primary);
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const TitleIcon = styled.span`
  font-size: 1.75rem;
  filter: drop-shadow(0 2px 4px rgba(124, 58, 237, 0.3));
`;

const Subtitle = styled.p`
  margin: 0;
  color: var(--text-secondary);
  font-size: 1rem;
  line-height: 1.5;
  max-width: 420px;
  margin-left: auto;
  margin-right: auto;
`;

const CollectionLink = styled.a`
  display: inline-block;
  margin-top: 0.75rem;
  color: #7c3aed;
  font-size: 0.9375rem;
  font-weight: 600;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1.25rem;
  margin-top: 0.5rem;
`;

const NftCardInner = styled.div`
  position: relative;
`;

const CardCheckboxOverlay = styled.div`
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 1;
`;

const NftCard = styled.div<{ $claimable?: boolean; $selected?: boolean }>`
  background: var(--background-tertiary);
  border: 1px solid ${(p) =>
    p.$selected ? "rgba(124, 58, 237, 0.8)" : p.$claimable ? "rgba(124, 58, 237, 0.4)" : "var(--border-color)"};
  border-radius: 14px;
  overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.2s ease;
  cursor: ${(p) => (p.$claimable ? "pointer" : "default")};

  &:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
  }

  ${(p) =>
    p.$claimable &&
    `
    box-shadow: 0 0 0 1px rgba(124, 58, 237, 0.2), 0 4px 12px rgba(0, 0, 0, 0.08);
    &:hover {
      box-shadow: 0 0 0 1px rgba(124, 58, 237, 0.35), 0 12px 24px rgba(0, 0, 0, 0.12);
    }
  `}
  ${(p) =>
    p.$selected &&
    `
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.6), 0 4px 12px rgba(0, 0, 0, 0.08);
  `}
`;

const NftImage = styled.img`
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  display: block;
`;

const NftName = styled.div`
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const DripInfo = styled.div`
  padding: 0.4rem 0.75rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-align: center;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`;

const ClaimableAmount = styled.span`
  font-weight: 700;
  color: #5b21b6;
  font-size: 0.8rem;
`;

const EmptyState = styled.div`
  text-align: center;
  color: var(--text-secondary);
  padding: 3rem 2rem;
  font-size: 1rem;
  line-height: 1.6;
`;

const EmptyStateIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.6;
`;

const LoadingState = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const LoadingDots = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;

  span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #5b21b6;
    animation: loadingBounce 1.4s ease-in-out infinite both;
  }
  span:nth-child(1) { animation-delay: 0s; }
  span:nth-child(2) { animation-delay: 0.2s; }
  span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes loadingBounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
    40% { transform: scale(1); opacity: 1; }
  }
`;

const LoadingText = styled.p`
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
`;

const ApproveButton = styled.button`
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  margin-top: 1rem;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const AggregateRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: var(--background-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
`;

const ClaimButton = styled.button`
  padding: 0.6rem 1.25rem;
  background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DripInfoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
`;

const CardClaimButton = styled.button`
  padding: 0.3rem 0.5rem;
  background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.2s;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PaginationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
  flex-wrap: wrap;
`;

const PaginationButton = styled.button`
  padding: 0.6rem 1.25rem;
  background: var(--background-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(91, 33, 182, 0.1) 100%);
    border-color: rgba(124, 58, 237, 0.4);
    transform: scale(1.03);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const PaginationLabel = styled.span`
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
`;

const SelectionBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: var(--background-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  flex-wrap: wrap;
`;

const SelectionActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const CheckboxWrapper = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--text-secondary);
  user-select: none;

  input {
    width: 18px;
    height: 18px;
    accent-color: #5b21b6;
    cursor: pointer;
  }
`;

const CardCheckbox = styled.input.attrs({ type: "checkbox" })`
  width: 18px;
  height: 18px;
  accent-color: #5b21b6;
  cursor: pointer;
  flex-shrink: 0;
`;

function tokenKey(contractId: number, tokenId: string): string {
  return `${contractId}-${tokenId}`;
}

const PxlMobSznOneDrip: React.FC = () => {
  const { activeAccount, signTransactions } = useWallet();
  const [tokens, setTokens] = useState<ParsedToken[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimingKey, setClaimingKey] = useState<string | null>(null);
  const [dripInfoByKey, setDripInfoByKey] = useState<Record<string, NftDripInfo | null>>({});
  const [dripLoadingByKey, setDripLoadingByKey] = useState<Record<string, boolean>>({});
  const [dripRefreshTrigger, setDripRefreshTrigger] = useState(0);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const totalPages = Math.max(1, Math.ceil(tokens.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginatedTokens = tokens.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const aggregateClaimable = tokens.reduce((sum, t) => {
    const info = dripInfoByKey[tokenKey(t.contractId, t.tokenId)];
    return sum + (info?.claimableAmount ?? 0);
  }, 0);

  const claimableTokensOnPage = paginatedTokens.filter((t) => {
    const info = dripInfoByKey[tokenKey(t.contractId, t.tokenId)];
    return info && info.claimableAmount > 0;
  });

  const selectedClaimableAmount = paginatedTokens.reduce((sum, t) => {
    const key = tokenKey(t.contractId, t.tokenId);
    if (!selectedKeys.has(key)) return sum;
    const info = dripInfoByKey[key];
    return sum + (info?.claimableAmount ?? 0);
  }, 0);

  const toggleSelection = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (next.size < MAX_SELECT) next.add(key);
      return next;
    });
  };

  const selectAllClaimable = () => {
    setSelectedKeys(
      new Set(
        claimableTokensOnPage
          .slice(0, MAX_SELECT)
          .map((t) => tokenKey(t.contractId, t.tokenId))
      )
    );
  };

  const clearSelection = () => setSelectedKeys(new Set());

  const handleClaimSelected = async () => {
    const toClaim = paginatedTokens.filter((t) => selectedKeys.has(tokenKey(t.contractId, t.tokenId)));
    const withClaimable = toClaim.filter((t) => {
      const info = dripInfoByKey[tokenKey(t.contractId, t.tokenId)];
      return info && info.claimableAmount > 0;
    });
    if (withClaimable.length === 0) {
      toast.error("No selected NFTs with claimable amount");
      return;
    }
    if (!activeAccount?.address) {
      toast.error("Please connect your wallet");
      return;
    }
    if (!DRIP_CONTRACT_ID) {
      toast.error("Drip contract not configured");
      return;
    }
    setIsClaiming(true);
    setError(null);
    try {
      const { algodClient, indexerClient } = getAlgorandClients();
      const ci = new CONTRACT(
        PIX_TOKEN_CONTRACT_ID,
        algodClient,
        indexerClient,
        abi.custom,
        { addr: activeAccount.address, sk: new Uint8Array(0) }
      );
      const builder = {
        drip: new CONTRACT(
          DRIP_CONTRACT_ID,
          algodClient,
          indexerClient,
          {
            name: "drip",
            desc: "drip",
            methods: [
              {
                name: "claim",
                args: [
                  { type: "uint64", name: "collection_id" },
                  { type: "uint256", name: "token_id" },
                ],
                readonly: false,
                returns: { type: "uint256" },
              },
            ],
            events: [],
          },
          { addr: activeAccount.address, sk: new Uint8Array(0) },
          true,
          false,
          true
        ),
      };
      const buildN = [];
      let i = 0;
      for (const t of withClaimable) {
        const txnO = (await builder.drip.claim(Number(t.contractId), Number(t.tokenId))).obj;
        buildN.push({
          ...txnO,
          payment: 1e6 - 7000 + i++,
          note: new TextEncoder().encode(`claim PIX from ${t.contractId}-${t.tokenId}`),
        });
      }
      if (buildN.length === 0) throw new Error("Failed to build claim transaction(s)");
      ci.setExtraTxns(buildN);
      ci.setEnableGroupResourceSharing(true);
      ci.setFee(4000);
      const customR = await ci.custom();
      if (!customR.success) throw new Error("Failed to build claim transaction(s)");
      const toSign = customR.txns.map((txn: string) => new Uint8Array(Buffer.from(txn, "base64")));
      const stxns = await signTransactions(toSign);
      const { txId } = await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();
      await algosdk.waitForConfirmation(algodClient, txId, 4);
      const totalClaimed = withClaimable.reduce((sum, t) => {
        const info = dripInfoByKey[tokenKey(t.contractId, t.tokenId)];
        return sum + (info?.claimableAmount ?? 0);
      }, 0);
      toast.success(`Claimed ${(totalClaimed / 1e6).toLocaleString()} PIX from ${withClaimable.length} NFT(s)`);
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        withClaimable.forEach((t) => next.delete(tokenKey(t.contractId, t.tokenId)));
        return next;
      });
      setDripRefreshTrigger((r) => r + 1);
    } catch (err) {
      console.error("Claim selected error:", err);
      const message = err instanceof Error ? err.message : "Claim failed";
      setError(message);
      toast.error(message);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleClaimOne = async (t: ParsedToken) => {
    const key = tokenKey(t.contractId, t.tokenId);
    const info = dripInfoByKey[key];
    if (!activeAccount?.address) {
      toast.error("Please connect your wallet");
      return;
    }
    if (!info || info.claimableAmount <= 0) {
      toast.error("Nothing to claim for this NFT");
      return;
    }
    if (!DRIP_CONTRACT_ID) {
      toast.error("Drip contract not configured");
      return;
    }
    setClaimingKey(key);
    setError(null);
    try {
      const { algodClient, indexerClient } = getAlgorandClients();
      const ci = new CONTRACT(
        PIX_TOKEN_CONTRACT_ID,
        algodClient,
        indexerClient,
        abi.custom,
        { addr: activeAccount.address, sk: new Uint8Array(0) },
      );
      const builder = {
        drip: new CONTRACT(
          DRIP_CONTRACT_ID,
          algodClient,
          indexerClient,
          {
            name: "drip",
            desc: "drip",
            methods: [
              {
                name: "claim",
                args: [
                  { type: "uint64", name: "collection_id" },
                  { type: "uint256", name: "token_id" },
                ],
                readonly: false,
                returns: { type: "uint256" },
              },
            ],
            events: [],
          },
          { addr: activeAccount.address, sk: new Uint8Array(0) },
          true,
          false,
          true
        )
      };
      let i = 0;
      const buildN = [];
      {
        const txnO = (await builder.drip.claim(Number(t.contractId), Number(t.tokenId))).obj;
        buildN.push({
          ...txnO,
          payment: 1e6 - 7000 + i++,
          note: new TextEncoder().encode(`claim PIX from ${t.contractId}-${t.tokenId}`),
        });
      }
      ci.setExtraTxns(buildN);
      ci.setEnableGroupResourceSharing(true);
      ci.setFee(4000);
      const r = await ci.custom();
      if (!r.success || !("txns" in r) || !Array.isArray(r.txns) || r.txns.length === 0) {
        throw new Error("Failed to build claim transaction");
      }
      const toSign = (r.txns as string[]).map((b) => new Uint8Array(Buffer.from(b, "base64")));
      const stxns = await signTransactions(toSign);
      const { txId } = await algodClient.sendRawTransaction(stxns as Uint8Array[]).do();
      await algosdk.waitForConfirmation(algodClient, txId, 4);
      toast.success(`Claimed ${(info.claimableAmount / 1e6).toLocaleString()} PIX`);
      setDripRefreshTrigger((r) => r + 1);
    } catch (err) {
      console.error("Claim one error:", err);
      toast.error(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setClaimingKey(null);
    }
  };

  const handleApprove = async () => {
    if (!activeAccount?.address) {
      toast.error("Please connect your wallet");
      return;
    }
    if (!DRIP_CONTRACT_ID) {
      toast.error("Drip contract not configured");
      return;
    }
    setIsApproving(true);
    setError(null);
    try {
      const { algodClient, indexerClient } = getAlgorandClients();
      const dripContractAddress = algosdk.getApplicationAddress(DRIP_CONTRACT_ID);
      const ciTok = new CONTRACT(
        PIX_TOKEN_CONTRACT_ID,
        algodClient,
        indexerClient,
        abi.nt200,
        { addr: activeAccount.address, sk: new Uint8Array(0) },
      );
      const balanceR = await ciTok.arc200_balanceOf(activeAccount.address);
      if (!balanceR.success) {
        throw new Error("Failed to get PIX balance");
      }
      const balance = balanceR.returnValue;
      if (balance <= 0) {
        toast.error("You don't have any PIX to approve");
        return;
      }
      const ci = new CONTRACT(
        PIX_TOKEN_CONTRACT_ID,
        algodClient,
        indexerClient,
        abi.nt200,
        { addr: activeAccount.address, sk: new Uint8Array(0) },
      );
      const approveR = await ci.arc200_approve(
        dripContractAddress,
        balance,
      );
      if (!approveR.success || !("txns" in approveR)) {
        throw new Error("Failed to build approve transaction");
      }
      const stxns = await signTransactions(
        approveR.txns.map(
          (txn: string) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      );
      const { txId } = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();
      await algosdk.waitForConfirmation(algodClient, txId, 4);
      toast.success(`Approved PIX for drip`);
    } catch (err) {
      console.error("Approve error:", err);
      const message = err instanceof Error ? err.message : "Approve failed";
      setError(message);
      toast.error(message);
    } finally {
      setIsApproving(false);
    }
  };

  useEffect(() => {
    if (!activeAccount?.address) {
      setTokens([]);
      setError(null);
      setDripInfoByKey({});
      setDripLoadingByKey({});
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = `${INDEXER_URL}?contractId=${PXLMOB_NFT_CONTRACT_ID}&owner=${activeAccount.address}`;
    fetch(url)
      .then((res) => res.json())
      .then((data: { tokens?: IndexerToken[] }) => {
        if (cancelled) return;
        const list = data.tokens ?? [];
        const parsed: ParsedToken[] = list
          .filter((t) => !t.isBurned)
          .map((t) => {
            let metadata: TokenMetadata = {};
            try {
              metadata = JSON.parse(t.metadata || "{}") as TokenMetadata;
            } catch {
              // ignore
            }
            return {
              tokenId: t.tokenId,
              contractId: t.contractId,
              name: metadata.name ?? `PXLMOB #${t.tokenId}`,
              image: metadata.image ?? "",
              metadata,
            };
          });
        setTokens(parsed);
        setPage(1);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? "Failed to load NFTs");
          setTokens([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeAccount?.address]);

  useEffect(() => {
    if (!activeAccount?.address || tokens.length === 0) return;
    const totalPages = Math.max(1, Math.ceil(tokens.length / PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    const end = safePage * PAGE_SIZE;
    const tokensOnPage = tokens.slice(start, end);
    let cancelled = false;
    tokensOnPage.forEach((t) => {
      const key = tokenKey(t.contractId, t.tokenId);
      setDripLoadingByKey((prev) => ({ ...prev, [key]: true }));
      getNftDripInfoFromContract(t.contractId, t.tokenId, activeAccount.address)
        .then((info) => {
          if (!cancelled) {
            setDripInfoByKey((prev) => ({ ...prev, [key]: info }));
            setDripLoadingByKey((prev) => ({ ...prev, [key]: false }));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setDripInfoByKey((prev) => ({ ...prev, [key]: null }));
            setDripLoadingByKey((prev) => ({ ...prev, [key]: false }));
          }
        });
    });
    return () => { cancelled = true; };
  }, [activeAccount?.address, tokens, page, dripRefreshTrigger]);

  return (
    <Container>
      <Card>
        <Hero>
          <Title>
            <TitleIcon>💧</TitleIcon>
            PXLMOB SZN ONE Drip
          </Title>
          <Subtitle>
            Your PXLMOB SZN ONE NFTs earn PIX over time. Check each one and claim when you're ready. Total transaction cost: 1 VOI per claim.
          </Subtitle>
          <CollectionLink href={`/#/collection/${PXLMOB_NFT_CONTRACT_ID}`}>
            View Collection
          </CollectionLink>
          {' · '}
          <CollectionLink
            href={`https://voiager.xyz/token/${PIX_TOKEN_CONTRACT_ID}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Token
          </CollectionLink>
        </Hero>

        {!activeAccount?.address && (
          <EmptyState>
            <EmptyStateIcon>🔗</EmptyStateIcon>
            Connect your wallet to see your PXLMOB SZN ONE NFTs and their PIX drip rewards.
          </EmptyState>
        )}

        {activeAccount?.address && loading && (
          <LoadingState>
            <LoadingDots>
              <span /><span /><span />
            </LoadingDots>
            <LoadingText>Loading your PXLMOB NFTs…</LoadingText>
          </LoadingState>
        )}

        {activeAccount?.address && error && (
          <EmptyState style={{ color: "var(--error-color, #dc2626)" }}>
            <EmptyStateIcon>⚠️</EmptyStateIcon>
            {error}
          </EmptyState>
        )}

        {activeAccount?.address && !loading && !error && tokens.length === 0 && (
          <EmptyState>
            <EmptyStateIcon>🦎</EmptyStateIcon>
            You don't own any PXLMOB SZN ONE NFTs yet. Grab one to start earning PIX.
          </EmptyState>
        )}

        {activeAccount?.address && !loading && !error && tokens.length > 0 && (
          <>
            {claimableTokensOnPage.length > 0 && (
              <SelectionBar>
                <SelectionActions>
                  <CheckboxWrapper>
                    <input
                      type="checkbox"
                      checked={
                        claimableTokensOnPage.length > 0 &&
                        claimableTokensOnPage
                          .slice(0, MAX_SELECT)
                          .every((t) => selectedKeys.has(tokenKey(t.contractId, t.tokenId)))
                      }
                      onChange={(e) =>
                        e.target.checked ? selectAllClaimable() : clearSelection()
                      }
                    />
                    Select all (max {MAX_SELECT})
                  </CheckboxWrapper>
                  {selectedKeys.size > 0 && (
                    <>
                      <PaginationLabel>
                        {selectedKeys.size} selected · {(selectedClaimableAmount / 1e6).toLocaleString()} PIX
                      </PaginationLabel>
                      <ClaimButton
                        type="button"
                        onClick={handleClaimSelected}
                        disabled={isClaiming}
                      >
                        {isClaiming ? "Claiming…" : `Claim Selected (${selectedKeys.size})`}
                      </ClaimButton>
                      <PaginationButton type="button" onClick={clearSelection}>
                        Clear
                      </PaginationButton>
                    </>
                  )}
                </SelectionActions>
              </SelectionBar>
            )}
            <Grid>
              {paginatedTokens.map((t) => {
                const key = tokenKey(t.contractId, t.tokenId);
                const dripLoading = dripLoadingByKey[key];
                const dripInfo = dripInfoByKey[key];
                const hasClaimable = !!(dripInfo && dripInfo.claimableAmount > 0);
                const isSelected = selectedKeys.has(key);
                return (
                  <NftCard
                    key={key}
                    $claimable={hasClaimable}
                    $selected={isSelected}
                    onClick={() => hasClaimable && toggleSelection(key)}
                  >
                    <NftCardInner>
                      {hasClaimable && (
                        <CardCheckboxOverlay onClick={(e) => e.stopPropagation()}>
                          <CardCheckbox
                            checked={isSelected}
                            disabled={!isSelected && selectedKeys.size >= MAX_SELECT}
                            onChange={() => toggleSelection(key)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </CardCheckboxOverlay>
                      )}
                      <NftImage
                        src={t.image}
                        alt={t.name}
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "";
                          (e.target as HTMLImageElement).style.background = "var(--background-tertiary)";
                        }}
                      />
                      <NftName title={t.name}>{t.name}</NftName>
                      <DripInfo>
                        {dripLoading ? (
                          "…"
                        ) : dripInfo ? (
                          <DripInfoRow>
                            {dripInfo.claimableAmount > 0 ? (
                              <ClaimableAmount>
                                {(dripInfo.claimableAmount / 1e6).toLocaleString()} PIX
                              </ClaimableAmount>
                            ) : (
                              <span>
                                {(dripInfo.claimableAmount / 1e6).toLocaleString()} PIX
                              </span>
                            )}
                            {dripInfo.claimableAmount > 0 ? (
                              <CardClaimButton
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClaimOne(t);
                                }}
                                disabled={claimingKey !== null}
                              >
                                {claimingKey === key ? "…" : "Claim"}
                              </CardClaimButton>
                            ) : null}
                          </DripInfoRow>
                        ) : (
                          "—"
                        )}
                      </DripInfo>
                    </NftCardInner>
                  </NftCard>
                );
              })}
            </Grid>
            {totalPages > 1 && (
              <PaginationRow>
                <PaginationButton
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  Previous
                </PaginationButton>
                <PaginationLabel>
                  Page {safePage} of {totalPages}
                </PaginationLabel>
                <PaginationButton
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                >
                  Next
                </PaginationButton>
              </PaginationRow>
            )}
          </>
        )}

        {activeAccount?.address ===
          "2GFLNXAZE5YTDYLD33XSYVDQY4JM4J5UJ3AWOIXUDETT7EQFHIYIAYLVQY" && (
            <ApproveButton
              type="button"
              onClick={handleApprove}
              disabled={isApproving}
            >
              {isApproving ? "Approving..." : "Approve for Drip"}
            </ApproveButton>
          )}
      </Card>
    </Container>
  );
};

export default PxlMobSznOneDrip;
