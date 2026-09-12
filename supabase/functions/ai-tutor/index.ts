import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { safeErrorResponse } from "../_shared/errors.ts";

const SYSTEM_PROMPT = `You are the Silicon Edge Learning Companion — a friendly, expert tutor for students taking AI, Cloud, DevOps and Data Engineering courses on the Silicon Edge platform.

RULES:
- Be concise, warm, and encouraging. Use markdown (headings, lists, code blocks).
- Ground answers in the lesson/course context you are given. If something is outside that scope, say so and offer to help with what's in the course.
- When you use information from the supplied lesson transcript or course description, cite it inline using the marker [L1] (the current lesson) so learners can see where the answer came from. Place the citation right after the sentence it supports.
- If you are not sure, say "I'm not 100% sure — please ask your instructor in course chat" rather than guessing.
- For code, always show runnable snippets with the language fenced (\`\`\`python, \`\`\`bash, etc.).
- Never invent links, certificate IDs, or prices.`;

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace("Bearer ", "");
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await supa.auth.getUser(token);
    if (!userRes?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = userRes.user.id;

    // Rate limit: max 20 requests per minute per authenticated user
    const rl = checkRateLimit({
      key: `ai-tutor:${userId}`,
      limit: 20,
      windowMs: 60 * 1000,
    });
    if (!rl.allowed) return rateLimitResponse(rl.retryAfter, corsHeaders);

    const body = await req.json();
    const { messages, scope, scopeRefId, conversationId } = body as {
      messages: { role: string; content: string }[];
      scope?: string;
      scopeRefId?: string;
      conversationId?: string;
    };
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build context from scope
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Harden access: lesson/course-scoped tutoring requires paid enrollment or admin/mod role
    if ((scope === "lesson" || scope === "course") && scopeRefId) {
      const { data: roleRows } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ["admin", "moderator"]);
      const isStaff = (roleRows?.length ?? 0) > 0;
      if (!isStaff) {
        let courseId: string | null = null;
        if (scope === "course") {
          courseId = scopeRefId;
        } else {
          const { data: lesson } = await admin.from("lessons").select("module_id").eq("id", scopeRefId).maybeSingle();
          if (lesson?.module_id) {
            const { data: mod } = await admin.from("modules").select("course_id").eq("id", lesson.module_id).maybeSingle();
            courseId = mod?.course_id ?? null;
          }
        }
        if (courseId) {
          const { data: enr } = await admin
            .from("enrollments")
            .select("payment_status")
            .eq("user_id", userId)
            .eq("course_id", courseId)
            .maybeSingle();
          const paid = ["paid", "success", "completed", "confirmed"].includes((enr?.payment_status ?? "").toLowerCase());
          if (!paid) {
            return new Response(
              JSON.stringify({ error: "AI tutor requires an active paid enrollment in this course." }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        }
      }
    }

    let contextBlock = "";
    if (scope === "lesson" && scopeRefId) {
      const { data: lesson } = await admin.from("lessons").select("title, content_url, content_type, module_id").eq("id", scopeRefId).maybeSingle();
      if (lesson) {
        const { data: mod } = await admin.from("modules").select("title, course_id").eq("id", lesson.module_id).maybeSingle();
        const { data: course } = mod ? await admin.from("courses").select("title, category, difficulty, learning_outcomes").eq("id", mod.course_id).maybeSingle() : { data: null };
        const { data: transcript } = await admin.from("lesson_transcripts").select("transcript").eq("lesson_id", scopeRefId).maybeSingle();
        const tx = (transcript?.transcript ?? "").slice(0, 12000);
        contextBlock = `\n\nCURRENT LESSON CONTEXT:\nCourse: ${course?.title ?? ""} (${course?.category ?? ""} · ${course?.difficulty ?? ""})\nModule: ${mod?.title ?? ""}\nLesson: ${lesson.title}\nLearning outcomes: ${(course?.learning_outcomes ?? []).join("; ")}`;
        if (tx) contextBlock += `\n\nLESSON TRANSCRIPT (cite as [Lesson: ${lesson.title}] when you use it):\n"""\n${tx}\n"""`;
      }
    } else if (scope === "course" && scopeRefId) {
      const { data: course } = await admin.from("courses").select("title, category, difficulty, description, learning_outcomes").eq("id", scopeRefId).maybeSingle();
      if (course) contextBlock = `\n\nCURRENT COURSE CONTEXT:\n${course.title} (${course.category} · ${course.difficulty})\n${course.description ?? ""}\nLearning outcomes: ${(course.learning_outcomes ?? []).join("; ")}`;
    }

    // Ensure conversation exists
    let convId = conversationId;
    if (!convId) {
      const { data: created } = await admin.from("ai_conversations").insert({
        user_id: userId,
        scope: scope ?? "dashboard",
        scope_ref_id: scopeRefId ?? null,
        title: messages[messages.length - 1]?.content?.slice(0, 80) ?? "New chat",
      }).select("id").single();
      convId = created?.id;
    }
    // Persist the latest user message
    const last = messages[messages.length - 1];
    if (last?.role === "user" && convId) {
      await admin.from("ai_messages").insert({ conversation_id: convId, role: "user", content: last.content });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT + contextBlock },
          ...messages,
        ],
      }),
    });

    if (!upstream.ok) {
      if (upstream.status === 429) return new Response(JSON.stringify({ error: "Rate limit, please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (upstream.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await upstream.text();
      console.error("AI upstream", upstream.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Tee: stream to client, also accumulate to persist assistant message
    const [a, b] = upstream.body!.tee();
    (async () => {
      try {
        const reader = b.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let full = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n")) !== -1) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!line.startsWith("data: ")) continue;
            const j = line.slice(6);
            if (j === "[DONE]") continue;
            try {
              const p = JSON.parse(j);
              const c = p.choices?.[0]?.delta?.content;
              if (c) full += c;
            } catch {}
          }
        }
        if (full && convId) {
          await admin.from("ai_messages").insert({ conversation_id: convId, role: "assistant", content: full });
          await admin.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
        }
      } catch (e) { console.error("persist err", e); }
    })();

    return new Response(a, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Conversation-Id": convId ?? "" },
    });
  } catch (e) {
    return safeErrorResponse(e, 500, corsHeaders, "AI Tutor is temporarily unavailable. Please try again.");
  }
});