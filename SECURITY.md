# Security Policy

## Reporting a vulnerability

Please do not open a public issue for security problems.

- Preferred: use GitHub's private vulnerability reporting. On the repository, go to
  **Security > Advisories > Report a vulnerability**.
- Or email **mwasiqt@gmail.com** with a description, reproduction steps and the impact you see.

I aim to acknowledge a report within a few days and will keep you updated until it is fixed.

## Scope

In scope: the web app, the Supabase RLS policies, triggers and storage policies in
`supabase/migrations`.

Please do not test against other people's accounts or data, and do not run denial-of-service
or bulk-scraping tests against the hosted instance.

## Secrets

The anon key is public by design; access control is enforced by Row Level Security. The
`service_role` key must never appear in this repository or in the front end. If you find one,
report it privately.
