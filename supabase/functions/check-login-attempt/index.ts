import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, success } = await req.json();
    if (typeof email !== "string" || typeof success !== "boolean") {
      return new Response(JSON.stringify({ error: "invalid input" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const cleanEmail = email.toLowerCase().trim().slice(0, 255);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
    const ua = (req.headers.get("user-agent") || "").slice(0, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // First check if locked
    const { data: locked } = await supabase.rpc("is_login_locked", { _email: cleanEmail, _ip: ip });

    // Check if IP is on the blocklist
    let ipBlocked = false;
    try {
      const { data } = await (supabase.rpc as any)("is_ip_blocked", { _ip: ip });
      ipBlocked = !!data;
    } catch {}

    // Log attempt
    await supabase.from("login_attempts").insert({ email: cleanEmail, ip_address: ip, success, user_agent: ua });

    return new Response(JSON.stringify({ locked: !!locked, ip_blocked: ipBlocked }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
