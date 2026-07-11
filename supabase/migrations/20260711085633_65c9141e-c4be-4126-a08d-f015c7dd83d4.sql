
INSERT INTO public.cohort_members (cohort_id, user_id, role)
VALUES
  ('ff5a3dca-0815-42d2-8203-41b37966fc11','3d35a9d1-3823-40d0-9f29-b3e85b7a00e8','member'),
  ('ff5a3dca-0815-42d2-8203-41b37966fc11','fcc351b0-e872-41be-8dfa-537221e34538','member')
ON CONFLICT DO NOTHING;

UPDATE public.courses
   SET students_enrolled = COALESCE((
     SELECT count(DISTINCT cm.user_id)
     FROM public.cohort_members cm
     JOIN public.cohorts co ON co.id = cm.cohort_id
     WHERE co.course_id = courses.id
   ), 0)
 WHERE cohort_only = true;
