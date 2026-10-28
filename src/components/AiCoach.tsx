import { matchPath, useLocation } from "react-router-dom";
import { useCourse } from "@/hooks/useCourses";
import { CourseAiCoach } from "@/components/courses/CourseAiCoach";

/** One persistent companion; course context uses the same cache as course pages. */
export function AiCoach() {
  const { pathname } = useLocation();
  const match = matchPath("/courses/:id/*", pathname);
  const { data: course } = useCourse(match?.params.id);
  return <CourseAiCoach courseTitle={course?.title} courseSlug={course?.slug} />;
}