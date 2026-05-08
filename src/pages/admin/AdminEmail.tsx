import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { logAdminActivity } from "@/lib/admin-logger";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Send, Users, GraduationCap, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface Announcement {
  id: string;
  subject: string;
  body: string;
  target_audience: string;
  sent_at: string;
  recipient_count: number;
  status: string;
}

const AUDIENCE_OPTIONS = [
  { value: "all", label: "All Users", icon: Users, desc: "Send to every registered user" },
  { value: "enrolled", label: "Enrolled Users", icon: GraduationCap, desc: "Users with at least one enrollment" },
];

export default function AdminEmail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [composeOpen, setComposeOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", body: "", target_audience: "all" });

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_announcements")
        .select("*")
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return data as Announcement[];
    },
  });

  const sendAnnouncement = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      // Store the announcement first so we have an id to update once the
      // bulk-send completes (real recipient count comes from auth.users).
      const { data: inserted, error } = await supabase.from("email_announcements").insert({
        subject: form.subject,
        body: form.body,
        target_audience: form.target_audience,
        sent_by: user.id,
        recipient_count: 0,
        status: "queued",
      }).select("id").single();
      if (error) throw error;

      // Create in-app notifications for all target users
      let userIds: string[] = [];
      if (form.target_audience === "all") {
        const { data: profiles } = await supabase.from("profiles").select("user_id");
        userIds = (profiles ?? []).map(p => p.user_id);
      } else {
        const { data: enrollments } = await supabase.from("enrollments").select("user_id");
        userIds = [...new Set((enrollments ?? []).map(e => e.user_id))];
      }

      // Insert notifications in batches
      const notifs = userIds.map(uid => ({
        user_id: uid,
        title: `📢 ${form.subject}`,
        message: form.body.slice(0, 200),
        type: "info" as const,
      }));

      if (notifs.length > 0) {
        // Insert in chunks of 100
        for (let i = 0; i < notifs.length; i += 100) {
          await supabase.from("notifications").insert(notifs.slice(i, i + 100));
        }
      }

      // Trigger the actual email broadcast — uses service role to read
      // emails from auth.users (not exposed to the client) and send via Resend.
      const { data: bulk, error: bulkErr } = await supabase.functions.invoke("send-bulk-announcement", {
        body: {
          announcement_id: inserted.id,
          subject: form.subject,
          body: form.body,
          audience: form.target_audience,
        },
      });
      if (bulkErr) throw bulkErr;

      await logAdminActivity("create", "email", inserted.id, {
        subject: form.subject,
        audience: form.target_audience,
        recipients: bulk?.recipients ?? 0,
        sent: bulk?.sent ?? 0,
        failed: bulk?.failed ?? 0,
      });

      return bulk;
    },
    onSuccess: (bulk: any) => {
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
      setComposeOpen(false);
      setForm({ subject: "", body: "", target_audience: "all" });
      const recipients = bulk?.recipients ?? 0;
      const status = bulk?.status ?? "queued";
      toast({
        title: status === "queued" ? "Announcement queued" : "Announcement sent!",
        description:
          status === "queued"
            ? `In-app notifications delivered. Email sending is pending (RESEND_API_KEY not configured).`
            : `Emails dispatched to ${recipients.toLocaleString()} registered account${recipients === 1 ? "" : "s"} and in-app notifications delivered.`,
      });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      sent: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      queued: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    const icons: Record<string, typeof CheckCircle2> = { sent: CheckCircle2, queued: Clock, failed: AlertCircle };
    const Icon = icons[status] ?? Clock;
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] ?? styles.queued}`}>
        <Icon className="h-3 w-3" /> {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Email & Announcements</h1>
            <p className="text-sm text-muted-foreground">Send announcements as in-app notifications to your users.</p>
          </div>
        </div>
        <Button onClick={() => setComposeOpen(true)} size="sm">
          <Send className="h-4 w-4 mr-1" /> Compose
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Sent", value: announcements.length, icon: Mail },
          { label: "Total Recipients", value: announcements.reduce((s, a) => s + (a.recipient_count ?? 0), 0), icon: Users },
          { label: "Last Sent", value: announcements[0] ? new Date(announcements[0].sent_at).toLocaleDateString() : "Never", icon: Clock },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-2xl border border-border p-4 hover:border-primary/20 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-heading text-lg font-bold">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* History */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <Mail className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">No announcements sent yet.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Subject</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Audience</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Recipients</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sent</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((a, i) => (
                  <motion.tr
                    key={a.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{a.subject}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{a.target_audience}</td>
                    <td className="px-4 py-3 tabular-nums">{a.recipient_count}</td>
                    <td className="px-4 py-3">{statusBadge(a.status)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(a.sent_at).toLocaleString()}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compose Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Compose Announcement</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); sendAnnouncement.mutate(); }} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Subject</label>
              <input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Important update..."
                required
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Message</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Write your announcement..."
                rows={5}
                required
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Target Audience</label>
              <div className="grid grid-cols-2 gap-2">
                {AUDIENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, target_audience: opt.value })}
                    className={`flex items-start gap-2 p-3 rounded-lg border text-left transition-all ${
                      form.target_audience === opt.value
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <opt.icon className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <div>
                      <p className="text-xs font-medium">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setComposeOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={sendAnnouncement.isPending}>
                <Send className="h-4 w-4 mr-1" />
                {sendAnnouncement.isPending ? "Sending..." : "Send Announcement"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
