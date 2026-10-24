import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { detectVisitorCurrency, ensureGeoCountry, formatLocalized, FALLBACK_RATES_FROM_NGN } from "@/lib/currency";
import { formatNaira } from "@/lib/format-currency";

/**
 * Returns a function that formats an NGN amount in the visitor's local currency.
 * Naira-region visitors always see ₦ formatting.
 * Live FX is fetched once per 24h from open.er-api.com (free, no key);
 * falls back to bundled rates if unreachable.
 */
export function useLocalizedPrice(opts?: { forceCurrency?: string }) {
  // Re-evaluate after IP geo resolves so visitors abroad don't get stuck on
  // the timezone fallback.
  const [tick, setTick] = useState(0);
  const [geoReady, setGeoReady] = useState(false);
  useEffect(() => {
    let active = true;
    ensureGeoCountry().finally(() => {
      if (active) { setTick((n) => n + 1); setGeoReady(true); }
    });
    return () => { active = false; };
  }, []);

  const currency =
    opts?.forceCurrency ?? detectVisitorCurrency();
  const isNgn = currency === "NGN";
  // tick is referenced so React re-runs detection after IP geo lands
  void tick;

  const { data: rate, isFetched } = useQuery({
    queryKey: ["fx-ngn", currency],
    enabled: !isNgn,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
    queryFn: async (): Promise<number> => {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/NGN", { signal: AbortSignal.timeout(3000) });
        if (!res.ok) throw new Error("fx http");
        const json = await res.json();
        const r = json?.rates?.[currency];
        if (typeof r === "number" && r > 0) return r;
        throw new Error("missing rate");
      } catch {
        const fallback = FALLBACK_RATES_FROM_NGN[currency];
        if (fallback) return fallback;
        throw new Error("Currency pricing unavailable");
      }
    },
  });

  const effectiveRate = isNgn ? 1 : (rate ?? FALLBACK_RATES_FROM_NGN[currency]);

  const format = (amountNgn: number): string => {
    if (!geoReady) return "…";
    if (!Number.isFinite(effectiveRate)) return isFetched ? "Price unavailable" : "…";
    if (isNgn) return formatNaira(amountNgn);
    return formatLocalized(amountNgn, currency, effectiveRate);
  };

  return { format, currency, isNgn, convert: (amount: number) => amount * effectiveRate,
    ready: geoReady && (isNgn || isFetched) && Number.isFinite(effectiveRate) };
}
