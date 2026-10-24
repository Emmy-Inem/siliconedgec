/**
 * Payment gateway routing based on visitor location.
 * Nigeria routes to Paystack (NGN).
 * Other countries route to Stripe in their checkout currency.
 */
import { detectVisitorCountry } from "./currency";
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
 * Nigeria uses Paystack. Other countries use Stripe.
 * Unknown locations use the shared currency detector's fallback.
 */
export function resolvePaymentGateway(countryCode?: string | null): PaymentGateway {
  const country = countryCode || getCachedVisitorGeo()?.country || detectVisitorCountry();
  return country.trim().toUpperCase() === "NG" ? "paystack" : "stripe";
}

/**
 * Asynchronously detect visitor's location and resolve payment gateway.
 */
export async function detectPaymentGateway(): Promise<PaymentGateway> {
  const geo = await getVisitorGeo();
  return resolvePaymentGateway(geo?.country);
}
