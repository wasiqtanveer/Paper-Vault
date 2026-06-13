-- The reports table had RLS enabled and no policies (and no DDL in the repo), so
-- every client insert/select was denied, and the Mod dashboard's "resolve"
-- wrote columns (resolved, resolved_at, resolved_by) that did not exist.
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  paper_id    uuid references public.papers(id)   on delete cascade,
  reporter_id uuid references public.profiles(id) on delete cascade,
  reason      text,
  created_at  timestamptz default now()
);
alter table public.reports
  add column if not exists resolved    boolean not null default false,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references public.profiles(id) on delete set null;

alter table public.reports enable row level security;
drop policy if exists reports_insert on public.reports;
drop policy if exists reports_select on public.reports;
drop policy if exists reports_update on public.reports;
drop policy if exists reports_delete on public.reports;

-- Anyone signed in may report, only as themselves.
create policy reports_insert on public.reports
  for insert with check (reporter_id = (select auth.uid()));
-- Staff read and resolve; a reporter can see their own.
create policy reports_select on public.reports
  for select using (reporter_id = (select auth.uid()) or (select public.is_staff()));
create policy reports_update on public.reports
  for update using ((select public.is_staff())) with check ((select public.is_staff()));
create policy reports_delete on public.reports
  for delete using ((select public.is_admin()));
