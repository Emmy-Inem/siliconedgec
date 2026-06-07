
DROP POLICY IF EXISTS "Users can insert referrals" ON public.influencer_referrals;

ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS explanation text;

DROP FUNCTION IF EXISTS public.get_quiz_questions(uuid);

CREATE OR REPLACE FUNCTION public.get_quiz_questions(p_quiz_id uuid)
RETURNS TABLE(
  id uuid,
  quiz_id uuid,
  question_text text,
  options jsonb,
  order_index integer,
  correct_answer text,
  explanation text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, quiz_id, question_text, options, order_index, correct_answer, explanation
  FROM public.quiz_questions
  WHERE quiz_id = p_quiz_id
  ORDER BY order_index;
$$;

UPDATE public.quiz_questions
   SET explanation = 'The correct option (' || correct_answer || ') best matches the concept covered in this lesson. Review the lesson material around this topic to reinforce the reasoning.'
 WHERE explanation IS NULL AND correct_answer IS NOT NULL;
