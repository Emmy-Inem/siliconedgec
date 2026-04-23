import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Loader2, MessageSquare, Trash2, Send, HelpCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface QnAItem {
  id: string;
  course_id: string;
  lesson_id: string | null;
  user_id: string;
  question: string;
  parent_id: string | null;
  created_at: string;
  courses?: { title: string } | null;
  profile_name?: string;
}

export default function AdminQnA() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-qna"],
    queryFn: async () => {
      const { data, error } = await supabase.from("course_qna").select("*, courses(title)").order("created_at", { ascending: false });
      if (error) throw error;
      const userIds = [...new Set((data || []).map((q) => q.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const nameMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name]));
      return (data || []).map((q) => ({ ...q, profile_name: nameMap[q.user_id] || "Unknown" })) as QnAItem[];
    },
  });

  const reply = useMutation({
    mutationFn: async (parentId: string) => {
      const parent = items.find((i) => i.id === parentId);
      if (!parent || !user) return;
      const { error } = await supabase.from("course_qna").insert({
        course_id: parent.course_id, lesson_id: parent.lesson_id, user_id: user.id,
        question: replyText, parent_id: parentId,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-qna"] }); setReplyTo(null); setReplyText(""); toast({ title: "Reply posted" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("course_qna").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-qna"] }); toast({ title: "Deleted" }); },
  });

  const topLevel = items.filter((i) => !i.parent_id);
  const replies = (parentId: string) => items.filter((i) => i.parent_id === parentId);

  const filtered = topLevel.filter((i) =>
    i.question.toLowerCase().includes(search.toLowerCase()) ||
    (i.profile_name || "").toLowerCase().includes(search.toLowerCase()) ||
    ((i.courses as any)?.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold">Q&A Moderation</h1>
          <p className="text-sm text-muted-foreground mt-1">Answer student questions and remove spam</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Total Questions</span>
            <HelpCircle className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-heading">{topLevel.length}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Replies</span>
            <MessageCircle className="h-4 w-4 text-accent" />
          </div>
          <div className="text-2xl font-bold font-heading">{items.length - topLevel.length}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Unanswered</span>
            <MessageSquare className="h-4 w-4 text-destructive" />
          </div>
          <div className="text-2xl font-bold font-heading">{topLevel.filter((q) => replies(q.id).length === 0).length}</div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input type="text" placeholder="Search questions..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">No questions found.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((q) => (
            <div key={q.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span className="font-medium text-foreground">{q.profile_name}</span>
                    <span>·</span>
                    <span>{(q.courses as any)?.title}</span>
                    <span>·</span>
                    <span>{format(new Date(q.created_at), "MMM d, yyyy")}</span>
                  </div>
                  <p className="text-sm">{q.question}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setReplyTo(replyTo === q.id ? null : q.id)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => remove.mutate(q.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {replies(q.id).map((r) => (
                <div key={r.id} className="ml-6 mt-3 pl-3 border-l-2 border-primary/20">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span className="font-medium text-foreground">{r.profile_name}</span>
                    <span>·</span>
                    <span>{format(new Date(r.created_at), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <p className="text-sm">{r.question}</p>
                    <button onClick={() => remove.mutate(r.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
              ))}

              {replyTo === q.id && (
                <div className="ml-6 mt-3 flex gap-2">
                  <input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a reply..."
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <Button size="sm" onClick={() => reply.mutate(q.id)} disabled={!replyText || reply.isPending}>
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
