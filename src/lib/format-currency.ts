/**
 * Format a number as Nigerian Naira (₦).
 * e.g. 600000 → "₦600,000"
 */
export function formatNaira(amount: number): string {
  if (amount === 0) return "Free";
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
