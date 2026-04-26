
-- Add editable home page image + stat content keys
INSERT INTO public.site_content (key, value, content_type) VALUES
  ('home_hero_image_1', '', 'image'),
  ('home_hero_image_2', '', 'image'),
  ('home_hero_image_3', '', 'image'),
  ('home_hero_image_4', '', 'image'),
  ('home_mentor_image', '', 'image'),
  ('home_stat_students', '', 'text'),
  ('home_stat_courses', '', 'text'),
  ('home_stat_instructors', '', 'text'),
  ('home_stat_countries', '', 'text')
ON CONFLICT (key) DO NOTHING;
