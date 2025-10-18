#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Bytes, Env, Vec,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Config {
    pub admin: Address,
    pub version: u32,
    pub total_supply: i128,
    pub treasury_address: Address,
    pub reward_rate: i128, // basis points per period
    pub aqua_token: Address, // AQUA token contract address
    pub blub_token: Address, // External BLUB token (Stellar asset)
    pub liquidity_contract: Address, // AQUA/BLUB StableSwap pool contract on Stellar network
    pub ice_contract: Address, // ICE locking contract for 90% AQUA
    pub period_unit_minutes: u64, // Staking period unit in minutes
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LockEntry {
    pub user: Address,
    pub amount: i128,                // AQUA amount locked in contract
    pub blub_locked: i128,           // BLUB amount locked in staking pool
    pub lock_timestamp: u64,
    pub duration_minutes: u64,       // Lock duration in minutes
    pub unlock_timestamp: u64,       // Calculated unlock time
    pub reward_multiplier: i128,
    pub tx_hash: Bytes,
    pub pol_contributed: i128, // 10% of locked AQUA that goes to POL
    pub is_blub_stake: bool,   // true if this is a BLUB restake, false if AQUA stake
    pub unlocked: bool,        // true if this entry has been unlocked
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PendingStake {
    pub user: Address,
    pub amount: i128,
    pub duration_minutes: u64,
    pub timestamp: u64,
    pub processed: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LockTotals {
    pub total_locked_aqua: i128,
    pub total_blub_minted: i128,       // Total BLUB minted for this user
    pub total_entries: u32,
    pub last_update_ts: u64,
    pub accumulated_rewards: i128,      // Accumulated BLUB rewards
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserStakingInfo {
    pub total_staked_blub: i128,       // Total BLUB currently staked/locked
    pub unstaking_available: i128,      // BLUB available to unstake (unlocked positions)
    pub accumulated_rewards: i128,      // Total accumulated BLUB rewards
    pub pending_rewards: i128,          // Pending rewards not yet accumulated
    pub total_locked_entries: u32,      // Number of locked positions
    pub total_unlocked_entries: u32,    // Number of unlocked positions ready to unstake
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LpPosition {
    pub pool_id: Bytes,
    pub total_asset_a: i128,
    pub total_asset_b: i128,
    pub last_tx: Bytes,
    pub last_update_ts: u64,
    pub lp_shares: i128,
    pub reward_debt: i128, // for reward calculation
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UnlockEntry {
    pub amount: i128,
    pub tx_hash: Bytes,
    pub timestamp: u64,
    pub claimed: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BlubRestakeEntry {
    pub amount: i128,
    pub tx_hash: Bytes,
    pub timestamp: u64,
    pub previous_amount: i128, // track restake additions
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserRewardTotals {
    pub lp_total: i128,
    pub locked_total: i128,
    pub last_update_ts: u64,
    pub pending_lp: i128, // unclaimed LP rewards
    pub pending_locked: i128, // unclaimed locked rewards
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RewardDistribution {
    pub kind: u32,
    pub pool_id: Bytes,
    pub total_reward: i128,
    pub distributed_amount: i128,
    pub treasury_amount: i128,
    pub tx_hash: Bytes,
    pub timestamp: u64,
    pub user_count: u32,
}

// Gas-optimized global state
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GlobalState {
    pub total_locked: i128,
    pub total_blub_supply: i128,         // Total BLUB tokens minted
    pub total_lp_staked: i128,
    pub locked: bool,                     // Re-entrancy guard
    pub total_users: u32,
    pub last_reward_update: u64,
    pub reward_per_locked_token: i128, // accumulated rewards per token (with precision)
    pub reward_per_lp_token: i128, // accumulated rewards per LP token (with precision)
    pub total_blub_rewards_distributed: i128, // Track total BLUB rewards given
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProtocolOwnedLiquidity {
    pub total_aqua_contributed: i128, // Total 10% AQUA from all locks
    pub total_blub_contributed: i128, // Total 10% BLUB from all locks
    pub aqua_blub_lp_position: i128, // Total LP tokens held by protocol
    pub total_pol_rewards_earned: i128, // Total rewards earned from POL voting
    pub last_reward_claim: u64,
    pub ice_voting_power_used: i128, // ICE tokens used for voting on AQUA-BLUB pair
}

// ============================================================================
// Liquidity Pool Integration (AQUA/BLUB AMM Pool)
// ============================================================================

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Config,
    UserLockCount(Address),
    UserLockByIndex(Address, u32),
    UserLpCount(Address),
    UserLpByIndex(Address, u32),
    UserUnlockCount(Address),
    UserUnlockByIndex(Address, u32),
    UserBlubRestakeCount(Address),
    UserBlubRestakeByIndex(Address, u32),
    LockTotals,
    LpTotals,
    UserRewards(Address),
    DistributionCount,
    DistributionByIndex(u32),
    GlobalState,
    RewardSnapshot(u64),
    ProtocolOwnedLiquidity, // POL tracking
    DailyPolSnapshot(u64), // Daily POL performance snapshots
    UserLockTotals(Address), // User-specific lock totals
    UserPools(Address), // User pool list
    UserLp(Address, Bytes), // User LP position by pool
    PendingStakeCount, // Total pending stakes
    PendingStakeByIndex(u32), // Pending stake by index
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    InvalidInput = 4,
    NotFound = 5,
    InsufficientBalance = 6,
    RewardCalculationFailed = 7,
    UnlockNotReady = 8,
    AlreadyClaimed = 9,
    ReentrancyDetected = 20,
    // Token Errors
    InsufficientAllowance = 19,
    InvalidPeriod = 21,
    NoUnlockableAmount = 22,
}

impl From<Error> for soroban_sdk::Error {
    fn from(error: Error) -> Self {
        soroban_sdk::Error::from_contract_error(error as u32)
    }
}

impl From<&Error> for soroban_sdk::Error {
    fn from(error: &Error) -> Self {
        soroban_sdk::Error::from_contract_error(error.clone() as u32)
    }
}

impl From<soroban_sdk::Error> for Error {
    fn from(_: soroban_sdk::Error) -> Self {
        Error::InvalidInput
    }
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LockRecordedEvent {
    pub user: Address,
    pub amount: i128,
    pub duration_minutes: u64,
    pub reward_multiplier: i128,
    pub tx_hash: Bytes,
    pub timestamp: u64,
    pub lock_index: u32,
    pub unlock_timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LpDepositRecordedEvent {
    pub user: Address,
    pub pool_id: Bytes,
    pub amount_a: i128,
    pub amount_b: i128,
    pub tx_hash: Bytes,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UnlockRecordedEvent {
    pub user: Address,
    pub amount: i128,
    pub tx_hash: Bytes,
    pub timestamp: u64,
    pub entry_index: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BlubRestakeRecordedEvent {
    pub user: Address,
    pub amount: i128,
    pub tx_hash: Bytes,
    pub timestamp: u64,
    pub entry_index: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RewardDistributionRecordedEvent {
    pub kind: u32,
    pub pool_id: Bytes,
    pub total_reward: i128,
    pub distributed_amount: i128,
    pub treasury_amount: i128,
    pub tx_hash: Bytes,
    pub timestamp: u64,
    pub distribution_index: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserRewardCreditedEvent {
    pub kind: u32,
    pub user: Address,
    pub pool_id: Bytes,
    pub amount: i128,
    pub tx_hash: Bytes,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PolContributionEvent {
    pub user: Address,
    pub aqua_locked: i128,
    pub pol_aqua_amount: i128, // 10% of locked AQUA
    pub pol_blub_amount: i128, // 10% of minted BLUB
    pub total_pol_aqua: i128,
    pub total_pol_blub: i128,
    pub timestamp: u64,
    pub lock_index: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PolRewardsClaimedEvent {
    pub reward_amount: i128,
    pub ice_voting_power: i128,
    pub total_pol_rewards: i128,
    pub reward_distribution_to_users: i128, // 70% to users
    pub treasury_amount: i128, // 30% to treasury
    pub timestamp: u64,
}

// Gas-optimized batch reward calculation event
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BatchRewardCalculatedEvent {
    pub kind: u32,
    pub total_amount: i128,
    pub user_count: u32,
    pub timestamp: u64,
}

#[contract]
pub struct StakingRegistry;

#[contractimpl]
impl StakingRegistry {
    pub fn initialize(
        env: Env,
        admin: Address,
        treasury_address: Address,
        aqua_token: Address,
        blub_token: Address,
        liquidity_contract: Address,
        ice_contract: Address,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Config) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();

        let cfg = Config { 
            admin: admin.clone(),
            version: 5,
            total_supply: 0,
            treasury_address,
            reward_rate: 100, // 1% per period default
            aqua_token,
            blub_token,
            liquidity_contract,
            ice_contract,
            // Staking Period Config
            period_unit_minutes: 1,
        };
        env.storage().instance().set(&DataKey::Config, &cfg);

        // Initialize global state
        let global_state = GlobalState {
            total_locked: 0,
            total_blub_supply: 0,
            total_lp_staked: 0,
            locked: false,                    // Initialize re-entrancy guard
            total_users: 0,
            last_reward_update: env.ledger().timestamp(),
            reward_per_locked_token: 0,
            reward_per_lp_token: 0,
            total_blub_rewards_distributed: 0,
        };
        env.storage().instance().set(&DataKey::GlobalState, &global_state);

        // Initialize POL state
        let pol = ProtocolOwnedLiquidity {
            total_aqua_contributed: 0,
            total_blub_contributed: 0,
            aqua_blub_lp_position: 0,
            total_pol_rewards_earned: 0,
            last_reward_claim: 0,
            ice_voting_power_used: 0,
        };
        env.storage().instance().set(&DataKey::ProtocolOwnedLiquidity, &pol);
        
        Ok(())
    }

    pub fn get_config(env: Env) -> Result<Config, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(Error::NotInitialized)
    }

    // Staking/unstaking/restaking logic

    /// Helper function to deposit POL assets to AQUA-BLUB LP pool on Stellar network
    /// Uses the existing StableSwap pool interface
    fn deposit_pol_to_lp(
        env: &Env,
        config: &Config,
        aqua_amount: i128,
        blub_amount: i128,
    ) -> Result<(), Error> {
        if aqua_amount <= 0 || blub_amount <= 0 {
            return Ok(()); // Nothing to deposit
        }
        
        let contract_address = env.current_contract_address();
        
        // Verify balances before attempting deposit
        use soroban_sdk::token;
        let aqua_client = token::Client::new(env, &config.aqua_token);
        let blub_client = token::Client::new(env, &config.blub_token);
        
        let aqua_balance = aqua_client.balance(&contract_address);
        let blub_balance = blub_client.balance(&contract_address);
        
        env.events().publish(
            (symbol_short!("pol_pre"),),
            (aqua_amount, blub_amount, aqua_balance, blub_balance),
        );
        
        if aqua_balance < aqua_amount {
            env.events().publish(
                (symbol_short!("pol_err"),),
                symbol_short!("low_aqua"),
            );
            return Err(Error::InsufficientBalance);
        }
        
        if blub_balance < blub_amount {
            env.events().publish(
                (symbol_short!("pol_err"),),
                symbol_short!("low_blub"),
            );
            return Err(Error::InsufficientBalance);
        }
        
        use soroban_sdk::{IntoVal, Vec as SorobanVec};
        use soroban_sdk::auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation};
        
        // Log what tokens we expect from config
        env.events().publish(
            (symbol_short!("cfg_tok"),),
            (config.aqua_token.clone(), config.blub_token.clone()),
        );
        
        // Get the token order from the pool to ensure we authorize in the correct order
        let pool_tokens_result = env.try_invoke_contract::<SorobanVec<Address>, soroban_sdk::Error>(
            &config.liquidity_contract,
            &soroban_sdk::Symbol::new(env, "get_tokens"),
            ().into_val(env),
        );
        
        let (token_0, token_1, amount_0, amount_1) = match pool_tokens_result {
            Ok(Ok(tokens)) if tokens.len() >= 2 => {
                let t0 = tokens.get(0).unwrap();
                let t1 = tokens.get(1).unwrap();
                
                // Determine which token is which and set amounts accordingly
                let (final_t0, final_t1, final_amt0, final_amt1) = if t0 == config.aqua_token && t1 == config.blub_token {
                    // Pool expects: AQUA first, BLUB second
                    (t0, t1, aqua_amount, blub_amount)
                } else if t0 == config.blub_token && t1 == config.aqua_token {
                    // Pool expects: BLUB first, AQUA second
                    (t0, t1, blub_amount, aqua_amount)
                } else {
                    // Tokens don't match - log warning and use pool order
                    env.events().publish(
                        (symbol_short!("pol_warn"),),
                        symbol_short!("tok_mism"),
                    );
                    // Assume pool order is correct, try AQUA first
                    (t0, t1, aqua_amount, blub_amount)
                };
                
                // Log token order for debugging
                let is_blub_first = final_t0 == config.blub_token;
                env.events().publish(
                    (symbol_short!("tok_ord"),),
                    (final_t0.clone(), final_t1.clone(), final_amt0, final_amt1),
                );
                env.events().publish(
                    (symbol_short!("blub_1st"),),
                    is_blub_first,
                );
                
                (final_t0, final_t1, final_amt0, final_amt1)
            }
            _ => {
                env.events().publish(
                    (symbol_short!("pol_warn"),),
                    symbol_short!("no_tokens"),
                );
                (config.aqua_token.clone(), config.blub_token.clone(), aqua_amount, blub_amount)
            }
        };
        
        let mut amounts = SorobanVec::new(env);
        amounts.push_back(amount_0 as u128);
        amounts.push_back(amount_1 as u128);
        
        let min_shares: u128 = 0;
        
        // Build authorization: The pool will call transfer on each token on our behalf
        let mut auth_entries = SorobanVec::new(env);
        
        // Authorize token 0 transfer (will be called by the pool contract)
        auth_entries.push_back(InvokerContractAuthEntry::Contract(SubContractInvocation {
            context: ContractContext {
                contract: token_0.clone(),
                fn_name: soroban_sdk::symbol_short!("transfer"),
                args: (contract_address.clone(), config.liquidity_contract.clone(), amount_0).into_val(env),
            },
            sub_invocations: SorobanVec::new(env),
        }));
        
        // Authorize token 1 transfer (will be called by the pool contract)
        auth_entries.push_back(InvokerContractAuthEntry::Contract(SubContractInvocation {
            context: ContractContext {
                contract: token_1.clone(),
                fn_name: soroban_sdk::symbol_short!("transfer"),
                args: (contract_address.clone(), config.liquidity_contract.clone(), amount_1).into_val(env),
            },
            sub_invocations: SorobanVec::new(env),
        }));
        
        env.authorize_as_current_contract(auth_entries);
        
        // Call the pool's deposit function
        // deposit(user: address, amounts: vec<u128>, min_shares: u128) -> tuple<vec<u128>,u128>
        // amounts[0] = AQUA, amounts[1] = BLUB (order determined by get_tokens())
        let result = env.try_invoke_contract::<(SorobanVec<u128>, u128), soroban_sdk::Error>(
            &config.liquidity_contract,
            &soroban_sdk::Symbol::new(env, "deposit"),
            (contract_address.clone(), amounts, min_shares).into_val(env),
        );
        
        match result {
            Ok(Ok((_deposited_amounts, lp_shares_minted))) => {
                // Update POL LP position tracking with actual minted shares
                let mut pol = Self::get_pol(env);
                pol.aqua_blub_lp_position = pol.aqua_blub_lp_position.saturating_add(lp_shares_minted as i128);
                env.storage().instance().set(&DataKey::ProtocolOwnedLiquidity, &pol);

                // Emit successful LP deposit event
                env.events().publish(
                    (symbol_short!("pol_lp"),),
                    (aqua_amount, blub_amount, lp_shares_minted as i128),
                );

                Ok(())
            }
            Ok(Err(_)) => {
                env.events().publish(
                    (symbol_short!("pol_err"),),
                    symbol_short!("dep_conv"),
                );
                Err(Error::InvalidInput)
            }
            Err(_) => {
                env.events().publish(
                    (symbol_short!("pol_err"),),
                    symbol_short!("dep_fail"),
                );
                Err(Error::InvalidInput)
            }
        }
    }

    pub fn update_sac_admin(env: Env, admin: Address, new_admin: Address) -> Result<(), Error> {
        admin.require_auth();
        
        // Get config and verify admin authorization
        let config = Self::get_config(env.clone())?;
        if config.admin != admin {
            return Err(Error::Unauthorized);
        }

        use soroban_sdk::token;

        let sac_client = token::StellarAssetClient::new(&env, &config.blub_token);
        sac_client.set_admin(&new_admin);
        
        Ok(())
    }

    /// Stake AQUA tokens and automatically mint BLUB tokens for staking
    /// - Transfers AQUA from user to contract
    /// - Mints equivalent BLUB tokens to contract
    /// - Sends 90% AQUA to ICE contract for governance
    /// - Keeps 10% AQUA for POL
    /// - Stakes ~91% BLUB for rewards
    /// - Automatically deposits ~9% BLUB + 10% AQUA to LP pool
    pub fn stake(
        env: Env,
        user: Address,
        amount: i128,
        duration_periods: u64,
    ) -> Result<u32, Error> {
        // ===== CHECKS =====
        user.require_auth();
        
        if amount <= 0 {
            return Err(Error::InvalidInput);
        }
        
        // ===== RE-ENTRANCY GUARD =====
        let mut global_state = Self::get_global_state(env.clone())?;
        if global_state.locked {
            return Err(Error::ReentrancyDetected);
        }
        global_state.locked = true;
        env.storage().instance().set(&DataKey::GlobalState, &global_state);
        
        // Get config - only use whitelisted AQUA token
        let config = Self::get_config(env.clone())?;
        let contract_address = env.current_contract_address();
        let now = env.ledger().timestamp();
        
        // ===== EFFECTS: UPDATE ALL STATE FIRST =====
        
        // Calculate duration in minutes
        let duration_minutes = duration_periods * config.period_unit_minutes;
        let unlock_timestamp = now + (duration_minutes * 60);

        let pol_aqua = amount / 10;                // 10% AQUA for POL
        let ice_aqua = amount - pol_aqua;          // 90% AQUA to ICE for governance
        
        let reward_multiplier = Self::calculate_lock_multiplier(duration_minutes);
        
        // Get and update lock count before any external calls
        let mut count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::UserLockCount(user.clone()))
            .unwrap_or(0);
        let index = count;
        count = count.saturating_add(1);
        env.storage().persistent().set(&DataKey::UserLockCount(user.clone()), &count);
        
        // Create transaction hash
        let tx_hash_array = env.ledger().sequence().to_be_bytes();
        let tx_hash_bytes = Bytes::from_array(&env, &tx_hash_array);
        
        // Calculate BLUB amounts: mint 1.1x AQUA, stake 1x, LP gets 0.1x
        let blub_minted = (amount * 11) / 10;      // 1.1x AQUA amount
        let blub_staked = amount;                   // 1x AQUA amount staked
        let blub_to_lp = blub_minted - blub_staked; // 0.1x AQUA amount to LP
        
        // Create and store lock entry before external calls
        let lock = LockEntry {
            user: user.clone(),
            amount,                             // Full AQUA amount (for tracking)
            blub_locked: blub_staked,           // BLUB amount locked for staking
            lock_timestamp: now,
            duration_minutes,
            unlock_timestamp,
            reward_multiplier,
            tx_hash: tx_hash_bytes.clone(),
            pol_contributed: pol_aqua,          // Track 10% AQUA to POL
            is_blub_stake: false,
            unlocked: false,                    // Initially locked
        };
        env.storage().persistent().set(&DataKey::UserLockByIndex(user.clone(), index), &lock);
        
        // Update lock totals with both AQUA and BLUB
        Self::update_lock_totals_with_blub(&env, amount, blub_staked, reward_multiplier)?;
        
        // Update POL contribution with both AQUA and BLUB
        Self::update_pol_contribution(&env, pol_aqua, blub_to_lp)?;
        
        // Update global state (but keep locked=true until end)
        global_state.total_locked = global_state.total_locked.saturating_add(amount);
        global_state.total_blub_supply = global_state.total_blub_supply.saturating_add(blub_minted);
        global_state.last_reward_update = now;
        env.storage().instance().set(&DataKey::GlobalState, &global_state);
        
        // ===== INTERACTIONS: EXTERNAL CALLS LAST =====
        
        use soroban_sdk::token;

        let blub_client = token::StellarAssetClient::new(&env, &config.blub_token);
        blub_client.mint(&contract_address, &blub_minted);
        // EXTERNAL CALL #1: Transfer AQUA from user to contract (MUST BE FIRST!)
        let aqua_client = token::Client::new(&env, &config.aqua_token);
        
        // Try the transfer and handle errors properly
        let transfer_result = aqua_client.try_transfer(&user, &contract_address, &amount);
        if transfer_result.is_err() {
            // Release lock before returning error
            global_state.locked = false;
            env.storage().instance().set(&DataKey::GlobalState, &global_state);
            return Err(Error::InsufficientBalance);
        }
        
        // EXTERNAL CALL #2: Send 90% AQUA to ICE contract for governance
        if ice_aqua > 0 {
            let ice_transfer_result = aqua_client.try_transfer(&contract_address, &config.ice_contract, &ice_aqua);
            if ice_transfer_result.is_err() {
                // Release lock before returning error
                global_state.locked = false;
                env.storage().instance().set(&DataKey::GlobalState, &global_state);
                return Err(Error::InvalidInput);
            }
        }
        
        // EXTERNAL CALL #3: Auto-deposit POL (always enabled)
        if pol_aqua > 0 && blub_to_lp > 0 {
            // Verify contract has enough AQUA for POL
            let contract_aqua_balance = aqua_client.balance(&contract_address);
            if contract_aqua_balance < pol_aqua {
                // Release lock before returning error
                global_state.locked = false;
                env.storage().instance().set(&DataKey::GlobalState, &global_state);
                env.events().publish(
                    (symbol_short!("pol_err"),),
                    symbol_short!("no_aqua"),
                );
                return Err(Error::InsufficientBalance);
            }
            
            let pol_result = Self::deposit_pol_to_lp(&env, &config, pol_aqua, blub_to_lp);
            if pol_result.is_err() {
                global_state.locked = false;
                env.storage().instance().set(&DataKey::GlobalState, &global_state);
                env.events().publish(
                    (symbol_short!("pol_err"),),
                    symbol_short!("auto_fail"),
                );
                return Err(Error::InvalidInput);
            }
        }
        
        // ===== RELEASE RE-ENTRANCY LOCK =====
        global_state.locked = false;
        env.storage().instance().set(&DataKey::GlobalState, &global_state);
        
        // ===== EMIT EVENTS (safe, after all operations) =====
        
        // Emit ICE transfer event (90% AQUA to governance)
        env.events().publish(
            (symbol_short!("ice_xfer"), user.clone()),
            ice_aqua,
        );
        
        // Emit lock event
        let event = LockRecordedEvent {
            user: user.clone(),
            amount,
            duration_minutes,
            reward_multiplier,
            tx_hash: tx_hash_bytes.clone(),
            timestamp: now,
            lock_index: index,
            unlock_timestamp,
        };
        env.events().publish((symbol_short!("lock"),), event);
        
        // Emit BLUB staking event
        env.events().publish(
            (symbol_short!("blub_stk"), user.clone()),
            (blub_minted, blub_staked, blub_to_lp),
        );
        
        Ok(index)
    }


    fn create_blub_stake_entry(
        env: &Env,
        user: Address,
        amount: i128,
        duration_minutes: u64,
        timestamp: u64,
    ) -> Result<u32, Error> {
        let unlock_timestamp = timestamp + (duration_minutes * 60);
        let reward_multiplier = Self::calculate_lock_multiplier(duration_minutes);
        
        let mut count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::UserLockCount(user.clone()))
            .unwrap_or(0);
        let index = count;
        count = count.saturating_add(1);
        env.storage().persistent().set(&DataKey::UserLockCount(user.clone()), &count);

        // Create transaction hash
        let tx_hash_array = env.ledger().sequence().to_be_bytes();
        let tx_hash_bytes = Bytes::from_array(env, &tx_hash_array);

        // Create BLUB stake lock entry
        let blub_lock = LockEntry {
            user: user.clone(),
            amount: 0,
            blub_locked: amount,
            lock_timestamp: timestamp,
            duration_minutes,
            unlock_timestamp,
            reward_multiplier,
            tx_hash: tx_hash_bytes.clone(),
            pol_contributed: 0,
            is_blub_stake: true,
            unlocked: false,
        };

        env.storage()
            .persistent()
            .set(&DataKey::UserLockByIndex(user.clone(), index), &blub_lock);

        Self::update_lock_totals_with_blub(env, 0, amount, reward_multiplier)?;

        let mut global_state = Self::get_global_state(env.clone())?;
        global_state.last_reward_update = env.ledger().timestamp();
        env.storage().instance().set(&DataKey::GlobalState, &global_state);

        Ok(index)
    }

    /// This function only records metadata without transferring tokens
    pub fn record_lock(
        env: Env,
        user: Address,
        amount: i128,
        duration_periods: u64,
        tx_hash: Bytes,
    ) -> Result<u32, Error> {
        user.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidInput);
        }

        let mut global_state = Self::get_global_state(env.clone())?;
        if global_state.locked {
            return Err(Error::ReentrancyDetected);
        }
        global_state.locked = true;
        env.storage().instance().set(&DataKey::GlobalState, &global_state);

        let config = Self::get_config(env.clone())?;
        let now = env.ledger().timestamp();

        let duration_minutes = duration_periods * config.period_unit_minutes;
        let unlock_timestamp = now + (duration_minutes * 60);

        let reward_multiplier = Self::calculate_lock_multiplier(duration_minutes);
        
        let pol_contribution = amount / 10;

        let mut count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::UserLockCount(user.clone()))
            .unwrap_or(0);
        let index = count;
        count = count.saturating_add(1);
        env.storage().persistent().set(&DataKey::UserLockCount(user.clone()), &count);

        // Create lock record with POL tracking
        let lock = LockEntry {
            user: user.clone(),
            amount,
            blub_locked: amount,
            lock_timestamp: now,
            duration_minutes,
            unlock_timestamp,
            reward_multiplier,
            tx_hash: tx_hash.clone(),
            pol_contributed: pol_contribution,
            is_blub_stake: false,
            unlocked: false,
        };

        env.storage()
            .persistent()
            .set(&DataKey::UserLockByIndex(user.clone(), index), &lock);

        Self::update_lock_totals(&env, amount, reward_multiplier)?;

        Self::update_pol_contribution(&env, pol_contribution, pol_contribution)?;

        Self::update_global_state(&env, amount, 0, false)?;

        // Emit POL contribution event
        let pol = Self::get_pol(&env);
        let pol_event = PolContributionEvent {
            user: user.clone(),
            aqua_locked: amount,
            pol_aqua_amount: pol_contribution,
            pol_blub_amount: pol_contribution,
            total_pol_aqua: pol.total_aqua_contributed,
            total_pol_blub: pol.total_blub_contributed,
            timestamp: now,
            lock_index: index,
        };
        env.events().publish((symbol_short!("pol"),), pol_event);

        // ===== RELEASE RE-ENTRANCY LOCK =====
        global_state.locked = false;
        env.storage().instance().set(&DataKey::GlobalState, &global_state);

        let event = LockRecordedEvent {
            user: user.clone(),
            amount,
            duration_minutes,
            reward_multiplier,
            tx_hash,
            timestamp: now,
            lock_index: index,
            unlock_timestamp,
        };
        env.events().publish((symbol_short!("lock"),), event);

        Ok(index)
    }

    pub fn record_unlock(env: Env, user: Address, amount: i128, tx_hash: Bytes) -> Result<u32, Error> {
        user.require_auth();
        if amount <= 0 { return Err(Error::InvalidInput); }

        // ===== RE-ENTRANCY GUARD =====
        let mut global_state = Self::get_global_state(env.clone())?;
        if global_state.locked {
            return Err(Error::ReentrancyDetected);
        }
        global_state.locked = true;
        env.storage().instance().set(&DataKey::GlobalState, &global_state);

        let config = Self::get_config(env.clone())?;
        let contract_address = env.current_contract_address();

        let now = env.ledger().timestamp();

        let blub_locked = amount;

        Self::update_global_state_with_blub(&env, -amount, -blub_locked, 0, false)?;

        let mut count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::UserUnlockCount(user.clone()))
            .unwrap_or(0);
        let index = count;
        count = count.saturating_add(1);
        env.storage().persistent().set(&DataKey::UserUnlockCount(user.clone()), &count);

        let entry = UnlockEntry { 
            amount, 
            tx_hash: tx_hash.clone(), 
            timestamp: now,
            claimed: false,
        };
        env.storage().persistent().set(&DataKey::UserUnlockByIndex(user.clone(), index), &entry);

        let mut totals: LockTotals = env
            .storage()
            .persistent()
            .get(&DataKey::UserLockTotals(user.clone()))
            .unwrap_or(LockTotals { 
                total_locked_aqua: 0, 
                total_blub_minted: 0,
                total_entries: 0, 
                last_update_ts: 0,
                accumulated_rewards: 0,
            });

        let pending_blub_rewards = Self::calculate_pending_rewards(&env, &user, &totals, now)?;
        totals.accumulated_rewards = totals.accumulated_rewards.saturating_add(pending_blub_rewards);

        // Transfer LOCKED BLUB + REWARDS from contract to user's wallet
        // Using external BLUB token
        let total_blub_to_transfer = blub_locked + pending_blub_rewards;
        if total_blub_to_transfer > 0 {
            use soroban_sdk::token;
            let blub_client = token::Client::new(&env, &config.blub_token);
            let transfer_result = blub_client.try_transfer(&contract_address, &user, &total_blub_to_transfer);
            if transfer_result.is_err() {
                global_state.locked = false;
                env.storage().instance().set(&DataKey::GlobalState, &global_state);
                return Err(Error::InsufficientBalance);
            }
        }

        // Update user totals
        if totals.total_locked_aqua >= amount {
            totals.total_locked_aqua -= amount;
        } else {
            totals.total_locked_aqua = 0;
        }

        if totals.total_blub_minted >= blub_locked {
            totals.total_blub_minted -= blub_locked;
        } else {
            totals.total_blub_minted = 0;
        }

        totals.last_update_ts = now;
        env.storage().persistent().set(&DataKey::UserLockTotals(user.clone()), &totals);

        // ===== RELEASE RE-ENTRANCY LOCK =====
        global_state.locked = false;
        env.storage().instance().set(&DataKey::GlobalState, &global_state);

        let evt = UnlockRecordedEvent { 
            user: user.clone(), 
            amount, 
            tx_hash, 
            timestamp: now, 
            entry_index: index 
        };
        env.events().publish((symbol_short!("unlock"),), evt);

        Ok(index)
    }

    /// Restake BLUB tokens (stake BLUB to earn more BLUB rewards)
    pub fn stake_blub(
        env: Env,
        user: Address,
        amount: i128,
        duration_periods: u64,
    ) -> Result<u32, Error> {
        user.require_auth();
        
        if amount <= 0 {
            return Err(Error::InvalidInput);
        }

        // ===== RE-ENTRANCY GUARD =====
        let mut global_state = Self::get_global_state(env.clone())?;
        if global_state.locked {
            return Err(Error::ReentrancyDetected);
        }
        global_state.locked = true;
        env.storage().instance().set(&DataKey::GlobalState, &global_state);

        let config = Self::get_config(env.clone())?;
        let contract_address = env.current_contract_address();
        let now = env.ledger().timestamp();
        
        let duration_minutes = duration_periods * config.period_unit_minutes;
        let unlock_timestamp = now + (duration_minutes * 60);
        let reward_multiplier = Self::calculate_lock_multiplier(duration_minutes);
        
        // ===== EFFECTS: UPDATE ALL STATE FIRST =====
        
        let mut count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::UserLockCount(user.clone()))
            .unwrap_or(0);
        let index = count;
        count = count.saturating_add(1);
        env.storage().persistent().set(&DataKey::UserLockCount(user.clone()), &count);

        let tx_hash_array = env.ledger().sequence().to_be_bytes();
        let tx_hash_bytes = Bytes::from_array(&env, &tx_hash_array);

        // Create lock record for BLUB restaking
        let lock = LockEntry {
            user: user.clone(),
            amount: 0,
            blub_locked: amount,
            lock_timestamp: now,
            duration_minutes,
            unlock_timestamp,
            reward_multiplier,
            tx_hash: tx_hash_bytes.clone(),
            pol_contributed: 0,
            is_blub_stake: true,
            unlocked: false,
        };

        env.storage()
            .persistent()
            .set(&DataKey::UserLockByIndex(user.clone(), index), &lock);

        Self::update_lock_totals_with_blub(&env, 0, amount, reward_multiplier)?;

        Self::update_global_state_with_blub(&env, 0, amount, 0, false)?;

        // ===== INTERACTIONS: TRANSFER BLUB LAST =====
        
        use soroban_sdk::token;
        let blub_client = token::Client::new(&env, &config.blub_token);
        let transfer_result = blub_client.try_transfer(&user, &contract_address, &amount);
        if transfer_result.is_err() {
            global_state.locked = false;
            env.storage().instance().set(&DataKey::GlobalState, &global_state);
            return Err(Error::InsufficientBalance);
        }
        
        // ===== RELEASE RE-ENTRANCY LOCK =====
        global_state.locked = false;
        env.storage().instance().set(&DataKey::GlobalState, &global_state);

        env.events().publish(
            (symbol_short!("blub_stk"), user.clone()),
            amount,
        );

        Ok(index)
    }

    pub fn record_blub_restake(env: Env, user: Address, amount: i128, tx_hash: Bytes) -> Result<u32, Error> {
        user.require_auth();
        if amount <= 0 { return Err(Error::InvalidInput); }

        // ===== RE-ENTRANCY GUARD =====
        let mut global_state = Self::get_global_state(env.clone())?;
        if global_state.locked {
            return Err(Error::ReentrancyDetected);
        }
        global_state.locked = true;
        env.storage().instance().set(&DataKey::GlobalState, &global_state);

        let now = env.ledger().timestamp();

        let previous_amount = {
            let current_count: u32 = env
                .storage()
                .persistent()
                .get(&DataKey::UserBlubRestakeCount(user.clone()))
                .unwrap_or(0);
            
            if current_count > 0 {
                env.storage()
                    .persistent()
                    .get::<DataKey, BlubRestakeEntry>(&DataKey::UserBlubRestakeByIndex(user.clone(), current_count - 1))
                    .map(|entry| entry.amount)
                    .unwrap_or(0)
            } else {
                0
            }
        };

        let mut count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::UserBlubRestakeCount(user.clone()))
            .unwrap_or(0);
        let index = count;
        count = count.saturating_add(1);
        env.storage().persistent().set(&DataKey::UserBlubRestakeCount(user.clone()), &count);

        let entry = BlubRestakeEntry { 
            amount, 
            tx_hash: tx_hash.clone(), 
            timestamp: now,
            previous_amount,
        };
        env.storage().persistent().set(&DataKey::UserBlubRestakeByIndex(user.clone(), index), &entry);

        // ===== RELEASE RE-ENTRANCY LOCK =====
        global_state.locked = false;
        env.storage().instance().set(&DataKey::GlobalState, &global_state);

        let evt = BlubRestakeRecordedEvent { 
            user: user.clone(),
            amount, 
            tx_hash, 
            timestamp: now, 
            entry_index: index 
        };
        env.events().publish((symbol_short!("rstk"),), evt);

        Ok(index)
    }

    pub fn record_lp_deposit(
        env: Env,
        admin: Address,
        user: Address,
        pool_id: Bytes,
        amount_a: i128,
        amount_b: i128,
        tx_hash: Bytes,
    ) -> Result<(), Error> {
        let cfg = Self::get_config(env.clone())?;
        admin.require_auth();
        if cfg.admin != admin { return Err(Error::Unauthorized); }
        if amount_a < 0 || amount_b < 0 { return Err(Error::InvalidInput); }

        let now = env.ledger().timestamp();

        let lp_shares = Self::calculate_lp_shares(amount_a, amount_b);

        Self::update_global_state(&env, 0, lp_shares, true)?;

        let mut pools: Vec<Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::UserPools(user.clone()))
            .unwrap_or(Vec::new(&env));
        let mut found = false;
        for existing in pools.iter() {
            if existing == pool_id {
                found = true;
                break;
            }
        }
        if !found {
            pools.push_back(pool_id.clone());
            env.storage().persistent().set(&DataKey::UserPools(user.clone()), &pools);
        }

        let mut pos: LpPosition = env
            .storage()
            .persistent()
            .get(&DataKey::UserLp(user.clone(), pool_id.clone()))
            .unwrap_or(LpPosition {
                pool_id: pool_id.clone(),
                total_asset_a: 0,
                total_asset_b: 0,
                last_tx: Bytes::new(&env),
                last_update_ts: 0,
                lp_shares: 0,
                reward_debt: 0,
            });

        // Calculate pending LP rewards before update
        let global_state = Self::get_global_state(env.clone())?;
        let pending_lp_rewards = pos.lp_shares.saturating_mul(global_state.reward_per_lp_token) / 1_000_000 - pos.reward_debt;

        pos.total_asset_a = pos.total_asset_a.saturating_add(amount_a);
        pos.total_asset_b = pos.total_asset_b.saturating_add(amount_b);
        pos.lp_shares = pos.lp_shares.saturating_add(lp_shares);
        pos.last_tx = tx_hash.clone();
        pos.last_update_ts = now;
        pos.reward_debt = pos.lp_shares.saturating_mul(global_state.reward_per_lp_token) / 1_000_000;

        env.storage()
            .persistent()
            .set(&DataKey::UserLp(user.clone(), pool_id.clone()), &pos);

        // Update user rewards if there were pending rewards
        if pending_lp_rewards > 0 {
            Self::update_user_reward_totals(&env, &user, pending_lp_rewards, 0, now)?;
        }

        let evt = LpDepositRecordedEvent {
            user: user.clone(),
            pool_id,
            amount_a,
            amount_b,
            tx_hash,
            timestamp: now,
        };
        env.events().publish((symbol_short!("lpdep"),), evt);

        Ok(())
    }

    // Reward calculation and distribution functions

    pub fn calculate_user_rewards(env: Env, user: Address) -> Result<UserRewardTotals, Error> {
        let now = env.ledger().timestamp();
        
        // Get current totals
        let mut totals: UserRewardTotals = env
            .storage()
            .persistent()
            .get(&DataKey::UserRewards(user.clone()))
            .unwrap_or(UserRewardTotals { 
                lp_total: 0, 
                locked_total: 0, 
                last_update_ts: 0,
                pending_lp: 0,
                pending_locked: 0,
            });

        // Calculate locked rewards
        let lock_totals: LockTotals = env
            .storage()
            .persistent()
            .get(&DataKey::UserLockTotals(user.clone()))
            .unwrap_or(LockTotals { 
                total_locked_aqua: 0,
                total_blub_minted: 0,
                total_entries: 0, 
                last_update_ts: 0,
                accumulated_rewards: 0,
            });

        let pending_locked_rewards = Self::calculate_pending_rewards(&env, &user, &lock_totals, now)?;
        totals.pending_locked = lock_totals.accumulated_rewards.saturating_add(pending_locked_rewards);

        // Calculate LP rewards for all pools
        let pools: Vec<Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::UserPools(user.clone()))
            .unwrap_or(Vec::new(&env));

        let mut total_pending_lp = 0i128;
        let global_state = Self::get_global_state(env.clone())?;

        for pool_id in pools.iter() {
            if let Some(pos) = env.storage().persistent().get::<DataKey, LpPosition>(&DataKey::UserLp(user.clone(), pool_id.clone())) {
                let pending_pool_rewards = pos.lp_shares.saturating_mul(global_state.reward_per_lp_token) / 1_000_000 - pos.reward_debt;
                total_pending_lp = total_pending_lp.saturating_add(pending_pool_rewards);
            }
        }

        totals.pending_lp = totals.lp_total.saturating_add(total_pending_lp);
        totals.last_update_ts = now;

        Ok(totals)
    }

    pub fn record_reward_distribution(
        env: Env,
        admin: Address,
        kind: u32,
        pool_id: Bytes,
        total_reward: i128,
        distributed_amount: i128,
        treasury_amount: i128,
        tx_hash: Bytes,
    ) -> Result<u32, Error> {
        let cfg = Self::get_config(env.clone())?;
        admin.require_auth();
        if cfg.admin != admin { return Err(Error::Unauthorized); }
        if total_reward < 0 || distributed_amount < 0 || treasury_amount < 0 { 
            return Err(Error::InvalidInput); 
        }

        let now = env.ledger().timestamp();

        // Update global reward rates for gas-efficient future calculations
        Self::update_reward_rates(&env, kind, distributed_amount)?;

        let mut dcount: u32 = env.storage().instance().get(&DataKey::DistributionCount).unwrap_or(0);
        let idx = dcount;
        dcount = dcount.saturating_add(1);
        env.storage().instance().set(&DataKey::DistributionCount, &dcount);

        let global_state = Self::get_global_state(env.clone())?;
        let estimated_users = if kind == 0 { 
            global_state.total_users / 2
        } else { 
            global_state.total_users 
        };

        let dist = RewardDistribution {
            kind,
            pool_id: pool_id.clone(),
            total_reward,
            distributed_amount,
            treasury_amount,
            tx_hash: tx_hash.clone(),
            timestamp: now,
            user_count: estimated_users,
        };
        env.storage().instance().set(&DataKey::DistributionByIndex(idx), &dist);

        let evt = RewardDistributionRecordedEvent {
            kind,
            pool_id,
            total_reward,
            distributed_amount,
            treasury_amount,
            tx_hash,
            timestamp: now,
            distribution_index: idx,
        };
        env.events().publish((symbol_short!("dist"),), evt);

        // Emit batch calculation event for gas tracking
        let batch_evt = BatchRewardCalculatedEvent {
            kind,
            total_amount: distributed_amount,
            user_count: estimated_users,
            timestamp: now,
        };
        env.events().publish((symbol_short!("batch"),), batch_evt);

        Ok(idx)
    }

    pub fn credit_user_reward(
        env: Env,
        admin: Address,
        kind: u32,
        user: Address,
        pool_id: Bytes,
        amount: i128,
        tx_hash: Bytes,
    ) -> Result<(), Error> {
        let cfg = Self::get_config(env.clone())?;
        admin.require_auth();
        if cfg.admin != admin { return Err(Error::Unauthorized); }
        if amount <= 0 { return Err(Error::InvalidInput); }

        let now = env.ledger().timestamp();

        Self::update_user_reward_totals(&env, &user, 
            if kind == 0 { amount } else { 0 },
            if kind == 1 { amount } else { 0 },
            now)?;

        let evt = UserRewardCreditedEvent { 
            kind, 
            user: user.clone(), 
            pool_id, 
            amount, 
            tx_hash, 
            timestamp: now 
        };
        env.events().publish((symbol_short!("ucred"),), evt);
        
        Ok(())
    }

    /// Record POL rewards claimed from AQUA-BLUB pair voting (admin-only)
    pub fn record_pol_rewards(
        env: Env,
        admin: Address,
        reward_amount: i128,
        ice_voting_power: i128,
    ) -> Result<(), Error> {
        let config = Self::get_config(env.clone())?;
        admin.require_auth();
        
        if config.admin != admin {
            return Err(Error::Unauthorized);
        }

        if reward_amount <= 0 {
            return Err(Error::InvalidInput);
        }

        let now = env.ledger().timestamp();

        // Get current POL state
        let mut pol = Self::get_pol(&env);
        pol.total_pol_rewards_earned = pol.total_pol_rewards_earned.saturating_add(reward_amount);
        pol.last_reward_claim = now;
        pol.ice_voting_power_used = ice_voting_power;

        env.storage().instance().set(&DataKey::ProtocolOwnedLiquidity, &pol);

        let user_distribution = (reward_amount * 70) / 100;
        let treasury_amount = reward_amount - user_distribution;

        // Create daily snapshot
        let day = now / 86400;
        env.storage().instance().set(&DataKey::DailyPolSnapshot(day), &pol);

        // Emit POL rewards event
        let event = PolRewardsClaimedEvent {
            reward_amount,
            ice_voting_power,
            total_pol_rewards: pol.total_pol_rewards_earned,
            reward_distribution_to_users: user_distribution,
            treasury_amount,
            timestamp: now,
        };
        env.events().publish((symbol_short!("polrew"),), event);
        
        Ok(())
    }

    fn update_global_state(env: &Env, locked_delta: i128, lp_delta: i128, is_new_user: bool) -> Result<(), Error> {
        let mut global_state = Self::get_global_state(env.clone())?;
        
        global_state.total_locked = global_state.total_locked.saturating_add(locked_delta);
        global_state.total_lp_staked = global_state.total_lp_staked.saturating_add(lp_delta);
        
        if is_new_user {
            global_state.total_users = global_state.total_users.saturating_add(1);
        }
        
        global_state.last_reward_update = env.ledger().timestamp();
        
        env.storage().instance().set(&DataKey::GlobalState, &global_state);
        Ok(())
    }

    /// Update global state including BLUB supply
    fn update_global_state_with_blub(env: &Env, locked_delta: i128, blub_delta: i128, lp_delta: i128, is_new_user: bool) -> Result<(), Error> {
        let mut global_state = Self::get_global_state(env.clone())?;
        
        global_state.total_locked = global_state.total_locked.saturating_add(locked_delta);
        global_state.total_blub_supply = global_state.total_blub_supply.saturating_add(blub_delta);
        global_state.total_lp_staked = global_state.total_lp_staked.saturating_add(lp_delta);
        
        if is_new_user {
            global_state.total_users = global_state.total_users.saturating_add(1);
        }
        
        global_state.last_reward_update = env.ledger().timestamp();
        
        env.storage().instance().set(&DataKey::GlobalState, &global_state);
        Ok(())
    }

    fn update_reward_rates(env: &Env, kind: u32, distributed_amount: i128) -> Result<(), Error> {
        let mut global_state = Self::get_global_state(env.clone())?;
        
        if kind == 0 && global_state.total_lp_staked > 0 {
            let rate_increase = (distributed_amount * 1_000_000) / global_state.total_lp_staked;
            global_state.reward_per_lp_token = global_state.reward_per_lp_token.saturating_add(rate_increase);
        } else if kind == 1 && global_state.total_locked > 0 {
            let rate_increase = (distributed_amount * 1_000_000) / global_state.total_locked;
            global_state.reward_per_locked_token = global_state.reward_per_locked_token.saturating_add(rate_increase);
        }
        
        env.storage().instance().set(&DataKey::GlobalState, &global_state);
        Ok(())
    }

    fn update_user_reward_totals(env: &Env, user: &Address, lp_amount: i128, locked_amount: i128, timestamp: u64) -> Result<(), Error> {
        let mut totals: UserRewardTotals = env
            .storage()
            .persistent()
            .get(&DataKey::UserRewards(user.clone()))
            .unwrap_or(UserRewardTotals { 
                lp_total: 0, 
                locked_total: 0, 
                last_update_ts: 0,
                pending_lp: 0,
                pending_locked: 0,
            });

        totals.lp_total = totals.lp_total.saturating_add(lp_amount);
        totals.locked_total = totals.locked_total.saturating_add(locked_amount);
        totals.last_update_ts = timestamp;
        
        env.storage().persistent().set(&DataKey::UserRewards(user.clone()), &totals);
        Ok(())
    }

    /// Update POL contribution tracking
    fn update_pol_contribution(env: &Env, aqua_amount: i128, blub_amount: i128) -> Result<(), Error> {
        let mut pol: ProtocolOwnedLiquidity = env
            .storage()
            .instance()
            .get(&DataKey::ProtocolOwnedLiquidity)
            .unwrap_or_default();

        pol.total_aqua_contributed = pol.total_aqua_contributed.saturating_add(aqua_amount);
        pol.total_blub_contributed = pol.total_blub_contributed.saturating_add(blub_amount);

        env.storage().instance().set(&DataKey::ProtocolOwnedLiquidity, &pol);

        Ok(())
    }

    /// Get Protocol Owned Liquidity state
    fn get_pol(env: &Env) -> ProtocolOwnedLiquidity {
        env.storage()
            .instance()
            .get(&DataKey::ProtocolOwnedLiquidity)
            .unwrap_or_default()
    }

    fn update_lock_totals(env: &Env, amount: i128, _reward_multiplier: i128) -> Result<(), Error> {
        let mut totals: LockTotals = env
            .storage()
            .persistent()
            .get(&DataKey::LockTotals)
            .unwrap_or(LockTotals {
                total_locked_aqua: 0,
                total_blub_minted: 0,
                total_entries: 0,
                last_update_ts: 0,
                accumulated_rewards: 0,
            });

        totals.total_locked_aqua = totals.total_locked_aqua.saturating_add(amount);
        totals.total_entries = totals.total_entries.saturating_add(1);
        totals.last_update_ts = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::LockTotals, &totals);
        Ok(())
    }

    /// Update lock totals including BLUB minted
    fn update_lock_totals_with_blub(env: &Env, aqua_amount: i128, blub_amount: i128, _reward_multiplier: i128) -> Result<(), Error> {
        let mut totals: LockTotals = env
            .storage()
            .persistent()
            .get(&DataKey::LockTotals)
            .unwrap_or(LockTotals {
                total_locked_aqua: 0,
                total_blub_minted: 0,
                total_entries: 0,
                last_update_ts: 0,
                accumulated_rewards: 0,
            });

        totals.total_locked_aqua = totals.total_locked_aqua.saturating_add(aqua_amount);
        totals.total_blub_minted = totals.total_blub_minted.saturating_add(blub_amount);
        totals.total_entries = totals.total_entries.saturating_add(1);
        totals.last_update_ts = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::LockTotals, &totals);
        Ok(())
    }

    fn calculate_lock_multiplier(duration_minutes: u64) -> i128 {
        // Calculate bonus based on elapsed time: 1 day (1440 min) = 100 bps (1%), max = 10000 bps (100%)
        // Base 100% + up to 100% bonus for longer time staked
        let duration_bonus = ((duration_minutes as i128 * 100) / 1440).min(10000);
        10000 + duration_bonus // The longer staked, the higher the rewards
    }

    fn calculate_lp_shares(amount_a: i128, amount_b: i128) -> i128 {
        if amount_a <= 0 || amount_b <= 0 { return 0; }
        Self::integer_sqrt(amount_a.saturating_mul(amount_b))
    }

    fn integer_sqrt(value: i128) -> i128 {
        if value < 2 { return value; }
        let mut x = value;
        let mut y = (x + 1) / 2;
        while y < x {
            x = y;
            y = (x + value / x) / 2;
        }
        x
    }

    fn calculate_pending_rewards(env: &Env, user: &Address, totals: &LockTotals, current_time: u64) -> Result<i128, Error> {
        if totals.total_locked_aqua == 0 || totals.last_update_ts >= current_time {
            return Ok(0);
        }

        let cfg = Self::get_config(env.clone())?;
        let time_diff = current_time.saturating_sub(totals.last_update_ts);
        let minutes_elapsed = time_diff / 60;
        let periods_elapsed = minutes_elapsed / cfg.period_unit_minutes;

        if periods_elapsed == 0 { return Ok(0); }

        let total_multiplier = Self::get_user_total_multiplier(env, user)?;

        let base_reward = totals.total_locked_aqua
            .saturating_mul(cfg.reward_rate as i128)
            .saturating_mul(periods_elapsed as i128)
            .saturating_mul(total_multiplier)
            / 100_000_000;

        Ok(base_reward)
    }

    fn get_user_total_multiplier(env: &Env, user: &Address) -> Result<i128, Error> {
        let count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::UserLockCount(user.clone()))
            .unwrap_or(0);

        if count == 0 { return Ok(10000); }

        let now = env.ledger().timestamp();
        let mut total_amount = 0i128;
        let mut weighted_multiplier = 0i128;

        for i in 0..count {
            if let Some(entry) = env.storage().persistent().get::<DataKey, LockEntry>(&DataKey::UserLockByIndex(user.clone(), i)) {
                if !entry.unlocked && entry.blub_locked > 0 {
                    // Calculate multiplier based on actual elapsed time since staking
                    let elapsed_seconds = now.saturating_sub(entry.lock_timestamp);
                    let elapsed_minutes = elapsed_seconds / 60;
                    let time_based_multiplier = Self::calculate_lock_multiplier(elapsed_minutes);
                    
                    total_amount = total_amount.saturating_add(entry.blub_locked);
                    weighted_multiplier = weighted_multiplier.saturating_add(
                        entry.blub_locked.saturating_mul(time_based_multiplier)
                    );
                }
            }
        }

        if total_amount == 0 { return Ok(10000); }
        Ok(weighted_multiplier / total_amount)
    }

    pub fn get_global_state(env: Env) -> Result<GlobalState, Error> {
        env.storage()
            .instance()
            .get(&DataKey::GlobalState)
            .ok_or(Error::NotInitialized)
    }

    // Getters (gas-optimized, return only essential data)
    pub fn get_user_lock_totals(env: Env, user: Address) -> Option<LockTotals> {
        env.storage().persistent().get(&DataKey::UserLockTotals(user))
    }

    pub fn get_user_lock_count(env: Env, user: Address) -> u32 {
        env.storage().persistent().get(&DataKey::UserLockCount(user)).unwrap_or(0)
    }

    pub fn get_user_lock_by_index(env: Env, user: Address, index: u32) -> Option<LockEntry> {
        env.storage().persistent().get(&DataKey::UserLockByIndex(user, index))
    }

    pub fn get_user_pools(env: Env, user: Address) -> Vec<Bytes> {
        env.storage().persistent().get(&DataKey::UserPools(user)).unwrap_or(Vec::new(&env))
    }

    pub fn get_user_lp(env: Env, user: Address, pool_id: Bytes) -> Option<LpPosition> {
        env.storage().persistent().get(&DataKey::UserLp(user, pool_id))
    }

    pub fn get_user_rewards(env: Env, user: Address) -> Option<UserRewardTotals> {
        env.storage().persistent().get(&DataKey::UserRewards(user))
    }

    pub fn get_unlock_count(env: Env, user: Address) -> u32 {
        env.storage().persistent().get(&DataKey::UserUnlockCount(user)).unwrap_or(0)
    }

    pub fn get_unlock_by_index(env: Env, user: Address, index: u32) -> Option<UnlockEntry> {
        env.storage().persistent().get(&DataKey::UserUnlockByIndex(user, index))
    }

    pub fn get_blub_restake_count(env: Env, user: Address) -> u32 {
        env.storage().persistent().get(&DataKey::UserBlubRestakeCount(user)).unwrap_or(0)
    }

    pub fn get_blub_restake_by_index(env: Env, user: Address, index: u32) -> Option<BlubRestakeEntry> {
        env.storage().persistent().get(&DataKey::UserBlubRestakeByIndex(user, index))
    }

    pub fn get_distribution_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::DistributionCount).unwrap_or(0)
    }

    pub fn get_distribution_by_index(env: Env, index: u32) -> Option<RewardDistribution> {
        env.storage().instance().get(&DataKey::DistributionByIndex(index))
    }

    /// Get POL state
    pub fn get_protocol_owned_liquidity(env: Env) -> ProtocolOwnedLiquidity {
        Self::get_pol(&env)
    }

    /// Get daily POL snapshot
    pub fn get_daily_pol_snapshot(env: Env, day: u64) -> Option<ProtocolOwnedLiquidity> {
        env.storage().instance().get(&DataKey::DailyPolSnapshot(day))
    }

    /// Get total POL contribution for user
    pub fn get_user_pol_contribution(env: Env, user: Address) -> i128 {
        let count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::UserLockCount(user.clone()))
            .unwrap_or(0);

        let mut total_contribution = 0i128;
        for i in 0..count {
            if let Some(lock) = env.storage().persistent().get::<DataKey, LockEntry>(&DataKey::UserLockByIndex(user.clone(), i)) {
                total_contribution = total_contribution.saturating_add(lock.pol_contributed);
            }
        }

        total_contribution
    }

    /// Returns (aqua_reserve, blub_reserve)
    pub fn get_pool_reserves(env: Env) -> Result<(i128, i128), Error> {
        let config = Self::get_config(env.clone())?;
        
        use soroban_sdk::IntoVal;
        
        // Call get_reserves() -> vec<u128>
        let result = env.try_invoke_contract::<soroban_sdk::Vec<u128>, soroban_sdk::Error>(
            &config.liquidity_contract,
            &soroban_sdk::Symbol::new(&env, "get_reserves"),
            ().into_val(&env),
        );
        
        match result {
            Ok(Ok(reserves)) => {
                if reserves.len() >= 2 {
                    let aqua_reserve = reserves.get(0).unwrap_or(0) as i128;
                    let blub_reserve = reserves.get(1).unwrap_or(0) as i128;
                    Ok((aqua_reserve, blub_reserve))
                } else {
                    Err(Error::InvalidInput)
                }
            }
            Ok(Err(_)) => Err(Error::InvalidInput),
            Err(_) => Err(Error::InvalidInput)
        }
    }

    /// Get the LP share token address from the pool
    pub fn get_pool_share_token(env: Env) -> Result<Address, Error> {
        let config = Self::get_config(env.clone())?;
        
        use soroban_sdk::IntoVal;
        
        let result = env.try_invoke_contract::<Address, soroban_sdk::Error>(
            &config.liquidity_contract,
            &soroban_sdk::Symbol::new(&env, "share_id"),
            ().into_val(&env),
        );
        
        match result {
            Ok(Ok(addr)) => Ok(addr),
            _ => Err(Error::InvalidInput)
        }
    }

    /// Withdraw liquidity from the pool (admin-only)
    /// Used to manage POL or rebalance
    pub fn withdraw_from_pool(
        env: Env,
        admin: Address,
        share_amount: i128,
        min_aqua: i128,
        min_blub: i128,
    ) -> Result<(i128, i128), Error> {
        let config = Self::get_config(env.clone())?;
        admin.require_auth();
        
        if config.admin != admin {
            return Err(Error::Unauthorized);
        }

        if share_amount <= 0 {
            return Err(Error::InvalidInput);
        }

        let contract_address = env.current_contract_address();
        
        use soroban_sdk::IntoVal;
        
        // Prepare min_amounts vector
        let mut min_amounts = soroban_sdk::Vec::new(&env);
        min_amounts.push_back(min_aqua as u128);
        min_amounts.push_back(min_blub as u128);
        
        // Call withdraw(user: address, share_amount: u128, min_amounts: vec<u128>) -> vec<u128>
        let result = env.try_invoke_contract::<soroban_sdk::Vec<u128>, soroban_sdk::Error>(
            &config.liquidity_contract,
            &soroban_sdk::Symbol::new(&env, "withdraw"),
            (contract_address.clone(), share_amount as u128, min_amounts).into_val(&env),
        );
        
        match result {
            Ok(Ok(withdrawn_amounts)) => {
                if withdrawn_amounts.len() >= 2 {
                    let aqua_withdrawn = withdrawn_amounts.get(0).unwrap_or(0) as i128;
                    let blub_withdrawn = withdrawn_amounts.get(1).unwrap_or(0) as i128;
                    
                    // Update POL tracking
                    let mut pol = Self::get_pol(&env);
                    pol.aqua_blub_lp_position = pol.aqua_blub_lp_position.saturating_sub(share_amount);
                    env.storage().instance().set(&DataKey::ProtocolOwnedLiquidity, &pol);
                    
                    // Emit withdrawal event
                    env.events().publish(
                        (symbol_short!("pol_wdrw"),),
                        (share_amount, aqua_withdrawn, blub_withdrawn),
                    );
                    
                    Ok((aqua_withdrawn, blub_withdrawn))
                } else {
                    Err(Error::InvalidInput)
                }
            }
            Ok(Err(_)) => Err(Error::InvalidInput),
            Err(_) => Err(Error::InvalidInput)
        }
    }

    pub fn get_pool_virtual_price(env: Env) -> Result<i128, Error> {
        let config = Self::get_config(env.clone())?;
        
        use soroban_sdk::IntoVal;
        
        let result = env.try_invoke_contract::<u128, soroban_sdk::Error>(
            &config.liquidity_contract,
            &soroban_sdk::Symbol::new(&env, "get_virtual_price"),
            ().into_val(&env),
        );
        
        match result {
            Ok(Ok(price)) => Ok(price as i128),
            _ => Err(Error::InvalidInput)
        }
    }

    /// Claim rewards from the pool (admin-only)
    pub fn claim_pool_rewards(
        env: Env,
        admin: Address,
    ) -> Result<i128, Error> {
        let config = Self::get_config(env.clone())?;
        admin.require_auth();
        
        if config.admin != admin {
            return Err(Error::Unauthorized);
        }

        let contract_address = env.current_contract_address();
        
        use soroban_sdk::IntoVal;
        
        // Call claim(user: address) -> u128
        let result = env.try_invoke_contract::<u128, soroban_sdk::Error>(
            &config.liquidity_contract,
            &soroban_sdk::Symbol::new(&env, "claim"),
            (contract_address.clone(),).into_val(&env),
        );
        
        match result {
            Ok(Ok(reward_amount)) => {
                let mut pol = Self::get_pol(&env);
                pol.total_pol_rewards_earned = pol.total_pol_rewards_earned.saturating_add(reward_amount as i128);
                pol.last_reward_claim = env.ledger().timestamp();
                env.storage().instance().set(&DataKey::ProtocolOwnedLiquidity, &pol);
                
                env.events().publish(
                    (symbol_short!("pool_clm"),),
                    reward_amount as i128,
                );
                
                Ok(reward_amount as i128)
            }
            Ok(Err(_)) => Err(Error::InvalidInput),
            Err(_) => Err(Error::InvalidInput)
        }
    }

    pub fn get_pool_pending_rewards(env: Env) -> Result<i128, Error> {
        let config = Self::get_config(env.clone())?;
        let contract_address = env.current_contract_address();
        
        use soroban_sdk::IntoVal;
        
        let result = env.try_invoke_contract::<u128, soroban_sdk::Error>(
            &config.liquidity_contract,
            &soroban_sdk::Symbol::new(&env, "get_user_reward"),
            (contract_address,).into_val(&env),
        );
        
        match result {
            Ok(Ok(reward)) => Ok(reward as i128),
            _ => Err(Error::InvalidInput)
        }
    }

    // Admin functions for gas optimization
    pub fn update_reward_rate(env: Env, admin: Address, new_rate: i128) -> Result<(), Error> {
        let mut cfg = Self::get_config(env.clone())?;
        admin.require_auth();
        if cfg.admin != admin { return Err(Error::Unauthorized); }
        if new_rate > 1000 { return Err(Error::InvalidInput); }

        cfg.reward_rate = new_rate;
        env.storage().instance().set(&DataKey::Config, &cfg);
        Ok(())
    }

    /// Manually deposit accumulated POL to AQUA-BLUB LP (admin-only)
    pub fn manual_deposit_pol(
        env: Env,
        admin: Address,
        aqua_amount: i128,
        blub_amount: i128,
    ) -> Result<(), Error> {
        let cfg = Self::get_config(env.clone())?;
        admin.require_auth();
        if cfg.admin != admin { return Err(Error::Unauthorized); }

        if aqua_amount <= 0 || blub_amount <= 0 {
            return Err(Error::InvalidInput);
        }

        // Check that contract has enough balance
        use soroban_sdk::token;
        let contract_address = env.current_contract_address();
        
        let aqua_client = token::Client::new(&env, &cfg.aqua_token);
        let aqua_balance = aqua_client.balance(&contract_address);
        if aqua_balance < aqua_amount {
            return Err(Error::InsufficientBalance);
        }

        // Check external BLUB balance
        let blub_client = token::Client::new(&env, &cfg.blub_token);
        let blub_balance = blub_client.balance(&contract_address);
        if blub_balance < blub_amount {
            return Err(Error::InsufficientBalance);
        }

        // Deposit to LP
        Self::deposit_pol_to_lp(&env, &cfg, aqua_amount, blub_amount)?;

        env.events().publish(
            (symbol_short!("man_pol"),),
            (aqua_amount, blub_amount),
        );

        Ok(())
    }


    /// Update liquidity pool contract address (admin-only)
    pub fn update_liquidity_contract(env: Env, admin: Address, new_liquidity_contract: Address) -> Result<(), Error> {
        let mut cfg = Self::get_config(env.clone())?;
        admin.require_auth();
        if cfg.admin != admin { return Err(Error::Unauthorized); }

        cfg.liquidity_contract = new_liquidity_contract.clone();
        env.storage().instance().set(&DataKey::Config, &cfg);
        
        env.events().publish(
            (symbol_short!("liq_upd"),),
            new_liquidity_contract,
        );

        Ok(())
    }

    /// Update ICE contract address (admin-only)
    pub fn update_ice_contract(env: Env, admin: Address, new_ice_contract: Address) -> Result<(), Error> {
        let mut cfg = Self::get_config(env.clone())?;
        admin.require_auth();
        if cfg.admin != admin { return Err(Error::Unauthorized); }

        cfg.ice_contract = new_ice_contract.clone();
        env.storage().instance().set(&DataKey::Config, &cfg);
        
        env.events().publish(
            (symbol_short!("ice_upd"),),
            new_ice_contract,
        );

        Ok(())
    }

    /// Test function to validate staking calculations
    /// Returns (blub_minted, blub_staked, blub_to_lp, pol_aqua, ice_aqua)
    pub fn test_staking_calculations(_env: Env, aqua_amount: i128) -> Result<(i128, i128, i128, i128, i128), Error> {
        if aqua_amount <= 0 {
            return Err(Error::InvalidInput);
        }
        
        let pol_aqua = aqua_amount / 10;                // 10% AQUA for POL
        let ice_aqua = aqua_amount - pol_aqua;          // 90% AQUA to ICE for governance
        
        let blub_minted = (aqua_amount * 11) / 10;      // 1.1x AQUA amount
        let blub_staked = aqua_amount;                   // 1x AQUA amount staked
        let blub_to_lp = blub_minted - blub_staked;     // 0.1x AQUA amount to LP
        
        Ok((blub_minted, blub_staked, blub_to_lp, pol_aqua, ice_aqua))
    }

    /// Get available POL balance that can be deposited to LP
    pub fn get_available_pol_balance(env: Env) -> Result<(i128, i128), Error> {
        let cfg = Self::get_config(env.clone())?;
        let contract_address = env.current_contract_address();
        
        use soroban_sdk::token;
        let aqua_client = token::Client::new(&env, &cfg.aqua_token);
        let blub_client = token::Client::new(&env, &cfg.blub_token);
        
        let aqua_balance = aqua_client.balance(&contract_address);
        let blub_balance = blub_client.balance(&contract_address);
        
        let global_state = Self::get_global_state(env.clone())?;
        let _pol = Self::get_pol(&env);
        
        // Available POL = total contributed - already deposited
        let available_aqua = aqua_balance.saturating_sub(global_state.total_locked);
        let available_blub = blub_balance.saturating_sub(global_state.total_blub_supply);
        
        Ok((available_aqua, available_blub))
    }

    /// This avoids re-entry by processing stakes in separate transaction
    pub fn process_pending_stakes(env: Env, max_count: u32) -> Result<u32, Error> {
        let pending_count: u32 = env.storage().instance().get(&DataKey::PendingStakeCount).unwrap_or(0);
        
        let mut processed = 0u32;
        let process_limit = max_count.min(pending_count).min(10);
        
        for i in 0..process_limit {
            if let Some(mut pending) = env.storage().instance().get::<DataKey, PendingStake>(&DataKey::PendingStakeByIndex(i)) {
                if !pending.processed {
                    let now = env.ledger().timestamp();
                    let _ = Self::create_blub_stake_entry(
                        &env,
                        pending.user.clone(),
                        pending.amount,
                        pending.duration_minutes,
                        now,
                    );
                    
                    pending.processed = true;
                    env.storage().instance().set(&DataKey::PendingStakeByIndex(i), &pending);
                    
                    env.events().publish(
                        (symbol_short!("stk_proc"), pending.user.clone()),
                        (pending.amount, i),
                    );
                    
                    processed += 1;
                }
            }
        }
        
        Ok(processed)
    }

    /// Get pending stake count
    pub fn get_pending_stake_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::PendingStakeCount).unwrap_or(0)
    }

    /// Get pending stake by index
    pub fn get_pending_stake(env: Env, index: u32) -> Option<PendingStake> {
        env.storage().instance().get(&DataKey::PendingStakeByIndex(index))
    }

    // ============================================================================
    // ADMIN FUNCTIONS - Staking Period Configuration
    // ============================================================================

    pub fn update_period_unit(
        env: Env,
        admin: Address,
        period_unit_minutes: u64,
    ) -> Result<(), Error> {
        admin.require_auth();

        let mut config = Self::get_config(env.clone())?;
        
        if config.admin != admin {
            return Err(Error::Unauthorized);
        }

        if period_unit_minutes == 0 {
            return Err(Error::InvalidPeriod);
        }

        config.period_unit_minutes = period_unit_minutes;
        env.storage().instance().set(&DataKey::Config, &config);

        env.events().publish(
            (symbol_short!("period_up"),),
            period_unit_minutes,
        );

        Ok(())
    }

    // ============================================================================
    // USER STAKING INFO
    // ===========================================================================

    pub fn get_user_staking_info(env: Env, user: Address) -> Result<UserStakingInfo, Error> {
        let now = env.ledger().timestamp();
        
        let count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::UserLockCount(user.clone()))
            .unwrap_or(0);

        let mut total_staked_blub = 0i128;
        let mut unstaking_available = 0i128;
        let mut total_locked_entries = 0u32;
        let mut total_unlocked_entries = 0u32;

        for i in 0..count {
            if let Some(entry) = env.storage().persistent().get::<DataKey, LockEntry>(&DataKey::UserLockByIndex(user.clone(), i)) {
                if entry.unlocked {
                    // Already unstaked - count as available
                    unstaking_available = unstaking_available.saturating_add(entry.blub_locked);
                    total_unlocked_entries += 1;
                } else {
                    // Currently staked - all are immediately unstakable
                    total_staked_blub = total_staked_blub.saturating_add(entry.blub_locked);
                    total_locked_entries += 1;
                }
            }
        }

        // Get accumulated and pending rewards
        let lock_totals: LockTotals = env
            .storage()
            .persistent()
            .get(&DataKey::UserLockTotals(user.clone()))
            .unwrap_or(LockTotals { 
                total_locked_aqua: 0,
                total_blub_minted: 0,
                total_entries: 0, 
                last_update_ts: 0,
                accumulated_rewards: 0,
            });

        let pending_rewards = Self::calculate_pending_rewards(&env, &user, &lock_totals, now)?;

        Ok(UserStakingInfo {
            total_staked_blub,
            unstaking_available,
            accumulated_rewards: lock_totals.accumulated_rewards,
            pending_rewards,
            total_locked_entries,
            total_unlocked_entries,
        })
    }

    pub fn unstake(
        env: Env,
        user: Address,
        amount: i128,
    ) -> Result<(), Error> {
        user.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidInput);
        }

        // ===== RE-ENTRANCY GUARD =====
        let mut global_state = Self::get_global_state(env.clone())?;
        if global_state.locked {
            return Err(Error::ReentrancyDetected);
        }
        global_state.locked = true;
        env.storage().instance().set(&DataKey::GlobalState, &global_state);

        let now = env.ledger().timestamp();
        let contract_address = env.current_contract_address();
        
        let count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::UserLockCount(user.clone()))
            .unwrap_or(0);

        if count == 0 {
            global_state.locked = false;
            env.storage().instance().set(&DataKey::GlobalState, &global_state);
            return Err(Error::NotFound);
        }

        let mut remaining_amount = amount;
        let mut total_blub_unstaked = 0i128;
        let mut total_aqua_unlocked = 0i128;

        // Find and mark unlocked entries for unstaking
        for i in 0..count {
            if remaining_amount <= 0 {
                break;
            }

            if let Some(mut entry) = env.storage().persistent().get::<DataKey, LockEntry>(&DataKey::UserLockByIndex(user.clone(), i)) {
                // Allow immediate unstaking - no time-based restrictions
                if entry.blub_locked > 0 && !entry.unlocked {
                    let unstake_from_entry = remaining_amount.min(entry.blub_locked);
                    
                    total_blub_unstaked = total_blub_unstaked.saturating_add(unstake_from_entry);
                    total_aqua_unlocked = total_aqua_unlocked.saturating_add(entry.amount);
                    
                    entry.blub_locked = entry.blub_locked.saturating_sub(unstake_from_entry);
                    entry.unlocked = true;
                    
                    env.storage().persistent().set(&DataKey::UserLockByIndex(user.clone(), i), &entry);
                    
                    remaining_amount = remaining_amount.saturating_sub(unstake_from_entry);
                }
            }
        }

        if total_blub_unstaked == 0 {
            global_state.locked = false;
            env.storage().instance().set(&DataKey::GlobalState, &global_state);
            return Err(Error::NoUnlockableAmount);
        }

        // Calculate and add pending rewards
        let mut totals: LockTotals = env
            .storage()
            .persistent()
            .get(&DataKey::UserLockTotals(user.clone()))
            .unwrap_or(LockTotals { 
                total_locked_aqua: 0, 
                total_blub_minted: 0,
                total_entries: 0, 
                last_update_ts: 0,
                accumulated_rewards: 0,
            });

        let pending_blub_rewards = Self::calculate_pending_rewards(&env, &user, &totals, now)?;
        totals.accumulated_rewards = totals.accumulated_rewards.saturating_add(pending_blub_rewards);

        let total_blub_to_transfer = total_blub_unstaked + pending_blub_rewards;
        if total_blub_to_transfer > 0 {
            use soroban_sdk::token;
            let config = Self::get_config(env.clone())?;
            let blub_client = token::Client::new(&env, &config.blub_token);
            let transfer_result = blub_client.try_transfer(&contract_address, &user, &total_blub_to_transfer);
            if transfer_result.is_err() {
                global_state.locked = false;
                env.storage().instance().set(&DataKey::GlobalState, &global_state);
                return Err(Error::InsufficientBalance);
            }
        }

        totals.total_locked_aqua = totals.total_locked_aqua.saturating_sub(total_aqua_unlocked);
        totals.total_blub_minted = totals.total_blub_minted.saturating_sub(total_blub_unstaked);
        totals.last_update_ts = now;
        env.storage().persistent().set(&DataKey::UserLockTotals(user.clone()), &totals);

        global_state.total_locked = global_state.total_locked.saturating_sub(total_aqua_unlocked);
        global_state.total_blub_supply = global_state.total_blub_supply.saturating_sub(total_blub_unstaked);
        global_state.locked = false;
        env.storage().instance().set(&DataKey::GlobalState, &global_state);

        env.events().publish(
            (symbol_short!("unstake"), user.clone()),
            (total_blub_unstaked, pending_blub_rewards),
        );

        Ok(())
    }
}

// Default implementation for POL
impl Default for ProtocolOwnedLiquidity {
    fn default() -> Self {
        Self {
            total_aqua_contributed: 0,
            total_blub_contributed: 0,
            aqua_blub_lp_position: 0,
            total_pol_rewards_earned: 0,
            last_reward_claim: 0,
            ice_voting_power_used: 0,
        }
    }
} 