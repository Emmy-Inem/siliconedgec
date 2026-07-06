import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudTable, Column } from "@/components/admin/AdminCrudTable";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Star } from "lucide-react";

interface AssignmentRow {
  id: string;
  title: string;
  lesson_id: string;
  max_points: number | null;
  due_at: string | null;
  is_ai_generated: boolean | null;
  is_visible: boolean | null;
  created_at: string;
  lessons?: { title: string; modules?: { courses?: { title: string } } } | null;
}

/**
 * Admin/Instructor view over every assignment across the platform.
 * Purpose: give staff a single place to flip the publish switch on AI-drafted
 * or hand-authored assignments before students see them. Creation still
 * happens inside the course curriculum builder, so students never encounter
 * an assignment unless it lives on a real lesson.
 */
export default function AdminAssignments() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-assignments"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("assignments")
        .select("*, lessons(title, modules(courses(title)))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AssignmentRow[];
    },
  });

  const toggleVisible = useMutation({
    mutationFn: async (a: AssignmentRow) => {
      const { error } = await (supabase as any)
        .from("assignments")
        .update({ is_visible: !a.is_visible })
        .eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: (_d, a) => {
      qc.invalidateQueries({ queryKey: ["admin-assignments"] });
      toast({ title: a.is_visible ? "Assignment hidden from students" : "Assignment published" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-assignments"] });
      toast({ title: "Assignment deleted" });
    },
  });

  const columns: Column<AssignmentRow>[] = [
    { key: "title", label: "Title" },
    {
      key: "lesson_id",
      label: "Course · Lesson",
      render: (a) => (
        <span className="text-xs text-muted-foreground">
          {(a.lessons as any)?.modules?.courses?.title
            ? `${(a.lessons as any).modules.courses.title} → `
            : ""}
          {(a.lessons as any)?.title ?? "—"}
        </span>
      ),
    },
    {
      key: "max_points",
      label: "Points",
      render: (a) => <Badge variant="secondary">{a.max_points ?? 100}</Badge>,
    },
    {
      key: "due_at",
      label: "Due",
      render: (a) => (
        <span className="text-xs">{a.due_at ? new Date(a.due_at).toLocaleDateString() : "—"}</span>
      ),
    },
    {
      key: "is_visible",
      label: "Status",
      render: (a) => (
        <div className="flex items-center gap-1.5">
          <Badge variant={a.is_visible ? "default" : "outline"} className="text-[10px]">
            {a.is_visible ? "Published" : "Hidden"}
          </Badge>
          {a.is_ai_generated && (
            <Badge variant="secondary" className="text-[10px]">
              <Star className="h-2.5 w-2.5 mr-0.5" /> AI
            </Badge>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminCrudTable
      title="Assignments"
      data={rows}
      columns={columns}
      isLoading={isLoading}
      addLabel="(Add via curriculum builder)"
      onAdd={() =>
        toast({
          title: "Add from curriculum",
          description:
            "Open a course → Curriculum → Assignment. That flow lets you attach it to the right lesson.",
        })
      }
      onEdit={() =>
        toast({
          title: "Edit from curriculum",
          description: "Open the lesson this assignment is attached to and edit it there.",
        })
      }
      onDelete={(id) => remove.mutate(id)}
      extraActions={(item) => (
        <button
          onClick={() => toggleVisible.mutate(item)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs font-medium"
          title={item.is_visible ? "Hide from students" : "Publish to students"}
        >
          {item.is_visible ? "Unpublish" : "Publish"}
        </button>
      )}
    />
  );
}