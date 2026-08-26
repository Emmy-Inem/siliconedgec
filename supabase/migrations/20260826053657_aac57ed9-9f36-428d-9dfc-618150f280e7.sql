UPDATE public.blog_posts
SET content = REPLACE(content, '](/learning-paths)', '](/paths)'),
    updated_at = now()
WHERE content LIKE '%](/learning-paths)%';