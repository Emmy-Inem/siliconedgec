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

async function generate() {
  let courses = [];
  let blogPosts = [];
  let categories = [];

  if (supabase) {
    try {
      const results = await Promise.all([
        supabase.from('courses').select('id, slug, updated_at').eq('is_published', true),
        supabase.from('blog_posts').select('slug, updated_at').eq('status', 'published'),
        supabase.from('categories').select('slug, created_at'),
      ]);
      if (results.some((r) => r.error)) throw new Error(results.find((r) => r.error).error.message);
      courses = results[0].data || [];
      blogPosts = results[1].data || [];
      categories = results[2].data || [];
    } catch (e) {
      console.warn('Sitemap: dynamic routes skipped —', e.message);
    }
  } else {
    console.warn('Sitemap: no Supabase key available, generating static routes only.');
  }

  // Safety net: if the database was unreachable, keep the dynamic URLs from the
  // existing sitemap rather than silently dropping every course/blog/category page.
  const sitemapPath = path.resolve(__dirname, '../public/sitemap.xml');
  let preservedDynamic = [];
  if (!courses.length && !blogPosts.length && !categories.length && fs.existsSync(sitemapPath)) {
    const existing = fs.readFileSync(sitemapPath, 'utf8');
    preservedDynamic = (existing.match(/^\s*<url>.*<\/url>\s*$/gm) || [])
      .map((l) => l.trim())
      .filter((l) => /<loc>https:\/\/siliconedgec\.com\/(courses|blog|category)\/[^<]+<\/loc>/.test(l));
    if (preservedDynamic.length) {
      console.warn(`Sitemap: preserved ${preservedDynamic.length} dynamic URLs from the existing sitemap.`);
    }
  }

  const baseUrl = 'https://siliconedgec.com';
  const today = new Date().toISOString().split('T')[0];

  const staticRoutes = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
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
  ];

  const entry = (loc, lastmod, changefreq, priority) =>
    `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;

  const all = [
    ...staticRoutes.map((r) => entry(`${baseUrl}${r.path}`, today, r.changefreq, r.priority)),
    ...(courses || []).map((c) => {
      const slugOrId = c.slug || c.id;
      const lastmod = (c.updated_at || today).split('T')[0];
      return entry(`${baseUrl}/courses/${slugOrId}`, lastmod, 'weekly', '0.8');
    }),
    ...(blogPosts || []).map((b) => {
      const lastmod = (b.updated_at || today).split('T')[0];
      return entry(`${baseUrl}/blog/${b.slug}`, lastmod, 'monthly', '0.7');
    }),
    ...(categories || []).map((cat) => {
      return entry(`${baseUrl}/category/${cat.slug}`, today, 'weekly', '0.7');
    }),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...all, ...preservedDynamic].join('\n')}
</urlset>
`;

  fs.writeFileSync(sitemapPath, xml, 'utf8');
  console.log(`Generated sitemap with ${all.length} URLs at ${sitemapPath}`);
}

generate().catch(console.error);
