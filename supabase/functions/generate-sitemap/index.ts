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

    const [
      { data: courses },
      { data: cmsPages },
      { data: jobs },
      { data: instructors },
      { data: gone },
    ] = await Promise.all([
      supabase.from("courses").select("id, updated_at").eq("is_published", true),
      supabase.from("cms_pages").select("slug, updated_at").eq("status", "published"),
      supabase.from("jobs").select("id, updated_at").eq("is_published", true),
      supabase.from("instructors").select("id, updated_at"),
      supabase.from("gone_urls").select("path"),
    ]);

    const gonePaths = new Set<string>((gone ?? []).map((g: any) => g.path));

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

    const all: { loc: string; lastmod: string; cf: string; pr: string; path: string }[] = [
      ...staticRoutes.map((r) => ({ loc: `${baseUrl}${r.path}`, lastmod: today, cf: r.changefreq, pr: r.priority, path: r.path })),
      ...(courses ?? []).map((c: any) => ({ loc: `${baseUrl}/courses/${c.id}`, lastmod: (c.updated_at ?? today).split("T")[0], cf: "weekly", pr: "0.8", path: `/courses/${c.id}` })),
      ...(cmsPages ?? []).map((p: any) => ({ loc: `${baseUrl}/p/${p.slug}`, lastmod: (p.updated_at ?? today).split("T")[0], cf: "monthly", pr: "0.5", path: `/p/${p.slug}` })),
      ...(jobs ?? []).map((j: any) => ({ loc: `${baseUrl}/jobs/${j.id}`, lastmod: (j.updated_at ?? today).split("T")[0], cf: "weekly", pr: "0.6", path: `/jobs/${j.id}` })),
      ...(instructors ?? []).map((i: any) => ({ loc: `${baseUrl}/instructors/${i.id}`, lastmod: (i.updated_at ?? today).split("T")[0], cf: "monthly", pr: "0.5", path: `/instructors/${i.id}` })),
    ];

    const urls = all
      .filter((u) => !gonePaths.has(u.path))
      .map((u) => entry(u.loc, u.lastmod, u.cf, u.pr))
      .join("\n");

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
