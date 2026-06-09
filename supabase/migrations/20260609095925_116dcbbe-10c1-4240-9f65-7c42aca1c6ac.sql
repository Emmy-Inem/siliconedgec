CREATE OR REPLACE FUNCTION public.get_course_curriculum(p_course_id uuid)
RETURNS TABLE(
  module_id uuid,
  module_title text,
  module_order_index integer,
  lesson_id uuid,
  lesson_title text,
  lesson_duration text,
  lesson_order_index integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    m.id AS module_id,
    m.title AS module_title,
    m.order_index AS module_order_index,
    l.id AS lesson_id,
    l.title AS lesson_title,
    l.duration AS lesson_duration,
    l.order_index AS lesson_order_index
  FROM public.modules m
  LEFT JOIN public.lessons l ON l.module_id = m.id
  WHERE m.course_id = p_course_id
  ORDER BY m.order_index, l.order_index NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_course_curriculum(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_course_curriculum(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_course_curriculum(uuid) TO service_role;