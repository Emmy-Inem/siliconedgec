GRANT EXECUTE ON FUNCTION public.get_profiles_count() TO anon;
GRANT EXECUTE ON FUNCTION public.get_course_curriculum(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_course_instructors(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_paid_enrolled(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO anon;