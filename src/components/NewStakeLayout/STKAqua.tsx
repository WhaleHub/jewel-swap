import AquaLogo from "../../assets/images/aqua_logo.png";
import { Button, Input } from "@headlessui/react";
import clsx from "clsx";
import { useAppDispatch } from "../../lib/hooks";
import { useSelector } from "react-redux";
import { RootState } from "../../lib/store";
import { useEffect, useState } from "react";
import { StellarService } from "../../services/stellar.service";
import {
  getAccountInfo,
  mint,
  resetStateValues,
  setUserbalances,
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
import DialogC from "./Dialog";
import { kitWalletConnectGlobal } from "../Navbar";
import { TailSpin } from "react-loader-spinner";
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function STKAqua() {
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user);
  const [aquaDepositAmount, setAquaDepositAmount] = useState<number | null>(0);
  const [dialogMsg, setDialogMsg] = useState<string>("");
  const [dialogTitle, setDialogTitle] = useState<string>("");
  const [openDialog, setOptDialog] = useState<boolean>(false);
  const [userAquaBalance, setUserAquaBalance] = useState<string>("0");
  const [isLockingAqua, setIsLockingAqua] = useState<boolean>(false);

  //get user aqua record
  useEffect(() => {
    const aquaRecord = user?.userRecords?.balances?.find(
      (balance) => balance.asset_code === "AQUA"
    );
    setUserAquaBalance(aquaRecord?.balance || "0");
  }, [user?.userRecords?.balances]);

  const updateWalletRecords = async () => {
    const { address } = await kitWalletConnectGlobal.getAddress();
    const stellarService = new StellarService();
    const wrappedAccount = await stellarService.loadAccount(address);

    const claimable = user?.userRecords?.account?.claimableRecords?.reduce(
      (total: any, item: any) => total + parseFloat(item.amount),
      0
    );
    console.log("claimable:" + claimable);
    dispatch(getAccountInfo(address));
    dispatch(setUserbalances(wrappedAccount.balances));
  };

  const handleSetMaxDeposit = () => {
    let depositAmount = 0;

    if (typeof userAquaBalance === "number" && !isNaN(userAquaBalance)) {
      depositAmount = userAquaBalance;
    } else if (typeof userAquaBalance === "string") {
      const convertedAmount = parseFloat(userAquaBalance);
      if (!isNaN(convertedAmount)) {
        depositAmount = convertedAmount;
      }
    }

    setAquaDepositAmount(depositAmount);
  };

  const handleLockAqua = async () => {
    setIsLockingAqua(true);
    if (!user?.userWalletAddress) {
      setIsLockingAqua(false);
      return toast.warn("Please connect wallet.");
    }

    if (!userAquaBalance) {
      setIsLockingAqua(false);
      return toast.warn("Balance is low");
    }

    if (!user) {
      setIsLockingAqua(false);
      return toast.warn("Global state not initialized.");
    }

    if (!aquaDepositAmount) {
      setIsLockingAqua(false);
      return toast.warn("Please input amount to stake.");
    }

    if (aquaDepositAmount < MIN_DEPOSIT_AMOUNT) {
      setIsLockingAqua(false);
      return toast.warn(
        `Deposit amount should be higher than ${MIN_DEPOSIT_AMOUNT}.`
      );
    }

    const stellarService = new StellarService();

    const senderAccount = await stellarService.loadAccount(
      user?.userWalletAddress
    );
    const existingTrustlines = senderAccount.balances.map(
      (balance: Balance) => balance.asset_code
    );

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

      if (!existingTrustlines.includes(blubAssetCode)) {
        transactionBuilder.addOperation(
          Operation.changeTrust({
            asset: new Asset(blubAssetCode, blubIssuer),
            limit: "1000000000",
          })
        )
      }

      transactionBuilder.addOperation(paymentOperation).setTimeout(180);

      const transaction = transactionBuilder.build();
      const transactionXDR = transaction.toXDR();

      const { signedTxXdr: signedTx } =
        await kitWalletConnectGlobal.signTransaction(transactionXDR);

      await dispatch(
        mint({
          assetCode: aquaAssetCode,
          assetIssuer: aquaAssetIssuer,
          amount: stakeAmount,
          signedTxXdr: signedTx,
          senderPublicKey: user?.userWalletAddress,
        })
      ).unwrap();

      toast.success("Aqua locked successfully!");
      setAquaDepositAmount(0);
      updateWalletRecords();
      setIsLockingAqua(false);
      dispatch(resetStateValues());
    } catch (err) {
      console.error("Transaction failed:", err);
      toast.error("Try again!");
      setIsLockingAqua(false);
    }
  };

  const onDialogOpen = (msg: string, title: string) => {
    setOptDialog(true);
    setDialogMsg(msg);
    setDialogTitle(title);
  };

  const closeDialog = () => {
    setOptDialog(false);
  };

  // Close modal on ESC key press or click outside
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setOptDialog(false);
    }
  };

  useEffect(() => {
    if (openDialog) {
      window.addEventListener("keydown", handleKeyDown);
    } else {
      window.removeEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openDialog]);

  return (
    <div id="reward_section">
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
              <div className="relative group">
                <InformationCircleIcon
                  className="h-[15px] w-[15px] text-white cursor-pointer"
                  onClick={() =>
                    onDialogOpen(
                      "After you connected your wallet and have AQUA in it select the amount of AQUA tokens you wish to convert to BLUB. Once converted, your BLUB will be automatically staked to start earning boosted rewards.",
                      "Convert & Stake"
                    )
                  }
                />
              </div>
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
                value={`${aquaDepositAmount ?? ""}`}
              />
              <button
                className="bg-[#3C404D] p-2 rounded-[4px]"
                onClick={handleSetMaxDeposit}
              >
                Max
              </button>
            </div>

            <div className="flex items-center text-normal mt-6 space-x-1">
              <div className="font-normal text-[#B1B3B8]">Your balance:</div>
              <div className="font-medium">
                {isNaN(parseFloat(`${userAquaBalance}`))
                  ? "0.00"
                  : parseFloat(`${userAquaBalance}`).toFixed(2)}{" "}
                AQUA
              </div>
            </div>

            <Button
              className="rounded-[12px] py-5 px-4 text-white mt-10 w-full bg-[linear-gradient(180deg,_#00CC99_0%,_#005F99_100%)] text-base font-semibold cursor-pointer"
              onClick={handleLockAqua}
              disabled={isLockingAqua}
            >
              {!isLockingAqua ? (
                <span> Convert & Stake </span>
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
              <div className="relative group">
                <InformationCircleIcon
                  className="h-[15px] w-[15px] text-white cursor-pointer"
                  onClick={() =>
                    onDialogOpen(
                      "View your daily reward earnings in BLUB and track the total BLUB accumulated over time. Keep an eye on your growing rewards here.",
                      "Accumulated rewards"
                    )
                  }
                />
              </div>
            </div>

            <div className="flex items-center bg-[#0E111B] px-5 py-2 mt-2 rounded-[8px] justify-between">
              {/* <div className="text-sm font-normal text-white">Daily</div> */}
              <div className="p-2 text-2xl font-normal"></div>
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

      <DialogC
        msg={dialogMsg}
        openDialog={openDialog}
        dialogTitle={dialogTitle}
        closeModal={closeDialog}
      />
    </div>
  );
}

export default STKAqua;
