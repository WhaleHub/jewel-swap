import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import { BACKEND_API } from "../../utils/constants";
import { CustomError } from "../../utils/interfaces";
import {
  SummarizedAssets,
  TransactionData,
  UserRecords,
} from "../../interfaces";
import { FREIGHTER_ID, LOBSTR_ID } from "@creit.tech/stellar-wallets-kit";
import { WALLET_CONNECT_ID } from "@creit.tech/stellar-wallets-kit/modules/walletconnect.module";

export interface User {
  userRecords: UserRecords;
  walletConnected: boolean;
  walletSelectionOpen: boolean;
  userWalletAddress: string | null;
  connectingWallet: boolean;
  walletName: typeof LOBSTR_ID | typeof FREIGHTER_ID | typeof WALLET_CONNECT_ID | null;
  fetchingWalletInfo: boolean;
  lockingAqua: boolean;
  unStakingAqua: boolean;
  restaking: boolean;
  restaked: boolean;
  providingLp: boolean;
  providedLp: boolean;
  lockedAqua: boolean;
  unStakedAqua: boolean;
  userLockedRewardsAmount: number;
}

const initialState = {} as User;

export const mint = createAsyncThunk(
  "lock/stake",
  async (
    values: {
      assetCode: string;
      assetIssuer: string;
      amount: string;
      signedTxXdr: string;
      senderPublicKey: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await axios.post(`${BACKEND_API}/token/lock`, values);
      return data;
    } catch (error: any) {
      const customError: CustomError = error;

      if (customError.response && customError.response.data.error.message) {
        return rejectWithValue(customError.response.data.error.message);
      }

      throw new Error(customError.message || "An unknown error occurred");
    }
  }
);

export const unStakeAqua = createAsyncThunk(
  "lock/unlock-aqua",
  async (
    values: { senderPublicKey: string; amountToUnstake: number; signedTxXdr: string },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await axios.post(
        `${BACKEND_API}/token/unlock-aqua`,
        values
      );
      return data;
    } catch (error: any) {
      const customError: CustomError = error;

      if (customError.response && customError.response.data.error.message) {
        return rejectWithValue(customError.response.data.error.message);
      }

      throw new Error(customError.message || "An unknown error occurred");
    }
  }
);

export const restakeBlub = createAsyncThunk(
  "lock/restake-blub",
  async (
    values: {
      assetCode: string;
      assetIssuer: string;
      amount: string;
      signedTxXdr: string;
      senderPublicKey: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await axios.post(
        `${BACKEND_API}/token/restake-blub`,
        values
      );
      return data;
    } catch (error: any) {
      const customError: CustomError = error;

      if (customError.response && customError.response.data.error.message) {
        return rejectWithValue(customError.response.data.error.message);
      }

      throw new Error(customError.message || "An unknown error occurred");
    }
  }
);

export const getAccountInfo = createAsyncThunk(
  "user/info",
  async (account: string, { rejectWithValue }) => {
    try {
      console.log("🌐 [userSlice] Fetching account info from backend:", {
        account: account,
        accountLength: account?.length,
        isValidFormat: account ? /^G[A-Z0-9]{55}$/.test(account) : false,
        backendUrl: `${BACKEND_API}/token/user?userPublicKey=${account}`,
        timestamp: new Date().toISOString()
      });
      
      const { data } = await axios.get(
        `${BACKEND_API}/token/user?userPublicKey=${account}`
      );
      
      console.log("✅ [userSlice] Account info received from backend:", {
        account: account,
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
        balancesCount: data?.balances?.length || 0,
        claimableRecordsCount: data?.claimableRecords?.length || 0,
        poolsCount: data?.pools?.length || 0,
        accountData: data
      });
      
      return data;
    } catch (error: any) {
      console.error("❌ [userSlice] Error fetching account info:", {
        account: account,
        error: error,
        errorMessage: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      });
      
      // Try fallback optimized endpoint for staking balance
      try {
        console.log("🔄 [userSlice] Attempting fallback with optimized staking balance endpoint");
        
        const { data: stakingData } = await axios.get(
          `${BACKEND_API}/token/user/staking-balance?userPublicKey=${account}`
        );
        
        console.log("✅ [userSlice] Fallback staking balance data received:", {
          account: account,
          claimableRecordsCount: stakingData?.claimableRecords?.length || 0,
          poolsCount: stakingData?.pools?.length || 0,
          stakingData: stakingData
        });
        
        // Return fallback data structure that matches expected format
        const fallbackData = {
          id: null,
          account: account,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          claimableRecords: stakingData.claimableRecords || [],
          pools: stakingData.pools || [],
          stakes: [],
          treasuryDeposits: [],
          lpBalances: []
        };
        
        return fallbackData;
      } catch (fallbackError: any) {
        console.error("❌ [userSlice] Fallback endpoint also failed:", {
          account: account,
          fallbackError: fallbackError,
          fallbackErrorMessage: fallbackError?.message
        });
      }
      
      const customError: CustomError = error;

      if (customError.response && customError.response.data.error.message) {
        return rejectWithValue(customError.response.data.error.message);
      }

      throw new Error(customError.message || "An unknown error occurred");
    }
  }
);

