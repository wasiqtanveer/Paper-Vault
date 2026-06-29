-- full_name had no length limit anywhere.
update public.profiles set full_name = left(btrim(full_name), 60) where full_name is not null and char_length(full_name) > 60;
alter table public.profiles drop constraint if exists profiles_full_name_length;
alter table public.profiles add constraint profiles_full_name_length
  check (full_name is null or char_length(full_name) <= 60);
