import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, BookOpen, FolderPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "article";
}

export default function AdminHelp() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [catEditing, setCatEditing] = useState<any | null>(null);

  const { data: cats } = useQuery({
    queryKey: ["admin-kb-cats"],
    queryFn: async () => {
      const { data } = await supabase.from("kb_categories").select("*").order("order_index");
      return data ?? [];
    },
  });
  const { data: articles } = useQuery({
    queryKey: ["admin-kb-articles"],
    queryFn: async () => {
      const { data } = await supabase.from("kb_articles").select("*").order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const saveArticle = useMutation({
    mutationFn: async (a: any) => {
      const payload: any = {
        title: a.title, summary: a.summary ?? "", body: a.body ?? "",
        category_id: a.category_id ?? null, is_published: !!a.is_published,
        slug: a.slug || slugify(a.title), tags: a.tags ?? [],
      };
      if (a.id) {
        const { error } = await supabase.from("kb_articles").update(payload).eq("id", a.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("kb_articles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Saved" });
      qc.invalidateQueries({ queryKey: ["admin-kb-articles"] });
      setEditing(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const delArticle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kb_articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-kb-articles"] }); toast({ title: "Deleted" }); },
  });

  const saveCat = useMutation({
    mutationFn: async (c: any) => {
      const payload = { title: c.title, slug: c.slug || slugify(c.title), description: c.description ?? "", order_index: c.order_index ?? 0, is_published: c.is_published ?? true };
      if (c.id) {
        const { error } = await supabase.from("kb_categories").update(payload).eq("id", c.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("kb_categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-kb-cats"] }); setCatEditing(null); toast({ title: "Category saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="font-heading text-2xl font-bold">Help Center</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCatEditing({})}>
            <FolderPlus className="h-4 w-4 mr-1.5" /> New category
          </Button>
          <Button size="sm" onClick={() => setEditing({ is_published: false })}>
            <Plus className="h-4 w-4 mr-1.5" /> New article
          </Button>
        </div>
      </div>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Categories</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(cats ?? []).map((c: any) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.slug} · {c.is_published ? "Published" : "Hidden"}</p>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setCatEditing(c)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Articles</h2>
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {(articles ?? []).map((a: any) => (
            <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{a.title}</p>
                <p className="text-xs text-muted-foreground truncate">/{a.slug} · {a.is_published ? "Published" : "Draft"}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Delete this article?")) delArticle.mutate(a.id); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {(articles ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground p-6 text-center">No articles yet. Create your first one.</p>
          )}
        </div>
      </section>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit article" : "New article"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
              <div><Label>Slug</Label><Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="auto-generated from title" /></div>
              <div>
                <Label>Category</Label>
                <select className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" value={editing.category_id ?? ""} onChange={(e) => setEditing({ ...editing, category_id: e.target.value || null })}>
                  <option value="">— No category —</option>
                  {(cats ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div><Label>Summary</Label><Textarea rows={2} value={editing.summary ?? ""} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} /></div>
              <div><Label>Body (Markdown)</Label><Textarea rows={14} value={editing.body ?? ""} onChange={(e) => setEditing({ ...editing, body: e.target.value })} className="font-mono text-xs" /></div>
              <div className="flex items-center gap-2">
                <Switch checked={!!editing.is_published} onCheckedChange={(v) => setEditing({ ...editing, is_published: v })} />
                <Label>Published</Label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button disabled={saveArticle.isPending || !editing.title} onClick={() => saveArticle.mutate(editing)}>
                  {saveArticle.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />} Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!catEditing} onOpenChange={(o) => !o && setCatEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{catEditing?.id ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
          {catEditing && (
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={catEditing.title ?? ""} onChange={(e) => setCatEditing({ ...catEditing, title: e.target.value })} /></div>
              <div><Label>Slug</Label><Input value={catEditing.slug ?? ""} onChange={(e) => setCatEditing({ ...catEditing, slug: e.target.value })} placeholder="auto-generated" /></div>
              <div><Label>Description</Label><Textarea rows={3} value={catEditing.description ?? ""} onChange={(e) => setCatEditing({ ...catEditing, description: e.target.value })} /></div>
              <div><Label>Order</Label><Input type="number" value={catEditing.order_index ?? 0} onChange={(e) => setCatEditing({ ...catEditing, order_index: Number(e.target.value) })} /></div>
              <div className="flex items-center gap-2">
                <Switch checked={catEditing.is_published ?? true} onCheckedChange={(v) => setCatEditing({ ...catEditing, is_published: v })} />
                <Label>Published</Label>
              </div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCatEditing(null)}>Cancel</Button><Button disabled={!catEditing.title || saveCat.isPending} onClick={() => saveCat.mutate(catEditing)}>Save</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}