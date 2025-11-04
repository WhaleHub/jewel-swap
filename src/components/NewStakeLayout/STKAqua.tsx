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
// Import new Soroban functionality
import {
  clearError,
  clearTransaction,
  fetchComprehensiveStakingData,
  optimisticStakeUpdate,
} from "../../lib/slices/stakingSlice";
import {
  issueIceTokens,
  fetchUserGovernance,
  syncGovernanceData,
} from "../../lib/slices/governanceSlice";
import { sorobanService } from "../../services/soroban.service";
import { apiService } from "../../services/api.service";
import { SOROBAN_CONFIG, isFeatureEnabled } from "../../config/soroban.config";
import {
  Asset,
  BASE_FEE,
  Networks,
  Operation,
  TransactionBuilder,
  Keypair,
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
import {
  WALLET_CONNECT_ID,
  WalletConnectAllowedMethods,
  WalletConnectModule,
} from "@creit.tech/stellar-wallets-kit/modules/walletconnect.module";
import { kit } from "../Navbar";
import { enhancedBalanceRefresh } from "../../utils/helpers";

function STKAqua() {
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user);
  const staking = useSelector((state: RootState) => state.staking);
  const governance = useSelector((state: RootState) => state.governance);

  const [aquaDepositAmount, setAquaDepositAmount] = useState<number | null>(0);
  const [dialogMsg, setDialogMsg] = useState<string>("");
  const [dialogTitle, setDialogTitle] = useState<string>("");
  const [openDialog, setOptDialog] = useState<boolean>(false);
  const [useSoroban, setUseSoroban] = useState<boolean>(
    isFeatureEnabled("useSoroban")
  );

  // BLUB token balance state
  const [blubBalance, setBlubBalance] = useState<string>("0.00");
  const [blubBalanceLoading, setBlubBalanceLoading] = useState<boolean>(false);

  // Contract balance state
  const [contractBalance, setContractBalance] = useState<string>("0.00");
  const [balanceLoading, setBalanceLoading] = useState<boolean>(false);

  //get user aqua record
  const aquaRecord = user?.userRecords?.balances?.find(
    (balance) =>
      balance.asset_code === "AQUA" && balance.asset_issuer === aquaAssetIssuer
  );

  const userAquaBalance = aquaRecord?.balance;

  // Debug logging for balance display
  console.log("💎 [STKAqua] Balance state debug:", {
    userConnected: !!user,
    walletName: user?.walletName,
    userWalletAddress: user?.userWalletAddress,
    totalBalances: user?.userRecords?.balances?.length || 0,
    allBalances: user?.userRecords?.balances?.map((b: any) => ({
      asset_code: b.asset_code || "XLM",
      balance: b.balance,
    })),
    aquaRecord: aquaRecord,
    userAquaBalance: userAquaBalance,
    timestamp: new Date().toISOString(),
  });

  const updateWalletRecords = async () => {
    const selectedModule =
      user?.walletName === LOBSTR_ID
        ? new LobstrModule()
        : new FreighterModule();

    const kit: StellarWalletsKit = new StellarWalletsKit({
      network: WalletNetwork.TESTNET,
      selectedWalletId: FREIGHTER_ID,
      modules: [selectedModule],
    });

    const { address } = await kit.getAddress();
    const stellarService = new StellarService();
    const wrappedAccount = await stellarService.loadAccount(address);

    dispatch(getAccountInfo(address));
    dispatch(storeAccountBalance(wrappedAccount.balances));
  };

  // Soroban staking functionality
  const handleSorobanStake = async () => {
    if (!user.userWalletAddress || !aquaDepositAmount) {
      toast.error("Please connect wallet and enter amount");
      return;
    }

    if (aquaDepositAmount < MIN_DEPOSIT_AMOUNT) {
      toast.error(`Minimum deposit amount is ${MIN_DEPOSIT_AMOUNT} AQUA`);
      return;
    }

    try {
      console.log("[STKAqua] Starting Soroban contract staking:", {
        userAddress: user.userWalletAddress,
        amount: aquaDepositAmount,
      });
      // Use the soroban service
      const { sorobanService } = await import("../../services/soroban.service");
      const { SOROBAN_CONFIG } = await import("../../config/soroban.config");
      const soroban = sorobanService;

      // Build Soroban contract invocation transaction
      // stake() function: user, amount, duration_periods (minimal value for time-based rewards)
      const amountInStroops = Math.floor(
        aquaDepositAmount * 10000000
      ).toString(); // Convert to 7 decimal places
      const aquaTokenContract = SOROBAN_CONFIG.assets.aqua.sorobanContract;
      const durationPeriods = 1; // Minimal value - actual rewards calculated by elapsed time

      console.log("[STKAqua] Building stake transaction with args:", {
        userAddress: user.userWalletAddress,
        aquaTokenContract,
        amountInStroops,
        durationPeriods,
      });

      // Pass raw values - the sorobanService will convert them properly to ScVal
      const { transaction } = await soroban.buildContractTransaction(
        "staking",
        "stake", // Function that transfers tokens and records stake
        [
          user.userWalletAddress, // String address - will be converted to Address ScVal
          amountInStroops, // String amount - will be converted to i128 ScVal
          durationPeriods, // Number duration - will be converted to u64 ScVal
        ],
        user.userWalletAddress
      );

      console.log(
        "[STKAqua] Contract transaction built, requesting signature..."
      );

      // Sign transaction with user's wallet
      const selectedModule =
        user.walletName === LOBSTR_ID
          ? new LobstrModule()
          : new FreighterModule();
      const kit = new StellarWalletsKit({
        network: WalletNetwork.TESTNET,
        selectedWalletId: user.walletName || FREIGHTER_ID,
        modules: [selectedModule],
      });

      const { signedTxXdr } = await kit.signTransaction(transaction.toXDR(), {
        address: user.userWalletAddress,
        networkPassphrase: WalletNetwork.TESTNET,
      });

      console.log("[STKAqua] Transaction signed, submitting to Soroban...");

      // Submit the signed Soroban contract transaction
      const result = await soroban.submitSignedTransaction(signedTxXdr);

      if (!result.success) {
        throw new Error(result.error || "Transaction failed");
      }

      console.log(
        "[STKAqua] Soroban contract invocation successful:",
        result.transactionHash
      );

      // Show success message
      toast.success(
        `Successfully staked ${aquaDepositAmount} AQUA via Soroban smart contract!`
      );
      setDialogTitle("Staking Successful!");
      setDialogMsg(
        `Transaction Hash: ${result.transactionHash}\n\nYour AQUA has been staked. Rewards increase the longer you keep it staked. You can unstake at any time.`
      );
      setOptDialog(true);

      // **OPTIMISTIC UPDATE** - Immediately update UI with expected values
      console.log(
        "[STKAqua] Applying optimistic update for immediate UI feedback..."
      );
      dispatch(optimisticStakeUpdate({ amount: aquaDepositAmount.toFixed(7) }));

      // Reset form
      setAquaDepositAmount(0);

      // Refresh data in the background (non-blocking) to confirm the update
      console.log("[STKAqua] Refreshing on-chain data in background...");
      Promise.all([
        dispatch(fetchComprehensiveStakingData(user.userWalletAddress)),
        dispatch(getAccountInfo(user.userWalletAddress)),
        fetchBlubBalance(),
        fetchContractBalance(),
      ])
        .then(() => {
          console.log("[STKAqua] Background refresh completed!");
          // Update wallet records with delay for backend sync
          updateWalletRecordsWithDelay(2000);
        })
        .catch((error) => {
          console.error("[STKAqua] Background refresh failed:", error);
          // Even if background refresh fails, the optimistic update already happened
        });
    } catch (error: any) {
      console.error("❌ [STKAqua] Soroban staking failed:", error);
      toast.error(`Staking failed: ${error.message}`);
      setDialogTitle("Staking Failed");
      setDialogMsg(
        `Error: ${error.message}\n\nPlease try again or contact support.`
      );
      setOptDialog(true);
    }
  };

  // Load user staking data on component mount
  useEffect(() => {
    if (user.userWalletAddress && useSoroban) {
      console.log(
        "🔄 [STKAqua] Fetching data for user:",
        user.userWalletAddress
      );
      console.log(
        "📋 [STKAqua] Using Staking Contract:",
        SOROBAN_CONFIG.contracts.staking
      );
      console.log(
        "🟦 [STKAqua] Using BLUB Token:",
        SOROBAN_CONFIG.assets.blub.sorobanContract
      );

      // Initial data fetch
      const fetchAllData = async () => {
        if (!user.userWalletAddress) return;
        await dispatch(fetchComprehensiveStakingData(user.userWalletAddress));
        await dispatch(fetchUserGovernance(user.userWalletAddress));
        await fetchContractBalance();
        await fetchBlubBalance();
      };

      fetchAllData();

      // Set up auto-refresh every 30 seconds for real-time updates
      const refreshInterval = setInterval(() => {
        console.log("🔄 [STKAqua] Auto-refreshing on-chain data...");
        fetchAllData();
      }, 30000);

      // Cleanup interval on unmount
      return () => clearInterval(refreshInterval);
    }
  }, [user.userWalletAddress, useSoroban, dispatch]);

  // Function to fetch BLUB balance from contract
  const fetchBlubBalance = async () => {
    if (!user.userWalletAddress) return;

    setBlubBalanceLoading(true);
    try {
      const { sorobanService } = await import("../../services/soroban.service");
      const { SOROBAN_CONFIG } = await import("../../config/soroban.config");

      const blubTokenContract = SOROBAN_CONFIG.assets.blub.sorobanContract;

      console.log("🟦 [STKAqua] Fetching BLUB balance from token contract...");
      console.log("BLUB Token Contract:", blubTokenContract);
      console.log("User Address:", user.userWalletAddress);

      const server = sorobanService.getServer();
      const { Contract, Address } = await import("@stellar/stellar-sdk");

      // Create BLUB token contract instance
      const blubContract = new Contract(blubTokenContract);

      // Build a simulation transaction to read balance
      const account = await server.getAccount(user.userWalletAddress);
      const { TransactionBuilder, Networks, Operation, xdr } = await import(
        "@stellar/stellar-sdk"
      );

      const tx = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          blubContract.call(
            "balance",
            ...[Address.fromString(user.userWalletAddress).toScVal()]
          )
        )
        .setTimeout(30)
        .build();

      // Simulate to get the result
      const simulation: any = await server.simulateTransaction(tx);

      if (simulation && "result" in simulation && simulation.result) {
        try {
          const { scValToNative } = await import("@stellar/stellar-sdk");
          const balance = scValToNative(simulation.result.retval);

          // Handle both string and bigint
          const balanceValue =
            typeof balance === "bigint" ? balance : BigInt(balance || 0);
          const blubAmount = Number(balanceValue) / 10000000; // Convert from stroops to BLUB

          console.log("🟦 [STKAqua] BLUB balance fetched:", blubAmount, "BLUB");
          setBlubBalance(blubAmount.toFixed(2));
        } catch (conversionError) {
          console.error(
            "🟦 [STKAqua] Error converting BLUB balance:",
            conversionError
          );
          setBlubBalance("0.00");
        }
      } else {
        console.warn("🟦 [STKAqua] No BLUB balance result", simulation);
        setBlubBalance("0.00");
      }
    } catch (error: any) {
      console.error("🟦 [STKAqua] Error fetching BLUB balance:", error);
      setBlubBalance("0.00");
    } finally {
      setBlubBalanceLoading(false);
    }
  };

  // Function to fetch AQUA balance from contract directly
  const fetchContractBalance = async () => {
    if (!user.userWalletAddress) return;

    setBalanceLoading(true);
    try {
      const { sorobanService } = await import("../../services/soroban.service");
      const { SOROBAN_CONFIG } = await import("../../config/soroban.config");

      const stakingContractId = SOROBAN_CONFIG.contracts.staking;
      const aquaTokenContract = SOROBAN_CONFIG.assets.aqua.sorobanContract;

      console.log(
        "💰 [STKAqua] Fetching AQUA balance from staking contract..."
      );
      console.log("Staking Contract:", stakingContractId);
      console.log("AQUA Token:", aquaTokenContract);

      // Read the AQUA token balance of the staking contract
      const server = sorobanService.getServer();
      const { Contract, Address } = await import("@stellar/stellar-sdk");

      // Create AQUA token contract instance
      const aquaContract = new Contract(aquaTokenContract);

      // Build a simulation transaction to read balance
      const account = await server.getAccount(user.userWalletAddress);
      const { TransactionBuilder, Networks } = await import(
        "@stellar/stellar-sdk"
      );

      // Call balance method on AQUA token contract for staking contract
      const operation = aquaContract.call(
        "balance",
        Address.fromString(stakingContractId).toScVal()
      );

      const tx = new TransactionBuilder(account, {
        fee: "100000",
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const simResult = await server.simulateTransaction(tx);

      if ("result" in simResult && simResult.result?.retval) {
        const { scValToNative } = await import("@stellar/stellar-sdk");
        const balance = scValToNative(simResult.result.retval);
        const aquaBalance = (BigInt(balance) / BigInt(10000000)).toString();

        console.log("✅ [STKAqua] Contract AQUA balance:", aquaBalance, "AQUA");
        setContractBalance(aquaBalance);
      }
    } catch (error) {
      console.error("❌ [STKAqua] Failed to fetch contract balance:", error);
    } finally {
      setBalanceLoading(false);
    }
  };

  // Debug log for staking state
  useEffect(() => {
    if (staking.userLocks && staking.userLocks.length > 0) {
      const totalAmount = staking.userLocks
        .filter((lock: any) => lock.isActive !== false)
        .reduce((total: number, lock: any) => {
          const amount = parseFloat(lock.amount) || 0;
          // Backend might return either stroops (>1000000) or AQUA (<1000)
          const aquaAmount = amount > 1000 ? amount / 10000000 : amount;
          return total + aquaAmount;
        }, 0);

      console.log("📊 [STKAqua] User locks received:", {
        count: staking.userLocks.length,
        locks: staking.userLocks.map((lock: any) => ({
          amount: lock.amount,
          isStroops: parseFloat(lock.amount) > 1000,
          aquaValue:
            parseFloat(lock.amount) > 1000
              ? parseFloat(lock.amount) / 10000000
              : parseFloat(lock.amount),
        })),
        totalAmount: totalAmount.toFixed(2),
      });
    }
  }, [staking.userLocks]);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
      dispatch(clearTransaction());
    };
  }, [dispatch]);

  // Add delay-based balance refresh for better sync with backend
  const updateWalletRecordsWithDelay = async (delayMs: number = 3000) => {
    // Wait for backend to complete BLUB minting
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    try {
      const selectedModule =
        user?.walletName === LOBSTR_ID
          ? new LobstrModule()
          : new FreighterModule();

      const kit: StellarWalletsKit = new StellarWalletsKit({
        network: WalletNetwork.TESTNET,
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
      networkPassphrase: Networks.TESTNET,
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
    } else if (user?.walletName === walletTypes.FREIGHTER) {
      const kit = new StellarWalletsKit({
        network: WalletNetwork.TESTNET,
        selectedWalletId: FREIGHTER_ID,
        modules: [new FreighterModule()],
      });

      const { signedTxXdr: signed } = await kit.signTransaction(
        transaction.toXDR(),
        {
          address: user?.userWalletAddress || "",
          networkPassphrase: WalletNetwork.TESTNET,
        }
      );

      signedTxXdr = signed;
    } else if (user?.walletName === walletTypes.WALLETCONNECT) {
      const { signedTxXdr: signed } = await kit.signTransaction(
        transaction.toXDR(),
        {
          address: user?.userWalletAddress || "",
          networkPassphrase: WalletNetwork.TESTNET,
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
        networkPassphrase: Networks.TESTNET,
      });

      transactionBuilder.addOperation(paymentOperation).setTimeout(180);

      const transaction = transactionBuilder.build();
      const transactionXDR = transaction.toXDR();

      let signedTxXdr: string = "";

      if (user?.walletName === walletTypes.LOBSTR) {
        signedTxXdr = await signTransaction(transactionXDR);
      } else if (user?.walletName === walletTypes.WALLETCONNECT) {
        const { signedTxXdr: signed } = await kit.signTransaction(
          transaction.toXDR(),
          {
            address: user?.userWalletAddress || "",
            networkPassphrase: WalletNetwork.TESTNET,
          }
        );

        signedTxXdr = signed;
      } else {
        const kit: StellarWalletsKit = new StellarWalletsKit({
          network: WalletNetwork.TESTNET,
          selectedWalletId: FREIGHTER_ID,
          modules: [new FreighterModule()],
        });

        const { signedTxXdr: signed } = await kit.signTransaction(
          transactionXDR,
          {
            address: user?.userWalletAddress,
            networkPassphrase: WalletNetwork.TESTNET,
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

            <div className="flex items-center bg-[#0E111B] py-2 space-x-2 mt-2 rounded-[8px]">
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

            {/* Time-based rewards info */}
            {useSoroban && (
              <div className="mt-4 p-3 bg-[#1A1E2E] rounded-[8px]">
                <div className="flex items-center space-x-2 mb-1">
                  <InformationCircleIcon className="h-[15px] w-[15px] text-[#00CC99]" />
                  <div className="text-sm font-medium text-white">
                    Time-Based Rewards
                  </div>
                </div>
                <div className="text-xs text-[#B1B3B8]">
                  Your rewards increase the longer you keep your AQUA staked.
                  Unstake anytime without penalty.
                </div>
              </div>
            )}

            {/* Soroban/Legacy Toggle */}
            <div className="mt-4 flex items-center justify-between p-3 bg-[#1A1E2E] rounded-[8px]">
              <div className="flex items-center space-x-2">
                <div className="text-sm font-medium text-white">
                  {useSoroban ? "Soroban Staking" : "Legacy Staking"}
                </div>
                <div className="relative group">
                  <InformationCircleIcon
                    className="h-[15px] w-[15px] text-white cursor-pointer"
                    onClick={() =>
                      onDialogOpen(
                        useSoroban
                          ? "Soroban staking provides time-based rewards - the longer you stake, the more you earn. You can unstake anytime. Includes ICE governance tokens and Protocol Owned Liquidity contribution."
                          : "Legacy staking uses the original BLUB conversion system without time-based rewards or governance features.",
                        useSoroban ? "Soroban Staking" : "Legacy Staking"
                      )
                    }
                  />
                </div>
              </div>
              <button
                className={clsx(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  useSoroban ? "bg-[#00CC99]" : "bg-[#3C404D]"
                )}
                onClick={() => setUseSoroban(!useSoroban)}
              >
                <span
                  className={clsx(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    useSoroban ? "translate-x-6" : "translate-x-1"
                  )}
                />
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
              className="rounded-[12px] py-5 px-4 text-white mt-10 w-full bg-[linear-gradient(180deg,_#00CC99_0%,_#005F99_100%)] text-base font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={useSoroban ? handleSorobanStake : handleLockAqua}
              disabled={useSoroban ? staking.isStaking : user?.lockingAqua}
            >
              {useSoroban
                ? staking.isStaking
                  ? "Staking..."
                  : "Stake AQUA"
                : user?.lockingAqua
                ? "Converting..."
                : "Convert & Stake"}
            </Button>

            {/* Loading indicator for Soroban operations */}
            {useSoroban && staking.isStaking && (
              <div className="flex items-center justify-center mt-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00CC99]"></div>
                <span className="ml-2 text-sm text-[#B1B3B8]">
                  Processing transaction...
                </span>
              </div>
            )}

            {/* Display current staking stats for Soroban */}
            {useSoroban && user.userWalletAddress && (
              <div className="mt-4 p-3 bg-[#1A1E2E] rounded-[8px]">
                <div className="text-sm font-medium text-white mb-2 flex items-center justify-between">
                  <div>
                    Your Staking Stats
                    {staking.isLoading && (
                      <span className="ml-2 text-xs text-[#00CC99]">
                        (Loading on-chain data...)
                      </span>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      if (!user.userWalletAddress) return;
                      console.log("🔄 [STKAqua] Manual refresh triggered");
                      await dispatch(
                        fetchComprehensiveStakingData(user.userWalletAddress)
                      );
                      await fetchBlubBalance();
                      await fetchContractBalance();
                    }}
                    className="text-[#00CC99] hover:text-[#00AA77] text-lg"
                    title="Refresh on-chain data"
                  >
                    ⟳
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-[#B1B3B8] flex items-center">
                      <span>Staked BLUB</span>
                      <span className="ml-1 text-[10px] text-[#00CC99]">
                        🔒 Staked
                      </span>
                    </div>
                    <div className="text-white font-medium text-base">
                      {staking.isLoading ? (
                        <span className="text-[#B1B3B8]">Loading...</span>
                      ) : (
                        <span className="text-[#00CC99]">
                          {staking.userStats?.activeAmount
                            ? parseFloat(
                                staking.userStats.activeAmount
                              ).toFixed(2)
                            : "0.00"}{" "}
                          BLUB
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#B1B3B8] mt-1">
                      ⚡ Unstakeable anytime
                    </div>
                  </div>
                  <div>
                    <div className="text-[#B1B3B8] flex items-center">
                      <span>BLUB Balance</span>
                      <span className="ml-1 text-[10px] text-[#4169E1]">
                        💎 Wallet
                      </span>
                    </div>
                    <div className="text-white font-medium text-base">
                      {blubBalanceLoading ? (
                        <span className="text-[#B1B3B8]">Loading...</span>
                      ) : (
                        <span className="text-[#4169E1]">
                          {blubBalance} BLUB
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#B1B3B8] flex items-center">
                      <span>Unstakeable BLUB</span>
                      <span className="ml-1 text-[10px] text-[#FFA500]">
                        🔓 Ready
                      </span>
                    </div>
                    <div className="text-white font-medium">
                      {staking.isLoading
                        ? "..."
                        : staking.userStats?.activeAmount
                        ? (
                            parseFloat(staking.userStats.activeAmount || "0") +
                            parseFloat(
                              staking.userStats.unstakingAvailable || "0"
                            )
                          ).toFixed(2)
                        : "0.00"}{" "}
                      BLUB
                    </div>
                  </div>
                  <div>
                    <div className="text-[#B1B3B8] flex items-center">
                      <span>Pending Rewards</span>
                      <span className="ml-1 text-[10px] text-[#FFD700]">
                        🎁 Earned
                      </span>
                    </div>
                    <div className="text-white font-medium">
                      {staking.isLoading ? "..." : "0.00"} BLUB
                    </div>
                  </div>
                  <div>
                    <div className="text-[#B1B3B8]">ICE Balance</div>
                    <div className="text-white font-medium">
                      {governance.iceBalance
                        ? parseFloat(governance.iceBalance).toFixed(2)
                        : "0.00"}{" "}
                      ICE
                    </div>
                  </div>
                  <div>
                    <div className="text-[#B1B3B8]">Voting Power</div>
                    <div className="text-white font-medium">
                      {governance.votingPower
                        ? parseFloat(governance.votingPower).toFixed(2)
                        : "0.00"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#B1B3B8] flex items-center">
                      <span>POL Contribution</span>
                      <span className="ml-1 text-[10px]">💧</span>
                    </div>
                    <div className="text-white font-medium">
                      {staking.polInfo?.totalAqua
                        ? parseFloat(staking.polInfo.totalAqua).toFixed(2)
                        : "0.00"}{" "}
                      AQUA
                    </div>
                  </div>
                </div>
              </div>
            )}
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
