/** Post-import sanity check: are the rows there and are the images reachable? */
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { loadEnv, signIn, LEDGER } from './config.mjs';

const { supabase } = await signIn(createClient, loadEnv());

// Check the ids the importer actually recorded, regardless of current status —
// papers may already have been approved by a moderator.
const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
const ids = Object.values(ledger).map(v => v.paper_id);
console.log(`ledger recorded ${ids.length} imported papers`);

const { data, error } = await supabase
  .from('papers')
  .select('id, title, image_url, status, subjects(name)')
  .in('id', ids);
if (error) throw error;

console.log(`readable back from DB   : ${data.length}`);
const tally = {};
for (const r of data) tally[r.status] = (tally[r.status] ?? 0) + 1;
console.log('status tally            :', tally);
console.log(`bad/missing image_url   : ${data.filter(p => !p.image_url?.includes('/object/public/papers/')).length}`);
console.log(`rows with no subject    : ${data.filter(p => !p.subjects?.name).length}`);

console.log('\nspot-checking 5 images in storage:');
for (const p of data.slice(0, 5)) {
  const r = await fetch(p.image_url, { method: 'HEAD' });
  const kb = (Number(r.headers.get('content-length')) / 1024).toFixed(0);
  console.log(`  HTTP ${r.status}  ${kb.padStart(5)} KB  ${p.title}`);
}
