import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Users, Calendar, Pencil, UserPlus, FileText, Mail, Upload, ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";

type Cohort = { id: string; name: string; slug: string | null; description: string | null; course_id: string | null; start_date: string | null; end_date: string | null; status: string; cohort_number: number | null };
type Member = { id: string; user_id: string; role: string; joined_at: string; profile?: { full_name: string | null; avatar_url: string | null } };
type Session = { id: string; title: string; description: string | null; scheduled_at: string; duration_minutes: number; meeting_url: string | null };

const db = supabase as any;

export default function AdminCohorts() {
  const { user } = useAuth();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [selected, setSelected] = useState<Cohort | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Cohort | null>(null);

  const load = async () => {
    const { data } = await db.from("cohorts").select("*").order("created_at", { ascending: false });
    setCohorts(data || []);
    if (data && data.length && !selected) setSelected(data[0]);
  };

  useEffect(() => { load(); supabase.from("courses").select("id,title").order("title").then(({ data }) => setCourses(data || [])); }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this cohort? Members, posts, and sessions will be removed.")) return;
    const { error } = await db.from("cohorts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Cohort deleted");
    setSelected(null);
    load();
  };

  return (
    <div className="space-y-6">
      <Helmet><title>Cohorts | Admin</title></Helmet>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Cohorts</h1>
          <p className="text-sm text-muted-foreground">Group learners into private spaces with roster, discussion, and live sessions.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpenForm(true); }}><Plus className="h-4 w-4 mr-2" />New cohort</Button>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <Card className="p-3 space-y-1 h-fit">
          {cohorts.length === 0 && <p className="text-xs text-muted-foreground p-3">No cohorts yet.</p>}
          {cohorts.map((c) => (
            <button key={c.id} onClick={() => setSelected(c)} className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selected?.id === c.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
              <div className="font-medium text-sm truncate flex items-center gap-1.5">
                {c.cohort_number != null && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px] shrink-0">C{c.cohort_number}</Badge>
                )}
                <span className="truncate">{c.name}</span>
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                <Badge variant="outline" className="h-4 px-1.5 text-[10px]">{c.status}</Badge>
                {c.start_date && <span>{c.start_date}</span>}
              </div>
            </button>
          ))}
        </Card>

        <div>
          {selected ? (
            <CohortDetail
              cohort={selected}
              currentUserId={user?.id}
              onEdit={() => { setEditing(selected); setOpenForm(true); }}
              onDelete={() => remove(selected.id)}
            />
          ) : (
            <Card className="p-10 text-center text-muted-foreground">Select a cohort or create one to begin.</Card>
          )}
        </div>
      </div>

      <CohortFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        courses={courses}
        cohort={editing}
        onSaved={(c) => { load(); setSelected(c); }}
      />
    </div>
  );
}

