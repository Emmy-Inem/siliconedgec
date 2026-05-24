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
    const userId = ur.user.id;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: enrolls } = await admin.from("enrollments").select("course_id, progress_percentage, is_completed, courses(title, category, difficulty)").eq("user_id", userId);
    const { data: live } = await admin.from("live_classes").select("title, scheduled_at, course_id, courses(title)").gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(5);
    const { data: allCourses } = await admin.from("courses").select("id, title, category, difficulty, slug").eq("is_published", true).limit(50);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a friendly learning coach. Recommend the single best next step in 1-2 sentences." },
          { role: "user", content: `Student enrollments: ${JSON.stringify(enrolls ?? [])}\nUpcoming live classes: ${JSON.stringify(live ?? [])}\nCatalog (id, title, category, difficulty, slug): ${JSON.stringify(allCourses ?? [])}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "recommend",
            parameters: {
              type: "object",
              properties: {
                headline: { type: "string", description: "Short personal headline like 'Pick up where you left off'" },
                message: { type: "string", description: "1-2 sentence recommendation" },
                cta_label: { type: "string" },
                cta_href: { type: "string", description: "Internal path like /courses/<slug> or /dashboard" },
                kind: { type: "string", enum: ["resume", "next_course", "live_class", "explore"] },
              },
              required: ["headline", "message", "cta_label", "cta_href", "kind"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "recommend" } },
      }),
    });
    if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: corsHeaders });
    if (res.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: corsHeaders });
    const j = await res.json();
    const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const rec = args ? JSON.parse(args) : { headline: "Keep going", message: "Explore the catalog to find your next course.", cta_label: "Browse courses", cta_href: "/courses", kind: "explore" };
    return new Response(JSON.stringify(rec), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});