import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL as string;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

describe("RLS — user_roles table protection", () => {
  it("rejects anonymous clients from inserting admin roles", async () => {
    if (!URL || !KEY) return;
    const supa = createClient(URL, KEY);
    const { error } = await supa.from("user_roles").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      role: "admin",
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

  it("rejects anonymous clients from modifying existing user roles", async () => {
    if (!URL || !KEY) return;
    const supa = createClient(URL, KEY);
    const { data, error } = await supa
      .from("user_roles")
      .update({ role: "admin" } as any)
      .eq("user_id", "00000000-0000-0000-0000-000000000000")
      .select();

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
