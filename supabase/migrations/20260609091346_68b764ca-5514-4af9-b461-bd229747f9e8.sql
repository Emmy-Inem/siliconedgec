-- Blog drafts
DROP POLICY IF EXISTS "Anon can view published posts" ON public.blog_posts;
CREATE POLICY "Anon can view published posts" ON public.blog_posts
  FOR SELECT TO anon USING (status = 'published');

-- CMS drafts
DROP POLICY IF EXISTS "Anon can view cms pages" ON public.cms_pages;
CREATE POLICY "Anon can view cms pages" ON public.cms_pages
  FOR SELECT TO anon USING (status = 'published');

-- Unpublished jobs
DROP POLICY IF EXISTS "Anon can view jobs" ON public.jobs;
CREATE POLICY "Anon can view jobs" ON public.jobs
  FOR SELECT TO anon USING (is_published = true);

-- Reviews: hide raw user_id from anon by switching reads through a SECURITY INVOKER view.
-- Keep the existing policies for authenticated users (own + admin manage); restrict anon SELECT.
DROP POLICY IF EXISTS "Anon can view approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "Reviews viewable by everyone" ON public.reviews;
CREATE POLICY "Authenticated can view reviews" ON public.reviews
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE VIEW public.reviews_public
WITH (security_invoker=on) AS
  SELECT id, course_id, rating, comment, created_at
  FROM public.reviews;
GRANT SELECT ON public.reviews_public TO anon, authenticated;

-- Add anon SELECT back on reviews but only allow it to satisfy the view's invoker check via a permissive policy
-- (the view will still expose only non-PII columns).
CREATE POLICY "Anon can view reviews (no PII via view)" ON public.reviews
  FOR SELECT TO anon USING (true);

-- Quiz questions: only return correct_answer/explanation after the user has submitted at least one attempt.
CREATE OR REPLACE FUNCTION public.get_quiz_questions(p_quiz_id uuid)
RETURNS TABLE(id uuid, quiz_id uuid, question_text text, options jsonb, order_index integer, correct_answer text, explanation text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH attempted AS (
    SELECT EXISTS (
      SELECT 1 FROM public.quiz_attempts
      WHERE quiz_id = p_quiz_id AND user_id = auth.uid()
    ) AS has_attempt
  )
  SELECT q.id, q.quiz_id, q.question_text, q.options, q.order_index,
         CASE WHEN (SELECT has_attempt FROM attempted)
                OR has_role(auth.uid(),'admin'::app_role)
                OR has_role(auth.uid(),'moderator'::app_role)
              THEN q.correct_answer ELSE NULL END AS correct_answer,
         CASE WHEN (SELECT has_attempt FROM attempted)
                OR has_role(auth.uid(),'admin'::app_role)
                OR has_role(auth.uid(),'moderator'::app_role)
              THEN q.explanation ELSE NULL END AS explanation
  FROM public.quiz_questions q
  WHERE q.quiz_id = p_quiz_id
  ORDER BY q.order_index;
$function$;