-- actor_id was not tied to the caller, so one user could log actions as another.
drop policy if exists activity_insert on public.activity_log;
create policy activity_insert on public.activity_log
  for insert with check (actor_id = (select auth.uid()));
