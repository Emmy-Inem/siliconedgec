import { useOutletContext, Navigate } from "react-router-dom";
import type { InstructorOutletContext } from "./InstructorLayout";
import { Card } from "@/components/ui/card";

/**
 * Redirects the instructor to the existing CohortSpace page, which already
 * has the chat-style discussion, sessions tab, materials, and instructor pin
 * controls. Keeping one implementation avoids drift.
 */
export default function InstructorCohort() {
  const { activeCohort } = useOutletContext<InstructorOutletContext>();
  if (!activeCohort) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Select a cohort in the header to open its space.
      </Card>
    );
  }
  return <Navigate to={`/cohorts/${activeCohort.id}`} replace />;
}