import { useCallback, useRef } from "react";
import { useState } from "react";
import { useAppDispatch } from "../../lib/hooks";
import {
  fetchingWalletInfo,
  setConnectingWallet,
  setUserbalances,
  setUserWalletAddress,
  setWalletConnected,
  setWalletConnectName,
  walletSelectionAction,
} from "../../lib/slices/userSlice";
import { isAllowed, setAllowed } from "@stellar/freighter-api";
import { useSelector } from "react-redux";
import { RootState } from "../../lib/store";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/16/solid";
import { walletTypes } from "../../enums";
import { getPublicKey } from "@lobstrco/signer-extension-api";
import {
  FREIGHTER_ID,
  FreighterModule,
  ISupportedWallet,
  LOBSTR_ID,
  StellarWalletsKit,
  WalletNetwork,
  XBULL_ID,
  allowAllModules,
  xBullModule,
} from "@creit.tech/stellar-wallets-kit";
import {
  WALLET_CONNECT_ID,
  WalletConnectAllowedMethods,
  WalletConnectModule,
} from "@creit.tech/stellar-wallets-kit/modules/walletconnect.module";
import clsx from "clsx";
import { ToastContainer, toast } from "react-toastify";
export const kitWalletConnect = new StellarWalletsKit({
  selectedWalletId: WALLET_CONNECT_ID,
  network: WalletNetwork.PUBLIC,
  modules: [
    new WalletConnectModule({
      url: "app.whalehub.io",
      projectId: "3dcbb538e6a1ff9db2cdbf0b1c209a9d",
      method: WalletConnectAllowedMethods.SIGN,
      description: `A DESCRIPTION TO SHOW USERS`,
      name: "Whalehub",
      icons: ["A LOGO/ICON TO SHOW TO YOUR USERS"],
      network: WalletNetwork.PUBLIC,
    }),
  ],
});
const Navbar = () => {
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user);

  const handleWalletConnections = useCallback(
    async (walletType: walletTypes) => {
      try {
        if (user?.connectingWallet) return;
        if (walletType === walletTypes.FREIGHTER) {
          const kit: StellarWalletsKit = new StellarWalletsKit({
            network: WalletNetwork.PUBLIC,
            selectedWalletId: FREIGHTER_ID,
            modules: [new FreighterModule()],
          });

          const { address } = await kit.getAddress();

          await setAllowed();
          await isAllowed();
          dispatch(setUserWalletAddress(address));
          dispatch(setConnectingWallet(false));
          dispatch(setWalletConnectName(FREIGHTER_ID));
          dispatch(setWalletConnected(true));
          dispatch(walletSelectionAction(false));
        } else if (walletType === walletTypes.WALLETCONNECT) {
          console.log("started");

          await kitWalletConnect.openModal({
            onWalletSelected: async (option: ISupportedWallet) => {
              kitWalletConnect.setWallet(option.id);
              const { address } = await kitWalletConnect.getAddress();
              console.log(address);

              dispatch(setConnectingWallet(false));
              dispatch(setWalletConnectName(WALLET_CONNECT_ID));
              dispatch(walletSelectionAction(false));
              dispatch(setWalletConnected(true));
              // const publicKey = await getPublicKey();
              dispatch(setUserWalletAddress(address));
            },
          });
        } else {
          dispatch(setConnectingWallet(false));
          dispatch(setWalletConnectName(LOBSTR_ID));
          dispatch(walletSelectionAction(false));
          dispatch(setWalletConnected(true));
          const publicKey = await getPublicKey();
          dispatch(setUserWalletAddress(publicKey));
        }
      } catch (err) {
        dispatch(setWalletConnectName(null));
      } finally {
      }
    },
    [user?.walletConnected, user?.connectingWallet, dispatch]
  );

  const handleDisconnect = useCallback(() => {
    dispatch(setUserWalletAddress(null));
    dispatch(fetchingWalletInfo(false));
    dispatch(setWalletConnectName(null));
    dispatch(setUserbalances(null));
  }, [dispatch]);

  const onScrollToRwards = () => {
    // @ts-expect-error: ignore
    document?.getElementById("reward_section").scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };
  const onScrollToYield = () => {
    // @ts-expect-error: ignore
    document.getElementById("Yield_section").scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <nav className="fixed top-0 right-0 z-30 w-full bg-[#090C0E]/50 backdrop-blur-[9px] shadow-[0_2px_3px_rgba(0,0,0,.3)] py-[32px] px-[15px] md:px-[32px] transition-all duration-300 font-inter">
      <div className="flex md:flex-row justify-between items-center  w-full max-w-[1954px] h-full mx-auto">
        <div>
          <a
            href="https://www.whalehub.io"
            rel="noopener noreferrer"
            className="flex justify-center items-center "
          >
            <img src={"/whalehub_logo.svg"} className="w-full" alt="Whalehub" />
          </a>
        </div>

        <div className="flex items-center gap-8 xs:hidden lg:block space-x-4">
          <button className="font-medium text-base" onClick={onScrollToRwards}>
            Boost rewards
          </button>
          <button className="font-medium text-base" onClick={onScrollToYield}>
            Generate Yield
          </button>
        </div>

        <div className="flex justify-end items-center gap-[5.6px]">
          <div className="fixed w-52 text-right">
            <Menu>
              <MenuButton
                // onClick={async () => {
                //   await kit.openModal({
                //     onWalletSelected: async (option: ISupportedWallet) => {
                //       kit.setWallet(option.id);
                //       const { address } = await kit.getAddress();
                //       // Do something else
                //     },
                //   });
                // }}
                className={clsx(
                  `inline-flex items-center gap-2 py-3 px-8 text-sm/6 font-semibold text-white shadow-inner shadow-white/10 focus:outline-none data-[hover]:bg-gray-700 data-[open]:bg-gray-700 data-[focus]:outline-1 data-[focus]:outline-white rounded-lg text-base`,
                  `${
                    !user?.userWalletAddress && !user?.walletConnected
                      ? "bg-[linear-gradient(180deg,_#00CC99_0%,_#005F99_100%)]"
                      : "b-[#3C404D]"
                  }`,
                  `${user?.userWalletAddress ? "border border-[#B1B3B8]" : ""}`
                )}
              >
                {user?.userWalletAddress
                  ? "Disconnect Wallet"
                  : "Connect Wallet"}
              </MenuButton>

              <MenuItems
                transition
                anchor="bottom end"
                className={clsx(
                  "w-96 origin-top-right border bg-[#151A29] border-white/5  text-sm/6 text-white transition duration-100 ease-out [--anchor-gap:var(--spacing-1)] focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 z-40 mt-3",
                  `${
                    user?.userWalletAddress && user?.walletConnected
                      ? "hidden"
                      : "block"
                  }`
                )}
              >
                {user?.userWalletAddress != null ? (
                  <MenuItem>
                    <button
                      onClick={handleDisconnect}
                      className={clsx(
                        `group flex w-full items-center gap-2 py-4 px-4 data-[focus]:bg-white/10 justify-between border-t border-l border-r border-solid border-[#B1B3B8] text-base text-white font-semibold`
                      )}
                    >
                      Disconnect wallet
                      <XMarkIcon className="size-6 fill-white/30" />
                    </button>
                  </MenuItem>
                ) : (
                  <div></div>
                )}
 
                <div className="p-4 border border-solid border-[#B1B3B8]">
                {user?.userWalletAddress == null ? (
                  <div className="my-2">
                    <MenuItem>
                      <button
                        className="group flex w-full items-center gap-2 rounded-lg py-4 px-4 data-[focus]:bg-white/10 justify-between  text-base text-white font-semibold"
                        onClick={() =>
                          handleWalletConnections(walletTypes.WALLETCONNECT)
                        }
                      >
                        WalletConnect
                      </button>
                    </MenuItem>
                    <MenuItem>
                      <button
                        className="group flex w-full items-center gap-2 rounded-lg py-4 px-4 data-[focus]:bg-white/10 justify-between  text-base text-white font-semibold"
                        onClick={() =>
                          handleWalletConnections(walletTypes.LOBSTR)
                        }
                      >
                        LOBSTR wallet
                      </button>
                    </MenuItem>

                    <MenuItem>
                      <button
                        className="group flex w-full items-center gap-2 rounded-lg py-4 px-4 data-[focus]:bg-white/10 justify-between text-base text-white font-semibold"
                        onClick={() =>
                          handleWalletConnections(walletTypes.FREIGHTER)
                        }
                      >
                        Freighter wallet
                      </button>
                    </MenuItem>
                  </div>
                  ):<div></div>}
                  <div className="text-xs  font-normal text-[#B1B3B8]">
                    By connecting a wallet, you agree to WhaleHub Terms of
                    Service and consent to its Privacy Policy.
                  </div>
                </div>

              </MenuItems>
            </Menu>
            <ToastContainer />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
