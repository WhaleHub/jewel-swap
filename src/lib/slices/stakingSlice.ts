import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { apiService } from "../../services/api.service";

// Staking interfaces
export interface LockInfo {
  user: string;
  amount: string;
  lockTimestamp: number;
  durationDays: number;
  rewardMultiplier: number;
  txHash: string;
  polContributed: string;
  isActive: boolean;
}

export interface StakeStats {
  totalStakes?: number;
  activeStakes?: number;
  totalAmount: string;
  activeAmount: string;
  unstakingAvailable: string;
  polContribution: string;
}

export interface PolInfo {
  totalAqua: string;
  totalBlub: string;
  lpPosition: string;
  rewardsEarned: string;
  iceVotingPower: string;
}

export interface StakingState {
  // Loading states
  isLoading: boolean;
  isStaking: boolean;
  isUnstaking: boolean;
  isRestaking: boolean;

  // User data
  userLocks: LockInfo[];
  userStats: StakeStats | null;
  polInfo: PolInfo | null;

  // Global data
  globalStats: StakeStats | null;

  // Transaction states
  lastTransaction: {
    hash?: string;
    type?: "stake" | "unstake" | "restake";
    status?: "pending" | "success" | "failed";
    error?: string;
  } | null;

  // Error handling
  error: string | null;
  syncStatus: "idle" | "syncing" | "success" | "error";
  lastSyncTime: number | null;
}

const initialState: StakingState = {
  isLoading: false,
  isStaking: false,
  isUnstaking: false,
  isRestaking: false,
  userLocks: [],
  userStats: null,
  polInfo: null,
  globalStats: null,
  lastTransaction: null,
  error: null,
  syncStatus: "idle",
  lastSyncTime: null,
};

// ============================================================================
// DEPRECATED THUNKS - DO NOT USE FOR SOROBAN STAKING
// ============================================================================
// These thunks make unnecessary backend API calls. For pure Soroban staking,
// transactions happen directly on-chain and data is queried via
// fetchComprehensiveStakingData(). Keep these for backward compatibility only.
// ============================================================================

/**
 * @deprecated Use direct Soroban contract calls instead. No backend needed.
 */
export const lockAqua = createAsyncThunk(
  "staking/lockAqua",
  async (params: {
    userAddress: string;
    amount: string;
    durationDays: number;
    txHash: string;
  }) => {
    console.warn(
      "[stakingSlice] ⚠️ DEPRECATED: lockAqua thunk should not be used for Soroban staking"
    );
    const { userAddress, amount, durationDays, txHash } = params;

    const result = await apiService.recordAquaLock({
      userAddress,
      amount,
      durationDays,
      txHash,
    });

    return {
      success: true,
      data: result,
      transactionHash: txHash,
    };
  }
);

/**
 * @deprecated Use direct Soroban contract calls instead. No backend needed.
 */
export const unlockAqua = createAsyncThunk(
  "staking/unlockAqua",
  async (params: {
    userAddress: string;
    lockId: number;
    amount: string;
    txHash: string;
  }) => {
    console.warn(
      "[stakingSlice] ⚠️ DEPRECATED: unlockAqua thunk should not be used for Soroban staking"
    );
    const { userAddress, lockId, amount, txHash } = params;

    const result = await apiService.recordAquaUnlock({
      userAddress,
      lockId,
      amount,
      txHash,
    });

    return {
      success: true,
      data: result,
      transactionHash: txHash,
    };
  }
);

/**
 * @deprecated Use direct Soroban contract calls instead. No backend needed.
 */
export const restakeBlub = createAsyncThunk(
  "staking/restakeBlub",
  async (params: { userAddress: string; amount: string; txHash: string }) => {
    console.warn(
      "[stakingSlice] ⚠️ DEPRECATED: restakeBlub thunk should not be used for Soroban staking"
    );
    const { userAddress, amount, txHash } = params;

    const result = await apiService.recordBlubRestake({
      userAddress,
      amount,
      txHash,
    });

    return {
      success: true,
      data: result,
      transactionHash: txHash,
    };
  }
);

