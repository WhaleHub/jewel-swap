import { Fragment, ReactNode, useCallback, useEffect, useState } from "react";
import {
  allowAllModules,
  FREIGHTER_ID,
  FreighterModule,
  LOBSTR_ID,
  LobstrModule,
  ModuleInterface,
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";
import { isAllowed, setAllowed } from "@stellar/freighter-api";
import { StellarService } from "../services/stellar.service";
import { useAppDispatch } from "../lib/hooks";
import {
  fetchingWalletInfo,
  getAccountInfo,
  getLockedAquaRewardsForAccount,
  logOut,
  setConnectingWallet,
  setUserWalletAddress,
  setWalletConnected,
  setWalletConnectName,
  storeAccountBalance,
  walletSelectionAction,
} from "../lib/slices/userSlice";
import { getAppData } from "../lib/slices/appSlice";
import { useSelector } from "react-redux";
import { RootState } from "../lib/store";
import { walletTypes } from "../enums";
import { TailSpin } from "react-loader-spinner";

interface MainProviderProps {
  children: ReactNode;
}

function MainProvider({ children }: MainProviderProps): JSX.Element {
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user);

  const getWalletAddress = async () => {
    if (!user?.walletName) return;

    const kit: StellarWalletsKit = new StellarWalletsKit({
      network: WalletNetwork.PUBLIC,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });

    const { address } = await kit.getAddress();

    const stellarService = new StellarService();
    const wrappedAccount = await stellarService.loadAccount(address);
    dispatch(getAppData());
    dispatch(storeAccountBalance(wrappedAccount.balances));
    dispatch(getAccountInfo(address));
    dispatch(fetchingWalletInfo(false));
    dispatch(getLockedAquaRewardsForAccount(address));
  };

  const getRewards = async () => {
    const address = user?.userRecords?.account?.account;
    if (address) getLockedAquaRewardsForAccount(address);
  };

  const getAddress = async () => {
    const kit: StellarWalletsKit = new StellarWalletsKit({
      network: WalletNetwork.PUBLIC,
      selectedWalletId: FREIGHTER_ID,
      modules: [new FreighterModule()],
    });

    const { address } = await kit.getAddress();

    dispatch(setUserWalletAddress(address));
  };

  useEffect(() => {
    if (user?.walletConnected) {
      getAddress();
      dispatch(setWalletConnected(false));
    }
  }, [user?.walletConnected]);

  return <Fragment>{children}</Fragment>;
}

export default MainProvider;
