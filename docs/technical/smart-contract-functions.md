# Smart Contract Functions

The staking contract exposes functions for users, the manager (backend), and the admin (multisig).

## User Functions

| Function | Description |
|----------|-------------|
| `lock(user, amount, duration)` | Lock AQUA tokens, receive BLUB into staking balance |
| `stake(user, amount, duration)` | Restake existing BLUB tokens |
| `record_unlock(user, lock_index)` | Withdraw tokens after lock + cooldown expires |
| `claim_rewards(user)` | Claim pending BLUB rewards (7-day cooldown) |
| `vault_deposit(user, pool_id, amount_a, amount_b)` | Deposit token pair into a vault pool |
| `vault_withdraw(user, pool_id, lp_amount)` | Withdraw liquidity from a vault pool |

## Manager Functions (Backend)

| Function | Description |
|----------|-------------|
| `add_rewards(manager, amount)` | Distribute BLUB rewards to all stakers |
| `add_rewards_from_aqua(manager, aqua, blub)` | Distribute both AQUA and BLUB rewards |
| `claim_and_compound(manager, pool_id)` | Claim pool rewards and split to treasury/manager |
| `admin_compound_deposit(manager, pool_id, amount_a, amount_b)` | Re-deposit compounded rewards into pool |
| `authorize_ice_lock(manager, amount, years)` | Authorize AQUA for ICE governance locking |
| `transfer_authorized_aqua(manager, lock_id)` | Move authorized AQUA to manager wallet |
| `sync_all_ice_balances(manager)` | Read ICE token balances and record on-chain |

## Admin Functions (Multisig)

| Function | Description |
|----------|-------------|
| `upgrade(admin, new_wasm_hash)` | Upgrade contract to new WASM code |
| `update_sac_admin(admin, new_admin)` | Change BLUB token mint authority |
| `update_vault_treasury(admin, addr)` | Change treasury fee recipient |
| `update_vault_fee_bps(admin, bps)` | Change treasury fee percentage |
| `set_manager(admin, new_manager)` | Change manager wallet address |

## View Functions (Read-only, No Fee)

| Function | Returns |
|----------|---------|
| `get_config()` | All protocol settings |
| `get_global_state()` | Total locked, total minted, reentrancy state |
| `get_reward_state()` | Global reward accumulator |
| `get_user_reward_state(user)` | User's reward snapshot and pending amount |
| `get_user_lock_count(user)` | Number of lock positions for a user |
| `get_user_lock_by_index(user, i)` | Details of a specific lock position |
| `get_user_total_staked_blub(user)` | Total BLUB in reward pool for user |
| `calculate_user_rewards(user)` | Pending BLUB available to claim |
| `get_pool_info(pool_id)` | Vault pool configuration and state |
| `get_pool_count()` | Number of vault pools |
| `get_user_vault_position(user, pool_id)` | User's LP position in a vault |
| `get_protocol_owned_liquidity()` | Full POL accounting |
