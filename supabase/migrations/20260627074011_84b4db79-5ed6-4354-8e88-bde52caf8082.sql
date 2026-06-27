
-- ============ cohort_materials ============
CREATE TABLE IF NOT EXISTS public.cohort_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'link', -- link | file | note
  url text,
  file_path text,
  file_size bigint,
  mime_type text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cohort_materials TO authenticated;
GRANT ALL ON public.cohort_materials TO service_role;
ALTER TABLE public.cohort_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY cohort_materials_read ON public.cohort_materials FOR SELECT
  USING (public.is_cohort_member(cohort_id, auth.uid())
         OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role]));
CREATE POLICY cohort_materials_manage ON public.cohort_materials FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role]));
CREATE INDEX IF NOT EXISTS idx_cohort_materials_cohort ON public.cohort_materials(cohort_id, created_at DESC);
CREATE TRIGGER trg_cohort_materials_updated BEFORE UPDATE ON public.cohort_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ cohort_session_rsvps ============
CREATE TABLE IF NOT EXISTS public.cohort_session_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.cohort_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'going', -- going | maybe | declined
  attended boolean NOT NULL DEFAULT false,
  marked_by uuid,
  marked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cohort_session_rsvps TO authenticated;
GRANT ALL ON public.cohort_session_rsvps TO service_role;
ALTER TABLE public.cohort_session_rsvps ENABLE ROW LEVEL SECURITY;

-- Members of the cohort linked to the session may read all RSVPs for that session.
CREATE POLICY cohort_rsvp_read ON public.cohort_session_rsvps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cohort_sessions cs
      WHERE cs.id = session_id
        AND (public.is_cohort_member(cs.cohort_id, auth.uid())
             OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role]))
    )
  );
-- Members can RSVP for themselves.
CREATE POLICY cohort_rsvp_self_insert ON public.cohort_session_rsvps FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.cohort_sessions cs
      WHERE cs.id = session_id AND public.is_cohort_member(cs.cohort_id, auth.uid())
    )
  );
CREATE POLICY cohort_rsvp_self_update ON public.cohort_session_rsvps FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY cohort_rsvp_self_delete ON public.cohort_session_rsvps FOR DELETE
  USING (user_id = auth.uid());
-- Staff (admin/moderator/instructor) can manage RSVPs including marking attendance.
CREATE POLICY cohort_rsvp_staff_manage ON public.cohort_session_rsvps FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role]));

CREATE TRIGGER trg_cohort_rsvp_updated BEFORE UPDATE ON public.cohort_session_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Notifications: new cohort session ============
CREATE OR REPLACE FUNCTION public.notify_cohort_session()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text; v_when text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.scheduled_at = NEW.scheduled_at AND OLD.title = NEW.title THEN
    RETURN NEW;
  END IF;
  SELECT name INTO v_name FROM public.cohorts WHERE id = NEW.cohort_id;
  v_when := to_char(NEW.scheduled_at AT TIME ZONE 'Africa/Lagos', 'Dy DD Mon, HH24:MI') || ' WAT';
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT cm.user_id,
         CASE WHEN TG_OP='INSERT' THEN 'New cohort session: ' || NEW.title
              ELSE 'Cohort session updated: ' || NEW.title END,
         COALESCE(v_name,'Your cohort') || ' · ' || v_when,
         'info',
         '/cohorts/' || NEW.cohort_id
  FROM public.cohort_members cm
  WHERE cm.cohort_id = NEW.cohort_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_cohort_session ON public.cohort_sessions;
CREATE TRIGGER trg_notify_cohort_session
  AFTER INSERT OR UPDATE ON public.cohort_sessions
  FOR EACH ROW EXECUTE FUNCTION public.notify_cohort_session();

-- ============ Notifications: new cohort discussion post ============
CREATE OR REPLACE FUNCTION public.notify_cohort_post()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text; v_parent_user uuid;
BEGIN
  SELECT name INTO v_name FROM public.cohorts WHERE id = NEW.cohort_id;
  IF NEW.parent_id IS NULL THEN
    -- New top-level post: notify all cohort members except the author.
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT cm.user_id,
           'New post in ' || COALESCE(v_name,'your cohort'),
           LEFT(NEW.content, 160),
           'info',
           '/cohorts/' || NEW.cohort_id
    FROM public.cohort_members cm
    WHERE cm.cohort_id = NEW.cohort_id AND cm.user_id <> NEW.user_id;
  ELSE
    SELECT user_id INTO v_parent_user FROM public.cohort_posts WHERE id = NEW.parent_id;
    IF v_parent_user IS NOT NULL AND v_parent_user <> NEW.user_id THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (v_parent_user, 'New reply in ' || COALESCE(v_name,'your cohort'),
              LEFT(NEW.content, 160), 'info', '/cohorts/' || NEW.cohort_id);
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_cohort_post ON public.cohort_posts;
CREATE TRIGGER trg_notify_cohort_post
  AFTER INSERT ON public.cohort_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_cohort_post();

-- ============ Helper: get cohort member emails (for email blasts) ============
CREATE OR REPLACE FUNCTION public.get_cohort_member_emails(p_cohort_id uuid)
RETURNS TABLE(user_id uuid, email text, full_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cm.user_id, au.email::text, p.full_name
  FROM public.cohort_members cm
  JOIN auth.users au ON au.id = cm.user_id
  LEFT JOIN public.profiles p ON p.user_id = cm.user_id
  WHERE cm.cohort_id = p_cohort_id
    AND public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role]);
$$;

-- ============ Storage policies for cohort-materials bucket ============
-- file_path convention: <cohort_id>/<filename>
CREATE POLICY "cohort_materials_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'cohort-materials'
    AND (
      public.is_cohort_member((split_part(name,'/',1))::uuid, auth.uid())
      OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role])
    )
  );
CREATE POLICY "cohort_materials_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cohort-materials'
    AND public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role])
  );
CREATE POLICY "cohort_materials_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'cohort-materials'
    AND public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role])
  );
