# Changelog

All notable changes to `@viatek/design`. Versions follow semver (see SPEC.md 3.4):
patch for fixes, minor for new components or themes, major when apps must change code.

## v1.1.0 · Nov 12, 2026

- `src/components.css` (new, exported as `@viatek/design/components.css` and hosted at `/v1.1.0/components.css`): the app shell (sidebar with collapse, drawer, tooltips and flyouts; top bar; content area), buttons, KPI tiles, status pills, tables, panels, forms, segmented control, chart chrome and the theme picker from SPEC.md sections 6 to 8. Previously these lived only in the preview page. Load it after `tokens.css`.
- `/theme-preview` now uses the hosted `components.css`; only its specimen matrix styles stay in `preview/preview.css`.
- SPEC.md 3.1 to 3.3: hosted URLs are `https://viatek-design.vercel.app/v<version>/...`, install from `github:sidlpayne/viatek-design#v1.1.0`.
- `npm run check` also scans `src/components.css` for hard-coded colors and em dashes.

No changes to `tokens.css`, `theme.js`, `sidebar.js`, `no-flash.js` or the Tailwind preset. Apps on v1.0.0 keep working unchanged.

## v1.0.0 · Nov 11, 2026

First release.

- `src/tokens.css`: foundations, mode tokens (status, chart series, shadows), the 12 theme palettes and derived tokens from SPEC.md section 4. Derived tokens are declared on `[data-theme]` and `[data-mode]` as well as `:root`, so a nested element can carry its own theme. Adds three mode-dependent component tokens taken from the spec rules: `--vt-sidebar-bg` (6.1), `--vt-input-bg` (7.6), `--vt-on-danger` (7.1), plus `--vt-nav-text` (6.1) and font shorthands for the type scale (section 2).
- `src/theme.js`: `THEMES`, `getPrefs`, `setPrefs`, `applyPrefs`, `onSystemChange`, `registerSync`, `initTheme`, plus `hydratePrefs` (server value wins on login), `previewMode` (picker preview, 8.2), `onThemeChange`, `readToken` and Supabase row helpers for `user_preferences` (5.3).
- `src/sidebar.js`: `initSidebar(appId)` with the collapse toggle, `[` shortcut, per-app saved state, tooltips after 300ms, flyouts for sub-items, count-badge dots and the off-canvas drawer under 900px (6.1a).
- `src/no-flash.js`: `noFlashScript(appId)` / `noFlashTag(appId)` return the inline `<head>` snippet (5.1). Stored ids are validated before they are applied.
- `src/tailwind-preset.js`: the preset from 4.5.
- `/theme-preview`: every component in the current theme, a specimen of each of the 12 themes, and the full theme picker.
- `vercel.json` + `scripts/build.mjs`: serves `/v1.0.0/*` (immutable, CORS enabled for module scripts) and `/theme-preview`.
