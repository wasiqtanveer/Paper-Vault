# Migrations

Files run in filename order. Every file is idempotent (`create or replace`, `drop ... if exists`,
`if not exists`), so re-running any of them is safe.

| Order | File | Notes |
| --- | --- | --- |
| 1 | `20260101_baseline_schema.sql` | Tables, in dependency order |
| 2 | `20260201_rls_fix.sql` | `is_staff()` / `is_admin()`, profile role guard trigger, base policy set. Later files override some of its policies |
| 3 | `20260202_rejection_reason.sql` | |
| 4 | `20260203_uploader_name.sql` | Server-stamped `uploader_name` |
| 5 | `20260204_catalog_requests.sql` | Needs `is_admin()` from the RLS file |
| 6 | `20260205_teachers_departments.sql` | Must run after `catalog_requests` |
| 7 | `20260513` to `20260619` | Paper review guard, activity log stamping, reports, storage, limits |

`20260522_performance.sql` sits in the dated run rather than with the early files because it
creates an index on `reports`, which only exists after `20260520_reports_rls.sql`.

Do not re-run `20260201_rls_fix.sql` on its own after the later migrations have been applied: it
recreates `papers_delete` and `activity_insert` in their original, looser form. Re-run the
migrations from `20260516` and `20260518` afterwards to restore them.

One-off data fixes that ran once live in `../archive/`, not here.

Apply with `npx supabase db query --remote -f <file>` or paste into the Supabase SQL editor.
