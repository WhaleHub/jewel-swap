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

  useEffect(() => {
    if (user.userWalletAddress) {
      dispatch(fetchingWalletInfo(true));
      getWalletAddress();
      getRewards();
    } else {
      dispatch(logOut());
    }
  }, [user?.userWalletAddress]);

  return (
    <Fragment>
      {children}
      {!user?.userWalletAddress && <ConnectWalletModal />}
    </Fragment>
  );
}

function ConnectWalletModal() {
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user);
  const [loading, setLoading] = useState<string | null>(null);
  const walletSelectionActionVal = user?.walletSelectionOpen;
  const isModalOpen = !user.userWalletAddress && user.walletSelectionOpen;

  const handleWalletConnections = () => {
    dispatch(setConnectingWallet(false));
    setLoading(null);
    dispatch(walletSelectionAction(false));
  };

  const connectWallet = useCallback(
    async (walletType: string) => {
      setLoading(walletType);
      dispatch(setWalletConnectName(walletType));

      const selectedWalletId =
        walletType === walletTypes.FREIGHTER ? FREIGHTER_ID : LOBSTR_ID;

      try {
        if (selectedWalletId === walletTypes.FREIGHTER) {
          const kit: StellarWalletsKit = new StellarWalletsKit({
            network: WalletNetwork.PUBLIC,
            selectedWalletId: FREIGHTER_ID,
            modules: [new FreighterModule()],
          });

          await setAllowed();
          await isAllowed();

          const { address } = await kit.getAddress();
          dispatch(setUserWalletAddress(address));
          handleWalletConnections();
        } else if (walletTypes.LOBSTR) {
          const kit: StellarWalletsKit = new StellarWalletsKit({
            network: WalletNetwork.PUBLIC,
            selectedWalletId: LOBSTR_ID,
            modules: [new LobstrModule()],
          });

          await setAllowed();
          await isAllowed();

          const { address } = await kit.getAddress();
          dispatch(setUserWalletAddress(address));
          handleWalletConnections();
        }
      } catch (error) {
        console.error(`Error connecting to ${walletType} wallet:`, error);
        setLoading(null);
      }
    },
    [dispatch]
  );

  return (
    <Fragment>
      {isModalOpen && (
        <div
          className={`relative display-none ${
            !user?.userWalletAddress && walletSelectionActionVal ? "z-10" : ""
          }`}
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`${
              !user?.userWalletAddress && walletSelectionActionVal
                ? "fixed"
                : ""
            } inset-0 bg-gray-500 bg-opacity-75 transition-opacity`}
            aria-hidden="true"
          ></div>

          <div
            className={`${
              !user?.userWalletAddress && walletSelectionActionVal
                ? "fixed"
                : ""
            } inset-0 ${
              !user?.userWalletAddress && walletSelectionActionVal ? "z-10" : ""
            } w-screen overflow-y-auto`}
          >
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg
                        className="h-6 w-6 text-blue-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                        />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <h3
                        className="text-base font-semibold leading-6 text-gray-900"
                        id="modal-title"
                      >
                        Choose Wallet
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Select a wallet to connect.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6">
                  <div className="flex flex-col space-y-4">
                    <button
                      onClick={() => connectWallet(walletTypes.FREIGHTER)}
                      className="w-full mb-3 bg-green-500 text-white py-2 rounded-md hover:bg-green-600"
                    >
                      {loading === walletTypes.FREIGHTER ? (
                        <TailSpin height="18" width="18" color="#fff" />
                      ) : (
                        "Connect Freighter"
                      )}
                    </button>

                    <button
                      onClick={() => connectWallet(walletTypes.LOBSTR)}
                      className="w-full bg-purple-500 text-white py-2 rounded-md hover:bg-purple-600"
                    >
                      {loading === walletTypes.LOBSTR ? (
                        <TailSpin height="18" width="18" color="#fff" />
                      ) : (
                        "Connect LOBSTR"
                      )}
                    </button>
                  </div>

                  <div className="mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                      onClick={handleWalletConnections}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}

export default MainProvider;
