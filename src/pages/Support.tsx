import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LifeBuoy, Plus, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";

interface Ticket {
  id: string;
  ticket_number: number;
  subject: string;
  status: string;
  priority: string;
  category: string;
  last_activity_at: string;
  unread_user_count: number;
}

const statusStyles: Record<string, string> = {
  open: "bg-primary/15 text-primary",
  pending: "bg-amber-500/15 text-amber-500",
  resolved: "bg-emerald-500/15 text-emerald-500",
  closed: "bg-muted text-muted-foreground",
};

export default function Support() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("support_tickets")
      .select("id, ticket_number, subject, status, priority, category, last_activity_at, unread_user_count")
      .eq("user_id", user.id)
      .order("last_activity_at", { ascending: false });
    setTickets((data ?? []) as Ticket[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subject.trim() || !body.trim()) return;
    setCreating(true);
    const { data, error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      email: user.email,
      subject: subject.trim().slice(0, 180),
      body: body.trim(),
      source: "user",
    }).select("id").single();
    if (error) {
      setCreating(false);
      return toast({ title: "Could not create ticket", description: error.message, variant: "destructive" });
    }
    await supabase.from("support_ticket_messages").insert({
      ticket_id: data.id, sender_id: user.id, sender_role: "user", content: body.trim(),
    });
    await supabase.functions.invoke("support-notify", { body: { ticketId: data.id, event: "created" } });
    setCreating(false);
    toast({ title: "Ticket created", description: "Our team has been notified by email." });
    navigate(`/support/${data.id}`);
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <LifeBuoy className="h-10 w-10 text-primary mx-auto mb-3" />
        <h1 className="font-heading text-2xl font-bold">Sign in to view your support tickets</h1>
        <Link to="/sign-in" className="inline-block mt-4 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <SEO title="Support tickets | Silicon Edge Consulting" description="Track your support requests and chat with the Silicon Edge team." />
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2"><LifeBuoy className="h-6 w-6 text-primary" /> Support</h1>
          <p className="text-sm text-muted-foreground mt-1">Your requests, replies from our team, and their status.</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="shrink-0 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> New ticket
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="border border-border rounded-xl bg-card p-4 space-y-3 mb-6">
          <input value={subject} onChange={e => setSubject(e.target.value)} maxLength={180} required placeholder="Subject" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
          <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={4000} required rows={5} placeholder="Describe your issue…" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
          <button type="submit" disabled={creating} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-2">
            {creating && <Loader2 className="h-4 w-4 animate-spin" />} Submit ticket
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : tickets.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center">
          <p className="text-sm text-muted-foreground">No tickets yet. Ask the assistant in the chat bubble — it opens a ticket automatically if it can't help.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(t => (
            <Link key={t.id} to={`/support/${t.id}`} className="block border border-border rounded-xl bg-card p-4 hover:border-primary/50 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">#{t.ticket_number} · {t.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Updated {formatDistanceToNow(new Date(t.last_activity_at), { addSuffix: true })}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {t.unread_user_count > 0 && <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-bold">{t.unread_user_count}</span>}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${statusStyles[t.status] ?? "bg-muted"}`}>{t.status}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
