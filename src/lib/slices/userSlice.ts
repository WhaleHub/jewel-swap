import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { BACKEND_API } from "../../utils/constants";
import { CustomError } from "../../utils/interfaces";
import { AccountService } from "../../utils/account.service";
import { AccountBalance } from "@mui/icons-material";

interface Asset {
  code: string;
  issuer?: string;
}

interface TransactionData {
  signedTxXdr: string;
  assetA: Asset;
  assetB: Asset;
}

interface AccountBalance {
  balance: string;
  limit: string;
  buying_liabilities: string;
  selling_liabilities: string;
  sponsor: string;
  last_modified_ledger: number;
  is_authorized: boolean;
  is_authorized_to_maintain_liabilities: boolean;
  asset_type: "credit_alphanum12";
  asset_code: string;
  asset_issuer: string;
}

interface UserRecords {
  balances: AccountBalance[] | null;
}

export interface User {
  userRecords: UserRecords;
}

const initialState = {
  userRecords: { balances: null },
} as User;

export const mint = createAsyncThunk(
  "lock/mint",
  async (
    values: {
      assetCode: string;
      assetIssuer: string;
      amount: number;
      timeline: string;
      signedTxXdr: string;
      senderPublicKey: string;
      treasuryAmount: number;
    },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await axios.post(`${BACKEND_API}/token/stake`, values);
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

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {},
  extraReducers(builder) {
    //mint
    builder.addCase(mint.pending, (state) => {});

    builder.addCase(mint.fulfilled, (state, { payload }) => {});

    builder.addCase(mint.rejected, (state, action) => {});

    //store account
    builder.addCase(storeAccountBalance.pending, (state) => {});

    builder.addCase(storeAccountBalance.fulfilled, (state, { payload }) => {
      state.userRecords.balances = payload;
    });

    builder.addCase(storeAccountBalance.rejected, (state, action) => {});
  },
});

export const {} = userSlice.actions;
