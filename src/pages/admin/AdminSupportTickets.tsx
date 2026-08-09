import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LifeBuoy, Send, CheckCircle2, Sparkles, Headphones } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Ticket {
  id: string; ticket_number: number; user_id: string; email: string | null;
  subject: string; body: string; status: string; priority: string; category: string;
  source: string; last_activity_at: string; unread_admin_count: number; resolution_note: string | null;
}
interface Msg { id: string; sender_role: string; content: string; created_at: string; is_internal: boolean }

const STATUSES = ["all", "open", "pending", "resolved", "closed"] as const;

export default function AdminSupportTickets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { full_name: string | null }>>({});
  const [filter, setFilter] = useState<(typeof STATUSES)[number]>("open");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [internal, setInternal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    let q = supabase.from("support_tickets").select("*").order("last_activity_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    const rows = (data ?? []) as Ticket[];
    setTickets(rows);
    const ids = [...new Set(rows.map(r => r.user_id))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      const map: Record<string, { full_name: string | null }> = {};
      profs?.forEach(p => { map[p.user_id] = { full_name: p.full_name }; });
      setProfiles(map);
    }
  };

  useEffect(() => { load(); }, [filter]);

  useEffect(() => {
    const ch = supabase.channel("admin-tickets")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [filter]);

  useEffect(() => {
    if (!activeId) return;
    (async () => {
      const { data } = await supabase.from("support_ticket_messages").select("*").eq("ticket_id", activeId).order("created_at", { ascending: true });
      setMessages((data ?? []) as Msg[]);
      await supabase.from("support_tickets").update({ unread_admin_count: 0 }).eq("id", activeId);
    })();
    const ch = supabase.channel(`admin-ticket-${activeId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_ticket_messages", filter: `ticket_id=eq.${activeId}` },
        p => setMessages(prev => prev.some(m => m.id === (p.new as any).id) ? prev : [...prev, p.new as Msg]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeId]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const active = tickets.find(t => t.id === activeId) ?? null;

  const reply = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !activeId || !user) return;
    setDraft("");
    const { error } = await supabase.from("support_ticket_messages").insert({
      ticket_id: activeId, sender_id: user.id, sender_role: "admin", content, is_internal: internal,
    });
    if (error) return toast({ title: "Reply failed", description: error.message, variant: "destructive" });
    if (!internal) {
      await supabase.functions.invoke("support-notify", { body: { ticketId: activeId, event: "admin_reply", message: content } });
    }
  };

  const setStatus = async (status: string) => {
    if (!activeId) return;
    const patch: Record<string, unknown> = { status };
    if (status === "resolved") patch.resolution_note = patch.resolution_note ?? "Resolved by the support team.";
    const { error } = await supabase.from("support_tickets").update(patch).eq("id", activeId);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    if (status === "resolved") await supabase.functions.invoke("support-notify", { body: { ticketId: activeId, event: "resolved" } });
    toast({ title: `Ticket ${status}` });
    load();
  };

  const setPriority = async (priority: string) => {
    if (!activeId) return;
    await supabase.from("support_tickets").update({ priority }).eq("id", activeId);
    load();
  };

  const assignToMe = async () => {
    if (!activeId || !user) return;
    await supabase.from("support_tickets").update({ assigned_to: user.id }).eq("id", activeId);
    toast({ title: "Assigned to you" });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2"><LifeBuoy className="h-6 w-6 text-primary" /> Support Tickets</h1>
        <p className="text-sm text-muted-foreground mt-1">Tickets from the AI assistant, human-chat requests and the support form.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`text-xs px-3 py-1.5 rounded-full capitalize transition-colors ${filter === s ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted"}`}>{s}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-280px)] min-h-[480px]">
        <div className="md:col-span-1 border border-border rounded-xl bg-card overflow-y-auto">
          {tickets.length === 0 && <p className="p-4 text-sm text-muted-foreground text-center">No tickets.</p>}
          {tickets.map(t => (
            <button key={t.id} onClick={() => setActiveId(t.id)} className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 transition-colors ${activeId === t.id ? "bg-muted" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate flex items-center gap-1.5">
                    {t.source === "ai_escalation" ? <Sparkles className="h-3 w-3 text-primary" /> : t.source === "human_request" ? <Headphones className="h-3 w-3 text-primary" /> : null}
                    #{t.ticket_number} · {t.subject}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{profiles[t.user_id]?.full_name || t.email || t.user_id.slice(0, 8)} · {formatDistanceToNow(new Date(t.last_activity_at), { addSuffix: true })}</p>
                </div>
                {t.unread_admin_count > 0 && <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-bold">{t.unread_admin_count}</span>}
              </div>
            </button>
          ))}
        </div>

        <div className="md:col-span-2 border border-border rounded-xl bg-card flex flex-col overflow-hidden">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Select a ticket</div>
          ) : (
            <>
              <div className="px-3 py-2 border-b border-border flex flex-wrap items-center gap-2 bg-muted/30 text-xs">
                <span className="capitalize font-medium">{active.status}</span>
                <select value={active.priority} onChange={e => setPriority(e.target.value)} className="bg-background border border-border rounded px-1.5 py-1">
                  {["low", "normal", "high", "urgent"].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <button onClick={assignToMe} className="hover:text-primary">Assign to me</button>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => setStatus("resolved")} className="flex items-center gap-1 hover:text-emerald-500"><CheckCircle2 className="h-3.5 w-3.5" /> Resolve</button>
                  <button onClick={() => setStatus("closed")} className="hover:text-destructive">Close</button>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="text-xs text-muted-foreground border border-border rounded-lg p-3 whitespace-pre-wrap">{active.body}</div>
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_role === "admin" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${m.is_internal ? "bg-amber-500/15 text-amber-600 border border-amber-500/30" : m.sender_role === "admin" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
                      {m.is_internal && <div className="text-[10px] font-semibold mb-1">Internal note</div>}
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={reply} className="p-3 border-t border-border flex items-center gap-2">
                <label className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                  <input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} /> Internal
                </label>
                <input value={draft} onChange={e => setDraft(e.target.value)} placeholder={internal ? "Internal note…" : "Reply to learner (emails them)…"} className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                <button type="submit" disabled={!draft.trim()} className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"><Send className="h-4 w-4" /></button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
