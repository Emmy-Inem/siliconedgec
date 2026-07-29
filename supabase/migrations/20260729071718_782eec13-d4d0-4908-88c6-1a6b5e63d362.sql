ALTER FUNCTION public.enforce_assignment_before_complete() SET search_path = public;

CREATE OR REPLACE FUNCTION public.protect_rsvp_attendance_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_staff boolean;
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  is_staff := public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role]);

  IF is_staff THEN
    RETURN NEW;
  END IF;

  -- Non-staff may only change their own RSVP status; attendance fields are locked.
  NEW.attended  := OLD.attended;
  NEW.marked_at := OLD.marked_at;
  NEW.marked_by := OLD.marked_by;
  NEW.user_id   := OLD.user_id;
  NEW.session_id := OLD.session_id;

  RETURN NEW;
END;
$function$;

DROP POLICY IF EXISTS "cohort_rsvp_self_update_status_only" ON public.cohort_session_rsvps;
CREATE POLICY "cohort_rsvp_self_update_status_only"
ON public.cohort_session_rsvps
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());