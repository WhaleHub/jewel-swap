#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Bytes, Env, Vec, Symbol, IntoVal,
    auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation},
};

// ============================================================================
// Aquarius Pool Interface (External Contract)
// ============================================================================

mod aquarius_pool {
    use soroban_sdk::{Address, Env, Map, Symbol, Val, Vec, contractclient};

    #[contractclient(name = "AquariusPoolClient")]
    pub trait AquariusPoolTrait {
        /// Claims rewards from the pool
        /// Returns: Amount of reward tokens claimed
        fn claim(env: Env, user: Address) -> u128;

        /// Deposits tokens to the pool
        /// Parameters:
        /// - user: Address depositing
        /// - desired_amounts: Vec<u128> of [token_a_amount, token_b_amount]
        /// - min_shares: u128 minimum LP tokens to receive
        /// Returns: (actual_amounts: Vec<u128>, shares_minted: u128)
        fn deposit(
            env: Env,
            user: Address,
            desired_amounts: Vec<u128>,
            min_shares: u128,
        ) -> (Vec<u128>, u128);

        /// Withdraws from the pool
        /// Parameters:
        /// - user: Address withdrawing
        /// - share_amount: u128 LP tokens to burn
        /// - min_amounts: Vec<u128> minimum tokens to receive
        /// Returns: Vec<u128> actual amounts withdrawn
        fn withdraw(
            env: Env,
            user: Address,
            share_amount: u128,
            min_amounts: Vec<u128>,
        ) -> Vec<u128>;

        /// Gets pool information
        fn get_info(env: Env) -> Map<Symbol, Val>;

        /// Gets pool reserves
        fn get_reserves(env: Env) -> Vec<u128>;

        /// Gets total LP shares in circulation
        fn get_total_shares(env: Env) -> u128;
    }
}

use aquarius_pool::AquariusPoolClient;

/// Old Config struct for migration (matches deployed v1.0.0 contract)
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OldConfig {
    pub admin: Address,
    pub aqua_token: Address,
    pub blub_token: Address,
    pub ice_contract: Address,
    pub liquidity_contract: Address,
    pub period_unit_minutes: u64,
    pub reward_rate: i128,
    pub total_supply: i128,
    pub treasury_address: Address,
    pub version: u32,
}

/// Config struct for v1.1.0 (before cooldown fields were added)
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConfigV1_1 {
    pub admin: Address,
    pub version: u32,
    pub total_supply: i128,
    pub treasury_address: Address,
    pub reward_rate: i128,
    pub aqua_token: Address,
    pub blub_token: Address,
    pub liquidity_contract: Address,
    pub ice_token: Address,
    pub govern_ice_token: Address,
    pub upvote_ice_token: Address,
    pub downvote_ice_token: Address,
    pub period_unit_minutes: u64,
    pub vault_treasury: Address,
    pub vault_fee_bps: u32,
}

