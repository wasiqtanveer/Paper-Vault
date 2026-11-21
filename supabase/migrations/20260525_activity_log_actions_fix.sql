-- The action CHECK added in 20260519 missed the admin-panel actions (subject/
-- teacher/Hall of Fame changes), so logging them would have been rejected.
-- Replace it with the full set the app writes.
alter table public.activity_log drop constraint if exists activity_log_action_check;
alter table public.activity_log add constraint activity_log_action_check
  check (action in (
    'upload', 'approve', 'reject', 'restore', 'delete', 'role_change',
    'subject_add', 'subject_delete', 'teacher_add', 'teacher_delete',
    'request_approve', 'request_decline', 'hof_add', 'hof_remove'
  ));
