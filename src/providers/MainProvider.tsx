import { Fragment, ReactNode, useEffect } from "react";
import {
  FREIGHTER_ID,
  FreighterModule,
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";
import { StellarService } from "../services/stellar.service";
import { useAppDispatch } from "../lib/hooks";
import {
  fetchingWalletInfo,
  getAccountInfo,
  getLockedAquaRewardsForAccount,
  setUserbalances,
  setUserWalletAddress,
  setWalletConnected,
  setWalletConnectName,
} from "../lib/slices/userSlice";
import { useSelector } from "react-redux";
import { RootState } from "../lib/store";
import { walletTypes } from "../enums";
import { getPublicKey } from "@lobstrco/signer-extension-api";
import { getAppData } from "../lib/slices/appSlice";
import { kitWalletConnectGlobal } from "../components/Navbar";

interface MainProviderProps {
  children: ReactNode;
}

function MainProvider({ children }: MainProviderProps): JSX.Element {
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user);

  const getWalletInfo = async () => {
    if (!user?.walletName) return;
    const stellarService = new StellarService();
    let address = "";

    if (user?.walletName === walletTypes.LOBSTR) {
      address = `${user.userWalletAddress}`;
    } else {
      const { address: addr } = await kitWalletConnectGlobal.getAddress();
      address = addr;
    }
    const wrappedAccount = await stellarService.loadAccount(address);

    dispatch(getAppData());
    dispatch(setUserbalances(wrappedAccount.balances));
    dispatch(getAccountInfo(address));
    dispatch(fetchingWalletInfo(false));
    dispatch(getLockedAquaRewardsForAccount(address));
  };

  const getAddress = async () => {
    try {
      if (walletTypes.FREIGHTER === user?.walletName) {
        if (user?.walletName) return;
        const kit: StellarWalletsKit = new StellarWalletsKit({
          network: WalletNetwork.PUBLIC,
          selectedWalletId: FREIGHTER_ID,
          modules: [new FreighterModule()],
        });
        const address = await kit.getAddress();
        dispatch(setUserWalletAddress(address));
      } else if (walletTypes.LOBSTR === user?.walletName) {
        if (user?.walletName) return;
        const publicKey = await getPublicKey();
        dispatch(setUserWalletAddress(publicKey));
      } else if (walletTypes.WALLETCONNECT === user?.walletName) {
        if (user?.walletName) return;
        const address = await kitWalletConnectGlobal.getAddress();
        dispatch(setUserWalletAddress(address));
      }
    } catch (err) {
      dispatch(setWalletConnectName(null));
    }
  };

  useEffect(() => {
    if (user?.walletConnected || user?.userWalletAddress) {
      getAddress();
      dispatch(setWalletConnected(false));
      getWalletInfo();
    }
  }, [user?.walletConnected, user?.userWalletAddress]);

  return <Fragment>{children}</Fragment>;
}

export default MainProvider;
