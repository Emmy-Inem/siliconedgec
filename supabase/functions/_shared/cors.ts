// Shared CORS configuration pinned to authorized frontend origins

const ALLOWED_EXACT_ORIGINS = new Set([
  "https://siliconedgec.com",
  "https://www.siliconedgec.com",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173",
]);

export function getAllowedOrigin(req: Request): string {
  const origin = req.headers.get("Origin") || req.headers.get("origin") || "";
  
  // Exact match against whitelist
  if (ALLOWED_EXACT_ORIGINS.has(origin)) {
    return origin;
  }

  // Environment-configured overrides (e.g. preview deployments)
  const envAllowed = Deno.env.get("ALLOWED_ORIGINS");
  if (envAllowed) {
    const list = envAllowed.split(",").map((s) => s.trim());
    if (list.includes(origin)) {
      return origin;
    }
  }

  // Allow verified Lovable preview environments if requested
  if (origin && /^https:\/\/[a-z0-9-]+\.(lovable\.app|lovableproject\.com)$/.test(origin)) {
    return origin;
  }

  // Default to canonical production origin
  return "https://siliconedgec.com";
}

export function getCorsHeaders(req: Request, extraHeaders: Record<string, string> = {}): Record<string, string> {
  const allowedOrigin = getAllowedOrigin(req);
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Vary": "Origin",
    ...extraHeaders,
  };
}

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(req),
    });
  }
  return null;
}
