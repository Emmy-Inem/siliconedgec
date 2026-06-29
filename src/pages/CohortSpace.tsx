import { useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Users, Calendar, MessageSquare, Pin, Trash2, ExternalLink, ArrowLeft, FileText, Link as LinkIcon, Check, X, HelpCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";

const db = supabase as any;

const COVER_IMAGES = [
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600&q=80&auto=format&fit=crop", // team collaborating
  "https://images.unsplash.com/photo-1531497865144-0464ef8fb9a9?w=1600&q=80&auto=format&fit=crop", // study group
  "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1600&q=80&auto=format&fit=crop", // workshop
  "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1600&q=80&auto=format&fit=crop", // discussion
  "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1600&q=80&auto=format&fit=crop",   // mentorship
];
const coverFor = (id: string) => {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COVER_IMAGES[h % COVER_IMAGES.length];
};

export default function CohortSpace() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [cohort, setCohort] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [stats, setStats] = useState<{ members: number; sessions: number; materials: number }>({ members: 0, sessions: 0, materials: 0 });

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data, error } = await db.from("cohorts").select("*").eq("id", id).maybeSingle();
      if (error || !data) { setForbidden(true); setLoading(false); return; }
      setCohort(data); setLoading(false);
      const [m, s, mat] = await Promise.all([
        db.from("cohort_members").select("id", { count: "exact", head: true }).eq("cohort_id", id),
        db.from("cohort_sessions").select("id", { count: "exact", head: true }).eq("cohort_id", id),
        db.from("cohort_materials").select("id", { count: "exact", head: true }).eq("cohort_id", id),
      ]);
      setStats({ members: m.count || 0, sessions: s.count || 0, materials: mat.count || 0 });
    })();
  }, [id, user]);

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!user) return <Navigate to="/sign-in" replace />;
  if (forbidden || !cohort) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-16 text-center max-w-md">
        <h1 className="font-heading text-2xl font-bold mb-2">Cohort not available</h1>
        <p className="text-muted-foreground mb-4">You may not be a member of this cohort.</p>
        <Link to="/cohorts" className="text-primary underline">Back to my cohorts</Link>
      </main>
      <Footer />
    </div>
  );

  const cover = coverFor(cohort.id);

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet><title>{cohort.name} | Cohort | Silicon Edge</title></Helmet>
      <Header />
      <main className="flex-1">
        {/* Hero banner */}
        <section className="relative h-64 md:h-80 w-full overflow-hidden border-b">
          <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-transparent" />
          <div className="relative container mx-auto px-4 h-full flex flex-col justify-end pb-6">
            <Link to="/cohorts" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3 w-fit"><ArrowLeft className="h-3 w-3" />My cohorts</Link>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className="bg-background/80 backdrop-blur">{cohort.status}</Badge>
              {cohort.start_date && <span className="text-xs text-muted-foreground bg-background/60 backdrop-blur px-2 py-0.5 rounded">{cohort.start_date} → {cohort.end_date || "ongoing"}</span>}
            </div>
            <h1 className="font-heading text-3xl md:text-5xl font-bold tracking-tight">{cohort.name}</h1>
            {cohort.description && <p className="text-muted-foreground mt-2 max-w-2xl">{cohort.description}</p>}
          </div>
        </section>

        <div className="container mx-auto px-4 py-6">
          {/* Stat strip */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: Users, label: "Members", value: stats.members },
              { icon: Calendar, label: "Sessions", value: stats.sessions },
              { icon: FileText, label: "Materials", value: stats.materials },
            ].map((s) => (
              <Card key={s.label} className="p-4 flex items-center gap-3 bg-gradient-to-br from-card to-muted/30">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><s.icon className="h-5 w-5" /></div>
                <div>
                  <div className="text-2xl font-bold font-heading leading-none">{s.value}</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{s.label}</div>
                </div>
              </Card>
            ))}
          </div>

        <Tabs defaultValue="discussion">
          <TabsList className="flex flex-wrap h-auto p-1">
            <TabsTrigger value="discussion"><MessageSquare className="h-3.5 w-3.5 mr-1.5" />Discussion</TabsTrigger>
            <TabsTrigger value="sessions"><Calendar className="h-3.5 w-3.5 mr-1.5" />Sessions</TabsTrigger>
            <TabsTrigger value="materials"><FileText className="h-3.5 w-3.5 mr-1.5" />Materials</TabsTrigger>
            <TabsTrigger value="roster"><Users className="h-3.5 w-3.5 mr-1.5" />Roster</TabsTrigger>
          </TabsList>
          <TabsContent value="discussion" className="pt-4"><Discussion cohortId={cohort.id} userId={user.id} isAdmin={isAdmin} /></TabsContent>
          <TabsContent value="sessions" className="pt-4"><SessionsList cohortId={cohort.id} userId={user.id} isStaff={isAdmin} /></TabsContent>
          <TabsContent value="materials" className="pt-4"><Materials cohortId={cohort.id} userId={user.id} isStaff={isAdmin} /></TabsContent>
          <TabsContent value="roster" className="pt-4"><Roster cohortId={cohort.id} /></TabsContent>
        </Tabs>
        </div>
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
        <Card className="p-10 text-center overflow-hidden">
          <img src="https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&q=80&auto=format&fit=crop" alt="" className="w-full max-w-xs mx-auto h-32 object-cover rounded-lg mb-4 opacity-80" />
          <div className="font-medium">Start the conversation</div>
          <p className="text-sm text-muted-foreground mt-1">Share an introduction, ask a question, or post a win.</p>
        </Card>
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
      {members.length === 0 && (
        <Card className="p-10 text-center col-span-full">
          <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80&auto=format&fit=crop" alt="" className="w-full max-w-xs mx-auto h-32 object-cover rounded-lg mb-4 opacity-80" />
          <div className="font-medium">No members yet</div>
        </Card>
      )}
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

