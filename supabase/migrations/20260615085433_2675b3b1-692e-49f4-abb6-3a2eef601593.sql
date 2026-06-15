
WITH ranked AS (
  SELECT a.id, a.lesson_id,
    row_number() OVER (
      PARTITION BY a.lesson_id
      ORDER BY (SELECT count(*) FROM public.assignment_submissions s WHERE s.assignment_id = a.id) DESC,
               a.created_at ASC
    ) AS rn
  FROM public.assignments a
)
DELETE FROM public.assignments WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_lesson_id_unique UNIQUE (lesson_id);

CREATE TABLE IF NOT EXISTS public.kb_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  icon text,
  order_index int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.kb_categories TO anon, authenticated;
GRANT ALL ON public.kb_categories TO service_role;
ALTER TABLE public.kb_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kb_categories read"
  ON public.kb_categories FOR SELECT
  USING (is_published = true OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'moderator'::app_role));
CREATE POLICY "kb_categories admin write"
  ON public.kb_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'moderator'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'moderator'::app_role));
CREATE TRIGGER kb_categories_updated_at BEFORE UPDATE ON public.kb_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.kb_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.kb_categories(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text,
  body text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT false,
  views int NOT NULL DEFAULT 0,
  helpful_yes int NOT NULL DEFAULT 0,
  helpful_no int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kb_articles_category_idx ON public.kb_articles(category_id);
CREATE INDEX IF NOT EXISTS kb_articles_published_idx ON public.kb_articles(is_published);
GRANT SELECT ON public.kb_articles TO anon, authenticated;
GRANT ALL ON public.kb_articles TO service_role;
ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kb_articles read published"
  ON public.kb_articles FOR SELECT
  USING (is_published = true OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'moderator'::app_role));
CREATE POLICY "kb_articles admin write"
  ON public.kb_articles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'moderator'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'moderator'::app_role));
CREATE TRIGGER kb_articles_updated_at BEFORE UPDATE ON public.kb_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
