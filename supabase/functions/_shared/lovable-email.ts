import { sendLovableEmail } from "npm:@lovable.dev/email-js";
import { emailConnection } from "./lovable-connection.ts";
import { sendResendEmail } from "./resend.ts";

// Same provider call contract, keeping queue retry/idempotency handling unchanged.
export async function sendLovableEmailViaRelay(
  payload: Parameters<typeof sendLovableEmail>[0],
  options: Parameters<typeof sendLovableEmail>[1],
) {
  const connection = emailConnection(name => Deno.env.get(name));
  if (connection.provider === "resend") {
    return sendResendEmail(payload, connection.key, Deno.env.get("RESEND_FROM"));
  }
  if (!connection.emailUrl) return sendLovableEmail(payload, options);
  const response = await fetch(connection.emailUrl, {
    method: "POST", headers: { Authorization: `Bearer ${connection.key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw Object.assign(new Error("Email relay request failed"), {
      status: response.status, retryAfterSeconds: 60,
    });
  }
  return response.json();
}
