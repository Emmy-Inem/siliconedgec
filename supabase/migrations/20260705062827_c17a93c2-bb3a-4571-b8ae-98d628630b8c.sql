-- Assignment visibility flags (mirror quizzes)
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS is_ai_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;

-- Hide every quiz and assignment on the Azure bootcamp course so the instructor
-- explicitly republishes what should be shown. Nothing is deleted — just hidden.
UPDATE public.quizzes q
   SET is_visible = false
  FROM public.lessons l
  JOIN public.modules m ON m.id = l.module_id
 WHERE q.lesson_id = l.id
   AND m.course_id = '3b1f29ec-8fd4-4ff0-9357-1987b90e6c91';

UPDATE public.assignments a
   SET is_visible = false
  FROM public.lessons l
  JOIN public.modules m ON m.id = l.module_id
 WHERE a.lesson_id = l.id
   AND m.course_id = '3b1f29ec-8fd4-4ff0-9357-1987b90e6c91';