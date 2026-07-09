import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, GripVertical, Pencil, Trash2, PlayCircle, Loader2, Paperclip, FileQuestion, ClipboardList, Star, FileText, Video, Sparkles } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LessonResourcesManager } from "@/components/admin/LessonResourcesManager";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Module { id: string; title: string; order_index: number; course_id: string; }
interface Lesson { id: string; title: string; duration: string | null; order_index: number; module_id: string; content_type: string | null; content_url: string | null; }
interface Props { courseId: string; }

const inputClass = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

function SortableLesson({ lesson, onEdit, onDelete, onResources, onManageQuestions }: {
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

function SortableModule({ id, children }: { id: string; children: (handle: React.ReactNode) => React.ReactNode }) {
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

export function CurriculumBuilder({ courseId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleTitle, setModuleTitle] = useState("");

  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonForm, setLessonForm] = useState({ title: "", duration: "", module_id: "", content_type: "video", content_url: "" });
  // For assignment-type lessons: pick an existing lesson to attach to, or
  // "new" to create a fresh lesson slot in the module.
  const [assignmentTarget, setAssignmentTarget] = useState<string>("new");
  const [assignmentMaxPoints, setAssignmentMaxPoints] = useState<string>("100");
  const [assignmentDueAt, setAssignmentDueAt] = useState<string>("");
  const [linkedAssignmentId, setLinkedAssignmentId] = useState<string | null>(null);
  // Quiz-flow state (parity with assignments): attach to an existing lesson
  // or create a new lesson slot. quizzes.lesson_id has no unique constraint,
  // so multiple quizzes can share one lesson.
  const [quizTarget, setQuizTarget] = useState<string>("new");
  const [quizPassingScore, setQuizPassingScore] = useState<string>("70");
  // Inline manual questions authored during quiz creation. Mirrors the
  // AdminQuizzes flow so admins can build a full quiz without leaving the
  // course curriculum page.
  type ManualQ = { question_text: string; options: string[]; correct_answer: string };
  const emptyMQ = (): ManualQ => ({
    question_text: "",
    options: ["", "", "", ""],
    correct_answer: "",
  });
  const [quizManualQs, setQuizManualQs] = useState<ManualQ[]>([emptyMQ()]);
  // "Manage questions" dialog for existing quiz-type lessons.
  const [questionsLesson, setQuestionsLesson] = useState<Lesson | null>(null);
  const [resourcesLesson, setResourcesLesson] = useState<Lesson | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ["admin-modules", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("modules").select("*").eq("course_id", courseId).order("order_index");
      if (error) throw error;
      return data as Module[];
    },
    enabled: !!courseId,
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["admin-lessons", courseId],
    queryFn: async () => {
      if (modules.length === 0) return [];
      const moduleIds = modules.map((m) => m.id);
      const { data, error } = await supabase.from("lessons").select("*").in("module_id", moduleIds).order("order_index");
      if (error) throw error;
      return data as Lesson[];
    },
    enabled: modules.length > 0,
  });

  const lessonsByModule = (moduleId: string) => lessons.filter((l) => l.module_id === moduleId);

  const saveModule = useMutation({
    mutationFn: async () => {
      if (editingModule) {
        const { error } = await supabase.from("modules").update({ title: moduleTitle }).eq("id", editingModule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("modules").insert({ title: moduleTitle, course_id: courseId, order_index: modules.length });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-modules", courseId] });
      setModuleDialogOpen(false); setEditingModule(null); setModuleTitle("");
      toast({ title: editingModule ? "Module updated" : "Module created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteModule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("modules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-modules", courseId] });
      qc.invalidateQueries({ queryKey: ["admin-lessons", courseId] });
      toast({ title: "Module deleted" });
    },
  });

  const saveLesson = useMutation({
    mutationFn: async () => {
      // ── Quiz flow ───────────────────────────────────────────────────
      // Quizzes always live on a lesson. Mirror the assignment flow:
      //   1. Attach to an EXISTING lesson (quizTarget = lesson id)
      //      → insert ONLY into quizzes.
      //   2. Create a NEW lesson slot (quizTarget = "new")
      //      → create lesson row (content_type='quiz') AND quizzes row.
      // On save, quizzes rows created manually default to
      // is_ai_generated=false and is_visible=true so students see them
      // immediately without needing an extra publish step.
      if (lessonForm.content_type === "quiz" && !editingLesson) {
        const passing = Math.max(0, Math.min(100, parseInt(quizPassingScore || "70", 10) || 70));
        let targetLessonId: string;
        if (quizTarget === "new") {
          const moduleLessons = lessonsByModule(lessonForm.module_id);
          const { data: newLesson, error: lErr } = await supabase
            .from("lessons")
            .insert({
              title: lessonForm.title,
              duration: lessonForm.duration || null,
              content_type: "quiz",
              content_url: lessonForm.content_url || null,
              module_id: lessonForm.module_id,
              order_index: moduleLessons.length,
            })
            .select("id")
            .single();
          if (lErr) throw lErr;
          targetLessonId = newLesson!.id;
        } else {
          targetLessonId = quizTarget;
        }
        const { data: quizRow, error: qErr } = await (supabase as any).from("quizzes").insert({
          title: lessonForm.title,
          lesson_id: targetLessonId,
          passing_score: passing,
          is_ai_generated: false,
          is_visible: true,
        }).select("id").single();
        if (qErr) throw qErr;
        // Persist any inline-authored questions.
        const validQs = quizManualQs
          .map((q) => ({
            ...q,
            options: q.options.map((o) => o.trim()).filter(Boolean),
          }))
          .filter(
            (q) =>
              q.question_text.trim() &&
              q.options.length >= 2 &&
              q.correct_answer &&
              q.options.includes(q.correct_answer),
          );
        if (validQs.length > 0 && quizRow?.id) {
          const rows = validQs.map((q, i) => ({
            quiz_id: quizRow.id,
            question_text: q.question_text.trim(),
            options: q.options,
            correct_answer: q.correct_answer,
            order_index: i,
          }));
          const { error: qqErr } = await supabase.from("quiz_questions").insert(rows);
          if (qqErr) throw qqErr;
        }
        return;
      }

      // ── Assignment flow ──────────────────────────────────────────────
      // Assignments always need a row in `assignments` linked to a lesson.
      // Two modes:
      //   1. Attach to an EXISTING lesson (assignmentTarget = lesson id)
      //      → insert/update ONLY the assignments row.
      //   2. Create a NEW lesson slot (assignmentTarget = "new")
      //      → create lesson row (content_type='assignment') AND assignments row.
      if (lessonForm.content_type === "assignment") {
        const maxPts = Math.max(1, parseInt(assignmentMaxPoints || "100", 10) || 100);
        const dueIso = assignmentDueAt ? new Date(assignmentDueAt).toISOString() : null;
        const assignmentPayload = {
          title: lessonForm.title,
          instructions: lessonForm.content_url || "",
          max_points: maxPts,
          due_at: dueIso,
          is_ai_generated: false,
          is_visible: true,
        } as any;

        if (editingLesson) {
          // Keep lesson row in sync (title/instructions may have changed).
          const { error: lErr } = await supabase
            .from("lessons")
            .update({
              title: lessonForm.title,
              duration: lessonForm.duration || null,
              content_type: "assignment",
              content_url: lessonForm.content_url || null,
              module_id: lessonForm.module_id,
            })
            .eq("id", editingLesson.id);
          if (lErr) throw lErr;

          if (linkedAssignmentId) {
            const { error: aErr } = await (supabase as any)
              .from("assignments")
              .update(assignmentPayload)
              .eq("id", linkedAssignmentId);
            if (aErr) throw aErr;
          } else {
            const { error: aErr } = await (supabase as any)
              .from("assignments")
              .insert({ ...assignmentPayload, lesson_id: editingLesson.id });
            if (aErr) throw aErr;
          }
          return;
        }

        // Create mode
        let targetLessonId: string;
        if (assignmentTarget === "new") {
          const moduleLessons = lessonsByModule(lessonForm.module_id);
          const { data: newLesson, error: lErr } = await supabase
            .from("lessons")
            .insert({
              title: lessonForm.title,
              duration: lessonForm.duration || null,
              content_type: "assignment",
              content_url: lessonForm.content_url || null,
              module_id: lessonForm.module_id,
              order_index: moduleLessons.length,
            })
            .select("id")
            .single();
          if (lErr) throw lErr;
          targetLessonId = newLesson!.id;
        } else {
          targetLessonId = assignmentTarget;
        }
        const { error: aErr } = await (supabase as any)
          .from("assignments")
          .insert({ ...assignmentPayload, lesson_id: targetLessonId });
        if (aErr) throw aErr;
        return;
      }

      // ── Standard (video / text / quiz) flow ──────────────────────────
      const payload = {
        title: lessonForm.title,
        duration: lessonForm.duration || null,
        content_type: lessonForm.content_type,
        content_url: lessonForm.content_url || null,
        module_id: lessonForm.module_id,
      };
      if (editingLesson) {
        // If the module changed, place the lesson at the end of the new module.
        const movingModule = editingLesson.module_id !== lessonForm.module_id;
        const update: any = { ...payload };
        if (movingModule) {
          update.order_index = lessonsByModule(lessonForm.module_id).length;
        }
        const { error } = await supabase.from("lessons").update(update).eq("id", editingLesson.id);
        if (error) throw error;
      } else {
        const moduleLessons = lessonsByModule(lessonForm.module_id);
        const { error } = await supabase.from("lessons").insert({ ...payload, order_index: moduleLessons.length });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-lessons", courseId] });
      qc.invalidateQueries({ queryKey: ["admin-assignments"] });
      qc.invalidateQueries({ queryKey: ["admin-quizzes"] });
      setLessonDialogOpen(false); setEditingLesson(null);
      setLessonForm({ title: "", duration: "", module_id: "", content_type: "video", content_url: "" });
      setAssignmentTarget("new");
      setAssignmentMaxPoints("100");
      setAssignmentDueAt("");
      setLinkedAssignmentId(null);
      setQuizTarget("new");
      setQuizPassingScore("70");
      setQuizManualQs([emptyMQ()]);
      toast({ title: editingLesson ? "Lesson saved" : "Lesson added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteLesson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-lessons", courseId] });
      toast({ title: "Lesson deleted" });
    },
  });

  // Reorder lessons within a module
  const reorderLessons = async (moduleId: string, oldIndex: number, newIndex: number) => {
    const list = lessonsByModule(moduleId);
    const next = arrayMove(list, oldIndex, newIndex);
    // Optimistic UI
    qc.setQueryData<Lesson[]>(["admin-lessons", courseId], (old) => {
      if (!old) return old;
      const others = old.filter((l) => l.module_id !== moduleId);
      const updated = next.map((l, i) => ({ ...l, order_index: i }));
      return [...others, ...updated];
    });
    // Persist
    await Promise.all(
      next.map((l, i) =>
        l.order_index === i ? Promise.resolve() : supabase.from("lessons").update({ order_index: i }).eq("id", l.id)
      )
    );
    qc.invalidateQueries({ queryKey: ["admin-lessons", courseId] });
  };

  // Reorder modules
  const reorderModules = async (oldIndex: number, newIndex: number) => {
    const next = arrayMove(modules, oldIndex, newIndex);
    qc.setQueryData<Module[]>(["admin-modules", courseId], next.map((m, i) => ({ ...m, order_index: i })));
    await Promise.all(
      next.map((m, i) =>
        m.order_index === i ? Promise.resolve() : supabase.from("modules").update({ order_index: i }).eq("id", m.id)
      )
    );
    qc.invalidateQueries({ queryKey: ["admin-modules", courseId] });
  };

  const handleModuleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = modules.findIndex((m) => m.id === active.id);
    const newIndex = modules.findIndex((m) => m.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    reorderModules(oldIndex, newIndex);
  };

  const handleLessonDragEnd = (moduleId: string) => (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const list = lessonsByModule(moduleId);
    const oldIndex = list.findIndex((l) => l.id === active.id);
    const newIndex = list.findIndex((l) => l.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    reorderLessons(moduleId, oldIndex, newIndex);
  };

  const openLessonDialog = (moduleId: string, contentType: string) => {
    setEditingLesson(null);
    setLessonForm({ title: "", duration: "", module_id: moduleId, content_type: contentType, content_url: "" });
    setAssignmentTarget("new");
    setAssignmentMaxPoints("100");
    setAssignmentDueAt("");
    setLinkedAssignmentId(null);
    setQuizTarget("new");
    setQuizPassingScore("70");
    setQuizManualQs([emptyMQ()]);
    setLessonDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold">Curriculum</h2>
          <p className="text-xs text-muted-foreground">Drag <GripVertical className="inline h-3 w-3" /> to reorder modules and lessons.</p>
        </div>
        <Button size="sm" onClick={() => { setEditingModule(null); setModuleTitle(""); setModuleDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Module
        </Button>
      </div>

      {modulesLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : modules.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-border rounded-xl text-muted-foreground">
          <p className="text-sm">No modules yet. Click <span className="font-medium text-foreground">Add Module</span> to start building your curriculum.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
          <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            <Accordion type="multiple" defaultValue={modules.map((m) => m.id)} className="space-y-2">
              {modules.map((mod) => (
                <SortableModule key={mod.id} id={mod.id}>
                  {(handle) => (
                    <AccordionItem value={mod.id} className="border border-border rounded-lg px-3 sm:px-4 bg-muted/30">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-3 text-left flex-1 min-w-0">
                          {handle}
                          <span className="font-heading font-semibold truncate">{mod.title}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{lessonsByModule(mod.id).length} items</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pb-3">
                          {lessonsByModule(mod.id).length === 0 ? (
                            <p className="text-xs text-muted-foreground py-2">No items yet in this module.</p>
                          ) : (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLessonDragEnd(mod.id)}>
                              <SortableContext items={lessonsByModule(mod.id).map((l) => l.id)} strategy={verticalListSortingStrategy}>
                                <ul className="space-y-1">
                                  {lessonsByModule(mod.id).map((lesson) => (
                                    <SortableLesson
                                      key={lesson.id}
                                      lesson={lesson}
                                      onResources={(l) => setResourcesLesson(l)}
                                      onManageQuestions={(l) => setQuestionsLesson(l)}
                                      onEdit={(l) => {
                                        setEditingLesson(l);
                                        setLessonForm({
                                          title: l.title,
                                          duration: l.duration ?? "",
                                          module_id: l.module_id,
                                          content_type: l.content_type ?? "video",
                                          content_url: l.content_url ?? "",
                                        });
                                        // Preload the linked assignment (if any)
                                        // so edits update that row instead of
                                        // creating a duplicate.
                                        if ((l.content_type ?? "") === "assignment") {
                                          setAssignmentTarget(l.id);
                                          (supabase as any)
                                            .from("assignments")
                                            .select("id, max_points, due_at, instructions, title")
                                            .eq("lesson_id", l.id)
                                            .maybeSingle()
                                            .then((res: any) => {
                                              const a = res?.data;
                                              if (a) {
                                                setLinkedAssignmentId(a.id);
                                                setAssignmentMaxPoints(String(a.max_points ?? 100));
                                                setAssignmentDueAt(
                                                  a.due_at ? new Date(a.due_at).toISOString().slice(0, 16) : "",
                                                );
                                              } else {
                                                setLinkedAssignmentId(null);
                                                setAssignmentMaxPoints("100");
                                                setAssignmentDueAt("");
                                              }
                                            });
                                        }
                                        setLessonDialogOpen(true);
                                      }}
                                      onDelete={(id) => deleteLesson.mutate(id)}
                                    />
                                  ))}
                                </ul>
                              </SortableContext>
                            </DndContext>
                          )}

                          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60 mt-2">
                            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => openLessonDialog(mod.id, "video")}>
                              <Video className="h-3 w-3" /> Lesson
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => openLessonDialog(mod.id, "quiz")}>
                              <FileQuestion className="h-3 w-3" /> Quiz
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => openLessonDialog(mod.id, "assignment")}>
                              <ClipboardList className="h-3 w-3" /> Assignment
                            </Button>
                            <div className="ml-auto flex gap-1">
                              <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setEditingModule(mod); setModuleTitle(mod.title); setModuleDialogOpen(true); }}>
                                <Pencil className="h-3 w-3 mr-1" /> Edit
                              </Button>
                              <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => { if (confirm("Delete this module and all its lessons?")) deleteModule.mutate(mod.id); }}>
                                <Trash2 className="h-3 w-3 mr-1" /> Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </SortableModule>
              ))}
            </Accordion>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingModule ? "Edit Module" : "Add Module"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveModule.mutate(); }} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Module Title</label>
              <input value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} required className={inputClass} placeholder="e.g. Week 1 - Cloud Fundamentals" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setModuleDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveModule.isPending}>{saveModule.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingLesson ? "Edit" : "Add"} {lessonForm.content_type === "quiz" ? "Quiz" : lessonForm.content_type === "assignment" ? "Assignment" : "Lesson"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveLesson.mutate(); }} className="space-y-4">
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { v: "video", label: "Video", icon: Video },
                { v: "text", label: "Text", icon: FileText },
                { v: "quiz", label: "Quiz", icon: FileQuestion },
                { v: "assignment", label: "Task", icon: ClipboardList },
              ].map(({ v, label, icon: Icon }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setLessonForm({ ...lessonForm, content_type: v })}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs transition-colors ${
                    lessonForm.content_type === v
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40 text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Title</label>
              <input value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} required className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Module</label>
              <select
                value={lessonForm.module_id}
                onChange={(e) => setLessonForm({ ...lessonForm, module_id: e.target.value })}
                required
                className={inputClass}
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
              {editingLesson && editingLesson.module_id !== lessonForm.module_id && (
                <p className="text-[11px] text-primary mt-1">
                  Lesson will be moved to the end of the selected module.
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Duration</label>
                <input value={lessonForm.duration} onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })} className={inputClass} placeholder="e.g. 45 min" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Order</label>
                <input
                  value={editingLesson?.order_index !== undefined ? editingLesson.order_index + 1 : (lessonsByModule(lessonForm.module_id).length + 1)}
                  readOnly
                  className={`${inputClass} bg-muted/50 cursor-not-allowed`}
                />
              </div>
            </div>

            {lessonForm.content_type === "video" && (
              <div>
                <label className="text-sm font-medium block mb-1">Video URL</label>
                <input value={lessonForm.content_url} onChange={(e) => setLessonForm({ ...lessonForm, content_url: e.target.value })} className={inputClass} placeholder="YouTube, Vimeo, or hosted MP4" />
              </div>
            )}
            {lessonForm.content_type === "text" && (
              <div>
                <label className="text-sm font-medium block mb-1">Lesson Content</label>
                <textarea value={lessonForm.content_url} onChange={(e) => setLessonForm({ ...lessonForm, content_url: e.target.value })} rows={5} className={inputClass} placeholder="Paste markdown or rich text…" />
              </div>
            )}
            {lessonForm.content_type === "quiz" && (
              <div className="space-y-3">
                {!editingLesson && (
                  <div>
                    <label className="text-sm font-medium block mb-1">Attach to lesson</label>
                    <select
                      value={quizTarget}
                      onChange={(e) => setQuizTarget(e.target.value)}
                      className={inputClass}
                    >
                      <option value="new">➕ Create new lesson slot in this module</option>
                      {lessonsByModule(lessonForm.module_id).map((l) => (
                        <option key={l.id} value={l.id}>{l.title}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Quizzes must attach to a lesson. Multiple quizzes can share one lesson.
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium block mb-1">Passing score (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={quizPassingScore}
                    onChange={(e) => setQuizPassingScore(e.target.value)}
                    className={inputClass}
                  />
                </div>
                {!editingLesson && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold">Questions</p>
                      <span className="text-[11px] text-muted-foreground">
                        Tick the correct option for each question.
                      </span>
                    </div>
                    <div className="space-y-3 max-h-[38vh] overflow-y-auto pr-1">
                      {quizManualQs.map((q, qi) => (
                        <div key={qi} className="rounded-md border border-border bg-background p-2.5 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-[11px] font-semibold text-muted-foreground">
                              Q{qi + 1}
                            </div>
                            {quizManualQs.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setQuizManualQs((p) => p.filter((_, i) => i !== qi))
                                }
                                className="text-destructive text-[11px] hover:underline"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <input
                            value={q.question_text}
                            onChange={(e) =>
                              setQuizManualQs((p) =>
                                p.map((x, i) =>
                                  i === qi ? { ...x, question_text: e.target.value } : x,
                                ),
                              )
                            }
                            placeholder="Question text"
                            className={inputClass}
                          />
                          <div className="space-y-1.5">
                            {q.options.map((opt, oi) => (
                              <label key={oi} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`cb-correct-${qi}`}
                                  checked={!!opt && q.correct_answer === opt}
                                  onChange={() =>
                                    setQuizManualQs((p) =>
                                      p.map((x, i) =>
                                        i === qi ? { ...x, correct_answer: opt } : x,
                                      ),
                                    )
                                  }
                                  disabled={!opt}
                                  className="shrink-0"
                                />
                                <input
                                  value={opt}
                                  onChange={(e) =>
                                    setQuizManualQs((p) =>
                                      p.map((x, i) => {
                                        if (i !== qi) return x;
                                        const opts = [...x.options];
                                        opts[oi] = e.target.value;
                                        const stillValid =
                                          x.correct_answer && opts.includes(x.correct_answer);
                                        return {
                                          ...x,
                                          options: opts,
                                          correct_answer: stillValid ? x.correct_answer : "",
                                        };
                                      }),
                                    )
                                  }
                                  placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                  className={inputClass}
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setQuizManualQs((p) => [...p, emptyMQ()])}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add question
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      Empty questions are skipped. You can add more later from the lesson's{" "}
                      <span className="font-medium text-foreground">Questions</span> button.
                    </p>
                  </div>
                )}
                {editingLesson && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-[11px] text-muted-foreground">
                    To add or edit questions, close this dialog and click{" "}
                    <span className="font-medium text-foreground">Questions</span> on the quiz row.
                  </div>
                )}
              </div>
            )}
            {lessonForm.content_type === "assignment" && (
              <div className="space-y-3">
                {!editingLesson && (
                  <div>
                    <label className="text-sm font-medium block mb-1">Attach to lesson</label>
                    <select
                      value={assignmentTarget}
                      onChange={(e) => setAssignmentTarget(e.target.value)}
                      className={inputClass}
                    >
                      <option value="new">➕ Create new lesson slot in this module</option>
                      {lessonsByModule(lessonForm.module_id)
                        .filter((l) => (l.content_type ?? "video") !== "assignment")
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.title}
                          </option>
                        ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Assignments must attach to a lesson. Pick one from this module or create a new slot.
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium block mb-1">Instructions</label>
                  <textarea
                    value={lessonForm.content_url}
                    onChange={(e) => setLessonForm({ ...lessonForm, content_url: e.target.value })}
                    rows={4}
                    className={inputClass}
                    placeholder="Describe the task, deliverables, and grading criteria…"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium block mb-1">Max points</label>
                    <input
                      type="number"
                      min="1"
                      value={assignmentMaxPoints}
                      onChange={(e) => setAssignmentMaxPoints(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Due date (optional)</label>
                    <input
                      type="datetime-local"
                      value={assignmentDueAt}
                      onChange={(e) => setAssignmentDueAt(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setLessonDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveLesson.isPending}>{saveLesson.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {resourcesLesson && (
        <LessonResourcesManager
          open={!!resourcesLesson}
          onOpenChange={(o) => !o && setResourcesLesson(null)}
          lessonId={resourcesLesson.id}
          lessonTitle={resourcesLesson.title}
          courseId={courseId}
        />
      )}

      {questionsLesson && (
        <QuizQuestionsDialog
          lesson={questionsLesson}
          onClose={() => setQuestionsLesson(null)}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Inline quiz-question editor. Opened from the "Questions" icon on a
// quiz-type lesson row so admins can manage questions without leaving the
// course page.
function QuizQuestionsDialog({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: quizzes = [] } = useQuery({
    queryKey: ["cb-quiz-for-lesson", lesson.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("quizzes")
        .select("id, title, passing_score, is_visible, is_ai_generated")
        .eq("lesson_id", lesson.id)
        .order("created_at");
      if (error) throw error;
      return data as Array<{
        id: string;
        title: string;
        passing_score: number;
        is_visible: boolean | null;
        is_ai_generated: boolean | null;
      }>;
    },
  });

  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const currentQuizId = activeQuizId ?? quizzes[0]?.id ?? null;

  const { data: questions = [] } = useQuery({
    queryKey: ["cb-quiz-questions", currentQuizId],
    queryFn: async () => {
      if (!currentQuizId) return [];
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("id, question_text, options, correct_answer, order_index")
        .eq("quiz_id", currentQuizId)
        .order("order_index");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!currentQuizId,
  });

  const [qForm, setQForm] = useState({
    question_text: "",
    options: ["", "", "", ""],
    correct_answer: "",
  });

  const addQ = useMutation({
    mutationFn: async () => {
      if (!currentQuizId) throw new Error("No quiz selected");
      const opts = qForm.options.map((o) => o.trim()).filter(Boolean);
      if (!qForm.question_text.trim() || opts.length < 2 || !opts.includes(qForm.correct_answer)) {
        throw new Error("Enter the question, at least 2 options, and pick the correct one.");
      }
      const { error } = await supabase.from("quiz_questions").insert({
        quiz_id: currentQuizId,
        question_text: qForm.question_text.trim(),
        options: opts,
        correct_answer: qForm.correct_answer,
        order_index: questions.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cb-quiz-questions", currentQuizId] });
      setQForm({ question_text: "", options: ["", "", "", ""], correct_answer: "" });
      toast({ title: "Question added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeQ = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cb-quiz-questions", currentQuizId] });
      toast({ title: "Question removed" });
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Questions · {lesson.title}</DialogTitle>
        </DialogHeader>
        {quizzes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">
            No quiz exists on this lesson yet. Close this dialog, open the lesson, and use the Quiz
            form to create one — you can add questions there too.
          </p>
        ) : (
          <div className="space-y-4">
            {quizzes.length > 1 && (
              <select
                value={currentQuizId ?? ""}
                onChange={(e) => setActiveQuizId(e.target.value)}
                className={inputClass}
              >
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title} ({q.passing_score}%)
                  </option>
                ))}
              </select>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Existing questions</p>
              {questions.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No questions yet.</p>
              ) : (
                questions.map((q: any, i: number) => (
                  <div key={q.id} className="rounded-md border border-border bg-muted/30 p-2.5 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">
                        {i + 1}. {q.question_text}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeQ.mutate(q.id)}
                        className="text-destructive"
                        title="Delete question"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <ul className="mt-1.5 space-y-0.5 text-xs">
                      {(q.options as string[]).map((opt, j) => (
                        <li
                          key={j}
                          className={opt === q.correct_answer ? "text-green-600 font-medium" : ""}
                        >
                          {opt === q.correct_answer ? "✓ " : "• "}
                          {opt}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-lg border border-border bg-background p-3 space-y-2">
              <p className="text-xs font-semibold">Add a question</p>
              <input
                value={qForm.question_text}
                onChange={(e) => setQForm({ ...qForm, question_text: e.target.value })}
                placeholder="Question text"
                className={inputClass}
              />
              <div className="space-y-1.5">
                {qForm.options.map((opt, oi) => (
                  <label key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="cb-new-q-correct"
                      checked={!!opt && qForm.correct_answer === opt}
                      onChange={() => setQForm({ ...qForm, correct_answer: opt })}
                      disabled={!opt}
                      className="shrink-0"
                    />
                    <input
                      value={opt}
                      onChange={(e) => {
                        const opts = [...qForm.options];
                        opts[oi] = e.target.value;
                        const stillValid =
                          qForm.correct_answer && opts.includes(qForm.correct_answer);
                        setQForm({
                          ...qForm,
                          options: opts,
                          correct_answer: stillValid ? qForm.correct_answer : "",
                        });
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                      className={inputClass}
                    />
                  </label>
                ))}
              </div>
              <div className="flex justify-end">
                <Button size="sm" type="button" onClick={() => addQ.mutate()} disabled={addQ.isPending}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
