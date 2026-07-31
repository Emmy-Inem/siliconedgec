ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS approved_at timestamptz;

CREATE TABLE IF NOT EXISTS public.affiliate_course_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  referral_code text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  commission_percentage numeric,
  selected_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (affiliate_id, course_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_course_selections TO authenticated;
GRANT INSERT ON public.affiliate_course_selections TO anon;
GRANT ALL ON public.affiliate_course_selections TO service_role;

ALTER TABLE public.affiliate_course_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates view own course selections"
ON public.affiliate_course_selections FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid()));

CREATE POLICY "Affiliates add own course selections"
ON public.affiliate_course_selections FOR INSERT TO anon, authenticated
WITH CHECK (status = 'pending');

CREATE POLICY "Affiliates remove own pending selections"
ON public.affiliate_course_selections FOR DELETE TO authenticated
USING (status = 'pending' AND EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid()));

CREATE POLICY "Staff manage affiliate course selections"
ON public.affiliate_course_selections FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'finance'::app_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'finance'::app_role]));

CREATE TRIGGER trg_affiliate_course_selections_updated_at
BEFORE UPDATE ON public.affiliate_course_selections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.affiliate_clicks ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.resolve_affiliate_ref(p_code text)
RETURNS TABLE(affiliate_id uuid, course_id uuid, full_name text, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.id, s.course_id, a.full_name, a.status
  FROM public.affiliates a
  LEFT JOIN public.affiliate_course_selections s
    ON s.affiliate_id = a.id AND lower(s.referral_code) = lower(p_code)
  WHERE lower(a.code) = lower(p_code) OR s.id IS NOT NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.approve_affiliate_course(p_selection_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_code text; v_base text;
BEGIN
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'finance'::app_role]) THEN
    RAISE EXCEPTION 'Only admin or finance staff can approve affiliate courses'
      USING ERRCODE='insufficient_privilege';
  END IF;

  SELECT COALESCE(s.referral_code,
    a.code || '-' || substring(replace(gen_random_uuid()::text,'-','') from 1 for 5))
    INTO v_code
  FROM public.affiliate_course_selections s
  JOIN public.affiliates a ON a.id = s.affiliate_id
  WHERE s.id = p_selection_id;

  IF v_code IS NULL THEN RAISE EXCEPTION 'Selection not found'; END IF;

  UPDATE public.affiliate_course_selections
     SET status = 'approved', referral_code = v_code, approved_at = now()
   WHERE id = p_selection_id;

  RETURN v_code;
END $$;