import { describe, expect, it, vi } from "vitest";
import { COACH_WHATSAPP_URL, getCoachContext } from "@/lib/coach-context";
import { loadPublicCoachDocuments, rankCoachDocuments } from "../../supabase/functions/_shared/coach-knowledge";

describe("page-aware coach", () => {
  it("offers distinct actions for business enquiries, courses and checkout", () => {
    const business = getCoachContext("/for-businesses");
    expect(business.greeting).toContain("do not require an account");
    expect(business.suggestions).not.toEqual(getCoachContext("/courses/cloud").suggestions);
    expect(getCoachContext("/cart").suggestions[0]).toContain("payment");
    expect(COACH_WHATSAPP_URL).toBe("https://wa.me/447741247592");
  });
  it("omits query tokens from page context", () => {
    expect(getCoachContext("/cart?session_id=private#token").path).toBe("/cart");
  });
  it("prioritises the current course over a different course sharing keywords", () => {
    const docs = [
      { title: "Cloud advanced", url: "https://siliconedgec.com/courses/advanced", text: "cloud projects cloud" },
      { title: "Cloud beginner", url: "https://siliconedgec.com/courses/beginner", text: "beginner" },
    ];
    expect(rankCoachDocuments(docs, "what projects are in this course", "/courses/beginner")[0].title).toBe("Cloud beginner");
  });
  it("reads only approved public sources, paginates and preserves other sources on an outage", async () => {
    const calls: any[] = [];
    const admin = { from: vi.fn((table: string) => {
      const call: any = { table, filters: [] }; calls.push(call);
      const query = {
        select: (columns: string) => { call.columns = columns; return query; },
        eq: (key: string, value: unknown) => { call.filters.push([key, value]); return query; },
        order: () => query,
        range: async (start: number) => {
          if (table === "cms_pages") return { error: new Error("unavailable") };
          if (table !== "courses") return { data: [] };
          return { data: start === 0 ? Array.from({ length: 100 }, (_, id) => ({ id: String(id), title: "Published", description: "public" })) : [{ id: "last", slug: "last", title: "Last course", description: "<p>Last public course</p>" }] };
        },
      };
      return query;
    }) };
    const documents = await loadPublicCoachDocuments(admin);
    expect(documents.some(doc => doc.title === "Last course")).toBe(true);
    expect(calls.filter(call => call.table === "courses")).toHaveLength(2);
    expect(calls[0].filters).toEqual([["is_published", true]]);
    expect(calls.find(call => call.table === "blog_posts").filters).toEqual([["status", "published"]]);
    expect(calls.some(call => /secret|site_content|orders|enrollments|business_leads|chat_messages/.test(call.table))).toBe(false);
    expect(documents.find(doc => doc.title === "Last course")?.text).not.toContain("<p>");
  });
});
