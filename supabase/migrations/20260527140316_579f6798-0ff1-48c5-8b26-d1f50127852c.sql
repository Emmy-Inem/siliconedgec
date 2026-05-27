
-- Lesson notes (per-user)
CREATE TABLE public.lesson_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_notes TO authenticated;
GRANT ALL ON public.lesson_notes TO service_role;
ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notes" ON public.lesson_notes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER lesson_notes_updated_at BEFORE UPDATE ON public.lesson_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lesson transcripts (admin-managed) — used to ground AI tutor
CREATE TABLE public.lesson_transcripts (
  lesson_id uuid PRIMARY KEY,
  transcript text NOT NULL DEFAULT '',
  language text DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lesson_transcripts TO authenticated;
GRANT ALL ON public.lesson_transcripts TO service_role;
ALTER TABLE public.lesson_transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enrolled or admin reads transcript"
  ON public.lesson_transcripts FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.modules m ON m.id = l.module_id
      JOIN public.enrollments e ON e.course_id = m.course_id
      WHERE l.id = lesson_transcripts.lesson_id AND e.user_id = auth.uid()
    )
  );
CREATE POLICY "admin writes transcript"
  ON public.lesson_transcripts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER lesson_transcripts_updated_at BEFORE UPDATE ON public.lesson_transcripts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Resume where you left off
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS last_lesson_id uuid;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Auto-update last_lesson_id on lesson_progress upsert
CREATE OR REPLACE FUNCTION public.touch_enrollment_last_lesson()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_course uuid;
BEGIN
  SELECT m.course_id INTO v_course
  FROM public.lessons l JOIN public.modules m ON m.id = l.module_id
  WHERE l.id = NEW.lesson_id;
  IF v_course IS NOT NULL THEN
    UPDATE public.enrollments
       SET last_lesson_id = NEW.lesson_id, last_seen_at = now()
     WHERE user_id = NEW.user_id AND course_id = v_course;
  END IF;
  RETURN NEW;
END$$;
DROP TRIGGER IF EXISTS trg_touch_last_lesson ON public.lesson_progress;
CREATE TRIGGER trg_touch_last_lesson AFTER INSERT OR UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.touch_enrollment_last_lesson();

-- Assignments + submissions
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL,
  title text NOT NULL,
  instructions text NOT NULL DEFAULT '',
  max_points integer NOT NULL DEFAULT 100,
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enrolled or admin reads assignments"
  ON public.assignments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.modules m ON m.id = l.module_id
      JOIN public.enrollments e ON e.course_id = m.course_id
      WHERE l.id = assignments.lesson_id AND e.user_id = auth.uid()
    )
  );
CREATE POLICY "admin writes assignments"
  ON public.assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  file_url text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  grade integer,
  feedback text,
  graded_at timestamptz,
  graded_by uuid,
  UNIQUE (assignment_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.assignment_submissions TO authenticated;
GRANT ALL ON public.assignment_submissions TO service_role;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own submissions read" ON public.assignment_submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "own submissions write" ON public.assignment_submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own submissions update" ON public.assignment_submissions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- XP events (gamification)
CREATE TABLE public.user_xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  ref_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_xp_user ON public.user_xp_events(user_id);
GRANT SELECT ON public.user_xp_events TO authenticated;
GRANT ALL ON public.user_xp_events TO service_role;
ALTER TABLE public.user_xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own xp read" ON public.user_xp_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- Award XP on lesson completion and course completion
CREATE OR REPLACE FUNCTION public.award_lesson_xp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_completed = true AND (OLD.is_completed IS DISTINCT FROM true) THEN
    INSERT INTO public.user_xp_events(user_id, event_type, points, ref_id)
    VALUES (NEW.user_id, 'lesson_completed', 10, NEW.lesson_id);
  END IF;
  RETURN NEW;
END$$;
DROP TRIGGER IF EXISTS trg_award_lesson_xp ON public.lesson_progress;
CREATE TRIGGER trg_award_lesson_xp AFTER INSERT OR UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.award_lesson_xp();

CREATE OR REPLACE FUNCTION public.award_course_xp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_completed = true AND (OLD.is_completed IS DISTINCT FROM true) THEN
    INSERT INTO public.user_xp_events(user_id, event_type, points, ref_id)
    VALUES (NEW.user_id, 'course_completed', 200, NEW.course_id);
  END IF;
  RETURN NEW;
END$$;
DROP TRIGGER IF EXISTS trg_award_course_xp ON public.enrollments;
CREATE TRIGGER trg_award_course_xp AFTER UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.award_course_xp();

-- Aggregate view via RPC
CREATE OR REPLACE FUNCTION public.get_user_xp(p_user_id uuid)
RETURNS TABLE(total_points bigint, level integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(points), 0)::bigint AS total_points,
         GREATEST(1, FLOOR(COALESCE(SUM(points), 0) / 100.0)::int + 1) AS level
  FROM public.user_xp_events WHERE user_id = p_user_id;
$$;
REVOKE EXECUTE ON FUNCTION public.get_user_xp(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_xp(uuid) TO authenticated;
