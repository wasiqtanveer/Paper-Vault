/**
 * Stage 1 — compress every image in bulk-import-data/inbox and build a manifest.
 *
 *   node scripts/bulk-import/prepare.mjs
 *
 * Writes:
 *   staged/    upload-ready JPEGs (same budget as the in-app compressor)
 *   previews/  smaller copies, only so the exam header can be read for metadata
 *   manifest.csv  one row per image, metadata columns left blank
 *
 * Re-running is safe: already-staged files are skipped and metadata you have
 * already filled into manifest.csv is preserved.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { parseCsv, toCsv } from './csv.mjs';
import {
  INBOX_DIR, STAGED_DIR, PREVIEW_DIR, MANIFEST, MANIFEST_COLUMNS,
  IMAGE_EXTS, MAX_DIMENSION, TARGET_BYTES,
} from './config.mjs';

const force = process.argv.includes('--force');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (IMAGE_EXTS.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

/** Stable, filesystem-safe name derived from the path relative to the inbox. */
function slugFor(relPath, taken) {
  const base = relPath
    .replace(/\.[^.]+$/, '')
    .replace(/[\\/]+/g, '__')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 110) || 'paper';
  let name = `${base}.jpg`;
  let n = 2;
  while (taken.has(name)) name = `${base}-${n++}.jpg`;
  taken.add(name);
  return name;
}

/** Steps quality down until the JPEG fits the size budget. */
async function compressToBudget(pipeline, outPath, startQuality, budget) {
  for (let q = startQuality; q >= 45; q -= 10) {
    const buf = await pipeline.clone().jpeg({ quality: q, mozjpeg: true }).toBuffer();
    if (buf.length <= budget || q === 45) {
      fs.writeFileSync(outPath, buf);
      return { bytes: buf.length, quality: q };
    }
  }
}

async function main() {
  if (!fs.existsSync(INBOX_DIR)) {
    fs.mkdirSync(INBOX_DIR, { recursive: true });
    console.log(`Created ${INBOX_DIR}\nDrop your paper images in there (subfolders are fine) and re-run.`);
    return;
  }

  const files = walk(INBOX_DIR).sort((a, b) => a.localeCompare(b));
  if (!files.length) {
    console.log(`No images found in ${INBOX_DIR}`);
    return;
  }

  fs.mkdirSync(STAGED_DIR, { recursive: true });
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });

  // Keep any metadata already typed or filled in on a previous run.
  const existing = new Map();
  if (fs.existsSync(MANIFEST)) {
    for (const row of parseCsv(fs.readFileSync(MANIFEST, 'utf8')).rows) {
      if (row.file) existing.set(row.file, row);
    }
  }

  const taken = new Set();
  const rows = [];
  let staged = 0, skipped = 0, failed = 0, rawTotal = 0, outTotal = 0;

  for (const abs of files) {
    const rel = path.relative(INBOX_DIR, abs).replace(/\\/g, '/');
    const name = slugFor(rel, taken);
    const stagedPath = path.join(STAGED_DIR, name);
    const previewPath = path.join(PREVIEW_DIR, name);

    const prior = existing.get(name) ?? {};
    const row = { ...Object.fromEntries(MANIFEST_COLUMNS.map(c => [c, ''])), ...prior, file: name };

    if (!force && fs.existsSync(stagedPath) && fs.existsSync(previewPath)) {
      rows.push(row);
      skipped++;
      continue;
    }

    try {
      const rawBytes = fs.statSync(abs).size;
      const pipeline = sharp(abs, { failOn: 'none' })
        .rotate() // honour EXIF orientation — phone photos are usually rotated
        .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true });

      const result = await compressToBudget(pipeline, stagedPath, 82, TARGET_BYTES);

      await sharp(abs, { failOn: 'none' })
        .rotate()
        .resize({ width: 1500, height: 1500, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 72, mozjpeg: true })
        .toFile(previewPath);

      rawTotal += rawBytes;
      outTotal += result.bytes;
      staged++;
      rows.push(row);
      process.stdout.write(`  ${name}  ${(rawBytes / 1e6).toFixed(1)}MB → ${(result.bytes / 1e6).toFixed(2)}MB (q${result.quality})\n`);
    } catch (err) {
      failed++;
      console.error(`  FAILED ${rel}: ${err.message}`);
    }
  }

  fs.writeFileSync(MANIFEST, toCsv(MANIFEST_COLUMNS, rows));

  console.log(`\nStaged ${staged}, skipped ${skipped} (already staged)${failed ? `, failed ${failed}` : ''}.`);
  if (rawTotal) console.log(`Compression: ${(rawTotal / 1e6).toFixed(1)}MB → ${(outTotal / 1e6).toFixed(1)}MB (${Math.round((1 - outTotal / rawTotal) * 100)}% smaller)`);
  console.log(`Manifest: ${MANIFEST} (${rows.length} rows)`);
  console.log(`\nNext: fill in the metadata columns, then run\n  node scripts/bulk-import/import.mjs        (validate)\n  node scripts/bulk-import/import.mjs --apply (upload + insert)`);
}

main().catch(err => { console.error(err); process.exit(1); });
