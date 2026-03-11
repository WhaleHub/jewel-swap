# Auto-Compounding

Whalehub's backend automatically compounds vault rewards 48 times per day, maximizing yield without any manual action.

## How It Works

```mermaid
sequenceDiagram
    participant Backend
    participant Aquarius Pool
    participant DEX
    participant Contract

    Note over Backend: Runs every 30 minutes

    Backend->>Contract: claim_and_compound(pool_id)
    Contract->>Aquarius Pool: Claim AQUA farming rewards

    Note over Contract: Split rewards
    Contract->>Contract: 30% → treasury
    Contract->>Contract: 70% → manager wallet

    Backend->>DEX: Swap half of AQUA to second pool token
    Backend->>Contract: admin_compound_deposit(pool_id, token_a, token_b)
    Contract->>Aquarius Pool: Deposit both tokens back into pool
    Note over Contract: LP shares increase for all vault users
```

## Reward Split

| Portion | Destination | Purpose |
|---------|------------|---------|
| 30% | Protocol treasury | Sustains development and operations |
| 70% | Re-deposited into pool | Grows all vault users' positions |

## Compound Effect

The power of 48x daily compounding:

| Base Pool APY | Compounded APY | Extra Yield |
|---------------|---------------|-------------|
| 10% | 10.5% | +0.5% |
| 25% | 28.4% | +3.4% |
| 50% | 64.8% | +14.8% |
| 100% | 171.5% | +71.5% |

## Tracking Your Gains

The vault interface shows:
- **Your LP tokens**: current position size
- **Deposit amount**: what you originally deposited
- **Compound gains**: how much your position has grown from auto-compounding
