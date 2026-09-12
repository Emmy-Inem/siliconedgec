// Per-user Google OAuth flow for Google Calendar.
// Two endpoints in one function:
//   GET  ?action=start    -> returns the Google OAuth consent URL (requires JWT)
//   GET  /callback        -> Google redirects here with ?code=...&state=<signed_state>
//                             We verify signature, exchange code, store refresh token,
//                             then redirect the browser back into the app safely.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

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

async function signState(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${btoa(payload)}.${hex}`;
}

async function verifyState(
  signedState: string,
  secret: string
): Promise<{ valid: boolean; userId?: string; returnTo?: string }> {
  try {
    const [b64, signature] = signedState.split(".");
    if (!b64 || !signature) return { valid: false };
    const payload = atob(b64);
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const expectedSig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
    const expectedHex = Array.from(new Uint8Array(expectedSig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (signature !== expectedHex) return { valid: false };

    const [userId, returnTo, timestamp] = payload.split("|");
    const ageMs = Date.now() - Number(timestamp);
    // Expire state after 15 minutes
    if (isNaN(ageMs) || ageMs < 0 || ageMs > 15 * 60 * 1000) {
      return { valid: false };
    }
    return { valid: true, userId, returnTo };
  } catch {
    return { valid: false };
  }
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);
  const url = new URL(req.url);
  const isCallback = url.pathname.endsWith("/callback");
  const APP_ORIGIN = Deno.env.get("APP_PUBLIC_URL") ?? "https://siliconedgec.com";

  try {
    // ---- CALLBACK: exchange code for tokens ----
    if (isCallback) {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state") ?? "";
      const err = url.searchParams.get("error");

      // Verify HMAC signed state to prevent token-linking mischief
      const stateResult = await verifyState(state, CLIENT_SECRET);
      const userId = stateResult.userId;
      const returnTo = stateResult.returnTo || "/dashboard";

      if (!stateResult.valid || err || !code || !userId) {
        console.error("Invalid Google OAuth callback state or params", { valid: stateResult.valid, err, code: !!code, userId });
        return Response.redirect(absUrl(returnTo, APP_ORIGIN, "invalid_state"), 302);
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
        return Response.redirect(absUrl(returnTo, APP_ORIGIN, "no_refresh"), 302);
      }

      // Fetch the user's email from the id_token
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

      // Kick off a background sync of any upcoming live classes
      fetch(`${SUPABASE_URL}/functions/v1/google-calendar-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_ROLE}` },
        body: JSON.stringify({ user_id: userId, action: "sync_upcoming" }),
      }).catch((e) => console.error("background sync failed", e));

      return Response.redirect(absUrl(returnTo, APP_ORIGIN, "connected"), 302);
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

    let returnTo = url.searchParams.get("return_to") ?? `${APP_ORIGIN}/dashboard`;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.return_to) returnTo = body.return_to as string;
      } catch (_) { /* ignore */ }
    }

    // Cryptographically sign state: userId|returnTo|timestamp
    const payload = `${user.id}|${returnTo}|${Date.now()}`;
    const signedState = await signState(payload, CLIENT_SECRET);

    const consent = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    consent.searchParams.set("client_id", CLIENT_ID);
    consent.searchParams.set("redirect_uri", REDIRECT_URI);
    consent.searchParams.set("response_type", "code");
    consent.searchParams.set("scope", SCOPES);
    consent.searchParams.set("access_type", "offline");
    consent.searchParams.set("prompt", "consent");
    consent.searchParams.set("include_granted_scopes", "true");
    consent.searchParams.set("state", signedState);

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

function absUrl(returnTo: string, origin: string, status: string): string {
  try {
    const u = new URL(returnTo);
    u.searchParams.set("gcal", status);
    return u.toString();
  } catch {
    const path = returnTo.startsWith("/") ? returnTo : `/${returnTo}`;
    return `${origin}${path}?gcal=${status}`;
  }
}