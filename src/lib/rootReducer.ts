import { combineReducers } from "redux";
import { userSlice } from "./slices/userSlice";
import { appSlice } from "./slices/appSlice";
import stakingSlice from "./slices/stakingSlice";

export default combineReducers({
  user: userSlice.reducer,
  app: appSlice.reducer,
  staking: stakingSlice.reducer,
});
