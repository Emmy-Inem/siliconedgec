import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Send, LifeBuoy } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";

interface Ticket {
  id: string; ticket_number: number; subject: string; body: string;
  status: string; priority: string; category: string; created_at: string; resolution_note: string | null;
}
interface Msg { id: string; sender_role: string; content: string; created_at: string; is_internal: boolean }

export default function SupportTicket() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!id) return;
    const { data: t } = await supabase.from("support_tickets").select("*").eq("id", id).maybeSingle();
    setTicket(t as Ticket | null);
    const { data: m } = await supabase.from("support_ticket_messages").select("*").eq("ticket_id", id).order("created_at", { ascending: true });
    setMessages((m ?? []) as Msg[]);
    if (t) await supabase.from("support_tickets").update({ unread_user_count: 0 }).eq("id", id);
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`ticket-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_ticket_messages", filter: `ticket_id=eq.${id}` },
        (p) => setMessages(prev => prev.some(m => m.id === (p.new as any).id) ? prev : [...prev, p.new as Msg]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const reply = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !id || !user) return;
    setDraft("");
    const { error } = await supabase.from("support_ticket_messages").insert({
      ticket_id: id, sender_id: user.id, sender_role: "user", content,
    });
    if (error) return toast({ title: "Reply failed", description: error.message, variant: "destructive" });
    await supabase.functions.invoke("support-notify", { body: { ticketId: id, event: "user_reply" } });
  };

  if (!ticket) {
    return <div className="container mx-auto px-4 py-24 text-center text-sm text-muted-foreground">Loading ticket…</div>;
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <SEO title={`Ticket #${ticket.ticket_number} | Support`} description="Support ticket conversation" />
      <Link to="/support" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4"><ArrowLeft className="h-4 w-4" /> All tickets</Link>

      <div className="border border-border rounded-xl bg-card overflow-hidden flex flex-col h-[70vh]">
        <div className="px-4 py-3 border-b border-border">
          <h1 className="font-heading font-semibold text-base flex items-center gap-2"><LifeBuoy className="h-4 w-4 text-primary" /> #{ticket.ticket_number} · {ticket.subject}</h1>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{ticket.status} · {ticket.priority} priority · opened {format(new Date(ticket.created_at), "d MMM yyyy")}</p>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.filter(m => !m.is_internal).map(m => (
            <div key={m.id} className={`flex ${m.sender_role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${m.sender_role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
                {m.content}
                <div className="text-[10px] opacity-60 mt-1">{format(new Date(m.created_at), "d MMM, HH:mm")}</div>
              </div>
            </div>
          ))}
          {ticket.resolution_note && (
            <div className="text-xs text-emerald-500 border border-emerald-500/30 rounded-lg p-3">Resolution: {ticket.resolution_note}</div>
          )}
        </div>

        <form onSubmit={reply} className="p-3 border-t border-border flex gap-2">
          <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Write a reply…" className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
          <button type="submit" disabled={!draft.trim()} className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"><Send className="h-4 w-4" /></button>
        </form>
      </div>
    </div>
  );
}
