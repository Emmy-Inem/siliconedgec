import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { CourseAiCoach } from "./CourseAiCoach";

vi.mock("@/hooks/useSiteSettings", () => ({ useSiteSettings: () => ({ data: { whatsapp_number: "+44 7741 247592" } }) }));
vi.mock("@/components/LiveChat", () => ({ LiveChat: () => null }));

describe("unified AI Coach question handoff", () => {
  it("sends a general question without inventing course context", () => {
    const listener = vi.fn();
    window.addEventListener("sec:open-live-chat", listener);
    render(<MemoryRouter><CourseAiCoach /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Open AI Coach" }));
    fireEvent.change(screen.getByPlaceholderText("Ask AI Coach anything…"), { target: { value: "Where are my receipts?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send question to AI Coach" }));
    expect(listener.mock.calls[0][0].detail.initialQuestion).toBe("Where are my receipts?");
    window.removeEventListener("sec:open-live-chat", listener);
  });

  it("preserves the current course in course-specific questions", () => {
    const listener = vi.fn();
    window.addEventListener("sec:open-live-chat", listener);
    render(<MemoryRouter><CourseAiCoach courseTitle="Generative AI & Large Language Models" courseSlug="ai-beginners-llm-productivity" /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Open AI Coach" }));
    fireEvent.change(screen.getByPlaceholderText("Ask AI Coach anything…"), { target: { value: "What will I learn?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send question to AI Coach" }));
    expect(listener.mock.calls[0][0].detail.initialQuestion).toBe('Regarding "Generative AI & Large Language Models": What will I learn?');
    window.removeEventListener("sec:open-live-chat", listener);
  });
});