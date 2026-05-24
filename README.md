# PaperVault

A full-stack past paper sharing platform. Students upload images of exam papers, moderators review them, and everyone can browse the approved library without an account.

**Stack:** React (Vite) · Supabase (Auth + Postgres + RLS) · Cloudflare R2 · Vercel

---

## Roles

| Role | Can do |
|------|--------|
| Public | Browse & view approved papers |
| Student | All of above + upload papers |
| Moderator | All of above + approve/reject pending papers, view reports |
| Admin | Full access including user role management and subject CRUD |

---

## Local Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd paper-vault
npm install
```

### 2. Fill in environment variables

Copy `.env.local` and fill in your credentials:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_R2_ACCOUNT_ID=your-cloudflare-account-id
VITE_R2_ACCESS_KEY_ID=your-r2-access-key
VITE_R2_SECRET_ACCESS_KEY=your-r2-secret-key
VITE_R2_BUCKET_NAME=past-papers
VITE_R2_PUBLIC_URL=https://pub-xxxx.r2.dev
```

### 3. Run Supabase SQL migrations

In your Supabase project → SQL Editor, run the following:

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

create table papers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject_id uuid references subjects(id) on delete set null,
  year int not null,
  semester text check (semester in ('Spring', 'Fall', 'Mid', 'Final')),
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
  created_at timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────

alter table profiles enable row level security;
alter table subjects enable row level security;
alter table papers enable row level security;
alter table reports enable row level security;

-- profiles
create policy "anyone read profiles"
  on profiles for select using (true);

create policy "own update profiles"
  on profiles for update using (auth.uid() = id);

-- subjects
create policy "anyone read subjects"
  on subjects for select using (true);

create policy "admin manage subjects"
  on subjects for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- papers: unified select policy
create policy "papers select"
  on papers for select using (
    status = 'approved'
    or auth.uid() = uploader_id
    or exists (
      select 1 from profiles
      where id = auth.uid() and role in ('moderator', 'admin')
    )
  );

create policy "student insert own paper"
  on papers for insert with check (auth.uid() = uploader_id);

create policy "mod update paper status"
  on papers for update using (
    exists (select 1 from profiles where id = auth.uid() and role in ('moderator', 'admin'))
  );

create policy "uploader delete own pending"
  on papers for delete using (auth.uid() = uploader_id);

create policy "admin all papers"
  on papers for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- reports
create policy "authed insert report"
  on reports for insert with check (auth.uid() is not null);

create policy "mod read reports"
  on reports for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('moderator', 'admin'))
  );
```

### 4. Cloudflare R2 setup

1. Create a bucket named `past-papers` in Cloudflare R2
2. Enable **Public Access** on the bucket (Settings → Public Access → Allow)
3. Copy the public bucket URL (e.g. `https://pub-xxxx.r2.dev`) into `VITE_R2_PUBLIC_URL`
4. Create an **R2 API Token** with read+write access
5. Copy the Account ID, Access Key ID, and Secret Access Key into `.env.local`

> **CORS:** In the R2 bucket settings, add a CORS rule allowing `*` origin with `PUT` and `GET` methods so the browser can upload directly.

### 5. Start dev server

```bash
npm run dev
```

---

## Deployment (Vercel)

1. Push repo to GitHub
2. Import project in Vercel
3. Add all 7 environment variables from `.env.local` in Vercel project settings
4. Deploy — Vercel auto-detects Vite

---

## Folder Structure

```
src/
  components/
    Navbar.jsx          — Sticky top navbar with auth-aware links
    ProtectedRoute.jsx  — Redirects unauthenticated / unauthorized users
    PaperCard.jsx       — Paper thumbnail card used in grids
    Toast.jsx           — Individual toast notification
    StatusBadge.jsx     — Pending / approved / rejected pill badge
    ImageViewer.jsx     — Full-width image with click-to-zoom modal
  pages/
    Home.jsx            — Hero + 12 recent papers
    Browse.jsx          — Filterable grid with pagination
    PaperViewer.jsx     — Full paper view with actions
    Login.jsx           — Email/password sign in
    Register.jsx        — Account creation
    Upload.jsx          — Image compression + R2 upload form
    Profile.jsx         — User info + own papers table
    ModDashboard.jsx    — Pending queue + reports tabs
    AdminPanel.jsx      — Users, subjects, stats
  context/
    AuthContext.jsx     — Session, profile, signIn/signOut
    ToastContext.jsx    — Global toast notifications
  lib/
    supabase.js         — Supabase client
    r2.js               — R2 upload/delete helpers
    imageUtils.js       — Compression + validation utilities
  styles/
    variables.css       — CSS custom properties
    global.css          — All styles (no Tailwind)
```

---

## First-Time Admin

After registering, manually set your account role to `admin` in Supabase:

```sql
update profiles set role = 'admin' where email = 'your@email.com';
```

Then add subjects via the Admin Panel before students can upload.
