import { describe, expect, it, vi } from "vitest";
import { aiModel, emailConnection, lovableConnection } from "../../supabase/functions/_shared/lovable-connection";
import { sendResendEmail } from "../../supabase/functions/_shared/resend";

const read = (values: Record<string, string>) => (name: string) => values[name];
describe("independent owned providers", () => {
  it("requires deliberate Gemini activation and maps gateway model names", () => {
    const inactive = read({ GEMINI_API_KEY: "google", LOVABLE_API_KEY: "source" });
    expect(lovableConnection(inactive).key).toBe("source");
    expect(aiModel("google/gemini-source", inactive)).toBe("google/gemini-source");
    const active = read({ GEMINI_ENABLED: "true", GEMINI_API_KEY: "google", GEMINI_MODEL: "gemini-tested" });
    expect(lovableConnection(active).aiBase).toBe("https://generativelanguage.googleapis.com/v1beta/openai");
    expect(aiModel("openai/old-model", active)).toBe("gemini-tested");
    expect(() => lovableConnection(read({ GEMINI_ENABLED: "true" }))).toThrow();
  });
  it("never sends the AI key to the email service", () => {
    const env = read({ GEMINI_ENABLED: "true", GEMINI_API_KEY: "google", LOVABLE_API_KEY: "source" });
    expect(emailConnection(env).key).toBe("source");
    expect(emailConnection(read({ RESEND_ENABLED: "true", RESEND_API_KEY: "email", GEMINI_API_KEY: "google" })).provider).toBe("resend");
    expect(emailConnection(read({ RESEND_API_KEY: "email", LOVABLE_API_KEY: "source" })).key).toBe("source");
    expect(() => emailConnection(read({ RESEND_ENABLED: "true" }))).toThrow();
  });
  it("keeps retries idempotent and omits private queue metadata", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "test" })));
    await sendResendEmail({ from: "old@notify.siliconedgec.com", to: "delivered@resend.dev", subject: "Test", html: "<a href='unsubscribe'>Unsubscribe</a>", text: "Test", idempotency_key: "event-123" }, "email", "Silicon Edge Consulting <info@siliconedgec.com>", request);
    const [url, options] = request.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(options.headers["Idempotency-Key"]).toBe("event-123");
    expect(JSON.parse(options.body)).toEqual({ from: "Silicon Edge Consulting <info@siliconedgec.com>", to: "delivered@resend.dev", subject: "Test", html: "<a href='unsubscribe'>Unsubscribe</a>", text: "Test" });
  });
  it("preserves rate-limit status without leaking provider error contents", async () => {
    const request = vi.fn().mockResolvedValue(new Response("private recipient", { status: 429, headers: { "Retry-After": "120" } }));
    await expect(sendResendEmail({ from: "old", to: "delivered@resend.dev", subject: "Test", idempotency_key: "event" }, "email", "info@siliconedgec.com", request)).rejects.toMatchObject({ status: 429, retryAfterSeconds: 120, message: "Email provider request failed (429)" });
  });
  it("blocks missing duplicate protection and unverified senders before sending", async () => {
    const request = vi.fn();
    const payload = { from: "old", to: "delivered@resend.dev", subject: "Test", idempotency_key: "event" };
    for (const from of [undefined, "attacker@example.com", "a@siliconedgec.com.attacker.example", "info@siliconedgec.com\r\nBcc: other"]) {
      await expect(sendResendEmail(payload, "email", from, request)).rejects.toThrow();
    }
    await expect(sendResendEmail({ ...payload, idempotency_key: "" }, "email", "info@siliconedgec.com", request)).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
});
