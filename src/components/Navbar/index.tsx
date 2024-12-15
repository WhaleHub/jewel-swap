import { useCallback, useRef } from "react";
import { useState } from "react";
import { useAppDispatch } from "../../lib/hooks";
import {
  fetchingWalletInfo,
  setConnectingWallet,
  setUserWalletAddress,
  walletSelectionAction,
} from "../../lib/slices/userSlice";
import { useSelector } from "react-redux";
import { RootState } from "../../lib/store";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  ArchiveBoxXMarkIcon,
  ChevronDownIcon,
  PencilIcon,
  Square2StackIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/16/solid";

const Navbar = () => {
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleWalletConnections = useCallback(async () => {
    if (user?.walletConnected || user?.connectingWallet) return;
    dispatch(setConnectingWallet(true));
    dispatch(walletSelectionAction(true));
  }, [user?.walletConnected, user?.connectingWallet, dispatch]);

  const handleDisconnect = useCallback(() => {
    setDropdownOpen(false);
    dispatch(setUserWalletAddress(null));
    dispatch(fetchingWalletInfo(false));
  }, [dispatch]);

  const toggleDropdown = useCallback(() => {
    setDropdownOpen((prev) => !prev);
  }, []);

  return (
    <nav className="fixed top-0 right-0 z-30 w-full bg-[#090C0E]/50 backdrop-blur-[9px] shadow-[0_2px_3px_rgba(0,0,0,.3)] py-[32px] px-[32px] transition-all duration-300 font-inter">
      <div className="flex flex-col md:flex-row justify-between items-center  w-full max-w-[1954px] h-full ">
        <div>
          <a
            href="https://www.whalehub.io"
            rel="noopener noreferrer"
            className="flex justify-center items-center "
          >
            <img src={"/whalehub_logo.svg"} className="w-full" alt="Whalehub" />
          </a>
        </div>

        <div className="flex items-center gap-8">
          <button className="font-medium text-base">Boost rewards</button>
          <button className="font-medium text-base">Generate Yeild</button>
        </div>

        <div className="flex justify-end items-center gap-[5.6px]">
          <div className="fixed w-52 text-right ">
            <Menu>
              <MenuButton className="inline-flex items-center gap-2 bg-[linear-gradient(180deg,_#00CC99_0%,_#005F99_100%)] py-3 px-8 text-sm/6 font-semibold text-white shadow-inner shadow-white/10 focus:outline-none data-[hover]:bg-gray-700 data-[open]:bg-gray-700 data-[focus]:outline-1 data-[focus]:outline-white rounded-lg text-base">
                Connect wallet
              </MenuButton>

              <MenuItems
                transition
                anchor="bottom end"
                className="w-96 origin-top-right border bg-[#151A29] border-white/5  text-sm/6 text-white transition duration-100 ease-out [--anchor-gap:var(--spacing-1)] focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 z-40 mt-3"
              >
                <MenuItem>
                  <button className="group flex w-full items-center gap-2 py-4 px-4 data-[focus]:bg-white/10 justify-between border-t border-l border-r border-solid border-[#B1B3B8] text-base text-white font-semibold">
                    Connect wallet
                    <XMarkIcon className="size-6 fill-white/30" />
                  </button>
                </MenuItem>
                <div className="p-4 border border-solid border-[#B1B3B8]">
                  <MenuItem>
                    <button className="group flex w-full items-center gap-2 rounded-lg py-4 px-4 data-[focus]:bg-white/10 justify-between text-base text-white font-semibold">
                      Freighter wallet
                    </button>
                  </MenuItem>
                  <div className="my-2">
                    <MenuItem>
                      <button className="group flex w-full items-center gap-2 rounded-lg py-4 px-4 data-[focus]:bg-white/10 justify-between  text-base text-white font-semibold">
                        LOBSTR wallet
                      </button>
                    </MenuItem>
                  </div>
                  <div className="text-xs  font-normal text-[#B1B3B8]">
                    By connecting a wallet, you agree to WhaleHub Terms of
                    Service and consent to its Privacy Policy.
                  </div>
                </div>
              </MenuItems>
            </Menu>
          </div>
          {/* <div className="p-[7px]">
              <div className="relative inline-block text-left">
                <button
                  className="rounded-[8px] py-2 px-6 text-white w-full bg-[linear-gradient(180deg,_#00CC99_0%,_#005F99_100%)] text-sm font-semibold"
                  type="button"
                  id="menu-button"
                  aria-haspopup="true"
                  onClick={toggleDropdown}
                >
                  {user?.connectingWallet ? (
                    <TailSpin
                      height="18"
                      width="18"
                      color="#ffffff"
                      ariaLabel="tail-spin-loading"
                      radius="1"
                      wrapperStyle={{}}
                      wrapperClass=""
                      visible={true}
                    />
                  ) : (
                    <Fragment>
                      Connect Wallet
                      {user?.userWalletAddress
                        ? `${user?.userWalletAddress.slice(
                            0,
                            4
                          )}...${user?.userWalletAddress.slice(-4)}`
                        : "Connect Wallet"}
                      <svg
                        className="-mr-1 h-5 w-5 text-gray-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </Fragment>
                  )}
                </button>

                {dropdownOpen && (
                  <div
                    ref={dropdownRef}
                    className="absolute right-0 mt-2 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="menu-button"
                    tabIndex={-1}
                  >
                    <div className="py-1" role="none">
                      <button
                        className="text-gray-700 block w-full px-4 py-2 text-sm hover:bg-gray-100"
                        role="menuitem"
                        tabIndex={-1}
                        onClick={handleWalletConnections}
                        disabled={user?.userWalletAddress !== null}
                      >
                        Connect
                      </button>
                      <button
                        className={`${
                          user?.userWalletAddress
                            ? "text-gray-700"
                            : "text-gray-400"
                        } block w-full px-4 py-2 text-sm hover:bg-gray-100`}
                        role="menuitem"
                        tabIndex={-1}
                        onClick={handleDisconnect}
                        disabled={!user?.userWalletAddress} 
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div> */}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
