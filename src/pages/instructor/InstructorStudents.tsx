import { useOutletContext, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, User as UserIcon } from "lucide-react";
import { useMemo, useState } from "react";
import type { InstructorOutletContext } from "./InstructorLayout";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const db = supabase as any;

export default function InstructorStudents() {
  const { activeCohort } = useOutletContext<InstructorOutletContext>();
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["instructor-roster", activeCohort?.id, activeCohort?.course_id],
    enabled: !!activeCohort,
    queryFn: async () => {
      const { data: members } = await db
        .from("cohort_members")
        .select("user_id, role, joined_at")
        .eq("cohort_id", activeCohort!.id);
      const students = (members ?? []).filter((m: any) => m.role !== "instructor");
      const userIds = students.map((s: any) => s.user_id);
      if (!userIds.length) return { rows: [] };

      const [{ data: profs }, { data: enrolls }] = await Promise.all([
        supabase.rpc("get_public_profiles", { p_user_ids: userIds }),
        activeCohort!.course_id
          ? db.from("enrollments")
              .select("user_id, progress_percentage, is_completed, last_seen_at")
              .eq("course_id", activeCohort!.course_id)
              .in("user_id", userIds)
          : Promise.resolve({ data: [] }),
      ]);
      const profMap = new Map<string, any>();
      (profs ?? []).forEach((p: any) => profMap.set(p.user_id, p));
      const enrollMap = new Map<string, any>();
      (enrolls ?? []).forEach((e: any) => enrollMap.set(e.user_id, e));

      return {
        rows: students.map((s: any) => ({
          user_id: s.user_id,
          full_name: profMap.get(s.user_id)?.full_name ?? "Student",
          avatar_url: profMap.get(s.user_id)?.avatar_url,
          joined_at: s.joined_at,
          progress: enrollMap.get(s.user_id)?.progress_percentage ?? 0,
          completed: enrollMap.get(s.user_id)?.is_completed ?? false,
          last_seen: enrollMap.get(s.user_id)?.last_seen_at ?? null,
        })),
      };
    },
  });

  const filtered = useMemo(() => {
    const rows = data?.rows ?? [];
    if (!q.trim()) return rows;
    const t = q.toLowerCase();
    return rows.filter((r: any) => r.full_name.toLowerCase().includes(t));
  }, [data, q]);

  if (!activeCohort) return null;

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="font-heading text-2xl font-bold">Students</h1>
        <p className="text-sm text-muted-foreground">{activeCohort.name}{activeCohort.course_title ? ` · ${activeCohort.course_title}` : ""}</p>
      </div>
      <Card className="p-4">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" placeholder="Search students…" />
        </div>
        {isLoading ? (
          <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No students match.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="hidden sm:table-cell">Progress</TableHead>
                <TableHead className="hidden md:table-cell">Last active</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r: any) => (
                <TableRow key={r.user_id}>
                  <TableCell>
                    <Link to={`/instructor/students/${r.user_id}`} className="flex items-center gap-3 hover:text-primary">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {r.avatar_url ? (
                          <img src={r.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <UserIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{r.full_name}</div>
                        <div className="text-[11px] text-muted-foreground">Joined {new Date(r.joined_at).toLocaleDateString()}</div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${Math.min(100, Number(r.progress) || 0)}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{Math.round(Number(r.progress) || 0)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {r.last_seen ? new Date(r.last_seen).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.completed ? <Badge>Completed</Badge> : <Badge variant="outline">In progress</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}