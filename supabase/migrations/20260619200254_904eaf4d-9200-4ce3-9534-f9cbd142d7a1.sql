DROP POLICY IF EXISTS "Anon can view brands" ON public.brands;
CREATE POLICY "Anon can view published brands" ON public.brands FOR SELECT TO anon USING (is_published = true);

DROP POLICY IF EXISTS "Anon can view paths" ON public.learning_paths;
CREATE POLICY "Anon can view published paths" ON public.learning_paths FOR SELECT TO anon USING (is_published = true);