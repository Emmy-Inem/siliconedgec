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
  useEffect(() => {
    let active = true;
    ensureGeoCountry().then((c) => { if (active && c) setTick((n) => n + 1); });
    return () => { active = false; };
  }, []);

  const currency =
    opts?.forceCurrency ?? (typeof window === "undefined" ? "NGN" : detectVisitorCurrency());
  const isNgn = currency === "NGN";
  // tick is referenced so React re-runs detection after IP geo lands
  void tick;

  const { data: rate } = useQuery({
    queryKey: ["fx-ngn", currency],
    enabled: !isNgn,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    queryFn: async (): Promise<number> => {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/NGN");
        if (!res.ok) throw new Error("fx http");
        const json = await res.json();
        const r = json?.rates?.[currency];
        if (typeof r === "number" && r > 0) return r;
        throw new Error("missing rate");
      } catch {
        return FALLBACK_RATES_FROM_NGN[currency] ?? FALLBACK_RATES_FROM_NGN.USD;
      }
    },
  });

  const effectiveRate = isNgn ? 1 : (rate ?? FALLBACK_RATES_FROM_NGN[currency] ?? FALLBACK_RATES_FROM_NGN.USD);

  const format = (amountNgn: number): string => {
    if (isNgn) return formatNaira(amountNgn);
    return formatLocalized(amountNgn, currency, effectiveRate);
  };

  return { format, currency, isNgn };
}
