import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * WCAG AA contrast audit of the colour tokens in variables.css. Text colours
 * must reach 4.5:1 against every surface they are drawn on, in both themes.
 */
const css = readFileSync(resolve(process.cwd(), 'src/styles/variables.css'), 'utf8');

function tokens(selectorStart) {
  const start = css.indexOf(selectorStart);
  const block = css.slice(css.indexOf('{', start) + 1, css.indexOf('\n}', start));
  const out = {};
  for (const m of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) out[m[1]] = m[2];
  return out;
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = ['text-primary', 'text-secondary', 'text-muted', 'accent-blue', 'accent-amber',
  'status-pending', 'status-approved', 'status-rejected'];
const SURFACES = ['bg-primary', 'bg-secondary', 'bg-card', 'bg-elevated'];

for (const [name, selector] of [['dark', ':root,'], ['light', '[data-theme="light"]']]) {
  describe(`${name} theme contrast`, () => {
    const t = tokens(selector);
    for (const fg of TEXT) {
      for (const bg of SURFACES) {
        it(`${fg} on ${bg} is at least 4.5:1`, () => {
          expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  });
}
