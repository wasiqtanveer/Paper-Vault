# Bulk paper import

Imports a folder of past-paper photos into Supabase — compressing, uploading and
inserting rows — instead of filling in the upload form one paper at a time.

Everything under `bulk-import-data/` is gitignored; your images and credentials
never get committed.

## One-time setup

Create `.env.import.local` in the project root (already covered by `.gitignore`):

```
PV_EMAIL=you@example.com
PV_PASSWORD=your-password
```

The importer signs in as that account and writes through the same RLS policies
as a normal in-app upload — no service-role key involved.

## The three steps

### 1. Drop images in

```
bulk-import-data/inbox/
```

Subfolders are fine and are used to name the staged files, so grouping by
subject makes the manifest easier to read later.

### 2. Compress and build the manifest

```
npm run papers:prepare
```

Produces:

| Path | What it is |
| --- | --- |
| `bulk-import-data/staged/` | Upload-ready JPEGs, max 1920px and ~1MB — same budget as `src/lib/imageUtils.js` |
| `bulk-import-data/previews/` | Smaller copies, used only for reading the exam header |
| `bulk-import-data/manifest.csv` | One row per image with blank metadata columns |

Safe to re-run: staged files are skipped and metadata already filled into
`manifest.csv` is preserved. Use `--force` to re-compress everything.

### 3. Fill in `manifest.csv`

Columns: `file, subject, teacher, year, term, exam, title, notes`

- `subject` — **required**, must match an existing subject name (case-insensitive)
- `teacher` — optional; must match an existing teacher name if given
- `year` — required, 1990–2099
- `term` — optional: `Spring` / `Summer` / `Fall`
- `exam` — **required**: `Mid` / `Final`
- `title` — leave blank to auto-generate as `Subject — Teacher — Year — Term — Exam`
- `notes` — ignored by the importer, for your own scratch use

`subjects` and `teachers` are admin-write only, so any new ones have to be added
in the Admin Panel first. The validator suggests near-matches for typos.

### 4. Validate, then import

```
npm run papers:check     # dry run — reports problems, writes nothing
npm run papers:import    # uploads + inserts
```

The dry run is the default and `--apply` refuses to run while any row has a
problem. Rows left completely blank are reported as "not filled in" and skipped
rather than treated as errors, so you can import in batches.

Imported papers land as `status: pending` and show up in the Mod Dashboard for
review. Admins/moderators can skip the queue with:

```
node scripts/bulk-import/import.mjs --apply --status=approved
```

## Re-runs and failures

Each successful import is recorded in `bulk-import-data/imported.json`, flushed
after every row. If a run dies halfway, just run it again — imported files are
skipped. If a DB insert fails after the image uploaded, the orphaned image is
deleted so there is nothing to clean up by hand.

To genuinely re-import something, delete its entry from `imported.json`.
