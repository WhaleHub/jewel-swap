# Security

Whalehub employs several security measures to protect user funds and protocol integrity.

## Reentrancy Guard

Every write function follows a strict pattern to prevent double-spend attacks:

```
1. Read global state
2. Set reentrancy lock = true
3. Execute all logic
4. Update all state
5. Set reentrancy lock = false
6. Save global state — ONCE, at the very end
```

If the contract is called recursively mid-execution, it sees the lock and immediately rejects.

## Admin / Manager Separation

Two distinct roles with different security levels:

| Role | Wallet Type | Can Do | Cannot Do |
|------|------------|--------|-----------|
| **Admin** (multisig) | 2-of-3 cold wallet | Upgrade contract, change config | Daily operations |
| **Manager** (hot wallet) | Single key, used by backend | Distribute rewards, compound, ICE locking | Upgrade contract, change admin |

This means a compromised backend key **cannot** upgrade the contract or change critical settings.

## Reward Caps

After a previous incident, all reward distribution functions enforce maximum amounts per call:

```
MAX_BLUB_PER_CALL = 1,000,000,000,000 (100K BLUB with 7 decimals)
```

This prevents accidental or malicious over-distribution of rewards.

## Token Authorization

- BLUB mint authority is held by the staking contract, not any individual wallet
- Minting requires a 3-step process through the contract
- `AUTH_REVOCABLE` is enabled on the BLUB issuer, allowing freeze capabilities

## Smart Contract Upgrades

Contract upgrades require:
1. Building and optimizing new WASM binary
2. Installing WASM on-chain (~140 XLM fee)
3. Calling `upgrade()` — requires **multisig admin** signature (2-of-3)
4. Co-signer approval via Stellar Laboratory

No single party can unilaterally upgrade the contract.

## Frontend Security

- All transactions are simulated before signing to catch errors early
- Users sign every transaction in their own wallet — the app never holds private keys
- Token balances are verified through both Soroban RPC and Horizon API
- Wallet connections use standard Stellar wallet kit protocols
