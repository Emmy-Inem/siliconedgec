import { supabase } from "@/integrations/supabase/client";
import { googleAdsConversion } from "@/lib/analytics";

export type EnquiryType = "contact" | "business" | "course";
const ATTR_KEYS = ["gclid", "gbraid", "wbraid", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

/** Campaign attribution only — never personal data. */
export function collectAttribution(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const stored = JSON.parse(localStorage.getItem("sec_utm_params") || "{}");
    const s = stored?.value ?? stored ?? {};
    ATTR_KEYS.forEach((k) => { if (typeof s[k] === "string" && s[k]) out[k] = s[k].slice(0, 200); });
  } catch { /* ignore */ }
  try {
    const url = new URLSearchParams(window.location.search);
    ATTR_KEYS.forEach((k) => { const v = url.get(k); if (v) out[k] = v.slice(0, 200); });
    if (out.gclid) sessionStorage.setItem("sec_gclid", out.gclid);
    else { const g = sessionStorage.getItem("sec_gclid"); if (g) out.gclid = g; }
    out.landing_path = window.location.pathname.slice(0, 200);
  } catch { /* ignore */ }
  return out;
}

export function newSubmissionKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Test entries: an address/name explicitly marked as a test never counts as a genuine lead. */
export function isTestEnquiry(name: string, email: string) {
  return /\[test\]/i.test(name) || /\+test@/i.test(email);
}

const MESSAGES: Record<string, string> = {
  rate_limited: "You've sent several enquiries in a short time. Please wait a few minutes and try again.",
  invalid_phone: "Please enter your phone number in international format, e.g. +234 801 234 5678.",
  invalid_email: "Please enter a valid email address.",
};

export async function submitEnquiry(
  type: EnquiryType,
  fields: Record<string, unknown>,
  submissionKey: string,
): Promise<{ id: string; duplicate: boolean }> {
  const name = String(fields.contact_name ?? "");
  const email = String(fields.email ?? "");
  const { data, error } = await (supabase.rpc as any)("submit_enquiry", {
    p: {
      ...fields,
      lead_type: type,
      submission_key: submissionKey,
      source_page: typeof window !== "undefined" ? window.location.pathname : null,
      attribution: collectAttribution(),
      is_test: isTestEnquiry(name, email),
    },
  });
  if (error) {
    const code = Object.keys(MESSAGES).find((k) => error.message?.includes(k));
    throw new Error(code ? MESSAGES[code] : "We couldn't save your enquiry. Please check your details and try again.");
  }
  const res = data as { id: string; duplicate: boolean };
  // Fire-and-forget side channels; never affect the saved enquiry.
  if (!res.duplicate) {
    supabase.functions.invoke("notify-business-lead", { body: { lead_id: res.id } }).catch(() => {});
  }
  return res;
}

/** Exactly one Lead conversion per newly persisted enquiry. */
export function trackLeadOnce(res: { id: string; duplicate: boolean }, formType: string) {
  if (res.duplicate) return;
  try {
    googleAdsConversion("Lead", { value: 0, currency: "GBP", form_type: formType, transaction_id: `lead-${res.id}` });
  } catch { /* Tracking must never affect a saved enquiry. */ }
}
