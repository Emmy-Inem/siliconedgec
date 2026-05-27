import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await supa.auth.getUser(auth.replace("Bearer ", ""));
    if (!userRes?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = userRes.user.id;

    const body = await req.json().catch(() => ({} as any));
    const jobId: string | undefined = body?.jobId;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const [{ data: certs }, { data: enrolls }, { data: profile }] = await Promise.all([
      admin.from("certificates").select("course_id").eq("user_id", userId),
      admin.from("enrollments").select("course_id, progress_percentage, is_completed").eq("user_id", userId),
      admin.from("profiles").select("full_name, bio").eq("user_id", userId).maybeSingle(),
    ]);

    const courseIds = Array.from(new Set([
      ...(certs ?? []).map((c) => c.course_id),
      ...(enrolls ?? []).map((e) => e.course_id),
    ]));
    const { data: courses } = courseIds.length
      ? await admin.from("courses").select("id, title, category, difficulty, skills_taught").in("id", courseIds)
      : { data: [] as any[] };

    let jobBlock = "";
    if (jobId) {
      const { data: job } = await admin.from("jobs").select("title, description, requirements, skills_required").eq("id", jobId).maybeSingle();
      if (job) jobBlock = `\n\nTARGET JOB:\nTitle: ${job.title}\nDescription: ${job.description}\nRequirements: ${JSON.stringify(job.requirements ?? [])}\nSkills: ${JSON.stringify(job.skills_required ?? [])}`;
    } else {
      const { data: jobs } = await admin.from("jobs").select("id, title, skills_required").eq("is_published", true).limit(20);
      jobBlock = `\n\nOPEN JOBS (suggest up to 3 most aligned, by id+title):\n${JSON.stringify(jobs ?? [])}`;
    }

    const learnerBlock = `LEARNER PROFILE:\nName: ${profile?.full_name ?? "Student"}\nBio: ${profile?.bio ?? ""}\nCompleted certificates: ${(certs ?? []).length}\nEnrollments: ${(enrolls ?? []).length}\nCourses: ${JSON.stringify((courses ?? []).map((c: any) => ({ title: c.title, category: c.category, difficulty: c.difficulty, skills: c.skills_taught })))}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const sys = `You are the Silicon Edge AI Career Coach. Output JSON only — no markdown, no commentary. Schema:\n{\n  "headline": string,\n  "summary": string,                       // 2-3 sentence personalised pitch\n  "matched_jobs": [{ "id": string|null, "title": string, "fit_reason": string }],\n  "skill_gaps": [{ "skill": string, "why": string, "suggested_course_category": string }],\n  "cover_letter": string                    // single paragraph, first-person, ~120 words\n}`;

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: learnerBlock + jobBlock },
        ],
      }),
    });
    if (!upstream.ok) {
      const t = await upstream.text();
      console.error("coach upstream", upstream.status, t);
      if (upstream.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (upstream.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const j = await upstream.json();
    const raw = j.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { headline: "Career coach", summary: raw }; }
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});