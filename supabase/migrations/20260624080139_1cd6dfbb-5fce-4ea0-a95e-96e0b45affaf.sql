
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS seo_keywords text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS related_post_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS reading_time_minutes integer;

-- Align lesson/assignment access with course-level access: only true paid statuses.
CREATE OR REPLACE FUNCTION public.is_paid_enrolled_for_lesson(_lesson_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    JOIN public.enrollments e ON e.course_id = m.course_id
    WHERE l.id = _lesson_id
      AND e.user_id = auth.uid()
      AND COALESCE(e.payment_status,'pending') IN ('paid','success','completed','confirmed')
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_paid_enrolled_for_assignment(_assignment_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.assignments a
    JOIN public.lessons l ON l.id = a.lesson_id
    JOIN public.modules m ON m.id = l.module_id
    JOIN public.enrollments e ON e.course_id = m.course_id
    WHERE a.id = _assignment_id
      AND e.user_id = auth.uid()
      AND COALESCE(e.payment_status,'pending') IN ('paid','success','completed','confirmed')
  );
$function$;
