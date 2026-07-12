
-- 1) Remove blanket "any instructor role" ALL policies and rely on scoped variants.

-- Assignments: keep 'instructors manage cohort assignments' (scoped via instructor_teaches_lesson).
DROP POLICY IF EXISTS "Instructors manage assignments" ON public.assignments;

-- Quiz questions: keep 'instructors manage cohort quiz questions' (scoped).
DROP POLICY IF EXISTS "Instructors manage quiz questions" ON public.quiz_questions;

-- Cohorts and children: drop blanket instructor grants; add scoped instructor policies
-- so instructors can only manage cohorts they teach.
DROP POLICY IF EXISTS "Instructors manage cohorts" ON public.cohorts;
CREATE POLICY "Instructors manage their cohorts"
  ON public.cohorts FOR ALL TO authenticated
  USING (public.is_cohort_instructor(id, auth.uid()))
  WITH CHECK (public.is_cohort_instructor(id, auth.uid()));

DROP POLICY IF EXISTS "Instructors manage cohort members" ON public.cohort_members;
CREATE POLICY "Instructors manage members of their cohorts"
  ON public.cohort_members FOR ALL TO authenticated
  USING (public.is_cohort_instructor(cohort_id, auth.uid()))
  WITH CHECK (public.is_cohort_instructor(cohort_id, auth.uid()));

DROP POLICY IF EXISTS "Instructors manage cohort sessions" ON public.cohort_sessions;
-- cohort_sessions_manage also grants ALL to any instructor — restrict to admin/mod only.
DROP POLICY IF EXISTS "cohort_sessions_manage" ON public.cohort_sessions;
CREATE POLICY "cohort_sessions_manage"
  ON public.cohort_sessions FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'moderator'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'moderator'::app_role]));
CREATE POLICY "Instructors manage sessions of their cohorts"
  ON public.cohort_sessions FOR ALL TO authenticated
  USING (public.is_cohort_instructor(cohort_id, auth.uid()))
  WITH CHECK (public.is_cohort_instructor(cohort_id, auth.uid()));

DROP POLICY IF EXISTS "Instructors manage cohort materials" ON public.cohort_materials;
DROP POLICY IF EXISTS "cohort_materials_manage" ON public.cohort_materials;
CREATE POLICY "cohort_materials_manage"
  ON public.cohort_materials FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'moderator'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'moderator'::app_role]));
CREATE POLICY "Instructors manage materials of their cohorts"
  ON public.cohort_materials FOR ALL TO authenticated
  USING (public.is_cohort_instructor(cohort_id, auth.uid()))
  WITH CHECK (public.is_cohort_instructor(cohort_id, auth.uid()));

-- Courses: drop blanket instructor grant; add scoped policy for course they teach.
DROP POLICY IF EXISTS "Instructors manage courses" ON public.courses;
CREATE POLICY "Instructors manage courses they teach"
  ON public.courses FOR ALL TO authenticated
  USING (public.instructor_teaches_course(id, auth.uid()))
  WITH CHECK (public.instructor_teaches_course(id, auth.uid()));

-- Modules: scoped via course-teaching relationship.
DROP POLICY IF EXISTS "Instructors manage modules" ON public.modules;
CREATE POLICY "Instructors manage modules of courses they teach"
  ON public.modules FOR ALL TO authenticated
  USING (public.instructor_teaches_course(course_id, auth.uid()))
  WITH CHECK (public.instructor_teaches_course(course_id, auth.uid()));

-- Lessons: scoped via instructor_teaches_lesson (already accounts for cohort/course).
DROP POLICY IF EXISTS "Instructors manage lessons" ON public.lessons;
CREATE POLICY "Instructors manage lessons they teach"
  ON public.lessons FOR ALL TO authenticated
  USING (public.instructor_teaches_lesson(id, auth.uid()))
  WITH CHECK (public.instructor_teaches_lesson(id, auth.uid()));

-- 2) role_permissions: restrict SELECT to admin/moderator only (was: any authed).
DROP POLICY IF EXISTS "Anyone authed reads role permissions" ON public.role_permissions;
CREATE POLICY "Admins and moderators read role permissions"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'moderator'::app_role]));

-- 3) Fix the one function missing an explicit search_path.
CREATE OR REPLACE FUNCTION public.enforce_manual_assignment_visibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin
  if TG_OP = 'INSERT' and new.is_ai_generated = false then
    new.is_visible := true;
  end if;
  return new;
end;
$function$;
