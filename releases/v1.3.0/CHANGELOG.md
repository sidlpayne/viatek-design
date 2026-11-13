# Changelog

All notable changes to `@viatek/design`. Versions follow semver (see SPEC.md 3.4):
patch for fixes, minor for new components or themes, major when apps must change code.

## v1.3.0 · Nov 13, 2026

Gaps from the Sec Audit and ConfigReport gap briefs, in one release. Additive: apps on v1.2.x keep working unchanged.

- **Shell:** user menu and environment badge in the top bar (6.4), with the new right-side order in 6.2 and a rule for which freshness feeds to show. Docked help panel (6.5): docks at 1536px and wider, overlays below. Pages without the shell (6.6): `.vt-auth` for sign-in and error pages, `.vt-bare` for presentation views and pop-out windows.
- **New components:** switch (7.15); textarea, date and time inputs, calendar, color field and file upload (7.16); sortable table headers (7.17); score ring (7.18); spinner, busy button, skeleton and progress bar (7.19); long-form text `.vt-prose` (7.20); advisor thread (7.21); list and detail split (7.22); document preview frame (7.23); checklist, reorder list and folding panel (7.24). Also list menus, custom select lists and avatars (6.4).
- **Score bands (7.18):** strong, good, needs work, at risk, not scored. New mode token `--vt-band-good` (teal, `#0B6B78` light, `#2DD4BF` dark), checked for contrast in all 12 themes. The other bands reuse the status colors. Tailwind preset adds `band.*` colors.
- **Status words (7.3):** about 45 words added from both apps. Severity adds `info` (muted). Medium severity stays blue. ConfigReport's reconciliation categories are neutral tags.
- `/theme-preview`: new "Added in v1.3.0" section, user menu, environment badge and help panel in the top bar. Fixed the quick theme menu, which closed as soon as it opened because a second click handler was attached to it.
## v1.2.1 · Nov 13, 2026

Spec only. No changes to tokens.css, components.css, theme.js, sidebar.js, no-flash.js or the Tailwind preset, so apps on v1.2.0 keep working unchanged.

- **New SPEC.md section 14:** one migration prompt that works in every app. Claude Code now finds the app id, repo, stack and host itself (14.2) instead of having them written into the prompt.
- **Scope (14.3):** client PDFs, emails, exports, client logos and client colors stay as they are. Only the frame around an in-app document preview is restyled.
- **Gap brief (14.4):** before editing, Claude lists missing components, shell needs, status words and colors with no token, saves the list as `design-gaps-<app-id>.md` and waits for a release that covers them.
- **Preview (14.6):** use the host the app already ships on (Vercel preview, or a spare port on a self-hosted server such as Auto2). No new hosting projects or copied secrets.
- Sections 11 to 13 point to section 14. The checklist adds the scope and preview items. The SPEC.md header shows the real version.

## v1.2.0 · Nov 12, 2026

Gaps found while migrating Reconciliator. Additive: apps on v1.1.0 keep working unchanged.

- **New components** in `components.css` and SPEC.md 7.9 to 7.14: alert banner (`.vt-alert`), dialog (`.vt-dialog`, native `<dialog>` or Radix), help popover (`.vt-popover`), toast (`.vt-toast`, with Sonner class names), view tabs (`.vt-tabs`), filter chips (`.vt-chip`), disclosure (`details.vt-disclosure`), empty state (`.vt-empty`) and pager (`.vt-pager`).
- **Status pills (7.3):** the table now lists 41 words, including job, report, cleanup, sync and network states, plus a severity scale. New neutral **tag** (`.vt-tag`) for descriptive labels that are not statuses.
- **Tables (7.4):** empty cells use a muted hyphen (`.vt-null`), never an em dash.
- **Sidebar (6.1, 6.1a):** split items (`.vt-nav-split`) where the label is a link and a separate chevron opens the sub-items, so a parent page still opens in one click. When collapsed, the flyout lists the parent page first. New plain count (`.vt-nav-count`) for counts that are information; the solid badge stays for action counts. `sidebar.js` handles both.
- **Tokens:** `--vt-shadow-lg` and `--vt-scrim` (mode tokens, for dialogs and toasts). Tailwind preset adds `shadow-lg`.
- SPEC.md 3.2: how to load the Tailwind preset in Tailwind v4 (`@config`).

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
