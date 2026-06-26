import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Users, Calendar, MessageSquare, Pin, Trash2, ExternalLink, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";

const db = supabase as any;

export default function CohortSpace() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [cohort, setCohort] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data, error } = await db.from("cohorts").select("*").eq("id", id).maybeSingle();
      if (error || !data) { setForbidden(true); setLoading(false); return; }
      setCohort(data); setLoading(false);
    })();
  }, [id, user]);

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!user) return <Navigate to="/sign-in" replace />;
  if (forbidden || !cohort) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-16 text-center">
        <h1 className="font-heading text-2xl font-bold mb-2">Cohort not available</h1>
        <p className="text-muted-foreground mb-4">You may not be a member of this cohort.</p>
        <Link to="/cohorts" className="text-primary underline">Back to my cohorts</Link>
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet><title>{cohort.name} | Cohort | Silicon Edge</title></Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Link to="/cohorts" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3"><ArrowLeft className="h-3 w-3" />My cohorts</Link>
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2"><Badge variant="outline">{cohort.status}</Badge>{cohort.start_date && <span className="text-xs text-muted-foreground">{cohort.start_date} → {cohort.end_date || "ongoing"}</span>}</div>
          <h1 className="font-heading text-3xl font-bold">{cohort.name}</h1>
          {cohort.description && <p className="text-muted-foreground mt-1">{cohort.description}</p>}
        </div>

        <Tabs defaultValue="discussion">
          <TabsList>
            <TabsTrigger value="discussion"><MessageSquare className="h-3.5 w-3.5 mr-1.5" />Discussion</TabsTrigger>
            <TabsTrigger value="roster"><Users className="h-3.5 w-3.5 mr-1.5" />Roster</TabsTrigger>
            <TabsTrigger value="sessions"><Calendar className="h-3.5 w-3.5 mr-1.5" />Sessions</TabsTrigger>
          </TabsList>
          <TabsContent value="discussion" className="pt-4"><Discussion cohortId={cohort.id} userId={user.id} isAdmin={isAdmin} /></TabsContent>
          <TabsContent value="roster" className="pt-4"><Roster cohortId={cohort.id} /></TabsContent>
          <TabsContent value="sessions" className="pt-4"><SessionsList cohortId={cohort.id} /></TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}

