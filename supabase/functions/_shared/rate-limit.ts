// Shared sliding-window rate limiter for Edge Functions

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const cache = new Map<string, RateLimitEntry>();

// Periodic garbage collection every 5 minutes to prevent memory leaks
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60 * 1000) return;
  lastCleanup = now;
  for (const [key, entry] of cache.entries()) {
    if (entry.resetAt <= now) {
      cache.delete(key);
    }
  }
}

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number; // in seconds
  resetAt: number;
}

export function checkRateLimit(opts: RateLimitOptions): RateLimitResult {
  cleanup();

  const now = Date.now();
  const existing = cache.get(opts.key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowMs;
    cache.set(opts.key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: opts.limit - 1,
      retryAfter: 0,
      resetAt,
    };
  }

  if (existing.count >= opts.limit) {
    const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      retryAfter,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: opts.limit - existing.count,
    retryAfter: 0,
    resetAt: existing.resetAt,
  };
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

export function rateLimitResponse(
  retryAfter: number,
  corsHeaders: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded. Please wait a moment before trying again.",
      retry_after: retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    }
  );
}
