/**
 * Payment gateway routing based on visitor location.
 * Prefer local Paystack markets, otherwise Stripe. Actual eligibility and
 * fallback are resolved during initialization against the connected accounts.
 */
import { detectVisitorCountry, COUNTRY_TO_CURRENCY } from "./currency";
import { checkoutRoutes } from "../../supabase/functions/_shared/payment-routing";
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
 * Returns the first preferred route. Initialization checks actual account support
 * and tries the remaining routes automatically.
 */
export function resolvePaymentGateway(countryCode?: string | null): PaymentGateway {
  const country = countryCode || getCachedVisitorGeo()?.country || detectVisitorCountry();
  return checkoutRoutes(COUNTRY_TO_CURRENCY[country.trim().toUpperCase()] || "USD")[0].gateway;
}

/**
 * Asynchronously detect visitor's location and resolve payment gateway.
 */
export async function detectPaymentGateway(): Promise<PaymentGateway> {
  const geo = await getVisitorGeo();
  return resolvePaymentGateway(geo?.country);
}
