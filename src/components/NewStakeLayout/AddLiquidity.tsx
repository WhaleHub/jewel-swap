import { useEffect, useState, useMemo, useCallback } from "react";
import { useAppDispatch } from "../../lib/hooks";
import { useSelector } from "react-redux";
import { RootState } from "../../lib/store";
import clsx from "clsx";
import { Button, Input } from "@headlessui/react";
import { toast } from "react-toastify";
import { TailSpin } from "react-loader-spinner";
import { InformationCircleIcon } from "@heroicons/react/16/solid";
import DialogC from "./Dialog";
import { SorobanVaultService } from "../../services/soroban-vault.service";
import { StellarService } from "../../services/stellar.service";
import { getAccountInfo, storeAccountBalance } from "../../lib/slices/userSlice";

interface PoolInfo {
  pool_id: number;
  pool_address: string;
  token_a: string;
  token_b: string;
  share_token: string;
  total_lp_tokens: string;
  active: boolean;
  added_at: number;
  // Display info
  token_a_code: string;
  token_b_code: string;
  token_a_logo: string;
  token_b_logo: string;
}

interface UserPosition {
  pool_id: number;
  share_ratio: string;
  deposited_at: number;
  active: boolean;
  // Calculated fields
  user_lp_amount: string;
  percentage: string;
}

