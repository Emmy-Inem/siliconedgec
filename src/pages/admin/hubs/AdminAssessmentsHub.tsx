import { HubShell } from "./HubShell";
import AdminQuizzes from "../AdminQuizzes";
import AdminQuizAttempts from "../AdminQuizAttempts";

export default function AdminAssessmentsHub() {
  return (
    <HubShell
      title="Assessments"
      description="Quizzes (manual or AI-generated) and student attempts"
      tabs={[
        { value: "quizzes", label: "Quizzes", content: <AdminQuizzes /> },
        { value: "attempts", label: "Quiz Attempts", content: <AdminQuizAttempts /> },
      ]}
    />
  );
}