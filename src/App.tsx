import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { ToastContainer } from "react-toastify";
import AppLayout from "./components/AppLayout";
import Stake from "./pages/Stake";
import Gauge from "./pages/Gauge";
import Admin from "./pages/Admin";
import { Provider } from "react-redux";
import { makeStore, persistor } from "./lib/store";
import { PersistGate } from "redux-persist/integration/react";
import MainProvider from "./providers/MainProvider";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#37b06f",
    },
  },
});

function App() {
  return (
    <div>
      <Provider store={makeStore()}>
        <PersistGate loading={null} persistor={persistor}>
          <MainProvider>
            <ThemeProvider theme={theme}>
              <BrowserRouter>
                <Routes>
                  <Route path="*" element={<Navigate to="/stake/aqua" />} />
                  <Route path="/" element={<AppLayout />}>
                    <Route path="/" element={<Navigate to="/stake/aqua" />} />
                    <Route path="/stake/:tokenId" element={<Stake />} />
                    <Route path="/gauge" element={<Gauge />} />
                    <Route path="/admin" element={<Admin />} />
                  </Route>
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
