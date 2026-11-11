-- Run only against the owned Supabase destination after the public objects have been copied.
-- Private files and links without a matching destination object remain untouched.
begin;

create temporary table copied_public_image_urls on commit drop as
select
  'https://sdddxnjlgjjaoayyraxn.supabase.co/storage/v1/object/public/' || o.bucket_id || '/' || o.name as source_url,
  'https://jhrytvbpxftwpasqdybk.supabase.co/storage/v1/object/public/' || o.bucket_id || '/' || o.name as destination_url
from storage.objects o
join storage.buckets b on b.id = o.bucket_id
where b.public and o.bucket_id in ('course-thumbnails', 'site-media');

update public.courses c
set thumbnail_url = m.destination_url || substr(c.thumbnail_url, length(m.source_url) + 1)
from copied_public_image_urls m
where split_part(c.thumbnail_url, '?', 1) = m.source_url;

update public.testimonials t
set avatar_url = m.destination_url || substr(t.avatar_url, length(m.source_url) + 1)
from copied_public_image_urls m
where split_part(t.avatar_url, '?', 1) = m.source_url;

commit;
