<div align="center">

# PaperVault

**A full-stack past paper sharing platform for students.**  
Upload exam papers, get them reviewed, and build a searchable vault for your university.

[![React](https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=flat&logo=framer&logoColor=white)](https://www.framer.com/motion)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)](https://vercel.com)

</div>

---

<!-- ─────────────────────────────────────────── -->
<!-- SCREENSHOT SECTION                          -->
<!-- Replace the paths below with actual images  -->
<!-- after taking screenshots of the live app    -->
<!-- ─────────────────────────────────────────── -->

## Screenshots

> **How to add screenshots:**
> 1. Take screenshots of the pages listed below
> 2. Create a folder `screenshots/` in the root of this repo
> 3. Name them exactly as shown and push — they'll appear here automatically

| Home | Browse |
|------|--------|
| ![Home](screenshots/home.png) | ![Browse](screenshots/browse.png) |

| Paper Viewer | Upload |
|-------------|--------|
| ![Viewer](screenshots/viewer.png) | ![Upload](screenshots/upload.png) |

| Mod Dashboard | Admin Panel |
|--------------|-------------|
| ![Mod](screenshots/mod.png) | ![Admin](screenshots/admin.png) |

---

## Features

- **Browse without an account** — all approved papers are publicly visible
- **Upload with compression** — images are compressed before upload, with a live size preview
- **Moderation queue** — every upload goes through a Pending → Approved/Rejected flow
- **Role-based access** — four roles with progressively more permissions
- **Report system** — users can flag papers; mods can resolve reports
- **Activity log** — full audit trail of uploads, approvals, rejections, and deletes
- **Collapsible sidebar** — desktop collapses to icon rail; mobile gets a hamburger drawer
- **Dark / light theme** — persisted to localStorage, toggle in the sidebar
- **Change password** — expandable accordion on the Profile page
- **Lazy-loaded pages** — each route is a separate JS chunk for faster initial load

---

## Roles

| Role | Permissions |
|------|-------------|
| **Public** | Browse and view approved papers |
| **Student** | Above + upload papers, delete own pending papers |
| **Moderator** | Above + approve / reject papers, view & resolve reports |
| **Admin** | Full access — manage users, subjects, teachers, view activity log |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite 8 |
| Routing | React Router v6 |
| Animations | Framer Motion |
| Icons | Lucide React |
| Styling | Plain CSS (per-component, no Tailwind) |
| Auth | Supabase Auth (email + password) |
| Database | Supabase Postgres + Row Level Security |
| Storage | Supabase Storage (image files) |
| Deployment | Vercel |

---

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/wasiqtanveer/Paper-Vault.git
cd Paper-Vault
npm install
```

### 2. Create `.env.local`

Create a `.env.local` file in the root with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

> The R2 variables in the file are unused — the app uses Supabase Storage. Leave them blank.

### 3. Run Supabase SQL migrations

In your Supabase project → **SQL Editor**, run this in order:

```sql
-- ── Tables ────────────────────────────────────────────────────────────────

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text default 'student' check (role in ('student', 'moderator', 'admin')),
  created_at timestamptz default now()
);

create table subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table papers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject_id uuid references subjects(id) on delete set null,
  teacher_id uuid references teachers(id) on delete set null,
  year int not null,
  semester text,
  exam_type text,
  image_url text not null,
  uploader_id uuid references profiles(id) on delete set null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  uploaded_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id) on delete set null
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid references papers(id) on delete cascade,
  reporter_id uuid references profiles(id) on delete set null,
  reason text,
  resolved boolean default false,
  resolved_at timestamptz,
  resolved_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor_id uuid references profiles(id) on delete set null,
  actor_name text,
  actor_role text,
  paper_id uuid,
  paper_title text,
  created_at timestamptz default now()
);
```

```sql
-- ── Auth trigger — creates profile row on signup ──────────────────────────

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