function SessionsList({ cohortId, userId, isStaff }: { cohortId: string; userId: string; isStaff: boolean }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [rsvps, setRsvps] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: s } = await db.from("cohort_sessions").select("*").eq("cohort_id", cohortId).order("scheduled_at");
    const list = s || [];
    setSessions(list);
    if (list.length) {
      const ids = list.map((x: any) => x.id);
      const { data: rs } = await db.from("cohort_session_rsvps").select("*").in("session_id", ids);
      const grouped: Record<string, any[]> = {};
      (rs || []).forEach((r: any) => {
        (grouped[r.session_id] = grouped[r.session_id] || []).push(r);
      });
      setRsvps(grouped);
    } else { setRsvps({}); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [cohortId]);

  if (loading) return <Loader2 className="h-5 w-5 animate-spin" />;

  const now = new Date();
  const upcoming = sessions.filter((s) => new Date(s.scheduled_at) >= now);
  const past = sessions.filter((s) => new Date(s.scheduled_at) < now);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Upcoming</h2>
        {upcoming.length === 0 ? <Card className="p-4 text-sm text-muted-foreground">Nothing scheduled.</Card> : (
          <div className="space-y-2">{upcoming.map((s) => <SessionCard key={s.id} s={s} rsvps={rsvps[s.id] || []} userId={userId} isStaff={isStaff} isPast={false} onChange={load} />)}</div>
        )}
      </section>
      {past.length > 0 && (
        <section>
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Past</h2>
          <div className="space-y-2">{past.map((s) => <SessionCard key={s.id} s={s} rsvps={rsvps[s.id] || []} userId={userId} isStaff={isStaff} isPast onChange={load} />)}</div>
        </section>
      )}
    </div>
  );
}

