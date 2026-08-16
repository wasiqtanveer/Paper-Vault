-- ============================================================================
-- PaperVault — RLS lockdown + role hardening
-- Run in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to run more than once (drops policies before recreating).
--
-- This file is the single source of truth for the deployed policy set. Re-run it
-- in full after any schema change, then re-probe — an earlier revision of it had
-- silently drifted (profiles_update_self was missing from the database despite
-- being defined here), which is exactly the failure this file exists to prevent.
-- ============================================================================

-- ── Helpers ─────────────────────────────────────────────────────────────────
-- SECURITY DEFINER so they can read profiles WITHOUT triggering the profiles
-- RLS policy (which would recurse). `set search_path` is mandatory on every
-- definer function: without it a caller can redirect these lookups at a table
-- they control.
create or replace function public.is_staff() returns boolean
language sql security definer set search_path = public stable as $$
  select coalesce((select role in ('admin','moderator') from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

-- ============================================================================
-- PROFILES
-- ============================================================================
alter table public.profiles enable row level security;

drop policy if exists profiles_select       on public.profiles;
drop policy if exists profiles_insert_self  on public.profiles;
drop policy if exists profiles_update_self  on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
drop policy if exists profiles_delete_admin on public.profiles;

-- Read: your own row; staff see everyone (the admin panel needs it).
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_staff());

-- Insert: your own row only, and never as staff. The role guard matters because
-- a user whose profile row is somehow missing could otherwise insert themselves
-- as an admin and pass the check.
create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid() and role = 'student');

-- Update: your own row. The role guard lives in the trigger below, not here.
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_update_admin on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

create policy profiles_delete_admin on public.profiles
  for delete using (public.is_admin());

-- ── Role enforcement at the table, not only in policy ───────────────────────
-- RLS configuration has been observed to drift. A trigger holds regardless of
-- which policies happen to be live, and covers every write path including any
-- added later. This is what actually blocks the console self-promotion attack.
create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    -- Role is never accepted from a client or from signup metadata.
    if new.role is distinct from 'student' and not public.is_admin() then
      new.role := 'student';
    end if;
    return new;
  end if;
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'insufficient privilege: role may only be changed by an admin';
  end if;
  return new;
end; $$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role before insert or update on public.profiles
  for each row execute function public.guard_profile_role();

revoke all on function public.guard_profile_role() from public, anon, authenticated;

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
  for select using (status = 'approved' or uploader_id = auth.uid() or public.is_staff());

create policy papers_insert on public.papers
  for insert with check (auth.uid() is not null and uploader_id = auth.uid());

create policy papers_update on public.papers
  for update using (public.is_staff() or uploader_id = auth.uid())
  with check (public.is_staff() or uploader_id = auth.uid());

-- Delete: staff only. This blocks the anonymous DELETE probe.
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

create policy activity_select on public.activity_log for select using (public.is_staff());
create policy activity_insert on public.activity_log for insert with check (auth.uid() is not null);

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
-- VERIFY (expected results for an anonymous or student caller)
--   select * from public.profiles;      -- 0 rows
--   select * from public.activity_log;  -- 0 rows
--   update public.profiles set role='admin' where id = auth.uid();
--                                       -- ERROR: insufficient privilege
-- ============================================================================
