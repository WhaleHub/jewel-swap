import clsx from "clsx";
import { Button, Input } from "@headlessui/react";
import { useEffect, useState, useMemo } from "react";
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
  restaking,
  storeAccountBalance,
  unStakingAqua,
} from "../../lib/slices/userSlice";
// Note: Backend API calls (lockAqua, unlockAqua, restakeBlub) are deprecated for Soroban
// We now query data directly from smart contracts using fetchComprehensiveStakingData
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
import { kit } from "../Navbar";

function Yield() {
  const dispatch = useAppDispatch();
  const [blubStakeAmount, setBlubStakeAmount] = useState<number | null>(0);
  const [blubUnstakeAmount, setBlubUnstakeAmount] = useState<number | null>(0);
  const [dialogMsg, setDialogMsg] = useState<string>("");
  const [openDialog, setOptDialog] = useState<boolean>(false);
  const [dialogTitle, setDialogTitle] = useState<string>("");

  // Soroban BLUB balance state
  const [sorobanBlubBalance, setSorobanBlubBalance] = useState<string>("0.00");
  const [blubStakedBalance, setBlubStakedBalance] = useState<string>("0.00");
  const [lpPositionData, setLpPositionData] = useState<any>(null);
  const [polData, setPolData] = useState<any>(null);
  const [blubBalanceLoading, setBlubBalanceLoading] = useState<boolean>(false);

  const user = useSelector((state: RootState) => state.user);
  const staking = useSelector((state: RootState) => state.staking);

  const blubRecord = user?.userRecords?.balances?.find(
    (balance) => balance.asset_code === "BLUB"
  );

  // //get user aqua record
  // const aquaRecord = user?.userRecords?.balances?.find(
  //   (balance) => balance.asset_code === "AQUA"
  // );

  // Add defensive programming for claimable balance calculation
  const claimableBalance = useMemo(() => {
    try {
      if (!user?.userRecords?.account?.claimableRecords) {
        console.warn("💎 [Yield] No claimable records found, returning 0");
        return 0;
      }

      const filtered = user.userRecords.account.claimableRecords.filter(
        (item: any) => item && item.claimed === "UNCLAIMED"
      );

      if (filtered.length === 0) {
        console.log("💎 [Yield] No unclaimed records found");
        return 0;
      }

      const total = filtered.reduce((total: any, item: any) => {
        const amount = parseFloat(item.amount) || 0;
        return total + amount;
      }, 0);

      return total;
    } catch (error) {
      console.error("💎 [Yield] Error calculating claimable balance:", error);
      return 0;
    }
  }, [user?.userRecords?.account?.claimableRecords]);

  // Use Soroban BLUB balance instead of Horizon API balance
  const blubBalance = sorobanBlubBalance;

  // Debug logging for balance display
  console.log("💎 [Yield] Balance state debug:", {
    userConnected: !!user,
    walletName: user?.walletName,
    userWalletAddress: user?.userWalletAddress,
    totalBalances: user?.userRecords?.balances?.length || 0,
    allBalances: user?.userRecords?.balances?.map((b: any) => ({
      asset_code: b.asset_code || "XLM",
      balance: b.balance,
    })),
    blubRecord: blubRecord,
    blubBalance: blubBalance,
    claimableBalance: claimableBalance,
    claimableRecordsCount:
      user?.userRecords?.account?.claimableRecords?.length || 0,
    timestamp: new Date().toISOString(),
  });

  // Calculate accountClaimableRecords with defensive programming
  const accountClaimableRecords = useMemo(() => {
    try {
      if (!user?.userRecords?.account?.claimableRecords) {
        console.warn(
          "💎 [Yield] No claimable records found for accountClaimableRecords"
        );
        return 0;
      }

      const result = user.userRecords.account.claimableRecords
        .filter((record: any) => record && record.claimed === "UNCLAIMED")
        .reduce((total, record: any) => {
          const amount = Number(record.amount) || 0;
          return Number(total) + amount;
        }, 0);

      return result || 0;
    } catch (error) {
      console.error(
        "💎 [Yield] Error calculating accountClaimableRecords:",
        error
      );
      return 0;
    }
  }, [user?.userRecords?.account?.claimableRecords]);

  const userPoolBalances = useMemo(() => {
    try {
      if (!user?.userRecords?.account?.pools) {
        console.warn("💎 [Yield] No pools found for userPoolBalances");
        return 0;
      }

      const result = user.userRecords.account.pools
        .filter((pool: any) => pool && pool.claimed === "UNCLAIMED")
        .filter((pool: any) => pool.depositType === "LOCKER")
        .filter((pool: any) => pool.assetB && pool.assetB.code === "AQUA")
        .reduce((total, record: any) => {
          const amount = Number(record.assetBAmount) || 0;
          return Number(total) + amount;
        }, 0);

      return result || 0;
    } catch (error) {
      console.error("💎 [Yield] Error calculating userPoolBalances:", error);
      return 0;
    }
  }, [user?.userRecords?.account?.pools]);

  // Add the two calculated values
  // Calculate unstakable BLUB from Soroban staking info
  // NOTE: total_staked_blub is immediately unstakeable (no time lock in contract)
  // unstaking_available is for already-unlocked entries (partial unstakes)
  const poolAndClaimBalance = useMemo(() => {
    const totalStaked = staking.userStats?.activeAmount || "0";
    const unstakingAvailable = staking.userStats?.unstakingAvailable || "0";
    // Sum both: actively staked (immediately unstakeable) + already unlocked entries
    return Math.max(
      0,
      parseFloat(totalStaked) + parseFloat(unstakingAvailable)
    );
  }, [staking.userStats?.activeAmount, staking.userStats?.unstakingAvailable]);

  // Fetch BLUB balance from Soroban contract
  const fetchSorobanBlubBalance = async () => {
    if (!user.userWalletAddress) return;

    setBlubBalanceLoading(true);
    try {
      const { sorobanService } = await import("../../services/soroban.service");
      const { fetchComprehensiveStakingData } = await import(
        "../../lib/slices/stakingSlice"
      );

      console.log(
        "🟦 [Yield] Fetching BLUB data DIRECTLY from staking contract..."
      );
      console.log("User Address:", user.userWalletAddress);

      // Fetch comprehensive staking data to update Redux state (includes unstaking_available)
      await dispatch(fetchComprehensiveStakingData(user.userWalletAddress));

      // Fetch comprehensive user staking info (replaces deprecated queryAllBlubRestakes)
      const stakingInfo = await sorobanService.queryUserStakingInfo(
        user.userWalletAddress
      );

      // Fetch BLUB balance (wallet balance - unstaked)
      const balance = await sorobanService.queryBlubBalance(
        user.userWalletAddress
      );

      // Fetch LP position
      const poolId = "AQUA-BLUB"; // Default pool ID
      const lpPosition = await sorobanService
        .queryUserLpPosition(user.userWalletAddress, poolId)
        .catch(() => null);

      // Fetch POL info
      const polInfo = await sorobanService.queryPolInfo();

      console.log("🟦 [Yield] Complete BLUB data fetched:", {
        walletBalance: balance,
        stakingInfo,
        lpPosition,
        polInfo,
      });

      // Set wallet balance (unstaked BLUB)
      const blubBalanceNumber = parseFloat(balance);
      console.log(
        "🟦 [Yield] Setting BLUB wallet balance:",
        blubBalanceNumber,
        "BLUB"
      );

      // If balance is 0, check if there's a balance from Horizon API as fallback
      if (blubBalanceNumber === 0 && blubRecord?.balance) {
        const horizonBalance = parseFloat(blubRecord.balance);
        console.log(
          "🟦 [Yield] Using Horizon API BLUB balance as fallback:",
          horizonBalance,
          "BLUB"
        );
        setSorobanBlubBalance(horizonBalance.toFixed(2));
      } else {
        setSorobanBlubBalance(blubBalanceNumber.toFixed(2));
      }

      // Set staked BLUB amount from the comprehensive staking info
      // Include BOTH locked positions AND unlockable positions (expired but not yet unstaked)
      if (stakingInfo) {
        const totalStaked =
          parseFloat(stakingInfo.total_staked_blub || "0") +
          parseFloat(stakingInfo.unstaking_available || "0");
        setBlubStakedBalance(totalStaked.toFixed(2));
      } else {
        setBlubStakedBalance("0.00");
      }

      // Set LP position data
      setLpPositionData(lpPosition);

      // Set POL data
      setPolData(polInfo);
    } catch (error: any) {
      console.error("🟦 [Yield] Error fetching BLUB data:", error);

      // Fallback to Horizon API balance if Soroban query fails
      if (blubRecord?.balance) {
        const horizonBalance = parseFloat(blubRecord.balance);
        console.log(
          "🟦 [Yield] Using Horizon API BLUB balance (error fallback):",
          horizonBalance,
          "BLUB"
        );
        setSorobanBlubBalance(horizonBalance.toFixed(2));
      } else {
        setSorobanBlubBalance("0.00");
      }

      setBlubStakedBalance("0.00");
    } finally {
      setBlubBalanceLoading(false);
    }
  };

  const handleSetMaxStakeBlub = () => {
    // const depositAmount =
    //   typeof blubBalance === "number" &&
    //   !isNaN(blubBalance)
    //     ? Number(blubBalance)
    //     : 0;

    setBlubStakeAmount(Number(blubBalance));
  };

  const handleSetMaxDepositForUnstakeBlub = () => {
    // Use unstakingAvailable from Soroban staking info (expired but not yet unstaked)
    const unstakingAvailable = staking.userStats?.unstakingAvailable || "0";
    const depositAmount = Math.max(0, parseFloat(unstakingAvailable));
    setBlubUnstakeAmount(depositAmount);
  };

  const handleUnstakeAqua = async () => {
    if (poolAndClaimBalance < 1 || Number(blubUnstakeAmount) < 1)
      return toast.warn("Nothing to unstake");

    if (Number(blubUnstakeAmount) > poolAndClaimBalance)
      return toast.warn("Unstake amount exceeds the pool balance");

    if (!user.userWalletAddress) {
      return toast.error("Please connect your wallet");
    }

    // Set loading state
    dispatch(unStakingAqua(true));

    try {
      console.log("[Yield] Starting Soroban unstaking:", {
        userAddress: user.userWalletAddress,
        amount: blubUnstakeAmount,
        unstakingAvailable: poolAndClaimBalance,
      });

      // Import Soroban service
      const { sorobanService } = await import("../../services/soroban.service");
      const soroban = sorobanService;

      // Convert amount to stroops (7 decimals)
      const amountInStroops = Math.floor(
        Number(blubUnstakeAmount) * 10000000
      ).toString();

      console.log("[Yield] Building unstake transaction with args:", {
        userAddress: user.userWalletAddress,
        amountInStroops,
      });

      // Import Stellar SDK for proper type conversions
      const { Address, nativeToScVal } = await import("@stellar/stellar-sdk");

      // Build Soroban contract invocation transaction
      // unstake(user: Address, amount: i128)
      const { transaction } = await soroban.buildContractTransaction(
        "staking",
        "unstake",
        [
          Address.fromString(user.userWalletAddress), // Address type
          nativeToScVal(BigInt(amountInStroops), { type: "i128" }), // i128 type for amount
        ],
        user.userWalletAddress
      );

      console.log(
        "[Yield] Contract transaction built, requesting signature..."
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

      let signedTxXdr: string = "";
      if (user?.walletName === walletTypes.LOBSTR) {
        signedTxXdr = await signTransaction(transaction.toXDR());
      } else {
        const { signedTxXdr: signed } = await kit.signTransaction(
          transaction.toXDR(),
          {
            address: user.userWalletAddress,
            networkPassphrase: WalletNetwork.TESTNET,
          }
        );
        signedTxXdr = signed;
      }

      console.log("[Yield] Transaction signed, submitting to Soroban...");

      // Submit the signed Soroban contract transaction
      const result = await soroban.submitSignedTransaction(signedTxXdr);

      if (!result.success) {
        throw new Error(result.error || "Unstaking transaction failed");
      }

      console.log(
        "[Yield] Soroban unstaking successful:",
        result.transactionHash
      );

      // Show success message
      toast.success(`Successfully unstaked ${blubUnstakeAmount} BLUB!`);
      setDialogTitle("Unstaking Successful!");
      setDialogMsg(
        `Transaction Hash: ${result.transactionHash}\n\nYour BLUB has been unstaked and transferred to your wallet.`
      );
      setOptDialog(true);

      // Reset form
      setBlubUnstakeAmount(0);

      // Add a small delay to ensure blockchain state is updated
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Refresh on-chain data directly from Soroban (no backend needed!)
      console.log("[Yield] Refreshing all on-chain data after unstake...");
      try {
        const { fetchComprehensiveStakingData } = await import(
          "../../lib/slices/stakingSlice"
        );
        await Promise.all([
          dispatch(
            fetchComprehensiveStakingData(user.userWalletAddress)
          ).unwrap(), // Fetch fresh on-chain data
          dispatch(getAccountInfo(user.userWalletAddress)),
          fetchSorobanBlubBalance(), // Refresh Soroban BLUB balance
        ]);

        // Update wallet records
        await updateWalletRecordsWithDelay(2000);

        console.log("[Yield] All data refreshed successfully!");
      } catch (refreshError: any) {
        console.error(
          "[Yield] Data refresh after unstake failed:",
          refreshError
        );
        // Don't fail the whole operation if refresh fails, user can manually refresh
        toast.warning(
          "Transaction succeeded but data refresh failed. Please refresh the page."
        );
      }
    } catch (err: any) {
      console.error("[Yield] Unstaking failed:", err);
      toast.error(`Unstaking failed: ${err.message || "Please try again"}`);
      setDialogTitle("Unstaking Failed");
      setDialogMsg(
        `Error: ${err.message}\n\nPlease try again or contact support.`
      );
      setOptDialog(true);
    } finally {
      // Always reset the loading state
      dispatch(unStakingAqua(false));
    }
  };

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

  // Add delay-based balance refresh for better sync with backend
  const updateWalletRecordsWithDelay = async (delayMs: number = 3000) => {
    // Wait for backend to complete transaction processing
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

      // Double-check after another short delay to ensure balance changes are visible
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

  const handleRestake = async () => {
    if (!user?.userWalletAddress) {
      return toast.warn("Please connect wallet.");
    }

    if (!blubStakeAmount) {
      return toast.warn("Please input amount to stake.");
    }

    if (Number(blubBalance) < blubStakeAmount || !blubBalance) {
      return toast.warn(`Your balance is low`);
    }

    // Set loading state
    dispatch(restaking(true));

    try {
      console.log("[Yield] Starting BLUB restaking (Soroban):", {
        userAddress: user.userWalletAddress,
        amount: blubStakeAmount,
      });

      // Import Soroban service and config
      const { sorobanService } = await import("../../services/soroban.service");
      const { SOROBAN_CONFIG } = await import("../../config/soroban.config");

      console.log(
        "🟦 [Yield] Using Soroban staking contract:",
        SOROBAN_CONFIG.contracts.staking
      );
      console.log(
        "🟦 [Yield] Using BLUB token:",
        SOROBAN_CONFIG.assets.blub.sorobanContract
      );

      // Build Soroban transaction for staking BLUB
      const stakeAmountStroops = Math.floor(blubStakeAmount * 10000000); // Convert to stroops
      const durationPeriods = 1; // Minimal value - rewards based on actual time staked

      console.log("🟦 [Yield] Building BLUB stake transaction...");
      console.log("🟦 [Yield] Parameters:", {
        userAddress: user.userWalletAddress,
        stakeAmountStroops,
        durationPeriods,
      });

      // Import Stellar SDK for proper type conversions
      const { Address, nativeToScVal, xdr } = await import(
        "@stellar/stellar-sdk"
      );

      // Build contract transaction with properly typed parameters
      const { transaction } = await sorobanService.buildContractTransaction(
        "staking",
        "stake_blub", // Contract function for BLUB restaking
        [
          Address.fromString(user.userWalletAddress),
          nativeToScVal(stakeAmountStroops, { type: "i128" }),
          nativeToScVal(durationPeriods, { type: "u64" }),
        ],
        user.userWalletAddress
      );

      console.log("🟦 [Yield] Transaction built, requesting signature...");

      // Sign transaction with user's wallet
      const selectedModule =
        user.walletName === LOBSTR_ID
          ? new LobstrModule()
          : new FreighterModule();
      const stellarKit = new StellarWalletsKit({
        network: WalletNetwork.TESTNET,
        selectedWalletId: user.walletName || FREIGHTER_ID,
        modules: [selectedModule],
      });

      const { signedTxXdr } = await stellarKit.signTransaction(
        transaction.toXDR(),
        {
          address: user.userWalletAddress,
          networkPassphrase: WalletNetwork.TESTNET,
        }
      );

      console.log("🟦 [Yield] Transaction signed, submitting...");

      // Submit transaction
      const txResponse = await sorobanService
        .getServer()
        .sendTransaction(
          TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET)
        );

      console.log(
        "[Yield] BLUB staking transaction submitted:",
        txResponse.hash
      );

      // Wait for transaction confirmation
      let confirmed = false;
      let attempts = 0;
      const maxAttempts = 30;

      while (!confirmed && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        try {
          const statusResponse = await sorobanService
            .getServer()
            .getTransaction(txResponse.hash);

          if (statusResponse.status === "SUCCESS") {
            console.log("✅ [Yield] BLUB staking confirmed on-chain");
            confirmed = true;
            break;
          } else if (statusResponse.status === "FAILED") {
            throw new Error("Transaction failed on-chain");
          }
        } catch (error) {
          // Transaction still pending
        }
        attempts++;
      }

      if (!confirmed) {
        throw new Error("Transaction confirmation timeout");
      }

      const transactionHash = txResponse.hash;

      // Show success message
      toast.success(`Successfully restaked ${blubStakeAmount} BLUB!`);
      setDialogTitle("Restaking Successful!");
      setDialogMsg(
        `Transaction Hash: ${transactionHash}\n\nYour BLUB has been restaked.`
      );
      setOptDialog(true);

      // Reset form
      setBlubStakeAmount(0);

      // Add a small delay to ensure blockchain state is updated
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Refresh on-chain data directly from Soroban (no backend needed!)
      console.log("[Yield] Refreshing all on-chain data after restake...");
      try {
        const { fetchComprehensiveStakingData: fetchData } = await import(
          "../../lib/slices/stakingSlice"
        );
        await Promise.all([
          dispatch(fetchData(user.userWalletAddress)).unwrap(), // Fetch fresh on-chain data
          dispatch(getAccountInfo(user.userWalletAddress)),
          fetchSorobanBlubBalance(), // Refresh Soroban BLUB balance
        ]);

        // Update wallet records
        await updateWalletRecordsWithDelay(2000);

        console.log("[Yield] All data refreshed successfully!");
      } catch (refreshError: any) {
        console.error(
          "[Yield] Data refresh after restake failed:",
          refreshError
        );
        // Don't fail the whole operation if refresh fails, user can manually refresh
        toast.warning(
          "Transaction succeeded but data refresh failed. Please refresh the page."
        );
      }
    } catch (err: any) {
      console.error("[Yield] Restaking failed:", err);
      toast.error(`Restaking failed: ${err.message || "Please try again"}`);
      setDialogTitle("Restaking Failed");
      setDialogMsg(
        `Error: ${err.message}\n\nPlease try again or contact support.`
      );
      setOptDialog(true);
    } finally {
      // Always reset the loading state
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

  // Fetch Soroban BLUB balance on component mount and when user changes
  useEffect(() => {
    if (user?.userWalletAddress) {
      console.log(
        "🟦 [Yield] Fetching Soroban BLUB balance for user:",
        user.userWalletAddress
      );

      // Initial fetch
      fetchSorobanBlubBalance();

      // Set up auto-refresh every 30 seconds for real-time updates
      const refreshInterval = setInterval(() => {
        console.log("🔄 [Yield] Auto-refreshing BLUB data...");
        fetchSorobanBlubBalance();
      }, 30000);

      // Cleanup interval on unmount
      return () => clearInterval(refreshInterval);
    }
  }, [user?.userWalletAddress]);

  useEffect(() => {
    console.log("tst");
    console.log(user?.userRecords?.account?.claimableRecords);
    if (user?.restaked) {
      updateWalletRecordsWithDelay(3000); // Add delay for backend processing
      fetchSorobanBlubBalance(); // Refresh BLUB balance
      toast.success("BLUB Locked successfully!");
      dispatch(resetStateValues());
      dispatch(restaking(false));
    }

    if (user?.unStakedAqua) {
      updateWalletRecordsWithDelay(3000); // Add delay for backend processing
      fetchSorobanBlubBalance(); // Refresh BLUB balance
      toast.success("Blub unstaked successfully!");
      dispatch(resetStateValues());
      dispatch(unStakingAqua(false));
    }
  }, [user?.restaked, user?.unStakedAqua]);

  return (
    <div id="Yield_section">
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
                  onClick={handleSetMaxStakeBlub}
                >
                  Max
                </button>
              </div>

              <div className="flex items-center text-normal mt-6 space-x-1">
                <div className="font-normal text-[#B1B3B8]">BLUB Balance:</div>
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
                  Staked Balance:
                </div>
                <div className="font-medium">
                  {`${parseFloat(blubStakedBalance).toFixed(2)} BLUB`}
                </div>
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

export default Yield;
