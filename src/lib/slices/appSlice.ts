import axios from "axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { BACKEND_API } from "../../utils/constants";
import { CustomError } from "../../utils/interfaces";
import { Asset, LpBalance } from "../../interfaces";
import { DepositType } from "../../enums";

interface Pool {
  id: string;
  assetA: Asset;
  assetB: Asset;
  assetAAmount: string;
  assetBAmount: string;
  senderPublicKey: string;
  depositType: DepositType;
}

const initialState = {
  lp_balances: null,
  pools: null,
} as {
  lp_balances: LpBalance[] | null;
  pools: Pool[] | null | undefined;
};

export const getAppData = createAsyncThunk(
  "app/info",
  async (_, { rejectWithValue }) => {
    // Backend is no longer used - return empty data
    console.log("ℹ️ [appSlice] Backend disabled - returning empty app data");
    return {
      lp_balances: [],
      pools: [],
    };
  }
);

export const appSlice = createSlice({
  name: "user",
  initialState,
  reducers: {},
  extraReducers(builder) {
    // get info from backend
    builder.addCase(getAppData.pending, (state) => {});

    builder.addCase(getAppData.fulfilled, (state, { payload }) => {
      state.lp_balances = payload.lp_balances;
      state.pools = payload.pools;
    });

    builder.addCase(getAppData.rejected, (state, action) => {});
  },
});

export const {} = appSlice.actions;
