import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpen, CheckCircle2, FileText, HelpCircle, RefreshCw, Download, Wand2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

type EventType = "lesson_opened" | "lesson_completed" | "assignment_submitted" | "quiz_attempted";

interface ActivityRow {
  event_type: EventType;
  occurred_at: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  course_id: string;
  course_title: string;
  lesson_id: string | null;
  lesson_title: string | null;
  item_title: string | null;
  score: number | null;
  max_score: number | null;
  detail: string | null;
}

const META: Record<EventType, { label: string; icon: typeof BookOpen; className: string }> = {
  lesson_opened: { label: "Opened lesson", icon: BookOpen, className: "text-sky-500" },
  lesson_completed: { label: "Completed lesson", icon: CheckCircle2, className: "text-emerald-500" },
  assignment_submitted: { label: "Submitted assignment", icon: FileText, className: "text-primary" },
  quiz_attempted: { label: "Attempted quiz", icon: HelpCircle, className: "text-amber-500" },
};

const FILTERS: { value: "all" | EventType; label: string }[] = [
  { value: "all", label: "All activity" },
  { value: "lesson_opened", label: "Lesson opens" },
  { value: "lesson_completed", label: "Lesson completions" },
  { value: "assignment_submitted", label: "Assignments" },
  { value: "quiz_attempted", label: "Quizzes" },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

/**
 * Course Activity — a live feed of who opened a lesson, completed it, submitted
 * an assignment or attempted a quiz, with the learner's identity and context.
 */
export default function AdminCourseActivity() {
  const [courseId, setCourseId] = useState<string>("");
  const [type, setType] = useState<"all" | EventType>("all");
  const [search, setSearch] = useState("");

  const { data: courses = [] } = useQuery({
    queryKey: ["activity-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").order("title");
      if (error) throw error;
      return data as { id: string; title: string }[];
    },
  });

  const { data: rows = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["course-activity-feed", courseId],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_course_activity_feed", {
        p_course_id: courseId || null,
        p_limit: 500,
      });
      if (error) throw error;
      return (data ?? []) as ActivityRow[];
    },
  });

  // Bulk: everyone who submitted an assignment gets that lesson and every
  // lesson before it unlocked + marked complete.
  const markSubmitters = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc("mark_submitters_complete", {
        p_course_id: courseId,
      });
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) as {
        learners: number;
        lessons_completed: number;
      };
    },
    onSuccess: (res) => {
      toast({
        title: "Progress synced",
        description: `${res?.learners ?? 0} learners updated · ${res?.lessons_completed ?? 0} lessons marked complete.`,
      });
      refetch();
    },
    onError: (e: any) =>
      toast({ title: "Could not update progress", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (type !== "all" && r.event_type !== type) return false;
      if (!q) return true;
      return [r.full_name, r.email, r.lesson_title, r.item_title, r.course_title]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, type, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach((r) => { c[r.event_type] = (c[r.event_type] ?? 0) + 1; });
    return c;
  }, [rows]);

  const exportCsv = () => {
    const head = ["When", "Event", "Learner", "Email", "Course", "Lesson", "Item", "Score", "Detail"];
    const lines = filtered.map((r) => [
      new Date(r.occurred_at).toISOString(),
      META[r.event_type].label,
      r.full_name ?? "",
      r.email ?? "",
      r.course_title,
      r.lesson_title ?? "",
      r.item_title ?? "",
      r.score == null ? "" : `${r.score}${r.max_score ? `/${r.max_score}` : ""}`,
      r.detail ?? "",
    ]);
    const csv = [head, ...lines]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `course-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm lg:w-72"
          >
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search learner, email or lesson…"
            className="lg:flex-1"
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={!courseId || markSubmitters.isPending}>
                  {markSubmitters.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4 mr-1" />
                  )}
                  Mark submitters complete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Mark assignment submitters complete?</AlertDialogTitle>
                  <AlertDialogDescription>
                    For every learner who submitted an assignment in{" "}
                    <strong>{courses.find((c) => c.id === courseId)?.title}</strong>, that lesson and all
                    lessons before it will be unlocked and marked complete. This cannot be undone in bulk.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => markSubmitters.mutate()}>
                    Yes, mark complete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setType(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                type === f.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              {f.label}
              {f.value !== "all" && counts[f.value] ? ` (${counts[f.value]})` : ""}
            </button>
          ))}
        </div>
      </Card>

      <Card className="divide-y divide-border/60">
        {isLoading && <div className="p-6 text-center text-sm text-muted-foreground">Loading activity…</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">No activity recorded yet.</div>
        )}
        {filtered.map((r, i) => {
          const meta = META[r.event_type];
          const Icon = meta.icon;
          return (
            <div key={`${r.event_type}-${r.user_id}-${r.lesson_id}-${i}`} className="p-3 sm:p-4 flex gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={r.avatar_url ?? undefined} alt={r.full_name ?? "Learner"} />
                <AvatarFallback>{(r.full_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium truncate">{r.full_name || "Unknown user"}</span>
                  <span className={`inline-flex items-center gap-1 text-xs ${meta.className}`}>
                    <Icon className="h-3.5 w-3.5" /> {meta.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{timeAgo(r.occurred_at)}</span>
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {r.item_title || r.lesson_title}
                  {r.lesson_title && r.item_title && r.item_title !== r.lesson_title
                    ? ` · ${r.lesson_title}`
                    : ""}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {r.email && <span className="truncate">{r.email}</span>}
                  <Badge variant="outline" className="text-[10px]">{r.course_title}</Badge>
                  {r.score != null && (
                    <Badge variant="secondary" className="text-[10px]">
                      {r.score}{r.max_score ? `/${r.max_score}` : ""}
                    </Badge>
                  )}
                  {r.detail && <span>{r.detail}</span>}
                  <span>{new Date(r.occurred_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
