import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL as string;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// Regression: anonymous (and any non-admin authenticated) clients MUST NOT be
// able to INSERT into influencer_referrals. The only SELECT policy is admin-
// scoped, and there is intentionally no public INSERT policy — referral rows
// are created server-side by triggers and the Paystack edge functions only.
describe("RLS — influencer_referrals INSERT is forbidden for clients", () => {
  it("rejects anonymous inserts of fabricated commission rows", async () => {
    if (!URL || !KEY) return; // skip in environments without env vars
    const supa = createClient(URL, KEY);
    const { error } = await supa.from("influencer_referrals").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      course_id: "00000000-0000-0000-0000-000000000000",
      conversion_type: "paid_enrollment",
      original_price: 1000000,
      discount_applied: 0,
      final_price: 1000000,
      commission_earned: 999999,
    } as any);
    expect(error).not.toBeNull();
    // Postgres RLS denial surfaces either 42501 (insufficient_privilege) or
    // PGRST's "violates row-level security policy" message.
    const msg = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
    expect(
      msg.includes("row-level security") ||
      msg.includes("permission denied") ||
      msg.includes("42501") ||
      msg.includes("violates"),
    ).toBe(true);
  });
});