import { supabase } from "@/integrations/supabase/client";
import { getStoredUtmParams } from "@/hooks/useUtmTracking";
import { getCachedVisitorGeo, getVisitorGeo } from "@/lib/geo";
import { z } from "zod";

interface TrackLeadOptions {
  formType: string;
  formData?: Record<string, unknown>;
}

/**
 * Schema validation for the lead row that hits Supabase. We deliberately keep
 * UTM fields nullable strings (campaigns sometimes ship with `utm_source=`)
 * but enforce length caps so noisy/malformed inputs can't bloat the DB.
 * `form_type` must be a short snake-cased identifier so the QA dashboard's
 * grouping stays readable.
 */
const LEAD_FORM_TYPE_RE = /^[a-z0-9_:-]{2,48}$/;

const utmField = z.string().trim().min(1).max(255).nullable().optional();

const leadRowSchema = z.object({
  user_id: z.string().uuid().nullable(),
  utm_source: utmField,
  utm_medium: utmField,
  utm_campaign: utmField,
  utm_content: utmField,
  utm_term: utmField,
  landing_page: z.string().max(2048).nullable(),
  referrer: z.string().max(2048).nullable(),
  form_type: z.string().regex(LEAD_FORM_TYPE_RE, "form_type must be snake_case (2-48 chars)"),
  form_data: z.record(z.unknown()),
});

function clampString(v: unknown, max: number): string | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v);
  return s.length > max ? s.slice(0, max) : s;
}

/**
 * Persist a lead/conversion event with the currently-known UTM attribution.
 * Standardizes on `course_id` (snake_case) inside form_data — callers that pass
 * `courseId` will be normalized for downstream reporting joins.
 */
export async function trackLead({ formType, formData = {} }: TrackLeadOptions) {
  const utm = getStoredUtmParams();
  const { data: { user } } = await supabase.auth.getUser();

  // Best-effort visitor geo — never block the call if the lookup hasn't
  // resolved yet. We fire-and-forget the warm-up and use whatever's cached.
  let geo = getCachedVisitorGeo();
  if (!geo) {
    // Kick off the lookup so the *next* event has it; don't await on first call.
    void getVisitorGeo();
  }

  // Normalize course id key + strip duplicate utm_* fields callers may have added
  const normalized: Record<string, unknown> = { ...formData };
  if (normalized.courseId && !normalized.course_id) {
    normalized.course_id = normalized.courseId;
  }
  delete normalized.courseId;
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((k) => {
    if (normalized[k] === undefined || normalized[k] === null || normalized[k] === "") delete normalized[k];
  });

  // Attach geo/device metadata once, in a consistent shape, so the admin
  // analytics dashboard can compute real country / device breakdowns.
  if (geo && geo.country && normalized.country === undefined) {
    normalized.country = geo.country;
    if (geo.region) normalized.region = geo.region;
    if (geo.city) normalized.city = geo.city;
    normalized.geo_source = geo.source;
  }
  if (typeof navigator !== "undefined") {
    if (normalized.user_agent === undefined) normalized.user_agent = navigator.userAgent;
    if (normalized.language === undefined) normalized.language = navigator.language;
  }
  if (typeof window !== "undefined" && normalized.screen_w === undefined) {
    normalized.screen_w = window.innerWidth;
  }

  const candidate = {
    user_id: user?.id ?? null,
    utm_source: clampString(utm.utm_source, 255),
    utm_medium: clampString(utm.utm_medium, 255),
    utm_campaign: clampString(utm.utm_campaign, 255),
    utm_content: clampString(utm.utm_content, 255),
    utm_term: clampString(utm.utm_term, 255),
    landing_page: clampString(window.location.pathname, 2048),
    referrer: clampString(document.referrer, 2048),
    form_type: formType,
    form_data: normalized,
  };

  const parsed = leadRowSchema.safeParse(candidate);
  if (!parsed.success) {
    // Never throw — tracking failures must not break UX. Log for QA visibility.
    if (typeof console !== "undefined") {
      console.warn("[trackLead] dropped invalid lead row", {
        formType,
        issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      });
    }
    return;
  }

  // iOS Safari + Android Chrome aggressively suspend background tabs on
  // navigation, which can drop in-flight fetches. We POST directly to the
  // Supabase REST endpoint with `keepalive: true` so the browser commits
  // the request even if the page is unloading. We fall back to the SDK on
  // any error so existing behaviour is preserved.
  await sendKeepalive(parsed.data).catch(async () => {
    try { await supabase.from("lead_sources").insert(parsed.data as any); } catch { /* swallow */ }
  });
}

async function sendKeepalive(row: Record<string, unknown>) {
  const url = (import.meta.env.VITE_SUPABASE_URL || "") + "/rest/v1/lead_sources";
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  if (!url || !key) throw new Error("missing-supabase-env");

  // Pull the current access token (if any) so RLS still attributes the row.
  let authHeader: string = `Bearer ${key}`;
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) authHeader = `Bearer ${data.session.access_token}`;
  } catch { /* anon is fine */ }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: authHeader,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
    keepalive: true, // critical for iOS/Android navigation handoff
    credentials: "omit",
  });
  if (!res.ok) throw new Error(`lead_sources insert failed: ${res.status}`);
}
