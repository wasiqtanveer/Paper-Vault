-- Browse built its Years filter by downloading the year of every approved paper.
-- Return the distinct years from the database instead. SECURITY INVOKER, so RLS
-- still decides which papers are visible.
create or replace function public.paper_years()
returns table (year integer)
language sql stable security invoker set search_path = public as $$
  select distinct p.year from public.papers p where p.status = 'approved' order by p.year desc
$$;
grant execute on function public.paper_years() to anon, authenticated;
