import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Users, Mail, Eye } from "lucide-react";

const AUDIENCES = [
  { value: "subscribers", label: "All newsletter subscribers" },
  { value: "group", label: "Subscriber group" },
  { value: "course", label: "Students of a course" },
  { value: "paid", label: "Paid students" },
  { value: "partners", label: "Approved partners" },
  { value: "all_users", label: "All registered users" },
  { value: "single", label: "Single email address" },
];

export default function AdminNewsletter() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("subscribers");
  const [groupName, setGroupName] = useState("");
  const [courseId, setCourseId] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const { data: subs = [] } = useQuery({
    queryKey: ["newsletter-subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("id,email,full_name,status,source,groups,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["newsletter-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_campaigns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["newsletter-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id,title").order("title");
      return data ?? [];
    },
  });

  const payload = () => ({
    subject,
    body,
    audience,
    group_name: groupName || undefined,
    course_id: courseId || undefined,
    target_email: targetEmail || undefined,
  });

  async function callFn(extra: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke("newsletter-send", {
      body: { ...payload(), ...extra },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function preview() {
    setBusy(true);
    try {
      const data = await callFn({ preview: true });
      setPreviewCount(data.recipients);
      toast({ title: `${data.recipients} recipient(s)`, description: (data.sample ?? []).join(", ") });
    } catch (e: any) {
      toast({ title: "Preview failed", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function sendTest() {
    if (!subject || !body) return toast({ title: "Add a subject and body first", variant: "destructive" });
    setBusy(true);
    try {
      await callFn({ test: true });
      toast({ title: "Test sent", description: "Check your own inbox." });
    } catch (e: any) {
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function send() {
    if (!subject || !body) return toast({ title: "Add a subject and body first", variant: "destructive" });
    if (!confirm("Send this newsletter now?")) return;
    setBusy(true);
    try {
      const { data: campaign } = await supabase
        .from("newsletter_campaigns")
        .insert({
          subject,
          body,
          audience,
          group_name: groupName || null,
          course_id: courseId || null,
          target_email: targetEmail || null,
          status: "sending",
        })
        .select("id")
        .single();
      const data = await callFn({ campaign_id: campaign?.id });
      toast({ title: "Newsletter sent", description: `${data.sent} delivered, ${data.failed} failed.` });
      setSubject(""); setBody("");
      qc.invalidateQueries({ queryKey: ["newsletter-campaigns"] });
    } catch (e: any) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  const subscribed = subs.filter((s: any) => s.status === "subscribed").length;
  const pending = subs.filter((s: any) => s.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Confirmed subscribers", value: subscribed, icon: Users },
          { label: "Awaiting confirmation", value: pending, icon: Mail },
          { label: "Campaigns sent", value: campaigns.filter((c: any) => c.status === "sent").length, icon: Send },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center gap-3">
              <s.icon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Compose newsletter</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Audience</label>
              <Select value={audience} onValueChange={(v) => { setAudience(v); setPreviewCount(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIENCES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {audience === "group" && (
              <div>
                <label className="text-sm font-medium block mb-1">Group name</label>
                <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. cloud-cohort" />
              </div>
            )}
            {audience === "course" && (
              <div>
                <label className="text-sm font-medium block mb-1">Course</label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {audience === "single" && (
              <div>
                <label className="text-sm font-medium block mb-1">Email address</label>
                <Input value={targetEmail} onChange={(e) => setTargetEmail(e.target.value)} type="email" />
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="This month at Silicon Edge" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Body</label>
            <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)}
              placeholder={"Hi {{name}},\n\nHere's what's new this month...\n\nLinks are auto-detected."} />
            <p className="text-xs text-muted-foreground mt-1">
              Use <code>{"{{name}}"}</code> to personalise. Emails send with the Silicon Edge branded layout, logo and unsubscribe link.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={preview} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Preview audience
            </Button>
            <Button variant="outline" onClick={sendTest} disabled={busy}>Send test to me</Button>
            <Button onClick={send} disabled={busy}>
              <Send className="h-4 w-4 mr-1" /> Send newsletter
            </Button>
            {previewCount !== null && <Badge variant="secondary" className="self-center">{previewCount} recipients</Badge>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent campaigns</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {campaigns.length === 0 && <p className="p-5 text-sm text-muted-foreground">No campaigns yet.</p>}
            {campaigns.map((c: any) => (
              <div key={c.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{c.subject}</p>
                  <p className="text-xs text-muted-foreground">{c.audience} · {new Date(c.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant={c.status === "sent" ? "default" : "secondary"}>{c.status}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">{c.sent_count ?? 0}/{c.recipient_count ?? 0} sent</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Subscribers</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border max-h-96 overflow-auto">
            {subs.length === 0 && <p className="p-5 text-sm text-muted-foreground">No subscribers yet.</p>}
            {subs.map((s: any) => (
              <div key={s.id} className="p-3 px-4 flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{s.email}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{s.source}</span>
                  <Badge variant={s.status === "subscribed" ? "default" : "secondary"}>{s.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}