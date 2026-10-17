-- ============================================================================
-- PaperVault - "Request a subject / teacher"
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Safe to run more than once. Depends on public.is_admin() from supabase/migrations/20260201_rls_fix.sql.
-- ============================================================================

create table if not exists public.catalog_requests (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('subject', 'teacher')),
  name         text not null check (char_length(btrim(name)) between 2 and 80),
  department   text check (department is null or char_length(btrim(department)) between 2 and 60),
  requested_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at   timestamptz not null default now(),
  reviewed_by  uuid references public.profiles(id) on delete set null,
  reviewed_at  timestamptz,
  -- A teacher is always "Mr. / Ms. / Mrs. / Dr. <name>". Enforced here, not
  -- only in the form, so a hand-crafted request can't skip the title.
  constraint teacher_has_title check (kind <> 'teacher' or name ~ '^(Mr|Ms|Mrs|Dr)\. \S')
);

-- One open request per name: stops duplicate spam and double-clicks.
create unique index if not exists catalog_requests_open_unique
  on public.catalog_requests (kind, lower(btrim(name))) where status = 'pending';
create index if not exists catalog_requests_status_idx
  on public.catalog_requests (status, created_at desc);

alter table public.catalog_requests enable row level security;

drop policy if exists catreq_select on public.catalog_requests;
drop policy if exists catreq_insert on public.catalog_requests;
drop policy if exists catreq_update on public.catalog_requests;
drop policy if exists catreq_delete on public.catalog_requests;

-- You see your own requests; admins see all.
create policy catreq_select on public.catalog_requests
  for select using (requested_by = (select auth.uid()) or (select public.is_admin()));

-- Anyone signed in may file a request, only as themselves, only as pending.
create policy catreq_insert on public.catalog_requests
  for insert with check (
    (select auth.uid()) is not null
    and requested_by = (select auth.uid())
    and status = 'pending'
  );

-- Only admins review or clear requests (subjects/teachers are admin-write anyway).
create policy catreq_update on public.catalog_requests
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy catreq_delete on public.catalog_requests
  for delete using ((select public.is_admin()));
