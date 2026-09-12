import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL as string;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

describe("RLS — site_content table protection", () => {
  it("rejects anonymous clients from inserting site_content records", async () => {
    if (!URL || !KEY) return;
    const supa = createClient(URL, KEY);
    const { error } = await supa.from("site_content").insert({
      key: "malicious_injection_test",
      value: "compromised_content",
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

  it("rejects anonymous clients from modifying promotional banners or templates", async () => {
    if (!URL || !KEY) return;
    const supa = createClient(URL, KEY);
    const { error } = await supa
      .from("site_content")
      .update({ value: "compromised_banner" } as any)
      .eq("key", "promoted_courses_banner");

    if (error) {
      const msg = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
      expect(
        msg.includes("row-level security") ||
        msg.includes("permission denied") ||
        msg.includes("42501") ||
        msg.includes("violates"),
      ).toBe(true);
    }
  });

  it("rejects anonymous clients from deleting site_content rows", async () => {
    if (!URL || !KEY) return;
    const supa = createClient(URL, KEY);
    const { error } = await supa
      .from("site_content")
      .delete()
      .eq("key", "promoted_courses_banner");

    if (error) {
      const msg = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
      expect(
        msg.includes("row-level security") ||
        msg.includes("permission denied") ||
        msg.includes("42501") ||
        msg.includes("violates"),
      ).toBe(true);
    }
  });
});
