-- ============================================================================
-- PaperVault — public attribution for uploads
-- Run in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to run more than once.
-- ============================================================================
--
-- THE PROBLEM
-- Browse and Home read the uploader's name by embedding the profiles row:
--     papers?select=*,profiles!papers_uploader_id_fkey(full_name)
-- but profiles_select in supabase_rls_fix.sql (correctly) restricts profiles to
--     id = auth.uid() or public.is_staff()
-- so a student sees a name only on their own uploads. Everything else renders
-- "Unknown", while admins and moderators see every name.
--
-- WHAT THIS DOES *NOT* DO
-- It does not touch profiles RLS. No policy here grants any new read access to
-- that table — emails, roles, and every other profile column stay exactly as
-- locked down as they are today. Widening profiles_select to fix a display
-- string would re-open the surface the lockdown was written to close.
--
-- WHAT IT DOES INSTEAD
-- Stores the display name on the paper itself, written by a trigger rather than
-- by the client. Three reasons this is the right shape and not just a
-- workaround:
--   * Attribution is a historical fact. If someone later changes their display
--     name, who uploaded a paper in 2024 did not change.
--   * It removes a join from every list query on the two hottest pages.
--   * The client never supplies the value, so it cannot be forged.
--
-- WHAT BECOMES VISIBLE
-- papers_select already allows anyone to read approved papers. After this,
-- those rows carry the uploader's display name — public attribution on a public
-- library, which is the intent. No other profile field is exposed. If you would
-- rather names were visible only to signed-in users, say so and this needs a
-- different shape; the app's auth wall does not protect the API on its own.
-- ============================================================================

-- ── 1. The column ───────────────────────────────────────────────────────────
alter table public.papers
  add column if not exists uploader_name text;

-- ── 2. Backfill existing rows ───────────────────────────────────────────────
-- Runs as the SQL editor's privileged role, so it reads profiles regardless of
-- RLS. This is the only place profiles is read in bulk, and it writes nothing
-- back to it.
update public.papers p
set    uploader_name = pr.full_name
from   public.profiles pr
where  pr.id = p.uploader_id
  and  p.uploader_name is distinct from pr.full_name;

-- ── 3. Stamp the name on insert, from the server ────────────────────────────
-- SECURITY DEFINER so it can read profiles without granting the caller any
-- access to it. It derives the name from NEW.uploader_id and ignores whatever
-- the client sent, so a user cannot upload a paper under someone else's name.
-- papers_insert already constrains uploader_id = auth.uid(), so in practice a
-- user can only ever stamp their own.
--
-- `set search_path = public` is required on every SECURITY DEFINER function: it
-- stops a caller redefining the schema resolution to point these lookups at a
-- table they control.
create or replace function public.set_uploader_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select full_name
    into new.uploader_name
    from public.profiles
   where id = new.uploader_id;
  return new;
end;
$$;

drop trigger if exists papers_set_uploader_name on public.papers;
create trigger papers_set_uploader_name
  before insert or update of uploader_id on public.papers
  for each row execute function public.set_uploader_name();

-- ── 4. Keep it current when someone renames themselves ──────────────────────
-- Bounded to the papers of the profile row that actually changed, so it can
-- never write to another user's rows.
create or replace function public.sync_uploader_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.full_name is distinct from old.full_name then
    update public.papers
       set uploader_name = new.full_name
     where uploader_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_uploader_name on public.profiles;
create trigger profiles_sync_uploader_name
  after update of full_name on public.profiles
  for each row execute function public.sync_uploader_name();

-- ── 5. Lock down the helpers ────────────────────────────────────────────────
-- Trigger functions are invoked by the trigger, never called directly. Revoking
-- EXECUTE stops a client calling a SECURITY DEFINER function on its own terms.
revoke all on function public.set_uploader_name()  from public, anon, authenticated;
revoke all on function public.sync_uploader_name() from public, anon, authenticated;

-- ============================================================================
-- VERIFY
--   select title, uploader_name from public.papers limit 5;      -- names present
--   -- then, signed out or as a student, confirm profiles is still sealed:
--   select * from public.profiles;                               -- expect 0 rows
-- ============================================================================
