-- deleteImage recovered the storage path by string-searching the public URL.
-- Store the path on the row instead, and backfill it from existing URLs.
alter table public.papers add column if not exists image_path text;
update public.papers
   set image_path = substring(image_url from '/object/public/papers/(.*)$')
 where image_path is null and image_url like '%/object/public/papers/%';
