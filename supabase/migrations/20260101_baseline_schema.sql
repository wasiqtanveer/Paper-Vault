-- Baseline schema, captured from the live project so the database can be rebuilt
-- from the repo. Every statement is idempotent. Later migrations add the RLS
-- policies, triggers and constraints on top of these tables.
-- Order matters: profiles -> subjects/teachers -> papers -> the rest.

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  email      text,
  role       text default 'student',
  created_at timestamptz default now()
);

create table if not exists public.subjects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz default now()
);

create table if not exists public.teachers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz default now(),
  department text check (department is null or char_length(btrim(department)) between 2 and 60)
);

create table if not exists public.papers (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  subject_id       uuid references public.subjects(id) on delete set null,
  year             integer not null,
  semester         text,
  image_url        text not null,
  uploader_id      uuid references public.profiles(id) on delete cascade,
  status           text default 'pending',
  uploaded_at      timestamptz default now(),
  reviewed_at      timestamptz,
  reviewed_by      uuid references public.profiles(id),
  teacher_id       uuid references public.teachers(id) on delete set null,
  exam_type        text,
  uploader_name    text,
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 200)
);

create table if not exists public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  action      text not null,
  actor_id    uuid references public.profiles(id) on delete set null,
  actor_name  text,
  paper_id    uuid,
  paper_title text,
  meta        jsonb,
  created_at  timestamptz default now(),
  actor_role  text
);

create table if not exists public.hall_of_fame (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name       text not null,
  role       text,
  note       text,
  github     text,
  linkedin   text,
  website    text,
  email      text
);

-- reports and app_settings: see 20260520_reports_rls.sql / 20260521_app_settings_rls.sql
-- catalog_requests: see supabase/migrations/20260204_catalog_requests.sql
