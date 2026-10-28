import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { requestSignup, SignupPromptModal } from "./SignupPromptModal";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
afterEach(() => { cleanup(); vi.useRealTimers(); });
const mount = (path: string) => render(<MemoryRouter initialEntries={[path]}><SignupPromptModal /></MemoryRouter>);

describe("intent-based signup", () => {
  it("does not interrupt browsing even after ten minutes", () => {
    vi.useFakeTimers();
    mount("/courses");
    act(() => vi.advanceTimersByTime(600000));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("opens after deliberate enrollment and stays dismissed", () => {
    vi.useFakeTimers();
    mount("/courses/course");
    act(() => requestSignup("enroll"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Continue browsing"));
    act(() => vi.advanceTimersByTime(600000));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("never gates a business enquiry with account creation", () => {
    mount("/for-businesses");
    act(() => requestSignup("register"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("ignores legacy automatic prompt events", () => {
    mount("/");
    act(() => window.dispatchEvent(new CustomEvent("sec:request-signup", { detail: { reason: "auto" } })));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
