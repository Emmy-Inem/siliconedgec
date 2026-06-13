
CREATE TABLE public.lesson_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.lesson_comments(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(body) > 0 AND length(body) <= 4000),
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_lesson_comments_lesson ON public.lesson_comments(lesson_id, created_at DESC);
CREATE INDEX idx_lesson_comments_parent ON public.lesson_comments(parent_id);
CREATE INDEX idx_lesson_comments_user ON public.lesson_comments(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_comments TO authenticated;
GRANT ALL ON public.lesson_comments TO service_role;

ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

-- Read: admins, or paid-enrolled in the parent course
CREATE POLICY "Read lesson comments — enrolled or admin"
  ON public.lesson_comments FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.modules m ON m.id = l.module_id
      WHERE l.id = lesson_comments.lesson_id
        AND public.is_paid_enrolled(m.course_id)
    )
  );

-- Insert: must be the author AND enrolled (or admin)
CREATE POLICY "Insert own lesson comment — enrolled"
  ON public.lesson_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'moderator'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.lessons l
        JOIN public.modules m ON m.id = l.module_id
        WHERE l.id = lesson_comments.lesson_id
          AND public.is_paid_enrolled(m.course_id)
      )
    )
  );

-- Update: own comment OR admin/moderator (admins can soft-delete)
CREATE POLICY "Update own lesson comment or admin"
  ON public.lesson_comments FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  )
  WITH CHECK (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

-- Delete: own comment OR admin/moderator
CREATE POLICY "Delete own lesson comment or admin"
  ON public.lesson_comments FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

CREATE TRIGGER trg_lesson_comments_updated_at
  BEFORE UPDATE ON public.lesson_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Notify lesson author/admin on new comment to drive engagement
CREATE OR REPLACE FUNCTION public.notify_lesson_comment_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_user uuid;
  v_lesson_title text;
  v_course_id uuid;
BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  SELECT user_id INTO v_parent_user FROM public.lesson_comments WHERE id = NEW.parent_id;
  IF v_parent_user IS NULL OR v_parent_user = NEW.user_id THEN RETURN NEW; END IF;

  SELECT l.title, m.course_id INTO v_lesson_title, v_course_id
  FROM public.lessons l JOIN public.modules m ON m.id = l.module_id
  WHERE l.id = NEW.lesson_id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    v_parent_user,
    'New reply to your comment',
    'Someone replied in "' || COALESCE(v_lesson_title, 'a lesson') || '".',
    'info',
    '/courses/' || v_course_id || '/learn?lesson=' || NEW.lesson_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lesson_comment_reply_notify
  AFTER INSERT ON public.lesson_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lesson_comment_reply();
