# Dashboard cleanup + AI Learning Companion

## 1. Dashboard cleanup (quick)

Remove the 4 floating stat cards (Enrolled / Avg Progress / Certificates / Bookmarks) under the hero in `src/pages/Dashboard.tsx`. The same numbers already live in the "Learning Snapshot" panel inside the hero, so deleting them eliminates the repetition and tightens the page.

## 2. AI Learning Companion — vision

Instead of a single "chatbot in a corner", embed AI at the exact moments a student needs help. One brain (`ai-tutor` edge function on Lovable AI Gateway, default `google/gemini-3-flash-preview`, streaming) powering several surfaces:

### A. Lesson Companion (in-lesson side panel)

- Always-present collapsible panel on `/courses/:slug/learn`.
- Context-aware: receives the current lesson title, module, transcript/markdown content, and the student's recent questions.
- Capabilities:
  - **Explain this** — re-explain the current paragraph/timestamp in simpler terms.
  - **Quiz me** — generate 3–5 questions from the lesson, grade answers, suggest review spots.
  - **Summarize** — TL;DR + key takeaways for the lesson.
  - **Code helper** — paste an error/snippet, get a fix grounded in the lesson stack (AWS / Azure / DevOps, etc.).
  - **Ask anything** — free chat, scoped to the course material.

### B. Smart Course Recommender (Dashboard widget that replaces the removed strip)

A single "Your next step" card under the hero that uses AI + enrollment/progress data to suggest:

- the next lesson to resume,
- the next course in the same track (Beginner → Intermediate → Expert),
- a relevant upcoming live class.
Feels personal, not repetitive.

### C. Study Plan Generator

On any course detail page and from the dashboard: "Generate my study plan". AI returns a week-by-week plan based on the user's available hours/week (slider), target completion date, and difficulty — saved to a new `study_plans` table and shown as a checklist.

### D. AI Career Coach (small, on `/jobs` and dashboard)

- Reviews the student's completed courses + certificates.
- Suggests jobs they qualify for, gaps to close, and tailors a 1-paragraph cover-letter draft per job.

### E. Practice & Mock Interview

- "Practice mode" button per course track: AI runs a mock technical interview (text first, optional voice later) and scores answers against a rubric.

### F. Instructor Assist (admin only, bonus)

Auto-draft lesson summaries, generate quiz banks, suggest descriptions when admins create courses — wired into the existing course-creation wizard.

## 3. Trust, safety & UX guardrails (the "users will love it" part)

- **Streaming responses** so first tokens appear in <1s.
- **Source citing**: every answer in the Lesson Companion shows which lesson/section it pulled from.
- **"I'm not sure"** fallback — model is instructed to say so and link to instructor chat instead of hallucinating.
- **Rate-limit + credit messages** surfaced as friendly toasts (429 / 402 from the gateway).
- **Per-user chat history** persisted in `ai_conversations` / `ai_messages` so context carries between sessions, with a "Clear chat" control.
- **Privacy**: only the student and admins can read their conversations (RLS).
- **No PII in prompts** beyond first name + course context.

## 4. Technical plan

### New tables (one migration)

- `ai_conversations` — `id, user_id, scope` (`lesson` | `course` | `dashboard` | `career`), `scope_ref_id`, `title`, timestamps.
- `ai_messages` — `id, conversation_id, role` (`user|assistant|system`), `content`, `created_at`.
- `study_plans` — `id, user_id, course_id, plan_json, hours_per_week, target_date, created_at`.
- `ai_quiz_attempts` — `id, user_id, lesson_id, questions_json, score, created_at`.
- RLS: owner-only read/write; admins read all.

### Edge functions

- `ai-tutor` — streaming chat, accepts `{ conversationId, scope, scopeRefId, messages }`, loads lesson/course context server-side, prepends a tight system prompt, calls Lovable AI Gateway with `stream: true`. Handles 429/402 cleanly.
- `ai-study-plan` — non-streaming, uses tool-calling for structured JSON, saves to `study_plans`.
- `ai-quiz` — generates + grades quizzes via tool-calling.
- `ai-recommend` — returns next-step recommendation for the dashboard widget.

All functions: CORS, JWT verified in code, Zod input validation, no secrets in client.

### Frontend

- `src/components/ai/LessonCompanion.tsx` — collapsible right-rail panel with tabs (Chat / Quiz / Summary).
- `src/components/ai/NextStepCard.tsx` — replaces the deleted stat strip on the dashboard.
- `src/components/ai/StudyPlanDialog.tsx` — modal launched from course pages.
- `src/components/ai/CareerCoachCard.tsx` — small dashboard + `/jobs` widget.
- `src/hooks/useAiTutor.ts` — SSE streaming helper following the project's existing pattern (line-by-line SSE parser, append-to-last-assistant rendering).
- Markdown rendering via `react-markdown` for all AI output.

### Phasing (so it ships in usable chunks)

1. **Phase 1 (this PR):** Dashboard cleanup + `ai-tutor` function + Lesson Companion (chat + summarize) + persisted conversations.
2. **Phase 2:** Quiz me + Study Plan generator.
3. **Phase 3:** Career Coach + Next-Step recommender + Instructor Assist.

## 5. Open questions before I build

1. Phase 1 only now, or do you want me to ship Phases 1 + 2 in this round? Build all now 
2. Default AI model: keep `google/gemini-3-flash-preview` (fast + cheap, great for tutoring) or go premium `openai/gpt-5` for harder reasoning?
3. Should the Lesson Companion be **open by default** on desktop, or collapsed behind a floating button?
4. For the dashboard, after removing the 4 stat cards, do you want the AI "Next step" card to take their place, or leave the space empty and keep the page tighter?