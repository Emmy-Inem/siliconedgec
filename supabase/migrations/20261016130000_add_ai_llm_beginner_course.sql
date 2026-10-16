-- Migration: Add AI for Beginners: Mastering LLMs & Generative AI for 10x Productivity
-- Date: 2026-10-16

DO $$
DECLARE
  v_course_id uuid := 'a11b0001-1111-4000-8000-000000000001';
  v_cat_id uuid;
  v_inst_id uuid;
  v_m1_id uuid := 'a11b0001-1111-4000-8000-000000000011';
  v_m2_id uuid := 'a11b0001-1111-4000-8000-000000000012';
  v_m3_id uuid := 'a11b0001-1111-4000-8000-000000000013';
  v_m4_id uuid := 'a11b0001-1111-4000-8000-000000000014';
BEGIN
  -- Resolve Category ID (AI / Machine Learning if available)
  SELECT id INTO v_cat_id FROM public.categories WHERE slug = 'ai-machine-learning' LIMIT 1;

  -- Resolve Instructor ID if available
  SELECT id INTO v_inst_id FROM public.instructors LIMIT 1;

  -- Insert course if not existing
  IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = v_course_id OR slug = 'ai-beginners-llm-productivity') THEN
    INSERT INTO public.courses (
      id,
      slug,
      title,
      description,
      category,
      category_id,
      price,
      discount_price,
      currency,
      difficulty,
      duration_hours,
      thumbnail_url,
      rating,
      students_enrolled,
      is_published,
      status,
      learning_outcomes,
      whats_included,
      instructor_id,
      cohort_only
    ) VALUES (
      v_course_id,
      'ai-beginners-llm-productivity',
      'AI for Beginners: Mastering LLMs & Generative AI for 10x Productivity',
      'Demystify Large Language Models (ChatGPT, Claude, Gemini, DeepSeek). Master prompt engineering frameworks and build real-world productivity workflows to automate daily work, research, synthesis, writing, and spreadsheet tasks. Save 10+ hours every week and supercharge your everyday productivity.',
      'Artificial Intelligence & Machine Learning',
      v_cat_id,
      45000,
      75000,
      'NGN',
      'Beginner',
      24,
      'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80',
      4.9,
      840,
      true,
      'published',
      ARRAY[
        'Understand LLM fundamentals: tokens, context windows, and model reasoning without technical jargon',
        'Master core prompt engineering frameworks: Few-Shot, Role Prompting, Chain-of-Thought, and Output Constraints',
        'Automate repetitive daily writing: high-impact emails, business proposals, executive summaries, and reports',
        'Extract insights from long documents, analyze messy PDFs, and write advanced spreadsheet formulas in seconds',
        'Build custom AI assistants and GPTs with knowledge bases tailored to your specific workflow or company',
        'Protect confidential data, avoid hallucinations, and follow safe, ethical AI workplace guidelines'
      ],
      ARRAY[
        '24 hours of interactive lessons, practical walkthroughs, and case studies',
        'Prompt Engineering Cheat Sheet + 50+ Copy-Paste Workplace Prompt Templates',
        'Weekly hands-on labs: Document synthesis, Excel automation, and custom GPT creation',
        'Live Q&A sessions with AI practitioners and peer accountability group',
        'Lifetime access to updated lessons as new frontier models are released',
        'Verified Certificate of Completion from Silicon Edge Consulting'
      ],
      v_inst_id,
      false
    );

    -- Module 1
    INSERT INTO public.modules (id, course_id, title, order_index)
    VALUES (v_m1_id, v_course_id, 'Demystifying AI & Large Language Models (LLMs)', 0)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.lessons (id, module_id, title, duration, order_index) VALUES
      (gen_random_uuid(), v_m1_id, 'Welcome to the AI Era: What LLMs Can (and Cannot) Do for You', '25 min', 0),
      (gen_random_uuid(), v_m1_id, 'How LLMs Work: Tokens, Probabilities, and Context Windows Simplified', '35 min', 1),
      (gen_random_uuid(), v_m1_id, 'Comparing Frontier Models: ChatGPT, Claude, Gemini & DeepSeek', '40 min', 2),
      (gen_random_uuid(), v_m1_id, 'Setting Up Your Personal AI Productivity Workspace', '30 min', 3)
    ON CONFLICT DO NOTHING;

    -- Module 2
    INSERT INTO public.modules (id, course_id, title, order_index)
    VALUES (v_m2_id, v_course_id, 'Prompt Engineering: The Skill That Unlocks 10x Quality', 1)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.lessons (id, module_id, title, duration, order_index) VALUES
      (gen_random_uuid(), v_m2_id, 'The Core Framework: Context, Task, Instructions, and Format', '45 min', 0),
      (gen_random_uuid(), v_m2_id, 'Advanced Techniques: Few-Shot Examples and Persona / Role Assignment', '40 min', 1),
      (gen_random_uuid(), v_m2_id, 'Chain-of-Thought & Step-by-Step Reasoning for Complex Decisions', '45 min', 2),
      (gen_random_uuid(), v_m2_id, 'Eliminating Hallucinations: Verification Strategies and Source Grounding', '35 min', 3)
    ON CONFLICT DO NOTHING;

    -- Module 3
    INSERT INTO public.modules (id, course_id, title, order_index)
    VALUES (v_m3_id, v_course_id, '10x Workplace Productivity with LLMs', 2)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.lessons (id, module_id, title, duration, order_index) VALUES
      (gen_random_uuid(), v_m3_id, 'High-Speed Writing: Emails, Proposals, Reports, and Executive Summaries', '50 min', 0),
      (gen_random_uuid(), v_m3_id, 'Deep Reading & Synthesis: Summarizing 50-page PDFs and Research in Minutes', '45 min', 1),
      (gen_random_uuid(), v_m3_id, 'Spreadsheet Magic: Excel & Google Sheets Formulas, Macros, and Data Cleaning', '55 min', 2),
      (gen_random_uuid(), v_m3_id, 'Everyday Coding & Scripting for Non-Developers', '60 min', 3)
    ON CONFLICT DO NOTHING;

    -- Module 4
    INSERT INTO public.modules (id, course_id, title, order_index)
    VALUES (v_m4_id, v_course_id, 'Custom AI Assistants & Ethical Best Practices', 3)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.lessons (id, module_id, title, duration, order_index) VALUES
      (gen_random_uuid(), v_m4_id, 'Building Custom GPTs and Claude Projects with Knowledge Files', '60 min', 0),
      (gen_random_uuid(), v_m4_id, 'Data Privacy, Enterprise Security, and Confidentiality Protocols', '35 min', 1),
      (gen_random_uuid(), v_m4_id, 'Capstone Project: Designing Your Personal AI Productivity System', '90 min', 2)
    ON CONFLICT DO NOTHING;

  END IF;
END $$;
