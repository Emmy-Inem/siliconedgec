import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "sec_chunk_reload_at";
const RELOAD_WINDOW_MS = 60_000;

export function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk [\w-]+ failed/i.test(msg);
}

/**
 * Reload at most once per minute after a stale-deploy chunk error.
 * Returns true when a reload was started (caller should wait), false when the
 * guard blocked it (caller should show the error page instead of looping).
 */
export function guardedChunkReload(storage: Storage = sessionStorage, reload: () => void = () => window.location.reload()): boolean {
  try {
    const last = Number(storage.getItem(RELOAD_KEY) || 0);
    if (last && Date.now() - last < RELOAD_WINDOW_MS) return false;
    storage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  reload();
  return true;
}

export function lazyWithRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      if (!isChunkLoadError(err)) throw err;
      try {
        return await factory(); // transient network blip
      } catch (err2) {
        if (guardedChunkReload()) return new Promise<never>(() => {}); // page is reloading
        throw err2;
      }
    }
  });
}
