import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { apiService, GovernanceRecord } from "../../services/api.service";
import { sorobanService } from "../../services/soroban.service";
import { Keypair } from "@stellar/stellar-sdk";
import { STELLAR_NETWORK } from "../../config";

// Governance interfaces
export interface IceIssuanceResult {
  success: boolean;
  iceAmount?: string;
  votingPower?: string;
  transactionHash?: string;
  error?: string;
}

export interface GovernanceStats {
  totalIceSupply: string;
  totalVotingPower: string;
  totalParticipants: number;
  polVotingAllocation: string;
}

export interface GovernanceState {
  // Loading states
  isLoading: boolean;
  isIssuingIce: boolean;

  // User data
  userGovernance: GovernanceRecord | null;
  iceBalance: string;
  votingPower: string;

  // Global data
  globalStats: GovernanceStats | null;

  // Transaction states
  lastIceIssuance: IceIssuanceResult | null;

  // Error handling
  error: string | null;
  syncStatus: "idle" | "syncing" | "success" | "error";
  lastSyncTime: number | null;
}

const initialState: GovernanceState = {
  isLoading: false,
  isIssuingIce: false,
  userGovernance: null,
  iceBalance: "0",
  votingPower: "0",
  globalStats: null,
  lastIceIssuance: null,
  error: null,
  syncStatus: "idle",
  lastSyncTime: null,
};

// Async thunks
export const issueIceTokens = createAsyncThunk(
  "governance/issueIceTokens",
  async (params: {
    userAddress: string;
    aquaAmount: string;
    lockDurationDays: number;
    userKeypair: Keypair;
  }) => {
    const { userAddress, aquaAmount, lockDurationDays, userKeypair } = params;

    // First simulate the contract call
    const simulation = await sorobanService.simulateContract(
      "governance",
      "record_ice_issuance",
      [userAddress, aquaAmount, lockDurationDays],
      userKeypair
    );

    if (!simulation.success) {
      throw new Error(`Simulation failed: ${simulation.error}`);
    }

    // Execute the contract call
    const contractResult = await sorobanService.callContract(
      "governance",
      "record_ice_issuance",
      [userAddress, aquaAmount, lockDurationDays],
      userKeypair
    );

    if (!contractResult.success) {
      throw new Error(`Contract call failed: ${contractResult.error}`);
    }

    // Record in backend
    const backendResult = await apiService.recordIceIssuance({
      userAddress,
      aquaAmount,
      lockDurationDays,
      txHash: contractResult.transactionHash!,
    });

    return {
      contractResult,
      backendResult,
      transactionHash: contractResult.transactionHash,
      iceAmount: contractResult.data?.iceAmount || "0",
      votingPower: contractResult.data?.votingPower || "0",
    };
  }
);

export const fetchUserGovernance = createAsyncThunk(
  "governance/fetchUserGovernance",
  async (userAddress: string) => {
    try {
      // Query DIRECTLY from contract (no backend)
      const { sorobanService } = await import("../../services/soroban.service");
      const { Address } = await import("@stellar/stellar-sdk");

      console.log(
        "🔍 [governanceSlice] Fetching governance DIRECTLY from contract..."
      );

      const contract = sorobanService.getContract("governance");
      const server = sorobanService.getServer();
      const account = await server.getAccount(userAddress);
      const { TransactionBuilder, Networks, scValToNative } = await import(
        "@stellar/stellar-sdk"
      );

      // Get user governance data
      const govTx = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: STELLAR_NETWORK,
      })
        .addOperation(
          contract.call(
            "get_user_governance",
            Address.fromString(userAddress).toScVal()
          )
        )
        .setTimeout(30)
        .build();

      const govSim: any = await server.simulateTransaction(govTx);

      if (govSim.result?.retval) {
        const govData = scValToNative(govSim.result.retval);

        const result: GovernanceRecord = {
          user: userAddress,
          iceAmount: govData.ice_amount
            ? (Number(govData.ice_amount) / 10000000).toFixed(7)
            : "0",
          votingPower: govData.voting_power
            ? (Number(govData.voting_power) / 10000000).toFixed(7)
            : "0",
          aquaLocked: govData.aqua_locked
            ? (Number(govData.aqua_locked) / 10000000).toFixed(7)
            : "0",
          lockDuration: govData.lock_duration || 0,
          lockTimestamp: govData.lock_timestamp || 0,
        };

        console.log("✅ [governanceSlice] Governance data fetched:", result);
        return result;
      }

      return {
        user: userAddress,
        iceAmount: "0",
        votingPower: "0",
        aquaLocked: "0",
        lockDuration: 0,
        lockTimestamp: 0,
      };
    } catch (error) {
      console.error("❌ [governanceSlice] Failed to fetch governance:", error);
      return {
        user: userAddress,
        iceAmount: "0",
        votingPower: "0",
        aquaLocked: "0",
        lockDuration: 0,
        lockTimestamp: 0,
      };
    }
  }
);

