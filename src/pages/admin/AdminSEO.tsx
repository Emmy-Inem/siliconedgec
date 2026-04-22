import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Search, Save, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type SeoRow = {
  id?: string; path: string; title: string | null; description: string | null;
  keywords: string | null; og_image_url: string | null; canonical_url: string | null; no_index: boolean;
};

const empty: SeoRow = { path: "", title: "", description: "", keywords: "", og_image_url: "", canonical_url: "", no_index: false };

export default function AdminSEO() {
  const { toast } = useToast();
  const [rows, setRows] = useState<SeoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<SeoRow | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from("page_seo") as any).select("*").order("path");
    setRows(data ?? []);
    setLoading(false);
    if (data?.[0] && !active) setActive(data[0]);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!active || !active.path.trim()) { toast({ title: "Path is required", variant: "destructive" }); return; }
    setSaving(true);
    const payload = { ...active, path: active.path.trim() };
    const { error } = active.id
      ? await (supabase.from("page_seo") as any).update(payload).eq("id", active.id)
      : await (supabase.from("page_seo") as any).insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "SEO saved" });
    await load();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase.from("page_seo") as any).delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deleted" });
    setActive(null);
    await load();
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Search className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">SEO Manager</h1>
          <p className="text-sm text-muted-foreground">Manage page titles, meta descriptions, and Open Graph images per route.</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
        <div className="bg-card border border-border rounded-xl p-3 space-y-1 h-fit">
          <Button size="sm" variant="outline" className="w-full mb-2 gap-1" onClick={() => setActive({ ...empty })}>
            <Plus className="h-3 w-3" /> New page
          </Button>
          {loading ? (
            <div className="p-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
          ) : rows.map((r) => (
            <button key={r.id} onClick={() => setActive(r)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${active?.id === r.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>
              <div className="font-mono text-xs truncate">{r.path}</div>
              <div className="text-[11px] text-muted-foreground truncate">{r.title ?? "Untitled"}</div>
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          {active ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-bold">{active.id ? "Edit page SEO" : "Add new page SEO"}</h2>
                  <p className="text-xs text-muted-foreground">Configure search-result and social-share appearance.</p>
                </div>
                {active.id && (
                  <Button size="icon" variant="ghost" onClick={() => remove(active.id!)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div><Label>Path</Label><Input value={active.path} onChange={(e) => setActive({ ...active, path: e.target.value })} placeholder="/courses" /></div>
              <div><Label>Title <span className="text-muted-foreground text-xs">({(active.title ?? "").length}/60)</span></Label><Input value={active.title ?? ""} onChange={(e) => setActive({ ...active, title: e.target.value })} maxLength={70} /></div>
              <div><Label>Description <span className="text-muted-foreground text-xs">({(active.description ?? "").length}/160)</span></Label><Textarea rows={3} value={active.description ?? ""} onChange={(e) => setActive({ ...active, description: e.target.value })} maxLength={170} /></div>
              <div><Label>Keywords</Label><Input value={active.keywords ?? ""} onChange={(e) => setActive({ ...active, keywords: e.target.value })} placeholder="cloud, devops, training" /></div>
              <div><Label>OG Image URL</Label><Input value={active.og_image_url ?? ""} onChange={(e) => setActive({ ...active, og_image_url: e.target.value })} placeholder="https://..." /></div>
              <div><Label>Canonical URL</Label><Input value={active.canonical_url ?? ""} onChange={(e) => setActive({ ...active, canonical_url: e.target.value })} placeholder="https://siliconedgec.com/..." /></div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div><Label className="text-sm">Hide from search engines</Label><p className="text-xs text-muted-foreground">Adds a noindex tag</p></div>
                <Switch checked={active.no_index} onCheckedChange={(v) => setActive({ ...active, no_index: v })} />
              </div>

              <div className="border border-border rounded-lg p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-2">Search preview</p>
                <p className="text-blue-700 text-base truncate">{active.title || "Page title"}</p>
                <p className="text-green-700 text-xs">https://siliconedgec.com{active.path}</p>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{active.description || "Page description appears here."}</p>
              </div>

              <Button onClick={save} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
              </Button>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">Select a page or add a new one.</div>
          )}
        </div>
      </div>
    </div>
  );
}
