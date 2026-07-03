import { useOutletContext } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import type { InstructorOutletContext } from "./InstructorLayout";

export default function InstructorQuizzes() {
  const { activeCohort } = useOutletContext<InstructorOutletContext>();
  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="font-heading text-2xl font-bold">Quizzes</h1>
      <Card className="p-5 space-y-3">
        <p className="text-sm text-muted-foreground">
          Quizzes are attached to lessons. Use the full quiz builder to add, edit and preview questions.
          {activeCohort?.course_title && ` Currently teaching: ${activeCohort.course_title}.`}
        </p>
        <Button asChild>
          <Link to="/admin/quizzes">
            <ExternalLink className="h-4 w-4 mr-2" /> Open quiz builder
          </Link>
        </Button>
      </Card>
    </div>
  );
}