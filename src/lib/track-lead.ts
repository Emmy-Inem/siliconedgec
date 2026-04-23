import { supabase } from "@/integrations/supabase/client";
import { getStoredUtmParams } from "@/hooks/useUtmTracking";

interface TrackLeadOptions {
  formType: string;
  formData?: Record<string, unknown>;
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

  await supabase.from("lead_sources").insert({
    user_id: user?.id ?? null,
    utm_source: utm.utm_source ?? null,
    utm_medium: utm.utm_medium ?? null,
    utm_campaign: utm.utm_campaign ?? null,
    utm_content: utm.utm_content ?? null,
    utm_term: utm.utm_term ?? null,
    landing_page: window.location.pathname,
    referrer: document.referrer || null,
    form_type: formType,
    form_data: normalized,
  } as any);
}
