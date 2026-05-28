-- ============================================================================
-- CR Attendance — RLS hardening (behavior-preserving cleanup)
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run.
-- Audited 2026-06-07: RLS was already correctly scoped to auth.uid() on all
-- tables; no qual=true leak (unlike Paper Vault), and profiles has no role
-- column so there is no self-promotion path. This file just makes the existing
-- protection explicit: scope to `authenticated` + add with_check on writes.
-- ============================================================================

-- PROFILES: a user sees & edits only their own row.
drop policy if exists "CR owns their profile" on public.profiles;
create policy "profiles_self" on public.profiles
  for all to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- COURSES: a CR owns only courses where they are the cr_id.
drop policy if exists "CR owns their courses" on public.courses;
create policy "courses_owner" on public.courses
  for all to authenticated
  using (auth.uid() = cr_id)
  with check (auth.uid() = cr_id);

-- STUDENTS: scoped to courses the CR owns (read + write).
drop policy if exists "CR owns their students" on public.students;
create policy "students_by_course" on public.students
  for all to authenticated
  using (exists (select 1 from courses
                 where courses.id = students.course_id
                   and courses.cr_id = auth.uid()))
  with check (exists (select 1 from courses
                      where courses.id = students.course_id
                        and courses.cr_id = auth.uid()));

-- ATTENDANCE: scoped to courses the CR owns (read + write).
drop policy if exists "CR owns their attendance" on public.attendance;
create policy "attendance_by_course" on public.attendance
  for all to authenticated
  using (exists (select 1 from courses
                 where courses.id = attendance.course_id
                   and courses.cr_id = auth.uid()))
  with check (exists (select 1 from courses
                      where courses.id = attendance.course_id
                        and courses.cr_id = auth.uid()));
