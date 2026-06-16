-- Storage policies for the public `papers` bucket. Objects live at
-- papers/<uid>/<timestamp>.<ext>, so the second path segment is the owner.
-- Before: any signed-in user could upload to any path.
drop policy if exists "auth upload papers"      on storage.objects;
drop policy if exists "auth delete own papers"  on storage.objects;
drop policy if exists "public read papers"      on storage.objects;

create policy "public read papers" on storage.objects
  for select using (bucket_id = 'papers');

create policy "auth upload papers" on storage.objects
  for insert with check (
    bucket_id = 'papers'
    and (storage.foldername(name))[1] = 'papers'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

-- Owners remove their own files; staff can remove any (deleting someone's paper).
create policy "auth delete own papers" on storage.objects
  for delete using (
    bucket_id = 'papers'
    and ((storage.foldername(name))[2] = (select auth.uid())::text or (select public.is_staff()))
  );
