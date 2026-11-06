type EmailPayload = {
  from: string; to: string | string[]; subject: string;
  html?: string; text?: string; idempotency_key?: string;
};

// Only server-configured company senders are used; queue metadata stays local.
export async function sendResendEmail(
  payload: EmailPayload,
  apiKey: string,
  from: string | undefined,
  request: typeof fetch = fetch,
) {
  if (!from || /[\r\n]/.test(from) ||
      !/^(?:[^<>]+<)?[^<>\s@]+@siliconedgec\.com>?$/i.test(from)) {
    throw new Error("RESEND_FROM must use the verified company domain");
  }
  if (!payload.idempotency_key) throw new Error("Email idempotency key is required");
  const response = await request("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": payload.idempotency_key },
    body: JSON.stringify({ from, to: payload.to, subject: payload.subject, html: payload.html, text: payload.text }),
  });
  if (!response.ok) {
    // Do not propagate provider bodies containing recipients or message content.
    await response.body?.cancel();
    const retryAfter = response.headers.get("Retry-After");
    const seconds = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : 60;
    throw Object.assign(new Error(`Email provider request failed (${response.status})`), {
      status: response.status, retryAfterSeconds: Math.max(1, seconds),
    });
  }
  return response.json();
}
