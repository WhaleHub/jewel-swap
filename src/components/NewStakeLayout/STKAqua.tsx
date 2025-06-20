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
import { walletTypes } from "../../enums";
import { signTransaction } from "@lobstrco/signer-extension-api";
import DialogC from "./Dialog";
import { WALLET_CONNECT_ID, WalletConnectAllowedMethods, WalletConnectModule } from "@creit.tech/stellar-wallets-kit/modules/walletconnect.module";
import { kit } from "../Navbar";
import { enhancedBalanceRefresh } from "../../utils/helpers";

function STKAqua() {
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user);
  const [aquaDepositAmount, setAquaDepositAmount] = useState<number | null>(0);
  const [dialogMsg, setDialogMsg] = useState<string>("");
  const [dialogTitle, setDialogTitle] = useState<string>("");
  const [openDialog, setOptDialog] = useState<boolean>(false);

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

  // Add delay-based balance refresh for better sync with backend
  const updateWalletRecordsWithDelay = async (delayMs: number = 3000) => {
    // Wait for backend to complete BLUB minting
    await new Promise(resolve => setTimeout(resolve, delayMs));
    
    try {
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
      
      // Double-check after another short delay to ensure BLUB tokens are visible
      setTimeout(async () => {
        try {
          const freshAccount = await stellarService.loadAccount(address);
          dispatch(storeAccountBalance(freshAccount.balances));
        } catch (error) {
          console.warn("Secondary balance refresh failed:", error);
        }
      }, 2000);
      
    } catch (error) {
      console.error("Error updating wallet records:", error);
      // Fallback to regular update
      updateWalletRecords();
    }
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

  const handleAddTrustline = async () => {
    const stellarService = new StellarService();

    // Load sender's Stellar account
    const senderAccount = await stellarService.loadAccount(
      user?.userWalletAddress as string
    );

    // Build transaction
    const transactionBuilder = new TransactionBuilder(senderAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.PUBLIC,
    });

    // Add trustline operation
    transactionBuilder.addOperation(
      Operation.changeTrust({
        asset: new Asset(blubAssetCode, blubIssuer),
        limit: "1000000000",
      })
    );

    // Set timeout and build transaction
    const transaction = transactionBuilder.setTimeout(3000).build();

    // Sign transaction based on wallet type
    let signedTxXdr: string = "";

    if (user?.walletName === walletTypes.LOBSTR) {
      signedTxXdr = await signTransaction(transaction.toXDR());
    } else if(user?.walletName === walletTypes.FREIGHTER) {
      const kit = new StellarWalletsKit({
        network: WalletNetwork.PUBLIC,
        selectedWalletId: FREIGHTER_ID,
        modules: [new FreighterModule()],
      });

      const { signedTxXdr: signed } = await kit.signTransaction(
        transaction.toXDR(),
        {
          address: user?.userWalletAddress || "",
          networkPassphrase: WalletNetwork.PUBLIC,
        }
      );

      signedTxXdr = signed;
    }
    else if(user?.walletName === walletTypes.WALLETCONNECT){
    

      const { signedTxXdr: signed } = await kit.signTransaction(
        transaction.toXDR(),
        {
          address: user?.userWalletAddress || "",
          networkPassphrase: WalletNetwork.PUBLIC,
        }
      );

      signedTxXdr = signed;
    }

    const HORIZON_SERVER = "https://horizon.stellar.org";
    const transactionToSubmit = TransactionBuilder.fromXDR(
      signedTxXdr,
      HORIZON_SERVER
    );

    await stellarService?.server?.submitTransaction(transactionToSubmit);
  };

  const handleLockAqua = async () => {
    if (!user?.userWalletAddress) {
      dispatch(lockingAqua(false));
      return toast.warn("Please connect wallet.");
    }

    if (!userAquaBalance) {
      dispatch(lockingAqua(false));
      return toast.warn("Balance is low");
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

    const stellarService = new StellarService();

    // toast.warn("Gloading account");
    const senderAccount = await stellarService.loadAccount(
      user?.userWalletAddress
    );
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

      let signedTxXdr: string = "";

      if (user?.walletName === walletTypes.LOBSTR) {
        signedTxXdr = await signTransaction(transactionXDR);
      } 

      else if(user?.walletName === walletTypes.WALLETCONNECT){
      
   
         const { signedTxXdr: signed } = await kit.signTransaction(
           transaction.toXDR(),
           {
             address: user?.userWalletAddress || "",
             networkPassphrase: WalletNetwork.PUBLIC,
           }
         );
   
         signedTxXdr = signed;
       }
      
      
      else {
        const kit: StellarWalletsKit = new StellarWalletsKit({
          network: WalletNetwork.PUBLIC,
          selectedWalletId: FREIGHTER_ID,
          modules: [new FreighterModule()],
        });

        const { signedTxXdr: signed } = await kit.signTransaction(
          transactionXDR,
          {
            address: user?.userWalletAddress,
            networkPassphrase: WalletNetwork.PUBLIC,
          }
        );

        signedTxXdr = signed;
      }

      dispatch(
        mint({
          assetCode: aquaAssetCode,
          assetIssuer: aquaAssetIssuer,
          amount: stakeAmount,
          signedTxXdr,
          senderPublicKey: user?.userWalletAddress,
        })
      );

      dispatch(lockingAqua(true));
      toast.success("Transaction sent!");
    } catch (err) {
      console.error("Transaction failed:", err);
      dispatch(lockingAqua(false));
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
    if (user?.lockedAqua && user?.userWalletAddress) {
      // Use the enhanced balance refresh utility for better reliability
      enhancedBalanceRefresh(user.userWalletAddress, dispatch, 1000, 4000);
      toast.success("Aqua locked successfully!");
      setAquaDepositAmount(0);
      dispatch(lockingAqua(false));
      dispatch(resetStateValues());
    }
  }, [user?.lockedAqua]);

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

                {/* <div className="absolute bottom-full mb-2 hidden w-48 rounded bg-black text-white text-xs p-2 opacity-0 group-hover:opacity-100 group-hover:block">
                  Mint BLUB token by locking AQUA token and receive the share of
                  AQUA governance and yield farming rewards. BLUB is
                  automatically staked with an option to unstake and add
                  liquidity in the AQUA-BLUB pool.
                </div> */}
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
        closeModal={closeModal}
      />
    </div>
  );
}

export default STKAqua;
