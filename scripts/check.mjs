// Release checks for @viatek/design.
//   1. WCAG contrast for every required token pair in all 12 themes (SPEC.md section 9)
//   2. No hard-coded hex or rgb() in the preview (3.6) and no em dashes in UI copy (section 10)
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = await readFile(path.join(root, 'src', 'tokens.css'), 'utf8');

const block = (selector) => {
  const m = css.match(new RegExp(`\\[${selector}\\]\\s*\\{([^}]*)\\}`));
  if (!m) throw new Error(`missing block ${selector}`);
  return Object.fromEntries([...m[1].matchAll(/--vt-([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((x) => [x[1], x[2]]));
};
const themeIds = [...css.matchAll(/\[data-theme="([a-z-]+)"\]\s*\{/g)].map((m) => m[1]);
const LIGHT = ['basecamp', 'glacier', 'aspen', 'mesa', 'columbine', 'slate-paper'];
const modes = { light: { ...block('data-mode="light"'), tint: 0.09 }, dark: { ...block('data-mode="dark"'), tint: 0.12 } };

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lum = (hex) => {
  const [r, g, b] = rgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const mix = (a, b, t) => '#' + rgb(a).map((v, i) => Math.round(v * t + rgb(b)[i] * (1 - t)).toString(16).padStart(2, '0')).join('');

let failures = 0;
const rows = [];
for (const id of themeIds) {
  const mode = LIGHT.includes(id) ? 'light' : 'dark';
  const t = { ...block(`data-theme="${id}"`) };
  const m = modes[mode];
  const pairs = [];
  for (const fg of ['text', 'text-muted', 'link']) for (const bg of ['bg', 'surface']) pairs.push([fg, t[fg], bg, t[bg], 4.5, true]);
  pairs.push(['on-primary', t['on-primary'], 'primary', t.primary, 4.5, true]);
  for (const s of ['success', 'warning', 'danger', 'info']) {
    pairs.push([s, m[s], 'surface', t.surface, 4.5, true]);
    pairs.push([s, m[s], `${s}-soft`, mix(m[s], t.surface, m.tint), 4.5, false]);
  }
  pairs.push(['text-muted', t['text-muted'], 'surface-2', t['surface-2'], 4.5, false]);
  pairs.push(['on-danger', mode === 'light' ? '#FFFFFF' : t.bg, 'danger', m.danger, 4.5, false]);
  pairs.push(['text', t.text, 'primary-soft', t['primary-soft'], 4.5, false]);
  for (const [fn, fv, bn, bv, min, required] of pairs) {
    const r = ratio(fv, bv);
    if (r < min) {
      rows.push(`${required ? 'FAIL' : 'warn'}  ${id.padEnd(15)} ${fn} on ${bn}: ${r.toFixed(2)}:1 (${fv} on ${bv})`);
      if (required) failures++;
    }
  }
}
console.log(`Contrast: checked ${themeIds.length} themes`);
console.log(rows.length ? rows.join('\n') : '  all pairs pass 4.5:1');

// Preview hygiene
const previewDir = path.join(root, 'preview');
const files = [...(await readdir(previewDir)).map((f) => `preview/${f}`), 'src/components.css'];
for (const f of files) {
  const text = await readFile(path.join(root, f), 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('—')) { console.log(`FAIL  em dash in ${f}:${i + 1}`); failures++; }
    if (/(^|[^&\w])#[0-9a-fA-F]{3,8}\b(?![-\w])/.test(line.replace(/href="#[^"]*"/g, '')) || /\brgba?\(/.test(line)) {
      console.log(`FAIL  hard-coded color in ${f}:${i + 1}: ${line.trim().slice(0, 100)}`); failures++;
    }
  });
}
console.log(failures ? `\n${failures} required check(s) failed` : '\nAll required checks pass');
process.exit(failures ? 1 : 0);