function Discussion({ cohortId, userId, isAdmin }: { cohortId: string; userId: string; isAdmin: boolean }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await db.from("cohort_posts").select("*").eq("cohort_id", cohortId).order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
    const rows = data || [];
    setPosts(rows);
    if (rows.length) {
      const ids = Array.from(new Set(rows.map((r: any) => r.user_id)));
      const { data: profs } = await supabase.rpc("get_public_profiles", { p_user_ids: ids as string[] });
      const m: Record<string, any> = {};
      (profs || []).forEach((p: any) => (m[p.user_id] = p));
      setProfiles(m);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [cohortId]);

  const post = async () => {
    if (!content.trim()) return;
    const { error } = await db.from("cohort_posts").insert({ cohort_id: cohortId, user_id: userId, content: content.trim(), parent_id: replyTo });
    if (error) return toast.error(error.message);
    setContent(""); setReplyTo(null); load();
  };

  const remove = async (id: string) => {
    const { error } = await db.from("cohort_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const togglePin = async (p: any) => {
    const { error } = await db.from("cohort_posts").update({ is_pinned: !p.is_pinned }).eq("id", p.id);
    if (error) return toast.error(error.message);
    load();
  };

  const topLevel = posts.filter((p) => !p.parent_id);
  const repliesOf = (pid: string) => posts.filter((p) => p.parent_id === pid).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="space-y-4">
      <Card className="p-4">
        {replyTo && <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">Replying to a post <button className="underline" onClick={() => setReplyTo(null)}>cancel</button></div>}
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Share an update, ask a question..." rows={3} />
        <div className="flex justify-end mt-2"><Button size="sm" onClick={post}><Send className="h-3.5 w-3.5 mr-1.5" />Post</Button></div>
      </Card>

      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : topLevel.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Be the first to post in this cohort.</Card>
      ) : topLevel.map((p) => (
        <Card key={p.id} className="p-4">
          <PostRow post={p} profile={profiles[p.user_id]} canManage={p.user_id === userId || isAdmin} onReply={() => setReplyTo(p.id)} onDelete={() => remove(p.id)} onPin={isAdmin ? () => togglePin(p) : undefined} />
          {repliesOf(p.id).map((r) => (
            <div key={r.id} className="ml-6 mt-3 pl-3 border-l border-border">
              <PostRow post={r} profile={profiles[r.user_id]} canManage={r.user_id === userId || isAdmin} onDelete={() => remove(r.id)} />
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}

function PostRow({ post, profile, canManage, onReply, onDelete, onPin }: { post: any; profile?: any; canManage: boolean; onReply?: () => void; onDelete: () => void; onPin?: () => void }) {
  return (
    <div className="flex gap-3">
      <Avatar className="h-9 w-9"><AvatarImage src={profile?.avatar_url} /><AvatarFallback>{(profile?.full_name || "?").slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{profile?.full_name || "Member"}</span>
          <span className="text-[11px] text-muted-foreground">{new Date(post.created_at).toLocaleString()}</span>
          {post.is_pinned && <Badge variant="outline" className="h-4 text-[10px]"><Pin className="h-2.5 w-2.5 mr-1" />Pinned</Badge>}
        </div>
        <p className="text-sm mt-1 whitespace-pre-wrap break-words">{post.content}</p>
        <div className="flex gap-3 mt-2 text-[11px] text-muted-foreground">
          {onReply && <button onClick={onReply} className="hover:text-foreground">Reply</button>}
          {onPin && <button onClick={onPin} className="hover:text-foreground">{post.is_pinned ? "Unpin" : "Pin"}</button>}
          {canManage && <button onClick={onDelete} className="hover:text-destructive inline-flex items-center gap-1"><Trash2 className="h-3 w-3" />Delete</button>}
        </div>
      </div>
    </div>
  );
}

function Roster({ cohortId }: { cohortId: string }) {
  const [members, setMembers] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await db.from("cohort_members").select("*").eq("cohort_id", cohortId).order("role").order("joined_at");
      const rows = data || [];
      if (rows.length) {
        const { data: profs } = await supabase.rpc("get_public_profiles", { p_user_ids: rows.map((r: any) => r.user_id) });
        const m = new Map<string, any>();
        (profs || []).forEach((p: any) => m.set(p.user_id, p));
        rows.forEach((r: any) => (r.profile = m.get(r.user_id)));
      }
      setMembers(rows);
    })();
  }, [cohortId]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {members.length === 0 && <Card className="p-6 text-center text-muted-foreground col-span-full">No members yet.</Card>}
      {members.map((m) => (
        <Card key={m.id} className="p-4 flex items-center gap-3">
          <Avatar><AvatarImage src={m.profile?.avatar_url} /><AvatarFallback>{(m.profile?.full_name || "?").slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate">{m.profile?.full_name || "Member"}</div>
            <Badge variant={m.role === "instructor" ? "default" : "outline"} className="mt-1 text-[10px] h-4">{m.role}</Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}

function SessionsList({ cohortId }: { cohortId: string }) {
  const [sessions, setSessions] = useState<any[]>([]);
  useEffect(() => {
    db.from("cohort_sessions").select("*").eq("cohort_id", cohortId).order("scheduled_at").then(({ data }: any) => setSessions(data || []));
  }, [cohortId]);

  const upcoming = sessions.filter((s) => new Date(s.scheduled_at) >= new Date());
  const past = sessions.filter((s) => new Date(s.scheduled_at) < new Date());

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Upcoming</h2>
        {upcoming.length === 0 ? <Card className="p-4 text-sm text-muted-foreground">Nothing scheduled.</Card> : (
          <div className="space-y-2">{upcoming.map((s) => <SessionCard key={s.id} s={s} />)}</div>
        )}
      </section>
      {past.length > 0 && (
        <section>
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Past</h2>
          <div className="space-y-2">{past.map((s) => <SessionCard key={s.id} s={s} />)}</div>
        </section>
      )}
    </div>
  );
}

function SessionCard({ s }: { s: any }) {
  return (
    <Card className="p-4 flex items-start justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <div className="font-medium">{s.title}</div>
        <div className="text-[11px] text-muted-foreground">{new Date(s.scheduled_at).toLocaleString()} · {s.duration_minutes} min</div>
        {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
      </div>
      {s.meeting_url && <a href={s.meeting_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" />Join</a>}
    </Card>
  );
}