import { Link, useOutletContext, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import type { InstructorOutletContext } from "./InstructorLayout";

const db = supabase as any;

export default function InstructorStudentDetail() {
  const { userId } = useParams<{ userId: string }>();
  const { activeCohort } = useOutletContext<InstructorOutletContext>();

  const { data, isLoading } = useQuery({
    queryKey: ["instructor-student", userId, activeCohort?.course_id],
    enabled: !!userId,
    queryFn: async () => {
      const [{ data: profs }, { data: enroll }, { data: lp }, { data: submissions }, { data: attempts }] = await Promise.all([
        supabase.rpc("get_public_profiles", { p_user_ids: [userId] }),
        activeCohort?.course_id
          ? db.from("enrollments").select("*").eq("user_id", userId).eq("course_id", activeCohort.course_id).maybeSingle()
          : Promise.resolve({ data: null }),
        db.from("lesson_progress").select("lesson_id, is_completed, completed_at").eq("user_id", userId),
        db.from("assignment_submissions").select("id, assignment_id, submitted_at, grade, feedback").eq("user_id", userId),
        db.from("quiz_attempts").select("id, quiz_id, score, created_at").eq("user_id", userId),
      ]);
      return {
        profile: (profs ?? [])[0],
        enroll,
        progress: lp ?? [],
        submissions: submissions ?? [],
        attempts: attempts ?? [],
      };
    },
  });

  return (
    <div className="space-y-5 max-w-5xl">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/instructor/students"><ChevronLeft className="h-4 w-4 mr-1" /> Back to roster</Link>
      </Button>
      {isLoading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div>
            <h1 className="font-heading text-2xl font-bold">{data?.profile?.full_name ?? "Student"}</h1>
            {data?.enroll && (
              <p className="text-sm text-muted-foreground">
                Course progress: {Math.round(Number(data.enroll.progress_percentage) || 0)}% {data.enroll.is_completed && <Badge className="ml-2">Completed</Badge>}
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <h3 className="font-heading font-semibold text-sm mb-2">Assignment submissions</h3>
              {data?.submissions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No submissions yet.</p>
              ) : (
                <ul className="text-sm divide-y divide-border">
                  {data!.submissions.map((s: any) => (
                    <li key={s.id} className="py-2 flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">
                        {new Date(s.submitted_at).toLocaleDateString()}
                      </span>
                      {s.grade != null ? (
                        <Badge>{s.grade} pts</Badge>
                      ) : (
                        <Badge variant="outline">Ungraded</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="p-4">
              <h3 className="font-heading font-semibold text-sm mb-2">Quiz attempts</h3>
              {data?.attempts.length === 0 ? (
                <p className="text-xs text-muted-foreground">No attempts yet.</p>
              ) : (
                <ul className="text-sm divide-y divide-border">
                  {data!.attempts.map((a: any) => (
                    <li key={a.id} className="py-2 flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString()}
                      </span>
                      <Badge variant={a.score >= 70 ? "default" : "outline"}>{a.score}%</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="font-heading font-semibold text-sm mb-2">Lessons completed</h3>
            <p className="text-sm text-muted-foreground">
              {(data?.progress ?? []).filter((p: any) => p.is_completed).length} lessons finished
            </p>
          </Card>
        </>
      )}
    </div>
  );
}