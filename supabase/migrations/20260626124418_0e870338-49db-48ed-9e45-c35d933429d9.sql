-- Cohort Space: roster + discussion + sessions, admin-managed, members-only access.

CREATE TABLE IF NOT EXISTS public.cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'active', -- active | upcoming | archived
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cohorts TO authenticated;
GRANT ALL ON public.cohorts TO service_role;
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.cohort_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member', -- member | instructor
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cohort_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_cohort_members_user ON public.cohort_members(user_id);
CREATE INDEX IF NOT EXISTS idx_cohort_members_cohort ON public.cohort_members(cohort_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cohort_members TO authenticated;
GRANT ALL ON public.cohort_members TO service_role;
ALTER TABLE public.cohort_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.cohort_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.cohort_posts(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cohort_posts_cohort ON public.cohort_posts(cohort_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cohort_posts_parent ON public.cohort_posts(parent_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cohort_posts TO authenticated;
GRANT ALL ON public.cohort_posts TO service_role;
ALTER TABLE public.cohort_posts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.cohort_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  meeting_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cohort_sessions_cohort ON public.cohort_sessions(cohort_id, scheduled_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cohort_sessions TO authenticated;
GRANT ALL ON public.cohort_sessions TO service_role;
ALTER TABLE public.cohort_sessions ENABLE ROW LEVEL SECURITY;

-- Helper: is the user a member of a cohort?
CREATE OR REPLACE FUNCTION public.is_cohort_member(_cohort_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cohort_members
    WHERE cohort_id = _cohort_id AND user_id = _user_id
  );
$$;

-- updated_at triggers
CREATE TRIGGER trg_cohorts_updated BEFORE UPDATE ON public.cohorts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cohort_posts_updated BEFORE UPDATE ON public.cohort_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cohort_sessions_updated BEFORE UPDATE ON public.cohort_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies
-- cohorts: members + instructors + admins/moderators can read; only admins manage
CREATE POLICY "cohorts_read_members_or_admin" ON public.cohorts FOR SELECT TO authenticated
  USING (
    public.is_cohort_member(id, auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin','moderator','instructor']::app_role[])
  );
CREATE POLICY "cohorts_admin_all" ON public.cohorts FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','moderator']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','moderator']::app_role[]));

-- cohort_members: members can see fellow members; admins manage
CREATE POLICY "cohort_members_read" ON public.cohort_members FOR SELECT TO authenticated
  USING (
    public.is_cohort_member(cohort_id, auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin','moderator','instructor']::app_role[])
  );
CREATE POLICY "cohort_members_admin_all" ON public.cohort_members FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','moderator']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','moderator']::app_role[]));

-- cohort_posts: members can read & post; authors edit/delete own; admins manage
CREATE POLICY "cohort_posts_read" ON public.cohort_posts FOR SELECT TO authenticated
  USING (
    public.is_cohort_member(cohort_id, auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin','moderator','instructor']::app_role[])
  );
CREATE POLICY "cohort_posts_insert_members" ON public.cohort_posts FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      public.is_cohort_member(cohort_id, auth.uid())
      OR public.has_any_role(auth.uid(), ARRAY['admin','moderator','instructor']::app_role[])
    )
  );
CREATE POLICY "cohort_posts_update_own" ON public.cohort_posts FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','moderator']::app_role[]))
  WITH CHECK (user_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','moderator']::app_role[]));
CREATE POLICY "cohort_posts_delete_own" ON public.cohort_posts FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','moderator']::app_role[]));

-- cohort_sessions: members read; admins/instructors manage
CREATE POLICY "cohort_sessions_read" ON public.cohort_sessions FOR SELECT TO authenticated
  USING (
    public.is_cohort_member(cohort_id, auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin','moderator','instructor']::app_role[])
  );
CREATE POLICY "cohort_sessions_manage" ON public.cohort_sessions FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','moderator','instructor']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','moderator','instructor']::app_role[]));
