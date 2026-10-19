const BASE_URL = 'https://siliconedgec.com';
const ALIASES = new Set(['about', 'privacy', 'terms', 'refund']);
function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}
function renderEntry(path, lastmod, changefreq = 'weekly', priority = '0.7') {
  const date = lastmod && /^\d{4}-\d{2}-\d{2}/.test(lastmod) ? lastmod.split('T')[0] : null;
  return `  <url><loc>${escapeXml(BASE_URL + path)}</loc>${date ? `<lastmod>${date}</lastmod>` : ''}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}
function preservedEntries(xml, prefix) {
  return (xml.match(/<url>[\s\S]*?<\/url>/g) || []).filter((entry) => entry.includes(`<loc>${BASE_URL}${prefix}/`));
}
function cmsPath(slug) {
  return ALIASES.has(slug) ? null : `/p/${slug}`;
}
async function fetchAll(makeQuery) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await makeQuery().range(offset, offset + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}
module.exports = { BASE_URL, renderEntry, preservedEntries, cmsPath, fetchAll };