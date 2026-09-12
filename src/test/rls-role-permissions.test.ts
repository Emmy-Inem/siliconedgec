import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL as string;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

describe("RLS & Grants — role_permissions and RSVP attendance protection", () => {
  it("rejects anonymous reads on role_permissions matrix", async () => {
    if (!URL || !KEY) return;
    const supa = createClient(URL, KEY);
    const { data, error } = await supa
      .from("role_permissions")
      .select("role, route, allowed");

    // Anonymous client must be rejected or receive 0 rows
    if (error) {
      const msg = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
      expect(
        msg.includes("row-level security") ||
        msg.includes("permission denied") ||
        msg.includes("42501") ||
        msg.includes("violates") ||
        msg.includes("not allowed"),
      ).toBe(true);
    } else {
      expect(data?.length ?? 0).toBe(0);
    }
  });

  it("rejects anonymous insert or self-attendance marking on cohort_session_rsvps", async () => {
    if (!URL || !KEY) return;
    const supa = createClient(URL, KEY);
    const { error } = await supa.from("cohort_session_rsvps").insert({
      session_id: "00000000-0000-0000-0000-000000000000",
      user_id: "00000000-0000-0000-0000-000000000000",
      status: "yes",
      attended: true,
    } as any);

    expect(error).not.toBeNull();
    const msg = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
    expect(
      msg.includes("row-level security") ||
      msg.includes("permission denied") ||
      msg.includes("42501") ||
      msg.includes("violates") ||
      msg.includes("not allowed"),
    ).toBe(true);
  });
});
