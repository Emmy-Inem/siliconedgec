-- Add slug column to courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS slug TEXT;

-- Slug-generation helper: lowercase, ASCII alphanum + hyphens
CREATE OR REPLACE FUNCTION public.slugify(_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s TEXT;
BEGIN
  IF _text IS NULL THEN RETURN NULL; END IF;
  s := lower(_text);
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '(^-+)|(-+$)', '', 'g');
  IF length(s) = 0 THEN s := 'course'; END IF;
  RETURN s;
END;
$$;

-- Generate a unique slug, appending -2, -3, ... if needed (excluding the row itself)
CREATE OR REPLACE FUNCTION public.unique_course_slug(_base TEXT, _id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  candidate TEXT;
  n INT := 1;
BEGIN
  candidate := _base;
  WHILE EXISTS (SELECT 1 FROM public.courses WHERE slug = candidate AND (id <> _id OR _id IS NULL)) LOOP
    n := n + 1;
    candidate := _base || '-' || n;
  END LOOP;
  RETURN candidate;
END;
$$;

-- Trigger to auto-fill slug on insert/update of title
CREATE OR REPLACE FUNCTION public.set_course_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base TEXT;
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 THEN
    base := public.slugify(NEW.title);
    NEW.slug := public.unique_course_slug(base, NEW.id);
  ELSE
    NEW.slug := public.slugify(NEW.slug);
    NEW.slug := public.unique_course_slug(NEW.slug, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_course_slug ON public.courses;
CREATE TRIGGER trg_set_course_slug
BEFORE INSERT OR UPDATE OF title, slug ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.set_course_slug();

-- Backfill existing rows
UPDATE public.courses
SET slug = public.unique_course_slug(public.slugify(title), id)
WHERE slug IS NULL OR length(trim(slug)) = 0;

-- Enforce uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS courses_slug_unique ON public.courses (slug);