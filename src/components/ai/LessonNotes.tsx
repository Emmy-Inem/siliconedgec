import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NotebookPen, Check, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export function LessonNotes({ lessonId }: { lessonId: string }) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || !lessonId) return;
    setLoading(true);
    supabase
      .from("lesson_notes")
      .select("content")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)
      .maybeSingle()
      .then(({ data }) => {
        setContent(data?.content ?? "");
        setLoading(false);
      });
  }, [user, lessonId]);

  const save = async (val: string) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("lesson_notes")
      .upsert({ user_id: user.id, lesson_id: lessonId, content: val }, { onConflict: "user_id,lesson_id" });
    setSaving(false);
    if (!error) setSavedAt(new Date());
  };

  const onChange = (v: string) => {
    setContent(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(v), 800);
  };

  if (!user) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card/60 backdrop-blur p-4 mt-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-4 w-4 text-primary" />
          <h3 className="font-heading text-sm font-semibold">My notes for this lesson</h3>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          {saving ? (<><Loader2 className="h-3 w-3 animate-spin" />Saving…</>) :
           savedAt ? (<><Check className="h-3 w-3 text-green-500" />Saved</>) : null}
        </div>
      </div>
      {loading ? (
        <div className="h-24 rounded-md bg-muted/40 animate-pulse" />
      ) : (
        <Textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type notes as you watch — auto-saved, only visible to you."
          rows={5}
          className="resize-y text-sm"
        />
      )}
      <div className="flex justify-end mt-2">
        <Button size="sm" variant="ghost" onClick={() => save(content)} disabled={saving}>Save now</Button>
      </div>
    </motion.div>
  );
}