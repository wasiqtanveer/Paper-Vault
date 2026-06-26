-- Report reasons had no length limit, and nothing stopped one user flooding a
-- paper with identical reports. Cap the reason and allow one open report per
-- user per paper.
alter table public.reports drop constraint if exists reports_reason_length;
alter table public.reports add constraint reports_reason_length
  check (reason is null or char_length(btrim(reason)) between 3 and 500) not valid;
create unique index if not exists reports_one_open_per_user
  on public.reports (paper_id, reporter_id) where not resolved;
