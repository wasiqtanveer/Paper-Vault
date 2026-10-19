#!/usr/bin/env bash
# Read-only checks against the linked remote Supabase project.
# The queries are the VERIFY blocks from the SQL files in supabase/migrations.
# Requires `npx supabase link` first. Nothing here writes.
set -euo pipefail

run() {
  echo
  echo "-- $1"
  npx supabase db query --remote --read-only "$2"
}

# 20260201_rls_fix.sql: the SQL editor bypasses RLS, so these confirm RLS is on and the
# triggers exist rather than probing as a student.
run "RLS enabled on every public table (expect rowsecurity = true for all)" \
  "select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename;"
run "Guard and stamp triggers present" \
  "select event_object_table, trigger_name from information_schema.triggers where trigger_schema = 'public' and trigger_name in ('profiles_guard_role','papers_guard_review','activity_stamp_actor','papers_set_uploader_name','profiles_sync_uploader_name') group by 1, 2 order by 1, 2;"

# 20260202_rejection_reason.sql
run "Rejection reasons" \
  "select id, status, rejection_reason from public.papers where status = 'rejected' limit 5;"

# 20260203_uploader_name.sql
run "Uploader names are stamped" \
  "select title, uploader_name from public.papers limit 5;"

# 20260205_teachers_departments.sql: expect no rows
run "Teachers without a title (expect none)" \
  "select name, department from public.teachers where name !~ '^(Mr|Ms|Mrs|Dr)\. ' order by name;"
