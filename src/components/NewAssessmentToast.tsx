import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText } from "lucide-react";

interface Popup {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  kind: "assignment" | "quiz";
}

/**
 * Realtime pop-up shown to any signed-in student the moment an instructor
 * publishes a new assignment or quiz that targets them. Reuses the existing
 * `notifications` fan-out (see notify_assignment_published /
 * notify_quiz_published triggers) so bell + pop-up stay in sync.
 */
export function NewAssessmentToast() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<Popup[]>([]);
  const current = queue[0];

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`assessment-popups-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as any;
          const link: string = n?.link ?? "";
          const isAssignment = /tab=assignments/.test(link) || /^New assignment/i.test(n?.title ?? "");
          const isQuiz = /tab=quizzes/.test(link) || /^New quiz/i.test(n?.title ?? "");
          if (!isAssignment && !isQuiz) return;
          setQueue((q) => [
            ...q,
            {
              id: n.id,
              title: n.title ?? (isQuiz ? "New quiz" : "New assignment"),
              message: n.message ?? null,
              link,
              kind: isQuiz ? "quiz" : "assignment",
            },
          ]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const dismiss = async () => {
    if (current) {
      try {
        await supabase.from("notifications").update({ is_read: true }).eq("id", current.id);
      } catch {}
    }
    setQueue((q) => q.slice(1));
  };

  const open = async () => {
    if (!current) return;
    if (current.link) navigate(current.link);
    await dismiss();
  };

  if (!current) return null;
  const Icon = current.kind === "quiz" ? BookOpen : FileText;

  return (
    <Dialog open onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{current.title}</DialogTitle>
          {current.message && (
            <DialogDescription className="text-center">
              {current.message}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="sm:justify-center gap-2">
          <Button variant="outline" onClick={dismiss}>Later</Button>
          <Button onClick={open}>
            Open {current.kind === "quiz" ? "quiz" : "assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}