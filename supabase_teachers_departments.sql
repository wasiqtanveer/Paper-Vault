-- ============================================================================
-- PaperVault - teacher titles, departments, and the activity-log fix
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run
--   (or: npx supabase db query --remote -f supabase_teachers_departments.sql)
-- Safe to run more than once: every step is idempotent.
-- Run AFTER supabase_catalog_requests.sql.
-- ============================================================================

begin;

-- ── 1. Activity log: the column every client insert already sends ───────────
-- The app has always written actor_role, but the column never existed, so
-- Postgres rejected every insert after the first and the admin log stayed at a
-- single row.
alter table public.activity_log add column if not exists actor_role text;

-- ── 2. Departments ──────────────────────────────────────────────────────────
alter table public.teachers
  add column if not exists department text;
alter table public.teachers drop constraint if exists teachers_department_len;
alter table public.teachers add constraint teachers_department_len
  check (department is null or char_length(btrim(department)) between 2 and 60);

alter table public.catalog_requests
  add column if not exists department text;
alter table public.catalog_requests drop constraint if exists catalog_requests_department_len;
alter table public.catalog_requests add constraint catalog_requests_department_len
  check (department is null or char_length(btrim(department)) between 2 and 60);

-- ── 3. Normalise existing teacher names to Mr. / Ms. / Mrs. / Dr. ───────────
--   "Sir X"                    -> "Mr. X"
--   "Ma'am X" / "Madam X" / "Miss X" -> "Ms. X"   (Ms. makes no marital assumption)
--   "Name ( Physics )"         -> name "…", department "Physics"
create temp table _teacher_fix on commit drop as
select
  id,
  name as old_name,
  btrim(regexp_replace(
    regexp_replace(
      regexp_replace(name, '^\s*sir\s+', 'Mr. ', 'i'),
      '^\s*(ma''am|maam|madam|miss)\s+', 'Ms. ', 'i'),
    '\s*\(\s*[^)]*\)\s*$', '')) as new_name,
  nullif(btrim(substring(name from '\(\s*([^)]*?)\s*\)\s*$')), '') as dept
from public.teachers;

-- Auto-built paper titles embed the teacher's name ("… — Sir Muneer Umer — …").
-- Rewrite only papers linked to that teacher, so unrelated text is untouched.
update public.papers p
set title = replace(p.title, f.old_name, f.new_name)
from _teacher_fix f
where p.teacher_id = f.id
  and f.old_name <> f.new_name
  and position(f.old_name in p.title) > 0;

update public.teachers t
set name = f.new_name,
    department = coalesce(t.department, f.dept)
from _teacher_fix f
where t.id = f.id
  and (f.old_name <> f.new_name or (f.dept is not null and t.department is null));

commit;

-- Check: every teacher should now start with a title.
--   select name, department from public.teachers
--   where name !~ '^(Mr|Ms|Mrs|Dr)\. ' order by name;
