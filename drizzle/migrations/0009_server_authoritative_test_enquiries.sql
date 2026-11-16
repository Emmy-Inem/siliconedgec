DROP POLICY IF EXISTS "Anyone can submit business leads" ON public.business_leads;
REVOKE INSERT, UPDATE, DELETE ON public.business_leads FROM anon;
CREATE OR REPLACE FUNCTION public.submit_enquiry(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_type text := coalesce(p->>'lead_type','contact');
  v_name text := btrim(coalesce(p->>'contact_name',''));
  v_email text := lower(btrim(coalesce(p->>'email','')));
  v_key text := nullif(btrim(coalesce(p->>'submission_key','')),'');
  v_id uuid; v_attr jsonb := '{}'::jsonb; k text; v_test boolean; v_existing_test boolean;
BEGIN
  v_test := coalesce((p->>'is_test')::boolean,false) OR v_name ~* '\[test\]' OR v_email ~* '\+test@';
  IF v_type NOT IN ('contact','business','course') THEN RAISE EXCEPTION 'invalid_type'; END IF;
  IF length(v_name) < 1 OR length(v_name) > 120 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(v_email) > 255 THEN RAISE EXCEPTION 'invalid_email'; END IF;
  IF length(coalesce(p->>'message','')) > 2000 OR length(coalesce(p->>'training_needs','')) > 3000 THEN RAISE EXCEPTION 'too_long'; END IF;
  IF v_type='course' THEN
    IF coalesce(p->>'phone','') !~ '^\+[1-9][0-9 ()-]{6,19}$' THEN RAISE EXCEPTION 'invalid_phone'; END IF;
    IF NOT EXISTS (SELECT 1 FROM courses WHERE id=(p->>'course_id')::uuid AND is_published) THEN RAISE EXCEPTION 'invalid_course'; END IF;
    IF coalesce(p->>'experience_level','') NOT IN ('beginner','it_professional','other') THEN RAISE EXCEPTION 'invalid_experience'; END IF;
    IF coalesce(p->>'intended_start','') NOT IN ('2026-11-28','later_cohort','exploring') THEN RAISE EXCEPTION 'invalid_start'; END IF;
    IF length(btrim(coalesce(p->>'country',''))) < 2 THEN RAISE EXCEPTION 'invalid_country'; END IF;
  END IF;
  IF v_key IS NOT NULL THEN
    SELECT id, is_test INTO v_id, v_existing_test FROM business_leads WHERE submission_key=v_key;
    IF v_id IS NOT NULL THEN RETURN jsonb_build_object('id',v_id,'duplicate',true,'is_test',v_existing_test); END IF;
  END IF;
  IF (SELECT count(*) FROM business_leads WHERE lower(email)=v_email AND created_at > now()-interval '10 minutes') >= 3 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;
  FOREACH k IN ARRAY ARRAY['gclid','gbraid','wbraid','utm_source','utm_medium','utm_campaign','utm_content','utm_term','landing_path'] LOOP
    IF p->'attribution' ? k THEN v_attr := v_attr || jsonb_build_object(k, left(p->'attribution'->>k,200)); END IF;
  END LOOP;
  INSERT INTO business_leads(lead_type,contact_name,email,company_name,job_title,phone,company_size,training_needs,message,course_id,country,experience_level,intended_start,source_page,attribution,is_test,submission_key,status)
  VALUES (v_type,v_name,v_email,left(coalesce(nullif(btrim(p->>'company_name'),''),'Individual'),200),left(nullif(p->>'job_title',''),120),left(nullif(btrim(p->>'phone'),''),30),left(nullif(p->>'company_size',''),50),left(nullif(p->>'training_needs',''),3000),left(nullif(p->>'message',''),2000),nullif(p->>'course_id','')::uuid,left(nullif(btrim(p->>'country'),''),80),nullif(p->>'experience_level',''),nullif(p->>'intended_start',''),left(nullif(p->>'source_page',''),200),v_attr,v_test,v_key,'new')
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id',v_id,'duplicate',false,'is_test',v_test);
EXCEPTION WHEN unique_violation THEN
  SELECT id, is_test INTO v_id, v_existing_test FROM business_leads WHERE submission_key=v_key;
  RETURN jsonb_build_object('id',v_id,'duplicate',true,'is_test',coalesce(v_existing_test,true));
END $$;
REVOKE ALL ON FUNCTION public.submit_enquiry(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_enquiry(jsonb) TO anon, authenticated;