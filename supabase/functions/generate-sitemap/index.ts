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

    const [{ data: courses }, { data: cmsPages }, { data: jobs }, { data: instructors }] = await Promise.all([
      supabase.from("courses").select("id, updated_at").eq("is_published", true),
      supabase.from("cms_pages").select("slug, updated_at").eq("status", "published"),
      supabase.from("jobs").select("id, updated_at").eq("is_published", true),
      supabase.from("instructors").select("id, updated_at"),
    ]);

    const today = new Date().toISOString().split("T")[0];

    const staticRoutes: { path: string; priority: string; changefreq: string }[] = [
      { path: "/", priority: "1.0", changefreq: "daily" },
      { path: "/courses", priority: "0.9", changefreq: "daily" },
      { path: "/pricing", priority: "0.8", changefreq: "weekly" },
      { path: "/for-businesses", priority: "0.8", changefreq: "weekly" },
      { path: "/certificates", priority: "0.7", changefreq: "weekly" },
      { path: "/jobs", priority: "0.7", changefreq: "daily" },
      { path: "/sign-in", priority: "0.3", changefreq: "monthly" },
      { path: "/sign-up", priority: "0.5", changefreq: "monthly" },
    ];

    const entry = (loc: string, lastmod: string, changefreq: string, priority: string) =>
      `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;

    const urls = [
      ...staticRoutes.map((r) => entry(`${baseUrl}${r.path}`, today, r.changefreq, r.priority)),
      ...(courses ?? []).map((c: any) =>
        entry(`${baseUrl}/courses/${c.id}`, (c.updated_at ?? today).split("T")[0], "weekly", "0.8")),
      ...(cmsPages ?? []).map((p: any) =>
        entry(`${baseUrl}/p/${p.slug}`, (p.updated_at ?? today).split("T")[0], "monthly", "0.5")),
      ...(jobs ?? []).map((j: any) =>
        entry(`${baseUrl}/jobs/${j.id}`, (j.updated_at ?? today).split("T")[0], "weekly", "0.6")),
      ...(instructors ?? []).map((i: any) =>
        entry(`${baseUrl}/instructors/${i.id}`, (i.updated_at ?? today).split("T")[0], "monthly", "0.5")),
    ].join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    return new Response(xml, {
      headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
    });
  } catch (e) {
    return new Response(`Error: ${e}`, { status: 500, headers: corsHeaders });
  }
});
