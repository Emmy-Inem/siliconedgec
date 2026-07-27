import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Send, MessageSquare, Pin, Trash2, X, Paperclip, HelpCircle,
  Check, SmilePlus, Megaphone, Download,
} from "lucide-react";
import { toast } from "sonner";

const db = supabase as any;

const REACTIONS = ["👍", "🔥", "🎉", "❤️", "😂", "🙏"];

type Post = {
  id: string;
  cohort_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  is_pinned: boolean;
  created_at: string;
  kind?: string | null;
  is_resolved?: boolean | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
};

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, yest)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

/**
 * Realtime, chat-first cohort discussion: live messages, presence,
 * typing indicators, emoji reactions, @mentions, attachments and
 * question threads. Designed to remove the pull toward WhatsApp.
 */
export default function CohortDiscussion({
  cohortId,
  userId,
  isStaff,
  members,
}: {
  cohortId: string;
  userId: string;
  isStaff: boolean;
  members: { user_id: string; full_name: string | null; avatar_url?: string | null; role?: string }[];
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [reactions, setReactions] = useState<Record<string, { emoji: string; user_id: string }[]>>({});
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [asQuestion, setAsQuestion] = useState(false);
  const [filter, setFilter] = useState<"all" | "questions" | "pinned">("all");
  const [online, setOnline] = useState<string[]>([]);
  const [typing, setTyping] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    });
  }, []);

  const hydrateProfiles = useCallback(async (rows: Post[]) => {
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    if (!ids.length) return;
    const { data: profs } = await supabase.rpc("get_public_profiles", { p_user_ids: ids as string[] });
    setProfiles((prev) => {
      const m = { ...prev };
      (profs || []).forEach((p: any) => (m[p.user_id] = p));
      return m;
    });
  }, []);

  const loadReactions = useCallback(async () => {
    const { data } = await db.from("cohort_post_reactions").select("post_id, emoji, user_id").eq("cohort_id", cohortId);
    const m: Record<string, { emoji: string; user_id: string }[]> = {};
    (data || []).forEach((r: any) => {
      (m[r.post_id] ||= []).push({ emoji: r.emoji, user_id: r.user_id });
    });
    setReactions(m);
  }, [cohortId]);

  const load = useCallback(async () => {
    const { data } = await db
      .from("cohort_posts")
      .select("*")
      .eq("cohort_id", cohortId)
      .order("created_at", { ascending: true });
    const rows: Post[] = data || [];
    setPosts(rows);
    await hydrateProfiles(rows);
    setLoading(false);
    scrollToBottom(false);
  }, [cohortId, hydrateProfiles, scrollToBottom]);

  useEffect(() => { load(); loadReactions(); }, [load, loadReactions]);

  // Mark the space as read whenever we open it / receive messages.
  const markRead = useCallback(async () => {
    await db
      .from("cohort_reads")
      .upsert({ cohort_id: cohortId, user_id: userId, last_read_at: new Date().toISOString() }, { onConflict: "cohort_id,user_id" });
    window.dispatchEvent(new Event("cohort-read-changed"));
  }, [cohortId, userId]);

  useEffect(() => { markRead(); }, [markRead, posts.length]);

  // Realtime: messages, reactions, presence + typing.
  useEffect(() => {
    const me = members.find((m) => m.user_id === userId);
    const channel = supabase
      .channel(`cohort-space:${cohortId}`, { config: { presence: { key: userId } } })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cohort_posts", filter: `cohort_id=eq.${cohortId}` }, (payload) => {
        const row = payload.new as Post;
        setPosts((prev) => (prev.some((p) => p.id === row.id) ? prev : [...prev, row]));
        hydrateProfiles([row]);
        scrollToBottom();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "cohort_posts", filter: `cohort_id=eq.${cohortId}` }, (payload) => {
        const row = payload.new as Post;
        setPosts((prev) => prev.map((p) => (p.id === row.id ? { ...p, ...row } : p)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "cohort_posts" }, (payload) => {
        const row = payload.old as any;
        setPosts((prev) => prev.filter((p) => p.id !== row.id));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "cohort_post_reactions", filter: `cohort_id=eq.${cohortId}` }, () => {
        loadReactions();
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, any[]>;
        setOnline(Object.keys(state));
      })
      .on("broadcast", { event: "typing" }, ({ payload }: any) => {
        if (payload.user_id === userId) return;
        setTyping((prev) => ({ ...prev, [payload.user_id]: payload.name }));
        setTimeout(() => setTyping((prev) => {
          const next = { ...prev };
          delete next[payload.user_id];
          return next;
        }), 3000);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: userId, name: me?.full_name || "Member", at: Date.now() });
        }
      });
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); channelRef.current = null; };
  }, [cohortId, userId, members, hydrateProfiles, loadReactions, scrollToBottom]);

  const lastTypingSent = useRef(0);
  const broadcastTyping = () => {
    const now = Date.now();
    if (now - lastTypingSent.current < 1500) return;
    lastTypingSent.current = now;
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId, name: members.find((m) => m.user_id === userId)?.full_name || "Someone" },
    });
  };

  const post = async () => {
    if (!content.trim() && !file) return;
    setSending(true);
    try {
      let attachment_url: string | null = null;
      let attachment_name: string | null = null;
      let attachment_type: string | null = null;
      if (file) {
        const path = `${cohortId}/chat/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("cohort-materials").upload(path, file);
        if (upErr) { toast.error(upErr.message); return; }
        attachment_url = path; attachment_name = file.name; attachment_type = file.type;
      }
      const { error } = await db.from("cohort_posts").insert({
        cohort_id: cohortId,
        user_id: userId,
        content: content.trim() || (attachment_name ?? ""),
        parent_id: replyTo?.id ?? null,
        kind: asQuestion ? "question" : "message",
        attachment_url, attachment_name, attachment_type,
      });
      if (error) { toast.error(error.message); return; }
      setContent(""); setReplyTo(null); setFile(null); setAsQuestion(false);
      scrollToBottom();
    } finally { setSending(false); }
  };

  const remove = async (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    const { error } = await db.from("cohort_posts").delete().eq("id", id);
    if (error) { toast.error(error.message); load(); }
  };

  const togglePin = async (p: Post) => {
    const { error } = await db.from("cohort_posts").update({ is_pinned: !p.is_pinned }).eq("id", p.id);
    if (error) return toast.error(error.message);
    setPosts((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_pinned: !p.is_pinned } : x)));
  };

  const toggleResolved = async (p: Post) => {
    const { error } = await db.from("cohort_posts").update({ is_resolved: !p.is_resolved }).eq("id", p.id);
    if (error) return toast.error(error.message);
    setPosts((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_resolved: !p.is_resolved } : x)));
  };

  const react = async (postId: string, emoji: string) => {
    setPickerFor(null);
    const mine = (reactions[postId] || []).some((r) => r.emoji === emoji && r.user_id === userId);
    setReactions((prev) => {
      const list = [...(prev[postId] || [])];
      const next = mine
        ? list.filter((r) => !(r.emoji === emoji && r.user_id === userId))
        : [...list, { emoji, user_id: userId }];
      return { ...prev, [postId]: next };
    });
    if (mine) {
      await db.from("cohort_post_reactions").delete().eq("post_id", postId).eq("user_id", userId).eq("emoji", emoji);
    } else {
      const { error } = await db.from("cohort_post_reactions").insert({ post_id: postId, cohort_id: cohortId, user_id: userId, emoji });
      if (error) { toast.error(error.message); loadReactions(); }
    }
  };

  const openAttachment = async (path: string) => {
    const { data, error } = await supabase.storage.from("cohort-materials").createSignedUrl(path, 600);
    if (error || !data?.signedUrl) return toast.error("Could not open attachment");
    window.open(data.signedUrl, "_blank");
  };

  const byId = useMemo(() => {
    const m: Record<string, Post> = {};
    posts.forEach((p) => (m[p.id] = p));
    return m;
  }, [posts]);

  const pinned = useMemo(() => posts.filter((p) => p.is_pinned), [posts]);

  const visible = useMemo(() => {
    if (filter === "questions") return posts.filter((p) => p.kind === "question");
    if (filter === "pinned") return pinned;
    return posts;
  }, [posts, filter, pinned]);

  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return members
      .filter((m) => m.user_id !== userId && (m.full_name || "").toLowerCase().includes(q))
      .slice(0, 5);
  }, [mentionQuery, members, userId]);

  const onChangeContent = (value: string) => {
    setContent(value);
    broadcastTyping();
    const match = /(?:^|\s)@(\w*)$/.exec(value);
    setMentionQuery(match ? match[1] : null);
  };

  const applyMention = (name: string) => {
    setContent((prev) => prev.replace(/(?:^|\s)@(\w*)$/, (m) => `${m.startsWith(" ") ? " " : ""}@${name.split(" ")[0]} `));
    setMentionQuery(null);
  };

  const typingNames = Object.values(typing);

  return (
    <div className="flex flex-col h-[72vh] md:h-[calc(100vh-24rem)] min-h-[460px] rounded-xl border border-border bg-card overflow-hidden">
      {/* Header: presence + filters */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30 flex-wrap">
        <div className="flex -space-x-2">
          {members.filter((m) => online.includes(m.user_id)).slice(0, 5).map((m) => (
            <Avatar key={m.user_id} className="h-6 w-6 ring-2 ring-card">
              <AvatarImage src={m.avatar_url || undefined} />
              <AvatarFallback className="text-[9px]">{(m.full_name || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 align-middle" />
          {online.length} online
        </span>
        <div className="ml-auto flex gap-1">
          {(["all", "questions", "pinned"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[11px] px-2 py-1 rounded-full capitalize transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Pinned announcement strip */}
      {pinned.length > 0 && filter !== "pinned" && (
        <div className="px-3 py-2 border-b border-border bg-primary/5 flex items-start gap-2">
          <Megaphone className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
          <p className="text-[12px] line-clamp-2 flex-1">
            <span className="font-medium">{profiles[pinned[0].user_id]?.full_name || "Pinned"}: </span>
            {pinned[0].content}
          </p>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 bg-gradient-to-b from-background to-muted/20">
        {loading ? (
          <div className="h-full grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : visible.length === 0 ? (
          <div className="h-full grid place-items-center text-center px-4">
            <div>
              <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/60" />
              <div className="font-medium">Start the conversation</div>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Say hello, ask a question, or share a win with your cohort.</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {["👋 Introduce yourself", "❓ Ask a question", "🎉 Share a win"].map((s) => (
                  <Button key={s} size="sm" variant="outline" onClick={() => { setContent(s.slice(2) + ": "); setAsQuestion(s.includes("question")); }}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          visible.map((p, i) => {
            const mine = p.user_id === userId;
            const prof = profiles[p.user_id];
            const parent = p.parent_id ? byId[p.parent_id] : null;
            const parentProf = parent ? profiles[parent.user_id] : null;
            const prev = visible[i - 1];
            const showDay = !prev || dayLabel(prev.created_at) !== dayLabel(p.created_at);
            const rx = reactions[p.id] || [];
            const grouped = REACTIONS
              .map((e) => ({ emoji: e, count: rx.filter((r) => r.emoji === e).length, mine: rx.some((r) => r.emoji === e && r.user_id === userId) }))
              .filter((g) => g.count > 0);
            const isInstructor = members.find((m) => m.user_id === p.user_id)?.role === "instructor";
            return (
              <div key={p.id}>
                {showDay && (
                  <div className="flex items-center gap-3 my-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{dayLabel(p.created_at)}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                <div className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                  {!mine && (
                    <Avatar className="h-8 w-8 mt-0.5 shrink-0">
                      <AvatarImage src={prof?.avatar_url} />
                      <AvatarFallback>{(prof?.full_name || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[85%] sm:max-w-[70%] flex flex-col ${mine ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-0.5 flex-wrap">
                      <span className="font-medium">{mine ? "You" : (prof?.full_name || "Member")}</span>
                      {isInstructor && <Badge variant="secondary" className="h-4 text-[9px] py-0">Instructor</Badge>}
                      <span>{new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      {p.is_pinned && <Badge variant="outline" className="h-4 text-[9px] py-0"><Pin className="h-2.5 w-2.5 mr-1" />Pinned</Badge>}
                      {p.kind === "question" && (
                        <Badge variant={p.is_resolved ? "secondary" : "default"} className="h-4 text-[9px] py-0">
                          <HelpCircle className="h-2.5 w-2.5 mr-1" />{p.is_resolved ? "Answered" : "Question"}
                        </Badge>
                      )}
                    </div>
                    <div className={`relative rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words shadow-sm ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border rounded-bl-sm"}`}>
                      {parent && (
                        <div className={`mb-1.5 rounded-lg text-[11px] border-l-2 pl-2 py-1 ${mine ? "bg-primary-foreground/10 border-primary-foreground/40" : "bg-muted/60 border-primary/40"}`}>
                          <div className={`font-medium ${mine ? "text-primary-foreground/80" : "text-foreground"}`}>{parentProf?.full_name || "Member"}</div>
                          <div className={`line-clamp-2 opacity-80 ${mine ? "" : "text-muted-foreground"}`}>{parent.content}</div>
                        </div>
                      )}
                      {p.content}
                      {p.attachment_url && (
                        <button
                          onClick={() => openAttachment(p.attachment_url!)}
                          className={`mt-2 flex items-center gap-1.5 text-[11px] underline ${mine ? "text-primary-foreground/90" : "text-primary"}`}
                        >
                          <Download className="h-3 w-3" />{p.attachment_name || "Attachment"}
                        </button>
                      )}
                    </div>

                    {grouped.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {grouped.map((g) => (
                          <button
                            key={g.emoji}
                            onClick={() => react(p.id, g.emoji)}
                            className={`text-[11px] rounded-full border px-1.5 py-0.5 transition-colors ${g.mine ? "border-primary bg-primary/10" : "border-border bg-muted/50 hover:bg-muted"}`}
                          >
                            {g.emoji} {g.count}
                          </button>
                        ))}
                      </div>
                    )}

                    {pickerFor === p.id && (
                      <div className="flex gap-1 mt-1 rounded-full border border-border bg-popover px-2 py-1 shadow-md">
                        {REACTIONS.map((e) => (
                          <button key={e} onClick={() => react(p.id, e)} className="text-sm hover:scale-125 transition-transform">{e}</button>
                        ))}
                      </div>
                    )}

                    <div className={`flex gap-3 mt-1 text-[11px] ${mine ? "text-primary/70" : "text-muted-foreground"}`}>
                      <button onClick={() => setPickerFor(pickerFor === p.id ? null : p.id)} className="hover:text-foreground inline-flex items-center gap-1"><SmilePlus className="h-3 w-3" />React</button>
                      <button onClick={() => setReplyTo(p)} className="hover:text-foreground">Reply</button>
                      {isStaff && <button onClick={() => togglePin(p)} className="hover:text-foreground">{p.is_pinned ? "Unpin" : "Pin"}</button>}
                      {p.kind === "question" && (isStaff || mine) && (
                        <button onClick={() => toggleResolved(p)} className="hover:text-foreground inline-flex items-center gap-1"><Check className="h-3 w-3" />{p.is_resolved ? "Reopen" : "Mark answered"}</button>
                      )}
                      {(mine || isStaff) && <button onClick={() => remove(p.id)} className="hover:text-destructive inline-flex items-center gap-1"><Trash2 className="h-3 w-3" />Delete</button>}
                    </div>
                  </div>
                  {mine && (
                    <Avatar className="h-8 w-8 mt-0.5 shrink-0">
                      <AvatarImage src={prof?.avatar_url} />
                      <AvatarFallback>{(prof?.full_name || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {typingNames.length > 0 && (
        <div className="px-4 py-1 text-[11px] text-muted-foreground border-t border-border bg-card">
          {typingNames.slice(0, 2).join(", ")} {typingNames.length > 1 ? "are" : "is"} typing…
        </div>
      )}

      {replyTo && (
        <div className="border-t border-border px-3 py-2 bg-muted/40 flex items-start gap-2">
          <div className="w-1 self-stretch rounded bg-primary/60" />
          <div className="flex-1 min-w-0 text-[11px]">
            <div className="font-medium">Replying to {profiles[replyTo.user_id]?.full_name || "Member"}</div>
            <div className="text-muted-foreground line-clamp-1">{replyTo.content}</div>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground p-1"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-border p-2 sm:p-3 bg-card relative">
        {mentionMatches.length > 0 && (
          <div className="absolute bottom-full left-3 mb-1 w-56 rounded-lg border border-border bg-popover shadow-lg overflow-hidden z-10">
            {mentionMatches.map((m) => (
              <button key={m.user_id} onClick={() => applyMention(m.full_name || "")} className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2">
                <Avatar className="h-5 w-5"><AvatarImage src={m.avatar_url || undefined} /><AvatarFallback className="text-[9px]">{(m.full_name || "?").slice(0, 1)}</AvatarFallback></Avatar>
                <span className="truncate">{m.full_name || "Member"}</span>
              </button>
            ))}
          </div>
        )}
        {file && (
          <div className="flex items-center gap-2 mb-2 text-[11px] bg-muted/50 rounded px-2 py-1">
            <Paperclip className="h-3 w-3" /><span className="truncate flex-1">{file.name}</span>
            <button onClick={() => setFile(null)} aria-label="Remove attachment"><X className="h-3 w-3" /></button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <label className="h-10 w-10 shrink-0 grid place-items-center rounded-md border border-border cursor-pointer hover:bg-muted" aria-label="Attach a file">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          <Textarea
            value={content}
            onChange={(e) => onChangeContent(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); post(); } }}
            placeholder={asQuestion ? "Ask your instructor a question…" : "Message your cohort… (@ to mention)"}
            rows={1}
            className="min-h-[40px] max-h-32 resize-none"
          />
          <Button size="sm" onClick={post} disabled={sending || (!content.trim() && !file)} className="h-10">
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <button
          onClick={() => setAsQuestion((v) => !v)}
          className={`mt-2 inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-1 border transition-colors ${asQuestion ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
        >
          <HelpCircle className="h-3 w-3" />Ask as a question
        </button>
      </div>
    </div>
  );
}