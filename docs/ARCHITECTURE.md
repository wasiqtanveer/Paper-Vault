# Architecture

PaperVault is a React 19 + Vite single-page app talking directly to Supabase (Postgres, Auth,
Storage). There is no custom server. Authorization is enforced in the database; the front end only
hides what a user cannot do.

## Client data cache (`src/lib/cache.js`)

A module-level `Map`, in memory only (cleared on reload). No data-fetching library.

- `cachedQuery(key, fetcher, { ttl })` - stale-while-revalidate. A fresh hit (within `ttl`,
  default 60 s) returns immediately. A stale hit returns the old value immediately and refetches in
  the background. A miss awaits the fetcher. Concurrent calls share one in-flight promise.
- `cachedSafeQuery(key, makeBuilder, { fallback, onError, label, ttl })` - wraps a Supabase query
  via `safeQuery(..., { throwOnError: true })` so a failed request is never stored as a real result;
  the caller still receives `fallback`.
- `peek(key)` - synchronous read so a page can paint from the last visit.
- `invalidate(key)` drops one key, or everything with no argument. `AuthContext.signOut` calls
  `invalidate()` so the next account in the tab never sees cached data.
- `invalidatePapers()` drops the keys derived from the papers table: `home:recent`, `home:stats`,
  `browse:years`. Pages call it after any paper mutation (upload, edit, review, delete).

`safeQuery` / `countRows` (`src/lib/query.js`) normalise Supabase `{ data, error }` results into a
value or a fallback plus an error message.

## Auth flow (`src/context/AuthContext.jsx`)

1. On mount, `supabase.auth.getSession()` reads the session from local storage (instant). If a user
   exists, the `profiles` row is fetched; `profileReady` flips to true when that settles.
2. `onAuthStateChange` keeps `session`/`user` in sync. Profile fetches inside it are deferred with
   `setTimeout` because calling Supabase synchronously in that callback can deadlock on the auth
   lock. A different user id resets `profileReady` until the new profile loads.
3. Profile fetches are de-duplicated per user id (`getSession` and the first auth event ask for the
   same row).
4. `loading` has a 6 s safety timeout so a stalled request cannot pin the app on the preloader. A
   profile fetch failure sets `profileError` rather than silently treating the user as a student.
5. Sign-in methods: email and password, Google OAuth (`redirectTo` is `window.location.origin`),
   and password reset (`/reset-password`).

Role checks wait on `profileReady`; the role itself lives in `profiles.role`
(`student`, `moderator`, `admin`; `is_staff()` is moderator or admin), and is enforced by the database, not the client.

## RLS and triggers (`supabase/migrations`)

RLS is enabled on every table. Two `security definer` helpers with a pinned `search_path`,
`is_staff()` and `is_admin()` (`20260201_rls_fix.sql`), read `profiles` without re-triggering its
own policies, which avoids recursion. Policies call them as `(select public.is_staff())` so
Postgres evaluates them once per query.

Policy summary:

| Table | Read | Write |
| --- | --- | --- |
| `profiles` | own row, or staff | insert own row as `student`; update own row; admin updates/deletes any |
| `papers` | approved, or own, or staff | insert own; update own or staff; delete staff, or owner while not approved |
| `subjects`, `teachers` | public | admin |
| `activity_log` | staff | insert with `actor_id = auth.uid()` |
| `reports` | own, or staff | insert as self; staff resolve; admin delete |
| `catalog_requests` | own, or admin | insert as self, pending; admin review |
| `app_settings` | only key `email_ratelimit_until` | update only that key, numeric value |
| `hall_of_fame` | public | admin |

### Triggers

- **Role guard** - `guard_profile_role()` on `profiles` (insert or update). On insert a non-admin
  always gets `student`. On update, changing `role` raises unless the caller is an admin. It holds
  even if a policy drifts, because it is on the table.
- **Paper review guard** - `guard_paper_review()` on `papers` (`20260513`, `20260514`, `20260515`).
  Skipped when `auth.uid()` is null (service role, SQL editor, bulk import). For non-staff:
  inserts are forced to `pending` with review fields cleared; updates cannot change `status`,
  `reviewed_by`, `reviewed_at` or `rejection_reason`; and editing a content field of an approved
  paper (title, subject, teacher, year, semester, exam type, image) sends it back to `pending`.
- **Uploader name** - `set_uploader_name()` stamps `papers.uploader_name` from `profiles` on insert;
  `sync_uploader_name()` updates a user's papers when they rename themselves. This lets list pages
  show attribution without opening `profiles` to readers.

### Activity log

`logActivity` (`src/lib/activity.js`) inserts the row from the client. The actor fields are then
stamped server-side: `stamp_activity_actor()` overwrites `actor_name` and `actor_role` from the
caller's profile, the insert policy requires `actor_id = auth.uid()`, and a check constraint limits
`action` to `upload, approve, reject, delete, restore, role_change, request_approve,
request_decline`. `paper_id` and `paper_title` are client-supplied.

### Storage

Bucket `papers` (public read). Objects are `papers/<uid>/<timestamp>.<ext>`
(`20260523_storage_policies.sql`): a signed-in user may upload only under their own uid folder;
owners may delete their own files and staff may delete any. The bucket itself limits files to 5 MB
and `image/jpeg`, `image/png`, `image/webp` (`20260524`).

### Other constraints

Report reason length 3 to 500 and one open report per user per paper; profile `full_name` up to
60 characters; rejection reason up to 200; `paper_years()` is `security invoker`, so RLS still
decides which papers count.
