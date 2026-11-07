/** Persist only public presentation data, never identity, prices or access. */
const TTL = 30 * 60_000;
export function readPublicContent<T>(key: string): { data: T; updatedAt: number } | undefined {
  try {
    const entry = JSON.parse(localStorage.getItem(`sec_public_v1_${key}`) || "null");
    if (!entry || typeof entry.updatedAt !== "number" || !entry.data ||
      Date.now() - entry.updatedAt >= TTL || entry.updatedAt > Date.now()) return undefined;
    return entry;
  } catch { return undefined; }
}
export function writePublicContent<T>(key: string, data: T): void {
  try { localStorage.setItem(`sec_public_v1_${key}`, JSON.stringify({ data, updatedAt: Date.now() })); }
  catch { /* Storage restrictions must not prevent rendering. */ }
}