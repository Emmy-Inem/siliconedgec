import { describe, expect, it } from "vitest";
import { shouldShowSignupPrompt, SIGNUP_PROMPT_DELAY_MS } from "./SignupPrompt";

describe("sign-up prompt", () => {
  it("waits one minute", () => expect(SIGNUP_PROMPT_DELAY_MS).toBe(60_000));
  it("shows for signed-out visitors on public pages", () => expect(shouldShowSignupPrompt(false, "/courses", false)).toBe(true));
  it("shows only once", () => expect(shouldShowSignupPrompt(false, "/courses", true)).toBe(false));
  it("never shows to signed-in people", () => expect(shouldShowSignupPrompt(true, "/", false)).toBe(false));
  it("stays off sign-in and admin pages", () => {
    expect(shouldShowSignupPrompt(false, "/sign-in", false)).toBe(false);
    expect(shouldShowSignupPrompt(false, "/admin/analytics", false)).toBe(false);
  });
});
