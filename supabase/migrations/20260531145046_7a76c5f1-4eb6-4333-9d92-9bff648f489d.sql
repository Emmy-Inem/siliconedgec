
-- 1. Backup runs table for backup status page
CREATE TABLE IF NOT EXISTS public.backup_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',  -- running | success | failed
  tables_backed_up int DEFAULT 0,
  total_rows bigint DEFAULT 0,
  bytes_uploaded bigint DEFAULT 0,
  destination text,
  error_message text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.backup_runs TO authenticated;
GRANT ALL ON public.backup_runs TO service_role;

ALTER TABLE public.backup_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read backup runs"
  ON public.backup_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admins manage backup runs"
  ON public.backup_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_backup_runs_started ON public.backup_runs (started_at DESC);

-- 2. Auto-enroll on course registration (including free webinar registrants)
CREATE OR REPLACE FUNCTION public.auto_enroll_on_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL OR NEW.course_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.enrollments (user_id, course_id, payment_status, progress_percentage, is_completed)
  VALUES (NEW.user_id, NEW.course_id, 'comped', 0, false)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_enroll_on_registration ON public.course_registrations;
CREATE TRIGGER trg_auto_enroll_on_registration
AFTER INSERT ON public.course_registrations
FOR EACH ROW EXECUTE FUNCTION public.auto_enroll_on_registration();

-- Add a unique constraint on (user_id, course_id) for enrollments if missing,
-- so ON CONFLICT works. Wrap in a DO block to be idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enrollments_user_course_unique'
  ) THEN
    BEGIN
      ALTER TABLE public.enrollments
        ADD CONSTRAINT enrollments_user_course_unique UNIQUE (user_id, course_id);
    EXCEPTION WHEN duplicate_table OR unique_violation THEN
      NULL;
    END;
  END IF;
END $$;

-- 3. Backfill: enroll all existing registrants who aren't already enrolled
INSERT INTO public.enrollments (user_id, course_id, payment_status, progress_percentage, is_completed)
SELECT DISTINCT r.user_id, r.course_id, 'comped', 0, false
FROM public.course_registrations r
WHERE r.user_id IS NOT NULL
  AND r.course_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.user_id = r.user_id AND e.course_id = r.course_id
  );
