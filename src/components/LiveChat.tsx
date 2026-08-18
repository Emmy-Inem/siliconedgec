import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, MinusCircle, Sparkles, Headphones, LifeBuoy, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "react-router-dom";
import { useSupportAssistant } from "@/hooks/useSupportAssistant";
import { MarkdownView } from "@/components/ai/MarkdownView";

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
  const [escalated, setEscalated] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const assistant = useSupportAssistant();

  // Hide chat widget on admin routes — it conflicts with the admin
  // sidebar trigger (mobile) and clutters the workspace.
  const onAdminRoute = location.pathname.startsWith("/admin");

  // Once the assistant hands over (it could not answer, or the user asked for a
  // person) the SAME thread continues with a human — we just open/attach the
  // live conversation behind the scenes.
  const ensureConversation = useCallback(async () => {
    if (!user) return null;
    setLoading(true);
    try {
      const { data: convs } = await supabase
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
          return null;
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
      await supabase.from("chat_conversations").update({ unread_user_count: 0 }).eq("id", conv.id);
      return conv.id as string;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Escalation is driven entirely by the assistant.
  useEffect(() => {
    if (!assistant.escalated || escalated) return;
    setEscalated(true);
    ensureConversation();
  }, [assistant.escalated, escalated, ensureConversation]);

  // Re-opening the widget after a handover keeps the same thread: if an open
  // conversation with the team already exists, resume it instead of the AI.
  useEffect(() => {
    if (!open || !user || escalated) return;
    (async () => {
      const { data } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1);
      if (data?.[0]) {
        setEscalated(true);
        await ensureConversation();
      }
    })();
  }, [open, user, escalated, ensureConversation]);

  // Realtime subscription for the human conversation
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

  // Auto-scroll the single thread
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, assistant.messages, assistant.loading]);

  // Keep the composer focused during normal use
  useEffect(() => {
    if (open && user) inputRef.current?.focus();
  }, [open, user, escalated, assistant.loading]);

  const send = async () => {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    if (!escalated) {
      await assistant.send(content);
      return;
    }
    const convId = conversationId ?? (await ensureConversation());
    if (!convId || !user) return;
    const { error } = await supabase.from("chat_messages").insert({
      conversation_id: convId, sender_id: user.id, sender_role: "user", content,
    });
    if (error) toast({ title: "Send failed", description: error.message, variant: "destructive" });
  };

  const talkToHuman = async () => { await assistant.requestHuman(); };

  if (onAdminRoute) return null;

  const busy = escalated ? loading : assistant.loading;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[540px] max-h-[calc(100vh-8rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-semibold text-sm flex items-center gap-1.5">
                  {escalated ? <><Headphones className="h-4 w-4" /> Silicon Edge Support</> : <><Sparkles className="h-4 w-4" /> Silicon Edge Support</>}
                </h3>
                <p className="text-[10px] opacity-80">
                  {escalated ? "Connected to our team — they reply here and by email" : "Instant answers, 24/7"}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="hover:bg-primary-foreground/10 rounded p-1" aria-label="Minimise chat">
                <MinusCircle className="h-4 w-4" />
              </button>
            </div>

            {!user ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <LifeBuoy className="h-10 w-10 text-primary/50" />
                <p className="text-sm font-medium">Sign in to chat with our assistant</p>
                <p className="text-xs text-muted-foreground">The AI assistant answers questions about courses, payments, cohorts and certificates — and can hand you over to a human any time.</p>
                <Link to="/sign-in" className="mt-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${escalated ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                    {escalated ? "Human agent joined" : "AI assistant"}
                  </span>
                  {!escalated ? (
                    <button
                      onClick={talkToHuman}
                      disabled={assistant.loading}
                      className="ml-auto text-[11px] text-primary hover:underline disabled:opacity-50"
                    >
                      Talk to a human
                    </button>
                  ) : (
                    <Link to="/support" className="ml-auto text-[11px] text-primary hover:underline" onClick={() => setOpen(false)}>
                      My tickets
                    </Link>
                  )}
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/50">
                    {assistant.messages.length === 0 && messages.length === 0 && !loading && (
                      <div className="text-center pt-6">
                        <Sparkles className="h-10 w-10 text-primary/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Hi {user.email?.split("@")[0]}! Ask me anything about courses, pricing, access, cohorts or certificates.</p>
                        <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                          {["What courses do you offer?", "Can I pay in installments?", "How do I get my certificate?"].map(q => (
                            <button key={q} onClick={() => assistant.send(q)} className="text-[11px] px-2 py-1 rounded-full border border-border hover:bg-muted">
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {assistant.messages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                          {m.role === "user" ? m.content : <MarkdownView className="text-sm">{m.content}</MarkdownView>}
                        </div>
                      </div>
                    ))}
                    {assistant.loading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                        </div>
                      </div>
                    )}
                    {messages.map(m => (
                      <div key={m.id} className={`flex ${m.sender_role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.sender_role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                          {m.sender_role !== "user" && <span className="block text-[10px] font-medium text-primary mb-0.5">Support team</span>}
                          {m.content}
                        </div>
                      </div>
                    ))}
                </div>

                <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-3 border-t border-border flex gap-2">
                  <input
                    ref={inputRef}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    placeholder={escalated ? "Message our team…" : "Ask anything…"}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button type="submit" disabled={!draft.trim() || busy} className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50">
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            )}
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
