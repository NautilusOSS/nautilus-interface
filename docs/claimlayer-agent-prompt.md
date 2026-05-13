# ClaimLayer agent prompt — Voi NFT drip (Nautilus)

Share this document with the ClaimLayer agent when implementing or reviewing sources.

## Instructions for the agent

You are implementing **ClaimLayer** sources for **Voi mainnet NFT drip programs** as used by the **Nautilus** frontend (React app using `@txnlab/use-wallet-react`, `NetworkId.VOIMAIN`).

### Goal

Add adapter(s) that support **estimate → claim** for rewards that accrue **per ARC-72 NFT** (per `(collection_id, token_id)`), not as a single global wallet balance.

### ClaimLayer alignment

- **Source type:** `nft_drip`
- **Per-reward fields:** Map each claim line to `tokenId` = NFT id string (or composite `"{collectionId}-{tokenId}"` if your model requires uniqueness), `symbol` = reward token symbol (UNIT / PIX / FREN), `amount` = human-readable string, `decimals` from reward token (UNIT 8, PIX 6, FREN 6 per app), optional `fiatValueUsd` if you have pricing
- **Preview:** `claimable` if computed claimable raw > 0; `nothing_to_claim` if user holds NFTs but accrual is 0; `unavailable` if contract read fails or user has no positions
- **Execution:** On success return tx id(s) from chain submission; amounts claimed per NFT

### Network & infra

- **Chain:** Voi mainnet
- **Algod / indexer defaults (app):** `https://mainnet-api.voi.nodely.dev`, `https://mainnet-idx.voi.nodely.dev`
- **NFT holdings (indexer):** `GET https://voi-mainnet-mimirapi.nftnavigator.xyz/nft-indexer/v1/tokens?contractId={arc72CollectionId}&owner={address}`

### On-chain preview (read)

All programs use the same **readonly** pattern: call app method **`drip(uint64 collection_id, uint256 token_id)`** on the **drip application**, returns a tuple (implementation parses indices for collection id, token id, last drip timestamp, claim amount, max claim amount — match existing client).

Use this to derive **claimable** after time-based accrual (weekly or biweekly depending on program; see below).

### Drip application IDs & collections (mainnet)

| Program          | Drip app ID | NFT collection (ARC-72) | Reward token ASA / ARC-200 id | Symbol | Decimals (from app) |
|------------------|------------:|-------------------------|-------------------------------|--------|---------------------|
| Dorks            |    49016540 | 313597                  | 420069                        | UNIT   | 8                   |
| Dorks V2         |    49016557 | 894888                  | 420069                        | UNIT   | 8                   |
| PXLMOB SZN ONE   |    48567463 | 447482                  | 410419                        | PIX    | 6                   |
| FREN (VoiFrens)  |    48516432 | 40408061                | 419385                        | FREN   | 6                   |

**Note:** Confirm **48516432** is still the live FREN drip app; treat as verify-on-chain if docs differ.

### Claim (write)

Build transactions with the same app’s **`claim`** (or equivalent) method the Nautilus client uses: **`claim(collection_id, token_id)`** per NFT — **one transaction per NFT** when batching.

Reference UI caps batch selection at **6 NFTs** per operation (optional parity).

### Accrual rules (for estimate parity with UI)

- **UNIT (Dorks / Dorks V2):** Weekly accrual in raw units; `dripPerWeekRaw` examples: 4e8 for Dorks, 0.8e8 for Dorks V2 — **verify against contract** / deployed config.
- **PIX:** 70e6 raw per week, capped by `maxClaimAmount - claimAmount` from read.
- **FREN:** Biweekly: 1e6 raw per 14-day period since `lastDripTimestamp`, capped similarly.

Recompute from `lastDripTimestamp` + on-chain caps so preview matches chain.

### Optional metadata for source record

```json
{
  "key": "voi-nft-drip",
  "name": "Voi NFT drip (Nautilus-compatible)",
  "type": "nft_drip",
  "claimMode": "per_nft",
  "supportsBatchClaim": true,
  "metadata": {
    "adapter": "voi-nft-drip",
    "network": "VOIMAIN",
    "dripAppIds": {
      "dork": 49016540,
      "dorkV2": 49016557,
      "pxl": 48567463,
      "fren": 48516432
    },
    "indexerTokens": "https://voi-mainnet-mimirapi.nftnavigator.xyz/nft-indexer/v1/tokens"
  }
}
```

### Gaps / verify before production

1. Confirm all **drip app IDs** on Voi mainnet (especially FREN).
2. Confirm **exact** accrual math and **approve** requirements for UNIT (reward token approval to drip contract).
3. Indexer **rate limits** — Mimir/Nautilus are public HTTP.
4. **Testnet:** app uses `voi-testnet` node option in code but IDs are mainnet — need testnet app IDs + indexer URL for staging if ClaimLayer requires it.

### Deliverables

- Source registration for ClaimLayer
- Preview path: indexer (holdings) + algod/indexer contract read (`drip`) + local accrual math
- Claim path: sign/send one or more `claim` txns; return tx ids and claimed amounts
- Tests or manual checklist against one wallet with known NFTs

---

## Scope note

You can shorten the table to **one** program for an initial rollout (e.g. Dorks only).
