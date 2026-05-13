-- Block non-staff from changing a paper's moderation status.
-- papers_update lets an uploader edit their own row, which also let them set
-- status = 'approved' from the browser console. Same pattern as
-- guard_profile_role: enforce at the table so it holds whatever policies are live.
create or replace function public.guard_paper_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Service role / SQL editor / bulk imports have no auth.uid(); only guard client calls.
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    if not public.is_staff() then new.status := 'pending'; end if;
    return new;
  end if;
  if not public.is_staff() then
    if new.status is distinct from old.status then
      raise exception 'insufficient privilege: only staff can change a paper''s status';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists papers_guard_review on public.papers;
create trigger papers_guard_review before insert or update on public.papers
  for each row execute function public.guard_paper_review();

revoke all on function public.guard_paper_review() from public, anon, authenticated;
