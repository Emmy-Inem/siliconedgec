import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSupportAssistant } from "./useSupportAssistant";

const mock = vi.hoisted(() => ({ count: 0, session: null as any, signup: vi.fn(), toast: vi.fn(), fetch: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: async () => ({ data: { session: mock.session } }) } } }));
vi.mock("@/components/SignupPromptModal", () => ({ requestSignup: mock.signup }));
vi.mock("@/hooks/use-toast", () => ({ toast: mock.toast }));
vi.mock("@/lib/currency", () => ({ detectVisitorCurrency: () => "GBP" }));
vi.mock("@/lib/guest-coach", () => ({ GUEST_COACH_LIMIT: 2, guestCoachAnswers: () => mock.count, guestCoachIdentity: () => "dfe2ecf9-c665-4309-bcc1-1a457b05c60c", recordGuestCoachAnswer: () => { mock.count++; } }));
const answer = () => new Response('data: {"choices":[{"delta":{"content":"Here is your answer."}}]}\n\ndata: [DONE]\n\n', { headers: { "Content-Type": "text/event-stream" } });
beforeEach(() => {
  mock.count = 0; mock.session = null; mock.signup.mockReset(); mock.toast.mockReset();
  mock.fetch.mockReset().mockImplementation(async () => answer());
  vi.stubGlobal("fetch", mock.fetch);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("guest coach allowance", () => {
  it("answers two guest questions and opens signup before sending a third", async () => {
    const { result } = renderHook(() => useSupportAssistant());
    await act(async () => { await result.current.send("First question"); });
    await act(async () => { await result.current.send("Second question"); });
    expect(mock.count).toBe(2);
    expect(mock.signup).not.toHaveBeenCalled();
    await act(async () => { expect(await result.current.send("Third question")).toBe(false); });
    expect(mock.fetch).toHaveBeenCalledTimes(2);
    expect(mock.signup).toHaveBeenCalledWith("coach");
    expect(mock.toast).not.toHaveBeenCalled();
    expect(result.current.messages.filter(message => message.role === "user")).toHaveLength(2);
  });
  it("does not reset the guest allowance when page context or chat history resets", async () => {
    mock.count = 2;
    const { result, unmount } = renderHook(() => useSupportAssistant());
    act(() => result.current.reset());
    unmount();
    const next = renderHook(() => useSupportAssistant());
    await act(async () => { await next.result.current.send("Question from another page", true); });
    expect(mock.signup).toHaveBeenCalledWith("coach");
    expect(mock.fetch).not.toHaveBeenCalled();
  });
  it("lets signed-in users continue beyond the guest allowance", async () => {
    mock.count = 2; mock.session = { access_token: "signed-in-token" };
    const { result } = renderHook(() => useSupportAssistant());
    await act(async () => { await result.current.send("My next question"); });
    expect(mock.fetch).toHaveBeenCalledOnce();
    expect(mock.signup).not.toHaveBeenCalled();
    expect(mock.count).toBe(2);
  });
  it("opens signup without an error toast when the server reports an exhausted allowance", async () => {
    mock.fetch.mockResolvedValueOnce(Response.json({ code: "GUEST_COACH_LIMIT", signup_required: true }, { status: 403 }));
    const { result } = renderHook(() => useSupportAssistant());
    await act(async () => { expect(await result.current.send("Third question from a different tab")).toBe(false); });
    expect(mock.signup).toHaveBeenCalledWith("coach");
    expect(mock.toast).not.toHaveBeenCalled();
    expect(result.current.messages).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
  it("does not spend an answer when the AI service fails", async () => {
    mock.fetch.mockResolvedValueOnce(Response.json({ error: "Temporarily unavailable" }, { status: 503 }));
    const { result } = renderHook(() => useSupportAssistant());
    await act(async () => { await result.current.send("First question"); });
    expect(mock.count).toBe(0);
  });
});
