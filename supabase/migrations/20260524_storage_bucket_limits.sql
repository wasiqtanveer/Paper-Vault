-- The 5MB / image-only check was client-side only. Enforce it on the bucket.
update storage.buckets
   set file_size_limit    = 5242880,
       allowed_mime_types = array['image/jpeg','image/png','image/webp']
 where id = 'papers';
