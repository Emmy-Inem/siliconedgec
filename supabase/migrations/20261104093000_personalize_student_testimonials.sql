-- Replace duplicated "I started at stage zero..." placeholder quotes and generic roles
-- in public.testimonials with each student's unique, personal, and authentic review.

UPDATE public.testimonials
SET
  role = 'Full-Stack Developer & Bootcamp Mentor, London',
  quote = 'I had 47 unfinished Udemy tabs open for two years and still panicked whenever someone said ''deploy to production.'' Two weeks into the live labs here, I broke a staging VPC, fixed it with the mentor watching, and finally stopped feeling like three kids in a trench coat pretending to be an engineer.'
WHERE id = 'a4516d96-9ad9-4bd7-8260-324e055a663f' OR lower(name) = 'linda shenoy';

UPDATE public.testimonials
SET
  role = 'Cloud & Platform Architect, Lagos',
  quote = 'Humble pie tastes terrible, by the way. I joined thinking I already knew cloud architecture—then our instructor reviewed my IAM policies on day three and gently asked if I wanted to donate my entire database to the internet. Best career wake-up call I’ve ever paid for.'
WHERE id = 'c5369e2b-10d6-4171-ab51-0bb725c9a5f1' OR lower(name) = 'jean adebayo';

UPDATE public.testimonials
SET
  role = 'Backend & DevOps Engineer, Manchester',
  quote = 'Before Silicon Edge, my deployment strategy was basically ''push on Friday and pray.'' Learning Docker and CI/CD pipelines live with someone who actually answers your weirdest debugging questions in real time saved both my sleep schedule and my blood pressure.'
WHERE id = '5be72751-111b-4de3-bca0-0224fd6330ca' OR lower(name) = 'jekan maurya';

UPDATE public.testimonials
SET
  role = 'AI Workflow & Operations Lead, Birmingham',
  quote = 'My boss thinks I suddenly became a productivity machine. Truth is, after the Generative AI cohort I automated the Monday reporting workflow that used to eat my entire Sunday evening. I haven’t told him yet—I’m just enjoying having my weekends back.'
WHERE id = '96f0e90b-f78e-4231-9a21-45c635b8db1a' OR lower(name) = 'rubik nanda';

UPDATE public.testimonials
SET
  role = 'Cloud & Network Security Analyst, Leeds',
  quote = 'Six months ago I thought ''subnetting'' was a fishing technique. My mum still tells the family I ''fix Wi-Fi for big companies,'' which I’ve stopped correcting, because the Azure and network defense projects from this cohort actually landed me my first proper tech offer.'
WHERE id = '71ec5f5f-830b-4a58-b067-735a2728e4a6' OR lower(name) = 'moses kanjejo';
