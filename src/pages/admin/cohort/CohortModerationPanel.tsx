import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Megaphone, Pin, Trash2 } from "lucide-react";

const db = supabase as any;

/** Pin, delete and broadcast announcements to the cohort discussion. */
export function CohortModerationPanel({ cohortId }: { cohortId: string }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [announcement, setAnnouncement] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data } = await db
      .from("cohort_posts")
      .select("*")
      .eq("cohort_id", cohortId)
      .order("created_at", { ascending: false })
      .limit(50);
    const rows = data ?? [];
    setPosts(rows);
    const ids = Array.from(new Set(rows.map((p: any) => p.user_id).filter(Boolean)));
    if (ids.length) {
      const { data: profs } = await supabase.rpc("get_public_profiles", { p_user_ids: ids as string[] });
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => (map[p.user_id] = p.full_name ?? p.user_id));
      setNames(map);
    }
  };

  useEffect(() => { load(); }, [cohortId]);

  const togglePin = async (p: any) => {
    const { error } = await db.from("cohort_posts").update({ is_pinned: !p.is_pinned }).eq("id", p.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (p: any) => {
    if (!confirm("Delete this post?")) return;
    const { error } = await db.from("cohort_posts").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Post deleted");
    load();
  };

  const postAnnouncement = async () => {
    if (!announcement.trim()) return;
    setSending(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await db.from("cohort_posts").insert({
        cohort_id: cohortId,
        user_id: u.user?.id,
        content: announcement.trim(),
        kind: "announcement",
        is_pinned: true,
      });
      if (error) throw error;
      toast.success("Announcement posted and pinned");
      setAnnouncement("");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          rows={3}
          placeholder="Post an announcement to this cohort…"
          value={announcement}
          onChange={(e) => setAnnouncement(e.target.value)}
        />
        <Button size="sm" onClick={postAnnouncement} disabled={sending || !announcement.trim()}>
          <Megaphone className="h-3.5 w-3.5 mr-1.5" />Post announcement
        </Button>
      </div>

      <div className="border rounded-lg divide-y">
        {posts.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">No posts yet.</div>}
        {posts.map((p) => (
          <div key={p.id} className="flex items-start justify-between gap-3 p-3">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                {names[p.user_id] ?? "Member"} · {new Date(p.created_at).toLocaleString()}
                {p.is_pinned && <Badge variant="secondary" className="text-[10px]">Pinned</Badge>}
                {p.kind && p.kind !== "message" && <Badge variant="outline" className="text-[10px]">{p.kind}</Badge>}
              </div>
              <p className="text-sm mt-0.5 line-clamp-3 break-words">{p.content}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="ghost" onClick={() => togglePin(p)}><Pin className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="ghost" onClick={() => remove(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}