function SessionCard({ s, rsvps, userId, isStaff, isPast, onChange }: { s: any; rsvps: any[]; userId: string; isStaff: boolean; isPast: boolean; onChange: () => void }) {
  const mine = rsvps.find((r) => r.user_id === userId);
  const counts = useMemo(() => ({
    going: rsvps.filter((r) => r.status === "going").length,
    maybe: rsvps.filter((r) => r.status === "maybe").length,
    declined: rsvps.filter((r) => r.status === "declined").length,
    attended: rsvps.filter((r) => r.attended).length,
  }), [rsvps]);
  const [showRoster, setShowRoster] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  const setRsvp = async (status: "going" | "maybe" | "declined") => {
    const { error } = await db.from("cohort_session_rsvps")
      .upsert({ session_id: s.id, user_id: userId, status }, { onConflict: "session_id,user_id" });
    if (error) return toast.error(error.message);
    toast.success("RSVP updated");
    onChange();
  };

  const toggleRoster = async () => {
    const next = !showRoster;
    setShowRoster(next);
    if (next && rsvps.length && Object.keys(profiles).length === 0) {
      const { data: profs } = await supabase.rpc("get_public_profiles", { p_user_ids: rsvps.map((r) => r.user_id) });
      const m: Record<string, any> = {};
      (profs || []).forEach((p: any) => (m[p.user_id] = p));
      setProfiles(m);
    }
  };

  const markAttended = async (r: any, attended: boolean) => {
    const { error } = await db.from("cohort_session_rsvps").update({ attended, marked_by: userId, marked_at: new Date().toISOString() }).eq("id", r.id);
    if (error) return toast.error(error.message);
    onChange();
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="font-medium">{s.title}</div>
          <div className="text-[11px] text-muted-foreground">{new Date(s.scheduled_at).toLocaleString()} · {s.duration_minutes} min</div>
          {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
        </div>
        {s.meeting_url && <a href={s.meeting_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" />Join</a>}
      </div>
      <div className="flex items-center gap-2 flex-wrap text-xs">
        {!isPast && (
          <div className="flex gap-1.5">
            <Button size="sm" variant={mine?.status === "going" ? "default" : "outline"} onClick={() => setRsvp("going")}><Check className="h-3 w-3 mr-1" />Going</Button>
            <Button size="sm" variant={mine?.status === "maybe" ? "default" : "outline"} onClick={() => setRsvp("maybe")}><HelpCircle className="h-3 w-3 mr-1" />Maybe</Button>
            <Button size="sm" variant={mine?.status === "declined" ? "default" : "outline"} onClick={() => setRsvp("declined")}><X className="h-3 w-3 mr-1" />Can't</Button>
          </div>
        )}
        <button onClick={toggleRoster} className="text-muted-foreground hover:text-foreground underline ml-auto">
          {counts.going} going · {counts.maybe} maybe{isPast ? ` · ${counts.attended} attended` : ""}
        </button>
      </div>
      {showRoster && (
        <div className="border-t pt-3 space-y-1.5">
          {rsvps.length === 0 && <div className="text-xs text-muted-foreground">No RSVPs yet.</div>}
          {rsvps.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-6 w-6"><AvatarImage src={profiles[r.user_id]?.avatar_url} /><AvatarFallback>{(profiles[r.user_id]?.full_name || "?").slice(0,1)}</AvatarFallback></Avatar>
                <span className="truncate">{profiles[r.user_id]?.full_name || "Member"}</span>
                <Badge variant="outline" className="text-[10px] h-4">{r.status}</Badge>
                {r.attended && <Badge className="text-[10px] h-4">attended</Badge>}
              </div>
              {isStaff && isPast && (
                <Button size="sm" variant="ghost" onClick={() => markAttended(r, !r.attended)}>
                  {r.attended ? "Unmark" : "Mark attended"}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Materials({ cohortId, userId, isStaff }: { cohortId: string; userId: string; isStaff: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"link" | "file" | "note">("link");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await db.from("cohort_materials").select("*").eq("cohort_id", cohortId).order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [cohortId]);

  const save = async () => {
    if (!title.trim()) return toast.error("Title required");
    setBusy(true);
    try {
      let file_path: string | null = null;
      let file_size: number | null = null;
      let mime_type: string | null = null;
      if (kind === "file") {
        if (!file) { toast.error("Choose a file"); setBusy(false); return; }
        const path = `${cohortId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("cohort-materials").upload(path, file, { upsert: false });
        if (upErr) { toast.error(upErr.message); setBusy(false); return; }
        file_path = path; file_size = file.size; mime_type = file.type;
      }
      const { error } = await db.from("cohort_materials").insert({
        cohort_id: cohortId, title: title.trim(), description: description || null, kind,
        url: kind === "link" ? url || null : null, file_path, file_size, mime_type, created_by: userId,
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Added"); setTitle(""); setDescription(""); setUrl(""); setFile(null); load();
    } finally { setBusy(false); }
  };

  const remove = async (m: any) => {
    if (!confirm("Delete this item?")) return;
    if (m.file_path) await supabase.storage.from("cohort-materials").remove([m.file_path]);
    const { error } = await db.from("cohort_materials").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    load();
  };

  const download = async (m: any) => {
    const { data, error } = await supabase.storage.from("cohort-materials").createSignedUrl(m.file_path, 60 * 10);
    if (error || !data?.signedUrl) return toast.error("Could not create download link");
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-4">
      {isStaff && (
        <Card className="p-4 space-y-3">
          <div className="font-medium text-sm">Add material</div>
          <div className="grid sm:grid-cols-3 gap-2">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="sm:col-span-2" />
            <Select value={kind} onValueChange={(v) => setKind(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="link">Link</SelectItem>
                <SelectItem value="file">File upload</SelectItem>
                <SelectItem value="note">Note</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea placeholder="Optional description / note body" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          {kind === "link" && <Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />}
          {kind === "file" && <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />}
          <div className="flex justify-end"><Button size="sm" onClick={save} disabled={busy}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}</Button></div>
        </Card>
      )}
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : items.length === 0 ? (
        <Card className="p-10 text-center">
          <img src="https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&q=80&auto=format&fit=crop" alt="" className="w-full max-w-xs mx-auto h-32 object-cover rounded-lg mb-4 opacity-80" />
          <div className="font-medium">No materials yet</div>
          <p className="text-sm text-muted-foreground mt-1">Session notes, slides, and links will appear here.</p>
        </Card>
      ) : (
        <div className="grid gap-2">
          {items.map((m) => (
            <Card key={m.id} className="p-3 flex items-start gap-3">
              <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                {m.kind === "file" ? <FileText className="h-4 w-4" /> : m.kind === "link" ? <LinkIcon className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{m.title}</div>
                {m.description && <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{m.description}</p>}
                <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                  {m.kind === "link" && m.url && <a href={m.url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline"><ExternalLink className="h-3 w-3" />Open</a>}
                  {m.kind === "file" && m.file_path && <button onClick={() => download(m)} className="text-primary inline-flex items-center gap-1 hover:underline"><Download className="h-3 w-3" />Download</button>}
                  <span className="text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              {(isStaff || m.created_by === userId) && (
                <Button variant="ghost" size="sm" onClick={() => remove(m)}><Trash2 className="h-3.5 w-3.5" /></Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}