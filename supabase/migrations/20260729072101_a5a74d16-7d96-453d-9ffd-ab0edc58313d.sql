ALTER TABLE public.lesson_progress
  ADD COLUMN IF NOT EXISTS first_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS open_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_lesson_progress_last_opened ON public.lesson_progress (last_opened_at DESC);

CREATE OR REPLACE FUNCTION public.record_lesson_open(_lesson_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.lesson_progress (user_id, lesson_id, is_completed, is_unlocked, first_opened_at, last_opened_at, open_count)
  VALUES (auth.uid(), _lesson_id, false, true, now(), now(), 1)
  ON CONFLICT (user_id, lesson_id) DO UPDATE
    SET last_opened_at = now(),
        first_opened_at = COALESCE(public.lesson_progress.first_opened_at, now()),
        open_count = COALESCE(public.lesson_progress.open_count, 0) + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.record_lesson_open(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.record_lesson_open(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_course_activity_feed(
  p_course_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 200
)
RETURNS TABLE (
  event_type text,
  occurred_at timestamptz,
  user_id uuid,
  full_name text,
  email text,
  avatar_url text,
  course_id uuid,
  course_title text,
  lesson_id uuid,
  lesson_title text,
  item_title text,
  score integer,
  max_score integer,
  detail text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH allowed AS (
    SELECT c.id, c.title
    FROM public.courses c
    WHERE (p_course_id IS NULL OR c.id = p_course_id)
      AND (
        public.has_any_role(auth.uid(), ARRAY['admin','moderator']::app_role[])
        OR public.instructor_teaches_course(c.id, auth.uid())
      )
  ),
  ev AS (
    SELECT 'lesson_opened'::text AS event_type,
           lp.last_opened_at AS occurred_at,
           lp.user_id, a.id AS course_id, a.title AS course_title,
           l.id AS lesson_id, l.title AS lesson_title,
           l.title AS item_title, NULL::integer AS score, NULL::integer AS max_score,
           CASE WHEN COALESCE(lp.open_count,0) > 1
                THEN 'Opened ' || lp.open_count || ' times'
                ELSE 'First open' END AS detail
    FROM public.lesson_progress lp
    JOIN public.lessons l ON l.id = lp.lesson_id
    JOIN public.modules m ON m.id = l.module_id
    JOIN allowed a ON a.id = m.course_id
    WHERE lp.last_opened_at IS NOT NULL

    UNION ALL

    SELECT 'lesson_completed', lp.completed_at, lp.user_id, a.id, a.title,
           l.id, l.title, l.title, NULL, NULL, 'Marked complete'
    FROM public.lesson_progress lp
    JOIN public.lessons l ON l.id = lp.lesson_id
    JOIN public.modules m ON m.id = l.module_id
    JOIN allowed a ON a.id = m.course_id
    WHERE lp.is_completed AND lp.completed_at IS NOT NULL

    UNION ALL

    SELECT 'assignment_submitted', s.submitted_at, s.user_id, a.id, a.title,
           l.id, l.title, asg.title, s.grade, asg.max_points,
           CASE WHEN s.graded_at IS NOT NULL THEN 'Graded' ELSE 'Awaiting grading' END
    FROM public.assignment_submissions s
    JOIN public.assignments asg ON asg.id = s.assignment_id
    JOIN public.lessons l ON l.id = asg.lesson_id
    JOIN public.modules m ON m.id = l.module_id
    JOIN allowed a ON a.id = m.course_id

    UNION ALL

    SELECT 'quiz_attempted', qa.completed_at, qa.user_id, a.id, a.title,
           l.id, l.title, q.title, qa.score, 100,
           'Score ' || qa.score || '%'
    FROM public.quiz_attempts qa
    JOIN public.quizzes q ON q.id = qa.quiz_id
    JOIN public.lessons l ON l.id = q.lesson_id
    JOIN public.modules m ON m.id = l.module_id
    JOIN allowed a ON a.id = m.course_id
  )
  SELECT ev.event_type, ev.occurred_at, ev.user_id,
         COALESCE(p.full_name, 'Unknown user'), u.email::text, p.avatar_url,
         ev.course_id, ev.course_title, ev.lesson_id, ev.lesson_title,
         ev.item_title, ev.score, ev.max_score, ev.detail
  FROM ev
  LEFT JOIN public.profiles p ON p.user_id = ev.user_id
  LEFT JOIN auth.users u ON u.id = ev.user_id
  ORDER BY ev.occurred_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 200), 1), 1000);
$$;

REVOKE ALL ON FUNCTION public.get_course_activity_feed(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_course_activity_feed(uuid, integer) TO authenticated;