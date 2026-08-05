-- 1. Fix swapped arguments in the instructor quiz policy
DROP POLICY IF EXISTS "Instructors manage owned quizzes" ON public.quizzes;
CREATE POLICY "Instructors manage owned quizzes"
ON public.quizzes
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR (has_role(auth.uid(), 'instructor'::app_role) AND instructor_teaches_lesson(lesson_id, auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR (has_role(auth.uid(), 'instructor'::app_role) AND instructor_teaches_lesson(lesson_id, auth.uid()))
);

-- 2. Users may only self-insert pending, untampered orders
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
CREATE POLICY "Users can insert own pending orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND amount >= 0
  AND coalesce(discount_amount, 0) = 0
);