import { combineReducers } from "redux";
import { userSlice } from "./slices/userSlice";
import { appSlice } from "./slices/appSlice";
import stakingSlice from "./slices/stakingSlice";
import governanceSlice from "./slices/governanceSlice";

export default combineReducers({
  user: userSlice.reducer,
  app: appSlice.reducer,
  staking: stakingSlice.reducer,
  governance: governanceSlice.reducer,
});
