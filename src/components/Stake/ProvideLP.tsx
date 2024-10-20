import React, { Fragment, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../lib/store";
import { toast } from "react-toastify";
import {
  FREIGHTER_ID,
  FreighterModule,
  LOBSTR_ID,
  LobstrModule,
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";
import {
  getAccountInfo,
  provideLiquidity,
  providingLp,
  resetStateValues,
  storeAccountBalance,
} from "../../lib/slices/userSlice";
import { useAppDispatch } from "../../lib/hooks";
import { StellarService } from "../../services/stellar.service";
import {
  aquaAssetCode,
  aquaAssetIssuer,
  blubIssuerPublicKey,
  lpSignerPublicKey,
  whlAquaIssuer,
  whlAssetCode,
} from "../../utils/constants";
import {
  Asset,
  BASE_FEE,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import aquaLogo from "../../assets/images/aqua_logo.png";
import { TailSpin } from "react-loader-spinner";

function ProvideLP() {
  const [lpBlubAmount, setLPBlubDepositAmount] = useState<number | null>();
  const [lpAquaAmount, setLpAquaDepositAmount] = useState<number | null>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const dispatch = useAppDispatch();

  const user = useSelector((state: RootState) => state.user);

  const handleProvideLiquidity = async () => {
    const selectedModule =
      user?.walletName === LOBSTR_ID
        ? new LobstrModule()
        : new FreighterModule();

    const kit: StellarWalletsKit = new StellarWalletsKit({
      network: WalletNetwork.PUBLIC,
      selectedWalletId:
        user?.walletName === LOBSTR_ID ? LOBSTR_ID : FREIGHTER_ID,
      modules: [selectedModule],
    });

    const wallet = await kit.getAddress();

    if (!wallet.address) {
      dispatch(providingLp(false));
      return toast.warn("Please connect wallet.");
    }

    if (!user) {
      dispatch(providingLp(false));
      return toast.warn("Global state not initialized");
    }

    if (!lpBlubAmount) {
      dispatch(providingLp(false));
      return toast.warn("Please input XLM amount to stake.");
    }

    if (!lpAquaAmount) {
      dispatch(providingLp(false));
      return toast.warn("Please input AQUA amount to stake.");
    }
    dispatch(providingLp(true));

    try {
      // Retrieve the wallet address from the Stellar Kit
      const stellarService = new StellarService();
      const senderAccount = await stellarService.loadAccount(wallet.address);

      // Load the sponsor (whaleHub) account details from the Stellar network
      await stellarService.loadAccount(lpSignerPublicKey);

      const aquaAsset = new Asset(aquaAssetCode, aquaAssetIssuer);

      const blubStakeAmount = lpBlubAmount.toFixed(7);
      const aquaStakeAmount = lpAquaAmount.toFixed(7);

      //transfer asset to server wallet
      const paymentOperation1 = Operation.payment({
        destination: lpSignerPublicKey,
        asset: aquaAsset,
        amount: `${blubStakeAmount}`,
      });

      const paymentOperation2 = Operation.payment({
        destination: lpSignerPublicKey,
        asset: new Asset(whlAssetCode, whlAquaIssuer),
        amount: `${aquaStakeAmount}`,
      });

      // Build transaction
      const transactionBuilder = new TransactionBuilder(senderAccount, {
        fee: BASE_FEE,
        networkPassphrase: Networks.PUBLIC,
      })
        .addOperation(
          Operation.changeTrust({
            asset: aquaAsset,
            limit: "100000000",
            source: blubIssuerPublicKey,
          })
        )
        .addOperation(paymentOperation1)
        .addOperation(paymentOperation2)
        .setTimeout(30)
        .build();

      // Convert the transaction to XDR format for signing
      const transactionXDR = transactionBuilder.toXDR();

      const address = wallet.address;

      const { signedTxXdr } = await kit.signTransaction(transactionXDR, {
        address,
        networkPassphrase: WalletNetwork.PUBLIC,
      });

      dispatch(
        provideLiquidity({
          asset1: {
            ...new Asset(whlAssetCode, whlAquaIssuer),
            amount: blubStakeAmount,
          },
          asset2: {
            ...aquaAsset,
            amount: aquaStakeAmount,
          },
          signedTxXdr,
          senderPublicKey: address,
        })
      );
      dispatch(providingLp(true));
      toast.success("Transaction sent!");
    } catch (err) {
      console.error("Transaction failed:", err);
      dispatch(providingLp(false));
    }
  };

  const updateWalletRecords = async () => {
    const selectedModule =
      user?.walletName === LOBSTR_ID
        ? new LobstrModule()
        : new FreighterModule();

    const kit: StellarWalletsKit = new StellarWalletsKit({
      network: WalletNetwork.PUBLIC,
      selectedWalletId: FREIGHTER_ID,
      modules: [selectedModule],
    });

    const { address } = await kit.getAddress();
    const stellarService = new StellarService();
    const wrappedAccount = await stellarService.loadAccount(address);

    dispatch(getAccountInfo(address));
    dispatch(storeAccountBalance(wrappedAccount.balances));
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  useEffect(() => {
    if (user?.providedLp) {
      updateWalletRecords();
      toast.success("Provided Liquidity successfully!");
      setLpAquaDepositAmount(0);
      setLPBlubDepositAmount(0);
      dispatch(providingLp(false));
      dispatch(resetStateValues());
    }
  }, [user?.providedLp]);

  return (
    <Fragment>
      <div className="w-full p-4 bg-white rounded-[4px] cursor-pointer">
        <div className="grid grid-cols-5 text-gray-500 text-sm font-semibold pb-4">
          <div className="w-2/5 md:w-1/3">Pool</div>
          <div className="text-center">Fee</div>
          <div className="text-center">TVL</div>
          <div className="text-center">LP APY</div>
          <div className="text-center">Rewards APY</div>
        </div>

        <div
          className="p-4 flex items-center shadow-md bg-[rgb(18,18,18)] bg-[linear-gradient(rgba(255,255,255,0.05),rgba(255,255,255,0.05))] rounded-[4px]"
          onClick={openModal}
        >
          <div className="flex items-center space-x-4 w-2/5 md:w-1/3">
            <div className="relative flex items-center">
              <img
                src="/blub_logo.png"
                alt="BLUB"
                className="w-12 h-12 relative z-10 rounded-full"
              />
              <img
                src={aquaLogo}
                alt="AQUA"
                className="w-12 h-12 -ml-4 rounded-full"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-white">
                BLUB / AQUA
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 w-full text-center">
            <div className="text-sm font-semibold text-gray-300">0.30%</div>
            <div className="text-sm font-semibold text-gray-300">$989,876</div>
            <div className="text-sm font-semibold text-gray-300">0.02%</div>
            <div className="text-sm font-semibold text-gray-300">2.92%</div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 text-black">
          <div className="bg-white rounded-lg p-6 max-w-md w-full relative">
            {/* Close Button */}
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={closeModal}
            >
              &times;
            </button>

            <h2 className="text-xl font-bold mb-4">Add liquidity</h2>

            {/* Modal Content */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  BLUB Amount
                </label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                    placeholder="Enter BLUB amount"
                    onChange={(e) =>
                      setLPBlubDepositAmount(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <img
                      src={"/blub_logo.png"}
                      alt="Blub"
                      className="w-6 h-6"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  AQUA Amount
                </label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                    placeholder="Enter AQUA amount"
                    onChange={(e) =>
                      setLpAquaDepositAmount(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <img src={aquaLogo} alt="USDC" className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <span>Type</span>
                <span>Volatile</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Fee</span>
                <span>0.30%</span>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mt-4 hidden">
                <div className="flex justify-between text-sm mb-2">
                  <span>Share of Pool</span>
                  <span>0%</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Daily rewards</span>
                  <span>0 AQUA</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Pooled EURC</span>
                  <span>0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Pooled USDC</span>
                  <span>0</span>
                </div>
              </div>

              <button
                className="mt-4 w-full py-2 px-4 rounded-md text-white hover:opacity-80 transition duration-200"
                style={{ backgroundColor: "#0f1720" }}
                onClick={handleProvideLiquidity}
                disabled={user?.providingLp || !user?.userWalletAddress}
              >
                {!user?.providingLp ? (
                  <span>Provide Liquidity</span>
                ) : (
                  <div className="flex justify-center items-center gap-[10px]">
                    <span className="text-white">Processing...</span>
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
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}

export default ProvideLP;