function AddLiquidity() {
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolInfo | null>(null);
  const [userPositions, setUserPositions] = useState<UserPosition[]>([]);

  const [depositAmount1, setDepositAmount1] = useState<string>("");
  const [depositAmount2, setDepositAmount2] = useState<string>("");
  const [withdrawPercent, setWithdrawPercent] = useState<number>(100);

  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isLoadingPools, setIsLoadingPools] = useState(true);

  // Token balances
  const [balanceA, setBalanceA] = useState<string>("0");
  const [balanceB, setBalanceB] = useState<string>("0");
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  // Pool reserves for withdrawal estimates
  const [reserveA, setReserveA] = useState<string>("0");
  const [reserveB, setReserveB] = useState<string>("0");
  const [totalLpSupply, setTotalLpSupply] = useState<string>("0");

  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");

  const [dialogMsg, setDialogMsg] = useState<string>("");
  const [dialogTitle, setDialogTitle] = useState<string>("");
  const [openDialog, setOptDialog] = useState<boolean>(false);

  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user);
  const userWalletAddress = user?.userWalletAddress;

  // Create vaultService only once
  const vaultService = useMemo(() => new SorobanVaultService(), []);

  const loadPools = async () => {
    try {
      setIsLoadingPools(true);
      const poolCount = await vaultService.getPoolCount();

      const loadedPools: PoolInfo[] = [];
      for (let i = 0; i < poolCount; i++) {
        const poolInfo = await vaultService.getPoolInfo(i);
        if (poolInfo.active) {
          loadedPools.push(poolInfo);
        }
      }

      setPools(loadedPools);
      if (loadedPools.length > 0) {
        setSelectedPool(loadedPools[0]);
      }
    } catch (error) {
      console.error("Failed to load pools:", error);
      toast.error("Failed to load pools");
    } finally {
      setIsLoadingPools(false);
    }
  };

  const loadUserPosition = useCallback(async (poolId: number) => {
    if (!userWalletAddress) return;

    try {
      const position = await vaultService.getUserVaultPosition(
        userWalletAddress,
        poolId
      );

      if (position) {
        setUserPositions([position]);
      } else {
        setUserPositions([]);
      }
    } catch (error) {
      console.error("Failed to load user position:", error);
      setUserPositions([]);
    }
  }, [vaultService, userWalletAddress]);

  const loadBalances = useCallback(async (pool: PoolInfo) => {
    if (!userWalletAddress) {
      setBalanceA("0");
      setBalanceB("0");
      return;
    }

    setIsLoadingBalances(true);
    try {
      const [balA, balB] = await Promise.all([
        vaultService.getTokenBalance(pool.token_a, userWalletAddress),
        vaultService.getTokenBalance(pool.token_b, userWalletAddress),
      ]);
      setBalanceA(balA);
      setBalanceB(balB);
    } catch (error) {
      console.error("Failed to load balances:", error);
      setBalanceA("0");
      setBalanceB("0");
    } finally {
      setIsLoadingBalances(false);
    }
  }, [vaultService, userWalletAddress]);

  const loadPoolReserves = useCallback(async (pool: PoolInfo) => {
    try {
      const data = await vaultService.getPoolReserves(pool.pool_address, pool.share_token);
      setReserveA(data.reserveA);
      setReserveB(data.reserveB);
      setTotalLpSupply(data.totalLpSupply);
    } catch (error) {
      console.error("Failed to load pool reserves:", error);
      setReserveA("0");
      setReserveB("0");
      setTotalLpSupply("0");
    }
  }, [vaultService]);

  // Refresh wallet balances and update Redux state (like other sections do)
  const refreshWalletAndBalances = useCallback(async () => {
    if (!userWalletAddress || !selectedPool) return;

    try {
      // Update Redux state with fresh Horizon data
      const stellarService = new StellarService();
      const wrappedAccount = await stellarService.loadAccount(userWalletAddress);
      dispatch(getAccountInfo(userWalletAddress));
      dispatch(storeAccountBalance(wrappedAccount.balances));

      // Also refresh local token balances
      await loadBalances(selectedPool);
      await loadUserPosition(selectedPool.pool_id);
      await loadPoolReserves(selectedPool);
    } catch (error) {
      console.error("Failed to refresh wallet balances:", error);
    }
  }, [userWalletAddress, selectedPool, dispatch, loadBalances, loadUserPosition, loadPoolReserves]);

  // Load pools from contract on mount
  useEffect(() => {
    loadPools();
  }, []);

  // Load pool reserves when pool is selected
  useEffect(() => {
    if (selectedPool) {
      loadPoolReserves(selectedPool);
    }
  }, [selectedPool?.pool_id, loadPoolReserves]);

  // Load user position and balances when pool or wallet changes
  useEffect(() => {
    if (selectedPool && userWalletAddress) {
      loadUserPosition(selectedPool.pool_id);
      loadBalances(selectedPool);
    } else {
      // Reset balances if no wallet connected
      setBalanceA("0");
      setBalanceB("0");
      setUserPositions([]);
    }
  }, [selectedPool?.pool_id, userWalletAddress, loadUserPosition, loadBalances]);

  // Auto-refresh balances every 30 seconds (like Yield.tsx does)
  useEffect(() => {
    if (userWalletAddress && selectedPool) {
      // Set up auto-refresh every 30 seconds for real-time updates
      const refreshInterval = setInterval(() => {
        refreshWalletAndBalances();
      }, 30000);

      // Cleanup interval on unmount
      return () => clearInterval(refreshInterval);
    }
  }, [userWalletAddress, selectedPool, refreshWalletAndBalances]);

  // Calculate estimated withdrawal amounts
  const getEstimatedWithdrawAmounts = () => {
    if (!userPosition || !selectedPool) {
      return { estimatedA: "0.00", estimatedB: "0.00" };
    }

    const userLp = parseFloat(userPosition.user_lp_amount || "0");
    const poolTotalLp = parseFloat(totalLpSupply);
    const resA = parseFloat(reserveA);
    const resB = parseFloat(reserveB);

    if (poolTotalLp <= 0 || userLp <= 0) {
      return { estimatedA: "0.00", estimatedB: "0.00" };
    }

    // User's share of the entire Aquarius pool
    const userShareOfPool = userLp / poolTotalLp;
    // Apply withdrawal percentage
    const withdrawShare = (withdrawPercent / 100) * userShareOfPool;

    const estimatedA = (withdrawShare * resA).toFixed(4);
    const estimatedB = (withdrawShare * resB).toFixed(4);

    return { estimatedA, estimatedB };
  };

  const handleDeposit = async () => {
    if (!selectedPool) {
      return toast.warn("Please select a pool");
    }

    if (!user?.userWalletAddress) {
      return toast.warn("Please connect your wallet");
    }

    if (!user?.walletName) {
      return toast.warn("Please connect your wallet");
    }

    const amount1 = parseFloat(depositAmount1);
    const amount2 = parseFloat(depositAmount2);

    if (!amount1 || amount1 <= 0) {
      return toast.warn(
        `Please enter ${selectedPool.token_a_code} amount`
      );
    }

    if (!amount2 || amount2 <= 0) {
      return toast.warn(
        `Please enter ${selectedPool.token_b_code} amount`
      );
    }

    // Balance validation
    const balA = parseFloat(balanceA);
    const balB = parseFloat(balanceB);

    if (amount1 > balA) {
      return toast.warn(
        `Insufficient ${selectedPool.token_a_code} balance. You have ${balA.toFixed(4)}`
      );
    }

    if (amount2 > balB) {
      return toast.warn(
        `Insufficient ${selectedPool.token_b_code} balance. You have ${balB.toFixed(4)}`
      );
    }

    setIsDepositing(true);

    try {
      const result = await vaultService.vaultDeposit({
        userAddress: user.userWalletAddress,
        poolId: selectedPool.pool_id,
        desiredA: amount1.toString(),
        desiredB: amount2.toString(),
        minShares: "0", // TODO: Calculate based on slippage tolerance
        walletName: user.walletName,
      });

      if (result.success) {
        toast.success("Deposit successful!");
        setDepositAmount1("");
        setDepositAmount2("");
        // Refresh all balances including Redux state
        await refreshWalletAndBalances();
      } else {
        toast.error(result.error || "Deposit failed");
      }
    } catch (error: any) {
      console.error("Deposit error:", error);
      toast.error(error.message || "Deposit failed");
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedPool) {
      return toast.warn("Please select a pool");
    }

    if (!user?.userWalletAddress) {
      return toast.warn("Please connect your wallet");
    }

    if (userPositions.length === 0) {
      return toast.warn("No position to withdraw");
    }

    if (withdrawPercent <= 0 || withdrawPercent > 100) {
      return toast.warn("Invalid withdrawal percentage");
    }

    if (!user?.walletName) {
      return toast.warn("Please connect your wallet");
    }

    setIsWithdrawing(true);

    try {
      const result = await vaultService.vaultWithdraw({
        userAddress: user.userWalletAddress,
        poolId: selectedPool.pool_id,
        sharePercent: withdrawPercent * 100, // Convert to basis points
        minA: "0", // TODO: Calculate based on slippage tolerance
        minB: "0",
        walletName: user.walletName,
      });

      if (result.success) {
        toast.success("Withdrawal successful!");
        setWithdrawPercent(100);
        // Refresh all balances including Redux state
        await refreshWalletAndBalances();
      } else {
        toast.error(result.error || "Withdrawal failed");
      }
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      toast.error(error.message || "Withdrawal failed");
    } finally {
      setIsWithdrawing(false);
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

  const userPosition = userPositions[0];

  if (isLoadingPools) {
    return (
      <div className="bg-[#0E111BCC] p-10 rounded-[16px] flex justify-center items-center min-h-[400px]">
        <TailSpin
          height="40"
          width="40"
          color="#00CC99"
          ariaLabel="tail-spin-loading"
          radius="1"
          visible={true}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="bg-[#0E111BCC] p-10 rounded-[16px]">
        {/* Header */}
        <div className="text-2xl font-medium text-white flex items-center space-x-2">
          <div>Boost liquidity pool for yield</div>
          <InformationCircleIcon
            className="h-[15px] w-[15px] text-white cursor-pointer"
            onClick={() =>
              onDialogOpen(
                `Deposit tokens into Aquarius AMM pools and earn boosted rewards using WhaleHub's ICE balance. The vault automatically claims rewards 4x daily and auto-compounds 70% back into the pool, increasing your position value. 30% goes to treasury.`,
                "Boost Liquidity Pool for Yield"
              )
            }
          />
        </div>

        {/* Pool Selection */}
        <div className="mt-5">
          <label className="text-sm text-[#B1B3B8] mb-2 block">
            Select Pool
          </label>
          <select
            className="w-full bg-[#0E111B] text-white p-3 rounded-[8px] border-none focus:outline-none focus:ring-2 focus:ring-[#00CC99]"
            value={selectedPool?.pool_id || ""}
            onChange={(e) => {
              const pool = pools.find(
                (p) => p.pool_id === parseInt(e.target.value)
              );
              setSelectedPool(pool || null);
            }}
          >
            {pools.map((pool) => (
              <option key={pool.pool_id} value={pool.pool_id}>
                {pool.token_a_code}/{pool.token_b_code}
              </option>
            ))}
          </select>
        </div>

        {/* Pool Info Display */}
        {selectedPool && (
          <div className="mt-4 flex items-center space-x-2">
            <span className="text-lg">{selectedPool.token_a_code}</span>
            <span className="text-[#B1B3B8]">/</span>
            <span className="text-lg">{selectedPool.token_b_code}</span>
          </div>
        )}

        {/* User Position Display */}
        {userPosition && userPosition.active && (
          <div className="mt-4 bg-[#0E111B] p-4 rounded-[8px]">
            <div className="text-sm text-[#B1B3B8] mb-2">Your Position</div>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-white font-medium">
                  {userPosition.user_lp_amount} LP
                </div>
                <div className="text-xs text-[#B1B3B8]">
                  {userPosition.percentage}% of pool
                </div>
              </div>
              <div className="text-sm text-[#00CC99]">
                Earning Boosted Rewards
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex mt-6 space-x-2">
          <button
            className={clsx(
              "flex-1 py-2 rounded-[8px] font-medium transition-colors",
              activeTab === "deposit"
                ? "bg-[#00CC99] text-white"
                : "bg-[#0E111B] text-[#B1B3B8] hover:bg-[#1A1D28]"
            )}
            onClick={() => setActiveTab("deposit")}
          >
            Deposit
          </button>
          <button
            className={clsx(
              "flex-1 py-2 rounded-[8px] font-medium transition-colors",
              activeTab === "withdraw"
                ? "bg-[#00CC99] text-white"
                : "bg-[#0E111B] text-[#B1B3B8] hover:bg-[#1A1D28]"
            )}
            onClick={() => setActiveTab("withdraw")}
          >
            Withdraw
          </button>
        </div>

        {/* Deposit Tab */}
        {activeTab === "deposit" && selectedPool && (
          <div className="mt-6">
            {/* Token A Input */}
            <div>
              <label className="text-sm text-[#B1B3B8] mb-2 block">
                {selectedPool.token_a_code} Amount
              </label>
              <div className="flex items-center bg-[#0E111B] py-2 space-x-2 rounded-[8px]">
                <Input
                  placeholder={`0 ${selectedPool.token_a_code}`}
                  value={depositAmount1}
                  className={clsx(
                    "block w-full rounded-lg border-none bg-[#0E111B] px-3 text-sm/6 text-white",
                    "focus:outline-none focus:ring-0",
                    "w-full p-3"
                  )}
                  onChange={(e) => setDepositAmount1(e.target.value)}
                />
                <button
                  className="bg-[#3C404D] p-2 rounded-[4px] text-sm hover:bg-[#4C505D]"
                  onClick={() => setDepositAmount1(balanceA)}
                >
                  Max
                </button>
              </div>
              <div className="flex items-center text-sm mt-1 space-x-1">
                <div className="font-normal text-[#B1B3B8]">Balance:</div>
                <div className="font-medium">
                  {isLoadingBalances ? "..." : parseFloat(balanceA).toFixed(4)} {selectedPool.token_a_code}
                </div>
              </div>
            </div>

            {/* Token B Input */}
            <div className="mt-4">
              <label className="text-sm text-[#B1B3B8] mb-2 block">
                {selectedPool.token_b_code} Amount
              </label>
              <div className="flex items-center bg-[#0E111B] py-2 space-x-2 rounded-[8px]">
                <Input
                  placeholder={`0 ${selectedPool.token_b_code}`}
                  value={depositAmount2}
                  className={clsx(
                    "block w-full rounded-lg border-none bg-[#0E111B] px-3 text-sm/6 text-white",
                    "focus:outline-none focus:ring-0",
                    "w-full p-3"
                  )}
                  onChange={(e) => setDepositAmount2(e.target.value)}
                />
                <button
                  className="bg-[#3C404D] p-2 rounded-[4px] text-sm hover:bg-[#4C505D]"
                  onClick={() => setDepositAmount2(balanceB)}
                >
                  Max
                </button>
              </div>
              <div className="flex items-center text-sm mt-1 space-x-1">
                <div className="font-normal text-[#B1B3B8]">Balance:</div>
                <div className="font-medium">
                  {isLoadingBalances ? "..." : parseFloat(balanceB).toFixed(4)} {selectedPool.token_b_code}
                </div>
              </div>
            </div>

            <Button
              className="rounded-[12px] py-5 px-4 text-white mt-6 w-full bg-[linear-gradient(180deg,_#00CC99_0%,_#005F99_100%)] text-base font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleDeposit}
              disabled={isDepositing || !selectedPool}
            >
              {isDepositing ? (
                <div className="flex justify-center items-center gap-[10px]">
                  <span className="text-white">Depositing...</span>
                  <TailSpin
                    height="18"
                    width="18"
                    color="#ffffff"
                    ariaLabel="tail-spin-loading"
                    radius="1"
                    visible={true}
                  />
                </div>
              ) : (
                <span>Deposit & Start Earning</span>
              )}
            </Button>
          </div>
        )}

        {/* Withdraw Tab */}
        {activeTab === "withdraw" && selectedPool && (
          <div className="mt-6">
            {!userPosition || !userPosition.active ? (
              <div className="text-center py-8 text-[#B1B3B8]">
                No position to withdraw
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm text-[#B1B3B8] mb-2 block">
                    Withdrawal Percentage
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={withdrawPercent}
                    className={clsx(
                      "block w-full rounded-lg border-none bg-[#0E111B] px-3 py-3 text-sm/6 text-white",
                      "focus:outline-none focus:ring-2 focus:ring-[#00CC99]"
                    )}
                    onChange={(e) =>
                      setWithdrawPercent(
                        Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                      )
                    }
                  />
                  <div className="flex justify-between mt-2">
                    {[25, 50, 75, 100].map((percent) => (
                      <button
                        key={percent}
                        className="bg-[#3C404D] px-3 py-1 rounded-[4px] text-sm hover:bg-[#00CC99] transition-colors"
                        onClick={() => setWithdrawPercent(percent)}
                      >
                        {percent}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 bg-[#0E111B] p-4 rounded-[8px]">
                  <div className="text-sm text-[#B1B3B8] mb-2">
                    You will receive approximately:
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-white">
                      <span>{selectedPool.token_a_code}:</span>
                      <span>~{getEstimatedWithdrawAmounts().estimatedA}</span>
                    </div>
                    <div className="flex justify-between text-white">
                      <span>{selectedPool.token_b_code}:</span>
                      <span>~{getEstimatedWithdrawAmounts().estimatedB}</span>
                    </div>
                  </div>
                </div>

                <Button
                  className="rounded-[12px] py-5 px-4 text-white mt-6 w-full bg-[linear-gradient(180deg,_#CC0000_0%,_#990000_100%)] text-base font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleWithdraw}
                  disabled={isWithdrawing}
                >
                  {isWithdrawing ? (
                    <div className="flex justify-center items-center gap-[10px]">
                      <span className="text-white">Withdrawing...</span>
                      <TailSpin
                        height="18"
                        width="18"
                        color="#ffffff"
                        ariaLabel="tail-spin-loading"
                        radius="1"
                        visible={true}
                      />
                    </div>
                  ) : (
                    <span>Withdraw {withdrawPercent}%</span>
                  )}
                </Button>
              </>
            )}
          </div>
        )}
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

export default AddLiquidity;
