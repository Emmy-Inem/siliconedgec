import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

// Capability check: old hosted-only handlers must not be used as native wallet sessions.
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  const headers = { ...getCorsHeaders(req), "Content-Type": "application/json", "Cache-Control": "no-store" };
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return reply({ error: "Please sign in." }, 401);
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return reply({ error: "Please sign in." }, 401);
    let key = Deno.env.get("STRIPE_PUBLISHABLE_KEY")?.trim();
    if (!key) {
      const { data: row } = await admin.from("site_content").select("value").eq("key", "stripe_publishable_key").maybeSingle();
      key = typeof row?.value === "string" ? row.value.trim() : undefined;
    }
    if (!key || !/^pk_(live|test)_/.test(key)) return reply({ available: false });
    return reply({ available: true, publishable_key: key });
  } catch {
    return reply({ available: false });
  }
});
