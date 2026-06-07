import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// Mock supabase client used inside LessonQuiz so the component can render
// without hitting the network. Returns one quiz with one question.
vi.mock("@/integrations/supabase/client", () => {
  const quizRow = { id: "quiz-1", title: "Test quiz", passing_score: 70, max_attempts: 3 };
  const questions = [
    { id: "q1", question_text: "What is 2 + 2?", options: ["3", "4", "5"], order_index: 0, correct_answer: "4", explanation: "Basic math." },
  ];
  return {
    supabase: {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: table === "quizzes" ? quizRow : null, error: null }),
            eq: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }),
          }),
        }),
      }),
      rpc: async (_fn: string) => ({ data: questions, error: null }),
    },
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" }, loading: false }),
}));

vi.mock("@/hooks/use-toast", () => ({ toast: () => {} }));

import { LessonQuiz } from "./LessonQuiz";

function renderQuiz() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <LessonQuiz lessonId="lesson-1" />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("LessonQuiz a11y regression", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders submit button with an accessible name and labelled radio options", async () => {
    renderQuiz();
    // Wait for quiz title to appear
    expect(await screen.findByText("Test quiz")).toBeInTheDocument();
    // Each radio is wrapped in a <label> that contains the option text — RTL
    // resolves accessible name from the label's textContent.
    const radios = await screen.findAllByRole("radio");
    expect(radios.length).toBeGreaterThan(0);
    for (const r of radios) {
      // Accessible name must not be empty
      expect(r.getAttribute("aria-label") || r.closest("label")?.textContent?.trim()).toBeTruthy();
    }
    // Submit button exposes an aria-label even when disabled.
    const submit = screen.getByRole("button", { name: /submit quiz answers|maximum attempts reached/i });
    expect(submit).toBeInTheDocument();
  });
});