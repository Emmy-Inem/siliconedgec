INSERT INTO public.site_content (key, value, content_type) VALUES
  ('home_hero_title_pre', 'Start Learning', 'home'),
  ('home_hero_title_post', 'Unlock your tech career', 'home'),
  ('home_testimonial_speed', 'normal', 'home')
ON CONFLICT (key) DO NOTHING;