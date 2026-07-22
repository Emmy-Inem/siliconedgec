import { HubShell } from "./HubShell";
import AdminLeadsHub from "../AdminLeadsHub";
import AdminStudents from "../AdminStudents";
import AdminEnrollments from "../AdminEnrollments";
import AdminRegistrations from "../AdminRegistrations";
import AdminBusinessLeads from "../AdminBusinessLeads";
import AdminQnA from "../AdminQnA";
import AdminAccessGrants from "../AdminAccessGrants";
import AdminAtRiskLearners from "../AdminAtRiskLearners";
import AdminCohortMetrics from "../AdminCohortMetrics";

export default function AdminPeopleHub() {
  return (
    <HubShell
      title="People & Leads"
      description="Students, enrollments and lead pipelines"
      tabs={[
        { value: "leads-hub", label: "Leads Hub", content: <AdminLeadsHub /> },
        { value: "students", label: "Students", content: <AdminStudents /> },
        { value: "at-risk", label: "At-Risk", content: <AdminAtRiskLearners /> },
        { value: "cohort-metrics", label: "Cohort Scorecard", content: <AdminCohortMetrics /> },
        { value: "enrollments", label: "Enrollments", content: <AdminEnrollments /> },
        { value: "access-grants", label: "Access Grants", content: <AdminAccessGrants /> },
        { value: "registrations", label: "Webinar Registrations", content: <AdminRegistrations /> },
        { value: "business-leads", label: "Business Leads", content: <AdminBusinessLeads /> },
        { value: "qna", label: "Q&A", content: <AdminQnA /> },
      ]}
    />
  );
}