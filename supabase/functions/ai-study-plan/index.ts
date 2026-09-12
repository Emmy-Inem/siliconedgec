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
    const userId = ur.user.id;

    // Rate limit: max 15 study plans per minute per user
    const rl = checkRateLimit({
      key: `ai-study-plan:${userId}`,
      limit: 15,
      windowMs: 60 * 1000,
    });
    if (!rl.allowed) return rateLimitResponse(rl.retryAfter, corsHeaders);

    const { courseId, hoursPerWeek, targetDate } = await req.json();
    if (!courseId || !hoursPerWeek) return new Response(JSON.stringify({ error: "courseId and hoursPerWeek required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: course } = await admin.from("courses").select("title, category, difficulty, duration_hours, description").eq("id", courseId).maybeSingle();
    const { data: modules } = await admin.from("modules").select("id, title, order_index").eq("course_id", courseId).order("order_index");
    const modIds = (modules ?? []).map((m) => m.id);
    const { data: lessons } = modIds.length ? await admin.from("lessons").select("title, module_id, order_index").in("module_id", modIds).order("order_index") : { data: [] };
    const outline = (modules ?? []).map((m) => ({ module: m.title, lessons: (lessons ?? []).filter((l: any) => l.module_id === m.id).map((l: any) => l.title) }));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You build practical week-by-week study plans for IT learners. Keep tasks concrete and friendly." },
          { role: "user", content: `Course: ${course?.title} (${course?.category}, ${course?.difficulty})\nTotal hours: ${course?.duration_hours}\nLearner has ${hoursPerWeek} hours/week. Target completion: ${targetDate ?? "flexible"}.\n\nOutline:\n${JSON.stringify(outline, null, 2)}\n\nReturn a study plan grouped by week.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_plan",
            description: "Return the week-by-week plan",
            parameters: {
              type: "object",
              properties: {
                weeks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      week: { type: "number" },
                      focus: { type: "string" },
                      tasks: { type: "array", items: { type: "string" } },
                      estimated_hours: { type: "number" },
                    },
                    required: ["week", "focus", "tasks", "estimated_hours"],
                  },
                },
                tips: { type: "array", items: { type: "string" } },
              },
              required: ["weeks", "tips"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_plan" } },
      }),
    });
    if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (res.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const json = await res.json();
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const plan = args ? JSON.parse(args) : { weeks: [], tips: [] };

    const { data: saved } = await admin.from("study_plans").upsert({
      user_id: userId, course_id: courseId, plan_json: plan, hours_per_week: hoursPerWeek, target_date: targetDate ?? null,
    }, { onConflict: "user_id,course_id" } as any).select("id").maybeSingle();

    return new Response(JSON.stringify({ plan, id: saved?.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});