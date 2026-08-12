// Shared helper: records every outbound email attempt in email_delivery_log so
// the admin area has one source of truth for delivery, bounces and engagement.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export type EmailLogEntry = {
  recipient_email: string;
  subject?: string;
  status: "queued" | "sent" | "failed" | "skipped" | "bounced" | "complained";
  category?: string;
  template_key?: string | null;
  campaign_id?: string | null;
  user_id?: string | null;
  message_id?: string | null;
  provider?: string;
  error_message?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logEmail(entry: EmailLogEntry) {
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    await admin.from("email_delivery_log").insert({
      provider: entry.provider ?? "resend",
      category: entry.category ?? "transactional",
      ...entry,
    });
  } catch (e) {
    console.error("[email-log] failed to record delivery", e);
  }
}
