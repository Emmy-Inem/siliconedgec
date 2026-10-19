const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
let supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sdddxnjlgjjaoayyraxn.supabase.co';
let supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL=([^\r\n]+)/);
  const keyMatch = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY=([^\r\n]+)/);
  if (urlMatch) supabaseUrl = urlMatch[1].trim().replace(/["']/g, '');
  if (keyMatch) supabaseKey = keyMatch[1].trim().replace(/["']/g, '');
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const { renderEntry, preservedEntries, cmsPath, fetchAll } = require('./sitemap-utils.cjs');

async function generate() {
  const sitemapPath = path.resolve(__dirname, '../public/sitemap.xml');
  const existing = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, 'utf8') : '';
  const staticRoutes = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/help', priority: '0.6', changefreq: 'monthly' },
    { path: '/verify', priority: '0.5', changefreq: 'monthly' },
    { path: '/courses', priority: '0.9', changefreq: 'daily' },
    { path: '/blog', priority: '0.8', changefreq: 'daily' },
    { path: '/pricing', priority: '0.8', changefreq: 'weekly' },
    { path: '/paths', priority: '0.8', changefreq: 'weekly' },
    { path: '/for-businesses', priority: '0.8', changefreq: 'weekly' },
    { path: '/certificates', priority: '0.7', changefreq: 'weekly' },
    { path: '/jobs', priority: '0.7', changefreq: 'daily' },
    { path: '/about', priority: '0.7', changefreq: 'monthly' },
    { path: '/instructors', priority: '0.7', changefreq: 'weekly' },
    { path: '/testimonials', priority: '0.6', changefreq: 'monthly' },
    { path: '/faq', priority: '0.6', changefreq: 'monthly' },
    { path: '/contact', priority: '0.6', changefreq: 'monthly' },
    { path: '/career', priority: '0.6', changefreq: 'monthly' },
    { path: '/trust', priority: '0.5', changefreq: 'monthly' },
    { path: '/terms', priority: '0.5', changefreq: 'monthly' },
    { path: '/privacy', priority: '0.5', changefreq: 'monthly' },
    { path: '/refund-policy', priority: '0.5', changefreq: 'monthly' },
    { path: '/cookie-policy', priority: '0.5', changefreq: 'monthly' },
    { path: '/locations', priority: '0.7', changefreq: 'monthly' },
    { path: '/locations/london', priority: '0.7', changefreq: 'monthly' },
    { path: '/locations/manchester', priority: '0.7', changefreq: 'monthly' },
    { path: '/locations/birmingham', priority: '0.7', changefreq: 'monthly' },
    { path: '/locations/leeds', priority: '0.7', changefreq: 'monthly' },
    { path: '/locations/glasgow', priority: '0.7', changefreq: 'monthly' },
    { path: '/locations/edinburgh', priority: '0.7', changefreq: 'monthly' },
    { path: '/locations/dublin', priority: '0.7', changefreq: 'monthly' },
    { path: '/locations/amsterdam', priority: '0.7', changefreq: 'monthly' },
    { path: '/locations/berlin', priority: '0.7', changefreq: 'monthly' },
    { path: '/locations/paris', priority: '0.7', changefreq: 'monthly' },
    { path: '/locations/lisbon', priority: '0.7', changefreq: 'monthly' },
  ];

  const sources = [
    { table: 'courses', columns: 'id, slug, updated_at', filter: ['is_published', true], prefix: '/courses', path: (r) => `/courses/${r.slug || r.id}` },
    { table: 'blog_posts', columns: 'slug, updated_at', filter: ['status', 'published'], prefix: '/blog', path: (r) => `/blog/${r.slug}` },
    { table: 'categories', columns: 'id, slug', prefix: '/category', path: (r) => `/category/${r.slug}` },
    { table: 'learning_paths', columns: 'id, updated_at', filter: ['is_published', true], prefix: '/paths', path: (r) => `/paths/${r.id}` },
    { table: 'jobs', columns: 'id, updated_at', filter: ['is_published', true], prefix: '/jobs', path: (r) => `/jobs/${r.id}` },
    { table: 'instructors', columns: 'id, updated_at', prefix: '/instructors', path: (r) => `/instructors/${r.id}` },
    { table: 'cms_pages', columns: 'id, slug, updated_at', filter: ['status', 'published'], prefix: '/p', path: (r) => cmsPath(r.slug) },
    { table: 'kb_articles', columns: 'id, slug, updated_at', filter: ['is_published', true], prefix: '/help', path: (r) => `/help/${r.slug}` },
  ];
  const dynamic = await Promise.all(sources.map(async (source) => {
    try {
      if (!supabase) throw new Error('Database unavailable');
      const rows = await fetchAll(() => {
        let query = supabase.from(source.table).select(source.columns).order('id');
        if (source.filter) query = query.eq(...source.filter);
        return query;
      });
      return rows.flatMap((row) => {
        const route = source.path(row);
        return route ? [renderEntry(route, row.updated_at)] : [];
      });
    } catch {
      console.warn(`Sitemap: preserving unavailable ${source.table} source.`);
      return preservedEntries(existing, source.prefix);
    }
  }));
  let excluded = new Set();
  if (supabase) {
    try {
      const [gone, seo] = await Promise.all([
        fetchAll(() => supabase.from('gone_urls').select('id, path').order('id')),
        fetchAll(() => supabase.from('page_seo').select('id, path').eq('no_index', true).order('id')),
      ]);
      excluded = new Set([...gone, ...seo].map((row) => row.path));
    } catch { console.warn('Sitemap: exclusion lookup unavailable.'); }
  }
  const urls = new Map();
  for (const entry of [...staticRoutes.map((r) => renderEntry(r.path, undefined, r.changefreq, r.priority)), ...dynamic.flat()]) {
    const loc = entry.match(/<loc>([^<]+)<\/loc>/)?.[1];
    if (loc && !excluded.has(loc.replace('https://siliconedgec.com', ''))) urls.set(loc, entry);
  }
  fs.writeFileSync(sitemapPath, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...urls.values()].join('\n')}
</urlset>
`);
  console.log(`Generated sitemap with ${urls.size} URLs.`);
}
if (require.main === module) generate().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { generate };
