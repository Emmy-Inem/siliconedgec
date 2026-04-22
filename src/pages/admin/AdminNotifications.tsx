import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Bell, Send, Loader2, Users, User, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type Target = "all" | "user" | "course";

export default function AdminNotifications() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [type, setType] = useState("info");
  const [target, setTarget] = useState<Target>("all");
  const [userId, setUserId] = useState("");
  const [courseId, setCourseId] = useState("");

  const { data: profiles = [] } = useQuery({
    queryKey: ["notif-profiles"],
    queryFn: async () => (await supabase.from("profiles").select("user_id, full_name").order("full_name").limit(500)).data ?? [],
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["notif-courses"],
    queryFn: async () => (await supabase.from("courses").select("id, title").order("title")).data ?? [],
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["notif-recent"],
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20)).data ?? [],
  });

  const send = useMutation({
    mutationFn: async () => {
      let recipients: string[] = [];
      if (target === "all") {
        recipients = profiles.map((p: any) => p.user_id);
      } else if (target === "user") {
        if (!userId) throw new Error("Pick a user");
        recipients = [userId];
      } else if (target === "course") {
        if (!courseId) throw new Error("Pick a course");
        const { data, error } = await supabase.from("enrollments").select("user_id").eq("course_id", courseId);
        if (error) throw error;
        recipients = Array.from(new Set((data ?? []).map((e: any) => e.user_id)));
      }
      if (recipients.length === 0) throw new Error("No recipients found");
      const rows = recipients.map((uid) => ({
        user_id: uid,
        title,
        message: message || null,
        link: link || null,
        type,
      }));
      const { error } = await supabase.from("notifications").insert(rows);
      if (error) throw error;
      return recipients.length;
    },
    onSuccess: (n) => {
      toast({ title: "Sent!", description: `${n} notifications delivered.` });
      qc.invalidateQueries({ queryKey: ["notif-recent"] });
      setTitle(""); setMessage(""); setLink("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Bell className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">Notifications Composer</h1>
          <p className="text-sm text-muted-foreground">Send in-app notifications to all users, a single user, or course segments.</p>
        </div>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Compose</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New course launched" />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Detail what's happening..." rows={4} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Link (optional)</Label>
                <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/courses or https://..." />
              </div>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <Label>Audience</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: "all", label: "All users", Icon: Users },
                  { v: "user", label: "Single user", Icon: User },
                  { v: "course", label: "Course enrollees", Icon: GraduationCap },
                ].map((t) => (
                  <button
                    key={t.v}
                    onClick={() => setTarget(t.v as Target)}
                    className={`p-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${target === t.v ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/30 text-muted-foreground"}`}
                  >
                    <t.Icon className="h-4 w-4" />
                    {t.label}
                  </button>
                ))}
              </div>
              {target === "user" && (
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger><SelectValue placeholder="Pick a user..." /></SelectTrigger>
                  <SelectContent>
                    {profiles.map((p: any) => (
                      <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.user_id.slice(0, 8)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {target === "course" && (
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger><SelectValue placeholder="Pick a course..." /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {target === "all" && (
                <p className="text-[11px] text-muted-foreground">Will send to ~{profiles.length} users with profiles.</p>
              )}
            </div>

            <Button className="w-full" onClick={() => send.mutate()} disabled={!title || send.isPending}>
              {send.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send notification
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Recent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No notifications yet.</p>
            ) : (
              recent.map((n: any) => (
                <div key={n.id} className="p-2.5 rounded-md border border-border bg-muted/30">
                  <p className="font-medium text-sm">{n.title}</p>
                  {n.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}