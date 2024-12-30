import clsx from "clsx";
import { Button, Input } from "@headlessui/react";
import { useEffect, useState } from "react";
import { useAppDispatch } from "../../lib/hooks";
import { useSelector } from "react-redux";
import { RootState } from "../../lib/store";
import {
  FREIGHTER_ID,
  FreighterModule,
  LOBSTR_ID,
  LobstrModule,
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";
import { toast } from "react-toastify";
import {
  getAccountInfo,
  lockingAqua,
  resetStateValues,
  restakeBlub,
  restaking,
  storeAccountBalance,
  unStakeAqua,
  unStakingAqua,
} from "../../lib/slices/userSlice";
import { StellarService } from "../../services/stellar.service";
import { Balance } from "../../utils/interfaces";
import {
  blubAssetCode,
  blubIssuer,
  blubIssuerPublicKey,
  lpSignerPublicKey,
} from "../../utils/constants";
import {
  Asset,
  BASE_FEE,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { TailSpin } from "react-loader-spinner";
import AddLiquidity from "./AddLiquidity";
import { InformationCircleIcon } from "@heroicons/react/16/solid";
import { walletTypes } from "../../enums";
import { signTransaction } from "@lobstrco/signer-extension-api";
import DialogC from "./Dialog";

function Yeild() {
  const dispatch = useAppDispatch();
  const [blubStakeAmount, setBlubStakeAmount] = useState<number | null>(0);
  const [blubUnstakeAmount, setBlubUnstakeAmount] = useState<number | null>(0);
  const [dialogMsg, setDialogMsg] = useState<string>("");
  const [openDialog, setOptDialog] = useState<boolean>(false);
  const [dialogTitle, setDialogTitle] = useState<string>("");

  const user = useSelector((state: RootState) => state.user);

  const blubRecord = user?.userRecords?.balances?.find(
    (balance) => balance.asset_code === "BLUB"
  );

  // //get user aqua record
  // const aquaRecord = user?.userRecords?.balances?.find(
  //   (balance) => balance.asset_code === "AQUA"
  // );

  const blubBalance = blubRecord?.balance;

  // Calculate accountClaimableRecords
  const accountClaimableRecords =
    user?.userRecords?.account?.claimableRecords
      ?.filter((record: any) => record.claimed === "UNCLAIMED")
      ?.reduce((total, record: any) => {
        return Number(total) + Number(record.amount);
      }, 0) || 0;

  const userPoolBalances =
    user?.userRecords?.account?.pools
      ?.filter((pool: any) => pool.claimed === "UNCLAIMED")
      ?.filter((pool: any) => pool.depositType === "LOCKER")
      ?.filter((pool: any) => pool.assetB.code === "AQUA")
      ?.reduce((total, record: any) => {
        return Number(total) + Number(record.assetBAmount);
      }, 0) || 0;

  // Add the two calculated values
  const poolAndClaimBalance =
    Number(userPoolBalances) + Number(accountClaimableRecords);

  const handleSetMaxDepositForBlub = () => {
    const depositAmount =
      typeof accountClaimableRecords === "number" &&
      !isNaN(accountClaimableRecords)
        ? Number(accountClaimableRecords)
        : 0;

    setBlubStakeAmount(depositAmount);
  };

  const handleSetMaxDepositForUnstakeBlub = () => {
    const depositAmount =
      typeof accountClaimableRecords === "number" &&
      !isNaN(accountClaimableRecords)
        ? Number(accountClaimableRecords)
        : 0;

    setBlubUnstakeAmount(depositAmount);
  };

  const handleUnstakeAqua = async () => {
    if (poolAndClaimBalance < 1 || Number(blubUnstakeAmount) < 1)
      return toast.warn("Nothing to unstake");

    if (Number(blubUnstakeAmount) > poolAndClaimBalance)
      return toast.warn("Unstake amount exceeds the pool balance");

    dispatch(unStakingAqua(true));
    dispatch(
      unStakeAqua({
        senderPublicKey: `${user?.userWalletAddress}`,
        amountToUnstake: Number(blubUnstakeAmount),
      })
    );
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

  const handleRestake = async () => {
    if (!user?.userWalletAddress) {
      dispatch(lockingAqua(false));
      return toast.warn("Please connect wallet.");
    }

    if (!user) {
      dispatch(lockingAqua(false));
      return toast.warn("Global state not initialized.");
    }

    if (!blubStakeAmount) {
      dispatch(lockingAqua(false));
      return toast.warn("Please input amount to stake.");
    }

    if (Number(blubBalance) < blubStakeAmount || !blubBalance) {
      dispatch(lockingAqua(false));
      return toast.warn(`Your balance is low`);
    }

    dispatch(restaking(true));
    const stellarService = new StellarService();
    const senderAccount = await stellarService.loadAccount(
      user?.userWalletAddress
    );

    const existingTrustlines = senderAccount.balances.map(
      (balance: Balance) => balance.asset_code
    );

    if (!existingTrustlines.includes(blubAssetCode)) {
      dispatch(restaking(false));
      return toast.warn(`You need trustline for ${blubAssetCode}`);
    }

    try {
      const stakeAmount = blubStakeAmount.toFixed(7);

      const paymentOperation = Operation.payment({
        destination: lpSignerPublicKey,
        asset: new Asset(blubAssetCode, blubIssuer),
        amount: stakeAmount,
      });

      const transactionBuilder = new TransactionBuilder(senderAccount, {
        fee: BASE_FEE,
        networkPassphrase: Networks.PUBLIC,
      });

      const transaction = transactionBuilder.setTimeout(3000).build();

      let signedTxXdr: string = "";
      if (user?.walletName === walletTypes.LOBSTR) {
        signedTxXdr = await signTransaction(transaction.toXDR());
      } else {
        const kit: StellarWalletsKit = new StellarWalletsKit({
          network: WalletNetwork.PUBLIC,
          selectedWalletId: FREIGHTER_ID,
          modules: [new FreighterModule()],
        });
        transactionBuilder.addOperation(paymentOperation).setTimeout(180);
        const transactionXDR = transaction.toXDR();
        const { signedTxXdr: signed } = await kit.signTransaction(
          transactionXDR,
          {
            address: `${user?.userWalletAddress}`,
            networkPassphrase: WalletNetwork.PUBLIC,
          }
        );
        signedTxXdr = signed;
      }
      dispatch(
        restakeBlub({
          assetCode: "BLUB",
          assetIssuer: blubIssuerPublicKey,
          amount: `${blubStakeAmount}`,
          signedTxXdr,
          senderPublicKey: `${user?.userWalletAddress}`,
        })
      );
      dispatch(restaking(true));
    } catch (err) {
      console.log(err);
      dispatch(restaking(false));
    }
  };

  const onDialogOpen = (msg: string, title: string) => {
    setOptDialog(true);
    setDialogMsg(msg);
    setDialogTitle(title);
  };

  const closeModal = () => {
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

  useEffect(() => {
    if (user?.restaked) {
      updateWalletRecords();
      toast.success("BLUB Locked successfully!");
      dispatch(resetStateValues());
      dispatch(restaking(false));
    }

    if (user?.unStakedAqua) {
      updateWalletRecords();
      toast.success("Blub unstaked successfully!");
      dispatch(resetStateValues());
      dispatch(unStakingAqua(false));
    }
  }, [user?.restaked, user?.unStakedAqua]);

  return (
    <div id="yeild_section">
      <div className="max-w-[912px] mx-auto">
        <div className="text-white xs:text-2xl md:text-4xl-custom1 font-medium text-center">
          Make Smart Yield Decisions to Maximize Returns
        </div>
        <div className="text-[#B1B3B8] text-base font-normal text-center">
          Stay ahead of the curve with rewards designed to keep you competitive
          and thriving.
        </div>
      </div>
      <div className="mt-10 md:grid gap-5 grid-cols-2 mb-10">
        <div>
          <div className="bg-[#0E111BCC] p-10 rounded-[16px] space-y-10">
            <div>
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
                <div>Manage your earnings</div>
                <InformationCircleIcon
                  className="h-[15px] w-[15px] text-white cursor-pointer"
                  onClick={() =>
                    onDialogOpen(
                      `Unstake: Free up your BLUB tokens to either restake them, use them in a liquidity pool to generate yield or withdraw it to your connected wallet where you later can exchange it to other tokens or stablecoins.
                        \n
                      Stake Back: Reinvest your BLUB to continue earning rewards.`,
                      "Manage your earnings"
                    )
                  }
                />
              </div>

              <div className="flex items-center bg-[#0E111B] py-2 space-x-2 mt-2 rounded-[8px]">
                <Input
                  placeholder="0 BLUB"
                  className={clsx(
                    "block w-full rounded-lg border-none bg-[#0E111B] px-3 text-sm/6 text-white",
                    "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-[#3C404D]",
                    "w-full p-3 bg-none"
                  )}
                  value={blubStakeAmount !== null ? blubStakeAmount : ""}
                  onChange={(e) =>
                    setBlubStakeAmount(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                />
                <button
                  className="bg-[#3C404D] p-2 rounded-[4px]"
                  onClick={handleSetMaxDepositForBlub}
                >
                  Max
                </button>
              </div>

              <div className="flex items-center text-normal mt-6 space-x-1">
                <div className="font-normal text-[#B1B3B8]">
                  Staked Balance:
                </div>
                <div className="font-medium">
                  {`${
                    isNaN(Number(blubBalance))
                      ? 0
                      : Number(blubBalance).toFixed(2)
                  } BLUB`}
                </div>
              </div>

              <Button
                className="rounded-[12px] py-5 px-4 text-white mt-10 w-full bg-[linear-gradient(180deg,_#00CC99_0%,_#005F99_100%)] text-base font-semibold"
                onClick={handleRestake}
              >
                {!user?.restaking ? (
                  <span>Stake </span>
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

            <hr className="border-[1px] border-solid border-[#3C404D]" />

            <div>
              <div className="flex items-center bg-[#0E111B] py-2 space-x-2 mt-2 rounded-[8px]">
                <Input
                  placeholder="0 BLUB"
                  className={clsx(
                    "block w-full rounded-lg border-none bg-[#0E111B] px-3 text-sm/6 text-white",
                    "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-[#3C404D]",
                    "w-full p-3 bg-none"
                  )}
                  onChange={(e) =>
                    setBlubUnstakeAmount(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  value={blubUnstakeAmount !== null ? blubUnstakeAmount : ""}
                />
                <button
                  className="bg-[#3C404D] p-2 rounded-[4px]"
                  onClick={handleSetMaxDepositForUnstakeBlub}
                >
                  Max{" "}
                </button>
              </div>

              <div className="flex items-center text-normal mt-6 space-x-1">
                <div className="font-normal text-[#B1B3B8]">
                  Unstaked Balance::
                </div>
                <div className="font-medium">0 BLUB</div>
              </div>

              <Button
                className="rounded-[12px] py-5 px-4 text-white mt-10 w-full bg-[linear-gradient(180deg,_#00CC99_0%,_#005F99_100%)] text-base font-semibold"
                onClick={handleUnstakeAqua}
              >
                {!user?.unStakingAqua ? (
                  <span>Unstake</span>
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
        </div>
        <AddLiquidity />
      </div>

      <DialogC
        msg={dialogMsg}
        dialogTitle={dialogTitle}
        openDialog={openDialog}
        closeModal={closeModal}
      />
    </div>
  );
}

export default Yeild;
