import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Reply, Trash2, Pencil, Loader2, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface CommentRow {
  id: string;
  lesson_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string | null;
  author_avatar?: string | null;
}

/**
 * Threaded lesson discussion. Enrolled users + admins can read and post.
 * RLS in the DB is the source of truth — this UI just enforces the same rules
 * for UX (disabled inputs when not enrolled, etc.).
 */
export function LessonDiscussion({ lessonId }: { lessonId: string }) {
  const { user, isAdmin } = useAuth();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("lesson_comments")
      .select("id, lesson_id, user_id, parent_id, body, is_deleted, created_at, updated_at")
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: true });
    if (error) {
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as CommentRow[];
    // Hydrate author names
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profiles } = await supabase.rpc("get_public_profiles", { p_user_ids: ids });
      const map = new Map<string, { full_name: string; avatar_url: string }>();
      for (const p of (profiles ?? []) as any[]) map.set(p.user_id, p);
      for (const r of rows) {
        const p = map.get(r.user_id);
        r.author_name = p?.full_name ?? "Student";
        r.author_avatar = p?.avatar_url ?? null;
      }
    }
    setComments(rows);
    setLoading(false);
  };

  useEffect(() => {
    if (!lessonId) return;
    load();
    // Realtime: keep the thread fresh while users chat
    const ch = (supabase as any)
      .channel(`lesson_comments:${lessonId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lesson_comments", filter: `lesson_id=eq.${lessonId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      try { supabase.removeChannel(ch); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const tree = useMemo(() => {
    const roots = comments.filter((c) => !c.parent_id);
    const childrenOf = (pid: string) => comments.filter((c) => c.parent_id === pid);
    return roots.map((root) => ({ ...root, replies: childrenOf(root.id) }));
  }, [comments]);

  const post = async (parentId: string | null, text: string) => {
    if (!user) {
      toast({ title: "Sign in to join the discussion", variant: "destructive" });
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    setPosting(true);
    const { error } = await (supabase as any).from("lesson_comments").insert({
      lesson_id: lessonId,
      user_id: user.id,
      parent_id: parentId,
      body: trimmed,
    });
    setPosting(false);
    if (error) {
      toast({ title: "Couldn't post", description: error.message, variant: "destructive" });
      return;
    }
    if (parentId) {
      setReplyingTo(null);
      setReplyBody("");
    } else {
      setBody("");
    }
  };

  const saveEdit = async (id: string) => {
    const trimmed = editBody.trim();
    if (!trimmed) return;
    const { error } = await (supabase as any)
      .from("lesson_comments")
      .update({ body: trimmed })
      .eq("id", id);
    if (error) toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
    setEditing(null);
    setEditBody("");
  };

  const remove = async (id: string, soft = false) => {
    if (soft) {
      await (supabase as any)
        .from("lesson_comments")
        .update({ is_deleted: true, body: "[deleted]" })
        .eq("id", id);
    } else {
      await (supabase as any).from("lesson_comments").delete().eq("id", id);
    }
  };

  const renderItem = (c: CommentRow & { replies?: CommentRow[] }) => {
    const isOwn = user?.id === c.user_id;
    const isEditing = editing === c.id;
    return (
      <li key={c.id} className="space-y-2">
        <div className="rounded-xl border border-border/60 bg-card p-3">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center">
                {(c.author_name ?? "S").slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold">{c.author_name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  {c.updated_at !== c.created_at && " · edited"}
                </p>
              </div>
            </div>
            {(isOwn || isAdmin) && !c.is_deleted && !isEditing && (
              <div className="flex gap-1">
                {isOwn && (
                  <button
                    className="p-1 text-muted-foreground hover:text-foreground rounded"
                    aria-label="Edit comment"
                    onClick={() => {
                      setEditing(c.id);
                      setEditBody(c.body);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  className="p-1 text-muted-foreground hover:text-destructive rounded"
                  aria-label="Delete comment"
                  onClick={() => remove(c.id, isAdmin && !isOwn)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={3}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveEdit(c.id)}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(null); setEditBody(""); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <p className={cn("text-sm whitespace-pre-wrap", c.is_deleted && "italic text-muted-foreground")}>
              {c.body}
            </p>
          )}

          {!c.is_deleted && !c.parent_id && (
            <button
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
              onClick={() => {
                setReplyingTo(replyingTo === c.id ? null : c.id);
                setReplyBody("");
              }}
            >
              <Reply className="h-3 w-3" /> Reply
            </button>
          )}
        </div>

        {replyingTo === c.id && (
          <div className="ml-6 space-y-2">
            <Textarea
              rows={2}
              placeholder="Write a reply…"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => post(c.id, replyBody)} disabled={posting || !replyBody.trim()}>
                <Send className="h-3 w-3 mr-1" /> Reply
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setReplyingTo(null); setReplyBody(""); }}>Cancel</Button>
            </div>
          </div>
        )}

        {c.replies && c.replies.length > 0 && (
          <ul className="ml-6 space-y-2 border-l-2 border-border/40 pl-4">
            {c.replies.map((r) => renderItem(r))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="font-heading font-semibold text-sm">Discussion</h3>
        <span className="text-[10px] text-muted-foreground">({comments.filter((c) => !c.is_deleted).length})</span>
      </div>

      {user ? (
        <div className="space-y-2">
          <Textarea
            rows={3}
            placeholder="Ask a question or share something you learned…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button size="sm" onClick={() => post(null, body)} disabled={posting || !body.trim()}>
            {posting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
            Post comment
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Sign in and enroll to join the discussion.</p>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading discussion…</p>
      ) : tree.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Be the first to start the conversation.</p>
      ) : (
        <ul className="space-y-3">{tree.map((c) => renderItem(c))}</ul>
      )}
    </div>
  );
}