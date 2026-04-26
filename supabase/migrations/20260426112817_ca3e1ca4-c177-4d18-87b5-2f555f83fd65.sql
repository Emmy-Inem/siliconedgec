
INSERT INTO public.site_content (key, value, content_type) VALUES
  -- Alumni marquee
  ('home_alumni_label', '', 'text'),

  -- How it works
  ('home_how_eyebrow', '', 'text'),
  ('home_how_title', '', 'text'),
  ('home_how_step1_title', '', 'text'),
  ('home_how_step1_desc', '', 'text'),
  ('home_how_step2_title', '', 'text'),
  ('home_how_step2_desc', '', 'text'),
  ('home_how_step3_title', '', 'text'),
  ('home_how_step3_desc', '', 'text'),
  ('home_how_step4_title', '', 'text'),
  ('home_how_step4_desc', '', 'text'),

  -- Instructors rail
  ('home_instructors_eyebrow', '', 'text'),
  ('home_instructors_title', '', 'text'),

  -- Mentors block
  ('home_mentors_eyebrow', '', 'text'),
  ('home_mentors_title', '', 'text'),
  ('home_mentors_description', '', 'text'),

  -- Testimonials
  ('home_testimonials_eyebrow', '', 'text'),
  ('home_testimonials_title', '', 'text'),

  -- FAQ
  ('home_faq_eyebrow', '', 'text'),
  ('home_faq_title', '', 'text'),
  ('home_faq_subtitle', '', 'text'),

  -- Final CTA
  ('home_cta_eyebrow', '', 'text'),
  ('home_cta_title', '', 'text'),
  ('home_cta_subtitle', '', 'text'),
  ('home_cta_primary', '', 'text'),
  ('home_cta_secondary', '', 'text')
ON CONFLICT (key) DO NOTHING;
