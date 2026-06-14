import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Scores a business lead 1-100 with a short rationale + recommended next step.
// Admin/moderator only. Appends the result to internal_notes on the lead row.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await supa.auth.getUser(auth.replace("Bearer ", ""));
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin
      .from("user_roles").select("role").eq("user_id", userRes.user.id).in("role", ["admin", "moderator"]);
    if (!roles?.length) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { leadId } = await req.json();
    if (!leadId) {
      return new Response(JSON.stringify({ error: "leadId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: lead } = await admin.from("business_leads").select("*").eq("id", leadId).maybeSingle();
    if (!lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You qualify B2B training leads for Silicon Edge (corporate AI/Cloud/DevOps training).
Score 1-100 based on: company size, clarity of training needs, industry relevance, contact seniority signals, and budget-readiness.
Return ONLY JSON: {"score": number 1-100, "tier": "hot"|"warm"|"cold", "rationale": string (1-2 sentences), "next_step": string (one concrete action)}.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              company_name: lead.company_name,
              contact_name: lead.contact_name,
              email: lead.email,
              phone: lead.phone,
              company_size: lead.company_size,
              industry: lead.industry,
              training_needs: lead.training_needs,
            }),
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!resp.ok) {
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const j = await resp.json();
    const raw = j.choices?.[0]?.message?.content ?? "{}";
    let result: { score?: number; tier?: string; rationale?: string; next_step?: string } = {};
    try { result = JSON.parse(raw); } catch { result = {}; }

    const stamp = `\n\n[AI qualify · ${new Date().toISOString().slice(0, 10)}] ${result.score ?? "?"}/100 (${result.tier ?? "?"}). ${result.rationale ?? ""} Next: ${result.next_step ?? "—"}`.trim();
    await admin.from("business_leads")
      .update({ internal_notes: ((lead.internal_notes ?? "") + stamp).slice(0, 8000) })
      .eq("id", leadId);

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});