-- Lock reviewed_by / reviewed_at / rejection_reason to staff.
-- An uploader could previously write these on their own row, faking a review
-- or planting a rejection reason on an approved paper.
create or replace function public.guard_paper_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Service role / SQL editor / bulk imports have no auth.uid(); only guard client calls.
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    if not public.is_staff() then
      new.status           := 'pending';
      new.reviewed_by      := null;
      new.reviewed_at      := null;
      new.rejection_reason := null;
    end if;
    return new;
  end if;
  if not public.is_staff() then
    if new.status is distinct from old.status then
      raise exception 'insufficient privilege: only staff can change a paper''s status';
    end if;
    if new.reviewed_by      is distinct from old.reviewed_by
    or new.reviewed_at      is distinct from old.reviewed_at
    or new.rejection_reason is distinct from old.rejection_reason then
      raise exception 'insufficient privilege: review fields are staff-only';
    end if;
  end if;
  return new;
end; $$;
