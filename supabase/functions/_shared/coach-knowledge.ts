export interface CoachDocument { title: string; url: string; text: string }
const ORIGIN = "https://siliconedgec.com";
export const COMPANY_KNOWLEDGE: CoachDocument[] = [
  { title: "About Silicon Edge Consulting", url: `${ORIGIN}/about`, text: "Silicon Edge Consulting provides practical, project-driven IT training, live instructor-led cohorts and mentorship. Training areas include cloud engineering (AWS, Azure, Google Cloud), DevOps, AI/ML, cybersecurity, data engineering and software engineering. Do not guarantee employment, certification exam passes or salary outcomes." },
  { title: "Business training", url: `${ORIGIN}/for-businesses`, text: "Businesses can enquire about workforce training, tailored programmes and team learning. The business enquiry form is open without signing in. Ask about team size, skills, goals and preferred timing; the company confirms a proposal, availability and pricing." },
  { title: "Official contact", url: `${ORIGIN}/contact`, text: "Official WhatsApp: +44 7741 247592, https://wa.me/447741247592. Official website: https://siliconedgec.com. Direct questions requiring staff confirmation to the team. Never claim a message was sent unless a support ticket was actually created." },
  { title: "Checkout", url: `${ORIGIN}/pricing`, text: "The checkout chooses available payment services by local currency. Nigerian customers use naira. International customers should see their local currency, with clearly disclosed USD fallback when local-currency payment is unavailable. Do not quote naira prices to international visitors or calculate an unverified exchange rate. Direct users to the current displayed checkout total. Wallet eligibility depends on device, browser, currency and account setup; never promise universal Apple Pay or Google Pay availability." },
];

export function rankCoachDocuments(documents: CoachDocument[], question: string, pagePath: string): CoachDocument[] {
  const words: string[] = `${question} ${pagePath}`.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
  const score = (doc: CoachDocument) => {
    const haystack = `${doc.title} ${doc.text}`.toLowerCase();
    const path = new URL(doc.url).pathname;
    return (path === pagePath ? 100 : 0) + words.reduce((sum, word) => sum + (haystack.includes(word) ? 1 : 0), 0);
  };
  return [...documents].sort((a, b) => score(b) - score(a)).slice(0, 18);
}

/** Published content only; explicit columns prevent secrets and private records entering the shared cache. */
export async function loadPublicCoachDocuments(admin: any): Promise<CoachDocument[]> {
  const sources = [
    { table: "courses", columns: "id,title,slug,description,category,difficulty,duration_hours", filter: "is_published", value: true, path: "courses", text: (row: any) => `${row.description ?? ""} Category: ${row.category ?? ""}; level: ${row.difficulty ?? ""}; duration hours: ${row.duration_hours ?? "not published"}` },
    { table: "kb_articles", columns: "id,title,slug,body", filter: "is_published", value: true, path: "help", text: (row: any) => row.body },
    { table: "cms_pages", columns: "id,title,slug,content", filter: "status", value: "published", path: "p", text: (row: any) => row.content },
    { table: "blog_posts", columns: "id,title,slug,content,excerpt", filter: "status", value: "published", path: "blog", text: (row: any) => row.content || row.excerpt },
    { table: "learning_paths", columns: "id,title,description", filter: "is_published", value: true, path: "paths", text: (row: any) => row.description },
    { table: "instructors", columns: "id,name,role,bio", filter: null, value: null, path: "instructors", text: (row: any) => `${row.role ?? ""}. ${row.bio ?? ""}` },
    { table: "pricing_plans", columns: "id,name,features,period", filter: null, value: null, path: "pricing", text: (row: any) => `${row.period ?? ""}: ${(row.features ?? []).join("; ")}. Check current localized prices on the pricing page.` },
  ];
  const results = await Promise.all(sources.map(async source => {
    const docs: CoachDocument[] = [];
    for (let start = 0; start < 5000; start += 100) {
      let query = admin.from(source.table).select(source.columns);
      if (source.filter) query = query.eq(source.filter, source.value);
      const { data, error } = await query.order("id").range(start, start + 99);
      if (error) throw new Error(`Public coach source unavailable: ${source.table}`);
      for (const row of data ?? []) docs.push({ title: row.title || row.name, url: source.path === "pricing" ? `${ORIGIN}/pricing` : `${ORIGIN}/${source.path}/${encodeURIComponent(row.slug || row.id)}`, text: String(source.text(row) ?? "").replace(/<[^>]*>/g, " ").slice(0, 16000) });
      if (!data || data.length < 100) break;
    }
    return docs;
  }).map(promise => promise.catch(() => [])));
  return [...COMPANY_KNOWLEDGE, ...results.flat()];
}
