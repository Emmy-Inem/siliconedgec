CREATE TABLE public.mock_interview_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  cohort_id uuid REFERENCES public.cohorts(id) ON DELETE SET NULL,
  target_role text NOT NULL CHECK (char_length(target_role) BETWEEN 1 AND 120),
  experience_level text NOT NULL CHECK (experience_level IN ('junior','mid','senior')),
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  summary text NOT NULL DEFAULT '',
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  improvements jsonb NOT NULL DEFAULT '[]'::jsonb,
  transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.mock_interview_sessions TO authenticated;
GRANT ALL ON public.mock_interview_sessions TO service_role;
ALTER TABLE public.mock_interview_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Learners read own interview sessions" ON public.mock_interview_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Learners create own interview sessions" ON public.mock_interview_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins review interview sessions" ON public.mock_interview_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Instructors review scoped interview sessions" ON public.mock_interview_sessions FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'instructor') AND (
    (course_id IS NOT NULL AND public.instructor_teaches_course(course_id, auth.uid())) OR
    (cohort_id IS NOT NULL AND public.is_cohort_instructor(cohort_id, auth.uid()))
  )
);
CREATE INDEX mock_interview_sessions_user_created_idx ON public.mock_interview_sessions(user_id, created_at DESC);
CREATE INDEX mock_interview_sessions_course_idx ON public.mock_interview_sessions(course_id) WHERE course_id IS NOT NULL;
CREATE TRIGGER set_mock_interview_sessions_updated_at BEFORE UPDATE ON public.mock_interview_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.request_affiliate_payout()
RETURNS public.affiliate_payouts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affiliate public.affiliates%ROWTYPE;
  v_earned numeric := 0;
  v_reserved numeric := 0;
  v_available numeric := 0;
  v_result public.affiliate_payouts%ROWTYPE;
BEGIN
  SELECT * INTO v_affiliate FROM public.affiliates WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR v_affiliate.status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved partners can request payouts';
  END IF;
  IF nullif(btrim(coalesce(v_affiliate.payout_details, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Add payout details before requesting a payout';
  END IF;

  SELECT coalesce(sum(commission), 0) INTO v_earned
  FROM public.affiliate_referrals
  WHERE affiliate_id = v_affiliate.id AND status IN ('approved', 'confirmed', 'paid');

  SELECT coalesce(sum(amount), 0) INTO v_reserved
  FROM public.affiliate_payouts
  WHERE affiliate_id = v_affiliate.id AND status IN ('pending', 'processing', 'approved', 'paid');

  v_available := greatest(v_earned - v_reserved, 0);
  IF v_available < 10000 THEN
    RAISE EXCEPTION 'Available balance has not reached the minimum payout threshold';
  END IF;
  IF EXISTS (SELECT 1 FROM public.affiliate_payouts WHERE affiliate_id = v_affiliate.id AND status IN ('pending','processing','approved')) THEN
    RAISE EXCEPTION 'A payout request is already being processed';
  END IF;

  INSERT INTO public.affiliate_payouts (affiliate_id, amount, status, note)
  VALUES (v_affiliate.id, v_available, 'pending', 'Requested by partner')
  RETURNING * INTO v_result;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.request_affiliate_payout() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_affiliate_payout() TO authenticated;