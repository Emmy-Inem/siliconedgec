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
    const [{ data: enrolls }, { data: live }, { data: allCourses }] = await Promise.all([
      admin.from("enrollments").select("course_id, progress_percentage, is_completed, last_lesson_id, last_seen_at, updated_at, courses(id, title, slug, category, difficulty)").eq("user_id", userId).order("updated_at", { ascending: false }),
      admin.from("live_classes").select("id, title, scheduled_at, course_id, courses(slug, title)").eq("status", "scheduled").gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(5),
      admin.from("courses").select("id, title, slug, category, difficulty").eq("is_published", true).limit(60),
    ]);

    const enrolledIds = new Set((enrolls ?? []).map((e: any) => e.course_id));
    const inProgress = (enrolls ?? []).find((e: any) => !e.is_completed && (e.progress_percentage ?? 0) > 0);
    const notStarted = (enrolls ?? []).find((e: any) => !e.is_completed && (e.progress_percentage ?? 0) === 0);
    const myLiveClass = (live ?? []).find((l: any) => enrolledIds.has(l.course_id));

    // Deterministic decision — no AI hallucinations about courses that don't exist.
    let deterministic: any = null;
    if (myLiveClass) {
      const when = new Date(myLiveClass.scheduled_at);
      const soon = (when.getTime() - Date.now()) < 1000 * 60 * 60 * 48;
      if (soon) deterministic = {
        headline: `Live: ${myLiveClass.title}`,
        message: `Your live class is on ${when.toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}. Be ready a few minutes early.`,
        cta_label: "Open course", cta_href: `/courses/${(myLiveClass as any).courses?.slug ?? myLiveClass.course_id}/learn`, kind: "live_class",
      };
    }
    if (!deterministic && inProgress) {
      const c: any = inProgress.courses;
      deterministic = {
        headline: "Pick up where you left off",
        message: `You're ${Math.round(inProgress.progress_percentage ?? 0)}% through ${c?.title ?? "your course"}. Keep your streak alive with the next lesson.`,
        cta_label: "Resume course", cta_href: `/courses/${c?.slug ?? inProgress.course_id}/learn`, kind: "resume",
      };
    }
    if (!deterministic && notStarted) {
      const c: any = notStarted.courses;
      deterministic = {
        headline: "Start your enrolled course",
        message: `${c?.title ?? "Your course"} is ready when you are. Begin the first lesson today.`,
        cta_label: "Start now", cta_href: `/courses/${c?.slug ?? notStarted.course_id}/learn`, kind: "resume",
      };
    }

    if (deterministic) {
      return new Response(JSON.stringify(deterministic), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // No enrollments — ask AI for a single explore suggestion from REAL catalog only.
    const catalog = (allCourses ?? []).filter((c: any) => !enrolledIds.has(c.id));
    if (catalog.length === 0) {
      return new Response(JSON.stringify({ headline: "Explore the catalog", message: "Find a course that matches your goals.", cta_label: "Browse courses", cta_href: "/courses", kind: "explore" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Recommend ONE course from the provided catalog only. Never invent titles or slugs. cta_href MUST be /courses/<slug> using a slug from the catalog. kind MUST be 'next_course'." },
          { role: "user", content: `Catalog: ${JSON.stringify(catalog)}` },
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
    let rec = args ? JSON.parse(args) : null;
    // Guard against hallucinated slugs.
    const validSlugs = new Set(catalog.map((c: any) => c.slug));
    if (!rec || !rec.cta_href || !rec.cta_href.startsWith("/courses/") || !validSlugs.has(rec.cta_href.replace("/courses/", "").replace("/learn", ""))) {
      const pick: any = catalog[0];
      rec = { headline: "Recommended for you", message: `${pick.title} — a great place to start in ${pick.category}.`, cta_label: "View course", cta_href: `/courses/${pick.slug}`, kind: "next_course" };
    }
    return new Response(JSON.stringify(rec), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});