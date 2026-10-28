import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveChat } from "./LiveChat";

const assistant = { messages: [], loading: false, escalated: false, reset: vi.fn(), send: vi.fn(), requestHuman: vi.fn() };
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/useSupportAssistant", () => ({ useSupportAssistant: () => assistant }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
afterEach(cleanup);
function Navigation() {
  const navigate = useNavigate();
  return <><button onClick={() => navigate("/for-businesses")}>Business page</button><LiveChat /></>;
}
describe("guest AI coach", () => {
  it("offers chat without signing in, updates page guidance and links the official WhatsApp", () => {
    render(<MemoryRouter initialEntries={["/pricing"]}><Navigation /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Open AI Coach" }));
    expect(screen.getByText("Tuition and payment")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ask anything…")).toBeInTheDocument();
    expect(screen.queryByText("Sign in to chat with our assistant")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Chat on WhatsApp" })).toHaveAttribute("href", "https://wa.me/447741247592");
    fireEvent.click(screen.getByRole("button", { name: "Business page" }));
    expect(screen.getByText(/Business enquiries do not require an account/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Can you tailor training to our business?" })).toBeInTheDocument();
    expect(screen.queryByText("Tuition and payment")).not.toBeInTheDocument();
  });
  it("keeps a third guest question in the composer when signup is requested", async () => {
    assistant.send.mockResolvedValueOnce(false);
    render(<MemoryRouter><LiveChat /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Open AI Coach" }));
    const input = screen.getByPlaceholderText("Ask anything…");
    fireEvent.change(input, { target: { value: "My third question" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => expect(input).toHaveValue("My third question"));
  });
});
