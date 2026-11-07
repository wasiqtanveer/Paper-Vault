#!/usr/bin/env bash
# RLS regression check. Acts as a plain student and tries the abuses the
# policies and triggers are meant to stop, expecting every one to fail:
#   1. self-approving an own paper            (guard_paper_review)
#   2. writing review columns on an own paper (guard_paper_review)
#   3. deleting an approved paper             (papers_delete policy)
#   4. forging an activity_log actor          (activity_insert policy)
#
# Usage: scripts/rls-regression.sh <student-user-uuid> [--yes]
# The student must own at least one pending paper and one approved paper.
# Everything runs inside a transaction that is always rolled back, so nothing
# persists. Needs a linked project (npx supabase link). `--yes` is required
# because the CLI treats any non-read-only statement as a mutation.
set -euo pipefail

STUDENT="${1:?usage: rls-regression.sh <student-user-uuid> [--yes]}"
CONFIRM="${2:-}"

read -r -d '' SQL <<SQL_EOF || true
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '${STUDENT}', 'role', 'authenticated')::text, true);

do \$\$
declare
  own_pending  uuid;
  own_approved uuid;
  n int;
begin
  select id into own_pending  from public.papers where uploader_id = '${STUDENT}' and status = 'pending'  limit 1;
  select id into own_approved from public.papers where uploader_id = '${STUDENT}' and status = 'approved' limit 1;

  -- 1. self-approve must raise
  begin
    update public.papers set status = 'approved' where id = own_pending;
    raise exception 'FAIL: student could self-approve';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;

  -- 2. review columns must raise
  begin
    update public.papers set reviewed_by = '${STUDENT}' where id = own_pending;
    raise exception 'FAIL: student could write reviewed_by';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;

  -- 3. deleting an approved paper must remove zero rows
  delete from public.papers where id = own_approved;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: student deleted an approved paper'; end if;

  -- 4. forged actor must be rejected by the insert policy
  begin
    insert into public.activity_log (action, actor_id) values ('approve', gen_random_uuid());
    raise exception 'FAIL: student forged an activity_log actor';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;

  raise exception 'RLS_OK';
end \$\$;
rollback;
SQL_EOF

# The block always ends in an exception: RLS_OK means every abuse was blocked.
if out=$(npx supabase db query --remote ${CONFIRM:+--yes} "$SQL" 2>&1); then
  echo "$out"
else
  if echo "$out" | grep -q "RLS_OK"; then
    echo "OK: all four abuses were blocked."
  else
    echo "$out"
    echo "REGRESSION: see FAIL line above." >&2
    exit 1
  fi
fi
