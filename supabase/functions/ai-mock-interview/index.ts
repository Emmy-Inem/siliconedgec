import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace("Bearer ", "");
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: ur } = await supa.auth.getUser(token);
    if (!ur?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({} as any));
    const action: "start" | "answer" | "finish" = body.action ?? "start";
    const role: string = (body.role ?? "Software Engineer").toString().slice(0, 120);
    const level: string = (body.level ?? "mid").toString().slice(0, 40);
    const history: { q: string; a: string }[] = Array.isArray(body.history) ? body.history.slice(0, 10) : [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    let sys = "";
    if (action === "start" || action === "answer") {
      sys = `You are a friendly senior interviewer for a ${level} ${role} role. Ask ONE concise question at a time (max 2 sentences). After the candidate answers, give brief 1-paragraph feedback then ask the next question. Output JSON only: { "feedback": string|null, "question": string }. On the first turn feedback must be null.`;
    } else {
      sys = `You are an interview coach. Given the full Q&A history below, output JSON: { "score": number 0-100, "strengths": string[], "improvements": string[], "summary": string }. Be specific and kind.`;
    }

    const userBlock = action === "finish"
      ? `Role: ${role} (${level})\nHistory: ${JSON.stringify(history)}`
      : `Role: ${role} (${level})\nPrevious Q&A: ${JSON.stringify(history)}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: sys }, { role: "user", content: userBlock }],
      }),
    });
    if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!r.ok) return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const j = await r.json();
    const raw = j.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { question: raw }; }
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});