-- 1. Attachments + kind on cohort_posts
ALTER TABLE public.cohort_posts
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'message',
  ADD COLUMN IF NOT EXISTS is_resolved boolean NOT NULL DEFAULT false;

-- 2. Reactions
CREATE TABLE IF NOT EXISTS public.cohort_post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.cohort_posts(id) ON DELETE CASCADE,
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, emoji)
);

GRANT SELECT, INSERT, DELETE ON public.cohort_post_reactions TO authenticated;
GRANT ALL ON public.cohort_post_reactions TO service_role;

ALTER TABLE public.cohort_post_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read reactions" ON public.cohort_post_reactions;
CREATE POLICY "Members read reactions" ON public.cohort_post_reactions
  FOR SELECT TO authenticated
  USING (public.is_cohort_member(cohort_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Members add own reactions" ON public.cohort_post_reactions;
CREATE POLICY "Members add own reactions" ON public.cohort_post_reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_cohort_member(cohort_id, auth.uid()));

DROP POLICY IF EXISTS "Members remove own reactions" ON public.cohort_post_reactions;
CREATE POLICY "Members remove own reactions" ON public.cohort_post_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_cohort_post_reactions_post ON public.cohort_post_reactions(post_id);

-- 3. Read markers
CREATE TABLE IF NOT EXISTS public.cohort_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cohort_id, user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.cohort_reads TO authenticated;
GRANT ALL ON public.cohort_reads TO service_role;

ALTER TABLE public.cohort_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own read markers" ON public.cohort_reads;
CREATE POLICY "Users manage own read markers" ON public.cohort_reads
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_cohort_reads_updated_at ON public.cohort_reads;
CREATE TRIGGER trg_cohort_reads_updated_at
  BEFORE UPDATE ON public.cohort_reads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Realtime
ALTER TABLE public.cohort_posts REPLICA IDENTITY FULL;
ALTER TABLE public.cohort_post_reactions REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cohort_posts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cohort_post_reactions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 5. Mention notifications
CREATE OR REPLACE FUNCTION public.notify_cohort_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m record;
  author text;
  cohort_name text;
BEGIN
  SELECT full_name INTO author FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
  SELECT name INTO cohort_name FROM public.cohorts WHERE id = NEW.cohort_id;

  FOR m IN
    SELECT cm.user_id, p.full_name
    FROM public.cohort_members cm
    JOIN public.profiles p ON p.user_id = cm.user_id
    WHERE cm.cohort_id = NEW.cohort_id
      AND cm.user_id <> NEW.user_id
      AND p.full_name IS NOT NULL
      AND NEW.content ILIKE '%@' || split_part(p.full_name, ' ', 1) || '%'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      m.user_id,
      COALESCE(author, 'Someone') || ' mentioned you',
      left(NEW.content, 140),
      'cohort_mention',
      '/cohorts/' || NEW.cohort_id || '?post=' || NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_cohort_mentions ON public.cohort_posts;
CREATE TRIGGER trg_notify_cohort_mentions
  AFTER INSERT ON public.cohort_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_cohort_mentions();