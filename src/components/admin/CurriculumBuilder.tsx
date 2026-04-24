import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, GripVertical, Pencil, Trash2, PlayCircle, Loader2, Paperclip, FileQuestion, ClipboardList, Sparkles, FileText, Video } from "lucide-react";
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

function SortableLesson({ lesson, onEdit, onDelete, onResources }: {
  lesson: Lesson;
  onEdit: (l: Lesson) => void;
  onDelete: (id: string) => void;
  onResources: (l: Lesson) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
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
        <Button size="icon" variant="ghost" className="h-7 w-7" title="Manage resources" onClick={() => onResources(lesson)}>
          <Paperclip className="h-3 w-3" />
        </Button>
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
      const payload = {
        title: lessonForm.title,
        duration: lessonForm.duration || null,
        content_type: lessonForm.content_type,
        content_url: lessonForm.content_url || null,
        module_id: lessonForm.module_id,
      };
      if (editingLesson) {
        const { error } = await supabase.from("lessons").update(payload).eq("id", editingLesson.id);
        if (error) throw error;
      } else {
        const moduleLessons = lessonsByModule(lessonForm.module_id);
        const { error } = await supabase.from("lessons").insert({ ...payload, order_index: moduleLessons.length });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-lessons", courseId] });
      setLessonDialogOpen(false); setEditingLesson(null);
      setLessonForm({ title: "", duration: "", module_id: "", content_type: "video", content_url: "" });
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
                                      onEdit={(l) => {
                                        setEditingLesson(l);
                                        setLessonForm({
                                          title: l.title,
                                          duration: l.duration ?? "",
                                          module_id: l.module_id,
                                          content_type: l.content_type ?? "video",
                                          content_url: l.content_url ?? "",
                                        });
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
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <p className="font-medium">Tip: build the quiz questions next</p>
                </div>
                <p className="text-[11px] text-muted-foreground">After saving, open <span className="font-medium text-foreground">Assessments → Quizzes</span> to add questions manually or generate them with AI.</p>
              </div>
            )}
            {lessonForm.content_type === "assignment" && (
              <div>
                <label className="text-sm font-medium block mb-1">Instructions</label>
                <textarea value={lessonForm.content_url} onChange={(e) => setLessonForm({ ...lessonForm, content_url: e.target.value })} rows={4} className={inputClass} placeholder="Describe the task, deliverables, and grading criteria…" />
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
    </div>
  );
}
