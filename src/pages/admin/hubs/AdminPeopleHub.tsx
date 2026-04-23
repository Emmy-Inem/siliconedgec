import { HubShell } from "./HubShell";
import AdminLeadsHub from "../AdminLeadsHub";
import AdminStudents from "../AdminStudents";
import AdminEnrollments from "../AdminEnrollments";
import AdminRegistrations from "../AdminRegistrations";
import AdminBusinessLeads from "../AdminBusinessLeads";
import AdminQnA from "../AdminQnA";

export default function AdminPeopleHub() {
  return (
    <HubShell
      title="People & Leads"
      description="Students, enrollments and lead pipelines"
      tabs={[
        { value: "leads-hub", label: "Leads Hub", content: <AdminLeadsHub /> },
        { value: "students", label: "Students", content: <AdminStudents /> },
        { value: "enrollments", label: "Enrollments", content: <AdminEnrollments /> },
        { value: "registrations", label: "Webinar Registrations", content: <AdminRegistrations /> },
        { value: "business-leads", label: "Business Leads", content: <AdminBusinessLeads /> },
        { value: "qna", label: "Q&A", content: <AdminQnA /> },
      ]}
    />
  );
}