```sql
-- ── Row Level Security ────────────────────────────────────────────────────

alter table profiles    enable row level security;
alter table subjects    enable row level security;
alter table teachers    enable row level security;
alter table papers      enable row level security;
alter table reports     enable row level security;
alter table activity_log enable row level security;

-- profiles
create policy "anyone read profiles"   on profiles for select using (true);
create policy "own update profiles"    on profiles for update using (auth.uid() = id);

-- subjects
create policy "anyone read subjects"   on subjects for select using (true);
create policy "admin manage subjects"  on subjects for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- teachers
create policy "anyone read teachers"   on teachers for select using (true);
create policy "admin manage teachers"  on teachers for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- papers
create policy "papers select" on papers for select using (
  status = 'approved'
  or auth.uid() = uploader_id
  or exists (select 1 from profiles where id = auth.uid() and role in ('moderator','admin'))
);
create policy "student insert own paper"  on papers for insert with check (auth.uid() = uploader_id);
create policy "mod update paper status"   on papers for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('moderator','admin'))
);
create policy "uploader delete own"       on papers for delete using (auth.uid() = uploader_id);

-- reports
create policy "authed insert report"  on reports for insert with check (auth.uid() is not null);
create policy "mod read reports"      on reports for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('moderator','admin'))
);
create policy "mod update reports"    on reports for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('moderator','admin'))
);

-- activity_log
create policy "mod read activity"     on activity_log for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('moderator','admin'))
);
create policy "authed insert activity" on activity_log for insert with check (auth.uid() is not null);
```

```sql
-- ── Supabase Storage ──────────────────────────────────────────────────────
-- Create a bucket named "papers" in Storage → Buckets (set to Public)
-- Then run these policies:

create policy "public read papers storage"
  on storage.objects for select using (bucket_id = 'papers');

create policy "auth upload papers storage"
  on storage.objects for insert
  with check (bucket_id = 'papers' and auth.uid() is not null);

create policy "owner delete papers storage"
  on storage.objects for delete
  using (bucket_id = 'papers' and auth.uid()::text = (storage.foldername(name))[2]);
```

### 4. Start the dev server

```bash
npm run dev
```

### 5. Set yourself as admin

After registering your account, run this in Supabase SQL Editor:

```sql
update profiles set role = 'admin' where email = 'your@email.com';
```

Then add subjects and teachers via the **Admin Panel** before students upload.

---

## Deployment (Vercel)

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import this repo
3. Framework auto-detects as **Vite**
4. Add environment variables:
   ```
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   ```
5. Click **Deploy**

**After deploying**, update Supabase:  
**Auth → URL Configuration** → add your Vercel URL to **Site URL** and **Redirect URLs**  
so email confirmation and password reset links work in production.

---

## Project Structure

```
src/
├── assets/
│   └── Paper vault Logo.png
├── components/
│   ├── CustomSelect.jsx    — Animated dropdown replacing native <select>
│   ├── ImageViewer.jsx     — Full-width zoomable image modal
│   ├── PaperCard.jsx       — Paper thumbnail card used in grids
│   ├── Preloader.jsx       — Full-screen loading overlay with "by WT" branding
│   ├── ProtectedRoute.jsx  — Auth + role guard for routes
│   ├── Sidebar.jsx         — Collapsible desktop sidebar + mobile hamburger drawer
│   ├── StatusBadge.jsx     — Pending / approved / rejected pill badge
│   └── Toast.jsx           — Individual toast notification
├── context/
│   ├── AuthContext.jsx     — Session, profile, signIn, signOut (with preloader delay)
│   ├── ThemeContext.jsx    — Dark / light theme toggle, persisted to localStorage
│   └── ToastContext.jsx    — Global toast notification queue
├── lib/
│   ├── imageUtils.js       — Client-side image compression
│   ├── storage.js          — Supabase Storage upload / delete helpers
│   └── supabase.js         — Supabase client initialisation
├── pages/
│   ├── About.jsx           — About the developer
│   ├── AdminPanel.jsx      — Users, subjects, teachers, activity log
│   ├── Browse.jsx          — Filterable paper grid with pagination
│   ├── Home.jsx            — Stats strip + 12 most recent approved papers
│   ├── Login.jsx           — Email + password sign in
│   ├── ModDashboard.jsx    — Pending queue + reports tabs
│   ├── PaperViewer.jsx     — Full paper view, download, report, mod actions
│   ├── Profile.jsx         — User info, stats, papers table, change password
│   ├── Register.jsx        — Account creation with email confirmation
│   └── Upload.jsx          — Paper upload form with compression preview
└── styles/
    ├── main.css            — Global base styles, layout, buttons, tables
    └── variables.css       — CSS custom properties for both themes
```

---

## Built By

**Wasiq Tanveer** — [Portfolio](https://wasiq-portfolio-delta.vercel.app) · [LinkedIn](https://www.linkedin.com/in/wasiq-tanveer/) · mwasiqt@gmail.com
