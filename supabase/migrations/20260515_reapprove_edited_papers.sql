-- An uploader editing an approved paper changed public content with no re-review.
-- When a non-staff user changes a content field of an approved paper, send it
-- back to 'pending'. Replaces guard_paper_review (same signature) so the trigger
-- keeps pointing at it.
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
    if old.status = 'approved' and (
         new.title      is distinct from old.title
      or new.subject_id is distinct from old.subject_id
      or new.teacher_id is distinct from old.teacher_id
      or new.year       is distinct from old.year
      or new.semester   is distinct from old.semester
      or new.exam_type  is distinct from old.exam_type
      or new.image_url  is distinct from old.image_url) then
      new.status      := 'pending';
      new.reviewed_by := null;
      new.reviewed_at := null;
    end if;
  end if;
  return new;
end; $$;