export const fetchUserLocks = createAsyncThunk(
  "staking/fetchUserLocks",
  async (userAddress: string) => {
    try {
      // Query DIRECTLY from contract (no backend)
      const { sorobanService } = await import("../../services/soroban.service");
      const { Address, nativeToScVal } = await import("@stellar/stellar-sdk");

      console.log(
        "🔍 [stakingSlice] Fetching user locks DIRECTLY from contract..."
      );

      const contract = sorobanService.getContract("staking");
      const server = sorobanService.getServer();
      const account = await server.getAccount(userAddress);
      const { TransactionBuilder, Networks, scValToNative } = await import(
        "@stellar/stellar-sdk"
      );

      // Get lock count
      const countTx = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: Networks.TESTNET, // Using TESTNET
      })
        .addOperation(
          contract.call(
            "get_lock_count",
            Address.fromString(userAddress).toScVal()
          )
        )
        .setTimeout(30)
        .build();

      const countSim: any = await server.simulateTransaction(countTx);
      const lockCount = countSim.result?.retval
        ? scValToNative(countSim.result.retval)
        : 0;

      console.log(`📊 [stakingSlice] User has ${lockCount} locks`);

      // Fetch each lock
      const locks = [];
      for (let i = 0; i < lockCount; i++) {
        const lockTx = new TransactionBuilder(account, {
          fee: "100",
          networkPassphrase: Networks.TESTNET, // Using TESTNET
        })
          .addOperation(
            contract.call(
              "get_lock_by_index",
              Address.fromString(userAddress).toScVal(),
              nativeToScVal(i, { type: "u32" })
            )
          )
          .setTimeout(30)
          .build();

        const lockSim: any = await server.simulateTransaction(lockTx);
        if (lockSim.result?.retval) {
          const lock = scValToNative(lockSim.result.retval);
          locks.push({
            ...lock,
            amount: lock.amount?.toString() || "0",
            isActive: lock.is_active !== false,
          });
        }
      }

      console.log("✅ [stakingSlice] Locks fetched from contract:", locks);
      return locks;
    } catch (error) {
      console.error(
        "❌ [stakingSlice] Failed to fetch locks from contract:",
        error
      );
      return [];
    }
  }
);

export const fetchStakingStats = createAsyncThunk(
  "staking/fetchStakingStats",
  async (userAddress?: string) => {
    try {
      // Query DIRECTLY from contract (no backend)
      const { sorobanService } = await import("../../services/soroban.service");
      console.log(
        "🔍 [stakingSlice] Fetching staking stats DIRECTLY from contract..."
      );

      if (userAddress) {
        const globalState = await sorobanService.queryGlobalState();

        return {
          totalAmount: globalState?.total_staked || "0",
          activeAmount: globalState?.total_staked || "0",
          unstakingAvailable: "0", // Global state doesn't track individual unstakable amounts
          polContribution: globalState?.pol_contribution || "0",
        };
      }

      return {
        totalAmount: "0",
        activeAmount: "0",
        unstakingAvailable: "0",
        polContribution: "0",
      };
    } catch (error) {
      console.error("❌ [stakingSlice] Failed to fetch staking stats:", error);
      return {
        totalAmount: "0",
        activeAmount: "0",
        unstakingAvailable: "0",
        polContribution: "0",
      };
    }
  }
);

export const fetchPolInfo = createAsyncThunk(
  "staking/fetchPolInfo",
  async () => {
    try {
      // Query DIRECTLY from contract (no backend)
      const { sorobanService } = await import("../../services/soroban.service");
      console.log(
        "🔍 [stakingSlice] Fetching POL info DIRECTLY from contract..."
      );

      const polInfo = await sorobanService.queryPolInfo();

      // Convert stroops to tokens
      const result = {
        totalAqua: polInfo?.total_aqua
          ? (Number(polInfo.total_aqua) / 10000000).toFixed(7)
          : "0",
        totalBlub: polInfo?.total_blub
          ? (Number(polInfo.total_blub) / 10000000).toFixed(7)
          : "0",
        lpPosition: polInfo?.lp_shares
          ? (Number(polInfo.lp_shares) / 10000000).toFixed(7)
          : "0",
        rewardsEarned: polInfo?.rewards_earned
          ? (Number(polInfo.rewards_earned) / 10000000).toFixed(7)
          : "0",
        iceVotingPower: polInfo?.ice_voting_power
          ? (Number(polInfo.ice_voting_power) / 10000000).toFixed(7)
          : "0",
      };

      console.log("✅ [stakingSlice] POL info fetched:", result);
      return result;
    } catch (error) {
      console.error("❌ [stakingSlice] Failed to fetch POL info:", error);
      return {
        totalAqua: "0",
        totalBlub: "0",
        lpPosition: "0",
        rewardsEarned: "0",
        iceVotingPower: "0",
      };
    }
  }
);

