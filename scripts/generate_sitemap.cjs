const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
let supabaseUrl = 'https://sdddxnjlgjjaoayyraxn.supabase.co';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL=([^\r\n]+)/);
  const keyMatch = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY=([^\r\n]+)/);
  if (urlMatch) supabaseUrl = urlMatch[1].trim().replace(/["']/g, '');
  if (keyMatch) supabaseKey = keyMatch[1].trim().replace(/["']/g, '');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generate() {
  const [{ data: courses }, { data: blogPosts }, { data: categories }] = await Promise.all([
    supabase.from('courses').select('id, slug, updated_at').eq('is_published', true),
    supabase.from('blog_posts').select('slug, updated_at').eq('status', 'published'),
    supabase.from('categories').select('slug, created_at'),
  ]);

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
${all.join('\n')}
</urlset>
`;

  const sitemapPath = path.resolve(__dirname, '../public/sitemap.xml');
  fs.writeFileSync(sitemapPath, xml, 'utf8');
  console.log(`Generated sitemap with ${all.length} URLs at ${sitemapPath}`);
}

generate().catch(console.error);
