import { HubShell } from "./HubShell";
import AdminJobs from "../AdminJobs";
import AdminJobApplications from "../AdminJobApplications";

export default function AdminJobsHub() {
  return (
    <HubShell
      title="Jobs"
      description="Job listings and applications"
      tabs={[
        { value: "listings", label: "Job Listings", content: <AdminJobs /> },
        { value: "applications", label: "Applications", content: <AdminJobApplications /> },
      ]}
    />
  );
}