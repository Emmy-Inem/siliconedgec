
-- Drop SECURITY DEFINER views flagged by linter
DROP VIEW IF EXISTS public.public_profiles;
DROP VIEW IF EXISTS public.quiz_questions_public;

-- Safe RPC: return only display fields for given user ids
CREATE OR REPLACE FUNCTION public.get_public_profiles(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id, full_name, avatar_url
  FROM public.profiles
  WHERE user_id = ANY(p_user_ids);
$$;
REVOKE EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO anon, authenticated;

-- Safe RPC: count of profiles (for homepage stats)
CREATE OR REPLACE FUNCTION public.get_profiles_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint FROM public.profiles;
$$;
REVOKE EXECUTE ON FUNCTION public.get_profiles_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profiles_count() TO anon, authenticated;

-- Safe RPC: quiz questions without the correct_answer field
CREATE OR REPLACE FUNCTION public.get_quiz_questions(p_quiz_id uuid)
RETURNS TABLE(id uuid, quiz_id uuid, question_text text, options jsonb, order_index integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, quiz_id, question_text, options, order_index
  FROM public.quiz_questions
  WHERE quiz_id = p_quiz_id
  ORDER BY order_index;
$$;
REVOKE EXECUTE ON FUNCTION public.get_quiz_questions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quiz_questions(uuid) TO authenticated;
