import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function RedirectInfluencer() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      if (!slug) { navigate("/courses", { replace: true }); return; }
      const { data } = await (supabase.from("promo_codes") as any)
        .select("code, influencer_name, is_active, landing_path")
        .eq("slug", slug.toLowerCase())
        .eq("is_active", true)
        .maybeSingle();

      if (data) {
        // Store UTMs (read by useUtmTracking via localStorage)
        const utm = {
          utm_source: data.influencer_name,
          utm_medium: "influencer",
          utm_campaign: data.code,
          utm_content: slug,
          captured_at: new Date().toISOString(),
        };
        localStorage.setItem("utm_attribution", JSON.stringify(utm));
        sessionStorage.setItem("pending_promo", data.code);
      }

      const courseParam = params.get("course");
      const destination = courseParam
        ? `/courses/${courseParam}`
        : (data?.landing_path && data.landing_path.startsWith("/") ? data.landing_path : "/courses");
      navigate(destination, { replace: true });
    };
    run();
  }, [slug, navigate, params]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}