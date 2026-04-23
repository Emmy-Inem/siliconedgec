import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, GripVertical, Pencil, Trash2, PlayCircle, Loader2, Paperclip, FileQuestion, ClipboardList } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LessonResourcesManager } from "@/components/admin/LessonResourcesManager";

interface Module {
  id: string;
  title: string;
  order_index: number;
  course_id: string;
}

interface Lesson {
  id: string;
  title: string;
  duration: string | null;
  order_index: number;
  module_id: string;
  content_type: string | null;
  content_url: string | null;
}

interface Props {
  courseId: string;
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

  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ["admin-modules", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index");
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
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .in("module_id", moduleIds)
        .order("order_index");
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
        const nextIndex = modules.length;
        const { error } = await supabase.from("modules").insert({ title: moduleTitle, course_id: courseId, order_index: nextIndex });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-modules", courseId] });
      setModuleDialogOpen(false);
      setEditingModule(null);
      setModuleTitle("");
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
      setLessonDialogOpen(false);
      setEditingLesson(null);
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

  const openLessonDialog = (moduleId: string, contentType: string) => {
    setEditingLesson(null);
    setLessonForm({ title: "", duration: "", module_id: moduleId, content_type: contentType, content_url: "" });
    setLessonDialogOpen(true);
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold">Curriculum</h2>
          <p className="text-xs text-muted-foreground">Add modules, then lessons, quizzes, and assignments.</p>
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
        <Accordion type="multiple" defaultValue={modules.map((m) => m.id)} className="space-y-2">
          {modules.map((mod) => (
            <AccordionItem key={mod.id} value={mod.id} className="border border-border rounded-lg px-3 sm:px-4 bg-muted/30">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3 text-left flex-1 min-w-0">
                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-heading font-semibold truncate">{mod.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{lessonsByModule(mod.id).length} items</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pb-3">
                  {lessonsByModule(mod.id).length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No items yet in this module.</p>
                  ) : (
                    <ul className="space-y-1">
                      {lessonsByModule(mod.id).map((lesson) => (
                        <li key={lesson.id} className="flex items-center justify-between text-sm py-2 px-2 sm:px-3 rounded-lg bg-background border border-border/50 hover:border-border group">
                          <span className="flex items-center gap-2 min-w-0">
                            {lesson.content_type === "quiz" ? <FileQuestion className="h-4 w-4 text-primary shrink-0" /> :
                             lesson.content_type === "assignment" ? <ClipboardList className="h-4 w-4 text-accent shrink-0" /> :
                             <PlayCircle className="h-4 w-4 text-muted-foreground shrink-0" />}
                            <span className="truncate">{lesson.title}</span>
                            {lesson.duration && <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">({lesson.duration})</span>}
                          </span>
                          <span className="flex gap-0.5 shrink-0">
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Manage resources" onClick={() => setResourcesLesson(lesson)}>
                              <Paperclip className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                              setEditingLesson(lesson);
                              setLessonForm({ title: lesson.title, duration: lesson.duration ?? "", module_id: lesson.module_id, content_type: lesson.content_type ?? "video", content_url: lesson.content_url ?? "" });
                              setLessonDialogOpen(true);
                            }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete this item?")) deleteLesson.mutate(lesson.id); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60 mt-2">
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => openLessonDialog(mod.id, "video")}>
                      <Plus className="h-3 w-3 mr-1" /> Lesson
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => openLessonDialog(mod.id, "quiz")}>
                      <Plus className="h-3 w-3 mr-1" /> Quiz
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => openLessonDialog(mod.id, "assignment")}>
                      <Plus className="h-3 w-3 mr-1" /> Assignment
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
          ))}
        </Accordion>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLesson ? "Edit" : "Add"} {lessonForm.content_type === "quiz" ? "Quiz" : lessonForm.content_type === "assignment" ? "Assignment" : "Lesson"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveLesson.mutate(); }} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Title</label>
              <input value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} required className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Duration</label>
                <input value={lessonForm.duration} onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })} className={inputClass} placeholder="e.g. 45 min" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Content Type</label>
                <select value={lessonForm.content_type} onChange={(e) => setLessonForm({ ...lessonForm, content_type: e.target.value })} className={inputClass}>
                  <option value="video">Video</option>
                  <option value="text">Text</option>
                  <option value="quiz">Quiz</option>
                  <option value="assignment">Assignment</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Content URL (optional)</label>
              <input value={lessonForm.content_url} onChange={(e) => setLessonForm({ ...lessonForm, content_url: e.target.value })} className={inputClass} placeholder="https://..." />
            </div>
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