import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCoachContext } from "@/lib/coach-context";
import { detectVisitorCurrency } from "@/lib/currency";
import { toast } from "@/hooks/use-toast";
import { requestSignup } from "@/components/SignupPromptModal";
import { GUEST_COACH_LIMIT, guestCoachAnswers, guestCoachIdentity, recordGuestCoachAnswer } from "@/lib/guest-coach";

export type SupportMsg = { role: "user" | "assistant"; content: string };

const ESCALATE_RE = /\[\[ESCALATE(?::[^\]]*)?\]\]/gi;
export const stripMarker = (s: string) => s.replace(ESCALATE_RE, "").trim();

/**
 * Streams answers from the `ai-support` edge function. The function opens a
 * support ticket + emails admins whenever it can't answer, so the hook only has
 * to strip the internal escalation marker before rendering.
 */
export function useSupportAssistant() {
  const [messages, setMessages] = useState<SupportMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);

  const call = useCallback(async (body: Record<string, unknown>, signal?: AbortSignal) => {
    const { data: { session } } = await supabase.auth.getSession();
    return fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-support`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      signal,
      body: JSON.stringify({ ...body, pageContext: {
        ...getCoachContext(window.location.pathname),
        title: document.querySelector("h1")?.textContent?.slice(0, 200) ?? "",
        currency: detectVisitorCurrency(),
      } }),
    });
  }, []);

  const send = useCallback(async (input: string, resetHistory = false) => {
    if (!input.trim() || sendingRef.current) return false;
    sendingRef.current = true;
    let session;
    try {
      ({ data: { session } } = await supabase.auth.getSession());
    } catch { sendingRef.current = false; return false; }
    if (!session && guestCoachAnswers() >= GUEST_COACH_LIMIT) {
      sendingRef.current = false;
      requestSignup("coach");
      return false;
    }
    const next: SupportMsg[] = [...(resetHistory ? [] : messages), { role: "user", content: input }];
    setMessages(next);
    setLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const currentRequest = abortRef.current;

    try {
      const resp = await call({ messages: next, ...(!session ? { guestId: guestCoachIdentity(), requestId: crypto.randomUUID() } : {}) }, abortRef.current.signal);
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Assistant unavailable" }));
        if (err.code === "GUEST_COACH_LIMIT") {
          setMessages(resetHistory ? [] : messages);
          requestSignup("coach");
          return false;
        }
        toast({ title: "Assistant error", description: err.error ?? "Please try again", variant: "destructive" });
        setLoading(false);
        return;
      }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let acc = "";
      const push = (chunk: string) => {
        if (currentRequest.signal.aborted) return;
        acc += chunk;
        const shown = stripMarker(acc);
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: shown } : m));
          return [...prev, { role: "assistant", content: shown }];
        });
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, i);
          buf = buf.slice(i + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") continue;
          try {
            const c = JSON.parse(j).choices?.[0]?.delta?.content;
            if (typeof c === "string") push(c);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
      if (!session && acc.trim()) recordGuestCoachAnswer();
      if (!currentRequest.signal.aborted && ESCALATE_RE.test(acc)) {
        ESCALATE_RE.lastIndex = 0;
        const { data: { session } } = await supabase.auth.getSession();
        if (currentRequest.signal.aborted) return;
        setEscalated(Boolean(session));
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: session
            ? "You can continue with our support team here, or use the WhatsApp button to contact the team directly."
            : "Use the WhatsApp button to contact our team directly — no website account is needed.",
        }]);
      }
      return true;
    } catch (e: any) {
      if (e.name !== "AbortError") toast({ title: "Assistant error", description: e.message, variant: "destructive" });
    } finally {
      sendingRef.current = false;
      if (abortRef.current === currentRequest) setLoading(false);
    }
  }, [messages, call]);

  /** Explicit "talk to a human" — creates a ticket and emails all admins. */
  const requestHuman = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await call({ messages, requestHuman: true });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        toast({ title: "Could not reach the team", description: json.error ?? "Please try again", variant: "destructive" });
        return null;
      }
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `A human is on the way. I've created ticket **#${json.ticketNumber ?? "—"}** and emailed the team — keep typing here and they'll reply in this chat.`,
      }]);
      setEscalated(true);
      return json as { ticketId: string | null; ticketNumber: number | null };
    } finally {
      setLoading(false);
    }
  }, [messages, call]);

  const reset = useCallback(() => { abortRef.current?.abort(); setMessages([]); setEscalated(false); setLoading(false); }, []);

  return { messages, loading, escalated, send, requestHuman, reset };
}
