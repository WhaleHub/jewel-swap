import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import { BACKEND_API } from "../../utils/constants";
import { CustomError } from "../../utils/interfaces";
import {
  SummarizedAssets,
  TransactionData,
  UserRecords,
} from "../../interfaces";

export interface User {
  userRecords: UserRecords;
  walletConnected: boolean;
  walletSelectionOpen: boolean;
  userWalletAddress: string | null;
  connectingWallet: boolean;
  walletName: string | null;
  fetchingWalletInfo: boolean;
  lockingAqua: boolean;
  lockedAqua: boolean;
}

const initialState = {
  userRecords: { balances: null },
  walletConnected: false,
  walletSelectionOpen: false,
  userWalletAddress: null,
  connectingWallet: false,
  walletName: null,
} as User;

export const mint = createAsyncThunk(
  "lock/mint",
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

export const getAccountInfo = createAsyncThunk(
  "user/info",
  async (account: string, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(
        `${BACKEND_API}/token/user?userPublicKey=${account}`
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

export const storeAccountBalance = createAsyncThunk(
  "user/record",
  async (values: any[], { rejectWithValue }) => {
    try {
      return values;
    } catch (error: any) {
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

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    walletSelectionAction: (state, { payload }: PayloadAction<any>) => ({
      ...state,
      walletSelectionOpen: payload,
    }),
    setUserWalletAddress: (state, { payload }: PayloadAction<any>) => ({
      ...state,
      userWalletAddress: payload,
    }),
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
    resetStateValues: (state) => ({
      ...state,
      lockedAqua: false,
    }),
    logOut: (state) => ({
      ...state,
      userRecords: { balances: null, account: null },
      walletConnected: false,
      walletSelectionOpen: false,
      userWalletAddress: null,
      connectingWallet: false,
      walletName: null,
      fetchingWalletInfo: false,
    }),
  },
  extraReducers(builder) {
    //mint
    builder.addCase(mint.pending, (state) => {
      state.lockingAqua = false;
    });

    builder.addCase(mint.fulfilled, (state, { payload }) => {
      state.lockedAqua = true;
    });

    builder.addCase(mint.rejected, (state, action) => {
      state.lockingAqua = false;
    });

    //store account
    builder.addCase(storeAccountBalance.pending, (state) => {});

    builder.addCase(storeAccountBalance.fulfilled, (state, { payload }) => {
      state.userRecords.balances = payload;
    });

    builder.addCase(storeAccountBalance.rejected, (state, action) => {});

    //get user account details from db
    builder.addCase(getAccountInfo.pending, (state) => {});

    builder.addCase(getAccountInfo.fulfilled, (state, { payload }) => {
      state.userRecords.account = payload;
    });

    builder.addCase(getAccountInfo.rejected, (state, action) => {});
  },
});

export const {
  walletSelectionAction,
  setUserWalletAddress,
  setConnectingWallet,
  setWalletConnectName,
  logOut,
  fetchingWalletInfo,
  lockingAqua,
  resetStateValues,
} = userSlice.actions;
