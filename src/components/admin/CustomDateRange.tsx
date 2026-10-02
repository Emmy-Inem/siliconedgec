import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** True when the timestamp falls within [from, to] (YYYY-MM-DD, inclusive, local time). Empty bounds are open. */
export function inCustomRange(date: string | number | Date | null | undefined, from: string, to: string) {
  if (!date) return false;
  const t = +new Date(date);
  if (from && t < +new Date(`${from}T00:00:00`)) return false;
  if (to && t > +new Date(`${to}T23:59:59.999`)) return false;
  return true;
}

interface Props {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  className?: string;
}

/** Start/end date inputs shown when an admin picks "Custom range". */
export function CustomDateRange({ from, to, onChange, className = "" }: Props) {
  const cls = "h-9 px-2 rounded-md border border-input bg-background text-sm";
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input type="date" aria-label="Start date" value={from} max={to || undefined} onChange={(e) => onChange(e.target.value, to)} className={cls} />
      <span className="text-xs text-muted-foreground">to</span>
      <input type="date" aria-label="End date" value={to} min={from || undefined} onChange={(e) => onChange(from, e.target.value)} className={cls} />
    </div>
  );
}

/** Staff-only map of user_id → email, for searching by email. */
export function useUserEmails() {
  const { data } = useQuery({
    queryKey: ["admin-user-emails"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await (supabase.rpc as any)("admin_user_emails");
      const m = new Map<string, string>();
      (data ?? []).forEach((r: { user_id: string; email: string }) => m.set(r.user_id, r.email ?? ""));
      return m;
    },
  });
  return data ?? new Map<string, string>();
}
