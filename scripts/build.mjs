// Builds dist/ for Vercel:
//   dist/v<version>/{tokens.css,components.css,theme.js,sidebar.js,no-flash.js,SPEC.md,CHANGELOG.md}   (hosted, immutable)
//   dist/v<older>/...                     (every frozen release in releases/, so old links keep working)
//   dist/theme-preview/                    (the /theme-preview page)
//
//   node scripts/build.mjs            build
//   node scripts/build.mjs --freeze   also copy this version into releases/v<version> (run when tagging)
import { readFile, writeFile, mkdir, rm, cp, readdir, access } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = (...p) => path.join(root, ...p);
const exists = (p) => access(p).then(() => true, () => false);

const pkg = JSON.parse(await readFile(r('package.json'), 'utf8'));
const version = pkg.version;
const tag = `v${version}`;
const base = `/${tag}`;
const HOSTED = [['src/tokens.css', 'tokens.css'], ['src/components.css', 'components.css'],['src/theme.js', 'theme.js'], ['src/sidebar.js', 'sidebar.js'], ['src/no-flash.js', 'no-flash.js'], ['SPEC.md', 'SPEC.md'], ['CHANGELOG.md', 'CHANGELOG.md']];

const dist = r('dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

// 1. Frozen releases keep serving at their own version path.
if (await exists(r('releases'))) {
  for (const dir of await readdir(r('releases'))) {
    if (/^v\d+\.\d+\.\d+$/.test(dir)) await cp(r('releases', dir), path.join(dist, dir), { recursive: true });
  }
}

// 2. Current version from src/. A released version must never change underneath its apps.
const outV = path.join(dist, tag);
if (await exists(outV)) {
  for (const [from, to] of HOSTED.filter(([f]) => f.startsWith('src/'))) {
    const a = await readFile(r(from), 'utf8');
    const b = await readFile(path.join(outV, to), 'utf8').catch(() => null);
    if (a !== b) {
      throw new Error(`${tag} is already released and ${from} has changed. Bump the version in package.json (see SPEC.md 3.4).`);
    }
  }
} else {
  await mkdir(outV, { recursive: true });
  for (const [from, to] of HOSTED) await cp(r(from), path.join(outV, to));
}

if (process.argv.includes('--freeze')) {
  const dest = r('releases', tag);
  if (await exists(dest)) {
    console.log(`releases/${tag} already exists, leaving it as is`);
  } else {
    await cp(outV, dest, { recursive: true });
    console.log(`froze releases/${tag}`);
  }
}

// 3. /theme-preview
const { noFlashTag } = await import(pathToFileURL(r('src', 'no-flash.js')).href);
const fill = (s) => s.replaceAll('__VT_BASE__', base).replaceAll('__VT_VERSION__', version);
const outP = path.join(dist, 'theme-preview');
await mkdir(outP, { recursive: true });
for (const f of await readdir(r('preview'))) {
  let text = await readFile(r('preview', f), 'utf8');
  if (f === 'index.html') {
    if (!text.includes('<!--VT_NO_FLASH-->')) throw new Error('preview/index.html is missing the <!--VT_NO_FLASH--> marker');
    text = text.replace('<!--VT_NO_FLASH-->', noFlashTag('theme-preview'));
  }
  await writeFile(path.join(outP, f), fill(text));
}

console.log(`built dist/ for @viatek/design ${tag}`);
console.log(`  ${base}/tokens.css, components.css, theme.js, sidebar.js, no-flash.js, SPEC.md`);
console.log('  /theme-preview');
