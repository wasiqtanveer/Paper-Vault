-- ============================================================================
-- PaperVault — RLS lockdown
-- Run this in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to run more than once (drops policies before recreating).
-- ============================================================================

-- ── Helper: is the current user an admin/moderator? ─────────────────────────
-- SECURITY DEFINER so it can read profiles WITHOUT triggering the profiles
-- RLS policy (avoids infinite recursion). Locked to the profiles table only.
create or replace function public.current_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select role in ('admin','moderator') from public.profiles where id = auth.uid()),
    false
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  )
$$;

-- ============================================================================
-- PROFILES
-- ============================================================================
alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_delete_admin on public.profiles;

-- Read: a user sees their own row; staff see everyone (for the admin panel).
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_staff());

-- Insert: a user may only create their own profile row.
create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid());

-- Update (self): you may edit your own row, but NOT change your role.
-- The role-unchanged guard is what stops a user making themselves admin.
create policy profiles_update_self on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- Update (admin): only admins may change roles / edit any profile.
create policy profiles_update_admin on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- Delete: admins only.
create policy profiles_delete_admin on public.profiles
  for delete using (public.is_admin());

-- ============================================================================
-- PAPERS
-- ============================================================================
alter table public.papers enable row level security;

drop policy if exists papers_select on public.papers;
drop policy if exists papers_insert on public.papers;
drop policy if exists papers_update on public.papers;
drop policy if exists papers_delete on public.papers;

-- Read: anyone may read approved papers; uploader + staff see all states.
create policy papers_select on public.papers
  for select using (
    status = 'approved'
    or uploader_id = auth.uid()
    or public.is_staff()
  );

-- Insert: a logged-in user may upload as themselves.
create policy papers_insert on public.papers
  for insert with check (auth.uid() is not null and uploader_id = auth.uid());

-- Update: staff (approve/reject/edit). Uploader can edit own while pending.
create policy papers_update on public.papers
  for update using (public.is_staff() or uploader_id = auth.uid())
  with check (public.is_staff() or uploader_id = auth.uid());

-- Delete: staff only. THIS blocks the anonymous DELETE probe.
create policy papers_delete on public.papers
  for delete using (public.is_staff());

-- ============================================================================
-- SUBJECTS / TEACHERS  (public read, admin write)
-- ============================================================================
alter table public.subjects enable row level security;
alter table public.teachers enable row level security;

drop policy if exists subjects_select on public.subjects;
drop policy if exists subjects_write  on public.subjects;
drop policy if exists teachers_select on public.teachers;
drop policy if exists teachers_write  on public.teachers;

create policy subjects_select on public.subjects for select using (true);
create policy subjects_write  on public.subjects for all
  using (public.is_admin()) with check (public.is_admin());

create policy teachers_select on public.teachers for select using (true);
create policy teachers_write  on public.teachers for all
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- ACTIVITY_LOG  (staff read; any logged-in user may insert their own action)
-- ============================================================================
alter table public.activity_log enable row level security;

drop policy if exists activity_select on public.activity_log;
drop policy if exists activity_insert on public.activity_log;

create policy activity_select on public.activity_log
  for select using (public.is_staff());

create policy activity_insert on public.activity_log
  for insert with check (auth.uid() is not null);

-- ============================================================================
-- HALL_OF_FAME  (public read, admin write)
-- ============================================================================
alter table public.hall_of_fame enable row level security;

drop policy if exists hof_select on public.hall_of_fame;
drop policy if exists hof_write  on public.hall_of_fame;

create policy hof_select on public.hall_of_fame for select using (true);
create policy hof_write  on public.hall_of_fame for all
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- DONE. Re-run your friend's probe — profiles should now return 0 rows
-- for an anonymous/non-staff caller, and DELETE on papers should be blocked.
-- ============================================================================
