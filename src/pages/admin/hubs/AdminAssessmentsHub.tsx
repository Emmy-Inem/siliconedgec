import { HubShell } from "./HubShell";
import AdminQuizzes from "../AdminQuizzes";
import AdminQuizAttempts from "../AdminQuizAttempts";
import AdminAssignmentSubmissions from "../AdminAssignmentSubmissions";

export default function AdminAssessmentsHub() {
  return (
    <HubShell
      title="Assessments"
      description="Quizzes (manual or AI-generated) and student attempts"
      tabs={[
        { value: "quizzes", label: "Quizzes", content: <AdminQuizzes /> },
        { value: "attempts", label: "Quiz Attempts", content: <AdminQuizAttempts /> },
        { value: "assignments", label: "Assignments", content: <AdminAssignmentSubmissions /> },
      ]}
    />
  );
}