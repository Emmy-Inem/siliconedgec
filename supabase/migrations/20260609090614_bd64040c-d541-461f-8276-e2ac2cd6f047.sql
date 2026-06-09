-- Grant Data API access for public-facing catalog tables.
-- Policies already restrict rows; without GRANTs PostgREST returns permission denied.

GRANT SELECT ON public.courses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;

GRANT SELECT ON public.instructors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instructors TO authenticated;
GRANT ALL ON public.instructors TO service_role;

GRANT SELECT ON public.modules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modules TO authenticated;
GRANT ALL ON public.modules TO service_role;

GRANT SELECT ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

GRANT SELECT ON public.learning_paths TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_paths TO authenticated;
GRANT ALL ON public.learning_paths TO service_role;

GRANT SELECT ON public.learning_path_courses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_path_courses TO authenticated;
GRANT ALL ON public.learning_path_courses TO service_role;

GRANT SELECT ON public.pricing_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_plans TO authenticated;
GRANT ALL ON public.pricing_plans TO service_role;

GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

GRANT SELECT ON public.tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;

GRANT SELECT ON public.course_tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_tags TO authenticated;
GRANT ALL ON public.course_tags TO service_role;