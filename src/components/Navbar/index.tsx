import React from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { adminWallets } from "../../config";
import logo from "../../assets/images/logo.png";
import {
  allowAllModules,
  StellarWalletsKit,
  WalletNetwork,
  FREIGHTER_ID,
} from "@creit.tech/stellar-wallets-kit";
import { isAllowed, setAllowed } from "@stellar/freighter-api";

const Navbar = () => {
  const [address, setAddress] = useState<string>("");

  const connectFreighterWallet = async () => {
    await setAllowed();
    await isAllowed();

    const kit: StellarWalletsKit = new StellarWalletsKit({
      network: WalletNetwork.PUBLIC,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });

    const { address } = await kit.getAddress();
    setAddress(address);
  };

  return (
    <nav className="fixed top-0 right-0 z-30 min-h-[81.5px] w-full bg-[#090C0E]/50 backdrop-blur-[9px] shadow-[0_2px_3px_rgba(0,0,0,.3)] py-[5px] transition-all duration-300">
      <div className="flex flex-col md:flex-row justify-center w-full h-full pt-[16px]">
        <div className="flex flex-col md:flex-row justify-between items-center gap-[5px] md:gap-[14px] w-full max-w-[1320px] h-full px-[10.5px]">
          <a
            href="https://jewelswap.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex justify-center items-center w-[160px] md:w-[200px]"
          >
            <img src={logo} className="w-full" alt="logo" />
          </a>

          <div className="flex justify-end items-center gap-[5.6px]">
            <div className="flex items-center gap-3">
              <Link
                to={"/stake/sol"}
                className="text-[14px] text-[#939da7] hover:text-white"
              >
                Stake
              </Link>
              <Link
                to={"/gauge"}
                className="text-[14px] text-[#939da7] hover:text-white"
              >
                Gauge
              </Link>
              {address && adminWallets.includes(address) && (
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
                {address ? (
                  <button
                    type="button"
                    className="btn-primary2 after:bg-[rgba(84,245,183,.6)] inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    id="menu-button"
                    aria-expanded="true"
                    aria-haspopup="true"
                  >
                    {`${address.slice(0, 4)}...${address.slice(-4)}`}
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
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-primary2 after:bg-[rgba(84,245,183,.6)] inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    id="menu-button"
                    aria-haspopup="true"
                    onClick={connectFreighterWallet}
                  >
                    Connect
                  </button>
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
