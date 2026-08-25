-- 1. Fixed lookup path on email queue helper functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq, extensions;

-- 2. Affiliates: prevent an anonymous application from being claimed by a different user
CREATE OR REPLACE FUNCTION public.affiliates_guard_user_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_email text;
BEGIN
  IF public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'finance'::app_role]) THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    IF OLD.user_id IS NOT NULL THEN
      RAISE EXCEPTION 'Affiliate owner cannot be changed';
    END IF;
    IF NEW.user_id IS NULL OR NEW.user_id <> auth.uid() THEN
      RAISE EXCEPTION 'Affiliate can only be linked to the authenticated user';
    END IF;
    SELECT lower(email) INTO caller_email FROM auth.users WHERE id = auth.uid();
    IF caller_email IS NULL OR caller_email <> lower(COALESCE(OLD.email, '')) THEN
      RAISE EXCEPTION 'Affiliate application email does not match this account';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS affiliates_guard_user_link_trg ON public.affiliates;
CREATE TRIGGER affiliates_guard_user_link_trg
BEFORE UPDATE ON public.affiliates
FOR EACH ROW EXECUTE FUNCTION public.affiliates_guard_user_link();

-- 3. Assignment submission files: owner-scoped update/delete
DROP POLICY IF EXISTS "students update own assignment files" ON storage.objects;
CREATE POLICY "students update own assignment files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'assignment-submissions' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'assignment-submissions' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "students delete own assignment files" ON storage.objects;
CREATE POLICY "students delete own assignment files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'assignment-submissions'
  AND ((auth.uid())::text = (storage.foldername(name))[1]
       OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'moderator'::app_role]))
);

-- 4. Orders: no client-side order creation; orders are created server-side with verified pricing
DROP POLICY IF EXISTS "Users can insert own pending orders" ON public.orders;
REVOKE INSERT ON public.orders FROM authenticated, anon;