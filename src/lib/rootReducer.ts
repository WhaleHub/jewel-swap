import { combineReducers } from "redux";
import { userSlice } from "./slices/userSlice";
import { appSlice } from "./slices/appSlice";

export default combineReducers({
  user: userSlice.reducer,
  app: appSlice.reducer,
});
