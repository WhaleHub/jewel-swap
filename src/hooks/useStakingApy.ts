import { useEffect, useState } from "react";
import { apiService, StakingApyResponse } from "../services/api.service";
import {
  calculateAPY,
  RewardStateInfo,
} from "../lib/slices/stakingSlice";

/**
 * Rolling-window staking APY.
 *
 * Primary source: backend `/public/staking-apy` — indexes `rwd_add` events and
 * annualises the last `windowDays` of emissions. Honest rate.
 *
 * Fallback: the legacy lifetime-ratio `calculateAPY`, which overstates APY by
 * roughly `protocol_age_days / windowDays`. Used only when the backend indexer
 * is down or still warming up (no events in the window).
 *
 * Refreshes every 60s, matching the indexer's poll cadence.
 */
export function useStakingApy(
  rewardState: RewardStateInfo | null,
  windowDays = 7,
): { apy: string; source: "indexer" | "fallback" } {
  const [apy, setApy] = useState<string>("--");
  const [source, setSource] = useState<"indexer" | "fallback">("fallback");

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const res: StakingApyResponse | null = await apiService.getStakingApy(windowDays);
      if (cancelled) return;
      if (res && res.apy !== "--" && res.eventCount > 0) {
        setApy(res.apy);
        setSource("indexer");
        return;
      }
      // Backend unavailable or indexer still cold — fall back to the lifetime ratio.
      setApy(calculateAPY(rewardState));
      setSource("fallback");
    };

    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [windowDays, rewardState]);

  return { apy, source };
}
