# Contributing

## Setup

```bash
npm install
cp .env.example .env   # fill in your Supabase URL and anon key
npm run dev            # http://localhost:5173 (port is pinned)
```

Node 22 is required (see `.nvmrc`).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest, watch mode |

Run lint, tests and build before opening a PR. CI runs the same steps.

## Commits

One commit per logical change, with a conventional prefix: `feat:`, `fix:`, `refactor:`,
`docs:`, `test:`, `chore:`. Keep unrelated changes in separate commits.

## Database changes

Never edit the live schema by hand. Every RLS policy, trigger, function or table change goes in a
new file in `supabase/migrations/`, named with the next date prefix. Write it to be idempotent
(`create or replace`, `drop policy if exists`, `if not exists`) so it is safe to re-run.

## Pull requests

Describe what changed and why, note any migration that needs to be run, and add or update tests
for logic in `src/lib` and `src/hooks`.

## The `supabase` CLI

`supabase` is a devDependency only so that `npm run db:verify` and `npx supabase db query` work without a global install. It is not used at runtime or in the build. Link a project once with `npx supabase link`, then use `npx supabase db query --remote --read-only "<sql>"` to inspect the database. Schema changes go in `supabase/migrations/` as idempotent SQL.