function CohortFormDialog({ open, onOpenChange, courses, cohort, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; courses: { id: string; title: string }[]; cohort: Cohort | null; onSaved: (c: Cohort) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState<string>("none");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("active");

  useEffect(() => {
    if (cohort) {
      setName(cohort.name); setDescription(cohort.description || "");
      setCourseId(cohort.course_id || "none");
      setStartDate(cohort.start_date || ""); setEndDate(cohort.end_date || "");
      setStatus(cohort.status);
    } else {
      setName(""); setDescription(""); setCourseId("none"); setStartDate(""); setEndDate(""); setStatus("active");
    }
  }, [cohort, open]);

  const save = async () => {
    if (!name.trim()) return toast.error("Name is required");
    const payload: any = {
      name: name.trim(),
      description: description || null,
      course_id: courseId === "none" ? null : courseId,
      start_date: startDate || null,
      end_date: endDate || null,
      status,
    };
    if (cohort) {
      const { data, error } = await db.from("cohorts").update(payload).eq("id", cohort.id).select().single();
      if (error) return toast.error(error.message);
      toast.success("Cohort updated");
      onSaved(data); onOpenChange(false);
    } else {
      const { data: u } = await supabase.auth.getUser();
      payload.created_by = u.user?.id ?? null;
      const { data, error } = await db.from("cohorts").insert(payload).select().single();
      if (error) return toast.error(error.message);
      toast.success("Cohort created");
      onSaved(data); onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{cohort ? "Edit cohort" : "New cohort"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cloud Engineering — Spring 2026" /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Course</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div><Label>End date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={save}>{cohort ? "Save changes" : "Create cohort"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CohortDetail({ cohort, currentUserId, onEdit, onDelete }: { cohort: Cohort; currentUserId?: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-heading text-xl font-bold flex items-center gap-2">
            {cohort.cohort_number != null && (
              <Badge variant="secondary" className="text-xs">Cohort {cohort.cohort_number}</Badge>
            )}
            {cohort.name}
          </h2>
          {cohort.description && <p className="text-sm text-muted-foreground mt-1">{cohort.description}</p>}
          <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
            <Badge variant="outline">{cohort.status}</Badge>
            {cohort.start_date && <span>{cohort.start_date} → {cohort.end_date || "—"}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="h-3.5 w-3.5 mr-1.5" />Edit</Button>
          <Button variant="outline" size="sm" onClick={onDelete}><Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete</Button>
        </div>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members"><Users className="h-3.5 w-3.5 mr-1.5" />Members</TabsTrigger>
          <TabsTrigger value="sessions"><Calendar className="h-3.5 w-3.5 mr-1.5" />Sessions</TabsTrigger>
          <TabsTrigger value="materials"><FileText className="h-3.5 w-3.5 mr-1.5" />Materials</TabsTrigger>
        </TabsList>
        <TabsContent value="members" className="pt-4"><MembersPanel cohortId={cohort.id} /></TabsContent>
        <TabsContent value="sessions" className="pt-4"><SessionsPanel cohortId={cohort.id} createdBy={currentUserId} /></TabsContent>
        <TabsContent value="materials" className="pt-4"><MaterialsPanel cohortId={cohort.id} createdBy={currentUserId} /></TabsContent>
      </Tabs>
    </Card>
  );
}

function MembersPanel({ cohortId }: { cohortId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [bulk, setBulk] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState("member");

  const load = async () => {
    const { data } = await db.from("cohort_members").select("*").eq("cohort_id", cohortId).order("joined_at", { ascending: false });
    const rows = (data || []) as Member[];
    if (rows.length) {
      const { data: profs } = await supabase.rpc("get_public_profiles", { p_user_ids: rows.map((r) => r.user_id) });
      const map = new Map<string, any>();
      (profs || []).forEach((p: any) => map.set(p.user_id, p));
      rows.forEach((r) => (r.profile = map.get(r.user_id)));
    }
    setMembers(rows);
  };

  useEffect(() => { load(); }, [cohortId]);

  const toggleSel = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const allSelected = members.length > 0 && selected.size === members.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(members.map((m) => m.id)));

  const bulkRemove = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Remove ${selected.size} member(s) from this cohort?`)) return;
    const { error } = await db.from("cohort_members").delete().in("id", Array.from(selected));
    if (error) return toast.error(error.message);
    toast.success("Removed"); setSelected(new Set()); load();
  };
  const bulkChangeRole = async () => {
    if (selected.size === 0) return;
    const { error } = await db.from("cohort_members").update({ role: bulkRole }).in("id", Array.from(selected));
    if (error) return toast.error(error.message);
    toast.success("Roles updated"); setSelected(new Set()); load();
  };

  const bulkImport = async () => {
    const lines = bulk.split(/\n|,/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    let added = 0, skipped = 0;
    for (const term of lines) {
      let userId: string | null = null;
      if (term.length === 36 && term.includes("-")) userId = term;
      else {
        // Try email match against profiles via auth lookup is not available; fall back to full_name match.
        const { data: p } = await supabase.from("profiles").select("user_id").ilike("full_name", `%${term}%`).limit(1).maybeSingle();
        userId = (p as any)?.user_id ?? null;
      }
      if (!userId) { skipped++; continue; }
      const { error } = await db.from("cohort_members").insert({ cohort_id: cohortId, user_id: userId, role: "member" });
      if (error) { skipped++; } else { added++; }
    }
    toast.success(`Imported ${added}, skipped ${skipped}`);
    setBulk(""); setBulkOpen(false); load();
  };

  const add = async () => {
    if (!email.trim()) return;
    // Resolve via profiles full_name search isn't email-based; ask user to paste a user UUID OR look up via auth admin not allowed.
    // Simplest path: accept a profile's user_id. To make it user friendly, also try matching profiles.full_name.
    const term = email.trim();
    let userId: string | null = null;
    if (term.length === 36 && term.includes("-")) userId = term;
    else {
      const { data: p } = await supabase.from("profiles").select("user_id, full_name").ilike("full_name", `%${term}%`).limit(1).maybeSingle();
      userId = (p as any)?.user_id ?? null;
    }
    if (!userId) return toast.error("User not found. Paste a user UUID or part of their full name.");
    const { error } = await db.from("cohort_members").insert({ cohort_id: cohortId, user_id: userId, role });
    if (error) return toast.error(error.message);
    setEmail(""); toast.success("Member added"); load();
  };

  const remove = async (id: string) => {
    const { error } = await db.from("cohort_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="User UUID or full name" className="flex-1 min-w-[200px]" />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="instructor">Instructor</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={add}><UserPlus className="h-4 w-4 mr-2" />Add</Button>
        <Button variant="outline" onClick={() => setBulkOpen(true)}><Upload className="h-4 w-4 mr-2" />Bulk import</Button>
      </div>
      {selected.size > 0 && (
        <div className="flex items-center gap-2 flex-wrap p-2 rounded-md border bg-muted/30 text-sm">
          <span>{selected.size} selected</span>
          <Select value={bulkRole} onValueChange={setBulkRole}>
            <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="instructor">Instructor</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={bulkChangeRole}>Set role</Button>
          <Button size="sm" variant="outline" onClick={bulkRemove}><Trash2 className="h-3.5 w-3.5 mr-1.5" />Remove</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}
      <div className="border rounded-lg divide-y">
        {members.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground bg-muted/30">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            <span>Select all</span>
          </div>
        )}
        {members.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">No members yet.</div>}
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between p-3 gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Checkbox checked={selected.has(m.id)} onCheckedChange={() => toggleSel(m.id)} />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{m.profile?.full_name || m.user_id}</div>
                <div className="text-[11px] text-muted-foreground">Joined {new Date(m.joined_at).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={m.role === "instructor" ? "default" : "outline"}>{m.role}</Badge>
              <Button variant="ghost" size="sm" onClick={() => remove(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bulk import members</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">Paste one user UUID or full name per line (or comma-separated). Unmatched entries will be skipped.</p>
            <Textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={8} placeholder={"00000000-0000-0000-0000-000000000000\nJane Doe\nJohn Smith"} />
          </div>
          <DialogFooter><Button onClick={bulkImport}>Import</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SessionsPanel({ cohortId, createdBy }: { cohortId: string; createdBy?: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [rsvps, setRsvps] = useState<Record<string, any[]>>({});
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [url, setUrl] = useState("");
  const [duration, setDuration] = useState(60);

  const load = async () => {
    const { data } = await db.from("cohort_sessions").select("*").eq("cohort_id", cohortId).order("scheduled_at", { ascending: true });
    const list = data || [];
    setSessions(list);
    if (list.length) {
      const ids = list.map((x: any) => x.id);
      const { data: rs } = await db.from("cohort_session_rsvps").select("*").in("session_id", ids);
      const grouped: Record<string, any[]> = {};
      const uids = new Set<string>();
      (rs || []).forEach((r: any) => { (grouped[r.session_id] = grouped[r.session_id] || []).push(r); uids.add(r.user_id); });
      setRsvps(grouped);
      if (uids.size) {
        const { data: profs } = await supabase.rpc("get_public_profiles", { p_user_ids: Array.from(uids) });
        const m: Record<string, any> = {};
        (profs || []).forEach((p: any) => (m[p.user_id] = p));
        setProfiles(m);
      }
    } else { setRsvps({}); }
  };
  useEffect(() => { load(); }, [cohortId]);

  const sendEmailBlast = async (s: Session) => {
    const { data: recipients, error } = await (supabase as any).rpc("get_cohort_member_emails", { p_cohort_id: cohortId });
    if (error) return toast.error(error.message);
    const list = (recipients || []) as { email: string; full_name: string | null }[];
    if (list.length === 0) return toast.info("No members to email");
    const when = new Date(s.scheduled_at).toLocaleString();
    await Promise.all(list.map((r) =>
      supabase.functions.invoke("send-email", {
        body: {
          to: r.email,
          subject: `Cohort session: ${s.title}`,
          html: `<p>Hi ${r.full_name || "there"},</p><p>A cohort session has been scheduled:</p><p><strong>${s.title}</strong><br/>${when} · ${s.duration_minutes} min</p>${s.meeting_url ? `<p><a href="${s.meeting_url}">Join link</a></p>` : ""}${s.description ? `<p>${s.description}</p>` : ""}`,
        },
      })
    ));
    toast.success(`Email sent to ${list.length} member(s)`);
  };

  const add = async () => {
    if (!title.trim() || !when) return toast.error("Title and date are required");
    const { data: created, error } = await db.from("cohort_sessions").insert({
      cohort_id: cohortId, title: title.trim(), scheduled_at: new Date(when).toISOString(),
      duration_minutes: duration, meeting_url: url || null, created_by: createdBy ?? null,
    }).select().single();
    if (error) return toast.error(error.message);
    setTitle(""); setWhen(""); setUrl(""); toast.success("Session scheduled"); load();
    if (created && confirm("Email all cohort members about this session now?")) {
      sendEmailBlast(created as Session);
    }
  };
  const remove = async (id: string) => {
    const { error } = await db.from("cohort_sessions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };
  const toggleAttended = async (r: any) => {
    const { error } = await db.from("cohort_session_rsvps").update({ attended: !r.attended, marked_by: createdBy, marked_at: new Date().toISOString() }).eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <Input placeholder="Session title" value={title} onChange={(e) => setTitle(e.target.value)} className="md:col-span-2" />
        <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        <Input type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} placeholder="Minutes" />
        <Input placeholder="Meeting link (Zoom, Meet...)" value={url} onChange={(e) => setUrl(e.target.value)} className="md:col-span-3" />
        <Button onClick={add}>Schedule</Button>
      </div>
      <div className="border rounded-lg divide-y">
        {sessions.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">No sessions scheduled.</div>}
        {sessions.map((s) => (
          <div key={s.id} className="p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{s.title}</div>
                <div className="text-[11px] text-muted-foreground">{new Date(s.scheduled_at).toLocaleString()} · {s.duration_minutes} min · {(rsvps[s.id] || []).filter((r) => r.status === "going").length} going · {(rsvps[s.id] || []).filter((r) => r.attended).length} attended</div>
                {s.meeting_url && <a href={s.meeting_url} target="_blank" rel="noreferrer" className="text-[11px] text-primary underline">Join link</a>}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === s.id ? null : s.id)}><ClipboardList className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="sm" onClick={() => sendEmailBlast(s)}><Mail className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="sm" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            {expanded === s.id && (
              <div className="border-t pt-2 space-y-1.5">
                {(rsvps[s.id] || []).length === 0 && <div className="text-xs text-muted-foreground">No RSVPs yet.</div>}
                {(rsvps[s.id] || []).map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{profiles[r.user_id]?.full_name || r.user_id.slice(0,8)}</span>
                      <Badge variant="outline" className="text-[10px] h-4">{r.status}</Badge>
                      {r.attended && <Badge className="text-[10px] h-4">attended</Badge>}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => toggleAttended(r)}>
                      {r.attended ? "Unmark" : "Mark attended"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MaterialsPanel({ cohortId, createdBy }: { cohortId: string; createdBy?: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"link" | "file" | "note">("link");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await db.from("cohort_materials").select("*").eq("cohort_id", cohortId).order("created_at", { ascending: false });
    setItems(data || []);
  };
  useEffect(() => { load(); }, [cohortId]);

  const save = async () => {
    if (!title.trim()) return toast.error("Title required");
    setBusy(true);
    try {
      let file_path: string | null = null;
      let file_size: number | null = null;
      let mime_type: string | null = null;
      if (kind === "file") {
        if (!file) { toast.error("Choose a file"); return; }
        const path = `${cohortId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("cohort-materials").upload(path, file, { upsert: false });
        if (upErr) return toast.error(upErr.message);
        file_path = path; file_size = file.size; mime_type = file.type;
      }
      const { error } = await db.from("cohort_materials").insert({
        cohort_id: cohortId, title: title.trim(), description: description || null, kind,
        url: kind === "link" ? url || null : null, file_path, file_size, mime_type, created_by: createdBy ?? null,
      });
      if (error) return toast.error(error.message);
      toast.success("Added"); setTitle(""); setDescription(""); setUrl(""); setFile(null); load();
    } finally { setBusy(false); }
  };

  const remove = async (m: any) => {
    if (!confirm("Delete this item?")) return;
    if (m.file_path) await supabase.storage.from("cohort-materials").remove([m.file_path]);
    const { error } = await db.from("cohort_materials").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="md:col-span-2" />
        <Select value={kind} onValueChange={(v) => setKind(v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="link">Link</SelectItem>
            <SelectItem value="file">File</SelectItem>
            <SelectItem value="note">Note</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}</Button>
        <Textarea placeholder="Description / note body" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="md:col-span-4" />
        {kind === "link" && <Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} className="md:col-span-4" />}
        {kind === "file" && <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="md:col-span-4" />}
      </div>
      <div className="border rounded-lg divide-y">
        {items.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">No materials yet.</div>}
        {items.map((m) => (
          <div key={m.id} className="flex items-center justify-between p-3 gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{m.title} <Badge variant="outline" className="ml-1 text-[10px] h-4">{m.kind}</Badge></div>
              {m.description && <div className="text-[11px] text-muted-foreground truncate">{m.description}</div>}
              {m.url && <a href={m.url} target="_blank" rel="noreferrer" className="text-[11px] text-primary underline">{m.url}</a>}
              {m.file_path && <div className="text-[11px] text-muted-foreground">{m.file_path}</div>}
            </div>
            <Button variant="ghost" size="sm" onClick={() => remove(m)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
