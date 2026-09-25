/**
 * Payment gateway routing based on visitor location.
 * African countries route to Paystack (NGN native).
 * Non-African countries route to Stripe (International cards, USD).
 */
import { getVisitorGeo, getCachedVisitorGeo } from "./geo";

// All 54 sovereign African states + major territories (ISO 3166-1 alpha-2)
export const AFRICAN_COUNTRY_CODES = new Set([
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD", "KM", "CD", "CG", "CI",
  "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE", "LS", "LR",
  "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG", "RW", "ST", "SN",
  "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG", "ZM", "ZW",
  // African territories
  "RE", "YT", "SH", "EH"
]);

export type PaymentGateway = "paystack" | "stripe";

/**
 * Check if an ISO country code belongs to Africa.
 */
export function isAfricanCountry(countryCode?: string | null): boolean {
  if (!countryCode) return false;
  return AFRICAN_COUNTRY_CODES.has(countryCode.trim().toUpperCase());
}

/**
 * Synchronously determine gateway based on a country code.
 * If country is African -> "paystack".
 * If country is non-African -> "stripe".
 * If country is unknown, checks local timezone for Africa/ prefix or defaults to paystack.
 */
export function resolvePaymentGateway(countryCode?: string | null): PaymentGateway {
  if (countryCode) {
    return isAfricanCountry(countryCode) ? "paystack" : "stripe";
  }

  // Check cached geo if available
  const cached = getCachedVisitorGeo();
  if (cached?.country) {
    return isAfricanCountry(cached.country) ? "paystack" : "stripe";
  }

  // Timezone heuristic fallback
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.startsWith("Africa/")) {
      return "paystack";
    }
    // If clearly in US/Europe/Asia/Pacific/America, route to Stripe
    if (
      tz.startsWith("America/") ||
      tz.startsWith("Europe/") ||
      tz.startsWith("Asia/") ||
      tz.startsWith("Australia/") ||
      tz.startsWith("Pacific/")
    ) {
      return "stripe";
    }
  } catch {
    /* ignore */
  }

  // Default fallback for international school
  return "paystack";
}

/**
 * Asynchronously detect visitor's location and resolve payment gateway.
 */
export async function detectPaymentGateway(): Promise<PaymentGateway> {
  const geo = await getVisitorGeo();
  return resolvePaymentGateway(geo?.country);
}
