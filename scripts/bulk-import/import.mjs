/**
 * Stage 2 — validate manifest.csv, then upload + insert the papers.
 *
 *   node scripts/bulk-import/import.mjs           validate only (default)
 *   node scripts/bulk-import/import.mjs --apply   actually upload and insert
 *
 * Signs in as a normal user, so every write goes through the same RLS policies
 * as an in-app upload. Already-imported files are tracked in imported.json and
 * skipped, so a failed run can just be re-run.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { parseCsv } from './csv.mjs';
import {
  STAGED_DIR, MANIFEST, TERMS, EXAM_TYPES,
  loadEnv, signIn, readLedger, writeLedger,
} from './config.mjs';

const apply = process.argv.includes('--apply');
const statusArg = process.argv.find(a => a.startsWith('--status='));
const STATUS = statusArg ? statusArg.split('=')[1] : 'pending';

const norm = s => (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Same title format as buildTitle() in src/pages/Upload.jsx */
function buildTitle({ subject, teacher, year, term, exam }) {
  return [subject, teacher, year, term, exam].filter(Boolean).join(' — ');
}

function suggest(value, names) {
  const n = norm(value);
  return names.filter(x => norm(x).includes(n) || n.includes(norm(x))).slice(0, 3);
}

async function main() {
  const cfg = loadEnv();

  if (!fs.existsSync(MANIFEST)) {
    console.error(`No manifest at ${MANIFEST}. Run prepare.mjs first.`);
    process.exit(1);
  }

  const { supabase, user } = await signIn(createClient, cfg);

  const [{ data: profile }, { data: subjects }, { data: teachers }] = await Promise.all([
    supabase.from('profiles').select('full_name, role').eq('id', user.id).single(),
    supabase.from('subjects').select('id, name').order('name'),
    supabase.from('teachers').select('id, name').order('name'),
  ]);

  const subjectByName = new Map((subjects ?? []).map(s => [norm(s.name), s]));
  const teacherByName = new Map((teachers ?? []).map(t => [norm(t.name), t]));
  const subjectNames = (subjects ?? []).map(s => s.name);
  const teacherNames = (teachers ?? []).map(t => t.name);

  console.log(`Signed in as ${user.email} (${profile?.role ?? 'student'}) · ${subjectNames.length} subjects, ${teacherNames.length} teachers on record`);
  if (STATUS !== 'pending' && profile?.role !== 'admin' && profile?.role !== 'moderator') {
    console.error(`\nstatus=${STATUS} requires an admin/moderator account; RLS will reject it.`);
    process.exit(1);
  }

  const ledger = readLedger();
  const { rows } = parseCsv(fs.readFileSync(MANIFEST, 'utf8'));

  const ready = [], problems = [], done = [], blank = [];

  for (const [i, row] of rows.entries()) {
    const line = i + 2; // header is line 1
    const where = `line ${line} (${row.file || '?'})`;

    if (!row.file) { problems.push(`${where}: missing file name`); continue; }
    if (ledger[row.file]) { done.push(row.file); continue; }

    const filled = ['subject', 'teacher', 'year', 'term', 'exam'].some(c => row[c]);
    if (!filled) { blank.push(row.file); continue; }

    const staged = path.join(STAGED_DIR, row.file);
    const errs = [];

    if (!fs.existsSync(staged)) errs.push('staged image missing — re-run prepare.mjs');

    const subject = subjectByName.get(norm(row.subject));
    if (!row.subject) errs.push('subject is required');
    else if (!subject) {
      const near = suggest(row.subject, subjectNames);
      errs.push(`unknown subject "${row.subject}"${near.length ? ` — did you mean: ${near.join(' / ')}?` : ' — add it in the Admin Panel first'}`);
    }

    let teacher = null;
    if (row.teacher) {
      teacher = teacherByName.get(norm(row.teacher));
      if (!teacher) {
        const near = suggest(row.teacher, teacherNames);
        errs.push(`unknown teacher "${row.teacher}"${near.length ? ` — did you mean: ${near.join(' / ')}?` : ' — add it in the Admin Panel, or leave blank'}`);
      }
    }

    const year = Number(row.year);
    if (!Number.isInteger(year) || year < 1990 || year > 2099) errs.push(`invalid year "${row.year}"`);

    const term = row.term ? TERMS.find(t => norm(t) === norm(row.term)) : null;
    if (row.term && !term) errs.push(`invalid term "${row.term}" — expected ${TERMS.join(' / ')}`);

    const exam = row.exam ? EXAM_TYPES.find(e => norm(e) === norm(row.exam)) : null;
    if (!row.exam) errs.push('exam type is required');
    else if (!exam) errs.push(`invalid exam "${row.exam}" — expected ${EXAM_TYPES.join(' / ')}`);

    if (errs.length) { problems.push(`${where}:\n    - ${errs.join('\n    - ')}`); continue; }

    ready.push({
      file: row.file,
      staged,
      title: row.title || buildTitle({ subject: subject.name, teacher: teacher?.name, year, term, exam }),
      subject_id: subject.id,
      teacher_id: teacher?.id ?? null,
      year, term, exam,
    });
  }

  console.log(`\nManifest: ${rows.length} rows — ${ready.length} ready, ${blank.length} not filled in, ${done.length} already imported, ${problems.length} with problems`);

  if (problems.length) {
    console.log('\nProblems:');
    for (const p of problems) console.log(`  ${p}`);
  }
  if (blank.length) {
    console.log(`\nNot filled in yet (${blank.length}): ${blank.slice(0, 8).join(', ')}${blank.length > 8 ? ` … +${blank.length - 8} more` : ''}`);
  }

  if (!apply) {
    console.log(`\nDry run — nothing written. Re-run with --apply to upload ${ready.length} paper${ready.length === 1 ? '' : 's'}.`);
    return;
  }
  if (problems.length) {
    console.log('\nRefusing to apply while rows have problems. Fix the manifest, or delete those rows to import the rest.');
    process.exit(1);
  }
  if (!ready.length) { console.log('\nNothing to import.'); return; }

  console.log(`\nImporting ${ready.length} paper${ready.length === 1 ? '' : 's'} as status="${STATUS}"…`);
  let ok = 0, failed = 0;

  for (const item of ready) {
    try {
      const objectPath = `papers/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const body = fs.readFileSync(item.staged);

      const { error: upErr } = await supabase.storage.from('papers')
        .upload(objectPath, body, { contentType: 'image/jpeg', upsert: false });
      if (upErr) throw new Error(`storage: ${upErr.message}`);

      const { data: pub } = supabase.storage.from('papers').getPublicUrl(objectPath);

      const { data: paper, error: dbErr } = await supabase.from('papers').insert({
        title: item.title,
        subject_id: item.subject_id,
        teacher_id: item.teacher_id,
        year: item.year,
        semester: item.term || null,
        exam_type: item.exam,
        image_url: pub.publicUrl,
        uploader_id: user.id,
        status: STATUS,
      }).select().single();

      if (dbErr) {
        // Don't leave the uploaded object behind if the row failed.
        await supabase.storage.from('papers').remove([objectPath]);
        throw new Error(`insert: ${dbErr.message}`);
      }

      await supabase.from('activity_log').insert({
        action: 'upload', actor_id: user.id,
        actor_name: profile?.full_name ?? user.email,
        actor_role: profile?.role ?? 'student',
        paper_id: paper.id, paper_title: paper.title,
      });

      ledger[item.file] = { paper_id: paper.id, path: objectPath, at: new Date().toISOString() };
      writeLedger(ledger); // flush per row so an interrupted run resumes cleanly
      ok++;
      console.log(`  ✓ ${item.file} → ${item.title}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${item.file}: ${err.message}`);
    }
  }

  console.log(`\nDone: ${ok} imported${failed ? `, ${failed} failed` : ''}.`);
  if (STATUS === 'pending') console.log('They are now in the moderation queue (Mod Dashboard).');
}

main().catch(err => { console.error(err); process.exit(1); });
