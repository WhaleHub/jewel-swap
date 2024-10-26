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
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

type PoolType = {
  pool: string;
  tvl: number;
  rewardsApy: string;
};

const defaultData: PoolType[] = [
  {
    pool: "BLUB/AQUA",
    tvl: 24000,
    rewardsApy: "2.9%",
  },
];

const columnHelper = createColumnHelper<PoolType>();

const columns = [
  columnHelper.accessor("pool", {
    id: "Pool",
    cell: (info) => (
      <div className="flex items-center gap-2">
        <div className="relative flex items-center mt-4">
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
        <div>{info.getValue()}</div>
      </div>
    ),
  }),
  columnHelper.accessor("tvl", {
    id: "TVL",
    cell: (info) => info.renderValue(),
  }),
  columnHelper.accessor("rewardsApy", {
    id: "Rewards APY",
    cell: (info) => info.renderValue(),
  }),
];

function ProvideLP() {
  const [lpBlubAmount, setLPBlubDepositAmount] = useState<number | null>();
  const [lpAquaAmount, setLpAquaDepositAmount] = useState<number | null>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [data, _setData] = useState(() => [...defaultData]);

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

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

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
      <div className="w-full overflow-x-scroll">
        <table className="w-full px-3">
          <thead className="bg-white rounded-[4px] cursor-pointer p-4">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className=" text-gray-500 ">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="">
                    {header.isPlaceholder ? null : (
                      <div className="text-start capitalize">
                        {header.column.id}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="mt-8 p-4">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} onClick={openModal} className="cursor-pointer">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
