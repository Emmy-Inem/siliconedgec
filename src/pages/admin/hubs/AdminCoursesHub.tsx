import { HubShell } from "./HubShell";
import AdminCourses from "../AdminCourses";
import AdminCategories from "../AdminCategories";
import AdminTags from "../AdminTags";
import AdminBrands from "../AdminBrands";
import AdminLearningPaths from "../AdminLearningPaths";
import AdminReviews from "../AdminReviews";
import AdminCertificates from "../AdminCertificates";
import AdminInstructors from "../AdminInstructors";

export default function AdminCoursesHub() {
  return (
    <HubShell
      title="Courses"
      description="Manage courses, taxonomy, instructors and certifications"
      tabs={[
        { value: "courses", label: "Courses", content: <AdminCourses /> },
        { value: "categories", label: "Categories", content: <AdminCategories /> },
        { value: "tags", label: "Tags", content: <AdminTags /> },
        { value: "brands", label: "Brands", content: <AdminBrands /> },
        { value: "paths", label: "Learning Paths", content: <AdminLearningPaths /> },
        { value: "reviews", label: "Reviews", content: <AdminReviews /> },
        { value: "certificates", label: "Certificates", content: <AdminCertificates /> },
        { value: "instructors", label: "Instructors", content: <AdminInstructors /> },
      ]}
    />
  );
}