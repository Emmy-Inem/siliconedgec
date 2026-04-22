import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, MessageCircle, Mail, Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Reg = {
  id: string; course_id: string; user_id: string | null; registration_type: string;
  full_name: string; email: string; whatsapp_number: string | null; country: string | null;
  profession: string | null; experience_level: string | null; how_did_you_hear: string | null;
  motivation: string | null; goal: string | null; status: string; internal_notes: string | null;
  created_at: string;
};

type Course = { id: string; title: string };

const statusColors: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-700",
  contacted: "bg-amber-500/15 text-amber-700",
  "follow-up": "bg-purple-500/15 text-purple-700",
  converted: "bg-green-500/15 text-green-700",
};

export default function AdminRegistrations() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Reg[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editing, setEditing] = useState<Reg | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: regs }, { data: cs }] = await Promise.all([
      (supabase.from("course_registrations") as any).select("*").order("created_at", { ascending: false }),
      supabase.from("courses").select("id, title"),
    ]);
    setRows(regs ?? []);
    setCourses(cs ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const courseTitle = (id: string) => courses.find((c) => c.id === id)?.title ?? "—";

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

  const exportCsv = () => {
    const header = ["Name", "Email", "WhatsApp", "Country", "Profession", "Type", "Status", "Course", "Created"];
    const lines = filtered.map((r) => [
      r.full_name, r.email, r.whatsapp_number ?? "", r.country ?? "",
      r.profession ?? "", r.registration_type, r.status, courseTitle(r.course_id),
      new Date(r.created_at).toISOString(),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `registrations-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await (supabase.from("course_registrations") as any).update({ status }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setRows((p) => p.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const saveNotes = async (id: string, notes: string) => {
    const { error } = await (supabase.from("course_registrations") as any).update({ internal_notes: notes }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setRows((p) => p.map((r) => (r.id === id ? { ...r, internal_notes: notes } : r)));
    toast({ title: "Notes saved" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Registrations</h1>
          <p className="text-sm text-muted-foreground">Track webinar sign-ups & enrollment leads</p>
        </div>
        <Button onClick={exportCsv} variant="outline"><Download className="h-4 w-4 mr-2" />Export CSV</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
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
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="follow-up">Follow-up</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-lg overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No registrations yet.</TableCell></TableRow>
              ) : filtered.map((r) => (
                <TableRow key={r.id}>
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
                      <SelectTrigger className={`h-8 w-32 text-xs ${statusColors[r.status] ?? ""}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="follow-up">Follow-up</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {r.whatsapp_number && (
                        <Button asChild size="icon" variant="ghost" title="WhatsApp">
                          <a href={`https://wa.me/${r.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                            <MessageCircle className="h-4 w-4 text-green-600" />
                          </a>
                        </Button>
                      )}
                      <Button asChild size="icon" variant="ghost" title="Email">
                        <a href={`mailto:${r.email}`}><Mail className="h-4 w-4" /></a>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(r)}>View</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Registration details</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3 text-sm">
              <div><strong>{editing.full_name}</strong> — {editing.email}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">WhatsApp:</span> {editing.whatsapp_number ?? "—"}</div>
                <div><span className="text-muted-foreground">Country:</span> {editing.country ?? "—"}</div>
                <div><span className="text-muted-foreground">Profession:</span> {editing.profession ?? "—"}</div>
                <div><span className="text-muted-foreground">Experience:</span> {editing.experience_level ?? "—"}</div>
                <div><span className="text-muted-foreground">Heard via:</span> {editing.how_did_you_hear ?? "—"}</div>
                <div><span className="text-muted-foreground">Type:</span> {editing.registration_type}</div>
              </div>
              {editing.motivation && <div><span className="text-muted-foreground text-xs">Motivation:</span><p className="mt-1">{editing.motivation}</p></div>}
              {editing.goal && <div><span className="text-muted-foreground text-xs">Goal:</span><p className="mt-1">{editing.goal}</p></div>}
              <div>
                <Label className="text-xs">Internal notes</Label>
                <Textarea
                  rows={3}
                  defaultValue={editing.internal_notes ?? ""}
                  onBlur={(e) => saveNotes(editing.id, e.target.value)}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}