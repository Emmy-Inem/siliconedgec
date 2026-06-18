
-- promo_codes: explicit admin-only SELECT (defense in depth alongside existing ALL policy)
DROP POLICY IF EXISTS "Admins read promo codes" ON public.promo_codes;
CREATE POLICY "Admins read promo codes"
  ON public.promo_codes FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- quiz_questions: consolidate redundant policies (keep ALL admin policy which covers SELECT)
DROP POLICY IF EXISTS "Admins read quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Admins can manage quiz questions" ON public.quiz_questions;
CREATE POLICY "Admins manage quiz questions"
  ON public.quiz_questions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- course_qna: restrict reads to enrolled users + admins/moderators
DROP POLICY IF EXISTS "QnA viewable by everyone" ON public.course_qna;
CREATE POLICY "Enrolled users and admins view qna"
  ON public.course_qna FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
    OR is_paid_enrolled(course_id)
    OR user_id = auth.uid()
  );

-- modules: hide modules for unpublished courses from non-admins
DROP POLICY IF EXISTS "Modules viewable by everyone" ON public.modules;
DROP POLICY IF EXISTS "Anon can view modules" ON public.modules;
CREATE POLICY "Published course modules viewable"
  ON public.modules FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = modules.course_id AND c.is_published = true
    )
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
  );
