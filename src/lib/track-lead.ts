import { supabase } from "@/integrations/supabase/client";
import { getStoredUtmParams } from "@/hooks/useUtmTracking";

interface TrackLeadOptions {
  formType: string;
  formData?: Record<string, unknown>;
}

export async function trackLead({ formType, formData = {} }: TrackLeadOptions) {
  const utm = getStoredUtmParams();
  const { data: { user } } = await supabase.auth.getUser();

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
    form_data: formData,
  } as any);
}
