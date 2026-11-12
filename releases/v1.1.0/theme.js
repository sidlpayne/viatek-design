/*
 * @viatek/design · theme.js
 * Theme switching. Source of truth: SPEC.md section 5.
 *
 *   import { initTheme, setPrefs } from '@viatek/design/theme.js';
 *   initTheme();                         // once, on the client
 *   setPrefs({ mode: 'dark' });          // from the theme picker
 *
 * Safe to import during SSR: nothing touches window/document until a function runs.
 */

export const STORAGE_KEY = 'viatek.theme';
export const EVENT = 'viatek:theme';

export const THEMES = {
  light: [
    { id: 'basecamp',    name: 'Basecamp',    note: 'ViaTek default, warm' },
    { id: 'glacier',     name: 'Glacier',     note: 'Cool, crisp blue' },
    { id: 'aspen',       name: 'Aspen',       note: 'Sage and forest' },
    { id: 'mesa',        name: 'Mesa',        note: 'Sandstone and clay' },
    { id: 'columbine',   name: 'Columbine',   note: 'Soft violet' },
    { id: 'slate-paper', name: 'Slate Paper', note: 'Neutral, data-dense' },
  ],
  dark: [
    { id: 'summit-night',   name: 'Summit Night',   note: 'ViaTek default, charcoal' },
    { id: 'timberline',     name: 'Timberline',     note: 'Deep pine' },
    { id: 'midnight-range', name: 'Midnight Range', note: 'Navy and signal blue' },
    { id: 'ember',          name: 'Ember',          note: 'Warm campfire' },
    { id: 'aurora',         name: 'Aurora',         note: 'Violet and teal' },
    { id: 'graphite',       name: 'Graphite',       note: 'Black and blue' },
  ],
};

export const MODES = ['system', 'light', 'dark'];
export const DEFAULTS = Object.freeze({ mode: 'system', lightTheme: 'basecamp', darkTheme: 'summit-night' });

const lightIds = THEMES.light.map((t) => t.id);
const darkIds = THEMES.dark.map((t) => t.id);
const DARK_QUERY = '(prefers-color-scheme: dark)';

let syncFn = null;
let previewOverride = null; // 'light' | 'dark' | null (section 8.2 temporary preview)
let mql = null;
let started = false;

const hasDOM = () => typeof window !== 'undefined' && typeof document !== 'undefined';

/** Returns a valid prefs object. Unknown ids fall back to the defaults. */
export function normalizePrefs(p) {
  const src = p && typeof p === 'object' ? p : {};
  return {
    mode: MODES.includes(src.mode) ? src.mode : DEFAULTS.mode,
    lightTheme: lightIds.includes(src.lightTheme) ? src.lightTheme : DEFAULTS.lightTheme,
    darkTheme: darkIds.includes(src.darkTheme) ? src.darkTheme : DEFAULTS.darkTheme,
  };
}

/** Looks up a theme by id. Returns { id, name, note, mode } or null. */
export function getTheme(id) {
  for (const mode of ['light', 'dark']) {
    const t = THEMES[mode].find((x) => x.id === id);
    if (t) return { ...t, mode };
  }
  return null;
}

export function systemIsDark() {
  return hasDOM() && typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

/** getPrefs(): returns { mode, lightTheme, darkTheme } from localStorage (validated). */
export function getPrefs() {
  if (!hasDOM()) return { ...DEFAULTS };
  let stored = {};
  try { stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) { stored = {}; }
  return normalizePrefs(stored);
}

/** Which mode is showing right now for these prefs ('light' | 'dark'). */
export function resolveMode(prefs = getPrefs()) {
  if (previewOverride) return previewOverride;
  const p = normalizePrefs(prefs);
  if (p.mode === 'system') return systemIsDark() ? 'dark' : 'light';
  return p.mode;
}

/** applyPrefs(prefs): sets data-mode + data-theme on <html>. Does not save. */
export function applyPrefs(prefs = getPrefs()) {
  if (!hasDOM()) return;
  const p = normalizePrefs(prefs);
  const mode = resolveMode(p);
  const el = document.documentElement;
  el.setAttribute('data-mode', mode);
  el.setAttribute('data-theme', mode === 'dark' ? p.darkTheme : p.lightTheme);
  return { ...p, resolvedMode: mode, theme: mode === 'dark' ? p.darkTheme : p.lightTheme };
}

function emit(detail) {
  if (!hasDOM()) return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail }));
}

