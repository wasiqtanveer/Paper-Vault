-- activity.js documents the allowed actions but nothing enforced them.
alter table public.activity_log drop constraint if exists activity_log_action_check;
alter table public.activity_log add constraint activity_log_action_check
  check (action in ('upload','approve','reject','delete','restore','role_change','request_approve','request_decline'))
  not valid;
alter table public.activity_log validate constraint activity_log_action_check;
