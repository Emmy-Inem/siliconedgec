import { Link } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { courseHref } from "@/lib/course-url";
import { useCourseAccess } from "@/hooks/useCourseAccess";

interface Props {
  course: any;
  children: React.ReactNode;
}

/**
 * Wraps protected course content (lessons, quizzes, assignments).
 * Only admins and paid enrollees see the children. Everyone else
 * gets a paywall CTA pointing back to the course detail page.
 */
export function CourseAccessGate({ course, children }: Props) {
  const { loading, canAccess, isAuthed, cohortOnly } = useCourseAccess(course?.id);

  if (!course || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (canAccess) return <>{children}</>;

  return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center space-y-4 max-w-xl mx-auto">
      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
        <Lock className="h-5 w-5 text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="font-heading text-xl font-bold">
          {cohortOnly ? "Cohort access required" : "Enroll to unlock"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {cohortOnly
            ? "This bootcamp is only available to enrolled cohort members. Contact us if you believe you should have access."
            : "Lessons, quizzes and assignments are available to paid students only. Complete your enrollment to get full access to this course."}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild>
          <Link to={courseHref(course)}>{cohortOnly ? "Back to course" : "Enroll now"}</Link>
        </Button>
        {!isAuthed && (
          <Button asChild variant="outline">
            <Link to="/sign-in">Sign in</Link>
          </Button>
        )}
      </div>
    </div>
  );
}