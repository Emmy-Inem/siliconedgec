DROP POLICY IF EXISTS "Users can update own enrollments" ON public.enrollments;
CREATE POLICY "Users can update own enrollments"
ON public.enrollments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.prevent_self_paid_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  paid_statuses CONSTANT text[] := ARRAY['paid','success','completed','confirmed'];
BEGIN
  -- Service role and admins bypass.
  IF current_setting('role', true) = 'service_role' THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Block learners from upgrading payment_status to a paid value.
  IF NEW.payment_status = ANY(paid_statuses)
     AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
    RAISE EXCEPTION 'Payment status can only be set by the payment service.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_paid_enrollment ON public.enrollments;
CREATE TRIGGER trg_prevent_self_paid_enrollment
BEFORE INSERT OR UPDATE ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_paid_enrollment();