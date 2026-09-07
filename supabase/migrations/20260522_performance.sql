-- ============================================================================
-- PaperVault — performance: indexes + cheaper RLS
-- Run in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to run more than once. Changes no data and no access rules.
-- ============================================================================

-- ── Indexes ─────────────────────────────────────────────────────────────────
-- Home/Browse: WHERE status = 'approved' ORDER BY uploaded_at DESC
create index if not exists papers_status_uploaded_idx
  on public.papers (status, uploaded_at desc);

-- Browse filters
create index if not exists papers_subject_idx  on public.papers (subject_id);
create index if not exists papers_year_idx     on public.papers (year);

-- Profile page ("my uploads"), moderator stats, and the RLS uploader check
create index if not exists papers_uploader_idx on public.papers (uploader_id, uploaded_at desc);
create index if not exists papers_reviewer_idx on public.papers (reviewed_by);

-- Admin activity log / reports lists
create index if not exists activity_log_created_idx on public.activity_log (created_at desc);
create index if not exists reports_created_idx      on public.reports (created_at desc);

-- ── RLS: evaluate the role lookup once per query, not once per row ──────────
-- `public.is_staff()` written bare is re-run for every candidate row.
-- Wrapped in (select …) Postgres hoists it into a single InitPlan.
-- Same rules as supabase/migrations/20260201_rls_fix.sql — only the evaluation strategy changes.
drop policy if exists papers_select on public.papers;
create policy papers_select on public.papers
  for select using (
    status = 'approved'
    or uploader_id = (select auth.uid())
    or (select public.is_staff())
  );

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = (select auth.uid()) or (select public.is_staff()));

drop policy if exists papers_update on public.papers;
create policy papers_update on public.papers
  for update using ((select public.is_staff()) or uploader_id = (select auth.uid()))
  with check ((select public.is_staff()) or uploader_id = (select auth.uid()));

analyze public.papers;
