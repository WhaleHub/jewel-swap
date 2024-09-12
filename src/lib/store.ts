import { configureStore } from "@reduxjs/toolkit";
import { userSlice } from "./slices/userSlice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      user: userSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredPaths: ["user.userRecords"],
          ignoredActionPaths: ["payload.someNonSerializableValue"],
          ignoredActions: ["someActionWithNonSerializablePayload"],
        },
      }),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
