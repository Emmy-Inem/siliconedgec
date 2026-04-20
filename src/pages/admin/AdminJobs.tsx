import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Briefcase, Plus, Edit2, Trash2, Eye, EyeOff, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  job_type: string;
  salary_min: number | null;
  salary_max: number | null;
  is_remote: boolean;
  is_published: boolean;
  applications_count: number;
  created_at: string;
  description: string;
  requirements: string | null;
  benefits: string | null;
  contact_email: string | null;
  application_url: string | null;
}

const empty: Partial<Job> = {
  title: "", company: "", location: "", job_type: "full-time",
  salary_min: null, salary_max: null, is_remote: false, is_published: false,
  description: "", requirements: "", benefits: "", contact_email: "", application_url: "",
};

export default function AdminJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [editing, setEditing] = useState<Partial<Job> | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setJobs((data || []) as Job[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.title || !editing?.company || !editing?.description) {
      toast({ title: "Required fields", description: "Title, company and description are required.", variant: "destructive" });
      return;
    }
    const payload = { ...editing };
    if (editing.id) {
      const { error } = await supabase.from("jobs").update(payload).eq("id", editing.id);
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const { error } = await supabase.from("jobs").insert(payload as any);
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    toast({ title: "Saved" });
    setEditing(null);
    load();
  };

  const togglePublish = async (job: Job) => {
    const { error } = await supabase.from("jobs").update({ is_published: !job.is_published }).eq("id", job.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this job?")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2"><Briefcase className="h-6 w-6 text-primary" /> Jobs Board</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage job listings and applications.</p>
        </div>
        <Button onClick={() => setEditing(empty)}><Plus className="h-4 w-4 mr-1" /> New Job</Button>
      </div>

      {loading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-center">Apps</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{j.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{j.company}</td>
                  <td className="px-4 py-3 text-muted-foreground">{j.job_type}{j.is_remote && " · Remote"}</td>
                  <td className="px-4 py-3 text-center"><span className="inline-flex items-center gap-1 text-xs"><Users className="h-3 w-3" />{j.applications_count}</span></td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${j.is_published ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                      {j.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => togglePublish(j)}>{j.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(j)}><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(j.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No jobs yet. Create your first listing.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-heading text-xl font-bold mb-4">{editing.id ? "Edit Job" : "New Job"}</h2>
            <div className="space-y-3">
              <input placeholder="Job title *" value={editing.title || ""} onChange={e => setEditing({ ...editing, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Company *" value={editing.company || ""} onChange={e => setEditing({ ...editing, company: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                <input placeholder="Location" value={editing.location || ""} onChange={e => setEditing({ ...editing, location: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <select value={editing.job_type || "full-time"} onChange={e => setEditing({ ...editing, job_type: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
                <input type="number" placeholder="Salary min" value={editing.salary_min || ""} onChange={e => setEditing({ ...editing, salary_min: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                <input type="number" placeholder="Salary max" value={editing.salary_max || ""} onChange={e => setEditing({ ...editing, salary_max: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
              </div>
              <textarea placeholder="Description *" rows={4} value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
              <textarea placeholder="Requirements" rows={3} value={editing.requirements || ""} onChange={e => setEditing({ ...editing, requirements: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
              <textarea placeholder="Benefits" rows={3} value={editing.benefits || ""} onChange={e => setEditing({ ...editing, benefits: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
              <input placeholder="Contact email" value={editing.contact_email || ""} onChange={e => setEditing({ ...editing, contact_email: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.is_remote} onChange={e => setEditing({ ...editing, is_remote: e.target.checked })} /> Remote</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.is_published} onChange={e => setEditing({ ...editing, is_published: e.target.checked })} /> Publish immediately</label>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
