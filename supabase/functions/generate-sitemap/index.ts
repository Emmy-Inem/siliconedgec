// Generate sitemap.xml dynamically from published courses
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const url = new URL(req.url);
    const baseUrl = url.searchParams.get("base") ?? "https://siliconedgec.com";

    const { data: courses } = await supabase
      .from("courses")
      .select("id, updated_at")
      .eq("is_published", true);

    const staticRoutes = ["/", "/courses", "/pricing", "/for-businesses", "/certificates", "/sign-in", "/sign-up"];
    const today = new Date().toISOString().split("T")[0];

    const urls = [
      ...staticRoutes.map((p) => `<url><loc>${baseUrl}${p}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq></url>`),
      ...(courses ?? []).map((c) =>
        `<url><loc>${baseUrl}/courses/${c.id}</loc><lastmod>${(c.updated_at ?? today).split("T")[0]}</lastmod><changefreq>weekly</changefreq></url>`),
    ].join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    return new Response(xml, {
      headers: { ...corsHeaders, "Content-Type": "application/xml" },
    });
  } catch (e) {
    return new Response(`Error: ${e}`, { status: 500, headers: corsHeaders });
  }
});