/**
 * NEW: Fetch comprehensive user staking data from Soroban contracts
 * This replaces the old syncStakingData and fetches all data directly from contracts
 * Uses the direct query methods: queryUserStakingInfo, queryPolInfo, etc.
 */
export const fetchComprehensiveStakingData = createAsyncThunk(
  "staking/fetchComprehensiveData",
  async (userAddress: string) => {
    try {
      console.log(
        "🔄 [stakingSlice] Fetching comprehensive staking data for:",
        userAddress
      );

      // Import soroban service
      const { sorobanService } = await import("../../services/soroban.service");

      // Fetch data using direct query methods (already formatted)
      const [stakingInfo, polInfo, blubBalance] = await Promise.all([
        sorobanService.queryUserStakingInfo(userAddress),
        sorobanService.queryPolInfo(),
        sorobanService.queryBlubBalance(userAddress),
      ]);

      console.log("✅ [stakingSlice] Comprehensive data fetched:", {
        stakingInfo,
        polInfo,
        blubBalance,
      });

      return {
        stakingInfo,
        blubBalance,
        polInfo,
      };
    } catch (error: any) {
      console.error(
        "❌ [stakingSlice] Failed to fetch comprehensive data:",
        error
      );
      throw error;
    }
  }
);

/**
 * @deprecated Use fetchComprehensiveStakingData instead which queries directly from Soroban contracts.
 * This function makes unnecessary backend API calls.
 */
export const syncStakingData = createAsyncThunk(
  "staking/syncData",
  async (userAddress: string) => {
    console.warn(
      "[stakingSlice] ⚠️ DEPRECATED: syncStakingData should not be used. Use fetchComprehensiveStakingData instead."
    );

    // Fetch all staking related data from backend (deprecated approach)
    const [userLocks, userStats, polInfo, globalStats] = await Promise.all([
      apiService.getUserLocks(userAddress),
      apiService.getStakingStats(userAddress),
      apiService.getProtocolOwnedLiquidity(),
      apiService.getStakingStats(),
    ]);

    return {
      userLocks: userLocks.data || [],
      userStats: userStats.data,
      polInfo: polInfo.data,
      globalStats: globalStats.data,
    };
  }
);