/// New Config struct (v1.2.0)
/// Version encoding: major * 10000 + minor * 100 + patch
/// 1.2.0 = 10200
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Config {
    pub admin: Address,
    pub version: u32, // 10200 = v1.2.0
    pub total_supply: i128,
    pub treasury_address: Address,
    pub reward_rate: i128, // basis points per period
    pub aqua_token: Address, // AQUA token contract address
    pub blub_token: Address, // External BLUB token (Stellar asset)
    pub liquidity_contract: Address, // AQUA/BLUB StableSwap pool contract on Stellar network
    // ICE token addresses (4 types)
    pub ice_token: Address, // Base ICE token (SAC)
    pub govern_ice_token: Address, // governICE token (SAC)
    pub upvote_ice_token: Address, // upvoteICE token (SAC)
    pub downvote_ice_token: Address, // downvoteICE token (SAC)
    pub period_unit_minutes: u64, // Staking period unit in minutes
    // Vault settings
    pub vault_treasury: Address, // Treasury for vault fees (30%)
    pub vault_fee_bps: u32, // Vault fee in basis points (3000 = 30%)
    // Cooldown settings (v1.2.0)
    pub unstake_cooldown_seconds: u64,      // Default: 864000 (10 days)
    pub claim_reward_cooldown_seconds: u64, // Default: 604800 (7 days)
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IceTokens {
    pub ice_token: Address,           // Base ICE token (SAC)
    pub govern_ice_token: Address,    // governICE token (SAC)
    pub upvote_ice_token: Address,    // upvoteICE token (SAC)
    pub downvote_ice_token: Address,  // downvoteICE token (SAC)
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

// ============================================================================
// SYNTHETIX-STYLE REWARD SYSTEM (v1.2.0)
// ============================================================================

/// Precision constant for reward calculations (1e12)
/// Used to maintain precision in reward_per_token calculations
pub const REWARD_PRECISION: i128 = 1_000_000_000_000;

/// Global reward state - tracks accumulated rewards for the entire pool
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RewardState {
    pub reward_per_token_stored: i128,
    pub last_update_time: u64,
    pub total_staked: i128,
    pub total_rewards_added: i128,
    pub total_rewards_claimed: i128,
}

/// Per-user reward state - tracks each user's reward accounting
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserRewardState {
    pub staked_balance: i128,
    pub reward_per_token_paid: i128,
    pub rewards_earned: i128,
    pub last_claim_time: u64,
    pub total_claimed: i128,
}

/// Event emitted when backend adds rewards
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RewardsAddedEvent {
    pub amount: i128,
    pub total_staked: i128,
    pub reward_per_token: i128,
    pub timestamp: u64,
}

/// Event emitted when user claims rewards
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RewardsClaimedEvent {
    pub user: Address,
    pub amount: i128,
    pub total_claimed: i128,
    pub timestamp: u64,
}

/// User reward info for view function
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserRewardInfo {
    pub pending_rewards: i128,
    pub total_claimed: i128,
    pub staked_balance: i128,
    pub last_claim_time: u64,
    pub can_claim: bool,
    pub claim_available_at: u64,
}

/// Unstake status for a specific lock entry
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UnstakeStatus {
    pub can_unstake: bool,
    pub unstake_available_at: u64,
    pub blub_amount: i128,
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
    pub lock_counter: u64,                // Counter for generating predictable lock IDs
    // ICE locking (Request 1)
    pub pending_aqua_for_ice: i128,      // AQUA accumulated for ICE locking
    pub ice_balance: i128,                // Base ICE token balance
    pub govern_ice_balance: i128,         // governICE token balance
    pub upvote_ice_balance: i128,         // upvoteICE token balance
    pub downvote_ice_balance: i128,       // downvoteICE token balance
    pub ice_lock_counter: u64,            // Counter for ICE lock authorizations
    // Vault (Request 2)
    pub pool_count: u32,                  // Number of vault pools (max 10)
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
// ICE Locking Structures (Request 1)
// ============================================================================

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IceLockAuthorization {
    pub lock_id: u64,
    pub aqua_amount: i128,
    pub duration_years: u64,
    pub authorized_at: u64,
    pub executed: bool,
}

// ============================================================================
// Vault Structures (Request 2)
// ============================================================================

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PoolInfo {
    pub pool_id: u32,
    pub pool_address: Address, // Aquarius pool contract
    pub token_a: Address,
    pub token_b: Address,
    pub share_token: Address, // LP token address
    pub total_lp_tokens: i128, // Contract's total LP in this pool
    pub active: bool,
    pub added_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserVaultPosition {
    pub user: Address,
    pub pool_id: u32,
    pub share_ratio: i128, // User's share in basis points × 1000000 (10 decimals precision)
    pub deposited_at: u64,
    pub active: bool,
}

// ============================================================================
// Liquidity Pool Integration (AQUA/BLUB AMM Pool)
// ============================================================================

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Config,
    UserLockByTxHash(Address, Bytes),
    UserLocks(Address), // Vector of all lock tx hashes for a user
    UserLpCount(Address),
    UserLpByIndex(Address, u32),
    UserUnlockByTxHash(Address, Bytes),
    UserUnlocks(Address), // Vector of all unlock tx hashes for a user
    UserBlubRestakeByTxHash(Address, Bytes),
    UserBlubRestakes(Address), // Vector of all BLUB restake tx hashes for a user
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
    // ICE locking (Request 1)
    IceLockAuth(u64), // ICE lock authorization by ID
    // Vault (Request 2)
    PoolInfo(u32), // Pool info by pool_id
    UserVaultPosition(Address, u32), // User vault position by (user, pool_id)
    // Synthetix-style Reward System (v1.2.0)
    RewardStateV2,                    // Global reward state
    UserRewardStateV2(Address),       // Per-user reward state
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
    // ICE Errors
    AlreadyExecuted = 23,
    InsufficientPendingAqua = 24,
    // Vault Errors
    PoolNotActive = 25,
    PoolNotFound = 26,
    MaxPoolsReached = 27,
    PositionNotFound = 28,
    ClaimCooldownActive = 29,
    UnstakeCooldownActive = 30,
    NoRewardsToClaim = 31,
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
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BlubRestakeRecordedEvent {
    pub user: Address,
    pub amount: i128,
    pub tx_hash: Bytes,
    pub timestamp: u64,
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
    pub tx_hash: Bytes,
}

/// Event emitted when tokens are sent to admin for LP deposit
/// Backend should listen for this event and deposit to AQUA/BLUB pool
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PolDepositTriggerEvent {
    pub user: Address,       
    pub aqua_amount: i128,     
    pub blub_amount: i128,    
    pub timestamp: u64,
    pub tx_hash: Bytes,
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
    /// Initializes the staking contract with required configuration.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `admin` - The administrator address that will have privileged access
    /// * `treasury_address` - Address where treasury fees are sent
    /// * `aqua_token` - Contract address of the AQUA token
    /// * `blub_token` - Contract address of the BLUB token (Stellar asset)
    /// * `liquidity_contract` - Address of the AQUA/BLUB StableSwap pool contract
    /// * `ice_contract` - Address of the ICE locking contract for governance
    ///
    /// # Returns
    /// * `Ok(())` on success
    /// * `Err(Error::AlreadyInitialized)` if contract is already initialized
    ///
    /// # Authorization
    /// Requires authorization from the `admin` address.
    pub fn initialize(
        env: Env,
        admin: Address,
        treasury_address: Address,
        aqua_token: Address,
        blub_token: Address,
        liquidity_contract: Address,
        ice_tokens: IceTokens,
        vault_treasury: Address,
        vault_fee_bps: u32,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Config) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();

        let cfg = Config {
            admin: admin.clone(),
            version: 10200, // v1.2.0
            total_supply: 0,
            treasury_address,
            reward_rate: 100, // 1% per period default
            aqua_token,
            blub_token,
            liquidity_contract,
            ice_token: ice_tokens.ice_token,
            govern_ice_token: ice_tokens.govern_ice_token,
            upvote_ice_token: ice_tokens.upvote_ice_token,
            downvote_ice_token: ice_tokens.downvote_ice_token,
            period_unit_minutes: 1,
            vault_treasury,
            vault_fee_bps,
            // Default cooldowns: 10 days unstake, 7 days claim
            unstake_cooldown_seconds: 864000,      // 10 days
            claim_reward_cooldown_seconds: 604800, // 7 days
        };
        env.storage().instance().set(&DataKey::Config, &cfg);

        // Initialize global state
        let global_state = GlobalState {
            total_locked: 0,
            total_blub_supply: 0,
            total_lp_staked: 0,
            locked: false,
            total_users: 0,
            last_reward_update: env.ledger().timestamp(),
            reward_per_locked_token: 0,
            reward_per_lp_token: 0,
            total_blub_rewards_distributed: 0,
            lock_counter: 0,
            pending_aqua_for_ice: 0,
            ice_balance: 0,
            govern_ice_balance: 0,
            upvote_ice_balance: 0,
            downvote_ice_balance: 0,
            ice_lock_counter: 0,
            pool_count: 0,
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

        // Initialize Synthetix-style reward state (v1.2.0)
        let reward_state = RewardState {
            reward_per_token_stored: 0,
            last_update_time: env.ledger().timestamp(),
            total_staked: 0,
            total_rewards_added: 0,
            total_rewards_claimed: 0,
        };
        env.storage().instance().set(&DataKey::RewardStateV2, &reward_state);

        Ok(())
    }

    /// Retrieves the current contract configuration.
    ///
    /// # Returns
    /// * `Ok(Config)` - The contract configuration
    /// * `Err(Error::NotInitialized)` if contract is not initialized
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

    /// Updates the admin for the BLUB Stellar Asset Contract (SAC).
    ///
    /// # Arguments
    /// * `admin` - The current admin address
    /// * `new_admin` - The new admin address to set
    ///
    /// # Returns
    /// * `Ok(())` on success
    /// * `Err(Error::Unauthorized)` if caller is not the admin
    ///
    /// # Authorization
    /// Requires authorization from the current `admin` address.
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

    /// Stake AQUA tokens and automatically mint BLUB tokens for staking.
    ///
    /// This function performs the following operations:
    /// - Transfers AQUA from user to contract
    /// - Mints 1.1x BLUB tokens (110% of AQUA amount)
    /// - Sends 90% of AQUA to ICE contract for governance
    /// - Keeps 10% AQUA for Protocol Owned Liquidity (POL)
    /// - Stakes the equivalent 1x BLUB for rewards
    /// - Automatically deposits 0.1x BLUB + 10% AQUA to LP pool
    ///
    /// # Arguments
    /// * `user` - The address of the user staking tokens
    /// * `amount` - The amount of AQUA tokens to stake
    /// * `duration_periods` - The number of period units to lock tokens (multiplied by period_unit_minutes)
    ///
    /// # Returns
    /// * `Ok(())` - Success
    /// * `Err(Error::InvalidInput)` if amount is <= 0
    /// * `Err(Error::ReentrancyDetected)` if a reentrant call is detected
    /// * `Err(Error::InsufficientBalance)` if user doesn't have enough AQUA
    ///
    /// # Authorization
    /// Requires authorization from the `user` address.
    ///
    /// # State Changes
    /// - Creates a new lock entry for the user
    /// - Updates global state with new locked amounts
    /// - Updates POL contribution tracking
    pub fn lock(
        env: Env,
        user: Address,
        amount: i128,
        duration_periods: u64,
    ) -> Result<(), Error> {
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
        
        // Increment lock counter and create predictable lock ID
        let lock_id = global_state.lock_counter;
        global_state.lock_counter = global_state.lock_counter.saturating_add(1);
        let lock_id_array = lock_id.to_be_bytes();
        let tx_hash_bytes = Bytes::from_array(&env, &lock_id_array);
        
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
        env.storage().persistent().set(&DataKey::UserLockByTxHash(user.clone(), tx_hash_bytes.clone()), &lock);
        
        // Add tx_hash to user's locks list
        let mut user_locks: Vec<Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::UserLocks(user.clone()))
            .unwrap_or(Vec::new(&env));
        user_locks.push_back(tx_hash_bytes.clone());
        env.storage().persistent().set(&DataKey::UserLocks(user.clone()), &user_locks);
        
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
        
        // CHANGED: Keep 90% AQUA in contract for ICE locking (Request 1)
        // Track as pending instead of sending to ICE contract
        global_state.pending_aqua_for_ice = global_state.pending_aqua_for_ice.saturating_add(ice_aqua);

        // ===== SEND 10% AQUA + 0.1x BLUB TO ADMIN WALLET =====
        // Backend will deposit these to AQUA/BLUB pool to get ICE boost
        if pol_aqua > 0 && blub_to_lp > 0 {
            // Transfer AQUA to admin wallet
            let transfer_aqua_result = aqua_client.try_transfer(&contract_address, &config.admin, &pol_aqua);
            if transfer_aqua_result.is_err() {
                global_state.locked = false;
                env.storage().instance().set(&DataKey::GlobalState, &global_state);
                env.events().publish(
                    (symbol_short!("pol_err"),),
                    symbol_short!("aqua_xfr"),
                );
                return Err(Error::InsufficientBalance);
            }

            // Transfer BLUB to admin wallet
            let blub_client = token::Client::new(&env, &config.blub_token);
            let transfer_blub_result = blub_client.try_transfer(&contract_address, &config.admin, &blub_to_lp);
            if transfer_blub_result.is_err() {
                global_state.locked = false;
                env.storage().instance().set(&DataKey::GlobalState, &global_state);
                env.events().publish(
                    (symbol_short!("pol_err"),),
                    symbol_short!("blub_xfr"),
                );
                return Err(Error::InsufficientBalance);
            }

            // Emit event for backend to deposit to AQUA/BLUB pool
            let pol_trigger_event = PolDepositTriggerEvent {
                user: user.clone(),
                aqua_amount: pol_aqua,
                blub_amount: blub_to_lp,
                timestamp: now,
                tx_hash: tx_hash_bytes.clone(),
            };
            env.events().publish((symbol_short!("pol_dep"),), pol_trigger_event);
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
            unlock_timestamp,
        };
        env.events().publish((symbol_short!("lock"),), event);

        // Emit BLUB staking event
        env.events().publish(
            (symbol_short!("blub_stk"), user.clone()),
            (blub_minted, blub_staked, blub_to_lp),
        );
        // Checkpoint and update user's staked balance for reward tracking
        let new_total_staked = Self::get_user_total_staked_blub(&env, &user);
        Self::sync_user_reward_balance(&env, &user, new_total_staked);

        Ok(())
    }


    fn create_blub_stake_entry(
        env: &Env,
        user: Address,
        amount: i128,
        duration_minutes: u64,
        timestamp: u64,
        lock_id: u64,
    ) -> Result<(), Error> {
        let unlock_timestamp = timestamp + (duration_minutes * 60);
        let reward_multiplier = Self::calculate_lock_multiplier(duration_minutes);
        
        // Create lock ID from provided counter
        let lock_id_array = lock_id.to_be_bytes();
        let tx_hash_bytes = Bytes::from_array(env, &lock_id_array);

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
            .set(&DataKey::UserLockByTxHash(user.clone(), tx_hash_bytes.clone()), &blub_lock);

        // Add tx_hash to user's locks list
        let mut user_locks: Vec<Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::UserLocks(user.clone()))
            .unwrap_or(Vec::new(env));
        user_locks.push_back(tx_hash_bytes.clone());
        env.storage().persistent().set(&DataKey::UserLocks(user.clone()), &user_locks);

        Self::update_lock_totals_with_blub(env, 0, amount, reward_multiplier)?;

        let mut global_state = Self::get_global_state(env.clone())?;
        global_state.last_reward_update = env.ledger().timestamp();
        env.storage().instance().set(&DataKey::GlobalState, &global_state);

        Ok(())
    }

    /// Records a lock entry for tracking purposes without performing token transfers.
    ///
    /// This function only records metadata about a lock that occurred elsewhere.
    /// Useful for tracking locks that happened on a different chain or contract.
    ///
    /// # Arguments
    /// * `user` - The address of the user whose lock is being recorded
    /// * `amount` - The amount of tokens locked
    /// * `duration_periods` - The number of period units for the lock
    /// * `tx_hash` - The transaction hash from the external lock
    ///
    /// # Returns
    /// * `Ok(())` - Success
    /// * `Err(Error::InvalidInput)` if amount is <= 0
    /// * `Err(Error::ReentrancyDetected)` if a reentrant call is detected
    ///
    /// # Authorization
    /// Requires authorization from the `user` address.
    pub fn record_lock(
        env: Env,
        user: Address,
        amount: i128,
        duration_periods: u64,
        tx_hash: Bytes,
    ) -> Result<(), Error> {
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
            .set(&DataKey::UserLockByTxHash(user.clone(), tx_hash.clone()), &lock);

        // Add tx_hash to user's locks list
        let mut user_locks: Vec<Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::UserLocks(user.clone()))
            .unwrap_or(Vec::new(&env));
        user_locks.push_back(tx_hash.clone());
        env.storage().persistent().set(&DataKey::UserLocks(user.clone()), &user_locks);

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
            tx_hash: tx_hash.clone(),
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
            unlock_timestamp,
        };
        env.events().publish((symbol_short!("lock"),), event);

        Ok(())
    }

    /// Records an unlock event and transfers locked BLUB plus rewards to the user.
    ///
    /// # Arguments
    /// * `user` - The address of the user unlocking tokens
    /// * `amount` - The amount of tokens to unlock
    /// * `tx_hash` - The transaction hash for tracking
    ///
    /// # Returns
    /// * `Ok(())` - Success
    /// * `Err(Error::InvalidInput)` if amount is <= 0
    /// * `Err(Error::ReentrancyDetected)` if a reentrant call is detected
    /// * `Err(Error::InsufficientBalance)` if contract doesn't have enough BLUB
    ///
    /// # Authorization
    /// Requires authorization from the `user` address.
    ///
    /// # State Changes
    /// - Creates a new unlock entry
    /// - Updates user lock totals
    /// - Updates global state
    /// - Transfers BLUB tokens and accumulated rewards to user
    pub fn record_unlock(env: Env, user: Address, amount: i128, tx_hash: Bytes) -> Result<(), Error> {
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

        let entry = UnlockEntry { 
            amount, 
            tx_hash: tx_hash.clone(), 
            timestamp: now,
            claimed: false,
        };
        env.storage().persistent().set(&DataKey::UserUnlockByTxHash(user.clone(), tx_hash.clone()), &entry);
        
        // Add tx_hash to user's unlocks list
        let mut user_unlocks: Vec<Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::UserUnlocks(user.clone()))
            .unwrap_or(Vec::new(&env));
        user_unlocks.push_back(tx_hash.clone());
        env.storage().persistent().set(&DataKey::UserUnlocks(user.clone()), &user_unlocks);

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
        };
        env.events().publish((symbol_short!("unlock"),), evt);

        Ok(())
    }

    /// Restake BLUB tokens to earn more BLUB rewards.
    ///
    /// Allows users to stake their BLUB tokens (obtained from previous stakes or rewards)
    /// to earn additional BLUB rewards.
    ///
    /// # Arguments
    /// * `user` - The address of the user staking BLUB
    /// * `amount` - The amount of BLUB tokens to stake
    /// * `duration_periods` - The number of period units to lock tokens
    ///
    /// # Returns
    /// * `Ok(())` - Success
    /// * `Err(Error::InvalidInput)` if amount is <= 0
    /// * `Err(Error::ReentrancyDetected)` if a reentrant call is detected
    /// * `Err(Error::InsufficientBalance)` if user doesn't have enough BLUB
    ///
    /// # Authorization
    /// Requires authorization from the `user` address.
    ///
    /// # State Changes
    /// - Creates a new BLUB lock entry
    /// - Updates lock totals
    /// - Updates global state:
    /// - Transfers BLUB from user to contract
    pub fn stake(
        env: Env,
        user: Address,
        amount: i128,
        duration_periods: u64,
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

        let config = Self::get_config(env.clone())?;
        let contract_address = env.current_contract_address();
        let now = env.ledger().timestamp();
        
        let duration_minutes = duration_periods * config.period_unit_minutes;
        let unlock_timestamp = now + (duration_minutes * 60);
        let reward_multiplier = Self::calculate_lock_multiplier(duration_minutes);
        
        // ===== EFFECTS: UPDATE ALL STATE FIRST =====
        
        // Increment lock counter and create predictable lock ID
        let lock_id = global_state.lock_counter;
        global_state.lock_counter = global_state.lock_counter.saturating_add(1);
        let lock_id_array = lock_id.to_be_bytes();
        let tx_hash_bytes = Bytes::from_array(&env, &lock_id_array);

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
            .set(&DataKey::UserLockByTxHash(user.clone(), tx_hash_bytes.clone()), &lock);
        
        // Add tx_hash to user's locks list
        let mut user_locks: Vec<Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::UserLocks(user.clone()))
            .unwrap_or(Vec::new(&env));
        user_locks.push_back(tx_hash_bytes.clone());
        env.storage().persistent().set(&DataKey::UserLocks(user.clone()), &user_locks);

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

        // ===== SYNC REWARD BALANCE (v1.2.0) =====
        let new_total_staked = Self::get_user_total_staked_blub(&env, &user);
        Self::sync_user_reward_balance(&env, &user, new_total_staked);

        Ok(())
    }

    /// Records a BLUB restake entry for tracking purposes.
    ///
    /// # Arguments
    /// * `user` - The address of the user restaking BLUB
    /// * `amount` - The amount of BLUB being restaked
    /// * `tx_hash` - The transaction hash for tracking
    ///
    /// # Returns
    /// * `Ok(())` - Success
    /// * `Err(Error::InvalidInput)` if amount is <= 0
    /// * `Err(Error::ReentrancyDetected)` if a reentrant call is detected
    ///
    /// # Authorization
    /// Requires authorization from the `user` address.
    pub fn record_blub_restake(env: Env, user: Address, amount: i128, tx_hash: Bytes) -> Result<(), Error> {
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
            let user_restakes: Vec<Bytes> = env
                .storage()
                .persistent()
                .get(&DataKey::UserBlubRestakes(user.clone()))
                .unwrap_or(Vec::new(&env));
            
            if let Some(last_tx_hash) = user_restakes.last() {
                env.storage()
                    .persistent()
                    .get::<DataKey, BlubRestakeEntry>(&DataKey::UserBlubRestakeByTxHash(user.clone(), last_tx_hash))
                    .map(|entry| entry.amount)
                    .unwrap_or(0)
            } else {
                0
            }
        };

        let entry = BlubRestakeEntry { 
            amount, 
            tx_hash: tx_hash.clone(), 
            timestamp: now,
            previous_amount,
        };
        env.storage().persistent().set(&DataKey::UserBlubRestakeByTxHash(user.clone(), tx_hash.clone()), &entry);
        
        // Add tx_hash to user's BLUB restakes list
        let mut user_restakes: Vec<Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::UserBlubRestakes(user.clone()))
            .unwrap_or(Vec::new(&env));
        user_restakes.push_back(tx_hash.clone());
        env.storage().persistent().set(&DataKey::UserBlubRestakes(user.clone()), &user_restakes);

        // ===== RELEASE RE-ENTRANCY LOCK =====
        global_state.locked = false;
        env.storage().instance().set(&DataKey::GlobalState, &global_state);

        let evt = BlubRestakeRecordedEvent { 
            user: user.clone(),
            amount, 
            tx_hash, 
            timestamp: now, 
        };
        env.events().publish((symbol_short!("rstk"),), evt);

        Ok(())
    }

    /// Records an LP (Liquidity Pool) deposit for a user.
    ///
    /// # Arguments
    /// * `admin` - The admin address authorizing this operation
    /// * `user` - The address of the user depositing liquidity
    /// * `pool_id` - The unique identifier of the liquidity pool
    /// * `amount_a` - The amount of token A deposited
    /// * `amount_b` - The amount of token B deposited
    /// * `tx_hash` - The transaction hash for tracking
    ///
    /// # Returns
    /// * `Ok(())` on success
    /// * `Err(Error::Unauthorized)` if caller is not the admin
    /// * `Err(Error::InvalidInput)` if amounts are negative
    ///
    /// # Authorization
    /// Requires authorization from the `admin` address.
    ///
    /// # State Changes
    /// - Updates or creates LP position for user
    /// - Updates global LP staked amount
    /// - Calculates and credits any pending LP rewards
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

    /// Calculates the total rewards for a user from both locked stakes and LP positions.
    ///
    /// # Arguments
    /// * `user` - The address of the user to calculate rewards for
    ///
    /// # Returns
    /// * `Ok(UserRewardTotals)` - The user's reward totals including pending and accumulated rewards
    /// * `Err(Error)` if calculation fails
    ///
    /// # Note
    /// This is a view function that doesn't modify state. It calculates:
    /// - Pending rewards from locked stakes (based on time elapsed and multipliers)
    /// - Pending rewards from LP positions (based on global reward rates)
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

    /// Records a reward distribution event.
    ///
    /// # Arguments
    /// * `admin` - The admin address authorizing this operation
    /// * `kind` - The type of reward distribution (0 = LP rewards, 1 = locked rewards)
    /// * `pool_id` - The pool identifier (if applicable)
    /// * `total_reward` - The total amount of rewards distributed
    /// * `distributed_amount` - The amount distributed to users
    /// * `treasury_amount` - The amount sent to treasury
    /// * `tx_hash` - The transaction hash for tracking
    ///
    /// # Returns
    /// * `Ok(u32)` - The index of the distribution record
    /// * `Err(Error::Unauthorized)` if caller is not the admin
    /// * `Err(Error::InvalidInput)` if amounts are negative
    ///
    /// # Authorization
    /// Requires authorization from the `admin` address.
    ///
    /// # State Changes
    /// - Updates global reward rates for future calculations
    /// - Creates a new distribution record
    /// - Emits batch reward calculation event
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

    /// Credits a reward amount to a specific user.
    ///
    /// # Arguments
    /// * `admin` - The admin address authorizing this operation
    /// * `kind` - The type of reward (0 = LP rewards, 1 = locked rewards)
    /// * `user` - The address of the user receiving the reward
    /// * `pool_id` - The pool identifier (if applicable)
    /// * `amount` - The amount of reward to credit
    /// * `tx_hash` - The transaction hash for tracking
    ///
    /// # Returns
    /// * `Ok(())` on success
    /// * `Err(Error::Unauthorized)` if caller is not the admin
    /// * `Err(Error::InvalidInput)` if amount is <= 0
    ///
    /// # Authorization
    /// Requires authorization from the `admin` address.
    ///
    /// # State Changes
    /// - Updates user's reward totals based on reward kind
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

    /// Records POL (Protocol Owned Liquidity) rewards claimed from AQUA-BLUB pair voting.
    ///
    /// The rewards are split: 70% distributed to users, 30% to treasury.
    ///
    /// # Arguments
    /// * `admin` - The admin address authorizing this operation
    /// * `reward_amount` - The total amount of rewards claimed
    /// * `ice_voting_power` - The ICE voting power used to obtain these rewards
    ///
    /// # Returns
    /// * `Ok(())` on success
    /// * `Err(Error::Unauthorized)` if caller is not the admin
    /// * `Err(Error::InvalidInput)` if reward_amount is <= 0
    ///
    /// # Authorization
    /// Requires authorization from the `admin` address.
    ///
    /// # State Changes
    /// - Updates POL state with new reward totals
    /// - Creates a daily POL snapshot
    /// - Emits POL rewards claimed event
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
        // Check for zero OR negative total_locked_aqua to prevent negative rewards
        if totals.total_locked_aqua <= 0 || totals.last_update_ts >= current_time {
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

        // Ensure reward is never negative
        Ok(base_reward.max(0))
    }

    fn get_user_total_multiplier(env: &Env, user: &Address) -> Result<i128, Error> {
        let user_locks: Vec<Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::UserLocks(user.clone()))
            .unwrap_or(Vec::new(env));

        if user_locks.is_empty() { return Ok(10000); }

        let now = env.ledger().timestamp();
        let mut total_amount = 0i128;
        let mut weighted_multiplier = 0i128;

        for i in 0..user_locks.len() {
            if let Some(tx_hash) = user_locks.get(i) {
                if let Some(entry) = env.storage().persistent().get::<DataKey, LockEntry>(&DataKey::UserLockByTxHash(user.clone(), tx_hash)) {
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
        }

        if total_amount == 0 { return Ok(10000); }
        Ok(weighted_multiplier / total_amount)
    }

    /// Retrieves the global contract state.
    ///
    /// # Returns
    /// * `Ok(GlobalState)` - The current global state including locked amounts, supply, and reward rates
    /// * `Err(Error::NotInitialized)` if contract is not initialized
    pub fn get_global_state(env: Env) -> Result<GlobalState, Error> {
        env.storage()
            .instance()
            .get(&DataKey::GlobalState)
            .ok_or(Error::NotInitialized)
    }

    // Getters (gas-optimized, return only essential data)
    
    /// Retrieves the lock totals for a specific user.
    ///
    /// # Arguments
    /// * `user` - The address of the user
    ///
    /// # Returns
    /// * `Some(LockTotals)` if user has locks
    /// * `None` if user has no locks
    pub fn get_user_lock_totals(env: Env, user: Address) -> Option<LockTotals> {
        env.storage().persistent().get(&DataKey::UserLockTotals(user))
    }

    /// Gets the number of lock entries for a user.
    ///
    /// # Arguments
    /// * `user` - The address of the user
    ///
    /// # Returns
    /// The count of lock entries (0 if none)
    pub fn get_user_lock_count(env: Env, user: Address) -> u32 {
        let user_locks: Vec<Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::UserLocks(user))
            .unwrap_or(Vec::new(&env));
        user_locks.len()
    }

    /// Retrieves a specific lock entry by index for a user.
    ///
    /// # Arguments
    /// * `user` - The address of the user
    /// * `index` - The index of the lock entry
    ///
    /// # Returns
    /// * `Some(LockEntry)` if the entry exists
    /// * `None` if the entry doesn't exist
    pub fn get_user_lock_by_index(env: Env, user: Address, index: u32) -> Option<LockEntry> {
        let user_locks: Vec<Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::UserLocks(user.clone()))
            .unwrap_or(Vec::new(&env));
        
        if let Some(tx_hash) = user_locks.get(index) {
            env.storage().persistent().get(&DataKey::UserLockByTxHash(user, tx_hash))
        } else {
            None
        }
    }

    /// Gets all pool IDs that a user has LP positions in.
    ///
    /// # Arguments
    /// * `user` - The address of the user
    ///
    /// # Returns
    /// A vector of pool IDs (empty if none)
    pub fn get_user_pools(env: Env, user: Address) -> Vec<Bytes> {
        env.storage().persistent().get(&DataKey::UserPools(user)).unwrap_or(Vec::new(&env))
    }

    /// Retrieves a user's LP position for a specific pool.
    ///
    /// # Arguments
    /// * `user` - The address of the user
    /// * `pool_id` - The pool identifier
    ///
    /// # Returns
    /// * `Some(LpPosition)` if the position exists
    /// * `None` if no position found
    pub fn get_user_lp(env: Env, user: Address, pool_id: Bytes) -> Option<LpPosition> {
        env.storage().persistent().get(&DataKey::UserLp(user, pool_id))
    }

    /// Retrieves accumulated reward totals for a user.
    ///
    /// # Arguments
    /// * `user` - The address of the user
    ///
    /// # Returns
    /// * `Some(UserRewardTotals)` if user has rewards
    /// * `None` if no rewards found
    pub fn get_user_rewards(env: Env, user: Address) -> Option<UserRewardTotals> {
        env.storage().persistent().get(&DataKey::UserRewards(user))
    }

    /// Gets the number of unlock entries for a user.
    ///
    /// # Arguments
    /// * `user` - The address of the user
    ///
    /// # Returns
    /// The count of unlock entries (0 if none)
    pub fn get_unlock_count(env: Env, user: Address) -> u32 {
        let user_unlocks: Vec<Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::UserUnlocks(user))
            .unwrap_or(Vec::new(&env));
        user_unlocks.len()
    }

    /// Retrieves a specific unlock entry by index for a user.
    ///
    /// # Arguments
    /// * `user` - The address of the user
    /// * `index` - The index of the unlock entry
    ///
    /// # Returns
    /// * `Some(UnlockEntry)` if the entry exists
    /// * `None` if the entry doesn't exist
    pub fn get_unlock_by_index(env: Env, user: Address, index: u32) -> Option<UnlockEntry> {
        let user_unlocks: Vec<Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::UserUnlocks(user.clone()))
            .unwrap_or(Vec::new(&env));
        
        if let Some(tx_hash) = user_unlocks.get(index) {
            env.storage().persistent().get(&DataKey::UserUnlockByTxHash(user, tx_hash))
        } else {
            None
        }
    }

    /// Gets the number of BLUB restake entries for a user.
    ///
    /// # Arguments
    /// * `user` - The address of the user
    ///
    /// # Returns
    /// The count of BLUB restake entries (0 if none)
    pub fn get_blub_restake_count(env: Env, user: Address) -> u32 {
        let user_restakes: Vec<Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::UserBlubRestakes(user))
            .unwrap_or(Vec::new(&env));
        user_restakes.len()
    }

    /// Retrieves a specific BLUB restake entry by index for a user.
    ///
    /// # Arguments
    /// * `user` - The address of the user
    /// * `index` - The index of the restake entry
    ///
    /// # Returns
    /// * `Some(BlubRestakeEntry)` if the entry exists
    /// * `None` if the entry doesn't exist
    pub fn get_blub_restake_by_index(env: Env, user: Address, index: u32) -> Option<BlubRestakeEntry> {
        let user_restakes: Vec<Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::UserBlubRestakes(user.clone()))
            .unwrap_or(Vec::new(&env));
        
        if let Some(tx_hash) = user_restakes.get(index) {
            env.storage().persistent().get(&DataKey::UserBlubRestakeByTxHash(user, tx_hash))
        } else {
            None
        }
    }

    /// Gets the total number of reward distributions recorded.
    ///
    /// # Returns
    /// The count of distribution entries (0 if none)
    pub fn get_distribution_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::DistributionCount).unwrap_or(0)
    }

    /// Retrieves a specific reward distribution entry by index.
    ///
    /// # Arguments
    /// * `index` - The index of the distribution entry
    ///
    /// # Returns
    /// * `Some(RewardDistribution)` if the entry exists
    /// * `None` if the entry doesn't exist
    pub fn get_distribution_by_index(env: Env, index: u32) -> Option<RewardDistribution> {
        env.storage().instance().get(&DataKey::DistributionByIndex(index))
    }

    /// Retrieves the Protocol Owned Liquidity (POL) state.
    ///
    /// # Returns
    /// The current POL state including AQUA/BLUB contributions and LP positions
    pub fn get_protocol_owned_liquidity(env: Env) -> ProtocolOwnedLiquidity {
        Self::get_pol(&env)
    }

    /// Retrieves a daily POL snapshot for a specific day.
    ///
    /// # Arguments
    /// * `day` - The day number (timestamp / 86400)
    ///
    /// # Returns
    /// * `Some(ProtocolOwnedLiquidity)` if a snapshot exists for that day
    /// * `None` if no snapshot found
    pub fn get_daily_pol_snapshot(env: Env, day: u64) -> Option<ProtocolOwnedLiquidity> {
        env.storage().instance().get(&DataKey::DailyPolSnapshot(day))
    }

    /// Calculates the total POL contribution for a specific user.
    ///
    /// Sums up all POL contributions from the user's lock entries.
    ///
    /// # Arguments
    /// * `user` - The address of the user
    ///
    /// # Returns
    /// The total amount of AQUA contributed to POL by this user
    pub fn get_user_pol_contribution(env: Env, user: Address) -> i128 {
        let user_locks: Vec<Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::UserLocks(user.clone()))
            .unwrap_or(Vec::new(&env));

        let mut total_contribution = 0i128;
        for i in 0..user_locks.len() {
            if let Some(tx_hash) = user_locks.get(i) {
                if let Some(lock) = env.storage().persistent().get::<DataKey, LockEntry>(&DataKey::UserLockByTxHash(user.clone(), tx_hash)) {
                    total_contribution = total_contribution.saturating_add(lock.pol_contributed);
                }
            }
        }

        total_contribution
    }

    /// Retrieves the current reserves from the AQUA/BLUB liquidity pool.
    ///
    /// # Returns
    /// * `Ok((i128, i128))` - A tuple of (aqua_reserve, blub_reserve)
    /// * `Err(Error::InvalidInput)` if the pool query fails
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

    /// Retrieves the LP share token address from the liquidity pool.
    ///
    /// # Returns
    /// * `Ok(Address)` - The share token contract address
    /// * `Err(Error::InvalidInput)` if the pool query fails
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

    /// Withdraws liquidity from the pool (admin-only).
    ///
    /// Used to manage Protocol Owned Liquidity or rebalance the pool.
    ///
    /// # Arguments
    /// * `admin` - The admin address authorizing this operation
    /// * `share_amount` - The amount of LP share tokens to burn
    /// * `min_aqua` - Minimum AQUA to receive (slippage protection)
    /// * `min_blub` - Minimum BLUB to receive (slippage protection)
    ///
    /// # Returns
    /// * `Ok((i128, i128))` - A tuple of (aqua_withdrawn, blub_withdrawn)
    /// * `Err(Error::Unauthorized)` if caller is not the admin
    /// * `Err(Error::InvalidInput)` if parameters are invalid or withdrawal fails
    ///
    /// # Authorization
    /// Requires authorization from the `admin` address.
    ///
    /// # State Changes
    /// - Reduces POL LP position tracking
    /// - Burns LP share tokens
    /// - Transfers withdrawn tokens to contract
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

    /// Retrieves the virtual price of the liquidity pool.
    ///
    /// The virtual price represents the price of an LP token in terms of underlying assets.
    ///
    /// # Returns
    /// * `Ok(i128)` - The virtual price
    /// * `Err(Error::InvalidInput)` if the pool query fails
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

    /// Claims accumulated rewards from the liquidity pool (admin-only).
    ///
    /// # Arguments
    /// * `admin` - The admin address authorizing this operation
    ///
    /// # Returns
    /// * `Ok(i128)` - The amount of rewards claimed
    /// * `Err(Error::Unauthorized)` if caller is not the admin
    /// * `Err(Error::InvalidInput)` if the claim fails
    ///
    /// # Authorization
    /// Requires authorization from the `admin` address.
    ///
    /// # State Changes
    /// - Updates POL total rewards earned
    /// - Updates last reward claim timestamp
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

    /// Retrieves the pending rewards available from the liquidity pool.
    ///
    /// # Returns
    /// * `Ok(i128)` - The amount of pending rewards
    /// * `Err(Error::InvalidInput)` if the pool query fails
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
    
    /// Updates the base reward rate (admin-only).
    ///
    /// # Arguments
    /// * `admin` - The admin address authorizing this operation
    /// * `new_rate` - The new reward rate in basis points per period (max 1000 = 10%)
    ///
    /// # Returns
    /// * `Ok(())` on success
    /// * `Err(Error::Unauthorized)` if caller is not the admin
    /// * `Err(Error::InvalidInput)` if new_rate > 1000
    ///
    /// # Authorization
    /// Requires authorization from the `admin` address.
    pub fn update_reward_rate(env: Env, admin: Address, new_rate: i128) -> Result<(), Error> {
        let mut cfg = Self::get_config(env.clone())?;
        admin.require_auth();
        if cfg.admin != admin { return Err(Error::Unauthorized); }
        if new_rate > 1000 { return Err(Error::InvalidInput); }

        cfg.reward_rate = new_rate;
        env.storage().instance().set(&DataKey::Config, &cfg);
        Ok(())
    }

    /// Manually deposits accumulated POL to the AQUA-BLUB LP pool (admin-only).
    ///
    /// # Arguments
    /// * `admin` - The admin address authorizing this operation
    /// * `aqua_amount` - The amount of AQUA to deposit to LP
    /// * `blub_amount` - The amount of BLUB to deposit to LP
    ///
    /// # Returns
    /// * `Ok(())` on success
    /// * `Err(Error::Unauthorized)` if caller is not the admin
    /// * `Err(Error::InvalidInput)` if amounts are <= 0
    /// * `Err(Error::InsufficientBalance)` if contract doesn't have enough tokens
    ///
    /// # Authorization
    /// Requires authorization from the `admin` address.
    ///
    /// # State Changes
    /// - Transfers tokens to LP pool
    /// - Updates POL LP position tracking
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


    /// Updates the liquidity pool contract address (admin-only).
    ///
    /// # Arguments
    /// * `admin` - The admin address authorizing this operation
    /// * `new_liquidity_contract` - The new liquidity pool contract address
    ///
    /// # Returns
    /// * `Ok(())` on success
    /// * `Err(Error::Unauthorized)` if caller is not the admin
    ///
    /// # Authorization
    /// Requires authorization from the `admin` address.
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

    /// Updates BLUB token contract address (admin-only).
    ///
    /// # Arguments
    /// * `admin` - The admin address authorizing this operation
    /// * `new_blub_token` - The new BLUB token contract address
    ///
    /// # Returns
    /// * `Ok(())` on success
    /// * `Err(Error::Unauthorized)` if caller is not the admin
    ///
    /// # Authorization
    /// Requires authorization from the `admin` address.
    pub fn update_blub_token(
        env: Env,
        admin: Address,
        new_blub_token: Address,
    ) -> Result<(), Error> {
        let mut cfg = Self::get_config(env.clone())?;
        admin.require_auth();
        if cfg.admin != admin {
            return Err(Error::Unauthorized);
        }

        cfg.blub_token = new_blub_token.clone();
        env.storage().instance().set(&DataKey::Config, &cfg);

        env.events().publish(
            (symbol_short!("blub_upd"),),
            new_blub_token,
        );

        Ok(())
    }

    /// Updates ICE token addresses (admin-only).
    ///
    /// # Arguments
    /// * `admin` - The admin address authorizing this operation
    /// * `ice_token` - The ICE token contract address
    /// * `govern_ice_token` - The governICE token contract address
    /// * `upvote_ice_token` - The upvoteICE token contract address
    /// * `downvote_ice_token` - The downvoteICE token contract address
    ///
    /// # Returns
    /// * `Ok(())` on success
    /// * `Err(Error::Unauthorized)` if caller is not the admin
    ///
    /// # Authorization
    /// Requires authorization from the `admin` address.
    pub fn update_ice_tokens(
        env: Env,
        admin: Address,
        ice_token: Address,
        govern_ice_token: Address,
        upvote_ice_token: Address,
        downvote_ice_token: Address,
    ) -> Result<(), Error> {
        let mut cfg = Self::get_config(env.clone())?;
        admin.require_auth();
        if cfg.admin != admin { return Err(Error::Unauthorized); }

        cfg.ice_token = ice_token.clone();
        cfg.govern_ice_token = govern_ice_token.clone();
        cfg.upvote_ice_token = upvote_ice_token.clone();
        cfg.downvote_ice_token = downvote_ice_token.clone();
        env.storage().instance().set(&DataKey::Config, &cfg);

        env.events().publish(
            (symbol_short!("ice_upd"),),
            ice_token,
        );

        Ok(())
    }

    // ============================================================================
    // Contract Upgrade & Migration Functions
    // ============================================================================

    /// Upgrades the contract to a new WASM hash (admin-only).
    ///
    /// # Arguments
    /// * `admin` - The admin address authorizing this operation
    /// * `new_wasm_hash` - The hash of the new WASM to upgrade to
    ///
    /// # Authorization
    /// Requires authorization from the `admin` address.
    pub fn upgrade(env: Env, admin: Address, new_wasm_hash: soroban_sdk::BytesN<32>) -> Result<(), Error> {
        // Try to get config - works with both old and new format
        // For old format, we need to check admin differently
        let is_admin = if let Ok(cfg) = Self::get_config(env.clone()) {
            admin.require_auth();
            cfg.admin == admin
        } else {
            // Try reading as OldConfig
            let old_cfg: OldConfig = env.storage().instance()
                .get(&DataKey::Config)
                .ok_or(Error::NotInitialized)?;
            admin.require_auth();
            old_cfg.admin == admin
        };

        if !is_admin {
            return Err(Error::Unauthorized);
        }

        env.deployer().update_current_contract_wasm(new_wasm_hash);

        env.events().publish(
            (symbol_short!("upgraded"),),
            env.current_contract_address(),
        );

        Ok(())
    }

    /// Migrate contract from v1.1.0 to v1.2.0
    /// - Adds cooldown fields to Config
    /// - Initializes RewardStateV2 with correct total_staked
    ///
    /// # Arguments
    /// * `admin` - Admin address for authorization
    ///
    /// # Returns
    /// * `Ok(())` on success
    /// * `Err(Error::AlreadyInitialized)` if already v1.2.0
    /// * `Err(Error::Unauthorized)` if not admin
    pub fn migrate_v1_2_0(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();

        // Try to read as v1.1.0 config (15 fields, no cooldowns)
        let old_config: ConfigV1_1 = env.storage().instance()
            .get(&DataKey::Config)
            .ok_or(Error::NotInitialized)?;

        // Check admin authorization
        if old_config.admin != admin {
            return Err(Error::Unauthorized);
        }

        // Check if already migrated to v1.2.0
        if old_config.version >= 10200 {
            return Err(Error::AlreadyInitialized);
        }

        // Create new Config with cooldown fields
        let new_config = Config {
            admin: old_config.admin,
            version: 10200, // v1.2.0
            total_supply: old_config.total_supply,
            treasury_address: old_config.treasury_address,
            reward_rate: old_config.reward_rate,
            aqua_token: old_config.aqua_token,
            blub_token: old_config.blub_token,
            liquidity_contract: old_config.liquidity_contract,
            ice_token: old_config.ice_token,
            govern_ice_token: old_config.govern_ice_token,
            upvote_ice_token: old_config.upvote_ice_token,
            downvote_ice_token: old_config.downvote_ice_token,
            period_unit_minutes: old_config.period_unit_minutes,
            vault_treasury: old_config.vault_treasury,
            vault_fee_bps: old_config.vault_fee_bps,
            // New cooldown fields with defaults
            unstake_cooldown_seconds: 864000,      // 10 days
            claim_reward_cooldown_seconds: 604800, // 7 days
        };

        // Save new config
        env.storage().instance().set(&DataKey::Config, &new_config);

        // Get total staked from GlobalState
        // Use total_locked (AQUA) which equals staked BLUB (1:1 ratio)
        // total_blub_supply includes 0.1x that goes to LP, not staked
        let global_state = Self::get_global_state(env.clone())?;
        let total_staked = global_state.total_locked;

        // Initialize RewardStateV2 if not exists
        let reward_state_exists: bool = env.storage()
            .instance()
            .has(&DataKey::RewardStateV2);

        if !reward_state_exists {
            let reward_state = RewardState {
                reward_per_token_stored: 0,
                last_update_time: env.ledger().timestamp(),
                total_staked,
                total_rewards_added: 0,
                total_rewards_claimed: 0,
            };
            env.storage().instance().set(&DataKey::RewardStateV2, &reward_state);
        }

        // Emit migration event
        env.events().publish(
            (symbol_short!("migrated"),),
            10200u32,
        );

        Ok(())
    }

    /// Returns the current config version.
    /// For old config: returns the old version number
    /// For new config: returns encoded version (10100 = v1.1.0)
    pub fn get_version(env: Env) -> Result<u32, Error> {
        // Try new config first
        if let Ok(cfg) = Self::get_config(env.clone()) {
            return Ok(cfg.version);
        }

        // Fall back to old config
        let old_cfg: OldConfig = env.storage().instance()
            .get(&DataKey::Config)
            .ok_or(Error::NotInitialized)?;

        Ok(old_cfg.version)
    }

    /// Test function to validate staking calculations without executing transactions.
    ///
    /// # Arguments
    /// * `aqua_amount` - The amount of AQUA to simulate staking
    ///
    /// # Returns
    /// * `Ok((i128, i128, i128, i128, i128))` - A tuple containing:
    ///   - blub_minted: Total BLUB tokens that would be minted (1.1x AQUA)
    ///   - blub_staked: BLUB amount that would be staked (1x AQUA)
    ///   - blub_to_lp: BLUB amount that would go to LP (0.1x AQUA)
    ///   - pol_aqua: AQUA amount for POL (10% of AQUA)
    ///   - ice_aqua: AQUA amount to ICE contract (90% of AQUA)
    /// * `Err(Error::InvalidInput)` if aqua_amount is <= 0
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

    /// Retrieves the available POL balance that can be deposited to the LP pool.
    ///
    /// Calculates available POL by subtracting currently locked/staked amounts from total balances.
    ///
    /// # Returns
    /// * `Ok((i128, i128))` - A tuple of (available_aqua, available_blub)
    /// * `Err(Error)` if unable to retrieve state
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

    /// Processes pending stake entries in batches.
    ///
    /// This function avoids reentrancy by processing stakes in a separate transaction.
    ///
    /// # Arguments
    /// * `max_count` - Maximum number of pending stakes to process (capped at 10)
    ///
    /// # Returns
    /// * `Ok(u32)` - The number of stakes actually processed
    /// * `Err(Error)` if processing fails
    pub fn process_pending_stakes(env: Env, max_count: u32) -> Result<u32, Error> {
        let pending_count: u32 = env.storage().instance().get(&DataKey::PendingStakeCount).unwrap_or(0);
        
        let mut processed = 0u32;
        let process_limit = max_count.min(pending_count).min(10);
        
        // Get global state to access lock counter
        let mut global_state = Self::get_global_state(env.clone())?;
        
        for i in 0..process_limit {
            if let Some(mut pending) = env.storage().instance().get::<DataKey, PendingStake>(&DataKey::PendingStakeByIndex(i)) {
                if !pending.processed {
                    let now = env.ledger().timestamp();
                    
                    // Get and increment lock counter
                    let lock_id = global_state.lock_counter;
                    global_state.lock_counter = global_state.lock_counter.saturating_add(1);
                    
                    let _ = Self::create_blub_stake_entry(
                        &env,
                        pending.user.clone(),
                        pending.amount,
                        pending.duration_minutes,
                        now,
                        lock_id,
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
        
        // Save updated global state with new lock counter
        env.storage().instance().set(&DataKey::GlobalState, &global_state);
        
        Ok(processed)
    }

    /// Retrieves the total number of pending stake entries.
    ///
    /// # Returns
    /// The count of pending stake entries (0 if none)
    pub fn get_pending_stake_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::PendingStakeCount).unwrap_or(0)
    }

    /// Retrieves a specific pending stake entry by index.
    ///
    /// # Arguments
    /// * `index` - The index of the pending stake entry
    ///
    /// # Returns
    /// * `Some(PendingStake)` if the entry exists
    /// * `None` if the entry doesn't exist
    pub fn get_pending_stake(env: Env, index: u32) -> Option<PendingStake> {
        env.storage().instance().get(&DataKey::PendingStakeByIndex(index))
    }

    // ============================================================================
    // ADMIN FUNCTIONS - Staking Period Configuration
    // ============================================================================

    /// Updates the staking period unit in minutes (admin-only).
    ///
    /// # Arguments
    /// * `admin` - The admin address authorizing this operation
    /// * `period_unit_minutes` - The new period unit in minutes (must be > 0)
    ///
    /// # Returns
    /// * `Ok(())` on success
    /// * `Err(Error::Unauthorized)` if caller is not the admin
    /// * `Err(Error::InvalidPeriod)` if period_unit_minutes is 0
    ///
    /// # Authorization
    /// Requires authorization from the `admin` address.
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

    /// Retrieves comprehensive staking information for a user.
    ///
    /// # Arguments
    /// * `user` - The address of the user
    ///
    /// # Returns
    /// * `Ok(UserStakingInfo)` - Detailed staking information including:
    ///   - total_staked_blub: Total BLUB currently locked/staked
    ///   - unstaking_available: BLUB available to unstake (from unlocked positions)
    ///   - accumulated_rewards: Total accumulated rewards
    ///   - pending_rewards: Rewards not yet accumulated
    ///   - total_locked_entries: Number of currently locked positions
    ///   - total_unlocked_entries: Number of unlocked positions ready to unstake
    /// * `Err(Error)` if calculation fails
    pub fn get_user_staking_info(env: Env, user: Address) -> Result<UserStakingInfo, Error> {
        let now = env.ledger().timestamp();
        
        let user_locks: Vec<Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::UserLocks(user.clone()))
            .unwrap_or(Vec::new(&env));

        let mut total_staked_blub = 0i128;
        let mut unstaking_available = 0i128;
        let mut total_locked_entries = 0u32;
        let mut total_unlocked_entries = 0u32;

        for i in 0..user_locks.len() {
            if let Some(tx_hash) = user_locks.get(i) {
                if let Some(entry) = env.storage().persistent().get::<DataKey, LockEntry>(&DataKey::UserLockByTxHash(user.clone(), tx_hash)) {
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

    /// Unstakes tokens and transfers them along with accumulated rewards to the user.
    ///
    /// Users can unstake immediately without waiting for unlock periods.
    /// This function automatically calculates and includes pending rewards.
    ///
    /// # Arguments
    /// * `user` - The address of the user unstaking tokens
    /// * `amount` - The amount of BLUB to unstake
    ///
    /// # Returns
    /// * `Ok(())` on success
    /// * `Err(Error::InvalidInput)` if amount is <= 0
    /// * `Err(Error::NotFound)` if user has no lock entries
    /// * `Err(Error::NoUnlockableAmount)` if no tokens available to unstake
    /// * `Err(Error::ReentrancyDetected)` if a reentrant call is detected
    /// * `Err(Error::InsufficientBalance)` if contract doesn't have enough BLUB
    ///
    /// # Authorization
    /// Requires authorization from the `user` address.
    ///
    /// # State Changes
    /// - Marks lock entries as unlocked
    /// - Updates user lock totals
    /// - Updates global state
    /// - Transfers BLUB and rewards to user
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
        let config = Self::get_config(env.clone())?;

        let user_locks: Vec<Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::UserLocks(user.clone()))
            .unwrap_or(Vec::new(&env));

        if user_locks.is_empty() {
            global_state.locked = false;
            env.storage().instance().set(&DataKey::GlobalState, &global_state);
            return Err(Error::NotFound);
        }

        let mut remaining_amount = amount;
        let mut total_blub_unstaked = 0i128;
        let mut total_aqua_unlocked = 0i128;

        // Find and mark entries for unstaking (with cooldown check)
        for i in 0..user_locks.len() {
            if remaining_amount <= 0 {
                break;
            }

            if let Some(tx_hash) = user_locks.get(i) {
                if let Some(mut entry) = env.storage().persistent().get::<DataKey, LockEntry>(&DataKey::UserLockByTxHash(user.clone(), tx_hash.clone())) {
                    // Check cooldown: lock_timestamp + unstake_cooldown_seconds <= now
                    let cooldown_end = entry.lock_timestamp.saturating_add(config.unstake_cooldown_seconds);
                    let cooldown_passed = now >= cooldown_end;

                    if entry.blub_locked > 0 && !entry.unlocked && cooldown_passed {
                        let unstake_from_entry = remaining_amount.min(entry.blub_locked);

                        total_blub_unstaked = total_blub_unstaked.saturating_add(unstake_from_entry);
                        total_aqua_unlocked = total_aqua_unlocked.saturating_add(entry.amount);

                        entry.blub_locked = entry.blub_locked.saturating_sub(unstake_from_entry);
                        entry.unlocked = true;

                        env.storage().persistent().set(&DataKey::UserLockByTxHash(user.clone(), tx_hash), &entry);

                        remaining_amount = remaining_amount.saturating_sub(unstake_from_entry);
                    }
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

        // Ensure pending rewards is never negative
        let pending_blub_rewards = Self::calculate_pending_rewards(&env, &user, &totals, now)?.max(0);
        totals.accumulated_rewards = totals.accumulated_rewards.saturating_add(pending_blub_rewards).max(0);

        // Ensure total transfer amount is never negative
        let total_blub_to_transfer = (total_blub_unstaked + pending_blub_rewards).max(0);
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

        // Prevent negative values using .max(0)
        totals.total_locked_aqua = totals.total_locked_aqua.saturating_sub(total_aqua_unlocked).max(0);
        totals.total_blub_minted = totals.total_blub_minted.saturating_sub(total_blub_unstaked).max(0);
        totals.accumulated_rewards = totals.accumulated_rewards.max(0);
        totals.last_update_ts = now;
        env.storage().persistent().set(&DataKey::UserLockTotals(user.clone()), &totals);

        // Prevent negative values in global state
        global_state.total_locked = global_state.total_locked.saturating_sub(total_aqua_unlocked).max(0);
        global_state.total_blub_supply = global_state.total_blub_supply.saturating_sub(total_blub_unstaked).max(0);
        global_state.locked = false;
        env.storage().instance().set(&DataKey::GlobalState, &global_state);

        env.events().publish(
            (symbol_short!("unstake"), user.clone()),
            (total_blub_unstaked, pending_blub_rewards),
        );

        // ===== SYNC REWARD BALANCE (v1.2.0) =====
        // Checkpoint and update user's staked balance for reward tracking
        let new_total_staked = Self::get_user_total_staked_blub(&env, &user);
        Self::sync_user_reward_balance(&env, &user, new_total_staked);

        Ok(())
    }

    // ============================================================================
    // SYNTHETIX-STYLE REWARD SYSTEM (v1.2.0)
    // ============================================================================

    /// Internal: Get the global reward state
    fn get_reward_state(env: &Env) -> RewardState {
        env.storage()
            .instance()
            .get(&DataKey::RewardStateV2)
            .unwrap_or(RewardState {
                reward_per_token_stored: 0,
                last_update_time: env.ledger().timestamp(),
                total_staked: 0,
                total_rewards_added: 0,
                total_rewards_claimed: 0,
            })
    }

    /// Internal: Get a user's reward state
    fn get_user_reward_state(env: &Env, user: &Address) -> UserRewardState {
        env.storage()
            .persistent()
            .get(&DataKey::UserRewardStateV2(user.clone()))
            .unwrap_or(UserRewardState {
                staked_balance: 0,
                reward_per_token_paid: 0,
                rewards_earned: 0,
                last_claim_time: 0,
                total_claimed: 0,
            })
    }

    /// Internal: Get user's reward state with migration fix
    /// For pre-migration stakers, initializes staked_balance from actual locks
    fn get_user_reward_state_with_migration(env: &Env, user: &Address) -> UserRewardState {
        let mut user_state = Self::get_user_reward_state(env, user);

        // Migration fix: If user has no reward state but has existing locks,
        // initialize their staked_balance from their actual locks
        if user_state.staked_balance == 0 && user_state.reward_per_token_paid == 0 {
            let actual_staked = Self::get_user_total_staked_blub(env, user);
            if actual_staked > 0 {
                user_state.staked_balance = actual_staked;
            }
        }

        user_state
    }

    /// Internal: Calculate pending rewards for a user
    /// Formula: earned = balance * (reward_per_token - user_paid) / PRECISION + user_earned
    fn calculate_user_pending_rewards(
        reward_state: &RewardState,
        user_state: &UserRewardState,
    ) -> i128 {
        if user_state.staked_balance == 0 {
            return user_state.rewards_earned;
        }

        let reward_delta = reward_state
            .reward_per_token_stored
            .saturating_sub(user_state.reward_per_token_paid);

        let new_rewards = user_state
            .staked_balance
            .saturating_mul(reward_delta)
            / REWARD_PRECISION;

        user_state.rewards_earned.saturating_add(new_rewards)
    }

    /// Internal: Checkpoint a user's rewards before any balance change
    /// This MUST be called BEFORE changing a user's staked balance
    /// It locks in all earned rewards up to this point
    fn checkpoint_user_internal(
        env: &Env,
        user: &Address,
        reward_state: &RewardState,
    ) -> UserRewardState {
        let mut user_state = Self::get_user_reward_state(env, user);

        // Migration fix: If user has no reward state but has existing locks,
        // initialize their staked_balance from their actual locks BEFORE calculating rewards.
        // This ensures pre-migration stakers earn rewards fairly from their first interaction.
        if user_state.staked_balance == 0 && user_state.reward_per_token_paid == 0 {
            let actual_staked = Self::get_user_total_staked_blub(env, user);
            if actual_staked > 0 {
                // User has existing stakes but no reward state (pre-migration staker)
                // Initialize their balance so they can earn rewards going forward
                user_state.staked_balance = actual_staked;
            }
        }

        // Calculate and save earned rewards
        user_state.rewards_earned =
            Self::calculate_user_pending_rewards(reward_state, &user_state);

        // Update the user's paid reward_per_token to current
        user_state.reward_per_token_paid = reward_state.reward_per_token_stored;

        // Save user state
        env.storage()
            .persistent()
            .set(&DataKey::UserRewardStateV2(user.clone()), &user_state);

        user_state
    }

    /// Internal: Update user's staked balance after checkpoint
    /// Called after checkpoint_user_internal
    fn update_user_staked_balance(
        env: &Env,
        user: &Address,
        new_balance: i128,
        reward_state: &mut RewardState,
        old_balance: i128,
    ) {
        let mut user_state = Self::get_user_reward_state(env, user);

        // Update global total_staked
        reward_state.total_staked = reward_state
            .total_staked
            .saturating_sub(old_balance)
            .saturating_add(new_balance);

        // Update user's staked balance
        user_state.staked_balance = new_balance;

        // Save both states
        env.storage()
            .instance()
            .set(&DataKey::RewardStateV2, reward_state);
        env.storage()
            .persistent()
            .set(&DataKey::UserRewardStateV2(user.clone()), &user_state);
    }

    /// Backend calls this to add BLUB rewards to the pool
    /// The rewards are distributed proportionally to all stakers based on their share
    ///
    /// # Arguments
    /// * `admin` - Admin address for authorization
    /// * `amount` - Amount of BLUB rewards to add
    ///
    /// # Authorization
    /// Requires admin authorization
    pub fn add_rewards(env: Env, admin: Address, amount: i128) -> Result<(), Error> {
        admin.require_auth();

        let config = Self::get_config(env.clone())?;
        if config.admin != admin {
            return Err(Error::Unauthorized);
        }

        if amount <= 0 {
            return Err(Error::InvalidInput);
        }

        let contract_address = env.current_contract_address();
        let mut reward_state = Self::get_reward_state(&env);
        let now = env.ledger().timestamp();

        // Transfer BLUB from admin to contract
        use soroban_sdk::token;
        let blub_client = token::Client::new(&env, &config.blub_token);
        let transfer_result = blub_client.try_transfer(&admin, &contract_address, &amount);
        if transfer_result.is_err() {
            return Err(Error::InsufficientBalance);
        }

        // Update reward_per_token: how much reward each token earns
        // Only update if there are stakers
        if reward_state.total_staked > 0 {
            let reward_per_token_increase = amount
                .saturating_mul(REWARD_PRECISION)
                / reward_state.total_staked;

            reward_state.reward_per_token_stored = reward_state
                .reward_per_token_stored
                .saturating_add(reward_per_token_increase);
        }

        reward_state.total_rewards_added = reward_state
            .total_rewards_added
            .saturating_add(amount);
        reward_state.last_update_time = now;

        env.storage()
            .instance()
            .set(&DataKey::RewardStateV2, &reward_state);

        // Emit event
        let event = RewardsAddedEvent {
            amount,
            total_staked: reward_state.total_staked,
            reward_per_token: reward_state.reward_per_token_stored,
            timestamp: now,
        };
        env.events().publish((symbol_short!("rwd_add"),), event);

        Ok(())
    }

    /// User claims their accumulated BLUB rewards
    /// Subject to claim cooldown (default 7 days)
    ///
    /// # Arguments
    /// * `user` - User address claiming rewards
    ///
    /// # Returns
    /// * `Ok(i128)` - Amount of rewards claimed
    /// * `Err(ClaimCooldownActive)` - If cooldown hasn't elapsed
    /// * `Err(NoRewardsToClaim)` - If no rewards available
    pub fn claim_rewards(env: Env, user: Address) -> Result<i128, Error> {
        user.require_auth();

        let config = Self::get_config(env.clone())?;
        let now = env.ledger().timestamp();

        // Get current states (with migration fix for pre-migration stakers)
        let reward_state = Self::get_reward_state(&env);
        let mut user_state = Self::get_user_reward_state_with_migration(&env, &user);

        // Check cooldown
        let cooldown_end = user_state
            .last_claim_time
            .saturating_add(config.claim_reward_cooldown_seconds);
        if now < cooldown_end && user_state.last_claim_time > 0 {
            return Err(Error::ClaimCooldownActive);
        }

        // Calculate pending rewards
        let pending = Self::calculate_user_pending_rewards(&reward_state, &user_state);

        if pending <= 0 {
            return Err(Error::NoRewardsToClaim);
        }

        // Update user state
        user_state.rewards_earned = 0;
        user_state.reward_per_token_paid = reward_state.reward_per_token_stored;
        user_state.last_claim_time = now;
        user_state.total_claimed = user_state.total_claimed.saturating_add(pending);

        // Update global claimed amount
        let mut reward_state_mut = reward_state.clone();
        reward_state_mut.total_rewards_claimed = reward_state_mut
            .total_rewards_claimed
            .saturating_add(pending);

        // Save states
        env.storage()
            .instance()
            .set(&DataKey::RewardStateV2, &reward_state_mut);
        env.storage()
            .persistent()
            .set(&DataKey::UserRewardStateV2(user.clone()), &user_state);

        // Transfer rewards to user
        use soroban_sdk::token;
        let blub_client = token::Client::new(&env, &config.blub_token);
        let contract_address = env.current_contract_address();
        let transfer_result = blub_client.try_transfer(&contract_address, &user, &pending);
        if transfer_result.is_err() {
            return Err(Error::InsufficientBalance);
        }

        // Emit event
        let event = RewardsClaimedEvent {
            user: user.clone(),
            amount: pending,
            total_claimed: user_state.total_claimed,
            timestamp: now,
        };
        env.events().publish((symbol_short!("rwd_clm"),), event);

        Ok(pending)
    }

    /// View function: Get user's pending rewards (without claiming)
    ///
    /// # Arguments
    /// * `user` - User address to check
    ///
    /// # Returns
    /// Amount of pending BLUB rewards
    pub fn get_pending_rewards(env: Env, user: Address) -> i128 {
        let reward_state = Self::get_reward_state(&env);
        let user_state = Self::get_user_reward_state_with_migration(&env, &user);
        Self::calculate_user_pending_rewards(&reward_state, &user_state)
    }

    /// View function: Get comprehensive reward info for a user
    ///
    /// # Arguments
    /// * `user` - User address to check
    ///
    /// # Returns
    /// UserRewardInfo with pending, claimed, balance, and cooldown status
    pub fn get_user_reward_info(env: Env, user: Address) -> UserRewardInfo {
        let config = Self::get_config(env.clone()).unwrap_or(Config {
            admin: user.clone(),
            version: 0,
            total_supply: 0,
            treasury_address: user.clone(),
            reward_rate: 0,
            aqua_token: user.clone(),
            blub_token: user.clone(),
            liquidity_contract: user.clone(),
            ice_token: user.clone(),
            govern_ice_token: user.clone(),
            upvote_ice_token: user.clone(),
            downvote_ice_token: user.clone(),
            period_unit_minutes: 1,
            vault_treasury: user.clone(),
            vault_fee_bps: 0,
            unstake_cooldown_seconds: 864000,
            claim_reward_cooldown_seconds: 604800,
        });

        let now = env.ledger().timestamp();
        let reward_state = Self::get_reward_state(&env);
        let user_state = Self::get_user_reward_state_with_migration(&env, &user);

        let pending = Self::calculate_user_pending_rewards(&reward_state, &user_state);
        let claim_available_at = user_state
            .last_claim_time
            .saturating_add(config.claim_reward_cooldown_seconds);
        let can_claim = now >= claim_available_at || user_state.last_claim_time == 0;

        UserRewardInfo {
            pending_rewards: pending,
            total_claimed: user_state.total_claimed,
            staked_balance: user_state.staked_balance,
            last_claim_time: user_state.last_claim_time,
            can_claim: can_claim && pending > 0,
            claim_available_at,
        }
    }

    /// View function: Check if a specific lock entry can be unstaked
    ///
    /// # Arguments
    /// * `user` - User address
    /// * `lock_index` - Index of the lock entry
    ///
    /// # Returns
    /// UnstakeStatus with availability info
    pub fn get_unstake_status(env: Env, user: Address, lock_index: u32) -> UnstakeStatus {
        let config = Self::get_config(env.clone()).unwrap_or(Config {
            admin: user.clone(),
            version: 0,
            total_supply: 0,
            treasury_address: user.clone(),
            reward_rate: 0,
            aqua_token: user.clone(),
            blub_token: user.clone(),
            liquidity_contract: user.clone(),
            ice_token: user.clone(),
            govern_ice_token: user.clone(),
            upvote_ice_token: user.clone(),
            downvote_ice_token: user.clone(),
            period_unit_minutes: 1,
            vault_treasury: user.clone(),
            vault_fee_bps: 0,
            unstake_cooldown_seconds: 864000,
            claim_reward_cooldown_seconds: 604800,
        });

        let now = env.ledger().timestamp();

        let user_locks: Vec<Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::UserLocks(user.clone()))
            .unwrap_or(Vec::new(&env));

        if let Some(tx_hash) = user_locks.get(lock_index) {
            if let Some(entry) = env
                .storage()
                .persistent()
                .get::<DataKey, LockEntry>(&DataKey::UserLockByTxHash(user, tx_hash))
            {
                let unstake_available_at = entry
                    .lock_timestamp
                    .saturating_add(config.unstake_cooldown_seconds);
                let can_unstake = now >= unstake_available_at && !entry.unlocked && entry.blub_locked > 0;

                return UnstakeStatus {
                    can_unstake,
                    unstake_available_at,
                    blub_amount: entry.blub_locked,
                };
            }
        }

        UnstakeStatus {
            can_unstake: false,
            unstake_available_at: 0,
            blub_amount: 0,
        }
    }

    /// Get the global reward state (view function)
    pub fn get_reward_state_view(env: Env) -> RewardState {
        Self::get_reward_state(&env)
    }

    /// Admin: Update the unstake cooldown period
    ///
    /// # Arguments
    /// * `admin` - Admin address
    /// * `cooldown_seconds` - New cooldown in seconds
    pub fn update_unstake_cooldown(
        env: Env,
        admin: Address,
        cooldown_seconds: u64,
    ) -> Result<(), Error> {
        admin.require_auth();

        let mut config = Self::get_config(env.clone())?;
        if config.admin != admin {
            return Err(Error::Unauthorized);
        }

        config.unstake_cooldown_seconds = cooldown_seconds;
        env.storage().instance().set(&DataKey::Config, &config);

        env.events().publish(
            (symbol_short!("cfg_upd"),),
            (symbol_short!("unstk_cd"), cooldown_seconds),
        );

        Ok(())
    }

    /// Admin: Update the claim reward cooldown period
    ///
    /// # Arguments
    /// * `admin` - Admin address
    /// * `cooldown_seconds` - New cooldown in seconds
    pub fn update_claim_cooldown(
        env: Env,
        admin: Address,
        cooldown_seconds: u64,
    ) -> Result<(), Error> {
        admin.require_auth();

        let mut config = Self::get_config(env.clone())?;
        if config.admin != admin {
            return Err(Error::Unauthorized);
        }

        config.claim_reward_cooldown_seconds = cooldown_seconds;
        env.storage().instance().set(&DataKey::Config, &config);

        env.events().publish(
            (symbol_short!("cfg_upd"),),
            (symbol_short!("clm_cd"), cooldown_seconds),
        );

        Ok(())
    }

    /// Internal helper: Checkpoint and update staked balance for reward tracking
    /// Call this after modifying a user's staked BLUB balance
    fn sync_user_reward_balance(env: &Env, user: &Address, new_blub_balance: i128) {
        let mut reward_state = Self::get_reward_state(env);
        let user_state = Self::checkpoint_user_internal(env, user, &reward_state);
        let old_balance = user_state.staked_balance;
        Self::update_user_staked_balance(env, user, new_blub_balance, &mut reward_state, old_balance);
    }

    /// Get user's total staked BLUB from all lock entries
    fn get_user_total_staked_blub(env: &Env, user: &Address) -> i128 {
        let user_locks: Vec<Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::UserLocks(user.clone()))
            .unwrap_or(Vec::new(env));

        let mut total = 0i128;
        for i in 0..user_locks.len() {
            if let Some(tx_hash) = user_locks.get(i) {
                if let Some(entry) = env
                    .storage()
                    .persistent()
                    .get::<DataKey, LockEntry>(&DataKey::UserLockByTxHash(user.clone(), tx_hash))
                {
                    if !entry.unlocked && entry.blub_locked > 0 {
                        total = total.saturating_add(entry.blub_locked);
                    }
                }
            }
        }
        total
    }

    // ============================================================================
    // ICE LOCKING FUNCTIONS (Request 1)
    // ============================================================================

    /// One-time setup to establish trustlines for all 4 ICE token types.
    /// Must be called by admin before contract can receive ICE tokens.
    ///
    /// # Authorization
    /// Requires admin authorization
    pub fn setup_ice_trustlines(env: Env) -> Result<(), Error> {
        let config = Self::get_config(env.clone())?;
        config.admin.require_auth();

        use soroban_sdk::token;
        let contract_address = env.current_contract_address();

        // Establish trustlines by calling balance() on each SAC token
        // This ensures the contract can receive these tokens
        let ice_client = token::Client::new(&env, &config.ice_token);
        let _ = ice_client.balance(&contract_address);

        let govern_ice_client = token::Client::new(&env, &config.govern_ice_token);
        let _ = govern_ice_client.balance(&contract_address);

        let upvote_ice_client = token::Client::new(&env, &config.upvote_ice_token);
        let _ = upvote_ice_client.balance(&contract_address);

        let downvote_ice_client = token::Client::new(&env, &config.downvote_ice_token);
        let _ = downvote_ice_client.balance(&contract_address);

        env.events().publish(
            (symbol_short!("ice_tl"),),
            symbol_short!("setup"),
        );

        Ok(())
    }

    /// Authorizes an ICE lock for a specific amount and duration.
    /// Backend cron will execute the actual locking on Stellar Classic.
    ///
    /// # Arguments
    /// * `aqua_amount` - Amount of AQUA to lock for ICE
    /// * `duration_years` - Lock duration (1-3 years)
    ///
    /// # Returns
    /// Lock ID for tracking
    ///
    /// # Authorization
    /// Requires admin authorization
    pub fn authorize_ice_lock(
        env: Env,
        aqua_amount: i128,
        duration_years: u64,
    ) -> Result<u64, Error> {
        let config = Self::get_config(env.clone())?;
        config.admin.require_auth();

        if aqua_amount <= 0 || duration_years == 0 || duration_years > 3 {
            return Err(Error::InvalidInput);
        }

        let mut global_state: GlobalState = env
            .storage()
            .instance()
            .get(&DataKey::GlobalState)
            .ok_or(Error::NotInitialized)?;

        if global_state.pending_aqua_for_ice < aqua_amount {
            return Err(Error::InsufficientPendingAqua);
        }

        let lock_id = global_state.ice_lock_counter;
        global_state.ice_lock_counter += 1;

        let authorization = IceLockAuthorization {
            lock_id,
            aqua_amount,
            duration_years,
            authorized_at: env.ledger().timestamp(),
            executed: false,
        };

        env.storage()
            .persistent()
            .set(&DataKey::IceLockAuth(lock_id), &authorization);

        env.storage()
            .instance()
            .set(&DataKey::GlobalState, &global_state);

        env.events().publish(
            (symbol_short!("ice_auth"), lock_id),
            (aqua_amount, duration_years),
        );

        Ok(lock_id)
    }

    /// Transfers authorized AQUA from contract to admin for ICE locking.
    /// Backend calls this after authorization to move AQUA to admin wallet,
    /// then creates claimable balance on Stellar Classic.
    ///
    /// # Arguments
    /// * `lock_id` - The authorization ID
    ///
    /// # Authorization
    /// Requires admin authorization
    pub fn transfer_authorized_aqua(env: Env, lock_id: u64) -> Result<(), Error> {
        let config = Self::get_config(env.clone())?;
        config.admin.require_auth();

        let mut authorization: IceLockAuthorization = env
            .storage()
            .persistent()
            .get(&DataKey::IceLockAuth(lock_id))
            .ok_or(Error::NotFound)?;

        if authorization.executed {
            return Err(Error::AlreadyExecuted);
        }

        let mut global_state: GlobalState = env
            .storage()
            .instance()
            .get(&DataKey::GlobalState)
            .ok_or(Error::NotInitialized)?;

        if global_state.pending_aqua_for_ice < authorization.aqua_amount {
            return Err(Error::InsufficientPendingAqua);
        }

        // Transfer AQUA to admin wallet
        use soroban_sdk::token;
        let aqua_client = token::Client::new(&env, &config.aqua_token);
        let contract_address = env.current_contract_address();

        aqua_client.transfer(
            &contract_address,
            &config.admin,
            &authorization.aqua_amount,
        );

        // Update state
        global_state.pending_aqua_for_ice = global_state
            .pending_aqua_for_ice
            .saturating_sub(authorization.aqua_amount);
        authorization.executed = true;

        env.storage()
            .persistent()
            .set(&DataKey::IceLockAuth(lock_id), &authorization);
        env.storage()
            .instance()
            .set(&DataKey::GlobalState, &global_state);

        env.events().publish(
            (symbol_short!("ice_xfer"), lock_id),
            authorization.aqua_amount,
        );

        Ok(())
    }

    /// Syncs all ICE token balances from SAC contracts.
    /// Backend calls this after ICE tokens are received.
    ///
    /// # Authorization
    /// Requires admin authorization
    pub fn sync_all_ice_balances(env: Env) -> Result<(), Error> {
        let config = Self::get_config(env.clone())?;
        config.admin.require_auth();

        use soroban_sdk::token;
        let contract_address = env.current_contract_address();

        let ice_client = token::Client::new(&env, &config.ice_token);
        let ice_balance = ice_client.balance(&contract_address);

        let govern_ice_client = token::Client::new(&env, &config.govern_ice_token);
        let govern_ice_balance = govern_ice_client.balance(&contract_address);

        let upvote_ice_client = token::Client::new(&env, &config.upvote_ice_token);
        let upvote_ice_balance = upvote_ice_client.balance(&contract_address);

        let downvote_ice_client = token::Client::new(&env, &config.downvote_ice_token);
        let downvote_ice_balance = downvote_ice_client.balance(&contract_address);

        let mut global_state: GlobalState = env
            .storage()
            .instance()
            .get(&DataKey::GlobalState)
            .ok_or(Error::NotInitialized)?;

        global_state.ice_balance = ice_balance;
        global_state.govern_ice_balance = govern_ice_balance;
        global_state.upvote_ice_balance = upvote_ice_balance;
        global_state.downvote_ice_balance = downvote_ice_balance;

        env.storage()
            .instance()
            .set(&DataKey::GlobalState, &global_state);

        env.events().publish(
            (symbol_short!("ice_sync"),),
            (ice_balance, govern_ice_balance, upvote_ice_balance, downvote_ice_balance),
        );

        Ok(())
    }

    // ============================================================================
    // VAULT FUNCTIONS (Request 2 - Boost Farming)
    // ============================================================================

    /// Adds a new pool to the vault (max 10 pools).
    ///
    /// # Arguments
    /// * `pool_address` - Aquarius pool contract address
    /// * `token_a` - First token in the pair
    /// * `token_b` - Second token in the pair
    /// * `share_token` - LP token address
    ///
    /// # Authorization
    /// Requires admin authorization
    pub fn add_pool(
        env: Env,
        pool_address: Address,
        token_a: Address,
        token_b: Address,
        share_token: Address,
    ) -> Result<u32, Error> {
        let config = Self::get_config(env.clone())?;
        config.admin.require_auth();

        let mut global_state: GlobalState = env
            .storage()
            .instance()
            .get(&DataKey::GlobalState)
            .ok_or(Error::NotInitialized)?;

        if global_state.pool_count >= 10 {
            return Err(Error::MaxPoolsReached);
        }

        let pool_id = global_state.pool_count;
        global_state.pool_count += 1;

        let pool_info = PoolInfo {
            pool_id,
            pool_address: pool_address.clone(),
            token_a: token_a.clone(),
            token_b: token_b.clone(),
            share_token: share_token.clone(),
            total_lp_tokens: 0,
            active: true,
            added_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::PoolInfo(pool_id), &pool_info);

        env.storage()
            .instance()
            .set(&DataKey::GlobalState, &global_state);

        env.events().publish(
            (symbol_short!("pool_add"), pool_id),
            (pool_address, token_a, token_b),
        );

        Ok(pool_id)
    }

    /// Updates a pool's active status.
    ///
    /// # Authorization
    /// Requires admin authorization
    pub fn update_pool_status(env: Env, pool_id: u32, active: bool) -> Result<(), Error> {
        let config = Self::get_config(env.clone())?;
        config.admin.require_auth();

        let mut pool_info: PoolInfo = env
            .storage()
            .persistent()
            .get(&DataKey::PoolInfo(pool_id))
            .ok_or(Error::PoolNotFound)?;

        pool_info.active = active;

        env.storage()
            .persistent()
            .set(&DataKey::PoolInfo(pool_id), &pool_info);

        env.events().publish(
            (symbol_short!("pool_upd"), pool_id),
            active,
        );

        Ok(())
    }

    /// Deposits tokens to a vault pool.
    /// User deposits token_a + token_b, contract adds liquidity to Aquarius pool.
    ///
    /// # Arguments
    /// * `user` - User address
    /// * `pool_id` - Pool ID
    /// * `desired_a` - Amount of token_a to deposit
    /// * `desired_b` - Amount of token_b to deposit
    /// * `min_shares` - Minimum LP shares to receive (slippage protection)
    ///
    /// # Authorization
    /// Requires user authorization
    pub fn vault_deposit(
        env: Env,
        user: Address,
        pool_id: u32,
        desired_a: i128,
        desired_b: i128,
        min_shares: u128,
    ) -> Result<(), Error> {
        user.require_auth();

        if desired_a <= 0 || desired_b <= 0 {
            return Err(Error::InvalidInput);
        }

        let mut pool_info: PoolInfo = env
            .storage()
            .persistent()
            .get(&DataKey::PoolInfo(pool_id))
            .ok_or(Error::PoolNotFound)?;

        if !pool_info.active {
            return Err(Error::PoolNotActive);
        }

        let contract_address = env.current_contract_address();

        // STEP 1: Transfer tokens from user to contract
        use soroban_sdk::token;
        let token_a_client = token::Client::new(&env, &pool_info.token_a);
        let token_b_client = token::Client::new(&env, &pool_info.token_b);

        token_a_client.transfer(&user, &contract_address, &desired_a);
        token_b_client.transfer(&user, &contract_address, &desired_b);

        // STEP 2: Authorize Aquarius pool to transfer tokens from this contract
        // The pool will call token.transfer(this_contract, pool, amount)
        let auth_entries = soroban_sdk::vec![
            &env,
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: pool_info.token_a.clone(),
                    fn_name: Symbol::new(&env, "transfer"),
                    args: (
                        contract_address.clone(),
                        pool_info.pool_address.clone(),
                        desired_a,
                    ).into_val(&env),
                },
                sub_invocations: soroban_sdk::vec![&env],
            }),
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: pool_info.token_b.clone(),
                    fn_name: Symbol::new(&env, "transfer"),
                    args: (
                        contract_address.clone(),
                        pool_info.pool_address.clone(),
                        desired_b,
                    ).into_val(&env),
                },
                sub_invocations: soroban_sdk::vec![&env],
            }),
        ];
        env.authorize_as_current_contract(auth_entries);

        // STEP 3: Deposit tokens to Aquarius pool
        let aquarius_pool = AquariusPoolClient::new(&env, &pool_info.pool_address);

        let mut desired_amounts = Vec::new(&env);
        desired_amounts.push_back(desired_a as u128);
        desired_amounts.push_back(desired_b as u128);

        let (_actual_amounts, lp_shares_minted) = aquarius_pool.deposit(
            &contract_address,
            &desired_amounts,
            &min_shares,
        );

        // STEP 3: Update pool's total LP tokens
        let old_total = pool_info.total_lp_tokens;
        pool_info.total_lp_tokens = old_total.saturating_add(lp_shares_minted as i128);

        // STEP 4: Get or create user position
        let mut user_position: UserVaultPosition = env
            .storage()
            .persistent()
            .get(&DataKey::UserVaultPosition(user.clone(), pool_id))
            .unwrap_or(UserVaultPosition {
                user: user.clone(),
                pool_id,
                share_ratio: 0,
                deposited_at: env.ledger().timestamp(),
                active: true,
            });

        // STEP 5: Calculate user's new share ratio
        // Old user LP = (pool_total_before * user_share_ratio) / 1_000_000_000_000
        let user_old_lp = if old_total > 0 && user_position.share_ratio > 0 {
            (old_total as i128)
                .checked_mul(user_position.share_ratio)
                .unwrap_or(0)
                .checked_div(1_000_000_000_000)
                .unwrap_or(0)
        } else {
            0
        };

        // New user LP = old + newly minted
        let user_new_lp = user_old_lp.saturating_add(lp_shares_minted as i128);

        // Update share ratio: (user_new_lp / pool_total_new) * 1_000_000_000_000
        if pool_info.total_lp_tokens > 0 {
            user_position.share_ratio = (user_new_lp as i128)
                .checked_mul(1_000_000_000_000)
                .unwrap_or(0)
                .checked_div(pool_info.total_lp_tokens)
                .unwrap_or(0);
        }

        user_position.active = true;

        env.storage()
            .persistent()
            .set(&DataKey::PoolInfo(pool_id), &pool_info);
        env.storage()
            .persistent()
            .set(&DataKey::UserVaultPosition(user.clone(), pool_id), &user_position);

        env.events().publish(
            (symbol_short!("vault_dep"), user.clone(), pool_id),
            (desired_a, desired_b, lp_shares_minted, user_position.share_ratio),
        );

        Ok(())
    }

    /// Withdraws tokens from a vault pool.
    /// User withdraws their share, contract removes liquidity from Aquarius pool.
    ///
    /// # Arguments
    /// * `user` - User address
    /// * `pool_id` - Pool ID
    /// * `share_percent` - Percentage of user's position to withdraw (0-10000 = 0-100%)
    /// * `min_a` - Minimum amount of token_a to receive (slippage protection)
    /// * `min_b` - Minimum amount of token_b to receive (slippage protection)
    ///
    /// # Authorization
    /// Requires user authorization
    pub fn vault_withdraw(
        env: Env,
        user: Address,
        pool_id: u32,
        share_percent: u32,
        min_a: u128,
        min_b: u128,
    ) -> Result<(), Error> {
        user.require_auth();

        if share_percent == 0 || share_percent > 10000 {
            return Err(Error::InvalidInput);
        }

        let mut pool_info: PoolInfo = env
            .storage()
            .persistent()
            .get(&DataKey::PoolInfo(pool_id))
            .ok_or(Error::PoolNotFound)?;

        let mut user_position: UserVaultPosition = env
            .storage()
            .persistent()
            .get(&DataKey::UserVaultPosition(user.clone(), pool_id))
            .ok_or(Error::PositionNotFound)?;

        if !user_position.active {
            return Err(Error::PositionNotFound);
        }

        // STEP 1: Calculate user's LP share amount
        let user_total_lp = (pool_info.total_lp_tokens as i128)
            .checked_mul(user_position.share_ratio)
            .unwrap_or(0)
            .checked_div(1_000_000_000_000)
            .unwrap_or(0);

        if user_total_lp <= 0 {
            return Err(Error::InsufficientBalance);
        }

        // Calculate LP amount to withdraw based on percentage
        let lp_to_withdraw = (user_total_lp as i128)
            .checked_mul(share_percent as i128)
            .unwrap_or(0)
            .checked_div(10000)
            .unwrap_or(0);

        if lp_to_withdraw <= 0 {
            return Err(Error::InvalidInput);
        }

        // STEP 2: Authorize Aquarius pool to burn LP tokens from this contract
        let contract_address = env.current_contract_address();

        // Note: Aquarius pool calls burn(from, amount), not transfer
        let auth_entries = soroban_sdk::vec![
            &env,
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: pool_info.share_token.clone(),
                    fn_name: Symbol::new(&env, "burn"),
                    args: (
                        contract_address.clone(),
                        lp_to_withdraw,
                    ).into_val(&env),
                },
                sub_invocations: soroban_sdk::vec![&env],
            }),
        ];
        env.authorize_as_current_contract(auth_entries);

        // STEP 3: Withdraw from Aquarius pool
        let aquarius_pool = AquariusPoolClient::new(&env, &pool_info.pool_address);

        let mut min_amounts = Vec::new(&env);
        min_amounts.push_back(min_a);
        min_amounts.push_back(min_b);

        let withdrawn_amounts = aquarius_pool.withdraw(
            &contract_address,
            &(lp_to_withdraw as u128),
            &min_amounts,
        );

        // STEP 3: Transfer tokens to user
        use soroban_sdk::token;
        let token_a_client = token::Client::new(&env, &pool_info.token_a);
        let token_b_client = token::Client::new(&env, &pool_info.token_b);

        let amount_a = withdrawn_amounts.get(0).unwrap_or(0);
        let amount_b = withdrawn_amounts.get(1).unwrap_or(0);

        token_a_client.transfer(&contract_address, &user, &(amount_a as i128));
        token_b_client.transfer(&contract_address, &user, &(amount_b as i128));

        // STEP 4: Update pool total LP
        pool_info.total_lp_tokens = pool_info.total_lp_tokens.saturating_sub(lp_to_withdraw);

        // STEP 5: Update user share ratio
        let remaining_user_lp = user_total_lp.saturating_sub(lp_to_withdraw);

        if pool_info.total_lp_tokens > 0 && remaining_user_lp > 0 {
            user_position.share_ratio = (remaining_user_lp as i128)
                .checked_mul(1_000_000_000_000)
                .unwrap_or(0)
                .checked_div(pool_info.total_lp_tokens)
                .unwrap_or(0);
        } else {
            user_position.share_ratio = 0;
            user_position.active = false;
        }

        env.storage()
            .persistent()
            .set(&DataKey::PoolInfo(pool_id), &pool_info);
        env.storage()
            .persistent()
            .set(&DataKey::UserVaultPosition(user.clone(), pool_id), &user_position);

        env.events().publish(
            (symbol_short!("vault_wd"), user.clone(), pool_id),
            (lp_to_withdraw, amount_a, amount_b),
        );

        Ok(())
    }

    /// Claims boosted rewards from a pool and auto-compounds.
    /// 30% to treasury, 70% auto-compound back to pool.
    /// Backend cron calls this 4x daily using ICE balance for boost.
    ///
    /// # Arguments
    /// * `pool_id` - Pool ID to claim rewards from
    ///
    /// # Authorization
    /// Requires admin authorization
    pub fn claim_and_compound(env: Env, pool_id: u32) -> Result<(), Error> {
        let config = Self::get_config(env.clone())?;
        config.admin.require_auth();

        let mut pool_info: PoolInfo = env
            .storage()
            .persistent()
            .get(&DataKey::PoolInfo(pool_id))
            .ok_or(Error::PoolNotFound)?;

        if !pool_info.active {
            return Err(Error::PoolNotActive);
        }

        let contract_address = env.current_contract_address();

        // STEP 1: Claim rewards from Aquarius pool
        // Our contract holds LP tokens, so Aquarius tracks our position with ICE boost
        let aquarius_pool = AquariusPoolClient::new(&env, &pool_info.pool_address);
        let total_rewards = aquarius_pool.claim(&contract_address);

        if total_rewards == 0 {
            env.events().publish(
                (symbol_short!("compound"), pool_id),
                symbol_short!("no_reward"),
            );
            return Ok(());
        }

        // STEP 2: Split rewards - 30% to treasury, 70% for auto-compound
        let treasury_amount = (total_rewards as u128)
            .checked_mul(config.vault_fee_bps as u128)
            .unwrap_or(0)
            .checked_div(10000)
            .unwrap_or(0);

        let compound_amount = total_rewards.saturating_sub(treasury_amount);

        // STEP 3: Transfer 30% to vault treasury
        if treasury_amount > 0 {
            use soroban_sdk::token;
            let aqua_client = token::Client::new(&env, &config.aqua_token);
            aqua_client.transfer(&contract_address, &config.vault_treasury, &(treasury_amount as i128));
        }

        // STEP 4: Auto-compound 70% back to the pool
        if compound_amount > 0 {
            // Determine how to split AQUA for the pool's token pair
            let (token_a_is_aqua, token_b_is_aqua) = (
                pool_info.token_a == config.aqua_token,
                pool_info.token_b == config.aqua_token,
            );

            let mut token_a_amount: u128 = 0;
            let mut token_b_amount: u128 = 0;

            if token_a_is_aqua && token_b_is_aqua {
                // Both tokens are AQUA (shouldn't happen, but handle it)
                token_a_amount = compound_amount / 2;
                token_b_amount = compound_amount - token_a_amount;
            } else if token_a_is_aqua {
                // token_a is AQUA, need to swap half for token_b
                token_a_amount = compound_amount / 2;
                // TODO: Swap remaining half AQUA to token_b via liquidity_contract
                // For now, we just hold the AQUA and emit event for backend to handle
                token_b_amount = 0; // Backend will handle swap

                env.events().publish(
                    (symbol_short!("need_swap"), pool_id),
                    (compound_amount - token_a_amount, symbol_short!("to_b")),
                );
            } else if token_b_is_aqua {
                // token_b is AQUA, need to swap half for token_a
                token_b_amount = compound_amount / 2;
                // TODO: Swap remaining half AQUA to token_a via liquidity_contract
                token_a_amount = 0; // Backend will handle swap

                env.events().publish(
                    (symbol_short!("need_swap"), pool_id),
                    (compound_amount - token_b_amount, symbol_short!("to_a")),
                );
            } else {
                // Neither token is AQUA - need to swap AQUA to both tokens
                // TODO: Swap half AQUA to token_a, half to token_b via liquidity_contract
                // Backend will handle this complex swap scenario

                env.events().publish(
                    (symbol_short!("need_swap"), pool_id),
                    (compound_amount, symbol_short!("to_both")),
                );
            }

            // STEP 5: Deposit tokens back to Aquarius pool (if we have both tokens)
            // Note: For non-AQUA pairs, backend must complete swaps first, then call this again
            if token_a_amount > 0 && token_b_amount > 0 {
                // Authorize Aquarius pool to transfer tokens from this contract
                let auth_entries = soroban_sdk::vec![
                    &env,
                    InvokerContractAuthEntry::Contract(SubContractInvocation {
                        context: ContractContext {
                            contract: pool_info.token_a.clone(),
                            fn_name: Symbol::new(&env, "transfer"),
                            args: (
                                contract_address.clone(),
                                pool_info.pool_address.clone(),
                                token_a_amount as i128,
                            ).into_val(&env),
                        },
                        sub_invocations: soroban_sdk::vec![&env],
                    }),
                    InvokerContractAuthEntry::Contract(SubContractInvocation {
                        context: ContractContext {
                            contract: pool_info.token_b.clone(),
                            fn_name: Symbol::new(&env, "transfer"),
                            args: (
                                contract_address.clone(),
                                pool_info.pool_address.clone(),
                                token_b_amount as i128,
                            ).into_val(&env),
                        },
                        sub_invocations: soroban_sdk::vec![&env],
                    }),
                ];
                env.authorize_as_current_contract(auth_entries);

                let mut desired_amounts = Vec::new(&env);
                desired_amounts.push_back(token_a_amount);
                desired_amounts.push_back(token_b_amount);

                // Deposit to Aquarius pool - get LP shares back
                let (_actual_amounts, lp_shares_minted) = aquarius_pool.deposit(
                    &contract_address,
                    &desired_amounts,
                    &0u128, // min_shares = 0 for auto-compound (we trust the pool)
                );

                // Update pool's total LP tokens
                pool_info.total_lp_tokens = pool_info
                    .total_lp_tokens
                    .saturating_add(lp_shares_minted as i128);

                env.storage()
                    .persistent()
                    .set(&DataKey::PoolInfo(pool_id), &pool_info);

                env.events().publish(
                    (symbol_short!("compound"), pool_id),
                    (lp_shares_minted, pool_info.total_lp_tokens),
                );
            }
        }

        env.events().publish(
            (symbol_short!("compound"), pool_id),
            (total_rewards, treasury_amount, compound_amount),
        );

        Ok(())
    }

    // ============================================================================
    // QUERY FUNCTIONS - ICE & Vault
    // ============================================================================

    /// Gets pending AQUA available for ICE locking.
    pub fn get_pending_aqua_for_ice(env: Env) -> Result<i128, Error> {
        let global_state: GlobalState = env
            .storage()
            .instance()
            .get(&DataKey::GlobalState)
            .ok_or(Error::NotInitialized)?;

        Ok(global_state.pending_aqua_for_ice)
    }

    /// Gets all 4 ICE token balances.
    pub fn get_all_ice_balances(env: Env) -> Result<(i128, i128, i128, i128), Error> {
        let global_state: GlobalState = env
            .storage()
            .instance()
            .get(&DataKey::GlobalState)
            .ok_or(Error::NotInitialized)?;

        Ok((
            global_state.ice_balance,
            global_state.govern_ice_balance,
            global_state.upvote_ice_balance,
            global_state.downvote_ice_balance,
        ))
    }

    /// Gets upvoteICE balance for voting.
    pub fn get_upvote_ice_balance(env: Env) -> Result<i128, Error> {
        let global_state: GlobalState = env
            .storage()
            .instance()
            .get(&DataKey::GlobalState)
            .ok_or(Error::NotInitialized)?;

        Ok(global_state.upvote_ice_balance)
    }

    /// Gets ICE lock authorization by ID.
    pub fn get_ice_lock_authorization(env: Env, lock_id: u64) -> Result<IceLockAuthorization, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::IceLockAuth(lock_id))
            .ok_or(Error::NotFound)
    }

    /// Gets pool information by ID.
    pub fn get_pool_info(env: Env, pool_id: u32) -> Result<PoolInfo, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::PoolInfo(pool_id))
            .ok_or(Error::PoolNotFound)
    }

    /// Gets user's vault position in a specific pool.
    pub fn get_user_vault_position(env: Env, user: Address, pool_id: u32) -> Result<UserVaultPosition, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::UserVaultPosition(user, pool_id))
            .ok_or(Error::PositionNotFound)
    }

    /// Gets total number of vault pools.
    pub fn get_pool_count(env: Env) -> Result<u32, Error> {
        let global_state: GlobalState = env
            .storage()
            .instance()
            .get(&DataKey::GlobalState)
            .ok_or(Error::NotInitialized)?;

        Ok(global_state.pool_count)
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