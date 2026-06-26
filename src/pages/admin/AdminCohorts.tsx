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
import { Plus, Trash2, Users, Calendar, Pencil, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";

type Cohort = { id: string; name: string; slug: string | null; description: string | null; course_id: string | null; start_date: string | null; end_date: string | null; status: string };
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
              <div className="font-medium text-sm truncate">{c.name}</div>
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
          <h2 className="font-heading text-xl font-bold">{cohort.name}</h2>
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
        </TabsList>
        <TabsContent value="members" className="pt-4"><MembersPanel cohortId={cohort.id} /></TabsContent>
        <TabsContent value="sessions" className="pt-4"><SessionsPanel cohortId={cohort.id} createdBy={currentUserId} /></TabsContent>
      </Tabs>
    </Card>
  );
}

function MembersPanel({ cohortId }: { cohortId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");

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
      </div>
      <div className="border rounded-lg divide-y">
        {members.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">No members yet.</div>}
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between p-3 gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{m.profile?.full_name || m.user_id}</div>
              <div className="text-[11px] text-muted-foreground">Joined {new Date(m.joined_at).toLocaleDateString()}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={m.role === "instructor" ? "default" : "outline"}>{m.role}</Badge>
              <Button variant="ghost" size="sm" onClick={() => remove(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionsPanel({ cohortId, createdBy }: { cohortId: string; createdBy?: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [url, setUrl] = useState("");
  const [duration, setDuration] = useState(60);

  const load = async () => {
    const { data } = await db.from("cohort_sessions").select("*").eq("cohort_id", cohortId).order("scheduled_at", { ascending: true });
    setSessions(data || []);
  };
  useEffect(() => { load(); }, [cohortId]);

  const add = async () => {
    if (!title.trim() || !when) return toast.error("Title and date are required");
    const { error } = await db.from("cohort_sessions").insert({
      cohort_id: cohortId, title: title.trim(), scheduled_at: new Date(when).toISOString(),
      duration_minutes: duration, meeting_url: url || null, created_by: createdBy ?? null,
    });
    if (error) return toast.error(error.message);
    setTitle(""); setWhen(""); setUrl(""); toast.success("Session scheduled"); load();
  };
  const remove = async (id: string) => {
    const { error } = await db.from("cohort_sessions").delete().eq("id", id);
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
          <div key={s.id} className="flex items-center justify-between p-3 gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{s.title}</div>
              <div className="text-[11px] text-muted-foreground">{new Date(s.scheduled_at).toLocaleString()} · {s.duration_minutes} min</div>
              {s.meeting_url && <a href={s.meeting_url} target="_blank" rel="noreferrer" className="text-[11px] text-primary underline">Join link</a>}
            </div>
            <Button variant="ghost" size="sm" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
