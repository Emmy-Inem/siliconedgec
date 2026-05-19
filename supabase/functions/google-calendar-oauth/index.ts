// Per-user Google OAuth flow for Google Calendar.
// Two endpoints in one function:
//   GET  ?action=start    -> returns the Google OAuth consent URL (requires JWT)
//   GET  /callback        -> Google redirects here with ?code=...&state=<user_id|return_url>
//                             We exchange the code, store the refresh token, then redirect
//                             the browser back into the app.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!;
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-calendar-oauth/callback`;
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
].join(" ");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const isCallback = url.pathname.endsWith("/callback");

  try {
    // ---- CALLBACK: exchange code for tokens ----
    if (isCallback) {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state") ?? "";
      const err = url.searchParams.get("error");
      const [userId, ...rest] = state.split("|");
      const returnTo = rest.join("|") || "/dashboard";

      if (err || !code || !userId) {
        return Response.redirect(`${returnTo}?gcal=error`, 302);
      }

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });
      const tokens = await tokenRes.json();
      if (!tokens.refresh_token) {
        console.error("No refresh_token in Google response", tokens);
        return Response.redirect(`${returnTo}?gcal=no_refresh`, 302);
      }

      // Fetch the user's email from the id_token (basic decode, no signature check needed — it's our own flow).
      let googleEmail: string | null = null;
      try {
        if (tokens.id_token) {
          const payload = JSON.parse(atob(tokens.id_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
          googleEmail = payload.email ?? null;
        }
      } catch (_) { /* noop */ }

      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
      await supabase.from("google_calendar_tokens").upsert({
        user_id: userId,
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token ?? null,
        expires_at: tokens.expires_in
          ? new Date(Date.now() + (tokens.expires_in as number) * 1000).toISOString()
          : null,
        scope: tokens.scope ?? null,
        google_email: googleEmail,
        timezone: "Africa/Lagos",
      }, { onConflict: "user_id" });

      // Kick off a background sync of any upcoming live classes the user can attend.
      fetch(`${SUPABASE_URL}/functions/v1/google-calendar-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_ROLE}` },
        body: JSON.stringify({ user_id: userId, action: "sync_upcoming" }),
      }).catch((e) => console.error("background sync failed", e));

      return Response.redirect(`${returnTo}?gcal=connected`, 302);
    }

    // ---- START: build consent URL ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const returnTo = url.searchParams.get("return_to") ?? "/dashboard";
    const consent = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    consent.searchParams.set("client_id", CLIENT_ID);
    consent.searchParams.set("redirect_uri", REDIRECT_URI);
    consent.searchParams.set("response_type", "code");
    consent.searchParams.set("scope", SCOPES);
    consent.searchParams.set("access_type", "offline");
    consent.searchParams.set("prompt", "consent");
    consent.searchParams.set("include_granted_scopes", "true");
    consent.searchParams.set("state", `${user.id}|${returnTo}`);

    return new Response(JSON.stringify({ url: consent.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("google-calendar-oauth error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});