import AquaLogo from "../../assets/images/aqua_logo.png";
import { Button, Input } from "@headlessui/react";
import clsx from "clsx";
import { useAppDispatch } from "../../lib/hooks";
import { useSelector } from "react-redux";
import { RootState } from "../../lib/store";
import { useEffect, useState } from "react";
import {
  FREIGHTER_ID,
  FreighterModule,
  LOBSTR_ID,
  LobstrModule,
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";
import { StellarService } from "../../services/stellar.service";
import {
  getAccountInfo,
  lockingAqua,
  mint,
  resetStateValues,
  storeAccountBalance,
} from "../../lib/slices/userSlice";
import {
  Asset,
  BASE_FEE,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  aquaAssetCode,
  aquaAssetIssuer,
  blubAssetCode,
  blubIssuer,
  blubSignerPublicKey,
} from "../../utils/constants";
import { toast } from "react-toastify";
import { Balance } from "../../utils/interfaces";
import { MIN_DEPOSIT_AMOUNT } from "../../config";
import { InformationCircleIcon } from "@heroicons/react/16/solid";

function STKAqua() {
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user);
  const [aquaDepositAmount, setAquaDepositAmount] = useState<number | null>();

  //get user aqua record
  const aquaRecord = user?.userRecords?.balances?.find(
    (balance) => balance.asset_code === "AQUA"
  );

  const userAquaBalance = aquaRecord?.balance;

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

  const handleSetMaxDeposit = () => {
    setAquaDepositAmount(Number(userAquaBalance));
  };

  const handleAddTrustline = async () => {
    const selectedModule =
      user?.walletName === LOBSTR_ID
        ? new LobstrModule()
        : new FreighterModule();

    const kit = new StellarWalletsKit({
      network: WalletNetwork.PUBLIC,
      selectedWalletId:
        user?.walletName === LOBSTR_ID ? LOBSTR_ID : FREIGHTER_ID,
      modules: [selectedModule],
    });

    const stellarService = new StellarService();
    const { address } = await kit.getAddress();
    const senderAccount = await stellarService.loadAccount(address);

    const transactionBuilder = new TransactionBuilder(senderAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.PUBLIC,
    });

    const trustlineOperation = Operation.changeTrust({
      asset: new Asset(blubAssetCode, blubIssuer),
      limit: "1000000000",
    });

    const transactionXDR = transactionBuilder
      .addOperation(trustlineOperation)
      .setTimeout(3000)
      .build()
      .toXDR();

    const { signedTxXdr } = await kit.signTransaction(transactionXDR, {
      address,
      networkPassphrase: WalletNetwork.PUBLIC,
    });

    const HORIZON_SERVER = "https://horizon.stellar.org";

    const transactionToSubmit = TransactionBuilder.fromXDR(
      signedTxXdr,
      HORIZON_SERVER
    );

    await stellarService?.server?.submitTransaction(transactionToSubmit);
  };

  const handleLockAqua = async () => {
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

    dispatch(lockingAqua(true));

    const stellarService = new StellarService();
    const { address } = await kit.getAddress();

    if (!address) {
      dispatch(lockingAqua(false));
      return toast.warn("Please connect wallet.");
    }

    if (!user) {
      dispatch(lockingAqua(false));
      return toast.warn("Global state not initialized.");
    }

    if (!aquaDepositAmount) {
      dispatch(lockingAqua(false));
      return toast.warn("Please input amount to stake.");
    }

    if (aquaDepositAmount < MIN_DEPOSIT_AMOUNT) {
      dispatch(lockingAqua(false));
      return toast.warn(
        `Deposit amount should be higher than ${MIN_DEPOSIT_AMOUNT}.`
      );
    }

    const senderAccount = await stellarService.loadAccount(address);
    const existingTrustlines = senderAccount.balances.map(
      (balance: Balance) => balance.asset_code
    );

    if (!existingTrustlines.includes(blubAssetCode)) {
      try {
        await handleAddTrustline();
        toast.success("Trustline added successfully.");
      } catch (error) {
        dispatch(lockingAqua(false));
        return toast.error("Failed to add trustline.");
      }
    }

    try {
      const customAsset = new Asset(aquaAssetCode, aquaAssetIssuer);
      const stakeAmount = aquaDepositAmount.toFixed(7);

      const paymentOperation = Operation.payment({
        destination: blubSignerPublicKey,
        asset: customAsset,
        amount: stakeAmount,
      });

      const transactionBuilder = new TransactionBuilder(senderAccount, {
        fee: BASE_FEE,
        networkPassphrase: Networks.PUBLIC,
      });

      transactionBuilder.addOperation(paymentOperation).setTimeout(180);

      const transaction = transactionBuilder.build();

      const transactionXDR = transaction.toXDR();

      const { signedTxXdr } = await kit.signTransaction(transactionXDR, {
        address,
        networkPassphrase: WalletNetwork.PUBLIC,
      });

      dispatch(
        mint({
          assetCode: aquaAssetCode,
          assetIssuer: aquaAssetIssuer,
          amount: stakeAmount,
          signedTxXdr,
          senderPublicKey: address,
        })
      );

      dispatch(lockingAqua(true));
      toast.success("Transaction sent!");
    } catch (err) {
      console.error("Transaction failed:", err);
      dispatch(lockingAqua(false));
    }
  };

  useEffect(() => {
    if (user?.lockedAqua) {
      updateWalletRecords();
      toast.success("Aqua locked successfully!");
      setAquaDepositAmount(0);
      dispatch(lockingAqua(false));
      dispatch(resetStateValues());
    }

    if (user?.lockedAqua) {
      updateWalletRecords();
      toast.success("Aqua locked successfully!");
      setAquaDepositAmount(0);
      dispatch(lockingAqua(false));
      dispatch(resetStateValues());
    }
  }, [user?.lockedAqua, user?.lockedAqua]);

  return (
    <div>
      <div className="mx-auto">
        <div className="text-white xs:text-2xl md:text-4xl-custom1 font-medium text-center">
          Elevate Rewards to Rise Above the Curve
        </div>
        <div className="text-[#B1B3B8] text-base font-normal text-center">
          Unlock exclusive opportunities to boost your rewards and gain a
          strategic advantage.
        </div>
      </div>
      <div className="mt-10 md:grid gap-5 grid-cols-2 mb-10">
        <div>
          <div className="bg-[#0E111BCC] p-10 rounded-[16px]">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img
                  src={AquaLogo}
                  alt="Aqua"
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-lg">Aqua</span>
              </div>
              <i className="fa fa-arrow-right" aria-hidden="true"></i>
              <div className="flex items-center space-x-2">
                <img
                  src={"/Blub_logo2.svg"}
                  alt="Aqua"
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-lg">BLUB</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-5 text-2xl">
              <div className="font-medium text-white xs:text-2xl">
                Convert & Stake
              </div>
              <InformationCircleIcon className="size-6" />
            </div>

            <div className="flex items-center bg-[#0E111B]  py-2 space-x-2 mt-2 rounded-[8px]">
              <Input
                placeholder="0 AQUA"
                className={clsx(
                  "block w-full rounded-lg border-none bg-[#0E111B] px-3 text-sm/6 text-white",
                  "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-[#3C404D]",
                  "w-full p-3 bg-none"
                )}
                onChange={(e) =>
                  setAquaDepositAmount(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
              />
              <button
                className="bg-[#3C404D] p-2 rounded-[4px]"
                onClick={handleSetMaxDeposit}
              >
                Max
              </button>
            </div>

            <div className="flex items-center text-normal mt-6 space-x-1">
              <div className="font-normal text-[#B1B3B8]">You will stake:</div>
              <div className="font-medium">0 BLUB</div>
            </div>

            <Button
              className="rounded-[12px] py-5 px-4 text-white mt-10 w-full bg-[linear-gradient(180deg,_#00CC99_0%,_#005F99_100%)] text-base font-semibold cursor-pointer"
              onClick={handleLockAqua}
              disabled={user?.lockingAqua}
            >
              Convert & Stake
            </Button>
          </div>
        </div>
        <div>
          <div className="bg-[#0E111BCC] p-10 rounded-[16px]">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img
                  src={"/Blub_logo2.svg"}
                  alt="Aqua"
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-lg">BLUB</span>
              </div>
            </div>

            <div className="text-2xl font-medium text-white mt-5 flex items-center space-x-2">
              <div>Accumulated rewards</div>
              <InformationCircleIcon className="size-6" />
            </div>

            <div className="flex items-center bg-[#0E111B] px-5 py-2 mt-2 rounded-[8px] justify-between">
              <div className="text-sm font-normal text-white">Daily</div>
              <div className="p-2 text-2xl font-normal">0 BLUB</div>
            </div>

            <div className="flex items-center bg-[#0E111B] px-5 py-2 mt-5 rounded-[8px] justify-between">
              <div className="text-sm font-normal text-white">Total</div>
              <div className="p-2 text-2xl font-normal">
                {user?.userLockedRewardsAmount ?? 0} BLUB
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default STKAqua;
