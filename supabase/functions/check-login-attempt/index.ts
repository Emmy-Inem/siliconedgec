import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, success, dry_run } = await req.json();
    if (typeof email !== "string" || typeof success !== "boolean") {
      return new Response(JSON.stringify({ error: "invalid input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanEmail = email.toLowerCase().trim().slice(0, 255);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
    const ua = (req.headers.get("user-agent") || "").slice(0, 500);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || serviceKey;
    const admin = createClient(supabaseUrl, serviceKey);

    // Check if IP is explicitly blocked
    let ipBlocked = false;
    try {
      const { data } = await (admin.rpc as any)("is_ip_blocked", { _ip: ip });
      ipBlocked = !!data;
    } catch {}

    // Pre-flight dry-run check:
    // Only verify whether the CALLER'S IP is blocked or locked out.
    // Never query by target email unauthenticated to eliminate account enumeration vectors.
    if (dry_run) {
      const { data: ipLocked } = await admin.rpc("is_login_locked", { _email: "", _ip: ip });
      return new Response(JSON.stringify({ locked: Boolean(ipLocked), ip_blocked: ipBlocked }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process actual attempt
    const authHeader = req.headers.get("Authorization") ?? "";
    const isServiceCall = Boolean(serviceKey && authHeader === `Bearer ${serviceKey}`);

    if (success) {
      // SECURITY: A caller cannot self-report success:true without proving authentication.
      // Require a valid JWT matching the reported email (or service role).
      let isVerifiedUser = false;
      if (isServiceCall) {
        isVerifiedUser = true;
      } else if (authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "").trim();
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: userData } = await userClient.auth.getUser(token);
        if (userData?.user?.email && userData.user.email.toLowerCase().trim() === cleanEmail) {
          isVerifiedUser = true;
        }
      }

      if (!isVerifiedUser) {
        return new Response(JSON.stringify({ error: "Forbidden: unverified success report" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await admin.from("login_attempts").insert({
        email: cleanEmail,
        ip_address: ip,
        success: true,
        user_agent: ua,
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Recording a failed attempt:
    // Rate limit: prevent an IP from spamming thousands of failed rows to lock out innocent accounts
    const recentCutoff = new Date(Date.now() - 60_000).toISOString();
    const { count } = await admin
      .from("login_attempts")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", ip)
      .gte("created_at", recentCutoff);

    if ((count ?? 0) < 15) {
      await admin.from("login_attempts").insert({
        email: cleanEmail,
        ip_address: ip,
        success: false,
        user_agent: ua,
      });
    }

    // Check if the combination is now locked
    const { data: locked } = await admin.rpc("is_login_locked", { _email: cleanEmail, _ip: ip });

    return new Response(JSON.stringify({ locked: Boolean(locked), ip_blocked: ipBlocked }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