function save(p) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch (e) { /* private mode */ }
}

/**
 * setPrefs(partial): merges, saves to localStorage, applies, emits 'viatek:theme',
 * and calls the optional remote sync hook. Returns the new prefs.
 */
export function setPrefs(partial = {}, { sync = true } = {}) {
  const next = normalizePrefs({ ...getPrefs(), ...partial });
  if (!hasDOM()) return next;
  save(next);
  const applied = applyPrefs(next);
  emit(applied);
  if (sync && typeof syncFn === 'function') {
    try {
      const r = syncFn(next);
      if (r && typeof r.catch === 'function') r.catch((err) => console.warn('[viatek] theme sync failed', err));
    } catch (err) { console.warn('[viatek] theme sync failed', err); }
  }
  return next;
}

/**
 * hydratePrefs(remote): on login, the server value wins over localStorage (5.3).
 * Saves and applies without calling the sync hook back.
 */
export function hydratePrefs(remote) {
  if (!remote) return getPrefs();
  return setPrefs(remote, { sync: false });
}

/** registerSync(fn): optional; fn(prefs) persists to Supabase (or anywhere). */
export function registerSync(fn) {
  syncFn = typeof fn === 'function' ? fn : null;
}

/**
 * previewMode('light' | 'dark' | null): temporarily show the other mode without saving it
 * (theme picker, section 8.2). Pass null to return to the saved mode.
 */
export function previewMode(mode) {
  previewOverride = mode === 'light' || mode === 'dark' ? mode : null;
  emit(applyPrefs());
}

export function isPreviewing() {
  return previewOverride !== null;
}

/** onSystemChange: re-applies when mode === 'system' and the OS setting flips. */
export function onSystemChange(cb) {
  if (!hasDOM() || typeof window.matchMedia !== 'function') return () => {};
  const m = window.matchMedia(DARK_QUERY);
  const handler = () => {
    if (getPrefs().mode !== 'system') return;
    const applied = applyPrefs();
    emit(applied);
    if (cb) cb(applied);
  };
  m.addEventListener('change', handler);
  return () => m.removeEventListener('change', handler);
}

/** Subscribe to theme changes. Charts use this to re-read CSS variables (7.8). */
export function onThemeChange(cb) {
  if (!hasDOM()) return () => {};
  const handler = (e) => cb(e.detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

/** Reads a --vt-* variable's computed value (for canvas/SVG charts). */
export function readToken(name, el) {
  if (!hasDOM()) return '';
  const target = el || document.documentElement;
  const key = name.startsWith('--') ? name : `--vt-${name}`;
  return getComputedStyle(target).getPropertyValue(key).trim();
}

/**
 * initTheme({ sync }): applies saved prefs, starts following the OS when mode is 'system',
 * and keeps tabs in sync. Call once on the client. Idempotent.
 */
export function initTheme({ sync } = {}) {
  if (sync) registerSync(sync);
  if (!hasDOM()) return { ...DEFAULTS };
  const applied = applyPrefs();
  if (!started) {
    started = true;
    mql = onSystemChange();
    // Another tab changed the theme: follow it.
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) emit(applyPrefs());
    });
  }
  return applied;
}

/* ---- Supabase helpers (section 5.3: public.user_preferences) ---- */

/** Maps prefs to a user_preferences row. */
export function toRow(prefs, userId) {
  const p = normalizePrefs(prefs);
  return {
    user_id: userId,
    theme_mode: p.mode,
    light_theme: p.lightTheme,
    dark_theme: p.darkTheme,
    updated_at: new Date().toISOString(),
  };
}

/** Maps a user_preferences row to prefs. */
export function fromRow(row) {
  if (!row) return null;
  return normalizePrefs({ mode: row.theme_mode, lightTheme: row.light_theme, darkTheme: row.dark_theme });
}

/**
 * supabaseSync(supabase, userId): returns a sync fn for registerSync().
 *   registerSync(supabaseSync(supabase, user.id));
 *   const { data } = await supabase.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle();
 *   hydratePrefs(fromRow(data));
 */
export function supabaseSync(supabase, userId) {
  return (prefs) => supabase.from('user_preferences').upsert(toRow(prefs, userId)).then(({ error }) => {
    if (error) throw error;
  });
}
