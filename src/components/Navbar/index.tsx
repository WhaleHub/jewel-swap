import React, { Fragment, useRef } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { adminWallets } from "../../config";
import logo from "../../assets/images/logo.png";
import { useAppDispatch } from "../../lib/hooks";
import {
  fetchingWalletInfo,
  setConnectingWallet,
  setUserWalletAddress,
  walletSelectionAction,
} from "../../lib/slices/userSlice";
import { useSelector } from "react-redux";
import { RootState } from "../../lib/store";
import { TailSpin } from "react-loader-spinner";

const Navbar = () => {
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleWalletConnections = async () => {
    if (user?.walletConnected || user?.connectingWallet) return;
    dispatch(setConnectingWallet(true));
    dispatch(walletSelectionAction(true));
  };

  const handleDisconnect = () => {
    setDropdownOpen(false);
    dispatch(setUserWalletAddress(null));
    dispatch(fetchingWalletInfo(false));
  };

  // Toggle the dropdown when the button is clicked
  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <nav className="fixed top-0 right-0 z-30 min-h-[81.5px] w-full bg-[#090C0E]/50 backdrop-blur-[9px] shadow-[0_2px_3px_rgba(0,0,0,.3)] py-[5px] transition-all duration-300">
      <div className="flex flex-col md:flex-row justify-center w-full h-full pt-[16px]">
        <div className="flex flex-col md:flex-row justify-between items-center gap-[5px] md:gap-[14px] w-full max-w-[1320px] h-full px-[10.5px]">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex justify-center items-center w-[160px] md:w-[200px]"
          >
            <img src={logo} className="w-full" alt="logo" />
          </a>

          <div className="flex justify-end items-center gap-[5.6px]">
            <div className="flex items-center gap-3">
              {user?.userWalletAddress &&
                adminWallets.includes(user?.userWalletAddress) && (
                  <Link
                    to={"/admin"}
                    className="text-[14px] text-[#939da7] hover:text-white"
                  >
                    Admin
                  </Link>
                )}
            </div>

            <div className="p-[7px]">
              <div className="relative inline-block text-left">
                <button
                  type="button"
                  className="btn-primary2 after:bg-[rgba(16,197,207,.6)] inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
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

                {/* Dropdown */}
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
                        disabled={user?.userWalletAddress !== null} // Disable if wallet is already connected
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
                        disabled={!user?.userWalletAddress} // Disable if no wallet is connected
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
