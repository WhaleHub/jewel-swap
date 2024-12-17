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

function Yeild() {
  const [isBlubStakeExpanded, setIsBlubStakeExpanded] =
    useState<boolean>(false);
  const [blubStakeAmount, setBlubStakeAmount] = useState<number | null>(0);
  const dispatch = useAppDispatch();
  const [blubUnstakeAmount, setBlubUnstakeAmount] = useState<number | null>(0);

  const user = useSelector((state: RootState) => state.user);

  const whlAquaRecord = user?.userRecords?.balances?.find(
    (balance) => balance.asset_code === "WHLAQUA"
  );

  //get user aqua record
  const aquaRecord = user?.userRecords?.balances?.find(
    (balance) => balance.asset_code === "AQUA"
  );

  const userAquaBalance = aquaRecord?.balance;
  // const whlAquaBalance = whlAquaRecord?.balance;
  const blubBalance = whlAquaRecord?.balance;

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
    setBlubUnstakeAmount(Number(accountClaimableRecords));
  };

  const handleUnstakeAqua = async () => {
    if (poolAndClaimBalance < 1 || Number(blubUnstakeAmount) < 1)
      return toast.warn("Nothing to unstake");

    if (Number(blubUnstakeAmount) > poolAndClaimBalance)
      return toast.warn("Unstake amount exceeds the pool balance");

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

    const { address } = await kit.getAddress();
    dispatch(unStakingAqua(true));
    dispatch(
      unStakeAqua({
        senderPublicKey: address,
        amountToUnstake: Number(blubUnstakeAmount),
      })
    );
  };

  const handleSetRestakeMaxDeposit = () => {
    setBlubStakeAmount(Number(blubBalance));
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

    const { address } = await kit.getAddress();

    if (!address) {
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

    if (Number(blubBalance) < blubStakeAmount) {
      dispatch(lockingAqua(false));
      return toast.warn(`Your balance is low`);
    }

    dispatch(restaking(true));
    const stellarService = new StellarService();
    const senderAccount = await stellarService.loadAccount(address);

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

      transactionBuilder.addOperation(paymentOperation).setTimeout(180);

      const transaction = transactionBuilder.build();

      const transactionXDR = transaction.toXDR();

      const { signedTxXdr } = await kit.signTransaction(transactionXDR, {
        address,
        networkPassphrase: WalletNetwork.PUBLIC,
      });

      dispatch(
        restakeBlub({
          assetCode: "WHLAQUA",
          assetIssuer: blubIssuerPublicKey,
          amount: `${blubStakeAmount}`,
          signedTxXdr,
          senderPublicKey: address,
        })
      );
      dispatch(restaking(true));
    } catch (err) {
      console.log(err);
      dispatch(restaking(false));
    }
  };

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
    <div>
      <div className="max-w-[912px] mx-auto">
        <div className="text-white text-4xl-custom1 font-medium text-center">
          Make Smart Yield Decisions to Maximize Returns
        </div>
        <div className="text-[#B1B3B8] text-base font-normal text-center">
          Stay ahead of the curve with rewards designed to keep you competitive
          and thriving.
        </div>
      </div>
      <div className="mt-10 grid gap-5 grid-cols-2 mb-10">
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
                <i className="fa fa-exclamation-circle" aria-hidden="true"></i>
              </div>

              <div className="flex items-center bg-[#0E111B] px-5 py-2 space-x-2 mt-2 rounded-[8px]">
                <Input
                  placeholder="0 AQUA"
                  className={clsx(
                    "block w-full rounded-lg border-none bg-[#0E111B] px-3 text-sm/6 text-white",
                    "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-[#3C404D]",
                    "w-full p-3 bg-none"
                  )}
                  value={blubStakeAmount != null ? blubStakeAmount : ""}
                  onClick={handleSetMaxDepositForBlub}
                  onChange={(e) =>
                    setBlubStakeAmount(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                />
                <button className="bg-[#3C404D] p-2 rounded-[4px]">Max</button>
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
              <div className="flex items-center bg-[#0E111B] px-5 py-2 space-x-2 mt-2 rounded-[8px]">
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
    </div>
  );
}

export default Yeild;
