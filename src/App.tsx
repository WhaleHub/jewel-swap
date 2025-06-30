import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { ToastContainer } from "react-toastify";
import AppLayout from "./components/AppLayout";
import Stake from "./pages/Stake";
import { Provider } from "react-redux";
import { persistor, store } from "./lib/store";
import { PersistGate } from "redux-persist/integration/react";
import MainProvider from "./providers/MainProvider";
import Vote from "./components/Vote/Vote";


const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#37b06f" },
  },
});

function App() {
  return (
    <div>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <MainProvider>
            <ThemeProvider {...{ theme }}>
              <BrowserRouter>
                <Routes>
                  <Route path="/.well-known/*" element={null} />
                  <Route path="/" element={<AppLayout />}>
                    <Route path="/" element={<Navigate to="/stake/aqua" />} />
                    <Route path="/stake/:tokenId" element={<Stake />} />
                    <Route path="/vote" element={<Vote />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/stake/aqua" />} />
                </Routes>
              </BrowserRouter>
            </ThemeProvider>
            <ToastContainer autoClose={3000} />
          </MainProvider>
        </PersistGate>
      </Provider>
    </div>
  );
}

export default App;
