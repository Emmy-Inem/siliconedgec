-- 1) Block self-reported AI quiz scores from clients
CREATE OR REPLACE FUNCTION public.block_self_reported_ai_quiz_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Server-side grading (service role / edge function) has no auth.uid()
  IF auth.uid() IS NULL OR current_setting('app.quiz_grading', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role]) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'AI quiz scores must be submitted through the grading function.'
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS trg_block_self_reported_ai_quiz_score ON public.ai_quiz_attempts;
CREATE TRIGGER trg_block_self_reported_ai_quiz_score
BEFORE INSERT OR UPDATE OF score ON public.ai_quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.block_self_reported_ai_quiz_score();

-- 2) Policy-level lock of staff-only support ticket fields
CREATE OR REPLACE FUNCTION public.ticket_staff_fields_unchanged(
  _id uuid, _status text, _priority text, _assigned_to uuid,
  _resolution_note text, _ticket_number bigint,
  _user_id uuid, _source text, _unread_admin_count integer
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = _id
      AND t.status IS NOT DISTINCT FROM _status
      AND t.priority IS NOT DISTINCT FROM _priority
      AND t.assigned_to IS NOT DISTINCT FROM _assigned_to
      AND t.resolution_note IS NOT DISTINCT FROM _resolution_note
      AND t.ticket_number IS NOT DISTINCT FROM _ticket_number
      AND t.user_id IS NOT DISTINCT FROM _user_id
      AND t.source IS NOT DISTINCT FROM _source
      AND t.unread_admin_count IS NOT DISTINCT FROM _unread_admin_count
  )
$$;

DROP POLICY IF EXISTS "Users update own tickets" ON public.support_tickets;
CREATE POLICY "Users update own tickets"
ON public.support_tickets
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND public.ticket_staff_fields_unchanged(
    id, status, priority, assigned_to, resolution_note,
    ticket_number, user_id, source, unread_admin_count
  )
);