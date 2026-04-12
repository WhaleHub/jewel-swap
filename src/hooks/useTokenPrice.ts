import { useEffect, useState } from "react";
import { TokenPriceService } from "../services/soroban-vault.service";

/**
 * Hook that fetches and caches a token's USD price.
 * Refreshes every 60 seconds (matches TokenPriceService cache TTL).
 * Returns 0 while loading or on error.
 */
export function useTokenPrice(tokenCode: string): number {
  const [price, setPrice] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      const p = await TokenPriceService.getTokenPrice(tokenCode);
      if (!cancelled) setPrice(p);
    };

    fetch();
    const interval = setInterval(fetch, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tokenCode]);

  return price;
}

/**
 * Format a token amount as USD string.
 * Returns "(...)" while price is loading (0).
 */
export function formatUsd(amount: number | string, price: number): string {
  if (price <= 0) return "(...)";
  const val = (typeof amount === "string" ? parseFloat(amount) : amount) * price;
  if (isNaN(val) || val <= 0) return "($0.00)";
  if (val < 0.01) return "(<$0.01)";
  return `($${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
}
