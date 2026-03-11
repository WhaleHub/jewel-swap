# What Are Vaults

Vaults are auto-compounding liquidity positions on Aquarius AMM pools. You deposit token pairs, and Whalehub automatically reinvests earned rewards back into the pool to grow your position.

## How Vaults Differ from Staking

| | Staking | Vaults |
|---|---|---|
| What you deposit | AQUA (or restake BLUB) | Token pairs (e.g. XLM + AQUA) |
| What you earn | BLUB rewards | Growing LP position |
| How you earn | Share of protocol reward pool | AMM trading fees + AQUA farming rewards |
| Compounding | Manual (claim + restake) | Automatic (48x per day) |
| Lock period | Fixed (your choice) | None — withdraw anytime |
| Fee | None | 30% of rewards to treasury |

## Available Pools

| Pool | Tokens | Status |
|------|--------|--------|
| Pool 0 | BLUB + AQUA | Active (also contains Protocol Owned Liquidity) |
| Pool 2 | XLM + AQUA | Active |

## How Auto-Compounding Works

```
Every 30 minutes:
├── Backend claims AQUA farming rewards from pool
├── 30% → treasury
└── 70% → split into both pool tokens
    └── Re-deposited into the pool as new liquidity
        └── Your LP share grows automatically
```

Over a year, 48 daily compounds produce significantly higher effective APY than the base pool rate. For example, a pool with 50% base APY compounds to approximately 64% effective APY.

## ICE Boost for Vaults

> **Important: Due to Stellar protocol limitations, ICE tokens (which are created via classic Stellar claimable balances) cannot currently be locked directly by a Soroban smart contract. This means vault LP deposited by the contract does not benefit from the ICE 2.5x reward boost. We are actively working on a solution to route vault deposits through an ICE-holding wallet to unlock boosted yields for vault users. This feature is planned for a future release.**

## Compound APY Formula

```
Compounded APY = (1 + base_rate / 17,520)^17,520 - 1

Where 17,520 = 48 compounds/day × 365 days
```
