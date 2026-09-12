import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { GripVertical, Pencil, Trash2, PlayCircle, Paperclip, FileQuestion, ClipboardList, FileText, Sparkles } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface Lesson {
  id: string;
  title: string;
  duration: string | null;
  order_index: number;
  module_id: string;
  content_type: string | null;
  content_url: string | null;
}

export function SortableLesson({
  lesson,
  onEdit,
  onDelete,
  onResources,
  onManageQuestions,
}: {
  lesson: Lesson;
  onEdit: (l: Lesson) => void;
  onDelete: (id: string) => void;
  onResources: (l: Lesson) => void;
  onManageQuestions: (l: Lesson) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const qc = useQueryClient();
  const { toast } = useToast();

  // Count of AI-generated exercises for this lesson and whether any are currently visible.
  const { data: aiState } = useQuery({
    queryKey: ["lesson-ai-exercises", lesson.id],
    queryFn: async () => {
      const [qz, asg] = await Promise.all([
        (supabase as any).from("quizzes").select("id, is_visible").eq("lesson_id", lesson.id).eq("is_ai_generated", true),
        (supabase as any).from("assignments").select("id, is_visible").eq("lesson_id", lesson.id).eq("is_ai_generated", true),
      ]);
      const rows = [...(qz.data ?? []), ...(asg.data ?? [])];
      return {
        total: rows.length,
        visible: rows.filter((r: any) => r.is_visible).length,
      };
    },
  });

  const toggleAi = useMutation({
    mutationFn: async (enable: boolean) => {
      await Promise.all([
        (supabase as any).from("quizzes").update({ is_visible: enable }).eq("lesson_id", lesson.id).eq("is_ai_generated", true),
        (supabase as any).from("assignments").update({ is_visible: enable }).eq("lesson_id", lesson.id).eq("is_ai_generated", true),
      ]);
    },
    onSuccess: (_d, enable) => {
      qc.invalidateQueries({ queryKey: ["lesson-ai-exercises", lesson.id] });
      qc.invalidateQueries({ queryKey: ["admin-assignments"] });
      qc.invalidateQueries({ queryKey: ["admin-quizzes"] });
      toast({ title: enable ? "AI exercise enabled" : "AI exercise hidden" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const hasAi = (aiState?.total ?? 0) > 0;
  const aiEnabled = hasAi && (aiState?.visible ?? 0) > 0;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between text-sm py-2 px-2 sm:px-3 rounded-lg bg-background border border-border/50 hover:border-border group"
    >
      <span className="flex items-center gap-2 min-w-0 flex-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground p-0.5"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        {lesson.content_type === "quiz" ? <FileQuestion className="h-4 w-4 text-primary shrink-0" /> :
         lesson.content_type === "assignment" ? <ClipboardList className="h-4 w-4 text-accent shrink-0" /> :
         lesson.content_type === "text" ? <FileText className="h-4 w-4 text-muted-foreground shrink-0" /> :
         <PlayCircle className="h-4 w-4 text-muted-foreground shrink-0" />}
        <span className="truncate">{lesson.title}</span>
        {lesson.duration && <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">({lesson.duration})</span>}
      </span>
      <span className="flex gap-0.5 shrink-0">
        {hasAi && (
          <button
            type="button"
            onClick={() => toggleAi.mutate(!aiEnabled)}
            title={aiEnabled ? "Hide AI exercise for this lesson" : "Enable AI-generated exercise for this lesson"}
            className={`h-7 px-2 rounded-md text-[10px] font-medium inline-flex items-center gap-1 border transition-colors ${
              aiEnabled
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-muted text-muted-foreground border-transparent hover:border-border"
            }`}
          >
            <Sparkles className="h-3 w-3" />
            AI {aiEnabled ? "on" : "off"}
          </button>
        )}
        <Button size="icon" variant="ghost" className="h-7 w-7" title="Manage resources" onClick={() => onResources(lesson)}>
          <Paperclip className="h-3 w-3" />
        </Button>
        {lesson.content_type === "quiz" && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title="Manage questions"
            onClick={() => onManageQuestions(lesson)}
          >
            <FileQuestion className="h-3 w-3" />
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(lesson)}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete this item?")) onDelete(lesson.id); }}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </span>
    </li>
  );
}

export function SortableModule({ id, children }: { id: string; children: (handle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  const handle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground p-0.5"
      title="Drag to reorder module"
      onClick={(e) => e.stopPropagation()}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
  return <div ref={setNodeRef} style={style}>{children(handle)}</div>;
}
