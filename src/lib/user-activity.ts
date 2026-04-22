import { supabase } from "@/integrations/supabase/client";

export async function logUserActivity(params: {
  user_id?: string | null;
  action: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await (supabase.from("user_activity_log") as any).insert({
      user_id: params.user_id ?? null,
      action: params.action,
      entity_type: params.entity_type ?? null,
      entity_id: params.entity_id ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
      metadata: params.metadata ?? {},
    });
  } catch {}
}
