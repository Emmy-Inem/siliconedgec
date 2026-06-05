GRANT EXECUTE ON FUNCTION public.slugify(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.unique_course_slug(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_course_slug() TO authenticated;
ALTER FUNCTION public.set_course_slug() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.unique_course_slug(text, uuid) SECURITY DEFINER SET search_path = public;