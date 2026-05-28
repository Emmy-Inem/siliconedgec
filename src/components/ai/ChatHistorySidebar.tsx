import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { History, MessageSquare, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Conv { id: string; title: string | null; scope: string; updated_at: string }

export function ChatHistorySidebar({ onSelect }: { onSelect?: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("ai_conversations").select("id, title, scope, updated_at").order("updated_at", { ascending: false }).limit(50);
    setItems((data ?? []) as Conv[]);
    setLoading(false);
  };
  useEffect(() => { if (open) load(); }, [open]);

  const del = async (id: string) => {
    await supabase.from("ai_messages").delete().eq("conversation_id", id);
    await supabase.from("ai_conversations").delete().eq("id", id);
    setItems((p) => p.filter((c) => c.id !== id));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Chat history"><History className="h-4 w-4" /></Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader><SheetTitle>Your AI conversations</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-1.5">
          {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {!loading && items.length === 0 && <p className="text-xs text-muted-foreground">No conversations yet. Start one from any lesson.</p>}
          {items.map((c) => (
            <div key={c.id} className="group flex items-center gap-2 rounded-lg border border-border/60 p-2 hover:bg-muted/50">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <button onClick={() => onSelect?.(c.id)} className="flex-1 text-left text-xs min-w-0">
                <p className="truncate font-medium">{c.title ?? c.scope}</p>
                <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}</p>
              </button>
              <button onClick={() => del(c.id)} className="opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}