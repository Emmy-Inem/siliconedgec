// Returns a CSV export of all platform users (email + profile + role).
// Admin-only. Pulls emails from auth.users via the service-role admin API.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { safeErrorResponse } from "../_shared/errors.ts";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "missing-auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: userData } = await admin.auth.getUser(token);
    const callerId = userData.user?.id;
    if (!callerId) return new Response(JSON.stringify({ error: "invalid-auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: isAdm } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (!isAdm) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const [{ data: profiles }, { data: roles }] = await Promise.all([
      admin.from("profiles").select("user_id, full_name, created_at"),
      admin.from("user_roles").select("user_id, role"),
    ]);
    const profileMap = new Map<string, any>();
    (profiles ?? []).forEach((p: any) => profileMap.set(p.user_id, p));
    const roleMap = new Map<string, string>();
    (roles ?? []).forEach((r: any) => roleMap.set(r.user_id, r.role));

    const rows: string[][] = [["email", "full_name", "role", "user_id", "joined_at", "last_sign_in_at"]];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const users = data?.users ?? [];
      for (const u of users) {
        const p = profileMap.get(u.id);
        rows.push([
          u.email ?? "",
          p?.full_name ?? "",
          roleMap.get(u.id) ?? "user",
          u.id,
          u.created_at ?? p?.created_at ?? "",
          (u as any).last_sign_in_at ?? "",
        ]);
      }
      if (users.length < perPage) break;
      page += 1;
      if (page > 50) break;
    }

    const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
    return new Response(csv, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="users-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    return safeErrorResponse(e, 500, corsHeaders, "Failed to export users");
  }
});