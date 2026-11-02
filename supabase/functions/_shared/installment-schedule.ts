export function installmentSchedule(startDate: string, durationWeeks: number, count: number, totalMinor: number, now = new Date()) {
  now = new Date(now.toISOString().slice(0, 10) + "T00:00:00Z");
  const start = new Date(`${startDate}T00:00:00Z`);
  if (!Number.isFinite(start.getTime()) || !Number.isInteger(durationWeeks) || durationWeeks < 3 || durationWeeks > 104)
    throw new Error("This course does not have a published weekly payment schedule.");
  const deadline = new Date(start.getTime() + (durationWeeks - 1) * 7 * 86400000);
  const available = Math.min(durationWeeks - 1, Math.ceil((deadline.getTime() - now.getTime()) / (7 * 86400000)));
  if (!Number.isInteger(count) || count < 2 || count > available || !Number.isSafeInteger(totalMinor) || totalMinor < count)
    throw new Error("Choose a weekly plan that finishes before the final week.");
  const base = Math.floor(totalMinor / count);
  return {
    deadline: deadline.toISOString(),
    payments: Array.from({ length: count }, (_, index) => ({
      number: index + 1,
      amount_minor: base + (index < totalMinor % count ? 1 : 0),
      due_at: new Date(now.getTime() + index * 7 * 86400000).toISOString(),
    })),
  };
}
