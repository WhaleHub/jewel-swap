import { useEffect, useState, useMemo } from "react";
import { InformationCircleIcon } from "@heroicons/react/16/solid";
import { TailSpin } from "react-loader-spinner";
import { SorobanVaultService } from "../../services/soroban-vault.service";

interface PoolStats {
  reserveA: string;
  reserveB: string;
  tokenACode: string;
  tokenBCode: string;
  totalLp: string;
  poolApy: string;
  compoundApy: string;
}

interface PolInfoProps {
  onDialogOpen: (msg: string, title: string) => void;
}

function PolInfo({ onDialogOpen }: PolInfoProps) {
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [loading, setLoading] = useState(true);

  const vaultService = useMemo(() => new SorobanVaultService(), []);

  useEffect(() => {
    let cancelled = false;

    const fetchPoolStats = async () => {
      try {
        // Pool 0 is the BLUB-AQUA POL pool — get its address from the contract
        const poolInfo = await vaultService.getPoolInfo(0);
        if (cancelled) return;

        const [apyData, reservesData] = await Promise.all([
          vaultService.getAquariusPoolApy(poolInfo.pool_address),
          vaultService.getPoolReserves(
            poolInfo.pool_address,
            poolInfo.share_token,
            poolInfo.token_a,
            poolInfo.token_b,
          ),
        ]);
        if (cancelled) return;

        setStats({
          reserveA: parseFloat(reservesData.reserveA).toFixed(2),
          reserveB: parseFloat(reservesData.reserveB).toFixed(2),
          tokenACode: poolInfo.token_a_code,
          tokenBCode: poolInfo.token_b_code,
          totalLp: parseFloat(apyData.totalShare ?? reservesData.totalLpSupply).toFixed(2),
          poolApy: apyData.poolApy,
          compoundApy: apyData.compoundApy,
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
          {/* Token A reserve */}
          <div className="bg-[#1A1E2E] p-4 rounded-[12px]">
            <div className="text-sm text-[#B1B3B8] mb-1">Pool {stats?.tokenACode} Reserve</div>
            <div className="text-lg font-semibold text-white">{stats?.reserveA ?? "--"}</div>
          </div>

          {/* Token B reserve */}
          <div className="bg-[#1A1E2E] p-4 rounded-[12px]">
            <div className="text-sm text-[#B1B3B8] mb-1">Pool {stats?.tokenBCode} Reserve</div>
            <div className="text-lg font-semibold text-white">{stats?.reserveB ?? "--"}</div>
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
            <div className="text-[10px] text-[#6B7280] mt-0.5">48× daily · via Whalehub</div>
          </div>

          {/* Total LP supply */}
          <div className="bg-[#1A1E2E] p-4 rounded-[12px] col-span-2">
            <div className="text-sm text-[#B1B3B8] mb-1">Total LP Supply</div>
            <div className="text-lg font-semibold text-white">{stats?.totalLp ?? "--"}</div>
            <div className="text-[10px] text-[#6B7280] mt-0.5">
              {stats?.tokenACode}-{stats?.tokenBCode} pool · live from Aquarius
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PolInfo;
