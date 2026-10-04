-- ============================================================================
-- PaperVault — rejection reasons
-- Run in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to run more than once. Run it BEFORE deploying the matching app change:
-- the app now writes this column when a moderator rejects a paper.
-- ============================================================================
--
-- No policy changes needed. papers_select already lets an uploader read their
-- own paper in every state, and papers_update already lets staff write it, so
-- the reason reaches exactly the uploader and staff — same as the row itself.
-- Approving a paper clears the reason, so it never lingers on a public row.

alter table public.papers
  add column if not exists rejection_reason text;

alter table public.papers
  drop constraint if exists papers_rejection_reason_len;
alter table public.papers
  add constraint papers_rejection_reason_len
  check (rejection_reason is null or char_length(rejection_reason) <= 200);

-- VERIFY
--   select id, status, rejection_reason from public.papers where status = 'rejected' limit 5;
