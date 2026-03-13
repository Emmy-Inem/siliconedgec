import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudTable, Column } from "@/components/admin/AdminCrudTable";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Image } from "lucide-react";
import { formatNaira } from "@/lib/format-currency";
import { logAdminActivity } from "@/lib/admin-logger";
import type { Tables } from "@/integrations/supabase/types";

type Course = Tables<"courses">;

const columns: Column<Course>[] = [
  {
    key: "thumbnail_url", label: "Image", render: (c) => (
      c.thumbnail_url ? (
        <img src={c.thumbnail_url} alt="" className="w-12 h-8 object-cover rounded" />
      ) : (
        <div className="w-12 h-8 rounded bg-muted flex items-center justify-center">
          <Image className="h-3 w-3 text-muted-foreground" />
        </div>
      )
    )
  },
  { key: "title", label: "Title" },
  { key: "category", label: "Category" },
  {
    key: "difficulty", label: "Level", render: (c) => (
      <span className={`text-xs px-2 py-0.5 rounded-full ${c.difficulty === "Beginner" ? "bg-green-100 text-green-700" :
        c.difficulty === "Intermediate" ? "bg-amber-100 text-amber-700" :
          "bg-red-100 text-red-700"
        }`}>{c.difficulty}</span>
    )
  },
  { key: "price", label: "Price", render: (c) => formatNaira(Number(c.price)) },
  {
    key: "is_published", label: "Status", render: (c) => (
      <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_published ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
        {c.is_published ? "Published" : "Draft"}
      </span>
    )
  },
];

export default function AdminCourses() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
      await logAdminActivity("delete", "course", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: "Course deleted" });
    },
  });

  return (
    <AdminCrudTable
      title="Courses"
      data={courses}
      columns={columns}
      isLoading={isLoading}
      addLabel="Add New Product"
      onAdd={() => navigate("/admin/courses/new")}
      onEdit={(c) => navigate(`/admin/courses/${c.id}/edit`)}
      onDelete={(id) => del.mutate(id)}
      extraActions={(c) => (
        <Link to={`/admin/courses/${c.id}/modules`}>
          <Button size="sm" variant="outline" className="text-xs">Modules</Button>
        </Link>
      )}
    />
  );
}
