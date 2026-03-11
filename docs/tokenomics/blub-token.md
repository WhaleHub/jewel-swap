# BLUB Token

BLUB is Whalehub's native reward token, minted on the Stellar network. It serves as both a staking receipt and the primary reward mechanism.

## How BLUB Is Created

BLUB is minted by the staking contract when users lock AQUA:

```
User locks 100 AQUA
→ 100 BLUB minted to user's staking balance
→  10 BLUB minted to admin for liquidity pool deposit
```

BLUB is also distributed as staking rewards when the backend deposits pool earnings.

## BLUB Value

BLUB is paired with AQUA in the protocol's primary liquidity pool (BLUB-AQUA). The exchange rate is determined by the pool's reserves and market activity.

## Uses

| Use | Description |
|-----|-------------|
| **Staking rewards** | Earned proportionally by all AQUA stakers |
| **Restaking** | Lock BLUB back into the protocol to earn more |
| **Trading** | Swap on the Aquarius BLUB-AQUA pool |
| **Liquidity provision** | Pair with AQUA in vaults for additional yield |

## Token Details

| Property | Value |
|----------|-------|
| Network | Stellar (Soroban SAC) |
| Decimals | 7 |
| Mint authority | Staking contract |
| Contract | `CBMFDIRY5OKI4JJURXC4SMEQPWB4UUADIADJK4NA6CYBNOYK4W4TMLLF` |
| Issuer | `GDERSSCKJQPPXUQOZIOXGRVAGNLVPVZCJ2MAX7RCMVMWGRPVAEG7XGTK` |
