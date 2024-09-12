import React, { useEffect, useMemo } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { Cluster, clusterApiUrl } from "@solana/web3.js";
import { ToastContainer } from "react-toastify";
import AppLayout from "./components/AppLayout";
import Stake from "./pages/Stake";
import Gauge from "./pages/Gauge";
import Admin from "./pages/Admin";
import { StellarService } from "./services/stellar.service";
import { AccountService } from "./utils/account.service";
import { Provider } from "react-redux";
import { makeStore } from "./lib/store";
import { storeAccountBalance } from "./lib/slices/userSlice";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#37b06f",
    },
  },
});

const network = process.env.REACT_APP_NETWORK || "devnet";

function App() {
  const endpoint = useMemo(() => clusterApiUrl(network as Cluster), [network]);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], [network]);

  useEffect(() => {
    new StellarService()
      .loadAccount("GDMFFHVJQZSDXM4SRU2W6KFLWV62BKXNNJVC4GT25NMQK2LENFUVO44I")
      .then((account) => {
        const wrappedAccount = new AccountService(account);
        console.log(wrappedAccount);
        // makeStore().dispatch(storeAccountRecords(wrappedAccount));
        makeStore().dispatch(storeAccountBalance([""]));
      });
  }, []);

  return (
    <div>
      <Provider store={makeStore()}>
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
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
            </WalletModalProvider>
            <ToastContainer autoClose={3000} />
          </WalletProvider>
        </ConnectionProvider>
      </Provider>
    </div>
  );
}

export default App;
