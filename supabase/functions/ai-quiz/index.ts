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

    const { lessonId, courseId, action, answers, questions } = await req.json();
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (action === "generate") {
      let title = "this course"; let category = ""; let difficulty = "";
      if (lessonId) {
        const { data: l } = await admin.from("lessons").select("title, module_id").eq("id", lessonId).maybeSingle();
        title = l?.title ?? title;
      } else if (courseId) {
        const { data: c } = await admin.from("courses").select("title, category, difficulty").eq("id", courseId).maybeSingle();
        title = c?.title ?? title; category = c?.category ?? ""; difficulty = c?.difficulty ?? "";
      }
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You write fair, practical multiple-choice quizzes for IT students." },
            { role: "user", content: `Generate 5 multiple-choice questions for: ${title}${category ? ` (${category}, ${difficulty})` : ""}. Mix of recall and applied scenario questions.` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "return_quiz",
              parameters: {
                type: "object",
                properties: {
                  questions: { type: "array", items: { type: "object", properties: {
                    question: { type: "string" },
                    options: { type: "array", items: { type: "string" } },
                    correct_index: { type: "number" },
                    explanation: { type: "string" },
                  }, required: ["question", "options", "correct_index", "explanation"] } },
                },
                required: ["questions"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "return_quiz" } },
        }),
      });
      if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (res.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const json = await res.json();
      const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      const quiz = args ? JSON.parse(args) : { questions: [] };
      return new Response(JSON.stringify(quiz), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "grade") {
      if (!Array.isArray(questions) || !Array.isArray(answers)) return new Response(JSON.stringify({ error: "questions+answers required" }), { status: 400, headers: corsHeaders });
      let correct = 0;
      questions.forEach((q: any, i: number) => { if (answers[i] === q.correct_index) correct++; });
      const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
      await admin.from("ai_quiz_attempts").insert({ user_id: userId, lesson_id: lessonId ?? null, course_id: courseId ?? null, questions_json: questions, answers_json: answers, score });
      return new Response(JSON.stringify({ score, correct, total: questions.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});