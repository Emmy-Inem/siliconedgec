import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudTable, Column } from "@/components/admin/AdminCrudTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { logAdminActivity } from "@/lib/admin-logger";
import { useAuth } from "@/contexts/AuthContext";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featured_image_url: string | null;
  author_name: string | null;
  status: string;
  category: string | null;
  views_count: number;
  published_at: string | null;
  created_at: string;
  tags?: string[] | null;
  meta_title?: string | null;
  meta_description?: string | null;
  seo_keywords?: string[] | null;
  related_post_ids?: string[] | null;
  reading_time_minutes?: number | null;
}

const columns: Column<Post>[] = [
  { key: "title", label: "Title", render: (p) => (
    <div className="space-y-0.5">
      <span className="font-medium block">{p.title}</span>
      <span className="text-xs text-muted-foreground font-mono">/blog/{p.slug}</span>
    </div>
  )},
  { key: "category", label: "Category", render: (p) => p.category || "—" },
  { key: "status", label: "Status", render: (p) => (
    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
      p.status === "published" ? "bg-green-100 text-green-700" :
      p.status === "draft" ? "bg-amber-100 text-amber-700" :
      "bg-muted text-muted-foreground"
    }`}>{p.status}</span>
  )},
  { key: "views_count", label: "Views" },
  { key: "created_at", label: "Created", render: (p) => new Date(p.created_at).toLocaleDateString() },
];

export default function AdminBlog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [form, setForm] = useState({
    title: "", slug: "", excerpt: "", content: "", featured_image_url: "",
    category: "", status: "draft", author_name: "",
    tags: "", meta_title: "", meta_description: "", seo_keywords: "",
    related_post_ids: [] as string[], reading_time_minutes: "",
  });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("blog_posts" as any).select("*").order("created_at", { ascending: false }));
      if (error) throw error;
      return (data as unknown as Post[]);
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const parseList = (s: string) => s.split(",").map((t) => t.trim()).filter(Boolean);
      const payload: any = {
        title: form.title,
        excerpt: form.excerpt,
        content: form.content,
        featured_image_url: form.featured_image_url,
        category: form.category,
        status: form.status,
        author_name: form.author_name,
        tags: parseList(form.tags),
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
        seo_keywords: parseList(form.seo_keywords),
        related_post_ids: form.related_post_ids,
        reading_time_minutes: form.reading_time_minutes ? parseInt(form.reading_time_minutes, 10) : null,
        slug,
        author_id: user?.id,
        published_at: form.status === "published" ? (editing?.published_at || new Date().toISOString()) : null,
      };
      if (editing) {
        const { error } = await (supabase.from("blog_posts" as any).update(payload).eq("id", editing.id));
        if (error) throw error;
        await logAdminActivity("update", "blog_post", editing.id);
      } else {
        const { error } = await (supabase.from("blog_posts" as any).insert(payload));
        if (error) throw error;
        await logAdminActivity("create", "blog_post");
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-blog-posts"] }); setOpen(false); toast({ title: editing ? "Updated" : "Published" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("blog_posts" as any).delete().eq("id", id));
      if (error) throw error;
      await logAdminActivity("delete", "blog_post", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-blog-posts"] }); toast({ title: "Deleted" }); },
  });

  const reset = () => { setEditing(null); setForm({ title: "", slug: "", excerpt: "", content: "", featured_image_url: "", category: "", status: "draft", author_name: "", tags: "", meta_title: "", meta_description: "", seo_keywords: "", related_post_ids: [], reading_time_minutes: "" }); };

  const toggleRelated = (id: string) => {
    setForm((f) => ({ ...f, related_post_ids: f.related_post_ids.includes(id) ? f.related_post_ids.filter((x) => x !== id) : [...f.related_post_ids, id] }));
  };

  return (
    <>
      <AdminCrudTable
        title="Blog Posts"
        data={data}
        columns={columns}
        isLoading={isLoading}
        onAdd={() => { reset(); setOpen(true); }}
        onEdit={(p) => { setEditing(p); setForm({
          title: p.title, slug: p.slug, excerpt: p.excerpt ?? "", content: p.content ?? "",
          featured_image_url: p.featured_image_url ?? "", category: p.category ?? "",
          status: p.status, author_name: p.author_name ?? "",
          tags: (p.tags ?? []).join(", "),
          meta_title: p.meta_title ?? "",
          meta_description: p.meta_description ?? "",
          seo_keywords: (p.seo_keywords ?? []).join(", "),
          related_post_ids: p.related_post_ids ?? [],
          reading_time_minutes: p.reading_time_minutes ? String(p.reading_time_minutes) : "",
        }); setOpen(true); }}
        onDelete={(id) => del.mutate(id)}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Blog Post</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" /></div>
              <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            </div>
            <div><Label>Featured Image URL</Label><Input value={form.featured_image_url} onChange={(e) => setForm({ ...form, featured_image_url: e.target.value })} /></div>
            <div><Label>Excerpt</Label><Textarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></div>
            <div><Label>Content (Markdown)</Label><Textarea rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="font-mono text-sm" /></div>

            <div className="pt-3 mt-3 border-t border-border">
              <h3 className="font-heading text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">SEO</h3>
              <div className="space-y-3">
                <div><Label>Meta Title (≤60 chars)</Label><Input maxLength={70} value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} placeholder="Defaults to post title" /></div>
                <div><Label>Meta Description (≤160 chars)</Label><Textarea rows={2} maxLength={180} value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} placeholder="Defaults to excerpt" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>SEO Keywords (comma separated)</Label><Input value={form.seo_keywords} onChange={(e) => setForm({ ...form, seo_keywords: e.target.value })} placeholder="cloud engineer, aws" /></div>
                  <div><Label>Tags (comma separated)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="cloud, devops" /></div>
                </div>
                <div><Label>Reading Time (minutes)</Label><Input type="number" min={1} value={form.reading_time_minutes} onChange={(e) => setForm({ ...form, reading_time_minutes: e.target.value })} /></div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-border">
              <Label>Related Posts</Label>
              <div className="mt-2 max-h-40 overflow-y-auto border border-border rounded-md p-2 space-y-1">
                {data.filter((p) => p.id !== editing?.id).length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">No other posts yet.</p>
                ) : (
                  data.filter((p) => p.id !== editing?.id).map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">
                      <input type="checkbox" checked={form.related_post_ids.includes(p.id)} onChange={() => toggleRelated(p.id)} />
                      <span className="truncate">{p.title}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Author Name</Label><Input value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
