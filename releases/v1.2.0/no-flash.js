/*
 * @viatek/design · no-flash.js
 * Source of the inline <head> snippet (SPEC.md sections 5.1 and 6.1a).
 *
 * It must run before any CSS or body paints, so apps INLINE it rather than load it:
 *
 *   // Next.js app/layout.tsx
 *   import { noFlashScript } from '@viatek/design/no-flash.js';
 *   <head><script dangerouslySetInnerHTML={{ __html: noFlashScript('insight') }} /></head>
 *
 *   // Any server-rendered HTML
 *   import { noFlashTag } from '@viatek/design/no-flash.js';
 *   html.replace('<head>', '<head>' + noFlashTag('envoy'));
 *
 * Also add suppressHydrationWarning to <html> in React apps, since the script sets
 * attributes on it before hydration.
 *
 * Same logic as the spec snippet, plus validation of stored ids so a bad value
 * never paints an unknown theme (5.2).
 */
import { THEMES, DEFAULTS, STORAGE_KEY } from './theme.js';

const APP_ID_RE = /^[a-z0-9][a-z0-9-]*$/;

const L = JSON.stringify(THEMES.light.map((t) => t.id));
const D = JSON.stringify(THEMES.dark.map((t) => t.id));

/** The snippet with the literal placeholder APP_ID (kept for reference / copy-paste). */
export const NO_FLASH_SOURCE = `(function () {
  var d = { mode: '${DEFAULTS.mode}', lightTheme: '${DEFAULTS.lightTheme}', darkTheme: '${DEFAULTS.darkTheme}' };
  try { d = Object.assign(d, JSON.parse(localStorage.getItem('${STORAGE_KEY}') || '{}')); } catch (e) {}
  var L = ${L}, D = ${D};
  if (['system', 'light', 'dark'].indexOf(d.mode) < 0) d.mode = '${DEFAULTS.mode}';
  if (L.indexOf(d.lightTheme) < 0) d.lightTheme = '${DEFAULTS.lightTheme}';
  if (D.indexOf(d.darkTheme) < 0) d.darkTheme = '${DEFAULTS.darkTheme}';
  var dark = d.mode === 'dark' || (d.mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  var el = document.documentElement;
  el.setAttribute('data-mode', dark ? 'dark' : 'light');
  el.setAttribute('data-theme', dark ? d.darkTheme : d.lightTheme);
  // Sidebar state (section 6.1a).
  var s = null;
  try { s = localStorage.getItem('viatek.sidebar.APP_ID'); } catch (e) {}
  if (s !== 'collapsed' && s !== 'expanded') s = innerWidth >= 1280 ? 'expanded' : 'collapsed';
  el.setAttribute('data-sidebar', s);
})();`;

/** Returns the snippet JavaScript for this app id, ready to inline in a <script>. */
export function noFlashScript(appId) {
  if (!APP_ID_RE.test(String(appId))) {
    throw new Error(`[viatek] noFlashScript: app id must be lowercase letters, digits and dashes, got "${appId}"`);
  }
  return NO_FLASH_SOURCE.replace('APP_ID', appId);
}

/** Returns the full <script>…</script> tag for this app id. */
export function noFlashTag(appId) {
  return `<script>${noFlashScript(appId)}</script>`;
}

export default noFlashScript;
