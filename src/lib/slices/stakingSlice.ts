import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/api.service';
import { sorobanService } from '../../services/soroban.service';
import { Keypair } from '@stellar/stellar-sdk';

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
  totalStakes: number;
  activeStakes: number;
  totalAmount: string;
  activeAmount: string;
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
    type?: 'stake' | 'unstake' | 'restake';
    status?: 'pending' | 'success' | 'failed';
    error?: string;
  } | null;
  
  // Error handling
  error: string | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
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
  syncStatus: 'idle',
  lastSyncTime: null,
};

// Async thunks
export const lockAqua = createAsyncThunk(
  'staking/lockAqua',
  async (params: {
    userAddress: string;
    amount: string;
    durationDays: number;
    userKeypair: Keypair;
  }) => {
    const { userAddress, amount, durationDays, userKeypair } = params;
    
    // First simulate the contract call
    const simulation = await sorobanService.simulateContract(
      'staking',
      'record_lock',
      [userAddress, amount, durationDays],
      userKeypair
    );
    
    if (!simulation.success) {
      throw new Error(`Simulation failed: ${simulation.error}`);
    }
    
    // Execute the contract call
    const contractResult = await sorobanService.callContract(
      'staking',
      'record_lock',
      [userAddress, amount, durationDays],
      userKeypair
    );
    
    if (!contractResult.success) {
      throw new Error(`Contract call failed: ${contractResult.error}`);
    }
    
    // Record in backend
    const backendResult = await apiService.recordAquaLock({
      userAddress,
      amount,
      durationDays,
      txHash: contractResult.transactionHash!,
    });
    
    return {
      contractResult,
      backendResult,
      transactionHash: contractResult.transactionHash,
    };
  }
);

export const unlockAqua = createAsyncThunk(
  'staking/unlockAqua',
  async (params: {
    userAddress: string;
    lockId: number;
    amount: string;
    userKeypair: Keypair;
  }) => {
    const { userAddress, lockId, amount, userKeypair } = params;
    
    // Execute the contract call
    const contractResult = await sorobanService.callContract(
      'staking',
      'record_unlock',
      [userAddress, lockId, amount],
      userKeypair
    );
    
    if (!contractResult.success) {
      throw new Error(`Contract call failed: ${contractResult.error}`);
    }
    
    // Record in backend
    const backendResult = await apiService.recordAquaUnlock({
      userAddress,
      lockId,
      amount,
      txHash: contractResult.transactionHash!,
    });
    
    return {
      contractResult,
      backendResult,
      transactionHash: contractResult.transactionHash,
    };
  }
);

export const restakeBlub = createAsyncThunk(
  'staking/restakeBlub',
  async (params: {
    userAddress: string;
    amount: string;
    userKeypair: Keypair;
  }) => {
    const { userAddress, amount, userKeypair } = params;
    
    // Execute the contract call
    const contractResult = await sorobanService.callContract(
      'staking',
      'record_blub_restake',
      [userAddress, amount],
      userKeypair
    );
    
    if (!contractResult.success) {
      throw new Error(`Contract call failed: ${contractResult.error}`);
    }
    
    // Record in backend
    const backendResult = await apiService.recordBlubRestake({
      userAddress,
      amount,
      txHash: contractResult.transactionHash!,
    });
    
    return {
      contractResult,
      backendResult,
      transactionHash: contractResult.transactionHash,
    };
  }
);

export const fetchUserLocks = createAsyncThunk(
  'staking/fetchUserLocks',
  async (userAddress: string) => {
    const result = await apiService.getUserLocks(userAddress);
    return result.data || [];
  }
);

export const fetchStakingStats = createAsyncThunk(
  'staking/fetchStakingStats',
  async (userAddress?: string) => {
    const result = await apiService.getStakingStats(userAddress);
    return result.data;
  }
);

export const fetchPolInfo = createAsyncThunk(
  'staking/fetchPolInfo',
  async () => {
    const result = await apiService.getProtocolOwnedLiquidity();
    return result.data;
  }
);

export const syncStakingData = createAsyncThunk(
  'staking/syncData',
  async (userAddress: string) => {
    // Fetch all staking related data
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
  name: 'staking',
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
    updateSyncStatus: (state, action: PayloadAction<'idle' | 'syncing' | 'success' | 'error'>) => {
      state.syncStatus = action.payload;
      if (action.payload === 'success') {
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
        state.lastTransaction = { type: 'stake', status: 'pending' };
      })
      .addCase(lockAqua.fulfilled, (state, action) => {
        state.isStaking = false;
        state.lastTransaction = {
          type: 'stake',
          status: 'success',
          hash: action.payload.transactionHash,
        };
      })
      .addCase(lockAqua.rejected, (state, action) => {
        state.isStaking = false;
        state.error = action.error.message || 'Failed to lock AQUA';
        state.lastTransaction = {
          type: 'stake',
          status: 'failed',
          error: action.error.message,
        };
      });
    
    // Unlock AQUA
    builder
      .addCase(unlockAqua.pending, (state) => {
        state.isUnstaking = true;
        state.error = null;
        state.lastTransaction = { type: 'unstake', status: 'pending' };
      })
      .addCase(unlockAqua.fulfilled, (state, action) => {
        state.isUnstaking = false;
        state.lastTransaction = {
          type: 'unstake',
          status: 'success',
          hash: action.payload.transactionHash,
        };
      })
      .addCase(unlockAqua.rejected, (state, action) => {
        state.isUnstaking = false;
        state.error = action.error.message || 'Failed to unlock AQUA';
        state.lastTransaction = {
          type: 'unstake',
          status: 'failed',
          error: action.error.message,
        };
      });
    
    // Restake BLUB
    builder
      .addCase(restakeBlub.pending, (state) => {
        state.isRestaking = true;
        state.error = null;
        state.lastTransaction = { type: 'restake', status: 'pending' };
      })
      .addCase(restakeBlub.fulfilled, (state, action) => {
        state.isRestaking = false;
        state.lastTransaction = {
          type: 'restake',
          status: 'success',
          hash: action.payload.transactionHash,
        };
      })
      .addCase(restakeBlub.rejected, (state, action) => {
        state.isRestaking = false;
        state.error = action.error.message || 'Failed to restake BLUB';
        state.lastTransaction = {
          type: 'restake',
          status: 'failed',
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
        state.error = action.error.message || 'Failed to fetch user locks';
      });
    
    // Fetch staking stats
    builder
      .addCase(fetchStakingStats.fulfilled, (state, action) => {
        state.userStats = action.payload;
      });
    
    // Fetch POL info
    builder
      .addCase(fetchPolInfo.fulfilled, (state, action) => {
        state.polInfo = action.payload;
      });
    
    // Sync staking data
    builder
      .addCase(syncStakingData.pending, (state) => {
        state.syncStatus = 'syncing';
      })
      .addCase(syncStakingData.fulfilled, (state, action) => {
        state.syncStatus = 'success';
        state.userLocks = action.payload.userLocks;
        state.userStats = action.payload.userStats;
        state.polInfo = action.payload.polInfo;
        state.globalStats = action.payload.globalStats;
        state.lastSyncTime = Date.now();
      })
      .addCase(syncStakingData.rejected, (state, action) => {
        state.syncStatus = 'error';
        state.error = action.error.message || 'Failed to sync staking data';
      });
  },
});

export const { clearError, clearTransaction, setLoading, updateSyncStatus } = stakingSlice.actions;
export default stakingSlice; 