import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type AiMsg = { role: "user" | "assistant"; content: string };

export function useAiTutor(opts: { scope?: string; scopeRefId?: string } = {}) {
  const [messages, setMessages] = useState<AiMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const conversationId = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (input: string) => {
    const userMsg: AiMsg = { role: "user", content: input };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          messages: next,
          scope: opts.scope,
          scopeRefId: opts.scopeRefId,
          conversationId: conversationId.current,
        }),
      });
      if (!resp.ok || !resp.body) {
        const errJson = await resp.json().catch(() => ({ error: "Failed" }));
        if (resp.status === 429) toast({ title: "Slow down", description: "Too many AI requests, try again in a moment.", variant: "destructive" });
        else if (resp.status === 402) toast({ title: "AI credits exhausted", description: "Please contact support to top up.", variant: "destructive" });
        else toast({ title: "AI error", description: errJson.error ?? "Try again", variant: "destructive" });
        setLoading(false);
        return;
      }
      const cid = resp.headers.get("X-Conversation-Id");
      if (cid) conversationId.current = cid;

      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let acc = "";
      const pushAssistant = (chunk: string) => {
        acc += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: acc } : m));
          return [...prev, { role: "assistant", content: acc }];
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
            const p = JSON.parse(j);
            const delta = p.choices?.[0]?.delta;
            const c = delta?.content;
            if (typeof c === "string") pushAssistant(c);
            else if (Array.isArray(c)) {
              for (const part of c) {
                if (typeof part === "string") pushAssistant(part);
                else if (part?.text) pushAssistant(part.text);
              }
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
      // Flush any final assistant content if we never streamed anything
      if (!acc) {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") return prev;
          return [...prev, { role: "assistant", content: "I couldn't generate a response. Please try again." }];
        });
      }
    } catch (e: any) {
      if (e.name !== "AbortError") toast({ title: "AI error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [messages, opts.scope, opts.scopeRefId]);

  const reset = useCallback(() => {
    setMessages([]);
    conversationId.current = null;
  }, []);

  return { messages, send, loading, reset, setMessages };
}