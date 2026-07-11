
-- Reset the cohort roster to the original 11 people. Everything else was
-- pulled in by an over-eager backfill from legacy 'event_promo' enrollments
-- and needs to be removed.
DELETE FROM public.cohort_members
WHERE cohort_id = 'ff5a3dca-0815-42d2-8203-41b37966fc11'
  AND user_id NOT IN (
    SELECT p.user_id FROM public.profiles p
    WHERE p.full_name IN (
      'Fauziyah Zakariyah','Tayo Ayodele',
      'Seun Adegbesan','Yomi Odukoya','George Olivet','Olagoke Olowu',
      'Simeon Shaibu onuh','Adedamoka Adeloye','Philip (Xavier)',
      'David Inem','Inem Emmanuel'
    )
  );

UPDATE public.courses
   SET students_enrolled = COALESCE((
     SELECT count(DISTINCT cm.user_id)
     FROM public.cohort_members cm
     JOIN public.cohorts co ON co.id = cm.cohort_id
     WHERE co.course_id = courses.id
   ), 0)
 WHERE cohort_only = true;
