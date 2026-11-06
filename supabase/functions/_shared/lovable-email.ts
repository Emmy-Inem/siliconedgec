import { sendLovableEmail } from "npm:@lovable.dev/email-js";
import { lovableConnection } from "./lovable-connection.ts";

// Same provider call contract, keeping queue retry/idempotency handling unchanged.
export async function sendLovableEmailViaRelay(
  payload: Parameters<typeof sendLovableEmail>[0],
  options: Parameters<typeof sendLovableEmail>[1],
) {
  const connection = lovableConnection(name => Deno.env.get(name));
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
