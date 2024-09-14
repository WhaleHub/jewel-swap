import { combineReducers } from "redux";
import { userSlice } from "./slices/userSlice";

export default combineReducers({
  user: userSlice.reducer,
});
