import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
export const DATA_DIR = path.join(ROOT, 'bulk-import-data');
export const INBOX_DIR = path.join(DATA_DIR, 'inbox');
export const STAGED_DIR = path.join(DATA_DIR, 'staged');
export const PREVIEW_DIR = path.join(DATA_DIR, 'previews');
export const MANIFEST = path.join(DATA_DIR, 'manifest.csv');
export const LEDGER = path.join(DATA_DIR, 'imported.json');

export const MANIFEST_COLUMNS = ['file', 'subject', 'teacher', 'year', 'term', 'exam', 'title', 'notes'];

// Must stay in sync with src/pages/Upload.jsx
export const TERMS = ['Spring', 'Summer', 'Fall'];
export const EXAM_TYPES = ['Mid', 'Final'];

// Matches compressImage() in src/lib/imageUtils.js
export const MAX_DIMENSION = 1920;
export const TARGET_BYTES = 1024 * 1024;

export const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.bmp', '.tif', '.tiff']);

/** Reads KEY=VALUE files without adding a dotenv dependency. */
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

export function loadEnv() {
  loadEnvFile(path.join(ROOT, '.env.import.local'));
  loadEnvFile(path.join(ROOT, '.env.local'));

  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const accessToken = process.env.PV_ACCESS_TOKEN;
  const refreshToken = process.env.PV_REFRESH_TOKEN;
  const email = process.env.PV_EMAIL;
  const password = process.env.PV_PASSWORD;

  const missing = [];
  if (!url) missing.push('VITE_SUPABASE_URL (.env.local)');
  if (!key) missing.push('VITE_SUPABASE_ANON_KEY (.env.local)');
  if (missing.length) {
    console.error('Missing config:\n  ' + missing.join('\n  '));
    process.exit(1);
  }

  // Two ways to authenticate. Token is for Google/OAuth logins, which have no
  // password to hand over; email+password still works for password accounts.
  if (accessToken) return { url, key, mode: 'token', accessToken, refreshToken };
  if (email && password) return { url, key, mode: 'password', email, password };

  console.error(`No credentials found. Create .env.import.local in the project root.

If you sign in with Google (or any OAuth provider), borrow your browser session:
  1. Open your Paper Vault site and make sure you are logged in
  2. DevTools (F12) -> Console, paste this and hit enter:

     copy(JSON.stringify(JSON.parse(localStorage.getItem(
       Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
     )), null, 0))

  3. That copies a JSON blob. Put its access_token and refresh_token into
     .env.import.local:

     PV_ACCESS_TOKEN=eyJ...
     PV_REFRESH_TOKEN=...

If you sign in with an email and password instead:
     PV_EMAIL=you@example.com
     PV_PASSWORD=your-password`);
  process.exit(1);
}

/** Returns a signed-in client and the user, whichever credential style was given. */
export async function signIn(createClient, cfg) {
  const supabase = createClient(cfg.url, cfg.key, {
    auth: { persistSession: false, autoRefreshToken: Boolean(cfg.refreshToken) },
  });

  if (cfg.mode === 'token') {
    const { data, error } = await supabase.auth.setSession({
      access_token: cfg.accessToken,
      refresh_token: cfg.refreshToken ?? '',
    });
    if (error || !data.user) {
      console.error(`Session token rejected: ${error?.message ?? 'no user on session'}`);
      console.error('Access tokens expire after about an hour — grab a fresh one from the browser and try again.');
      process.exit(1);
    }
    return { supabase, user: data.user };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cfg.email, password: cfg.password,
  });
  if (error) { console.error(`Sign-in failed: ${error.message}`); process.exit(1); }
  return { supabase, user: data.user };
}

export function readLedger() {
  if (!fs.existsSync(LEDGER)) return {};
  try { return JSON.parse(fs.readFileSync(LEDGER, 'utf8')); }
  catch { return {}; }
}

export function writeLedger(ledger) {
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
  fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');
}
