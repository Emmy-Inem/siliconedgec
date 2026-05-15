import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Video, Plus, Pencil, Trash2, ExternalLink, Calendar, Clock, LayoutGrid, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LiveClassCalendar } from "@/components/LiveClassCalendar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const PROVIDER_PATTERNS: Record<string, RegExp> = {
  zoom: /^https?:\/\/([a-z0-9-]+\.)?zoom\.us\//i,
  google_meet: /^https?:\/\/meet\.google\.com\//i,
  teams: /^https?:\/\/(teams\.microsoft\.com|teams\.live\.com)\//i,
};

function detectProvider(url: string): string | null {
  const u = url.trim();
  if (!u) return null;
  for (const [key, re] of Object.entries(PROVIDER_PATTERNS)) {
    if (re.test(u)) return key;
  }
  return null;
}

interface LiveClass {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  meeting_url: string;
  meeting_provider: string;
  scheduled_at: string;
  duration_minutes: number;
  instructor_name: string | null;
  status: string;
}

const empty = {
  course_id: "",
  title: "",
  description: "",
  meeting_url: "",
  meeting_provider: "zoom",
  scheduled_at: "",
  duration_minutes: 60,
  instructor_name: "",
  status: "scheduled",
};

export default function AdminLiveClasses() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LiveClass | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [view, setView] = useState<"list" | "calendar">("list");

  // URL warning if it doesn't match the chosen provider (Zoom/Meet/Teams).
  const urlMismatch = (() => {
    const detected = detectProvider(form.meeting_url);
    if (!form.meeting_url || form.meeting_provider === "other") return null;
    if (!detected) return `This doesn't look like a ${form.meeting_provider.replace("_", " ")} link.`;
    if (detected !== form.meeting_provider) return `URL looks like ${detected.replace("_", " ")} — switch the provider above to match.`;
    return null;
  })();

  const { data: classes, isLoading } = useQuery({
    queryKey: ["admin-live-classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_classes")
        .select("*, course:courses(id, title)")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["admin-courses-list"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").order("title");
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("You must be signed in as an admin to schedule a class.");
      if (!form.course_id) throw new Error("Please select a course.");
      if (!form.title.trim()) throw new Error("Please enter a title.");
      if (!form.meeting_url.trim()) throw new Error("Please paste a meeting URL (Zoom, Google Meet, Teams or other).");
      if (!form.scheduled_at) throw new Error("Please pick a date & time.");
      const when = new Date(form.scheduled_at);
      if (isNaN(when.getTime())) throw new Error("Invalid date & time.");
      const payload = {
        ...form,
        scheduled_at: when.toISOString(),
        duration_minutes: Number(form.duration_minutes) || 60,
        description: form.description?.trim() || null,
        instructor_name: form.instructor_name?.trim() || null,
        created_by: user!.id,
      };
      if (editing) {
        const { error } = await supabase.from("live_classes").update(payload).eq("id", editing.id);
        if (error) throw error;
        return { id: editing.id, kind: "updated" as const, rescheduled: editing.scheduled_at !== payload.scheduled_at };
      } else {
        const { data, error } = await supabase.from("live_classes").insert(payload).select("id").single();
        if (error) throw error;
        return { id: data.id, kind: "new" as const, rescheduled: true };
      }
    },
    onSuccess: async (result) => {
      qc.invalidateQueries({ queryKey: ["admin-live-classes"] });
      toast({ title: result.kind === "new" ? "Class scheduled" : "Class updated" });
      setOpen(false); setEditing(null); setForm(empty);
      // Email all enrolled students immediately (only on new or reschedule).
      if (result.rescheduled) {
        try {
          const { data, error } = await supabase.functions.invoke("live-class-notify", {
            body: { live_class_id: result.id, kind: result.kind },
          });
          if (error) throw error;
          toast({ title: "Students notified", description: `Emailed ${data?.sent ?? 0} of ${data?.enrolled ?? 0} enrolled students.` });
        } catch (e: any) {
          toast({ title: "Class saved, but email failed", description: e?.message ?? String(e), variant: "destructive" });
        }
      }
    },
    onError: (e: any) => toast({
      title: "Save failed",
      description: e?.message || e?.details || e?.hint || "Unknown error — please try again.",
      variant: "destructive",
    }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("live_classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-live-classes"] });
      toast({ title: "Class deleted" });
    },
  });

  const openEdit = (c: LiveClass) => {
    setEditing(c);
    setForm({
      course_id: c.course_id,
      title: c.title,
      description: c.description ?? "",
      meeting_url: c.meeting_url,
      meeting_provider: c.meeting_provider,
      scheduled_at: c.scheduled_at.slice(0, 16),
      duration_minutes: c.duration_minutes,
      instructor_name: c.instructor_name ?? "",
      status: c.status,
    });
    setOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Video className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Live Classes</h1>
            <p className="text-sm text-muted-foreground">
              Schedule Zoom / Google Meet sessions for enrolled students ({classes?.length ?? 0})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-lg p-1 text-xs">
            <button
              onClick={() => setView("list")}
              className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${view === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> List
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${view === "calendar" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Calendar
            </button>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Schedule Class
          </Button>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : !classes?.length ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <Video className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No live classes scheduled yet</p>
        </div>
      ) : view === "calendar" ? (
        <LiveClassCalendar classes={classes as any} showJoin={true} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map((c) => {
            const dt = new Date(c.scheduled_at);
            const endMs = dt.getTime() + (c.duration_minutes ?? 60) * 60 * 1000;
            const now = Date.now();
            const isPast = now > endMs || c.status === "ended";
            const isLiveNow = !isPast && c.status !== "cancelled" && (c.status === "live" || (now >= dt.getTime() && now <= endMs));
            return (
              <div key={c.id} className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Badge
                      variant={isPast ? "outline" : "default"}
                      className={`mb-2 capitalize text-xs ${isLiveNow ? "bg-red-500/10 text-red-600 border-0" : ""}`}
                    >
                      {isLiveNow ? "● Live" : isPast ? "Past" : c.status}
                    </Badge>
                    <h3 className="font-heading font-bold leading-tight">{c.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{c.course?.title}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs uppercase">{c.meeting_provider}</Badge>
                </div>
                {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{dt.toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {c.duration_minutes}m</span>
                </div>
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button size="sm" variant="outline" className="flex-1 gap-1" asChild>
                    <a href={c.meeting_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" /> Join
                    </a>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => del.mutate(c.id)} className="text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "Edit Live Class" : "Schedule Live Class"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Course</Label>
              <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {courses?.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Meeting URL</Label>
                  <Input
                    placeholder="https://zoom.us/j/...  ·  https://meet.google.com/abc-defg-hij"
                    value={form.meeting_url}
                    onChange={(e) => {
                      const url = e.target.value;
                      const detected = detectProvider(url);
                      setForm({
                        ...form,
                        meeting_url: url,
                        // Auto-switch provider when a recognised URL is pasted.
                        meeting_provider: detected ?? form.meeting_provider,
                      });
                    }}
                  />
                  {urlMismatch && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{urlMismatch}</p>
                  )}
                  {form.meeting_provider === "google_meet" && !form.meeting_url && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Need a link?{" "}
                      <a href="https://meet.new" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        Open meet.new
                      </a>{" "}
                      to create one instantly, then paste it here.
                    </p>
                  )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Provider</Label>
                <Select value={form.meeting_provider} onValueChange={(v) => setForm({ ...form, meeting_provider: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zoom">Zoom</SelectItem>
                    <SelectItem value="google_meet">Google Meet</SelectItem>
                    <SelectItem value="teams">MS Teams</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="live">Live now</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date & Time</Label>
                <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Saved in {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
              </div>
              <div>
                <Label>Duration (min)</Label>
                <Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value || "60") })} />
              </div>
            </div>
            <div>
              <Label>Instructor (optional)</Label>
              <Input value={form.instructor_name} onChange={(e) => setForm({ ...form, instructor_name: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.course_id || !form.title || !form.meeting_url || !form.scheduled_at}>
              {editing ? "Update" : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
