import { afterAll, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { lovableConnection } from "../../supabase/functions/_shared/lovable-connection";
import { allowedAi, allowedEmail, authorizedRelay } from "../../supabase/functions/lovable-service-relay/policy";
vi.stubGlobal("crypto", webcrypto);
afterAll(() => vi.unstubAllGlobals());
describe("Lovable migration relay", () => {
  it("preserves the source deployment when relay settings are absent", () => {
    expect(lovableConnection(n => n === "LOVABLE_API_KEY" ? "source-key" : undefined).aiBase).toBe("https://ai.gateway.lovable.dev/v1");
  });
  it("rejects incomplete and untrusted destinations without falling back", () => {
    for (const url of ["http://example.com", "https://example.com/functions/v1/lovable-service-relay", "https://abcdefghijklmnopqrst.supabase.co/functions/v1/lovable-service-relay?key=bad"]) {
      expect(() => lovableConnection(n => n === "SEC_LOVABLE_RELAY_URL" ? url : "x".repeat(64))).toThrow();
    }
    expect(() => lovableConnection(n => n === "SEC_LOVABLE_RELAY_URL" ? "https://abcdefghijklmnopqrst.supabase.co/functions/v1/lovable-service-relay" : undefined)).toThrow();
  });
  it("uses only the relay credential at the destination", () => {
    const values: Record<string, string> = { SEC_LOVABLE_RELAY_URL: "https://abcdefghijklmnopqrst.supabase.co/functions/v1/lovable-service-relay", SEC_LOVABLE_RELAY_KEY: "r".repeat(64), LOVABLE_API_KEY: "must-stay-on-source" };
    const config = lovableConnection(n => values[n]);
    expect(config.key).toBe("r".repeat(64));
    expect(config.emailUrl).toMatch(/\/email$/);
  });
  it("rejects missing and invalid shared authentication", async () => {
    expect(await authorizedRelay("", "")).toBe(false);
    expect(await authorizedRelay("a".repeat(64), "b".repeat(64))).toBe(false);
    expect(await authorizedRelay("a".repeat(64), "a".repeat(64))).toBe(true);
  });
  it("allows only existing models and non-stored Responses calls", () => {
    expect(allowedAi({ model: "google/gemini-3.6-flash", messages: [] }, "/ai/v1/chat/completions")).toBe(true);
    expect(allowedAi({ model: "arbitrary-model", messages: [] }, "/ai/v1/chat/completions")).toBe(false);
    expect(allowedAi({ model: "openai/gpt-6-astra", store: true }, "/ai/v1/responses")).toBe(false);
    expect(allowedAi({ model: "openai/gpt-6-astra", store: false }, "/ai/v1/responses")).toBe(true);
  });
  it("restricts email senders and requires duplicate protection", () => {
    const email = { sender_domain: "siliconedgec.com", from: "Silicon Edge <info@siliconedgec.com>", to: "learner@example.com", subject: "Course update", text: "Update", idempotency_key: "unique-event" };
    expect(allowedEmail(email)).toBe(true);
    expect(allowedEmail({ ...email, sender_domain: "notify.siliconedgec.com", from: "Silicon Edge <info@notify.siliconedgec.com>" })).toBe(true);
    expect(allowedEmail({ ...email, from: "info@siliconedgec.com.attacker.example" })).toBe(false);
    expect(allowedEmail({ ...email, from: "attacker@example.com" })).toBe(false);
    expect(allowedEmail({ ...email, idempotency_key: "" })).toBe(false);
  });
});
