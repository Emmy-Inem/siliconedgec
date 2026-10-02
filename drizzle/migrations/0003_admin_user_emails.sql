CREATE OR REPLACE FUNCTION public.admin_user_emails()
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT u.id, u.email::text FROM auth.users u
  WHERE public.has_any_role(auth.uid(), ARRAY['admin','moderator','support','finance','instructor','content_editor']::public.app_role[]);
$$;
REVOKE ALL ON FUNCTION public.admin_user_emails() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_user_emails() TO authenticated;