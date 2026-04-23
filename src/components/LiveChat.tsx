import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, MinusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  created_at: string;
}

export function LiveChat() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Hide chat widget on admin routes — it conflicts with the admin
  // sidebar trigger (mobile) and clutters the workspace.
  const onAdminRoute = location.pathname.startsWith("/admin");

  // Load or create conversation when opening
  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      setLoading(true);
      let { data: convs } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1);
      let conv = convs?.[0];
      if (!conv) {
        const { data: newConv, error } = await supabase
          .from("chat_conversations")
          .insert({ user_id: user.id, subject: "Support" })
          .select()
          .single();
        if (error) {
          toast({ title: "Chat error", description: error.message, variant: "destructive" });
          setLoading(false);
          return;
        }
        conv = newConv;
      }
      setConversationId(conv.id);
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true });
      setMessages((msgs || []) as Message[]);
      // Mark admin messages as read
      await supabase.from("chat_conversations").update({ unread_user_count: 0 }).eq("id", conv.id);
      setLoading(false);
    })();
  }, [open, user]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages(prev => prev.some(m => m.id === (payload.new as any).id) ? prev : [...prev, payload.new as Message]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!draft.trim() || !conversationId || !user) return;
    const content = draft.trim();
    setDraft("");
    const { error } = await supabase.from("chat_messages").insert({
      conversation_id: conversationId, sender_id: user.id, sender_role: "user", content,
    });
    if (error) toast({ title: "Send failed", description: error.message, variant: "destructive" });
  };

  if (!user) return null;
  if (onAdminRoute) return null;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-semibold text-sm">Silicon Edge Support</h3>
                <p className="text-[10px] opacity-80">Typically replies within an hour</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setOpen(false)} className="hover:bg-primary-foreground/10 rounded p-1"><MinusCircle className="h-4 w-4" /></button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/50">
              {loading && <p className="text-xs text-muted-foreground text-center">Loading…</p>}
              {!loading && messages.length === 0 && (
                <div className="text-center pt-8">
                  <MessageCircle className="h-10 w-10 text-primary/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Hi {user.email?.split("@")[0]}! How can we help today?</p>
                </div>
              )}
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.sender_role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-3 border-t border-border flex gap-2">
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Type your message…"
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button type="submit" disabled={!draft.trim()} className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary hover:bg-primary/90 rounded-full flex items-center justify-center shadow-lg shadow-primary/30 transition-all hover:scale-110"
        aria-label="Open support chat"
      >
        {open ? <X className="h-6 w-6 text-primary-foreground" /> : <MessageCircle className="h-6 w-6 text-primary-foreground" />}
      </button>
    </>
  );
}
