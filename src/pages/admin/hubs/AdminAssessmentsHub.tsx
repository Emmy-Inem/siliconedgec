import { HubShell } from "./HubShell";
import AdminQuizzes from "../AdminQuizzes";
import AdminQuizAttempts from "../AdminQuizAttempts";
import AdminAssignmentSubmissions from "../AdminAssignmentSubmissions";
import AdminAssignments from "../AdminAssignments";
import AdminInstructorAssist from "../AdminInstructorAssist";

export default function AdminAssessmentsHub() {
  return (
    <HubShell
      title="Assessments"
      description="Quizzes (manual or AI-generated) and student attempts"
      tabs={[
        { value: "quizzes", label: "Quizzes", content: <AdminQuizzes /> },
        { value: "attempts", label: "Quiz Attempts", content: <AdminQuizAttempts /> },
        { value: "assignments", label: "Assignments", content: <AdminAssignments /> },
        { value: "submissions", label: "Submissions", content: <AdminAssignmentSubmissions /> },
        { value: "assist", label: "Instructor Assist", content: <AdminInstructorAssist /> },
      ]}
    />
  );
}