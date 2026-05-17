-- Any signed-in user could insert any actor_name / actor_role, so the audit log
-- could be forged. Stamp both from the caller's profile on the server.
-- Also drops two legacy duplicate policies ("auth insert log", "admin read log")
-- that were never part of the repo and made the tightened insert policy moot.
create or replace function public.stamp_activity_actor()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;  -- service role / SQL editor
  select full_name, role into new.actor_name, new.actor_role
    from public.profiles where id = auth.uid();
  return new;
end; $$;

drop trigger if exists activity_stamp_actor on public.activity_log;
create trigger activity_stamp_actor before insert on public.activity_log
  for each row execute function public.stamp_activity_actor();
revoke all on function public.stamp_activity_actor() from public, anon, authenticated;

drop policy if exists "auth insert log" on public.activity_log;
drop policy if exists "admin read log"  on public.activity_log;
