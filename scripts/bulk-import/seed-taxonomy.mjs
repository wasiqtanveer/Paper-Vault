/**
 * One-off: reconcile subjects/teachers with the paper scans.
 *   node seed-taxonomy.mjs          dry run
 *   node seed-taxonomy.mjs --apply  write
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv, signIn } from './config.mjs';

const apply = process.argv.includes('--apply');
const norm = s => s.trim().toLowerCase().replace(/\s+/g, ' ');

// Existing DB name -> new name (confirmed by user)
const RENAME_TEACHERS = {
  "Ma'am Rabia": 'Dr. Rabia Khan',
  'Sir Amjid Ali': 'Dr. Amjid Ali',
  'Sir Jawad Ali ( Mathematics )': 'Dr. Jawad Ali',
  'Sir Kashif': 'Mr. Kashif Ullah',
  'Sir Adnan': 'Mr. Muhammad Adnan',
  'Sir Ali zeb': 'Mr. Muhammad Ali Zeb',
};
const RENAME_SUBJECTS = {
  'Andriod Development': 'Mobile Application Development',
};

// Teachers seen on the papers that have no DB row at all.
const NEW_TEACHERS = [
  'Dr. Majid', 'Dr. Aslam Khan', 'Mr. Rahmat Shah', 'Mr. Farooq',
  'Mr. Sajid Ullah', 'Mr. Ishtiaq Muhammad', 'Mr. Qadeem Khan',
  'Ms. Maleeha Yousaf', 'Mr. Atif Nadeem',
];

// Subjects seen on the papers with no DB row (near-misses excluded: those keep
// the existing DB spelling per the user's choice).
const NEW_SUBJECTS = [
  'Pakistan Studies', 'Introduction to Pakistan Studies', 'Civic and Community Engagement',
  'Principles of Management', 'Introduction to Logic', 'English-II (Communication Skills)',
  'Search Engine Optimization', 'Software Engineering', 'Digital Logic and Design',
  'Entrepreneurship', 'Technical and Business Writing',
  'Computer Organization and Assembly Language', 'Advanced Programming',
  'Financial Accounting',
];

const cfg = loadEnv();
const { supabase } = await signIn(createClient, cfg);

const [{ data: subjects }, { data: teachers }] = await Promise.all([
  supabase.from('subjects').select('id, name'),
  supabase.from('teachers').select('id, name'),
]);
const subByName = new Map(subjects.map(s => [norm(s.name), s]));
const teaByName = new Map(teachers.map(t => [norm(t.name), t]));

const plan = [];
for (const [from, to] of Object.entries(RENAME_TEACHERS)) {
  const row = teaByName.get(norm(from));
  if (!row) plan.push(['SKIP', `teacher rename: "${from}" not found`]);
  else if (teaByName.has(norm(to)) && teaByName.get(norm(to)).id !== row.id)
    plan.push(['SKIP', `teacher rename: "${to}" already exists`]);
  else plan.push(['RENAME-T', `${from} -> ${to}`, row.id, to]);
}
for (const [from, to] of Object.entries(RENAME_SUBJECTS)) {
  const row = subByName.get(norm(from));
  if (!row) plan.push(['SKIP', `subject rename: "${from}" not found`]);
  else if (subByName.has(norm(to)) && subByName.get(norm(to)).id !== row.id)
    plan.push(['SKIP', `subject rename: "${to}" already exists`]);
  else plan.push(['RENAME-S', `${from} -> ${to}`, row.id, to]);
}
for (const name of NEW_TEACHERS) {
  if (teaByName.has(norm(name))) plan.push(['SKIP', `teacher "${name}" already exists`]);
  else plan.push(['NEW-T', name, null, name]);
}
for (const name of NEW_SUBJECTS) {
  if (subByName.has(norm(name))) plan.push(['SKIP', `subject "${name}" already exists`]);
  else plan.push(['NEW-S', name, null, name]);
}

for (const [kind, label] of plan) console.log(`  ${kind.padEnd(9)} ${label}`);

if (!apply) {
  const writes = plan.filter(p => p[0] !== 'SKIP').length;
  console.log(`\nDry run — ${writes} change(s) pending. Re-run with --apply.`);
  process.exit(0);
}

let ok = 0, fail = 0;
for (const [kind, label, id, name] of plan) {
  if (kind === 'SKIP') continue;
  const table = kind.endsWith('-T') ? 'teachers' : 'subjects';
  const q = kind.startsWith('RENAME')
    ? supabase.from(table).update({ name }).eq('id', id)
    : supabase.from(table).insert({ name });
  const { error } = await q;
  if (error) { fail++; console.error(`  FAILED ${label}: ${error.message}`); }
  else ok++;
}
console.log(`\n${ok} applied${fail ? `, ${fail} failed` : ''}.`);
