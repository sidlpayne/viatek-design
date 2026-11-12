// /theme-preview page logic. Uses only the public @viatek/design API.
import {
  THEMES, getPrefs, setPrefs, applyPrefs, initTheme, onThemeChange,
  previewMode, isPreviewing, resolveMode, getTheme, readToken,
} from '__VT_BASE__/theme.js';
import { initSidebar } from '__VT_BASE__/sidebar.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const MODE_NAMES = { system: 'System', light: 'Light', dark: 'Dark' };

/* ---------- Theme + sidebar ---------- */
initTheme();

// ?theme=<id> (and optional ?mode=system) shows a theme without saving it. Used for screenshots.
const params = new URLSearchParams(location.search);
const forced = getTheme(params.get('theme'));
if (forced) {
  const p = { ...getPrefs(), mode: forced.mode, [forced.mode === 'dark' ? 'darkTheme' : 'lightTheme']: forced.id };
  applyPrefs(p);
}
if (params.get('sidebar') === 'collapsed' || params.get('sidebar') === 'expanded') {
  document.documentElement.setAttribute('data-sidebar', params.get('sidebar'));
}

initSidebar('theme-preview');

/* ---------- Segmented controls (generic radio behavior) ---------- */
function wireRadioGroup(group, onPick) {
  const items = $$('[role="radio"]', group);
  const select = (btn, focus) => {
    items.forEach((b) => {
      const on = b === btn;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    if (focus) btn.focus();
    if (onPick) onPick(btn);
  };
  items.forEach((b) => {
    b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1;
    b.addEventListener('click', () => select(b, false));
    b.addEventListener('keydown', (e) => {
      const i = items.indexOf(b);
      let n = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = items[(i + 1) % items.length];
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = items[(i - 1 + items.length) % items.length];
      if (e.key === 'Home') n = items[0];
      if (e.key === 'End') n = items[items.length - 1];
      if (n) { e.preventDefault(); select(n, true); }
    });
  });
  if (!items.some((b) => b.tabIndex === 0) && items[0]) items[0].tabIndex = 0;
}
$$('[data-segmented]').forEach((g) => wireRadioGroup(g));

/* ---------- Mode controls (quick toggle menu + appearance) ---------- */
$$('[data-mode-control]').forEach((g) => wireRadioGroup(g, (btn) => {
  previewMode(null);
  setPrefs({ mode: btn.dataset.value });
}));

function syncModeControls() {
  const { mode } = getPrefs();
  $$('[data-mode-control] [role="radio"]').forEach((b) => {
    const on = b.dataset.value === mode;
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
  });
}

/* ---------- Quick theme toggle menu (8.1) ---------- */
const toggle = $('#theme-toggle');
const menu = $('#theme-menu');
function openMenu(open) {
  menu.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  if (open) { const sel = $('[aria-checked="true"]', menu) || $('[role="radio"]', menu); if (sel) sel.focus(); }
}
toggle.addEventListener('click', () => openMenu(menu.hidden));
document.addEventListener('click', (e) => {
  if (!menu.hidden && !menu.contains(e.target) && !toggle.contains(e.target)) openMenu(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !menu.hidden) { openMenu(false); toggle.focus(); }
});
$$('[data-close-menu]', menu).forEach((a) => a.addEventListener('click', () => openMenu(false)));

/* ---------- Full picker (8.2) ---------- */
function themeCard(t, mode) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'vt-theme-card';
  b.setAttribute('role', 'radio');
  b.dataset.id = t.id;
  b.dataset.group = mode;
  b.innerHTML = `
    <span class="vt-swatches" data-mode="${mode}" data-theme="${t.id}" aria-hidden="true">
      <span style="background:var(--vt-bg)"></span><span style="background:var(--vt-primary)"></span><span style="background:var(--vt-accent)"></span>
    </span>
    <span class="vt-theme-name-row"><span class="vt-theme-name">${t.name}</span></span>
    <span class="vt-theme-note">${t.note}</span>`;
  return b;
}

$$('[data-picker]').forEach((grid) => {
  const mode = grid.dataset.picker;
  THEMES[mode].forEach((t) => grid.appendChild(themeCard(t, mode)));
  wireRadioGroup(grid, (btn) => pickTheme(mode, btn.dataset.id));
});

function savedShowingMode() {
  const { mode } = getPrefs();
  if (mode !== 'system') return mode;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function pickTheme(group, id) {
  setPrefs({ [group === 'dark' ? 'darkTheme' : 'lightTheme']: id });
  // Clicking a card in the group that is not showing previews it right away.
  previewMode(group === savedShowingMode() ? null : group);
}

function endPreview() { previewMode(null); }
$('#preview-end').addEventListener('click', endPreview);
// Leaving the Appearance section confirms the choice and ends the preview.
window.addEventListener('hashchange', () => { if (location.hash !== '#appearance' && isPreviewing()) endPreview(); });

function syncPicker() {
  const prefs = getPrefs();
  $$('[data-picker]').forEach((grid) => {
    const chosen = grid.dataset.picker === 'dark' ? prefs.darkTheme : prefs.lightTheme;
    $$('.vt-theme-card', grid).forEach((c) => {
      const on = c.dataset.id === chosen;
      c.setAttribute('aria-checked', String(on));
      c.tabIndex = on ? 0 : -1;
      const row = $('.vt-theme-name-row', c);
      const pill = $('.vt-pill', row);
      const showing = on && grid.dataset.picker === resolveMode();
      if (showing && !pill) row.insertAdjacentHTML('beforeend', '<span class="vt-pill vt-pill--info">showing</span>');
      if (!showing && pill) pill.remove();
    });
  });
  const note = $('#preview-note');
  if (isPreviewing()) {
    note.hidden = false;
    $('#preview-note-text').textContent = `Previewing. Mode is set to ${MODE_NAMES[prefs.mode]}.`;
    $('#preview-end').textContent = `Back to ${MODE_NAMES[savedShowingMode()].toLowerCase()}`;
  } else {
    note.hidden = true;
  }
}

function syncLabels() {
  const t = getTheme(document.documentElement.getAttribute('data-theme'));
  const name = t ? t.name : '';
  $$('[data-current-theme-name]').forEach((el) => { el.textContent = name; });
  const { mode } = getPrefs();
  $$('[data-current-theme]').forEach((el) => { el.textContent = `Showing ${name} · mode ${MODE_NAMES[mode]}`; });
  toggle.setAttribute('aria-label', `Theme: ${name}`);
}

/* ---------- Palette matrix ---------- */
const tpl = $('#specimen-tpl');
const matrix = $('#matrix');
['light', 'dark'].forEach((mode) => THEMES[mode].forEach((t) => {
  const node = tpl.content.firstElementChild.cloneNode(true);
  node.setAttribute('data-mode', mode);
  node.setAttribute('data-theme', t.id);
  node.setAttribute('aria-label', `${t.name} theme specimen`);
  $('[data-name]', node).textContent = t.name;
  $('[data-note]', node).textContent = t.note;
  $('[data-modelabel]', node).textContent = mode;
  matrix.appendChild(node);
}));

/* ---------- Charts (7.8) ---------- */
// Sample data: Oct 13 to Nov 11, 2026. Weekends are null (gaps).
const START = new Date(2026, 9, 13);
const DAYS = 30;
const fmtDay = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const days = Array.from({ length: DAYS }, (_, i) => new Date(START.getFullYear(), START.getMonth(), START.getDate() + i));
let seed = 7;
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const cur = days.map((d, i) => ([0, 6].includes(d.getDay()) ? null : Math.round((58 + i * 0.55 + rnd() * 14) * 10) / 10));
const prev = days.map((d, i) => ([0, 6].includes(d.getDay()) ? null : Math.round((50 + i * 0.25 + rnd() * 12) * 10) / 10));
const TARGET = 75;

const chartEl = $('#trend-chart');
const tip = document.createElement('div');
tip.className = 'vt-chart-tip';
tip.hidden = true;
chartEl.appendChild(tip);

function linePath(vals, x, y) {
  let d = '';
  let pen = false;
  vals.forEach((v, i) => {
    if (v == null) { pen = false; return; }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
    pen = true;
  });
  return d.trim();
}

let geom = null;
function drawTrend() {
  // Re-read tokens on every draw so canvas-style charts follow theme changes (7.8).
  const c = {
    s1: readToken('series-1', chartEl), grid: readToken('chart-grid', chartEl), axis: readToken('chart-axis', chartEl),
    muted: readToken('text-muted', chartEl), surface: readToken('surface', chartEl),
  };
  const W = chartEl.clientWidth;
  const H = chartEl.clientHeight;
  const m = { l: 40, r: 12, t: 8, b: 26 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const x = (i) => m.l + (iw * i) / (DAYS - 1);
  const y = (v) => m.t + ih - (ih * v) / 100;
  geom = { x, y, m, iw, W };
  const ticks = [0, 25, 50, 75, 100];
  const xt = [0, 7, 14, 21, 29];
  let svg = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">`;
  ticks.forEach((t) => {
    svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}" stroke="${t === 0 ? c.axis : c.grid}" stroke-width="1"/>`;
    svg += `<text x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end">${t}%</text>`;
  });
  xt.forEach((i) => { svg += `<text x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === DAYS - 1 ? 'end' : 'middle'}">${fmtDay(days[i])}</text>`; });
  svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(TARGET)}" y2="${y(TARGET)}" stroke="${c.muted}" stroke-width="1" stroke-dasharray="4 4"/>`;
  svg += `<text x="${W - m.r}" y="${y(TARGET) - 6}" text-anchor="end">target 75%</text>`;
  svg += `<path d="${linePath(prev, x, y)}" fill="none" stroke="${c.s1}" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round" opacity=".55"/>`;
  svg += `<path d="${linePath(cur, x, y)}" fill="none" stroke="${c.s1}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  const last = cur.length - 1 - [...cur].reverse().findIndex((v) => v != null);
  svg += `<circle cx="${x(last)}" cy="${y(cur[last])}" r="4" fill="${c.s1}" stroke="${c.surface}" stroke-width="2"/>`;
  svg += `<line id="hover-line" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" stroke="${c.axis}" stroke-width="1" visibility="hidden"/>`;
  svg += `<circle id="hover-dot" r="4" fill="${c.s1}" stroke="${c.surface}" stroke-width="2" visibility="hidden"/>`;
  svg += '</svg>';
  chartEl.querySelector('svg')?.remove();
  chartEl.insertAdjacentHTML('afterbegin', svg);
}

chartEl.addEventListener('pointermove', (e) => {
  if (!geom) return;
  const r = chartEl.getBoundingClientRect();
  const px = e.clientX - r.left;
  const i = Math.max(0, Math.min(DAYS - 1, Math.round(((px - geom.m.l) / geom.iw) * (DAYS - 1))));
  const line = chartEl.querySelector('#hover-line');
  const dot = chartEl.querySelector('#hover-dot');
  line.setAttribute('x1', geom.x(i)); line.setAttribute('x2', geom.x(i)); line.setAttribute('visibility', 'visible');
  const v = cur[i];
  const day = days[i].toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  if (v == null) {
    dot.setAttribute('visibility', 'hidden');
    tip.innerHTML = `<b>${day}</b><div class="row"><span>No data (weekend)</span></div>`;
  } else {
    dot.setAttribute('cx', geom.x(i)); dot.setAttribute('cy', geom.y(v)); dot.setAttribute('visibility', 'visible');
    tip.innerHTML = `<b>${day}</b>
      <div class="row"><span><span class="vt-swatch" style="background:var(--vt-series-1)"></span>This period</span><span>${v.toFixed(1)}%</span></div>
      <div class="row"><span><span class="vt-swatch vt-swatch--dash" style="border-top-color:var(--vt-series-1)"></span>Previous</span><span>${prev[i].toFixed(1)}%</span></div>`;
  }
  tip.hidden = false;
  const tx = geom.x(i) + 12;
  tip.style.left = `${Math.min(tx, geom.W - tip.offsetWidth - 4)}px`;
  tip.style.top = '8px';
});
chartEl.addEventListener('pointerleave', () => {
  tip.hidden = true;
  chartEl.querySelector('#hover-line')?.setAttribute('visibility', 'hidden');
  chartEl.querySelector('#hover-dot')?.setAttribute('visibility', 'hidden');
});

// Stacked bars: series assigned in order and attached to the entity (work type).
const WORK = ['Billable', 'Non-billable', 'Travel', 'Internal'];
const CLIENTS = [
  ['Front Range Dental', [62, 14, 6, 4]],
  ['Pikes Peak Title', [48, 10, 9, 3]],
  ['Boulder Creek Law', [41, 12, 2, 6]],
  ['Aspen Grove Clinic', [33, 6, 11, 2]],
  ['Mesa Verde Supply', [21, 9, 4, 5]],
];
const maxTotal = Math.max(...CLIENTS.map(([, v]) => v.reduce((a, b) => a + b, 0)));
$('#bars-legend').innerHTML = WORK.map((w, i) => `<li><span class="vt-swatch vt-swatch--box" style="background:var(--vt-series-${i + 1})"></span>${w}</li>`).join('');
$('#bars').innerHTML = CLIENTS.map(([name, vals]) => {
  const total = vals.reduce((a, b) => a + b, 0);
  const segs = vals.map((v, i) => `<span class="vt-bar-seg" title="${WORK[i]}: ${v} h" style="flex:0 0 ${(v / maxTotal) * 100}%;background:var(--vt-series-${i + 1})"></span>`).join('');
  return `<div class="vt-bar-row"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</span>
    <span class="vt-bar-track" role="img" aria-label="${name}: ${vals.map((v, i) => `${WORK[i]} ${v} h`).join(', ')}">${segs}</span>
    <span class="vt-mono" style="text-align:right;font-size:13px">${total} h</span></div>`;
}).join('');

new ResizeObserver(() => drawTrend()).observe(chartEl);
drawTrend();

/* ---------- Active nav + breadcrumb ---------- */
const SECTION_OF = {
  overview: 'Theme preview', palettes: 'Theme preview', kpis: 'Components', charts: 'Components', tables: 'Components',
  pills: 'Components', buttons: 'Components', forms: 'Components', segmented: 'Components', type: 'Components', appearance: 'Settings',
};
function setActive(hash) {
  const id = (hash || '#overview').slice(1);
  if (!SECTION_OF[id]) return;
  let label = null;
  $$('.vt-sidebar a.vt-nav-item').forEach((a) => {
    const on = a.getAttribute('href') === `#${id}`;
    if (on) { a.setAttribute('aria-current', 'page'); label = a.querySelector('.vt-nav-text').textContent; }
    else a.removeAttribute('aria-current');
  });
  $('#crumb-section').textContent = SECTION_OF[id];
  $('#crumb-page').textContent = label || 'Overview';
}
window.addEventListener('hashchange', () => setActive(location.hash));
setActive(location.hash);

/* ---------- Keep everything in sync with theme changes ---------- */
function syncAll() { syncModeControls(); syncPicker(); syncLabels(); drawTrend(); }
onThemeChange(syncAll);
syncAll();