export const fetchGovernanceStats = createAsyncThunk(
  "governance/fetchGovernanceStats",
  async () => {
    try {
      // Query DIRECTLY from contract (no backend)
      const { sorobanService } = await import("../../services/soroban.service");

      console.log(
        "🔍 [governanceSlice] Fetching governance stats DIRECTLY from contract..."
      );

      const contract = sorobanService.getContract("governance");
      const server = sorobanService.getServer();

      // Use a dummy account for global queries (no actual transaction)
      const dummyAddress =
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
      const account = await server.getAccount(dummyAddress).catch(() => {
        // If dummy fails, use any valid address for simulation
        return null;
      });

      if (!account) {
        return {
          totalIceSupply: "0",
          totalVotingPower: "0",
          totalParticipants: 0,
          polVotingAllocation: "0",
        };
      }

      const { TransactionBuilder, Networks, scValToNative } = await import(
        "@stellar/stellar-sdk"
      );

      // Get global governance stats
      const statsTx = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: STELLAR_NETWORK,
      })
        .addOperation(contract.call("get_global_stats"))
        .setTimeout(30)
        .build();

      const statsSim: any = await server.simulateTransaction(statsTx);

      if (statsSim.result?.retval) {
        const stats = scValToNative(statsSim.result.retval);

        const result = {
          totalIceSupply: stats.total_ice_supply
            ? (Number(stats.total_ice_supply) / 10000000).toFixed(7)
            : "0",
          totalVotingPower: stats.total_voting_power
            ? (Number(stats.total_voting_power) / 10000000).toFixed(7)
            : "0",
          totalParticipants: stats.total_participants || 0,
          polVotingAllocation: stats.pol_voting_allocation
            ? (Number(stats.pol_voting_allocation) / 10000000).toFixed(7)
            : "0",
        };

        console.log("✅ [governanceSlice] Governance stats fetched:", result);
        return result;
      }

      return {
        totalIceSupply: "0",
        totalVotingPower: "0",
        totalParticipants: 0,
        polVotingAllocation: "0",
      };
    } catch (error) {
      console.error(
        "❌ [governanceSlice] Failed to fetch governance stats:",
        error
      );
      return {
        totalIceSupply: "0",
        totalVotingPower: "0",
        totalParticipants: 0,
        polVotingAllocation: "0",
      };
    }
  }
);

export const syncGovernanceData = createAsyncThunk(
  "governance/syncData",
  async (userAddress: string, { dispatch }) => {
    // Fetch all governance related data DIRECTLY from contract
    console.log(
      "🔄 [governanceSlice] Syncing governance data from blockchain..."
    );

    const [userGovernance, globalStats] = await Promise.all([
      dispatch(fetchUserGovernance(userAddress)).unwrap(),
      dispatch(fetchGovernanceStats()).unwrap(),
    ]);

    return {
      userGovernance,
      globalStats,
    };
  }
);

// Calculate ICE amount based on AQUA and duration
export const calculateIceAmount = (
  aquaAmount: string,
  durationDays: number
): string => {
  const baseAmount = parseFloat(aquaAmount);
  const maxDuration = 365;
  const timeMultiplier = Math.min(durationDays / maxDuration, 1);
  const bonusMultiplier = timeMultiplier;
  const totalIce = baseAmount * (1 + bonusMultiplier);
  return totalIce.toFixed(7);
};

// Calculate voting power based on ICE amount and duration
export const calculateVotingPower = (
  iceAmount: string,
  lockDurationDays: number
): string => {
  const ice = parseFloat(iceAmount);
  const maxDuration = 365;
  const durationMultiplier = Math.min(lockDurationDays / maxDuration, 1);
  const votingPowerMultiplier = 1 + durationMultiplier;
  const votingPower = ice * votingPowerMultiplier;
  return votingPower.toFixed(7);
};

// Slice
const governanceSlice = createSlice({
  name: "governance",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearIceIssuance: (state) => {
      state.lastIceIssuance = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    updateIceBalance: (state, action: PayloadAction<string>) => {
      state.iceBalance = action.payload;
    },
    updateVotingPower: (state, action: PayloadAction<string>) => {
      state.votingPower = action.payload;
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
    // Issue ICE tokens
    builder
      .addCase(issueIceTokens.pending, (state) => {
        state.isIssuingIce = true;
        state.error = null;
      })
      .addCase(issueIceTokens.fulfilled, (state, action) => {
        state.isIssuingIce = false;
        state.lastIceIssuance = {
          success: true,
          iceAmount: action.payload.iceAmount,
          votingPower: action.payload.votingPower,
          transactionHash: action.payload.transactionHash,
        };
        state.iceBalance = action.payload.iceAmount;
        state.votingPower = action.payload.votingPower;
      })
      .addCase(issueIceTokens.rejected, (state, action) => {
        state.isIssuingIce = false;
        state.error = action.error.message || "Failed to issue ICE tokens";
        state.lastIceIssuance = {
          success: false,
          error: action.error.message,
        };
      });

    // Fetch user governance
    builder
      .addCase(fetchUserGovernance.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchUserGovernance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userGovernance = action.payload;
        state.iceBalance = action.payload.iceAmount;
        state.votingPower = action.payload.votingPower;
      })
      .addCase(fetchUserGovernance.rejected, (state, action) => {
        state.isLoading = false;
        state.error =
          action.error.message || "Failed to fetch user governance data";
      });

    // Fetch governance stats
    builder
      .addCase(fetchGovernanceStats.fulfilled, (state, action) => {
        state.globalStats = action.payload;
      })
      .addCase(fetchGovernanceStats.rejected, (state, action) => {
        state.error =
          action.error.message || "Failed to fetch governance stats";
      });

    // Sync governance data
    builder
      .addCase(syncGovernanceData.pending, (state) => {
        state.syncStatus = "syncing";
      })
      .addCase(syncGovernanceData.fulfilled, (state, action) => {
        state.syncStatus = "success";
        state.userGovernance = action.payload.userGovernance;
        state.globalStats = action.payload.globalStats;
        state.iceBalance = action.payload.userGovernance.iceAmount;
        state.votingPower = action.payload.userGovernance.votingPower;
        state.lastSyncTime = Date.now();
      })
      .addCase(syncGovernanceData.rejected, (state, action) => {
        state.syncStatus = "error";
        state.error = action.error.message || "Failed to sync governance data";
      });
  },
});

export const {
  clearError,
  clearIceIssuance,
  setLoading,
  updateIceBalance,
  updateVotingPower,
  updateSyncStatus,
} = governanceSlice.actions;

export default governanceSlice;
