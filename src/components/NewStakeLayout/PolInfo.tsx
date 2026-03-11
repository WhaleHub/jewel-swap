import { useEffect, useState, useMemo } from "react";
import { InformationCircleIcon } from "@heroicons/react/16/solid";
import { TailSpin } from "react-loader-spinner";
import { SorobanVaultService, TokenPriceService, IceBoostInfo } from "../../services/soroban-vault.service";

interface PoolStats {
  // POL's share of the pool
  polReserveA: string;
  polReserveB: string;
  polUsdValue: string;
  polLp: string;
  polSharePercent: string;
  // Pool-level info
  tokenACode: string;
  tokenBCode: string;
  totalLp: string;
  poolApy: string;
  compoundApy: string;
  iceBoost: IceBoostInfo | null;
}

interface PolInfoProps {
  onDialogOpen: (msg: string, title: string) => void;
}

// Format number with comma separators and specified decimals
const fmtNum = (val: string | number, decimals = 2): string => {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "0";
  return n.toFixed(decimals).replace(/,/g, ".").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

function PolInfo({ onDialogOpen }: PolInfoProps) {
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [loading, setLoading] = useState(true);

  const vaultService = useMemo(() => new SorobanVaultService(), []);

  useEffect(() => {
    let cancelled = false;

    const fetchPoolStats = async () => {
      try {
        // Pool 0 is the BLUB-AQUA POL pool
        const poolInfo = await vaultService.getPoolInfo(0);
        if (cancelled) return;

        const stakingContractId = process.env.REACT_APP_STAKING_CONTRACT_ID || "";

        const [apyData, reservesData, contractLpBalance] = await Promise.all([
          vaultService.getAquariusPoolApy(poolInfo.pool_address),
          vaultService.getPoolReserves(
            poolInfo.pool_address,
            poolInfo.share_token,
            poolInfo.token_a,
            poolInfo.token_b,
          ),
          // Contract's total LP token balance (POL + vault users)
          vaultService.getTokenBalance(poolInfo.share_token, stakingContractId),
        ]);
        if (cancelled) return;

        // total_lp_tokens from PoolInfo = vault user LP tracked by contract
        const vaultLp = parseFloat(poolInfo.total_lp_tokens) / 1e7;
        const contractTotalLp = parseFloat(contractLpBalance);
        // POL LP = contract's LP balance - vault LP
        const polLp = Math.max(0, contractTotalLp - vaultLp);

        // Total LP in the entire Aquarius pool
        const totalPoolLp = parseFloat(apyData.totalShare ?? reservesData.totalLpSupply);

        // POL's share of the pool
        const polShare = totalPoolLp > 0 ? polLp / totalPoolLp : 0;

        // POL's portion of reserves
        const totalResA = parseFloat(reservesData.reserveA);
        const totalResB = parseFloat(reservesData.reserveB);
        const polResA = totalResA * polShare;
        const polResB = totalResB * polShare;

        // USD value
        let usdValue = 0;
        try {
          usdValue = await TokenPriceService.calculateTotalUsdValue(
            poolInfo.token_a_code,
            polResA,
            poolInfo.token_b_code,
            polResB,
            totalResA,
            totalResB,
          );
        } catch {
          // Graceful degradation — show 0 if price unavailable
        }

        if (cancelled) return;

        // Fetch ICE boost info (non-blocking)
        let iceBoost: IceBoostInfo | null = null;
        try {
          iceBoost = await vaultService.getIceBoostInfo(
            poolInfo.pool_address,
            poolInfo.share_token,
            totalPoolLp.toFixed(7),
          );
        } catch {
          // Graceful degradation
        }

        if (cancelled) return;

        setStats({
          polReserveA: polResA.toFixed(2),
          polReserveB: polResB.toFixed(2),
          polUsdValue: usdValue.toFixed(2),
          polLp: polLp.toFixed(2),
          polSharePercent: (polShare * 100).toFixed(2),
          tokenACode: poolInfo.token_a_code,
          tokenBCode: poolInfo.token_b_code,
          totalLp: totalPoolLp.toFixed(2),
          poolApy: apyData.poolApy,
          compoundApy: apyData.compoundApy,
          iceBoost,
        });
      } catch (err) {
        console.warn("[PolInfo] Failed to fetch pool stats:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPoolStats();
    const interval = setInterval(fetchPoolStats, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [vaultService]);

  return (
    <div className="bg-[#0E111BCC] p-6 rounded-[16px]">
      <div className="flex items-center space-x-2 mb-4">
        <div className="text-xl font-medium text-white">Protocol Owned Liquidity</div>
        <InformationCircleIcon
          className="h-[15px] w-[15px] text-white cursor-pointer"
          onClick={() =>
            onDialogOpen(
              "Protocol Owned Liquidity (POL) is created when 10% of staked AQUA is automatically added to the AQUA-BLUB liquidity pool. This generates fees for the protocol and ICE token holders receive voting power to direct these rewards.",
              "Protocol Owned Liquidity"
            )
          }
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <TailSpin height="32" width="32" color="#00CC99" ariaLabel="loading" radius="1" visible={true} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* POL Token A */}
          <div className="bg-[#1A1E2E] p-4 rounded-[12px]">
            <div className="text-sm text-[#B1B3B8] mb-1">POL {stats?.tokenACode}</div>
            <div className="text-lg font-semibold text-white">{fmtNum(stats?.polReserveA ?? "0")}</div>
          </div>

          {/* POL Token B */}
          <div className="bg-[#1A1E2E] p-4 rounded-[12px]">
            <div className="text-sm text-[#B1B3B8] mb-1">POL {stats?.tokenBCode}</div>
            <div className="text-lg font-semibold text-white">{fmtNum(stats?.polReserveB ?? "0")}</div>
          </div>

          {/* USD Value */}
          <div className="bg-[#1A1E2E] p-4 rounded-[12px] col-span-2">
            <div className="text-sm text-[#B1B3B8] mb-1">POL Total Value</div>
            <div className="text-lg font-semibold text-[#00CC99]">
              ${fmtNum(stats?.polUsdValue ?? "0")}
            </div>
            <div className="text-[10px] text-[#6B7280] mt-0.5">
              {fmtNum(stats?.polLp ?? "0")} LP · {stats?.polSharePercent ?? "0"}% of pool
            </div>
          </div>

          {/* Pool APY */}
          <div className="bg-[#1A1E2E] p-4 rounded-[12px]">
            <div className="text-sm text-[#B1B3B8] mb-1">Pool APY</div>
            <div className="text-lg font-semibold text-[#00CC99]">
              {stats?.poolApy === "--" ? "--" : `${stats?.poolApy}%`}
            </div>
            <div className="text-[10px] text-[#6B7280] mt-0.5">via Aquarius</div>
          </div>

          {/* Compounded APY */}
          <div className="bg-[#1A1E2E] p-4 rounded-[12px]">
            <div className="text-sm text-[#B1B3B8] mb-1">Compounded APY</div>
            <div className="text-lg font-semibold text-[#3B82F6]">
              {stats?.compoundApy === "--" ? "--" : `${stats?.compoundApy}%`}
            </div>
            <div className="text-[10px] text-[#6B7280] mt-0.5">48x daily · via Whalehub</div>
          </div>

          {/* ICE Boost — hidden until boost is routed through admin
          {stats?.iceBoost && stats.iceBoost.ourLp > 0 && (
            <div className="bg-[#1A1E2E] p-4 rounded-[12px] col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-[#B1B3B8] mb-1">ICE Boost</div>
                  <div className={`text-lg font-semibold ${stats.iceBoost.boost >= 2.49 ? "text-[#8B5CF6]" : stats.iceBoost.boost > 1.01 ? "text-[#A78BFA]" : "text-[#6B7280]"}`}>
                    {stats.iceBoost.boost.toFixed(2)}x
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#6B7280]">
                    Pool share: {stats.iceBoost.lpSharePct < 0.01 ? "<0.01" : stats.iceBoost.lpSharePct.toFixed(2)}%
                  </div>
                  <div className="text-[10px] text-[#6B7280]">
                    ICE: {(stats.iceBoost.myIce / 1e6).toFixed(1)}M / {(stats.iceBoost.totalIce / 1e9).toFixed(0)}B
                  </div>
                  {stats.iceBoost.boost >= 2.49 ? (
                    <div className="text-[10px] text-[#8B5CF6] mt-0.5">Max boost active</div>
                  ) : (
                    <div className="text-[10px] text-[#6B7280] mt-0.5">
                      2.5x up to {fmtNum(stats.iceBoost.maxLpFor2_5x, 0)} LP
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          */}
        </div>
      )}
    </div>
  );
}

export default PolInfo;
