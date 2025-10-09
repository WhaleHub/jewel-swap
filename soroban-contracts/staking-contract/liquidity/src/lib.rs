#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Bytes, Env, Vec,
};

// ============================================================================
// Data Types
// ============================================================================

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Config {
    pub admin: Address,
    pub version: u32,
    pub min_liquidity: i128,
    pub default_fee_rate: i128, // Basis points (30 = 0.3%)
    pub max_pools: u32,
    pub paused: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LiquidityPool {
    pub pool_id: Bytes,
    pub token_a: Address,
    pub token_b: Address,
    pub total_liquidity: i128,
    pub reserve_a: i128,
    pub reserve_b: i128,
    pub fee_rate: i128, // Basis points
    pub created_at: u64,
    pub active: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LPPosition {
    pub user: Address,
    pub pool_id: Bytes,
    pub lp_amount: i128,
    pub asset_a_deposited: i128,
    pub asset_b_deposited: i128,
    pub timestamp: u64,
    pub last_reward_claim: u64,
    pub total_fees_earned: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GlobalLiquidityStats {
    pub total_value_locked: i128,
    pub total_pools: u32,
    pub total_lp_providers: u32,
    pub total_fees_collected: i128,
    pub last_update: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Config,
    Pool(Bytes),
    UserLPPosition(Address, Bytes),
    UserPools(Address),
    PoolCount,
    GlobalLiquidityStats,
    PoolSnapshot(Bytes, u64),
    FeesCollected(Bytes, u64),
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    InvalidInput = 4,
    PoolNotFound = 5,
    InsufficientLiquidity = 6,
    InvalidTokens = 7,
    InvalidFeeRate = 8,
    ContractPaused = 9,
    PoolLimitReached = 10,
    PositionNotFound = 11,
    NumericOverflow = 12,
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

// ============================================================================
// Contract Implementation
// ============================================================================

#[contract]
pub struct LiquidityContract;

#[contractimpl]
impl LiquidityContract {
    /// Initialize the liquidity pool contract
    pub fn initialize(
        env: Env,
        admin: Address,
        min_liquidity: i128,
        default_fee_rate: i128,
        max_pools: u32,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Config) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();

        // Validate parameters
        if default_fee_rate > 1000 {
            return Err(Error::InvalidFeeRate);
        }
        if min_liquidity <= 0 {
            return Err(Error::InsufficientLiquidity);
        }

        let config = Config {
            admin,
            version: 1,
            min_liquidity,
            default_fee_rate,
            max_pools,
            paused: false,
        };
        env.storage().instance().set(&DataKey::Config, &config);

        // Initialize global stats
        let stats = GlobalLiquidityStats {
            total_value_locked: 0,
            total_pools: 0,
            total_lp_providers: 0,
            total_fees_collected: 0,
            last_update: env.ledger().timestamp(),
        };
        env.storage().instance().set(&DataKey::GlobalLiquidityStats, &stats);
        env.storage().instance().set(&DataKey::PoolCount, &0u32);

        Ok(())
    }

    /// Get configuration
    pub fn get_config(env: Env) -> Result<Config, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(Error::NotInitialized)
    }

    /// Register a new liquidity pool
    pub fn register_pool(
        env: Env,
        admin: Address,
        pool_id: Bytes,
        token_a: Address,
        token_b: Address,
        initial_a: i128,
        initial_b: i128,
        fee_rate: Option<i128>,
    ) -> Result<(), Error> {
        admin.require_auth();

        let config = Self::get_config(env.clone())?;
        
        if config.admin != admin {
            return Err(Error::Unauthorized);
        }

        if config.paused {
            return Err(Error::ContractPaused);
        }

        // Check pool limit
        let pool_count: u32 = env.storage().instance().get(&DataKey::PoolCount).unwrap_or(0);
        if pool_count >= config.max_pools {
            return Err(Error::PoolLimitReached);
        }

        // Validate tokens
        if token_a == token_b {
            return Err(Error::InvalidTokens);
        }

        // Check if pool already exists
        if env.storage().instance().has(&DataKey::Pool(pool_id.clone())) {
            return Err(Error::AlreadyInitialized);
        }

        let fee = fee_rate.unwrap_or(config.default_fee_rate);
        if fee > 1000 {
            return Err(Error::InvalidFeeRate);
        }

        // Calculate initial liquidity
        let initial_liquidity = Self::calculate_lp_tokens(initial_a, initial_b, 0);

        if initial_liquidity < config.min_liquidity {
            return Err(Error::InsufficientLiquidity);
        }

        let pool = LiquidityPool {
            pool_id: pool_id.clone(),
            token_a: token_a.clone(),
            token_b: token_b.clone(),
            total_liquidity: initial_liquidity,
            reserve_a: initial_a,
            reserve_b: initial_b,
            fee_rate: fee,
            created_at: env.ledger().timestamp(),
            active: true,
        };

        env.storage().instance().set(&DataKey::Pool(pool_id.clone()), &pool);
        
        let new_count = pool_count.saturating_add(1);
        env.storage().instance().set(&DataKey::PoolCount, &new_count);

        // Update global stats
        Self::update_liquidity_stats(&env, initial_a + initial_b, 1, 0, 0)?;

        env.events().publish(
            (symbol_short!("pool_reg"),),
            (pool_id, token_a, token_b),
        );

        Ok(())
    }

    /// Record liquidity addition
    pub fn add_liquidity(
        env: Env,
        admin: Address,
        user: Address,
        pool_id: Bytes,
        amount_a: i128,
        amount_b: i128,
        lp_tokens_minted: i128,
    ) -> Result<(), Error> {
        admin.require_auth();

        let config = Self::get_config(env.clone())?;
        
        if config.admin != admin {
            return Err(Error::Unauthorized);
        }

        if config.paused {
            return Err(Error::ContractPaused);
        }

        // Validate inputs
        if amount_a <= 0 || amount_b <= 0 || lp_tokens_minted <= 0 {
            return Err(Error::InsufficientLiquidity);
        }

        // Get pool
        let mut pool: LiquidityPool = env.storage().instance()
            .get(&DataKey::Pool(pool_id.clone()))
            .ok_or(Error::PoolNotFound)?;

        if !pool.active {
            return Err(Error::ContractPaused);
        }

        // Update pool reserves
        pool.reserve_a = pool.reserve_a.saturating_add(amount_a);
        pool.reserve_b = pool.reserve_b.saturating_add(amount_b);
        pool.total_liquidity = pool.total_liquidity.saturating_add(lp_tokens_minted);

        env.storage().instance().set(&DataKey::Pool(pool_id.clone()), &pool);

        // Update or create user LP position
        let current_time = env.ledger().timestamp();
        let mut position: LPPosition = env.storage().persistent()
            .get(&DataKey::UserLPPosition(user.clone(), pool_id.clone()))
            .unwrap_or(LPPosition {
                user: user.clone(),
                pool_id: pool_id.clone(),
                lp_amount: 0,
                asset_a_deposited: 0,
                asset_b_deposited: 0,
                timestamp: current_time,
                last_reward_claim: current_time,
                total_fees_earned: 0,
            });

        // Track if new LP provider
        let is_new_provider = position.lp_amount == 0;

        position.lp_amount = position.lp_amount.saturating_add(lp_tokens_minted);
        position.asset_a_deposited = position.asset_a_deposited.saturating_add(amount_a);
        position.asset_b_deposited = position.asset_b_deposited.saturating_add(amount_b);

        env.storage().persistent().set(&DataKey::UserLPPosition(user.clone(), pool_id.clone()), &position);

        // Add pool to user's pool list if new
        if is_new_provider {
            let mut user_pools: Vec<Bytes> = env.storage().persistent()
                .get(&DataKey::UserPools(user.clone()))
                .unwrap_or(Vec::new(&env));
            
            user_pools.push_back(pool_id.clone());
            env.storage().persistent().set(&DataKey::UserPools(user.clone()), &user_pools);
        }

        // Update global stats
        let tvl_increase = amount_a + amount_b;
        let new_providers = if is_new_provider { 1 } else { 0 };
        Self::update_liquidity_stats(&env, tvl_increase, 0, new_providers, 0)?;

        env.events().publish(
            (symbol_short!("lp_add"),),
            (user, pool_id, amount_a, amount_b, lp_tokens_minted),
        );

        Ok(())
    }

    /// Remove liquidity
    pub fn remove_liquidity(
        env: Env,
        admin: Address,
        user: Address,
        pool_id: Bytes,
        lp_tokens_burned: i128,
        amount_a_returned: i128,
        amount_b_returned: i128,
    ) -> Result<(), Error> {
        admin.require_auth();

        let config = Self::get_config(env.clone())?;
        
        if config.admin != admin {
            return Err(Error::Unauthorized);
        }

        // Validate inputs
        if lp_tokens_burned <= 0 || amount_a_returned <= 0 || amount_b_returned <= 0 {
            return Err(Error::InvalidInput);
        }

        // Get pool
        let mut pool: LiquidityPool = env.storage().instance()
            .get(&DataKey::Pool(pool_id.clone()))
            .ok_or(Error::PoolNotFound)?;

        // Get user position
        let mut position: LPPosition = env.storage().persistent()
            .get(&DataKey::UserLPPosition(user.clone(), pool_id.clone()))
            .ok_or(Error::PositionNotFound)?;

        if position.lp_amount < lp_tokens_burned {
            return Err(Error::InsufficientLiquidity);
        }

        // Update pool reserves
        pool.reserve_a = pool.reserve_a.saturating_sub(amount_a_returned);
        pool.reserve_b = pool.reserve_b.saturating_sub(amount_b_returned);
        pool.total_liquidity = pool.total_liquidity.saturating_sub(lp_tokens_burned);

        env.storage().instance().set(&DataKey::Pool(pool_id.clone()), &pool);

        // Update user position
        position.lp_amount = position.lp_amount.saturating_sub(lp_tokens_burned);
        position.asset_a_deposited = position.asset_a_deposited.saturating_sub(amount_a_returned);
        position.asset_b_deposited = position.asset_b_deposited.saturating_sub(amount_b_returned);

        env.storage().persistent().set(&DataKey::UserLPPosition(user.clone(), pool_id.clone()), &position);

        // Update global stats
        let tvl_decrease = -(amount_a_returned + amount_b_returned);
        Self::update_liquidity_stats(&env, tvl_decrease, 0, 0, 0)?;

        env.events().publish(
            (symbol_short!("lp_rem"),),
            (user, pool_id, lp_tokens_burned, amount_a_returned, amount_b_returned),
        );

        Ok(())
    }

    /// Get pool information
    pub fn get_pool(env: Env, pool_id: Bytes) -> Option<LiquidityPool> {
        env.storage().instance().get(&DataKey::Pool(pool_id))
    }

    /// Get user LP position
    pub fn get_user_position(env: Env, user: Address, pool_id: Bytes) -> Option<LPPosition> {
        env.storage().persistent().get(&DataKey::UserLPPosition(user, pool_id))
    }

    /// Get user's pool list
    pub fn get_user_pools(env: Env, user: Address) -> Vec<Bytes> {
        env.storage().persistent().get(&DataKey::UserPools(user)).unwrap_or(Vec::new(&env))
    }

    /// Get pool count
    pub fn get_pool_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::PoolCount).unwrap_or(0)
    }

    /// Get global liquidity stats
    pub fn get_global_stats(env: Env) -> Option<GlobalLiquidityStats> {
        env.storage().instance().get(&DataKey::GlobalLiquidityStats)
    }

    /// Toggle pool active status
    pub fn toggle_pool(
        env: Env,
        admin: Address,
        pool_id: Bytes,
        active: bool,
    ) -> Result<(), Error> {
        admin.require_auth();

        let config = Self::get_config(env.clone())?;
        
        if config.admin != admin {
            return Err(Error::Unauthorized);
        }

        let mut pool: LiquidityPool = env.storage().instance()
            .get(&DataKey::Pool(pool_id.clone()))
            .ok_or(Error::PoolNotFound)?;

        pool.active = active;
        env.storage().instance().set(&DataKey::Pool(pool_id.clone()), &pool);

        env.events().publish(
            (symbol_short!("pool_tgl"),),
            (pool_id, active),
        );
        
        Ok(())
    }

    /// Pause/unpause contract
    pub fn set_paused(env: Env, admin: Address, paused: bool) -> Result<(), Error> {
        admin.require_auth();

        let mut config = Self::get_config(env.clone())?;
        
        if config.admin != admin {
            return Err(Error::Unauthorized);
        }

        config.paused = paused;
        env.storage().instance().set(&DataKey::Config, &config);

        env.events().publish(
            (symbol_short!("paused"),),
            paused,
        );

        Ok(())
    }

    /// Update default fee rate
    pub fn update_fee_rate(env: Env, admin: Address, new_rate: i128) -> Result<(), Error> {
        admin.require_auth();

        let mut config = Self::get_config(env.clone())?;
        
        if config.admin != admin {
            return Err(Error::Unauthorized);
        }

        if new_rate > 1000 {
            return Err(Error::InvalidFeeRate);
        }

        config.default_fee_rate = new_rate;
        env.storage().instance().set(&DataKey::Config, &config);

        Ok(())
    }

    // ============================================================================
    // Internal Helper Functions
    // ============================================================================

    fn update_liquidity_stats(
        env: &Env, 
        tvl_delta: i128, 
        pools_delta: u32, 
        providers_delta: u32, 
        fees_delta: i128
    ) -> Result<(), Error> {
        let mut stats: GlobalLiquidityStats = env.storage().instance()
            .get(&DataKey::GlobalLiquidityStats)
            .unwrap_or(GlobalLiquidityStats {
                total_value_locked: 0,
                total_pools: 0,
                total_lp_providers: 0,
                total_fees_collected: 0,
                last_update: 0,
            });

        stats.total_value_locked = stats.total_value_locked.saturating_add(tvl_delta);
        stats.total_pools = stats.total_pools.saturating_add(pools_delta);
        stats.total_lp_providers = stats.total_lp_providers.saturating_add(providers_delta);
        stats.total_fees_collected = stats.total_fees_collected.saturating_add(fees_delta);
        stats.last_update = env.ledger().timestamp();

        env.storage().instance().set(&DataKey::GlobalLiquidityStats, &stats);
        Ok(())
    }

    fn calculate_lp_tokens(amount_a: i128, amount_b: i128, existing_liquidity: i128) -> i128 {
        if existing_liquidity == 0 {
            // Initial liquidity: geometric mean
            Self::integer_sqrt(amount_a.saturating_mul(amount_b))
        } else {
            // Subsequent liquidity: maintain ratio
            amount_a.min(amount_b)
        }
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
}

