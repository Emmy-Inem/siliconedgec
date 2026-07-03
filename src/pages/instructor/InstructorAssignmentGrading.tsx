import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Loader2, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const db = supabase as any;

export default function InstructorAssignmentGrading() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["instructor-assignment", assignmentId],
    enabled: !!assignmentId,
    queryFn: async () => {
      const { data: assignment } = await db
        .from("assignments")
        .select("id, title, description, max_points, due_at, lesson_id")
        .eq("id", assignmentId!)
        .maybeSingle();
      const { data: subs } = await db
        .from("assignment_submissions")
        .select("*")
        .eq("assignment_id", assignmentId!)
        .order("submitted_at", { ascending: false });
      const userIds = Array.from(new Set((subs ?? []).map((s: any) => s.user_id))) as string[];
      let names: Record<string, any> = {};
      if (userIds.length) {
        const { data: profs } = await supabase.rpc("get_public_profiles", { p_user_ids: userIds });
        (profs ?? []).forEach((p: any) => (names[p.user_id] = p));
      }
      return {
        assignment,
        submissions: (subs ?? []).map((s: any) => ({ ...s, profile: names[s.user_id] })),
      };
    },
  });

  const current = data?.submissions.find((s: any) => s.id === selected) ?? data?.submissions[0];

  useEffect(() => {
    if (current) {
      setSelected(current.id);
      setGrade(current.grade != null ? String(current.grade) : "");
      setFeedback(current.feedback ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const save = async () => {
    if (!current) return;
    setSaving(true);
    const g = grade.trim() === "" ? null : Number(grade);
    if (g != null && (Number.isNaN(g) || g < 0 || g > (data?.assignment?.max_points ?? 100))) {
      toast.error(`Grade must be between 0 and ${data?.assignment?.max_points ?? 100}`);
      setSaving(false);
      return;
    }
    const { data: { user: me } } = await supabase.auth.getUser();
    const { error } = await db
      .from("assignment_submissions")
      .update({
        grade: g,
        feedback: feedback || null,
        graded_by: me?.id ?? null,
        graded_at: new Date().toISOString(),
      })
      .eq("id", current.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["instructor-assignment", assignmentId] });
    }
  };

  if (isLoading) {
    return <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4 max-w-6xl">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/instructor/assignments"><ChevronLeft className="h-4 w-4 mr-1" /> Back to assignments</Link>
      </Button>
      <div>
        <h1 className="font-heading text-2xl font-bold">{data?.assignment?.title ?? "Assignment"}</h1>
        <p className="text-sm text-muted-foreground">
          Max points: {data?.assignment?.max_points ?? 100}
          {data?.assignment?.due_at && ` · Due ${new Date(data.assignment.due_at).toLocaleString()}`}
        </p>
      </div>
      {(data?.submissions ?? []).length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No submissions yet.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-[280px_1fr]">
          <Card className="p-2 max-h-[70vh] overflow-y-auto">
            <ul className="divide-y divide-border">
              {data!.submissions.map((s: any) => {
                const active = s.id === current?.id;
                return (
                  <li key={s.id}>
                    <button
                      className={`w-full text-left p-3 rounded-md ${active ? "bg-primary/10" : "hover:bg-muted"}`}
                      onClick={() => setSelected(s.id)}
                    >
                      <div className="text-sm font-medium truncate">
                        {s.profile?.full_name ?? "Student"}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>{new Date(s.submitted_at).toLocaleDateString()}</span>
                        {s.grade != null ? (
                          <Badge className="h-4 text-[10px]">{s.grade}</Badge>
                        ) : (
                          <Badge variant="outline" className="h-4 text-[10px]">Ungraded</Badge>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
          {current && (
            <Card className="p-5 space-y-4">
              <div>
                <div className="text-xs text-muted-foreground uppercase">Submission</div>
                <div className="font-medium">{current.profile?.full_name ?? "Student"}</div>
                <div className="text-xs text-muted-foreground">
                  Submitted {new Date(current.submitted_at).toLocaleString()}
                </div>
              </div>
              {current.submission_text && (
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Response</div>
                  <div className="text-sm whitespace-pre-wrap bg-muted/40 rounded-md p-3">{current.submission_text}</div>
                </div>
              )}
              {current.submission_url && (
                <div>
                  <a
                    href={current.submission_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open attachment / link
                  </a>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Grade</label>
                  <Input
                    type="number"
                    min={0}
                    max={data?.assignment?.max_points ?? 100}
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Feedback</label>
                  <Textarea
                    rows={4}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="mt-1"
                    placeholder="What did they do well? What could improve?"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={save} disabled={saving}>
                  {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />} Save grade
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}