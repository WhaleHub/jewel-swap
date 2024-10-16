import React, { useMemo } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { Cluster, clusterApiUrl } from '@solana/web3.js';
import { ToastContainer } from 'react-toastify';
import AppLayout from './components/AppLayout';
import Stake from './pages/Stake';
import Gauge from './pages/Gauge';
import Admin from './pages/Admin';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#37b06f',
    }
  }
});

const network = process.env.REACT_APP_NETWORK || 'devnet';

function App() {
  const endpoint = useMemo(() => clusterApiUrl(network as Cluster), [network]);
  const wallets = useMemo(
    () => [new PhantomWalletAdapter()],
    [network]
  );

  return (
    <div>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <ThemeProvider theme={theme}>
              <BrowserRouter>
                <Routes>
                  <Route path='*' element={<Navigate to='/stake/sol' />} />
                  <Route path='/' element={<AppLayout />} >
                    <Route path='/' element={<Navigate to='/stake/sol' />} />
                    <Route path='/stake/:tokenId' element={<Stake />} />
                    <Route path='/gauge' element={<Gauge />} />
                    <Route path='/admin' element={<Admin />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </ThemeProvider>
          </WalletModalProvider>
          <ToastContainer autoClose={3000} />
        </WalletProvider>
      </ConnectionProvider>
    </div>
  );
}

export default App;
