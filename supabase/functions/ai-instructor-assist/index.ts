import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace("Bearer ", "");
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: ur } = await supa.auth.getUser(token);
    if (!ur?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const rl = checkRateLimit({
      key: `ai-instructor:${ur.user.id}`,
      limit: 30,
      windowMs: 60 * 1000,
    });
    if (!rl.allowed) return rateLimitResponse(rl.retryAfter, corsHeaders);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", ur.user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "moderator");
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({} as any));
    const action: "outline" | "lesson_script" | "answer_qna" | "grade_assignment" = body.action ?? "outline";
    const ctx = (body.context ?? "").toString().slice(0, 8000);

    const sysMap: Record<string, string> = {
      outline: "You produce concise course outlines. Output JSON: { modules: [{ title, lessons: [{ title, summary, duration_min }] }] }.",
      lesson_script: "You write engaging lesson scripts. Output JSON: { intro, sections: [{ heading, body }], summary, practice: string[] }.",
      answer_qna: "You answer a student question for an instructor to review. Output JSON: { draft_answer: string, sources: string[] }.",
      grade_assignment: "You grade an assignment fairly. Output JSON: { score: number 0-100, feedback: string, rubric: { criterion: string, score: number }[] }.",
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: sysMap[action] }, { role: "user", content: ctx }],
      }),
    });
    if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!r.ok) return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const j = await r.json();
    const raw = j.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { output: raw }; }
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});