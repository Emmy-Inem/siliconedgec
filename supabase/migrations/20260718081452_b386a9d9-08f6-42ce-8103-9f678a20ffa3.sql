
DELETE FROM public.assignments a
WHERE NOT EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = a.lesson_id);

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_lesson_id_fkey
  FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';