export const storeAccountBalance = createAsyncThunk(
  "user/record",
  async (values: any[], { rejectWithValue }) => {
    try {
      console.log("💾 [userSlice] Storing account balances:", {
        balanceCount: values?.length || 0,
        balances: values?.map((balance: any) => ({
          asset_type: balance.asset_type,
          asset_code: balance.asset_code || 'XLM',
          balance: balance.balance,
          limit: balance.limit,
          buying_liabilities: balance.buying_liabilities,
          selling_liabilities: balance.selling_liabilities,
          asset_issuer: balance.asset_issuer
        })),
        timestamp: new Date().toISOString()
      });
      
      return values;
    } catch (error: any) {
      console.error("❌ [userSlice] Error storing account balances:", error);
      const customError: CustomError = error;

      if (customError.response && customError.response.data.error.message) {
        return rejectWithValue(customError.response.data.error.message);
      }

      throw new Error(customError.message || "An unknown error occurred");
    }
  }
);

export const addLP = createAsyncThunk(
  "lock/mint",
  async (values: TransactionData, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${BACKEND_API}/token/add-liquidity`,
        values
      );
      return data;
    } catch (error: any) {
      const customError: CustomError = error;

      if (customError.response && customError.response.data.error.message) {
        return rejectWithValue(customError.response.data.error.message);
      }

      throw new Error(customError.message || "An unknown error occurred");
    }
  }
);

export const provideLiquidity = createAsyncThunk(
  "liquidity/provide",
  async (
    values: {
      asset1: {
        code: string;
        issuer: string;
        amount: string;
      };
      asset2: {
        code: string;
        issuer: string;
        amount: string;
      };
      signedTxXdr: string;
      senderPublicKey: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await axios.post(
        `${BACKEND_API}/token/add-liquidity`,
        values
      );
      return data;
    } catch (error: any) {
      const customError: CustomError = error;

      if (customError.response && customError.response.data.error.message) {
        return rejectWithValue(customError.response.data.error.message);
      }

      throw new Error(customError.message || "An unknown error occurred");
    }
  }
);

export const withdrawLP = createAsyncThunk(
  "liquidity/withdraw",
  async (
    values: {
      senderPublicKey: string;
      userPoolPercentage: number;
      summerizedAssets: SummarizedAssets | null;
    },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await axios.post(
        `${BACKEND_API}/token/remove-liquidity`,
        values
      );
      return data;
    } catch (error: any) {
      const customError: CustomError = error;

      if (customError.response && customError.response.data.error.message) {
        return rejectWithValue(customError.response.data.error.message);
      }

      throw new Error(customError.message || "An unknown error occurred");
    }
  }
);

export const redeemLPReward = createAsyncThunk(
  "liquidity/withdraw",
  async (
    values: {
      senderPublicKey: string;
      userPoolPercentage: number;
      summerizedAssets: SummarizedAssets | null;
    },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await axios.post(
        `${BACKEND_API}/token/redeem-reward`,
        values
      );
      return data;
    } catch (error: any) {
      const customError: CustomError = error;

      if (customError.response && customError.response.data.error.message) {
        return rejectWithValue(customError.response.data.error.message);
      }

      throw new Error(customError.message || "An unknown error occurred");
    }
  }
);

export const getLockedAquaRewardsForAccount = createAsyncThunk(
  "user/lockedAquaRewards",
  async (account: string | undefined, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(
        `${BACKEND_API}/token/getLockedReward?userPublicKey=${account}`
      );
      return data;
    } catch (error: any) {
      const customError: CustomError = error;

      if (customError.response && customError.response.data.error.message) {
        return rejectWithValue(customError.response.data.error.message);
      }

      throw new Error(customError.message || "An unknown error occurred");
    }
  }
);

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    walletSelectionAction: (state, { payload }: PayloadAction<any>) => ({
      ...state,
      walletSelectionOpen: payload,
    }),
    setUserWalletAddress: (state, { payload }: PayloadAction<any>) => {
      return {
        ...state,
        userWalletAddress: payload,
      };
    },
    setConnectingWallet: (state, { payload }: PayloadAction<any>) => ({
      ...state,
      connectingWallet: payload,
    }),
    setWalletConnectName: (state, { payload }: PayloadAction<any>) => ({
      ...state,
      walletName: payload,
    }),
    fetchingWalletInfo: (state, { payload }: PayloadAction<any>) => ({
      ...state,
      fetchingWalletInfo: payload,
    }),
    lockingAqua: (state, { payload }: PayloadAction<any>) => ({
      ...state,
      lockingAqua: payload,
    }),
    restaking: (state, { payload }: PayloadAction<any>) => ({
      ...state,
      restaking: payload,
    }),
    unStakingAqua: (state, { payload }: PayloadAction<any>) => ({
      ...state,
      unStakingAqua: payload,
    }),
    providingLp: (state, { payload }: PayloadAction<any>) => ({
      ...state,
      providingLp: payload,
    }),
    resetStateValues: (state) => ({
      ...state,
      lockedAqua: false,
      providedLp: false,
      unStakedAqua: false,
      restaked: false,
    }),
    setWalletConnected: (state, { payload }) => ({
      ...state,
      walletConnected: payload,
    }),
    setUserbalances: (state, { payload }) => {
      console.log("💾 [userSlice] setUserbalances reducer called:", {
        payloadCount: payload?.length || 0,
        payload: payload?.map((balance: any) => ({
          asset_type: balance.asset_type,
          asset_code: balance.asset_code || 'XLM',
          balance: balance.balance,
          limit: balance.limit
        })),
        existingBalances: state.userRecords?.balances?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      return {
        ...state,
        userRecords: {
          ...state.userRecords,
          balances: payload,
        },
      };
    },
    logOut: (state) => ({
      ...state,
      userRecords: { balances: null, account: null },
      walletConnected: false,
      walletSelectionOpen: false,
      userWalletAddress: null,
      connectingWallet: false,
      walletName: null,
      fetchingWalletInfo: false,
      lockingAqua: false,
      unStakingAqua: false,
      restaking: false,
      restaked: false,
      providingLp: false,
      providedLp: false,
      lockedAqua: false,
      unStakedAqua: false,
      userLockedRewardsAmount: 0,
    }),
  },
  extraReducers(builder) {
    //mint
    builder.addCase(mint.pending, (state) => {
      state.lockingAqua = true;
    });

    builder.addCase(mint.fulfilled, (state, {}) => {
      state.lockedAqua = true;
      state.lockingAqua = false;
    });

    builder.addCase(mint.rejected, (state) => {
      state.lockingAqua = false;
    });

    //unlock
    builder.addCase(unStakeAqua.pending, (state) => {
      state.unStakingAqua = true;
    });

    builder.addCase(unStakeAqua.fulfilled, (state, {}) => {
      state.unStakedAqua = true;
      state.unStakingAqua = false;
      state.userLockedRewardsAmount = 0;
    });

    builder.addCase(unStakeAqua.rejected, (state) => {
      state.unStakingAqua = false;
    });

    //restake
    builder.addCase(restakeBlub.pending, (state) => {
      state.restaking = true;
    });

    builder.addCase(restakeBlub.fulfilled, (state, {}) => {
      state.restaked = true;
      state.restaking = false;
    });

    builder.addCase(restakeBlub.rejected, (state) => {
      state.restaking = false;
    });

    //provide lp
    builder.addCase(provideLiquidity.pending, (state) => {
      state.providingLp = true;
    });

    builder.addCase(provideLiquidity.fulfilled, (state, {}) => {
      state.providedLp = true;
      state.providingLp = false;
    });

    builder.addCase(provideLiquidity.rejected, (state) => {
      state.providingLp = false;
    });

    //store account
    builder.addCase(storeAccountBalance.pending, () => {});

    builder.addCase(storeAccountBalance.fulfilled, (state, { payload }) => {
      state.userRecords.balances = payload;
    });

    builder.addCase(storeAccountBalance.rejected, () => {});

    //get user account details from db
    builder.addCase(getAccountInfo.pending, () => {});

    builder.addCase(getAccountInfo.fulfilled, (state, { payload }) => {
      state.userRecords.account = payload;
    });

    builder.addCase(getAccountInfo.rejected, () => {});

    //get user locked aqua rewards
    builder.addCase(getLockedAquaRewardsForAccount.pending, () => {});

    builder.addCase(
      getLockedAquaRewardsForAccount.fulfilled,
      (state, { payload }) => {
        // console.log(payload);
        state.userLockedRewardsAmount = payload.lockedAquaRewardEstimation;
      }
    );

    builder.addCase(getLockedAquaRewardsForAccount.rejected, () => {});
  },
});

export const {
  logOut,
  restaking,
  providingLp,
  lockingAqua,
  unStakingAqua,
  resetStateValues,
  fetchingWalletInfo,
  setConnectingWallet,
  setWalletConnectName,
  setUserWalletAddress,
  walletSelectionAction,
  setWalletConnected,
  setUserbalances,
} = userSlice.actions;
