-- app_settings had RLS enabled and no policies, so Register could neither read
-- nor write the shared email rate-limit countdown. Allow exactly that one key,
-- readable and writable by anyone (signup happens before sign-in), numeric only.
create table if not exists public.app_settings (
  key   text primary key,
  value text
);
insert into public.app_settings (key, value) values ('email_ratelimit_until', '0')
  on conflict (key) do nothing;

alter table public.app_settings enable row level security;
drop policy if exists app_settings_select on public.app_settings;
drop policy if exists app_settings_update on public.app_settings;

create policy app_settings_select on public.app_settings
  for select using (key = 'email_ratelimit_until');
create policy app_settings_update on public.app_settings
  for update using (key = 'email_ratelimit_until')
  with check (key = 'email_ratelimit_until' and value ~ '^[0-9]{1,15}$');
