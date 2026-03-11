# Locking AQUA

Staking on Whalehub means locking your AQUA tokens for a chosen duration. In return, you receive BLUB tokens that earn rewards proportional to the protocol's liquidity pool earnings.

## What Happens When You Lock

```mermaid
sequenceDiagram
    participant User
    participant Contract
    participant AQUA Token
    participant BLUB Token
    participant Admin Wallet

    User->>Contract: lock(amount, duration)

    Contract->>AQUA Token: Transfer AQUA from user to contract

    Note over Contract: Mint BLUB tokens
    Contract->>BLUB Token: Mint 1.0x BLUB → user's staking balance
    Contract->>BLUB Token: Mint 0.1x BLUB → admin (for pool liquidity)

    Note over Contract: Split the AQUA
    Contract->>AQUA Token: Send 10% AQUA → admin (for pool deposit)
    Note over Contract: Keep 90% AQUA for ICE governance locking

    Contract->>Contract: Save lock position
```

## Token Split Example

```
You lock 100 AQUA
│
├── 90 AQUA  → stays in contract (queued for ICE governance locking)
└── 10 AQUA  → admin wallet (deposited into BLUB-AQUA liquidity pool)

Contract mints 110 BLUB
├── 100 BLUB → your staking balance (earns rewards)
└──  10 BLUB → admin wallet (deposited into BLUB-AQUA liquidity pool)
```

## Lock Duration

- **Minimum lock**: 7 days
- You choose your lock duration when staking
- Longer locks earn a higher reward multiplier
- Once locked, you cannot withdraw until the lock period expires **plus** a 10-day cooldown

## How Rewards Accumulate

Your locked BLUB earns a share of all rewards distributed by the protocol. Rewards are calculated using a proportional model — if you hold 1% of all staked BLUB, you earn 1% of all distributed rewards.

Rewards accumulate continuously but can only be claimed every 7 days. See [Claiming Rewards](claiming-rewards.md) for details.
