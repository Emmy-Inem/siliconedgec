import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Send, MinusCircle, Headphones, LifeBuoy, Loader2, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "react-router-dom";
import { useSupportAssistant } from "@/hooks/useSupportAssistant";
import { COACH_WHATSAPP_URL, getCoachContext } from "@/lib/coach-context";
import { MarkdownView } from "@/components/ai/MarkdownView";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  created_at: string;
}

export function LiveChat({ embedded = false, onOpenChange, whatsappUrl }: { embedded?: boolean; onOpenChange?: (open: boolean) => void; whatsappUrl?: string | null }) {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [aiCoachActive, setAiCoachActive] = useState(() =>
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-ai-coach-active") === "true"
  );
  const [escalated, setEscalated] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const assistant = useSupportAssistant();
  const coach = getCoachContext(location.pathname);

  useEffect(() => {
    assistant.reset();
    setDraft("");
  }, [location.pathname]);

  // Hide chat widget on admin routes — it conflicts with the admin
  // sidebar trigger (mobile) and clutters the workspace.
  const onAdminRoute = location.pathname.startsWith("/admin");

  // Track whether the AI Coach is currently active on the page so the floating
  // right-hand support launcher button disappears whenever the AI Coach appears.
  useEffect(() => {
    setAiCoachActive(document.documentElement.getAttribute("data-ai-coach-active") === "true");
    const onPresence = (e: Event) => {
      const customEvent = e as CustomEvent<{ active?: boolean }>;
      setAiCoachActive(Boolean(customEvent?.detail?.active));
    };
    window.addEventListener("sec:ai-coach-presence", onPresence);
    return () => window.removeEventListener("sec:ai-coach-presence", onPresence);
  }, [location.pathname]);

  // Other widgets (e.g. the course-page AI Coach avatar or SupportTicket page) can ask the chat to open.
  useEffect(() => {
    const handler = (e?: Event) => {
      const customEvent = e as CustomEvent<{ resetToAi?: boolean; initialQuestion?: string }>;
      if (customEvent?.detail?.resetToAi) {
        setEscalated(false);
        setConversationId(null);
        setMessages([]);
        assistant.reset();
      }
      setOpen(true);
      onOpenChange?.(true);
      if (customEvent?.detail?.initialQuestion) {
        const q = customEvent.detail.initialQuestion;
        void assistant.send(q, Boolean(customEvent.detail.resetToAi)).then(sent => { if (sent === false) setDraft(q); });
      }
    };
    const close = () => { setOpen(false); onOpenChange?.(false); };
    window.addEventListener("sec:open-live-chat", handler);
    window.addEventListener("sec:close-live-chat", close);
    return () => {
      window.removeEventListener("sec:open-live-chat", handler);
      window.removeEventListener("sec:close-live-chat", close);
    };
  }, [assistant, user, onOpenChange]);

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

  // Escalation is driven by the assistant.
  useEffect(() => {
    if (!assistant.escalated || escalated) return;
    setEscalated(true);
    ensureConversation();
  }, [assistant.escalated, escalated, ensureConversation]);

  // Re-opening the widget: check whether an open conversation currently exists.
  // If the previous conversation was closed, reset back to the AI assistant!
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("chat_conversations")
        .select("id, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (cancelled) return;
      const latest = data?.[0];
      if (latest && latest.status === "open") {
        setEscalated(true);
        setConversationId(latest.id);
        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("conversation_id", latest.id)
          .order("created_at", { ascending: true });
        if (!cancelled) {
          setMessages((msgs || []) as Message[]);
        }
      } else {
        // No open ticket / conversation is closed -> Return directly to AI Assistant mode!
        setEscalated(false);
        setConversationId(null);
        setMessages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  // Realtime subscription for conversation status changes (e.g. ticket marked resolved by admin or user)
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`chat-conv-status-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_conversations",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const rec = payload.new as any;
          if (rec && (rec.status === "closed" || rec.status === "resolved")) {
            setEscalated(false);
            setConversationId(null);
            setMessages([]);
            assistant.reset();
            toast({
              title: "Ticket resolved",
              description: "Support conversation closed. The AI Assistant is ready to help you with anything!",
            });
          } else if (rec && rec.status === "open") {
            setConversationId(rec.id);
            setEscalated(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, assistant, toast]);

  const returnToAi = async () => {
    if (conversationId) {
      await supabase.from("chat_conversations").update({ status: "closed" }).eq("id", conversationId);
    }
    setEscalated(false);
    setConversationId(null);
    setMessages([]);
    assistant.reset();
    toast({
      title: "AI Assistant Active",
      description: "Ask any question about courses, admissions, curriculum, or certificates.",
    });
  };

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
      const sent = await assistant.send(content);
      if (sent === false) setDraft(content);
      return;
    }
    const convId = conversationId ?? (await ensureConversation());
    if (!convId || !user) return;
    const { error } = await supabase.from("chat_messages").insert({
      conversation_id: convId, sender_id: user.id, sender_role: "user", content,
    });
    if (error) toast({ title: "Send failed", description: error.message, variant: "destructive" });
  };

  const talkToHuman = async () => {
    if (!user) { window.open(COACH_WHATSAPP_URL, "_blank", "noopener,noreferrer"); return; }
    await assistant.requestHuman();
  };

  if (onAdminRoute && !embedded) return null;

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
            className={`${embedded ? "absolute bottom-20 right-0 w-[380px] max-w-[calc(100vw-1.5rem)]" : "fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)]"} h-[540px] max-h-[calc(100dvh-7rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden`}
          >
            <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-semibold text-sm flex items-center gap-1.5">
                  <><Headphones className="h-4 w-4" /> Silicon Edge AI Coach</>
                </h3>
                <p className="text-[10px] opacity-80">
                  {escalated ? "Connected to our team — they reply here and by email" : coach.label}
                </p>
              </div>
              <Button variant="ghost" onClick={() => { setOpen(false); onOpenChange?.(false); }} className="hover:bg-primary-foreground/10 rounded p-1" aria-label="Minimise chat">
                <MinusCircle className="h-4 w-4" />
              </Button>
            </div>

            {(              <>
                <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${escalated ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"}`}>
                    {escalated ? "● Human agent joined" : "● AI assistant"}
                  </span>
                  {!escalated ? (
                    <Button variant="ghost"
                      onClick={talkToHuman}
                      disabled={assistant.loading}
                      className="ml-auto text-[11px] text-primary hover:underline font-medium disabled:opacity-50"
                    >
                      Talk to a human
                    </Button>
                  ) : (
                    <div className="ml-auto flex items-center gap-2">
                      <Button variant="ghost"
                        type="button"
                        onClick={returnToAi}
                        className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                        title="Return to instant AI assistant"
                      >
                        <Bot className="h-3.5 w-3.5" /> Ask AI Assistant
                      </Button>
                      <span className="text-muted-foreground/60 text-xs">•</span>
                      <Link to="/support" className="text-[11px] text-muted-foreground hover:underline" onClick={() => { setOpen(false); onOpenChange?.(false); }}>
                        My tickets
                      </Link>
                    </div>
                  )}
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/50">
                    {escalated && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-foreground/90 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <Headphones className="h-3.5 w-3.5" /> Support Agent Connected
                          </p>
                          <Button variant="ghost"
                            type="button"
                            onClick={returnToAi}
                            className="text-[11px] font-semibold text-primary hover:underline"
                          >
                            Return to AI
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Your request is with our human support team. If your question is resolved or you want instant answers to new questions, switch back to the AI anytime.
                        </p>
                      </div>
                    )}
                    {assistant.messages.length === 0 && messages.length === 0 && !loading && (
                      <div className="text-center pt-6">
                        <LifeBuoy className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">{coach.greeting}</p>
                        {!user && <p className="mt-2 text-xs text-muted-foreground">Ask two questions free. Create an account or sign in to keep chatting.</p>}
                        <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                          {coach.suggestions.map(q => (
                            <Button variant="ghost" key={q} onClick={() => assistant.send(q)} className="text-[11px] px-2 py-1 rounded-full border border-border hover:bg-muted">
                              {q}
                            </Button>
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

                <a href={COACH_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="mx-3 my-2 flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-semibold !text-white hover:bg-[#1da851]">
                  <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
                </a>
                <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-3 border-t border-border flex gap-2">
                  <input
                    ref={inputRef}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    placeholder={escalated ? "Message our team…" : "Ask anything…"}
                    className="min-w-0 flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <Button variant="ghost" type="submit" disabled={!draft.trim() || busy} className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!embedded && !aiCoachActive && (
        <Button variant="ghost"
          onClick={() => setOpen(o => !o)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary hover:bg-primary/90 rounded-full flex items-center justify-center shadow-lg shadow-primary/30 transition-all hover:scale-110"
          aria-label="Open AI Coach"
        >
          {open ? <X className="h-6 w-6 text-primary-foreground" /> : <MessageCircle className="h-6 w-6 text-primary-foreground" />}
        </Button>
      )}
    </>
  );
}
