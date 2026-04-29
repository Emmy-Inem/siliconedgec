import { supabase } from "@/integrations/supabase/client";
import { getStoredUtmParams } from "@/hooks/useUtmTracking";
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

  // Normalize course id key + strip duplicate utm_* fields callers may have added
  const normalized: Record<string, unknown> = { ...formData };
  if (normalized.courseId && !normalized.course_id) {
    normalized.course_id = normalized.courseId;
  }
  delete normalized.courseId;
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((k) => {
    if (normalized[k] === undefined || normalized[k] === null || normalized[k] === "") delete normalized[k];
  });

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

  await supabase.from("lead_sources").insert(parsed.data as any);
}
