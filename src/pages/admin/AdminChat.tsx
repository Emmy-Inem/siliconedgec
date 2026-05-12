import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Send, User, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  user_id: string;
  subject: string | null;
  status: string;
  last_message_at: string;
  unread_admin_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  created_at: string;
}

export default function AdminChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { full_name: string | null }>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from("chat_conversations")
      .select("*")
      .order("last_message_at", { ascending: false });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    const convs = (data || []) as Conversation[];
    setConversations(convs);
    const userIds = [...new Set(convs.map(c => c.user_id))];
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const map: Record<string, { full_name: string | null }> = {};
      profs?.forEach(p => { map[p.user_id] = { full_name: p.full_name }; });
      setProfiles(map);
    }
  };

  useEffect(() => { loadConversations(); }, []);

  // Realtime conversation list updates
  useEffect(() => {
    const channel = supabase
      .channel("admin-chat-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, () => loadConversations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Load messages for active conv
  useEffect(() => {
    if (!activeId) return;
    (async () => {
      const { data } = await supabase.from("chat_messages").select("*").eq("conversation_id", activeId).order("created_at", { ascending: true });
      setMessages((data || []) as Message[]);
      await supabase.from("chat_conversations").update({ unread_admin_count: 0 }).eq("id", activeId);
    })();
  }, [activeId]);

  // Realtime messages for active conv
  useEffect(() => {
    if (!activeId) return;
    const channel = supabase
      .channel(`admin-chat-${activeId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${activeId}` },
        (payload) => setMessages(prev => prev.some(m => m.id === (payload.new as any).id) ? prev : [...prev, payload.new as Message])
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeId]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!draft.trim() || !activeId || !user) return;
    const content = draft.trim();
    setDraft("");
    const { error } = await supabase.from("chat_messages").insert({
      conversation_id: activeId, sender_id: user.id, sender_role: "admin", content,
    });
    if (error) toast({ title: "Send failed", description: error.message, variant: "destructive" });
  };

  const closeConversation = async () => {
    if (!activeId) return;
    const { error } = await supabase
      .from("chat_conversations")
      .update({ status: "closed", unread_admin_count: 0 })
      .eq("id", activeId);
    if (error) return toast({ title: "Failed to close", description: error.message, variant: "destructive" });
    toast({ title: "Conversation closed" });
    setActiveId(null);
    loadConversations();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2"><MessageSquare className="h-6 w-6 text-primary" /> Live Chat Inbox</h1>
        <p className="text-sm text-muted-foreground mt-1">Respond to student support conversations in real time.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        <div className="md:col-span-1 border border-border rounded-xl bg-card overflow-y-auto">
          {conversations.length === 0 && <p className="p-4 text-sm text-muted-foreground text-center">No conversations yet.</p>}
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 transition-colors ${activeId === c.id ? "bg-muted" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate flex items-center gap-1.5"><User className="h-3 w-3" /> {profiles[c.user_id]?.full_name || c.user_id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}</p>
                </div>
                {c.unread_admin_count > 0 && (
                  <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-bold">{c.unread_admin_count}</span>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="md:col-span-2 border border-border rounded-xl bg-card flex flex-col overflow-hidden">
          {!activeId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Select a conversation</div>
          ) : (
            <>
              <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-muted/30">
                <span className="text-xs text-muted-foreground">
                  {conversations.find(c => c.id === activeId)?.status === "closed" ? "Closed" : "Open"}
                </span>
                {conversations.find(c => c.id === activeId)?.status !== "closed" && (
                  <button onClick={closeConversation} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Close conversation
                  </button>
                )}
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_role === "admin" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.sender_role === "admin" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={e => { e.preventDefault(); send(); }} className="p-3 border-t border-border flex gap-2">
                <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Type a reply…" className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                <button type="submit" disabled={!draft.trim()} className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"><Send className="h-4 w-4" /></button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
