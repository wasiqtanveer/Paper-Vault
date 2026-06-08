-- papers_delete was staff-only, but Profile and PaperViewer show owners a Delete
-- button. RLS filtered the DELETE to 0 rows and returned no error, so the UI
-- reported success while nothing was removed. Owners may delete their own
-- papers that are not yet approved; approved papers stay staff-only.
drop policy if exists papers_delete on public.papers;
create policy papers_delete on public.papers
  for delete using (
    (select public.is_staff())
    or (uploader_id = (select auth.uid()) and status <> 'approved')
  );
