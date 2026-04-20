import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, ExternalLink } from "lucide-react";

interface Application {
  id: string;
  job_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  cover_letter: string | null;
  resume_url: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  jobs?: { title: string; company: string };
}

const STATUSES = ["submitted", "reviewing", "interviewing", "offered", "hired", "rejected"];

export default function AdminJobApplications() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("job_applications")
      .select("*, jobs(title, company)")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setApps((data || []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("job_applications").update({ status }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else load();
  };

  const filtered = filter === "all" ? apps : apps.filter(a => a.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Job Applications</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and manage candidate applications.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>All ({apps.length})</button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {s} ({apps.filter(a => a.status === s).length})
          </button>
        ))}
      </div>

      {loading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="space-y-3">
          {filtered.map(app => (
            <div key={app.id} className="border border-border rounded-xl p-4 bg-card">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{app.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{app.email}{app.phone && ` · ${app.phone}`}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Applied to <span className="font-medium text-foreground">{app.jobs?.title}</span> at {app.jobs?.company}
                  </p>
                  {app.cover_letter && <p className="text-sm text-muted-foreground mt-3 line-clamp-3 whitespace-pre-wrap">{app.cover_letter}</p>}
                  {app.resume_url && (
                    <a href={app.resume_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> Resume
                    </a>
                  )}
                </div>
                <select value={app.status} onChange={e => updateStatus(app.id, e.target.value)} className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs capitalize">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center py-12 text-muted-foreground">No applications.</p>}
        </div>
      )}
    </div>
  );
}