// Slice
const stakingSlice = createSlice({
  name: "staking",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearTransaction: (state) => {
      state.lastTransaction = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    updateSyncStatus: (
      state,
      action: PayloadAction<"idle" | "syncing" | "success" | "error">
    ) => {
      state.syncStatus = action.payload;
      if (action.payload === "success") {
        state.lastSyncTime = Date.now();
      }
    },
  },
  extraReducers: (builder) => {
    // Lock AQUA
    builder
      .addCase(lockAqua.pending, (state) => {
        state.isStaking = true;
        state.error = null;
        state.lastTransaction = { type: "stake", status: "pending" };
      })
      .addCase(lockAqua.fulfilled, (state, action) => {
        state.isStaking = false;
        state.lastTransaction = {
          type: "stake",
          status: "success",
          hash: action.payload.transactionHash,
        };
      })
      .addCase(lockAqua.rejected, (state, action) => {
        state.isStaking = false;
        state.error = action.error.message || "Failed to lock AQUA";
        state.lastTransaction = {
          type: "stake",
          status: "failed",
          error: action.error.message,
        };
      });

    // Unlock AQUA
    builder
      .addCase(unlockAqua.pending, (state) => {
        state.isUnstaking = true;
        state.error = null;
        state.lastTransaction = { type: "unstake", status: "pending" };
      })
      .addCase(unlockAqua.fulfilled, (state, action) => {
        state.isUnstaking = false;
        state.lastTransaction = {
          type: "unstake",
          status: "success",
          hash: action.payload.transactionHash,
        };
      })
      .addCase(unlockAqua.rejected, (state, action) => {
        state.isUnstaking = false;
        state.error = action.error.message || "Failed to unlock AQUA";
        state.lastTransaction = {
          type: "unstake",
          status: "failed",
          error: action.error.message,
        };
      });

    // Restake BLUB
    builder
      .addCase(restakeBlub.pending, (state) => {
        state.isRestaking = true;
        state.error = null;
        state.lastTransaction = { type: "restake", status: "pending" };
      })
      .addCase(restakeBlub.fulfilled, (state, action) => {
        state.isRestaking = false;
        state.lastTransaction = {
          type: "restake",
          status: "success",
          hash: action.payload.transactionHash,
        };
      })
      .addCase(restakeBlub.rejected, (state, action) => {
        state.isRestaking = false;
        state.error = action.error.message || "Failed to restake BLUB";
        state.lastTransaction = {
          type: "restake",
          status: "failed",
          error: action.error.message,
        };
      });

    // Fetch user locks
    builder
      .addCase(fetchUserLocks.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchUserLocks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userLocks = action.payload;
      })
      .addCase(fetchUserLocks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to fetch user locks";
      });

    // Fetch staking stats
    builder.addCase(fetchStakingStats.fulfilled, (state, action) => {
      state.userStats = action.payload;
    });

    // Fetch POL info
    builder.addCase(fetchPolInfo.fulfilled, (state, action) => {
      state.polInfo = action.payload;
    });

    // Sync staking data
    builder
      .addCase(syncStakingData.pending, (state) => {
        state.syncStatus = "syncing";
      })
      .addCase(syncStakingData.fulfilled, (state, action) => {
        state.syncStatus = "success";
        state.userLocks = action.payload.userLocks;
        state.userStats = action.payload.userStats;
        state.polInfo = action.payload.polInfo;
        state.globalStats = action.payload.globalStats;
        state.lastSyncTime = Date.now();
      })
      .addCase(syncStakingData.rejected, (state, action) => {
        state.syncStatus = "error";
        state.error = action.error.message || "Failed to sync staking data";
      });

    // NEW: Fetch comprehensive staking data
    builder
      .addCase(fetchComprehensiveStakingData.pending, (state) => {
        state.isLoading = true;
        state.syncStatus = "syncing";
        state.error = null;
      })
      .addCase(fetchComprehensiveStakingData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.syncStatus = "success";

        // Update state with comprehensive data
        const payload = action.payload;

        // Update user stats from stakingInfo (already formatted by service)
        if (payload.stakingInfo) {
          // Calculate total staked = locked + unlockable (expired but not yet unstaked)
          const totalStakedAmount = (
            parseFloat(payload.stakingInfo.total_staked_blub || "0") +
            parseFloat(payload.stakingInfo.unstaking_available || "0")
          ).toFixed(7);

          state.userStats = {
            // Removed count tracking - no longer tracked in contract
            totalAmount: totalStakedAmount,
            activeAmount: payload.stakingInfo.total_staked_blub || "0",
            unstakingAvailable: payload.stakingInfo.unstaking_available || "0",
            polContribution: "0", // Will be fetched from polInfo
          };
        }

        // Update POL info (already formatted by service)
        if (payload.polInfo) {
          state.polInfo = {
            totalAqua: payload.polInfo.total_aqua_contributed || "0",
            totalBlub: payload.polInfo.total_blub_contributed || "0",
            lpPosition: payload.polInfo.aqua_blub_lp_position || "0",
            rewardsEarned: payload.polInfo.total_pol_rewards_earned || "0",
            iceVotingPower: payload.polInfo.ice_voting_power_used || "0",
          };
        }

        state.lastSyncTime = Date.now();
      })
      .addCase(fetchComprehensiveStakingData.rejected, (state, action) => {
        state.isLoading = false;
        state.syncStatus = "error";
        state.error =
          action.error.message || "Failed to fetch comprehensive staking data";
      });
  },
});

export const { clearError, clearTransaction, setLoading, updateSyncStatus } =
  stakingSlice.actions;
export default stakingSlice;
