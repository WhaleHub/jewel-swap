import React, { ReactNode, useEffect } from "react";
import {
  allowAllModules,
  FREIGHTER_ID,
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";
import { StellarService } from "../services/stellar.service";
import { useAppDispatch } from "../lib/hooks";
import { storeAccountBalance } from "../lib/slices/userSlice";

interface MainProviderProps {
  children: ReactNode;
}

function MainProvider({ children }: MainProviderProps): JSX.Element {
  const dispatch = useAppDispatch();
  const kit: StellarWalletsKit = new StellarWalletsKit({
    network: WalletNetwork.PUBLIC,
    selectedWalletId: FREIGHTER_ID,
    modules: allowAllModules(),
  });

  const getWalletAddress = async () => {
    const { address } = await kit.getAddress();
    const stellarService = new StellarService();
    const wrappedAccount = await stellarService.loadAccount(address);
    dispatch(storeAccountBalance(wrappedAccount.balances));
  };

  useEffect(() => {
    getWalletAddress();
  }, []);

  return <>{children}</>;
}

export default MainProvider;
