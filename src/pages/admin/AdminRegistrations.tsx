import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, MessageCircle, Mail, Loader2, Search, ClipboardCheck, Send, CheckCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

type Reg = {
  id: string; course_id: string; user_id: string | null; registration_type: string;
  full_name: string; email: string; whatsapp_number: string | null; country: string | null;
  profession: string | null; experience_level: string | null; how_did_you_hear: string | null;
  motivation: string | null; goal: string | null; status: string; internal_notes: string | null;
  created_at: string; updated_at: string;
};
type Course = { id: string; title: string };
type NoteRow = { id: string; note: string; created_at: string; author_id: string };
type Referral = {
  id: string; user_id: string; course_id: string; conversion_type: string;
  utm_source: string | null; utm_medium: string | null; utm_campaign: string | null;
  promo_codes: { code: string; influencer_name: string } | null;
};

const STATUSES = [
  { value: "new", label: "New", color: "bg-blue-500/15 text-blue-700 border-blue-500/30" },
  { value: "contacted", label: "Contacted", color: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  { value: "follow-up", label: "Follow-up Needed", color: "bg-purple-500/15 text-purple-700 border-purple-500/30" },
  { value: "converted", label: "Converted", color: "bg-green-500/15 text-green-700 border-green-500/30" },
  { value: "lost", label: "Lost", color: "bg-red-500/15 text-red-700 border-red-500/30" },
];
const statusMeta = (s: string) => STATUSES.find((x) => x.value === s) ?? STATUSES[0];

export default function AdminRegistrations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [rows, setRows] = useState<Reg[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editing, setEditing] = useState<Reg | null>(null);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [newNote, setNewNote] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const [{ data: regs }, { data: cs }, { data: refs }] = await Promise.all([
      (supabase.from("course_registrations") as any).select("*").order("created_at", { ascending: false }),
      supabase.from("courses").select("id, title"),
      (supabase.from("influencer_referrals") as any)
        .select("id, user_id, course_id, conversion_type, utm_source, utm_medium, utm_campaign, promo_codes(code, influencer_name)"),
    ]);
    setRows(regs ?? []); setCourses(cs ?? []); setReferrals((refs as any) ?? []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const loadNotes = async (regId: string) => {
    const { data } = await (supabase.from("registration_notes") as any).select("*").eq("registration_id", regId).order("created_at", { ascending: false });
    setNotes(data ?? []);
  };
  useEffect(() => { if (editing) loadNotes(editing.id); else { setNotes([]); setNewNote(""); } }, [editing]);

  const courseTitle = (id: string) => courses.find((c) => c.id === id)?.title ?? "—";
  const attributionFor = (r: Reg): Referral | null => {
    if (!r.user_id) return null;
    return referrals.find((x) => x.user_id === r.user_id && x.course_id === r.course_id) ?? null;
  };

  const filtered = useMemo(() => rows.filter((r) => {
    if (filterCourse !== "all" && r.course_id !== filterCourse) return false;
    if (filterType !== "all" && r.registration_type !== filterType) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || (r.country ?? "").toLowerCase().includes(q);
    }
    return true;
  }), [rows, filterCourse, filterType, filterStatus, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    STATUSES.forEach((s) => { c[s.value] = rows.filter((r) => r.status === s.value).length; });
    return c;
  }, [rows]);

  const exportCsv = () => {
    const header = ["Name", "Email", "WhatsApp", "Country", "Profession", "Type", "Status", "Course", "Created"];
    const lines = filtered.map((r) => [r.full_name, r.email, r.whatsapp_number ?? "", r.country ?? "", r.profession ?? "", r.registration_type, r.status, courseTitle(r.course_id), new Date(r.created_at).toISOString()].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `registrations-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await (supabase.from("course_registrations") as any).update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setRows((p) => p.map((r) => (r.id === id ? { ...r, status, updated_at: new Date().toISOString() } : r)));
    if (editing?.id === id) setEditing({ ...editing, status });
  };

  const bulkUpdate = async () => {
    if (!bulkStatus || selected.size === 0) return;
    const ids = Array.from(selected);
    const { error } = await (supabase.from("course_registrations") as any).update({ status: bulkStatus, updated_at: new Date().toISOString() }).in("id", ids);
    if (error) { toast({ title: "Bulk update failed", description: error.message, variant: "destructive" }); return; }
    setRows((p) => p.map((r) => (ids.includes(r.id) ? { ...r, status: bulkStatus } : r)));
    toast({ title: `Updated ${ids.length} registration${ids.length === 1 ? "" : "s"}` });
    setSelected(new Set()); setBulkStatus("");
  };

  const addNote = async () => {
    if (!editing || !newNote.trim() || !user) return;
    const { data, error } = await (supabase.from("registration_notes") as any).insert({ registration_id: editing.id, author_id: user.id, note: newNote.trim() }).select().single();
    if (error) { toast({ title: "Note failed", description: error.message, variant: "destructive" }); return; }
    setNotes((p) => [data, ...p]); setNewNote(""); toast({ title: "Note added" });
  };

  const toggleSelect = (id: string) => { setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const toggleAll = () => { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map((r) => r.id))); };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <ClipboardCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Registrations</h1>
            <p className="text-sm text-muted-foreground">Webinar sign-ups & enrollment leads — {rows.length} total</p>
          </div>
        </div>
        <Button onClick={exportCsv} variant="outline"><Download className="h-4 w-4 mr-2" />Export CSV</Button>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STATUSES.map((s) => (
          <button key={s.value} onClick={() => setFilterStatus(filterStatus === s.value ? "all" : s.value)}
            className={`text-left p-3 rounded-xl border transition-all ${filterStatus === s.value ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/30"} bg-card`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              <Badge className={`${s.color} border text-xs`} variant="outline">{counts[s.value] ?? 0}</Badge>
            </div>
            <p className="font-heading text-2xl font-bold">{counts[s.value] ?? 0}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name/email/country" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterCourse} onValueChange={setFilterCourse}>
          <SelectTrigger><SelectValue placeholder="Course" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="webinar">Webinar</SelectItem>
            <SelectItem value="enrollment">Enrollment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selected.size > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl flex-wrap">
          <CheckCheck className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex-1" />
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Set status to..." /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" disabled={!bulkStatus} onClick={bulkUpdate}>Apply</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </motion.div>
      )}

      <div className="border border-border rounded-xl overflow-x-auto bg-card">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={selected.size > 0 && selected.size === filtered.length} onCheckedChange={toggleAll} /></TableHead>
                <TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Course</TableHead>
                <TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No registrations match your filters.</TableCell></TableRow>
              ) : filtered.map((r) => {
                const sm = statusMeta(r.status);
                return (
                  <TableRow key={r.id} className={selected.has(r.id) ? "bg-primary/5" : ""}>
                    <TableCell><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} /></TableCell>
                    <TableCell>
                      <div className="font-medium">{r.full_name}</div>
                      <div className="text-xs text-muted-foreground">{r.country ?? "—"} · {r.profession ?? "—"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">{r.email}</div>
                      <div className="text-xs text-muted-foreground">{r.whatsapp_number ?? "—"}</div>
                    </TableCell>
                    <TableCell className="text-xs max-w-[180px] truncate">{courseTitle(r.course_id)}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{r.registration_type}</Badge></TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                        <SelectTrigger className={`h-8 w-36 text-xs border ${sm.color}`}><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(r.updated_at ?? r.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {r.whatsapp_number && (
                          <Button asChild size="icon" variant="ghost" title="WhatsApp">
                            <a href={`https://wa.me/${r.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 text-green-600" /></a>
                          </Button>
                        )}
                        <Button asChild size="icon" variant="ghost" title="Email"><a href={`mailto:${r.email}`}><Mail className="h-4 w-4" /></a></Button>
                        <Button size="sm" variant="outline" onClick={() => setEditing(r)}>View</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registration details</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-heading text-lg font-bold">{editing.full_name}</div>
                  <div className="text-xs text-muted-foreground">{editing.email}</div>
                </div>
                <Badge className={`${statusMeta(editing.status).color} border`} variant="outline">{statusMeta(editing.status).label}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-3 rounded-lg">
                <div><span className="text-muted-foreground">WhatsApp:</span> {editing.whatsapp_number ?? "—"}</div>
                <div><span className="text-muted-foreground">Country:</span> {editing.country ?? "—"}</div>
                <div><span className="text-muted-foreground">Profession:</span> {editing.profession ?? "—"}</div>
                <div><span className="text-muted-foreground">Experience:</span> {editing.experience_level ?? "—"}</div>
                <div><span className="text-muted-foreground">Heard via:</span> {editing.how_did_you_hear ?? "—"}</div>
                <div><span className="text-muted-foreground">Type:</span> {editing.registration_type}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Course:</span> {courseTitle(editing.course_id)}</div>
              </div>
              {editing.motivation && <div><span className="text-muted-foreground text-xs font-semibold">Motivation</span><p className="mt-1">{editing.motivation}</p></div>}
              {editing.goal && <div><span className="text-muted-foreground text-xs font-semibold">Goal</span><p className="mt-1">{editing.goal}</p></div>}
              <div>
                <Label className="text-xs">Update status</Label>
                <Select value={editing.status} onValueChange={(v) => updateStatus(editing.id, v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Add follow-up note</Label>
                <div className="flex gap-2 mt-1">
                  <Textarea rows={2} placeholder="e.g. Called and left voicemail. Will retry tomorrow." value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                  <Button size="icon" onClick={addNote} disabled={!newNote.trim()} className="self-end"><Send className="h-4 w-4" /></Button>
                </div>
              </div>
              <div>
                <Label className="text-xs">Notes timeline ({notes.length})</Label>
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                  {notes.length === 0 && <p className="text-xs text-muted-foreground italic">No notes yet.</p>}
                  {notes.map((n) => (
                    <div key={n.id} className="bg-muted/30 p-3 rounded-lg border border-border">
                      <p className="text-xs whitespace-pre-wrap">{n.note}</p>
                      <p className="text-[10px] text-muted-foreground mt-1.5">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
