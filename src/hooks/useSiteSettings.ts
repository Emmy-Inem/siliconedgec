import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  site_name: string;
  site_tagline: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  whatsapp_number: string;
  social_facebook: string;
  social_twitter: string;
  social_instagram: string;
  social_linkedin: string;
  social_youtube: string;
  footer_copyright: string;
}

const DEFAULTS: SiteSettings = {
  site_name: "Silicon Edge Consulting",
  site_tagline: "Empowering professionals with job-ready tech skills",
  contact_email: "info@siliconedgec.com",
  contact_phone: "+447741247592",
  contact_address: "3rd floor, 86-90, Paul Street, London, EC2A 4NE",
  whatsapp_number: "2348001234567",
  social_facebook: "",
  social_twitter: "",
  social_instagram: "",
  social_linkedin: "",
  social_youtube: "",
  footer_copyright: "",
};

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_content")
        .select("key, value")
        .eq("content_type", "setting");

      const settings = { ...DEFAULTS };
      (data ?? []).forEach((row) => {
        if (row.key in settings && row.value) {
          (settings as Record<string, string>)[row.key] = row.value;
        }
      });
      return settings;
    },
    staleTime: 5 * 60 * 1000,
  });
}
