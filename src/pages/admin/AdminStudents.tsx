import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetch-all";
import { Search, Loader2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface StudentData {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  enrollments: { course_id: string; progress_percentage: number; is_completed: boolean; course_title: string }[];
}

export default function AdminStudents() {
  const [search, setSearch] = useState("");

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => {
      const [profiles, enrollments] = await Promise.all([
        fetchAllRows<any>("profiles", "user_id, full_name, avatar_url"),
        // courses(title) join via fetchAllRows works — PostgREST embed is just
        // a column expression in the select string.
        fetchAllRows<any>(
          "enrollments",
          "user_id, course_id, progress_percentage, is_completed, courses(title)",
        ),
      ]);

      const enrolledUserIds = new Set(enrollments.map((e) => e.user_id));

      return (profiles ?? [])
        .filter((p) => enrolledUserIds.has(p.user_id))
        .map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          enrollments: (enrollments || [])
            .filter((e) => e.user_id === p.user_id)
            .map((e) => ({
              course_id: e.course_id,
              progress_percentage: e.progress_percentage ?? 0,
              is_completed: e.is_completed ?? false,
              course_title: (e.courses as any)?.title || "Unknown",
            })),
        })) as StudentData[];
    },
  });

  const filtered = students.filter((s) =>
    (s.full_name || "").toLowerCase().includes(search.toLowerCase()) || s.user_id.includes(search)
  );

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Students</h1>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input type="text" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">No students found.</p>
      ) : (
        <div className="grid gap-4">
          {filtered.map((s) => {
            const completed = s.enrollments.filter((e) => e.is_completed).length;
            const avgProgress = s.enrollments.length > 0 ? Math.round(s.enrollments.reduce((sum, e) => sum + e.progress_percentage, 0) / s.enrollments.length) : 0;
            return (
              <div key={s.user_id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {(s.full_name || "U")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{s.full_name || "Unnamed User"}</p>
                    <p className="text-xs text-muted-foreground">{s.enrollments.length} course{s.enrollments.length !== 1 ? "s" : ""} · {completed} completed</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{avgProgress}%</p>
                    <p className="text-xs text-muted-foreground">avg progress</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {s.enrollments.map((e) => (
                    <div key={e.course_id} className="flex items-center gap-3 text-xs">
                      <span className="truncate flex-1">{e.course_title}</span>
                      <Progress value={e.progress_percentage} className="w-24 h-1.5" />
                      <Badge variant={e.is_completed ? "default" : "secondary"} className="text-[10px]">{e.is_completed ? "Done" : `${e.progress_percentage}%`}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
