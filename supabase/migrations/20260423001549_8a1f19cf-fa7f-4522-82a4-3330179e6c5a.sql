-- 1. user_activity_log: allow inserts (auth or anon-tracked own session)
DROP POLICY IF EXISTS "Anyone can insert activity" ON public.user_activity_log;
CREATE POLICY "Anyone can insert activity"
  ON public.user_activity_log
  FOR INSERT
  WITH CHECK (
    user_id IS NULL OR auth.uid() = user_id
  );

-- 2. admin_activity_log: allow moderators too
DROP POLICY IF EXISTS "Admins can insert activity log" ON public.admin_activity_log;
CREATE POLICY "Admins/mods can insert activity log"
  ON public.admin_activity_log
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
    OR auth.uid() = admin_user_id
  );

DROP POLICY IF EXISTS "Admins can view activity log" ON public.admin_activity_log;
CREATE POLICY "Admins/mods can view activity log"
  ON public.admin_activity_log
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
  );

-- 3. blocked_ips table for manual IP blocking
CREATE TABLE IF NOT EXISTS public.blocked_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  reason text,
  blocked_by uuid,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage blocked ips" ON public.blocked_ips;
CREATE POLICY "Admins manage blocked ips"
  ON public.blocked_ips
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. Helper: is_ip_blocked
CREATE OR REPLACE FUNCTION public.is_ip_blocked(_ip text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_ips
    WHERE ip_address = _ip
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- 5. Helper: admin clears lockout for a key (email or ip)
CREATE OR REPLACE FUNCTION public.clear_login_lockout(_key text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  DELETE FROM public.login_attempts
  WHERE success = false
    AND created_at > now() - interval '15 minutes'
    AND (email = _key OR ip_address = _key);
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;