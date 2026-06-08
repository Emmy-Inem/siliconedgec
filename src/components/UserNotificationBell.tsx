import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

const AUTO_DL_KEY = "sec_auto_dl_cert_ids";

function rememberAutoDownload(id: string) {
  try {
    const set = new Set<string>(JSON.parse(localStorage.getItem(AUTO_DL_KEY) || "[]"));
    set.add(id);
    localStorage.setItem(AUTO_DL_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}
function alreadyAutoDownloaded(id: string) {
  try {
    const arr = JSON.parse(localStorage.getItem(AUTO_DL_KEY) || "[]") as string[];
    return arr.includes(id);
  } catch { return false; }
}

/**
 * In-header notification center for signed-in users.
 * When a "Course completed!" notification arrives, navigates the user to
 * /certificates which automatically renders & downloads their new PDF.
 */
export function UserNotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ["user-notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications").select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        async (payload) => {
          const n = payload.new as Notification;
          toast(n.title, { description: n.message ?? undefined });
          qc.invalidateQueries({ queryKey: ["user-notifications", user.id] });

          // Auto-deliver certificate on course completion.
          if (n.title?.toLowerCase().includes("course completed")) {
            try {
              const { data: cert } = await supabase
                .from("certificates")
                .select("id")
                .eq("user_id", user.id)
                .order("issued_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              if (cert && !alreadyAutoDownloaded(cert.id)) {
                rememberAutoDownload(cert.id);
                qc.invalidateQueries({ queryKey: ["my-certificates", user.id] });
                toast.success("Your certificate is ready", {
                  description: "Opening your certificates page to download…",
                });
                setTimeout(() => navigate("/certificates?download=latest"), 800);
              }
            } catch {}
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc, navigate]);

  // Click-outside close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-notifications", user?.id] }),
  });
  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-notifications", user?.id] }),
  });

  if (!user) return null;

  const typeColor: Record<string, string> = {
    success: "bg-green-500", warning: "bg-amber-500", error: "bg-red-500", info: "bg-blue-500",
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className="relative p-2 rounded-md text-foreground hover:text-primary hover:bg-muted transition-colors"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-heading font-semibold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (!n.is_read) markRead.mutate(n.id);
                      if (n.link) { navigate(n.link); setOpen(false); }
                    }}
                    className={`flex gap-3 px-4 py-3 border-b border-border last:border-0 w-full text-left hover:bg-muted/50 transition-colors ${
                      !n.is_read ? "bg-primary/[0.03]" : ""
                    }`}
                  >
                    <span className={`mt-1 block w-2 h-2 rounded-full ${typeColor[n.type] ?? typeColor.info}`} />
                    <span className="flex-1 min-w-0">
                      <span className={`block text-xs font-medium ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</span>
                      {n.message && <span className="block text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.message}</span>}
                      <span className="block text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</span>
                    </span>
                    {n.link && <ExternalLink className="h-3 w-3 text-muted-foreground/40 shrink-0 mt-1" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function timeAgo(date: string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}