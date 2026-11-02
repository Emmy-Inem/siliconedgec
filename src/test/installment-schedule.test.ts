import { describe, expect, it } from "vitest";
import { installmentSchedule } from "../../supabase/functions/_shared/installment-schedule";
import { installmentPaymentMatches } from "../../supabase/functions/_shared/installment-settlement";

describe("weekly course payment schedule", () => {
  const now = new Date("2026-11-02T10:00:00Z");
  it("offers three weekly payments for a four-week programme and preserves every minor unit", () => {
    const result = installmentSchedule("2026-11-02", 4, 3, 10001, now);
    expect(result.deadline).toBe("2026-11-23T00:00:00.000Z");
    expect(result.payments.map(p => p.amount_minor)).toEqual([3334,3334,3333]);
    expect(result.payments.every(p => p.due_at < result.deadline)).toBe(true);
  });
  it("rejects a plan stretching into the final week", () => {
    expect(() => installmentSchedule("2026-11-02", 4, 4, 10000, now)).toThrow();
    expect(() => installmentSchedule("2026-11-02", 4, 3, 10000, new Date("2026-11-16"))).toThrow();
  });
  it("rejects missing schedules, fractional counts, expired courses and too-small amounts", () => {
    for (const args of [["",4,2,100], ["2026-11-02",4,2.5,100], ["2026-09-01",4,2,100], ["2026-11-02",4,3,2]] as const) {
      expect(() => installmentSchedule(...args, now)).toThrow();
    }
  });
});

describe("provider installment validation", () => {
  const payment = { gateway: "stripe", amount_minor: 3334, reference: "SEC-INST-1", provider_id: "cs_1" };
  const agreement = { currency: "EUR", user_id: "owner" };
  const verified = { gateway: "stripe", amount: 3334, currency: "eur", reference: "SEC-INST-1", userId: "owner", providerId: "cs_1" };
  it("accepts the matching provider payment", () => expect(installmentPaymentMatches(payment, agreement, verified)).toBe(true));
  it("rejects wrong ownership, amount, currency, reference, session and gateway", () => {
    for (const mismatch of [{ userId: "other" }, { amount: 3333 }, { currency: "USD" }, { reference: "other" }, { providerId: "cs_other" }, { gateway: "paystack" }]) {
      expect(installmentPaymentMatches(payment, agreement, { ...verified, ...mismatch })).toBe(false);
    }
  });
});
