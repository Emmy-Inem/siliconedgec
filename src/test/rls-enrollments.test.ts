import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL as string;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

describe("RLS — enrollments table protection", () => {
  it("rejects anonymous insertion of active/paid enrollment records", async () => {
    if (!URL || !KEY) return;
    const supa = createClient(URL, KEY);
    const { error } = await supa.from("enrollments").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      course_id: "00000000-0000-0000-0000-000000000000",
      payment_status: "paid",
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

  it("rejects anonymous updates to escalate enrollment payment status", async () => {
    if (!URL || !KEY) return;
    const supa = createClient(URL, KEY);
    const { data, error } = await supa
      .from("enrollments")
      .update({ payment_status: "paid" } as any)
      .eq("user_id", "00000000-0000-0000-0000-000000000000")
      .select();

    // Anonymous client either errors or modifies 0 rows due to RLS
    if (error) {
      const msg = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
      expect(
        msg.includes("row-level security") ||
        msg.includes("permission denied") ||
        msg.includes("42501") ||
        msg.includes("violates"),
      ).toBe(true);
    } else {
      expect(data).toHaveLength(0);
    }
  });
});
