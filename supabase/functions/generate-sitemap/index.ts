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
    const baseUrl = "https://siliconedgec.com";

    const [
      { data: courses },
      { data: blogPosts },
      { data: categories },
      { data: paths },
      { data: cmsPages },
      { data: jobs },
      { data: instructors },
      { data: gone },
      { data: articles },
      { data: hidden },
    ] = await Promise.all([
      supabase.from("courses").select("id, slug, updated_at").eq("is_published", true),
      supabase.from("blog_posts").select("slug, updated_at").eq("status", "published"),
      supabase.from("categories").select("slug, created_at"),
      supabase.from("learning_paths").select("id, updated_at").eq("is_published", true),
      supabase.from("cms_pages").select("slug, updated_at").eq("status", "published"),
      supabase.from("jobs").select("id, updated_at").eq("is_published", true),
      supabase.from("instructors").select("id, updated_at"),
      supabase.from("gone_urls").select("path"),
      supabase.from("kb_articles").select("slug, updated_at").eq("is_published", true),
      supabase.from("page_seo").select("path").eq("no_index", true),
    ]);

    const gonePaths = new Set<string>([...(gone ?? []), ...(hidden ?? [])].map((g: any) => g.path));



    const staticRoutes: { path: string; priority: string; changefreq: string }[] = [
      { path: "/", priority: "1.0", changefreq: "daily" },
      { path: "/help", priority: "0.6", changefreq: "monthly" },
      { path: "/verify", priority: "0.5", changefreq: "monthly" },
      { path: "/courses", priority: "0.9", changefreq: "daily" },
      { path: "/blog", priority: "0.8", changefreq: "daily" },
      { path: "/pricing", priority: "0.8", changefreq: "weekly" },
      { path: "/paths", priority: "0.8", changefreq: "weekly" },
      { path: "/for-businesses", priority: "0.8", changefreq: "weekly" },
      { path: "/certificates", priority: "0.7", changefreq: "weekly" },
      { path: "/jobs", priority: "0.7", changefreq: "daily" },
      { path: "/about", priority: "0.7", changefreq: "monthly" },
      { path: "/instructors", priority: "0.7", changefreq: "weekly" },
      { path: "/testimonials", priority: "0.6", changefreq: "monthly" },
      { path: "/faq", priority: "0.6", changefreq: "monthly" },
      { path: "/contact", priority: "0.6", changefreq: "monthly" },
      { path: "/career", priority: "0.6", changefreq: "monthly" },
      { path: "/trust", priority: "0.5", changefreq: "monthly" },
      { path: "/terms", priority: "0.5", changefreq: "monthly" },
      { path: "/privacy", priority: "0.5", changefreq: "monthly" },
      { path: "/refund-policy", priority: "0.5", changefreq: "monthly" },
      { path: "/cookie-policy", priority: "0.5", changefreq: "monthly" },
      { path: "/locations", priority: "0.7", changefreq: "monthly" },
      { path: "/locations/london", priority: "0.7", changefreq: "monthly" },
      { path: "/locations/manchester", priority: "0.7", changefreq: "monthly" },
      { path: "/locations/birmingham", priority: "0.7", changefreq: "monthly" },
      { path: "/locations/leeds", priority: "0.7", changefreq: "monthly" },
      { path: "/locations/glasgow", priority: "0.7", changefreq: "monthly" },
      { path: "/locations/edinburgh", priority: "0.7", changefreq: "monthly" },
      { path: "/locations/dublin", priority: "0.7", changefreq: "monthly" },
      { path: "/locations/amsterdam", priority: "0.7", changefreq: "monthly" },
      { path: "/locations/berlin", priority: "0.7", changefreq: "monthly" },
      { path: "/locations/paris", priority: "0.7", changefreq: "monthly" },
      { path: "/locations/lisbon", priority: "0.7", changefreq: "monthly" },
    ];

    const entry = (loc: string, lastmod: string | undefined, changefreq: string, priority: string) =>
      `<url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;

    const all: { loc: string; lastmod?: string; cf: string; pr: string; path: string }[] = [
      ...staticRoutes.map((r) => ({ loc: `${baseUrl}${r.path}`, lastmod: undefined, cf: r.changefreq, pr: r.priority, path: r.path })),
      ...(courses ?? []).map((c: any) => {
        const slugOrId = c.slug || c.id;
        return { loc: `${baseUrl}/courses/${slugOrId}`, lastmod: c.updated_at?.split("T")[0], cf: "weekly", pr: "0.8", path: `/courses/${slugOrId}` };
      }),
      ...(blogPosts ?? []).map((b: any) => ({ loc: `${baseUrl}/blog/${b.slug}`, lastmod: b.updated_at?.split("T")[0], cf: "monthly", pr: "0.7", path: `/blog/${b.slug}` })),
      ...(categories ?? []).map((cat: any) => ({ loc: `${baseUrl}/category/${cat.slug}`, lastmod: undefined, cf: "weekly", pr: "0.7", path: `/category/${cat.slug}` })),
      ...(paths ?? []).map((p: any) => ({ loc: `${baseUrl}/paths/${p.id}`, lastmod: p.updated_at?.split("T")[0], cf: "weekly", pr: "0.7", path: `/paths/${p.id}` })),
      ...(jobs ?? []).map((j: any) => ({ loc: `${baseUrl}/jobs/${j.id}`, lastmod: j.updated_at?.split("T")[0], cf: "weekly", pr: "0.6", path: `/jobs/${j.id}` })),
      ...(instructors ?? []).map((i: any) => ({ loc: `${baseUrl}/instructors/${i.id}`, lastmod: i.updated_at?.split("T")[0], cf: "monthly", pr: "0.5", path: `/instructors/${i.id}` })),
      ...(cmsPages ?? []).filter((p: any) => !["about", "privacy", "terms", "refund"].includes(p.slug)).map((p: any) => ({ loc: `${baseUrl}/p/${p.slug}`, lastmod: p.updated_at?.split("T")[0], cf: "monthly", pr: "0.6", path: `/p/${p.slug}` })),
      ...(articles ?? []).map((a: any) => ({ loc: `${baseUrl}/help/${a.slug}`, lastmod: a.updated_at?.split("T")[0], cf: "monthly", pr: "0.6", path: `/help/${a.slug}` })),
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
