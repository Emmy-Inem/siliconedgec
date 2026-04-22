// Transactional email sender. Uses RESEND_API_KEY if configured;
// otherwise logs the email and returns success (so flows aren't blocked).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

const TEMPLATES = {
  welcome: (name: string) => ({
    subject: "Welcome to Silicon Edge Consulting",
    html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0f172a;color:#fff;border-radius:12px">
      <h1 style="color:#a855f7">Welcome aboard, ${name}!</h1>
      <p>Your Silicon Edge account is ready. Start exploring our job-ready IT training programs in AI, Cloud, and DevOps.</p>
      <a href="https://siliconedgec.lovable.app/courses" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#a855f7;color:#fff;text-decoration:none;border-radius:8px">Browse Courses</a>
    </div>`,
  }),
  enrollment: (name: string, course: string) => ({
    subject: `You're enrolled in ${course}`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0f172a;color:#fff;border-radius:12px">
      <h1 style="color:#a855f7">Enrollment confirmed</h1>
      <p>Hi ${name}, you now have lifetime access to <strong>${course}</strong>.</p>
      <a href="https://siliconedgec.lovable.app/dashboard" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#a855f7;color:#fff;text-decoration:none;border-radius:8px">Go to Dashboard</a>
    </div>`,
  }),
  certificate: (name: string, course: string, code: string) => ({
    subject: `Your certificate for ${course} is ready`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0f172a;color:#fff;border-radius:12px">
      <h1 style="color:#fbbf24">Congratulations, ${name}! 🎓</h1>
      <p>You've completed <strong>${course}</strong>. Verification code: <code>${code}</code></p>
      <a href="https://siliconedgec.lovable.app/certificates" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#a855f7;color:#fff;text-decoration:none;border-radius:8px">View Certificate</a>
    </div>`,
  }),
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { template, to, data } = body as { template?: keyof typeof TEMPLATES; to: string; data?: any } & EmailPayload;

    let payload: EmailPayload;
    if (template && TEMPLATES[template]) {
      const built = (TEMPLATES[template] as any)(...(data ?? []));
      payload = { to, subject: built.subject, html: built.html };
    } else {
      payload = body as EmailPayload;
    }

    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_KEY) {
      console.log("[send-email] RESEND_API_KEY not configured, skipping send", { to: payload.to, subject: payload.subject });
      return new Response(JSON.stringify({ skipped: true, reason: "RESEND_API_KEY not set" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: payload.from ?? "Silicon Edge <onboarding@resend.dev>",
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(result));

    return new Response(JSON.stringify({ ok: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[send-email] error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
