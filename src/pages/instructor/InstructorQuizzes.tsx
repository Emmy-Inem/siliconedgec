import { useOutletContext } from "react-router-dom";
import { Card } from "@/components/ui/card";
import type { InstructorOutletContext } from "./InstructorLayout";
import AdminQuizzes from "@/pages/admin/AdminQuizzes";

export default function InstructorQuizzes() {
  const { activeCohort } = useOutletContext<InstructorOutletContext>();
  return (
    <div className="space-y-4 max-w-6xl">
      <h1 className="font-heading text-2xl font-bold">Quizzes</h1>
      {!activeCohort?.course_id ? (
        <Card className="p-6 text-sm text-muted-foreground">Select a cohort linked to a course to manage its quizzes.</Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Create, edit, publish, and attach quizzes for {activeCohort.course_title}.</p>
          <AdminQuizzes courseId={activeCohort.course_id} />
        </>
      )}
    </div>
  );
}