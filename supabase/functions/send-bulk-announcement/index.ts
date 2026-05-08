// Returns the list of recipient emails for an announcement audience.
// Pulls emails from auth.users via the service-role admin API — these
// addresses are NOT exposed to the client, so this MUST run server-side.
// The admin UI then opens Gmail's compose window with these addresses
// pre-filled in BCC. We also update the matching email_announcements row
// with the real recipient count and a "drafted" status.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  announcement_id: string;
  audience: "all" | "enrolled";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // Verify caller is an admin.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "missing-auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: userData } = await admin.auth.getUser(token);
    const callerId = userData.user?.id;
    if (!callerId) return new Response(JSON.stringify({ error: "invalid-auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: isAdm } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (!isAdm) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { announcement_id, audience } = (await req.json()) as Payload;
    if (!announcement_id) {
      return new Response(JSON.stringify({ error: "missing-fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build the recipient list.
    let allowedUserIds: Set<string> | null = null;
    if (audience === "enrolled") {
      const { data: enr } = await admin.from("enrollments").select("user_id");
      allowedUserIds = new Set((enr ?? []).map((r: any) => r.user_id));
    }

    const recipients: string[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const users = data?.users ?? [];
      for (const u of users) {
        if (!u.email) continue;
        if (allowedUserIds && !allowedUserIds.has(u.id)) continue;
        recipients.push(u.email);
      }
      if (users.length < perPage) break;
      page += 1;
      if (page > 50) break; // safety cap
    }

    await admin
      .from("email_announcements")
      .update({ recipient_count: recipients.length, status: "drafted" })
      .eq("id", announcement_id);

    return new Response(
      JSON.stringify({ ok: true, recipients: recipients.length, emails: recipients }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[send-bulk-announcement] error", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});