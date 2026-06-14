import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { logAdminActivity } from "@/lib/admin-logger";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Send, Users, GraduationCap, Clock, CheckCircle2, AlertCircle, BadgeDollarSign, ClipboardList, Briefcase, BookOpen, Eye, Loader2, Sparkles } from "lucide-react";

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
  { value: "all", label: "All Users", icon: Users, desc: "Every registered user" },
  { value: "enrolled", label: "Enrolled", icon: GraduationCap, desc: "Users with ≥1 enrollment" },
  { value: "paid", label: "Paid Customers", icon: BadgeDollarSign, desc: "Paid / confirmed enrollments" },
  { value: "registrants", label: "Webinar Registrants", icon: ClipboardList, desc: "Course / webinar registrants" },
  { value: "business_leads", label: "Business Leads", icon: Briefcase, desc: "B2B inquiry contacts" },
  { value: "course", label: "Specific Course", icon: BookOpen, desc: "Students of one course" },
];

export default function AdminEmail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [composeOpen, setComposeOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", body: "", target_audience: "all", course_id: "" });
  const [preview, setPreview] = useState<{ count: number; sample: string[] } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [drafting, setDrafting] = useState(false);

  const draftWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setDrafting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-draft-content", {
        body: { kind: "email", prompt: aiPrompt.trim(), audience: form.target_audience },
      });
      if (error) throw error;
      setForm((f) => ({ ...f, subject: data?.subject ?? f.subject, body: data?.body ?? f.body }));
      toast({ title: "Draft ready", description: "Review and edit before sending." });
    } catch (e: any) {
      toast({ title: "Couldn't draft", description: e.message ?? "Try again", variant: "destructive" });
    } finally {
      setDrafting(false);
    }
  };

  const { data: courseOptions = [] } = useQuery({
    queryKey: ["admin-email-course-options"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").order("title");
      return (data ?? []) as { id: string; title: string }[];
    },
  });

  const refreshPreview = async () => {
    if (form.target_audience === "course" && !form.course_id) {
      setPreview({ count: 0, sample: [] });
      return;
    }
    setPreviewLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-bulk-announcement", {
        body: { preview: true, audience: form.target_audience, course_id: form.course_id || undefined, announcement_id: "" },
      });
      if (error) throw error;
      setPreview({ count: data?.recipients ?? 0, sample: data?.sample ?? [] });
    } catch (e: any) {
      toast({ title: "Preview failed", description: e.message, variant: "destructive" });
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

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

      // Fetch recipient emails (server-side, since auth.users isn't client-exposed),
      // then open Gmail's compose window with all addresses pre-filled in BCC.
      const { data: bulk, error: bulkErr } = await supabase.functions.invoke("send-bulk-announcement", {
        body: {
          announcement_id: inserted.id,
          audience: form.target_audience,
          course_id: form.course_id || undefined,
        },
      });
      if (bulkErr) throw bulkErr;

      const emails: string[] = bulk?.emails ?? [];
      // Gmail's URL-based compose has a practical query-string length limit
      // (~2000 chars). Chunk the BCC list and open one tab per chunk so no
      // recipients are silently dropped.
      const chunks: string[][] = [];
      const CHUNK = 90; // ~90 emails per tab keeps URL well under the limit
      for (let i = 0; i < emails.length; i += CHUNK) chunks.push(emails.slice(i, i + CHUNK));
      const total = chunks.length;
      chunks.forEach((chunk, idx) => {
        const subj = total > 1 ? `${form.subject} (${idx + 1}/${total})` : form.subject;
        const url =
          "https://mail.google.com/mail/?view=cm&fs=1" +
          `&bcc=${encodeURIComponent(chunk.join(","))}` +
          `&su=${encodeURIComponent(subj)}` +
          `&body=${encodeURIComponent(form.body)}`;
        // Stagger so popup blockers are less likely to suppress later tabs.
        setTimeout(() => window.open(url, "_blank", "noopener,noreferrer"), idx * 250);
      });

      await logAdminActivity("create", "email", inserted.id, {
        subject: form.subject,
        audience: form.target_audience,
        recipients: bulk?.recipients ?? 0,
        delivery: "gmail-compose",
        gmail_drafts: total,
      });

      return { ...bulk, total };
    },
    onSuccess: (bulk: any) => {
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
      setComposeOpen(false);
      setForm({ subject: "", body: "", target_audience: "all", course_id: "" });
      setPreview(null);
      const recipients = bulk?.recipients ?? 0;
      const total = bulk?.total ?? 0;
      toast({
        title: recipients > 0 ? "Gmail opened" : "No recipients",
        description:
          recipients > 0
            ? `Opened ${total} Gmail draft${total === 1 ? "" : "s"} with ${recipients.toLocaleString()} recipient${recipients === 1 ? "" : "s"} pre-filled in BCC. Allow pop-ups if a tab didn't open.`
            : "No registered accounts matched this audience.",
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
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <label className="text-xs font-medium flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> Draft with AI</label>
              <div className="flex gap-2">
                <input
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Remind learners about next week's live Cloud session"
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button type="button" size="sm" variant="outline" onClick={draftWithAI} disabled={drafting || !aiPrompt.trim()}>
                  {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  <span className="ml-1">Draft</span>
                </Button>
              </div>
            </div>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AUDIENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setForm({ ...form, target_audience: opt.value }); setPreview(null); }}
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
              {form.target_audience === "course" && (
                <select
                  value={form.course_id}
                  onChange={(e) => { setForm({ ...form, course_id: e.target.value }); setPreview(null); }}
                  className="mt-2 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Pick a course…</option>
                  {courseOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Eye className="h-3.5 w-3.5" />
                  Recipient preview
                  {preview && (
                    <span className="text-foreground font-medium">{preview.count.toLocaleString()} recipients</span>
                  )}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={refreshPreview} disabled={previewLoading}>
                  {previewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Preview"}
                </Button>
              </div>
              {preview && preview.sample.length > 0 && (
                <p className="mt-2 text-[11px] text-muted-foreground line-clamp-3 break-all">
                  {preview.sample.slice(0, 8).join(", ")}{preview.count > 8 ? `, +${preview.count - 8} more` : ""}
                </p>
              )}
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
