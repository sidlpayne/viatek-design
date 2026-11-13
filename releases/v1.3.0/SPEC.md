# ViaTek App Design System: Implementation Spec for Claude Code

**Version:** 1.3.0 · November 13, 2026
**Owner:** Sid Payne
**Applies to:** every internal ViaTek app (Insight, Reconciliator, Envoy, Site Ranger, Keystone, Sec Audit, ConfigReport, and anything new)
**To migrate an app:** use the prompt in section 14.1. It is the same for every app.
**Visual reference:** the "ViaTek App Themes" design canvas (Theme Explorer + All 12 Palettes)

---

## 1. What you are building

Today each app has its own fonts, colors and layout. This spec gives them one shared look: one set of fonts, spacing, corner sizes and components. The only thing that changes between themes is color. Users can choose from 6 light and 6 dark themes.

You will:

1. Create one shared theme package (section 3) that every app imports.
2. Move each app onto the standard app shell (section 6) and components (section 7).
3. Add a theme picker to each app (section 8).
4. Migrate the apps one at a time (section 11). Finish and verify each app before starting the next.

### Locked decisions (do not change them without asking Sid)

- **Every app uses a left sidebar.** Top navigation bars are not allowed. Envoy is converted.
- **Default themes:** Basecamp (light) and Summit Night (dark). The default mode follows the operating system setting.
- **Fonts:** Space Grotesk for headings, Inter for UI and body text, JetBrains Mono for numbers and data.
- **Only color changes between themes.** Type, spacing, radii, shadows and layout are the same in every theme.
- **Status colors and chart colors depend only on light/dark mode, never on the theme.** Red means the same thing everywhere.
- **No em dashes in any UI copy** (ViaTek brand rule).

---

## 2. Fonts

Load from Google Fonts (or self-host the same files):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

| Role | Family | Used for |
|---|---|---|
| `--vt-font-display` | `'Space Grotesk', Inter, Arial, sans-serif` | Page titles (h1, h2) only |
| `--vt-font-sans` | `Inter, 'Segoe UI', Arial, sans-serif` | All UI text, body, buttons, nav, card titles |
| `--vt-font-mono` | `'JetBrains Mono', ui-monospace, Consolas, monospace` | Numbers, KPI values, dates/times, costs, ticket IDs, IPs, serials, hostnames, status pills, section labels, table headers, freshness text |

**Rule:** any value someone might compare down a column or read back to a client goes in mono with `font-variant-numeric: tabular-nums`.

### Type scale

| Token | Size / line height | Weight | Font | Use |
|---|---|---|---|---|
| `--vt-text-title` | 28px / 1.15 | 600 | display | Page title |
| `--vt-text-h2` | 20px / 1.25 | 600 | display | Section title |
| `--vt-text-h3` | 15px / 1.4 | 600 | sans | Card/panel title |
| `--vt-text-body` | 14px / 1.5 | 400 | sans | Default UI text |
| `--vt-text-small` | 13px / 1.45 | 400 | sans | Secondary text, captions |
| `--vt-text-label` | 11px / 1.3, letter-spacing .14em, UPPERCASE | 500 to 600 | mono | Sidebar section labels, KPI labels, table headers |
| `--vt-text-kpi` | 32px / 1.1, letter-spacing -0.02em | 500 | mono | KPI values |
| `--vt-text-data` | 13px / 1.4 | 400 to 500 | mono | Table data cells for numbers, dates, IDs |

---

## 3. The shared theme package

The design system lives in **one repo, `viatek-design`**. App repos never copy its files. They install it as a versioned package (or link its hosted CSS), so a fix made once reaches every app.

### 3.1 The `viatek-design` repo

```
viatek-design/
  package.json          # name: "@viatek/design", version follows semver
  SPEC.md               # this document (the source of truth)
  CHANGELOG.md          # one entry per release
  src/
    tokens.css          # every CSS variable in section 4
    components.css      # app shell, components and theme picker (sections 6 to 8), tokens only
    theme.js            # theme switching (section 5)
    sidebar.js          # collapse behavior (section 6.1a)
    no-flash.js         # source of the inline <head> snippet (section 5.1, 6.1a)
    tailwind-preset.js  # for Tailwind apps (section 4.5)
  preview/              # /theme-preview page: every component in all 12 themes
  vercel.json           # deploys preview/ and the hosted files (3.3)
```

`package.json` exports `./tokens.css`, `./components.css`, `./theme.js`, `./sidebar.js`, `./no-flash.js`, `./tailwind-preset.js` and `./SPEC.md`.

### 3.2 How a JavaScript app uses it (Next.js, Vite, Astro)

Install from a version tag, never from a branch:

```bash
npm install github:sidlpayne/viatek-design#v1.3.0
```

Then import `@viatek/design/tokens.css` and then `@viatek/design/components.css` once in the root layout, call `initTheme()` and `initSidebar('<app-id>')` from `@viatek/design/theme.js` and `@viatek/design/sidebar.js`, and inline `no-flash.js` in `<head>`. Tailwind apps add `presets: [require('@viatek/design/tailwind-preset.js')]`. Tailwind v4 has no JS config by default: add a `tailwind.config.js` that holds only that preset line and point to it from the global stylesheet with `@config "../tailwind.config.js";`.

Each app's `CLAUDE.md` gets this block so every Claude Code session follows the shared spec:

```md
## Design system
This app uses @viatek/design. The spec is node_modules/@viatek/design/SPEC.md. Read it before any UI work.
Never hard-code colors, fonts or radii. Never copy design-system files into this repo.
If a component is missing, add it to the viatek-design repo first, then upgrade the package here.
```

### 3.3 How a non-JavaScript app uses it (Streamlit, n8n-generated HTML, plain pages)

`viatek-design` is deployed to the Vercel project `viatek-design` and serves versioned files from its production URL:

```
https://viatek-design.vercel.app/v1.3.0/tokens.css
https://viatek-design.vercel.app/v1.3.0/components.css
https://viatek-design.vercel.app/v1.3.0/theme.js
https://viatek-design.vercel.app/v1.3.0/sidebar.js
https://viatek-design.vercel.app/v1.3.0/no-flash.js
https://viatek-design.vercel.app/theme-preview
```

Use only `viatek-design.vercel.app`, never a per-deployment URL (`viatek-design-<hash>-....vercel.app`): those change every deploy and can sit behind Vercel login. Do not rename or delete the Vercel project, because every linked app would break. Link the versioned path. Do not link an unversioned "latest" path, because a change would then ship to every app without testing. Streamlit apps inject the stylesheet link and set `data-mode`/`data-theme` with a small HTML component. Emailed HTML cannot use CSS variables: inline the Basecamp hex values there.

### 3.4 Releasing a change

1. Change `viatek-design`, update `SPEC.md` and `CHANGELOG.md`, and check `/theme-preview` in all 12 themes.
2. Tag a release: patch (`v1.0.1`) for fixes, minor (`v1.1.0`) for new components or themes, major (`v2.0.0`) when apps must change code.
3. Upgrade each app by bumping its version tag. Turn on Dependabot or Renovate for each app repo so the upgrade arrives as a pull request with a Vercel preview to click through before merging.

### 3.5 Access

The repo contains only colors, fonts, layout code and this spec, with no client data or credentials. It can be **public**, which lets Vercel and every app install it with no tokens. If it must stay private, publish it to GitHub Packages instead and add a read-only `NPM_TOKEN` to each app's Vercel project environment variables.

### 3.6 Hard rule

Apps never hard-code a hex color. Every color comes from a `--vt-*` variable. Before calling an app done, search for `#[0-9a-fA-F]{3,6}` and `rgb(` in the app's own CSS/components and replace each one with a token. The only exceptions are inside `viatek-design`.

---

## 4. tokens.css

### 4.1 Foundations (same in every theme)

```css
:root {
  /* Fonts */
  --vt-font-display: 'Space Grotesk', Inter, Arial, sans-serif;
  --vt-font-sans: Inter, 'Segoe UI', Arial, sans-serif;
  --vt-font-mono: 'JetBrains Mono', ui-monospace, Consolas, monospace;

  /* Spacing: 4px base */
  --vt-space-1: 4px;  --vt-space-2: 8px;  --vt-space-3: 12px; --vt-space-4: 16px;
  --vt-space-5: 20px; --vt-space-6: 24px; --vt-space-7: 28px; --vt-space-8: 32px;
  --vt-space-10: 40px; --vt-space-12: 48px;

  /* Radii */
  --vt-radius-sm: 6px;    /* pills, small tags, icon buttons */
  --vt-radius-md: 9px;    /* buttons, inputs, nav items */
  --vt-radius-lg: 12px;   /* cards, panels, tables, KPI tiles */
  --vt-radius-xl: 16px;   /* modals, large surfaces */
  --vt-radius-full: 999px;

  /* Sizes */
  --vt-sidebar-w: 248px;
  --vt-sidebar-w-collapsed: 64px;
  --vt-topbar-h: 60px;
  --vt-content-max: 1280px;
  --vt-control-h: 38px;   /* buttons, inputs, selects */
  --vt-hit-min: 36px;     /* minimum clickable height in dense UI; 44px on touch */

  /* Motion */
  --vt-ease: cubic-bezier(.2, .7, .2, 1);
  --vt-dur: 160ms;
}
```

### 4.2 Mode tokens (status + chart colors; set by `data-mode`)

```css
[data-mode="light"] {
  color-scheme: light;
  --vt-success: #1E7B4A;
  --vt-warning: #9A5800;
  --vt-danger:  #C0362C;
  --vt-info:    #1F5FD1;
  --vt-band-good: #0B6B78;  /* score band "good" (7.18) */

  /* Chart series: assign in this order, never cycle */
  --vt-series-1: #2a78d6; /* blue */
  --vt-series-2: #eb6834; /* orange */
  --vt-series-3: #1baf7a; /* aqua */
  --vt-series-4: #eda100; /* yellow */
  --vt-series-5: #e87ba4; /* magenta */
  --vt-series-6: #008300; /* green */
  --vt-series-7: #6250d6; /* violet */
  --vt-series-8: #e34948; /* red */
  --vt-chart-axis: #c3c2b7;

  --vt-shadow-sm: 0 1px 2px rgba(16,24,40,.06);
  --vt-shadow-md: 0 1px 2px rgba(16,24,40,.06), 0 12px 32px rgba(16,24,40,.08);
  --vt-shadow-lg: 0 2px 4px rgba(16,24,40,.08), 0 24px 56px rgba(16,24,40,.18); /* dialogs, toasts */
  --vt-scrim: rgba(16,24,40,.45);  /* dialog backdrop */
  --vt-tint: 9%;   /* used for pill/alert backgrounds */
}

[data-mode="dark"] {
  color-scheme: dark;
  --vt-success: #4ADE80;
  --vt-warning: #FBBF24;
  --vt-danger:  #F87171;
  --vt-info:    #60A5FA;
  --vt-band-good: #2DD4BF;

  --vt-series-1: #3987e5;
  --vt-series-2: #d95926;
  --vt-series-3: #199e70;
  --vt-series-4: #c98500;
  --vt-series-5: #d55181;
  --vt-series-6: #008300;
  --vt-series-7: #9085e9;
  --vt-series-8: #e66767;
  --vt-chart-axis: var(--vt-border);

  --vt-shadow-sm: 0 1px 2px rgba(0,0,0,.4);
  --vt-shadow-md: 0 1px 2px rgba(0,0,0,.4), 0 16px 40px rgba(0,0,0,.35);
  --vt-shadow-lg: 0 2px 4px rgba(0,0,0,.5), 0 24px 64px rgba(0,0,0,.55);
  --vt-scrim: rgba(0,0,0,.6);
  --vt-tint: 12%;
}
```

### 4.3 Theme tokens (set by `data-theme`)

Every theme defines the same 11 tokens:

| Token | Meaning |
|---|---|
| `--vt-bg` | Page background and sidebar background |
| `--vt-surface` | Cards, panels, tables, inputs |
| `--vt-surface-2` | Table header rows, hover rows, segmented-control track, KPI wells |
| `--vt-border` | All 1px borders and dividers |
| `--vt-text` | Primary text |
| `--vt-text-muted` | Secondary text, labels, captions, inactive nav |
| `--vt-primary` | Primary button fill, active nav bar, app tile, focus ring base |
| `--vt-on-primary` | Text/icons on `--vt-primary` |
| `--vt-primary-soft` | Active nav fill, selected row, selected segment |
| `--vt-link` | Links and text-colored primary (passes 4.5:1 on bg and surface) |
| `--vt-accent` | Secondary highlight (badges, small decorative marks). Never used for text. |

```css
/* ---------- LIGHT ---------- */
[data-theme="basecamp"] {      /* ViaTek default light */
  --vt-bg:#FAF8F5; --vt-surface:#FFFFFF; --vt-surface-2:#F3EFE9; --vt-border:#E4DED5;
  --vt-text:#1A1A2E; --vt-text-muted:#5C5A6B;
  --vt-primary:#FF8F0D; --vt-on-primary:#1A1A2E; --vt-primary-soft:#FFF0DC;
  --vt-link:#A65200; --vt-accent:#2E5E8C;
}
[data-theme="glacier"] {
  --vt-bg:#F5F8FC; --vt-surface:#FFFFFF; --vt-surface-2:#EBF1F8; --vt-border:#D6E0EC;
  --vt-text:#0F1B2D; --vt-text-muted:#4F5E73;
  --vt-primary:#1F5FD1; --vt-on-primary:#FFFFFF; --vt-primary-soft:#E3ECFB;
  --vt-link:#1A52B8; --vt-accent:#FF8F0D;
}
[data-theme="aspen"] {
  --vt-bg:#F4F6F1; --vt-surface:#FFFFFF; --vt-surface-2:#EAEFE5; --vt-border:#D5DDCD;
  --vt-text:#1B2418; --vt-text-muted:#53604E;
  --vt-primary:#2F6B3F; --vt-on-primary:#FFFFFF; --vt-primary-soft:#E1EDE2;
  --vt-link:#2A5F38; --vt-accent:#B7791F;
}
[data-theme="mesa"] {
  --vt-bg:#FBF6F0; --vt-surface:#FFFDFA; --vt-surface-2:#F3EADF; --vt-border:#E6D7C6;
  --vt-text:#2A1A12; --vt-text-muted:#6B5446;
  --vt-primary:#B5482A; --vt-on-primary:#FFFFFF; --vt-primary-soft:#F8E3DA;
  --vt-link:#A03E23; --vt-accent:#2F6F73;
}
[data-theme="columbine"] {
  --vt-bg:#F8F7FC; --vt-surface:#FFFFFF; --vt-surface-2:#EFEDF8; --vt-border:#DDD9EE;
  --vt-text:#1E1A33; --vt-text-muted:#5A5570;
  --vt-primary:#5B3FC4; --vt-on-primary:#FFFFFF; --vt-primary-soft:#ECE7FB;
  --vt-link:#5136B3; --vt-accent:#D9508A;
}
[data-theme="slate-paper"] {
  --vt-bg:#F3F4F6; --vt-surface:#FFFFFF; --vt-surface-2:#E9EBEF; --vt-border:#D3D7DE;
  --vt-text:#111418; --vt-text-muted:#525A66;
  --vt-primary:#0E7C7B; --vt-on-primary:#FFFFFF; --vt-primary-soft:#DDF0EF;
  --vt-link:#0B6B6A; --vt-accent:#FF8F0D;
}

/* ---------- DARK ---------- */
[data-theme="summit-night"] {  /* ViaTek default dark (closest to Envoy today) */
  --vt-bg:#11111C; --vt-surface:#1A1A2E; --vt-surface-2:#23233A; --vt-border:#2F2F4A;
  --vt-text:#ECEBF3; --vt-text-muted:#A3A1B8;
  --vt-primary:#FF8F0D; --vt-on-primary:#1A1A2E; --vt-primary-soft:#3B2A14;
  --vt-link:#FFA64D; --vt-accent:#7AA2F7;
}
[data-theme="timberline"] {
  --vt-bg:#0D1411; --vt-surface:#141E19; --vt-surface-2:#1C2822; --vt-border:#29372F;
  --vt-text:#E3ECE6; --vt-text-muted:#9DB0A4;
  --vt-primary:#4CC38A; --vt-on-primary:#0D1411; --vt-primary-soft:#183326;
  --vt-link:#6FD6A2; --vt-accent:#E0B34F;
}
[data-theme="midnight-range"] {
  --vt-bg:#0A1120; --vt-surface:#111A2C; --vt-surface-2:#18233A; --vt-border:#25324D;
  --vt-text:#E5EBF5; --vt-text-muted:#9AA8C0;
  --vt-primary:#5B9BFF; --vt-on-primary:#0A1120; --vt-primary-soft:#16294A;
  --vt-link:#85B5FF; --vt-accent:#FF8F0D;
}
[data-theme="ember"] {
  --vt-bg:#16100D; --vt-surface:#201814; --vt-surface-2:#2B211B; --vt-border:#3A2D25;
  --vt-text:#F3E8DF; --vt-text-muted:#B9A596;
  --vt-primary:#FF7A45; --vt-on-primary:#16100D; --vt-primary-soft:#3A2116;
  --vt-link:#FF9A70; --vt-accent:#F2C14E;
}
[data-theme="aurora"] {
  --vt-bg:#0E0C19; --vt-surface:#171426; --vt-surface-2:#201C33; --vt-border:#2E2946;
  --vt-text:#ECE8F8; --vt-text-muted:#A7A0C2;
  --vt-primary:#A78BFA; --vt-on-primary:#0E0C19; --vt-primary-soft:#2A2350;
  --vt-link:#C0AEFC; --vt-accent:#2DD4BF;
}
[data-theme="graphite"] {      /* closest to Insight / Reconciliator today */
  --vt-bg:#0A0B0D; --vt-surface:#121417; --vt-surface-2:#1A1D21; --vt-border:#272B31;
  --vt-text:#E7E9EC; --vt-text-muted:#9BA1AA;
  --vt-primary:#4C8DFF; --vt-on-primary:#0A0B0D; --vt-primary-soft:#142440;
  --vt-link:#7EAEFF; --vt-accent:#22D3EE;
}
```

### 4.4 Derived tokens (put after the themes; works for all of them)

```css
:root {
  --vt-primary-hover: color-mix(in srgb, var(--vt-primary) 88%, var(--vt-text));
  --vt-focus-ring: color-mix(in srgb, var(--vt-primary) 55%, transparent);
  --vt-chart-grid: color-mix(in srgb, var(--vt-border) 75%, var(--vt-surface));
  --vt-success-soft: color-mix(in srgb, var(--vt-success) var(--vt-tint), var(--vt-surface));
  --vt-warning-soft: color-mix(in srgb, var(--vt-warning) var(--vt-tint), var(--vt-surface));
  --vt-danger-soft:  color-mix(in srgb, var(--vt-danger)  var(--vt-tint), var(--vt-surface));
  --vt-info-soft:    color-mix(in srgb, var(--vt-info)    var(--vt-tint), var(--vt-surface));
  /* Score bands (7.18): mode-only, like status */
  --vt-band-strong: var(--vt-success);  --vt-band-needs-work: var(--vt-warning);
  --vt-band-at-risk: var(--vt-danger);  --vt-band-none: var(--vt-text-muted);
  --vt-band-good-soft: color-mix(in srgb, var(--vt-band-good) var(--vt-tint), var(--vt-surface));
}
body {
  margin: 0;
  background: var(--vt-bg);
  color: var(--vt-text);
  font-family: var(--vt-font-sans);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
:focus-visible { outline: 2px solid var(--vt-focus-ring); outline-offset: 2px; }
a { color: var(--vt-link); }
```

### 4.5 Tailwind preset (only for apps that use Tailwind)

```js
// viatek-design/src/tailwind-preset.js
const v = (name) => `var(--vt-${name})`;
module.exports = {
  theme: {
    extend: {
      colors: {
        bg: v('bg'), surface: v('surface'), 'surface-2': v('surface-2'), border: v('border'),
        text: v('text'), muted: v('text-muted'),
        primary: { DEFAULT: v('primary'), hover: v('primary-hover'), soft: v('primary-soft'), fg: v('on-primary') },
        link: v('link'), accent: v('accent'),
        success: { DEFAULT: v('success'), soft: v('success-soft') },
        warning: { DEFAULT: v('warning'), soft: v('warning-soft') },
        danger:  { DEFAULT: v('danger'),  soft: v('danger-soft') },
        info:    { DEFAULT: v('info'),    soft: v('info-soft') },
        band: { strong: v('band-strong'), good: v('band-good'), 'good-soft': v('band-good-soft'), 'needs-work': v('band-needs-work'), 'at-risk': v('band-at-risk'), none: v('band-none') },
        series: Object.fromEntries([1,2,3,4,5,6,7,8].map(n => [n, v(`series-${n}`)])),
      },
      fontFamily: { display: v('font-display'), sans: v('font-sans'), mono: v('font-mono') },
      borderRadius: { sm: v('radius-sm'), md: v('radius-md'), lg: v('radius-lg'), xl: v('radius-xl') },
      boxShadow: { sm: v('shadow-sm'), md: v('shadow-md') },
    },
  },
};
```

Remove Tailwind's default `dark:` variant usage. Dark mode is handled by tokens, so `dark:` classes must not exist in the migrated code.

---

## 5. Theme switching (theme.js)

### Storage model

| Key | Values | Default |
|---|---|---|
| `mode` | `system` \| `light` \| `dark` | `system` |
| `lightTheme` | one of the 6 light ids | `basecamp` |
| `darkTheme` | one of the 6 dark ids | `summit-night` |

The user picks a favorite light theme AND a favorite dark theme. Mode decides which one is showing. With `system`, it follows `prefers-color-scheme` live.

**Where it is saved:**
1. Always in `localStorage` under the key `viatek.theme` (JSON), so it applies instantly on load.
2. If the app has a logged-in user and uses Supabase, also save it to a shared `user_preferences` table so the choice follows the user across apps and devices (section 5.3). On login, the server value wins over localStorage.

### 5.1 No-flash snippet (inline, first thing in `<head>`)

```html
<script>
(function () {
  var d = { mode: 'system', lightTheme: 'basecamp', darkTheme: 'summit-night' };
  try { d = Object.assign(d, JSON.parse(localStorage.getItem('viatek.theme') || '{}')); } catch (e) {}
  var dark = d.mode === 'dark' || (d.mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  var el = document.documentElement;
  el.setAttribute('data-mode', dark ? 'dark' : 'light');
  el.setAttribute('data-theme', dark ? d.darkTheme : d.lightTheme);
  // Sidebar state (section 6.1a). Replace APP_ID with this app's id, e.g. 'insight'.
  var s = null;
  try { s = localStorage.getItem('viatek.sidebar.APP_ID'); } catch (e) {}
  if (!s) s = innerWidth >= 1280 ? 'expanded' : 'collapsed';
  el.setAttribute('data-sidebar', s);
})();
</script>
```

### 5.2 theme.js API

```js
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

// getPrefs(): returns { mode, lightTheme, darkTheme }
// setPrefs(partial): merges, saves to localStorage, applies, emits 'viatek:theme' event,
//                    and calls the optional remote sync hook
// applyPrefs(prefs): sets data-mode + data-theme on <html>
// onSystemChange: listens to matchMedia('(prefers-color-scheme: dark)') and re-applies when mode === 'system'
// registerSync(fn): optional; fn(prefs) persists to Supabase
// Charts: listen for the 'viatek:theme' event and re-read CSS variables, since canvas/SVG charts
//         do not repaint on their own.
```

Validate every stored id against `THEMES`. Fall back to the default if an id is unknown.

### 5.3 Supabase (shared preference across apps)

```sql
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme_mode text not null default 'system' check (theme_mode in ('system','light','dark')),
  light_theme text not null default 'basecamp',
  dark_theme text not null default 'summit-night',
  updated_at timestamptz not null default now()
);
alter table public.user_preferences enable row level security;
create policy "own prefs read"   on public.user_preferences for select using (auth.uid() = user_id);
create policy "own prefs upsert" on public.user_preferences for insert with check (auth.uid() = user_id);
create policy "own prefs update" on public.user_preferences for update using (auth.uid() = user_id);
```

Apps that do not use Supabase auth use localStorage only.

---

## 6. The app shell (required in every app)

```
+----------------------+--------------------------------------------------------------+
| [I] Insight          | [≡] Operations › Overview      ● IT Glue 4h ● Autotask 13m [◐] |
|     VIATEK           +--------------------------------------------------------------+
|----------------------|                                                              |
| OVERVIEW             |  Page title                              [Secondary] [Primary]|
| ▌Overview            |  Meta line (date range · scope · comparison)                  |
|  Advisor             |                                                              |
| OPERATIONS           |  [KPI] [KPI] [KPI] [KPI]                                     |
|  Utilization         |  [Chart panel            ] [Side panel      ]                |
|  ...                 |  [Table                                     ]                |
| ADMIN                |  [Synced footer strip                       ]                |
|  Settings            |                                                              |
+----------------------+--------------------------------------------------------------+
```

### 6.1 Sidebar

- Width `--vt-sidebar-w` (248px). Collapses to `--vt-sidebar-w-collapsed` (64px). See **6.1a Collapsing** below.
- Background `--vt-bg` in dark mode, `--vt-surface` in light mode. Right border 1px `--vt-border`.
- **Identity block (top):** a 32px square tile, radius 8px, fill `--vt-primary`, with the app's first letter in `--vt-on-primary`, Space Grotesk 700, 16px. Next to it the app name (Inter 700, 16px, `--vt-text`) and below it `VIATEK` (mono 10px, letter-spacing .24em, `--vt-text-muted`). A bottom border separates it from the nav.
- **Section labels:** mono 11px, UPPERCASE, letter-spacing .16em, `--vt-text-muted`, 12px top padding. Sections can be collapsible (chevron right-aligned) as in Reconciliator.
- **Nav item:** height 36px min, padding 0 10px, radius `--vt-radius-md`, 17px stroke icon (1.8 stroke, Lucide set) plus a label in Inter 14px/500, inactive color `--vt-text` at 78% (`color-mix(in srgb, var(--vt-text) 78%, var(--vt-bg))`).
- **Active item:** fill `--vt-primary-soft`, text `--vt-text`, weight 600, plus a 3px bar on the left edge in `--vt-primary` (`box-shadow: inset 3px 0 0 var(--vt-primary)`). Set `aria-current="page"`.
- **Hover:** fill `--vt-surface-2`.
- **Count badge** (for example Envoy's Worklist 40): right-aligned mono 11px pill, fill `--vt-primary`, text `--vt-on-primary`. Use it only for counts that ask for action (items waiting on the user).
- **Plain count** (`.vt-nav-count`): right-aligned mono 11px in `--vt-text-muted`, no fill. Use it for counts that are information, such as the number of records in each view.
- **Sub-items** with a `›` chevron expand inline, indented 28px.
- **Split item:** when the parent is also a page, the label is a link to that page and a separate 28px chevron button on the right opens the sub-items (`.vt-nav-split` with `.vt-nav-item` and `.vt-nav-expander`). One click on the label navigates, as before. When the parent is not a page, the whole row is the button.
- On screens narrower than 900px the sidebar becomes an off-canvas drawer opened from the top-bar menu button.

### 6.1a Collapsing (required in every app)

**Toggle**
- The 36px button at the far left of the top bar toggles the sidebar. Icon: a panel outline with a `‹` chevron when expanded and a `›` chevron when collapsed (Lucide `panel-left-close` / `panel-left-open`).
- `aria-label` and tooltip switch between "Collapse sidebar" and "Expand sidebar". Set `aria-controls` to the sidebar's id and `aria-expanded` to the current state.
- Keyboard shortcut: `[` toggles it, only when focus is not in an input, textarea, select or contenteditable element. List the shortcut in the tooltip ("Collapse sidebar ( [ )").

**Collapsed state (64px wide)**
- The identity block shows only the 32px letter tile, centered. The app name and VIATEK caption are hidden.
- Section labels are replaced by a 1px `--vt-border` divider so the groups stay visible.
- Nav items are icon-only, 40px tall and centered. The active item keeps its `--vt-primary-soft` fill and 3px left bar.
- Every item keeps its accessible name (`aria-label` on the link) and shows a tooltip with the label on hover and keyboard focus, placed to the right, after a 300ms delay.
- Count badges become an 8px dot in `--vt-primary` at the icon's top-right corner, and the count moves into the tooltip ("Worklist · 40").
- Collapsible section chevrons and sub-items are hidden. Clicking an icon that has sub-items opens a flyout menu to the right with the section label and its sub-items. For a split item, the flyout lists the parent page first, then its sub-items. Plain counts are hidden and move into the tooltip like badge counts.

**Behavior**
- Animate width with `transition: width var(--vt-dur) var(--vt-ease)`. Skip the animation when `prefers-reduced-motion` is set. Hide labels at the start of collapsing and show them at the end of expanding so text never wraps mid-animation.
- The content area takes the freed space. Charts must resize (listen with a ResizeObserver on the content container).
- Remember the state per app in localStorage as `viatek.sidebar.<app-id>` = `collapsed` | `expanded`. Default: expanded on screens 1280px or wider, collapsed between 900px and 1279px. A saved choice always wins over the default.
- Apply the saved state in the same no-flash `<head>` script as the theme (set `data-sidebar="collapsed"` on `<html>`) so the layout does not jump on load.
- Under 900px the toggle opens and closes the off-canvas drawer instead, which always shows the full 248px sidebar with labels. Close it with Escape, a backdrop click or after navigating.

### 6.2 Top bar

- Height `--vt-topbar-h` (60px), bottom border `--vt-border`, background `--vt-bg`.
- Left: a 36px collapse-sidebar icon button (`aria-label="Collapse sidebar"`), a breadcrumb (`Section › Page`, parent in `--vt-text-muted`, current page in `--vt-text` 600).
- Right, in this order: environment badge (6.4, only when not on live data), data-freshness indicators, context controls (scope segmented control, date range), the quick theme toggle (section 8), help (a link, or an icon button that opens the help panel, 6.5), the user menu (6.4, last).
- **Freshness indicator:** a 7px dot plus mono 12px text in `--vt-text-muted`, such as `● Autotask 13m`. Dot colors: `--vt-success` when fresh, `--vt-warning` when stale (each app defines its own stale threshold), `--vt-danger` when the sync failed. The text must say the state too (for example `Datto failed`), so the meaning never depends on color alone.
- **Which feeds to show:** the ones the current page depends on. On pages that span all clients, show the app-wide feeds (for example `Watcher 2m`). Inside one client, show that client's feeds (for example `Audit 6h`). Each app sets its own stale thresholds and lists them in its `CLAUDE.md`.
- The page title is NOT repeated in the top bar. It lives in the content area.

### 6.3 Content area

- Padding 28px. Content max-width `--vt-content-max` (1280px), **left-aligned next to the sidebar** (do not center it in a wide empty area, which Insight does today).
- **Page header:** title (Space Grotesk 600, 28px), a meta line beneath it (`--vt-text-small`, `--vt-text-muted`, segments joined with ` · `), and actions on the right (at most one primary button).
- Vertical gap between sections: 22 to 24px.
- Every page ends with the **sync footer strip** if the app syncs external data (mono 12px, freshness dots, bordered, radius-lg).

Sections 6.4 to 6.6 and 7.15 to 7.24 were added in v1.3.0, from the Sec Audit and ConfigReport gap briefs. Full markup for each is in the comments in `components.css` and on `/theme-preview`.

### 6.4 User menu and environment badge

- **User menu** (`.vt-user-btn` + `.vt-menu.vt-menu--list`): the last item on the right of the top bar. A 28px avatar (`.vt-avatar`, initials or photo) and the user's name (hidden under 1100px). It opens a menu with a header (name, an `admin` tag if it applies, the sign-in email), then items (`.vt-menu-item`), a separator (`.vt-menu-sep`) and **Sign out** last. Use `aria-haspopup="menu"` and `aria-expanded`.
- **List menus** (`.vt-menu--list`) are also used for row "more" menus. `.vt-menu-item--danger` for destructive items. The quick theme toggle (8.1) keeps the plain `.vt-menu`.
- **Custom select lists** (comboboxes, shadcn Select) use `.vt-listbox` with `.vt-option` and a check icon on the chosen item. A native `.vt-select` is still the first choice. Use a custom list only when it needs search or more than about 15 options.
- **Environment badge:** when the app is not on live data, a warning pill with an icon comes first on the right: `sample data`, `dev copy`, `sign-in off`. It never hides at narrow widths. It is a pill, not an alert banner, because it describes the whole app, not one page.

### 6.5 Docked help panel (`.vt-helppanel`)

- An in-app guide on the right: 440px, `--vt-surface`, 1px left border. Head the height of the top bar (title, a "Full guide" ghost link, close button), optional view tabs (7.13) and search field, then a scrolling body using `.vt-prose` (7.20).
- It goes inside `.vt-app` after `.vt-main`. At 1536px and wider it docks: the content area gets narrower and keeps its 1280px max-width and left alignment. Below 1536px it overlays the page with `--vt-shadow-lg`. Both the sidebar and the panel can be open at once.
- The top-bar help button becomes an icon button with `aria-expanded` and `aria-controls`. Escape and the close button close the panel and return focus to the button.

### 6.6 Pages without the shell

- **Sign-in and error pages** (sign in, not authorized, auth error, 404): `.vt-auth`, a centered 400px card (`.vt-auth-card`, radius-xl) with the identity block on top, an h2-size title, one line of text, an alert (7.9) for errors, and one Primary button (`.vt-btn--block`), such as "Sign in with Microsoft".
- **Presentation views and pop-out windows** (a client-facing presentation, a 560px checklist popup): `.vt-bare`, a slim top strip (`.vt-bare-head`) with the 32px app tile, a title, and on the right the quick theme toggle and a close or back link. No sidebar, no breadcrumb. Content uses `.vt-content`, centered.

---

## 7. Components

Use the Lucide icon set (stroke 1.8) in every app. No emoji in UI.

### 7.1 Buttons (height `--vt-control-h`, radius `--vt-radius-md`, Inter 14px/600, padding 0 16px)

| Variant | Style | Use |
|---|---|---|
| Primary | fill `--vt-primary`, text `--vt-on-primary`, hover `--vt-primary-hover` | One per view: the main action |
| Secondary | fill `--vt-surface`, 1px `--vt-border`, text `--vt-text`, hover fill `--vt-surface-2` | Other actions |
| Ghost | transparent, text `--vt-link` | Low-emphasis actions, "View all" |
| Danger | fill `--vt-danger`, text white in light mode / `--vt-bg` in dark mode | Destructive confirms only |
| Icon | 36px square, transparent, `--vt-text-muted`, needs `aria-label` | Toolbar actions |

**Never put white text on `--vt-primary`.** Always use `--vt-on-primary`. (Reconciliator's current white-on-blue button fails the contrast standard.)

Envoy's orange "Go" and "Touch" buttons become standard Primary buttons. The "Log a touchpoint" tile becomes a Primary button in the page header.

### 7.2 KPI tile

```
┌────────────────────────────┐
│ TEAM UTILIZATION        (i) │  mono 11px label, muted, info icon button
│ 69.4%                       │  mono 32px/500 value
│ ╱╲╱‾╲_╱‾                    │  28px sparkline, 2px stroke, --vt-series-1
│ ↗ +16.6 pts                 │  mono 13px/600, colored by good/bad
│ vs previous period          │  12px muted
└────────────────────────────┘
```

- Fill `--vt-surface`, 1px `--vt-border`, radius-lg, padding 14px 16px, gap 6px.
- **Left status edge** (3px, `box-shadow: inset 3px 0 0 <color>`) ONLY when the metric is judged against a target: `--vt-success` on target, `--vt-warning` near the line, `--vt-danger` off target. Neutral metrics get no edge.
- Delta color means good/bad for the business, not up/down. Fewer offline endpoints is shown in success color even though the number went down.
- Arrows: `↗` up, `↘` down, `→` flat.
- Grid: `repeat(auto-fit, minmax(200px, 1fr))`, gap 12px.

### 7.3 Status pill

- Inline-flex, height 22px, padding 0 8px, radius `--vt-radius-sm`, mono 12px/500, lowercase text (Reconciliator style: `in progress`, `finished`).
- Text `--vt-<status>`, fill `--vt-<status>-soft`, 1px border `color-mix(in srgb, var(--vt-<status>) 40%, var(--vt-surface))`.

| Meaning | Token | Words |
|---|---|---|
| Done, good | success | finished, healthy, done, synced, succeeded, ok, complete, sent, undone, fixed by agent, online, reviewed, resolved, verified fixed, pass, read, improved, final, linked, matched, travelling now |
| Working or needs a look | warning | in progress, waiting, stale, due soon, running, pending, partial, incomplete, preparing, generating, sending, undoing, agent working, started, review, needs client, waiting for audit, not confirmed yet, awaiting approval, partly succeeded, partly read, needs consent, off, name match, not configured |
| Failed or overdue | danger | failed, overdue, escalated, offline, agent failed, error, fail, incident, didn't stick, came back, new failure, worsened, couldn't be read, rejected |
| Not started yet | info | queued, new, info, scheduled, to do, ready to send, ready, upcoming |
| Not applicable | `--vt-text-muted` (`.vt-pill--muted`) | draft, skipped, n/a, cancelled, unknown, not a problem, false positive, accepted risk, informational, bypassed, not licensed, not watched yet, not read yet, ended, removed, expired, revoked |

Words added in v1.3.0, with the reason where it is not obvious: `accepted risk` and `false positive` are decisions, not problems, so muted. `off` is warning because it means a watcher that should be running is not. `came back` and `didn't stick` mean a fix failed, so danger. `ready` (generated, waiting for review) is info, like `ready to send`. `review` (has items to check before sending) is warning.

**Severity** uses the same pill: `critical` danger, `high` warning, `medium` info, `low` muted, `info` muted. Medium is blue on purpose so every level looks different. Apps that show medium in yellow today change it.

**Score bands** have their own pills (7.18): `strong`, `good`, `needs work`, `at risk`, `not scored`.

Every app must use the same word-to-color mapping. Add a word to this table before using it in an app. A word that names an ongoing action (`running`, `sending`) is warning; the finished form of the same action (`succeeded`, `sent`) is success.

**Tag** (`.vt-tag`): a neutral label for words that describe a thing instead of reporting its status, such as `keep`, `archive`, `active`, `inactive`, `deleted`, `suspended`, `not in Pulse`, `never matched`, `permanent`, evidence labels, bucket names and kinds of finding (ConfigReport's reconciliation categories: `missing Datto agent`, `orphaned Datto device`, `archived in IT Glue`, `spec difference`, `stale agent`; whether one needs action goes in a separate status pill on the row). Same size as a pill, mono 12px/500, `--vt-text` on `--vt-surface-2` with a 1px `--vt-border` border, and it keeps the word's own case. Tags are never colored. If a tag starts to mean "this needs action", it is a status and goes in the table above.

### 7.4 Tables

- Container: `--vt-surface`, 1px border, radius-lg, `overflow-x: auto` wrapper.
- Optional title strip: mono label (for example `SESSIONS`) left, ghost link right, bottom border.
- Header row: fill `--vt-surface-2`, mono 11px UPPERCASE, letter-spacing .12em, `--vt-text-muted`, padding 10px.
- Body rows: 1px top border `--vt-border`, padding 12px, hover fill `--vt-surface-2`.
- Dates, times, numbers, costs, IDs: mono 13px, numbers right-aligned.
- **Attention row** (overdue, failed): 3px left edge in `--vt-danger` or `--vt-warning` (inset box-shadow on the row), plus a status pill. Use only for rows that need action, never for decoration.
- Row actions (Envoy's Log held / Skip / Reschedule): Secondary buttons at 32px height, right-aligned, wrap on narrow screens.
- **Empty cells** show a muted hyphen (`.vt-null`), never an em dash and never a blank cell: `<span class="vt-null"><span aria-hidden="true">-</span><span class="vt-sr-only">none</span></span>`.
- Long tables page with the **pager** (7.14) under the table, inside the card.

### 7.5 Panels / cards

`--vt-surface`, 1px `--vt-border`, radius-lg, padding 18px 20px. Header: h3 title, small muted description under it, optional ghost link top-right (`Utilization ↗`). No gradients, no colored left borders on cards (the edge is only for status, see 7.2 and 7.4).

### 7.6 Forms

- Label above the field: Inter 13px/600. Help text below: 12px muted. Error text: 12px `--vt-danger`, plus an icon.
- Input/select: height 38px, radius-md, fill `--vt-surface` (light) or `--vt-bg` (dark), 1px `--vt-border`, focus 2px `--vt-focus-ring`.
- Checkboxes: `accent-color: var(--vt-primary)`.
- Every input has a real `<label for>`.

### 7.7 Segmented control (scope / mode toggles)

Track: 1px border, radius-md, padding 3px. Selected segment: fill `--vt-primary-soft`, text `--vt-text`, 600. Others: transparent, `--vt-text-muted`.

### 7.8 Charts

- Series colors `--vt-series-1` to `--vt-series-8`, **assigned in order, never cycled**. More than 8 categories get folded into "Other" (`--vt-text-muted`).
- A color stays attached to its entity. Filtering must not repaint the remaining series.
- Previous-period line: the same series color, dashed `5 4`. Targets and thresholds: 1px dashed `--vt-text-muted` with a mono label. Do not use status colors for chart series.
- Gridlines `--vt-chart-grid` (1px), axis `--vt-chart-axis`, axis labels mono 11px `--vt-text-muted`.
- Lines 2px. Markers 8px or larger with a 2px `--vt-surface` ring. Bars have 4px rounded ends and a 2px gap between segments.
- One y-axis per chart. Never a dual axis.
- Show a legend whenever there are 2 or more series. Hover tooltips on every chart. Weekends or no-data days are gaps, not drops to zero.
- Charts re-read CSS variables on the `viatek:theme` event (Chart.js, Recharts and ECharts do not do this on their own).

Sections 7.9 to 7.14 were added in v1.2.0. Full markup for each is in the comments in `components.css` and on `/theme-preview`.

### 7.9 Alert banner (`.vt-alert`)

For conditions on the page: stale data, a failed sign-in, a job error, a guide note.

- Radius-md, padding 12px 14px, fill `color-mix(<status> var(--vt-tint), --vt-surface)`, 1px border at 40% status. Text `--vt-text` 14px, optional bold title on the first line, 17px status icon on the left, optional small Secondary button on the right.
- Variants: `--info`, `--success`, `--warning`, `--danger`, using the same meanings as 7.3. Stale data is warning. A failed sync or sign-in is danger.
- `role="status"`, except errors that appear right after a user action, which get `role="alert"`.
- Not for success after an action: that is a toast (7.12).

### 7.10 Dialog (`.vt-dialog`)

For confirming bulk or destructive actions, and short forms.

- Native `<dialog>` opened with `showModal()` (focus trap, Escape and the backdrop come for free). Apps on Radix or shadcn put `.vt-dialog-scrim` on the overlay and `.vt-dialog` on the content.
- Width 480px (`--wide` 720px), fill `--vt-surface`, 1px border, radius-xl, `--vt-shadow-lg`. Backdrop `--vt-scrim`.
- Header: title in `--vt-text-h3` that asks the question with the count ("Archive 12 devices?") and a close icon button. Body: 14px, says what will happen and whether it can be undone. Footer, right-aligned: Secondary "Cancel", then the confirm button named after the action ("Archive 12"), Danger if destructive, otherwise Primary.

### 7.11 Help popover (`.vt-popover`)

The `?` next to a label. A 28px icon button (`aria-expanded`, `aria-controls`) opens a box under it: max-width 320px, fill `--vt-surface`, 1px border, radius-lg, `--vt-shadow-md`, padding 12px 14px. Inside: a 13px/600 title, 13px text and an optional "Read more" link. Closes on Escape, outside click or the button. Tooltips (`.vt-tooltip`) stay for one-line labels only.

### 7.12 Toast (`.vt-toast`)

For results of an action the user just took ("Job started", "Saved"). Bottom-right stack, width 380px, fill `--vt-surface`, 1px border, radius-lg, `--vt-shadow-lg`, a 3px left edge and icon in the status color, title 14px/600 and optional 13px muted description. Success and info close after 4 seconds. Errors stay until closed. Apps using Sonner pass `unstyled: true` and the class names listed in `components.css`.

### 7.13 Tabs and filter chips

- **Tabs** (`.vt-tabs`, `.vt-tab`) switch between views of the same page. They are links with `aria-current="page"` when each view has its own URL, or `role="tab"` with `aria-selected` for in-page panels. Height 40px, 14px/500 muted text, selected: `--vt-text` 600 with a 2px `--vt-primary` underline. An optional count (`.vt-tab-count`) sits in a mono 11px pill.
- **Filter chips** (`.vt-chip`) turn filters or fields on and off, several at a time. Height 30px, full radius, 1px border, 13px text. Selected: `--vt-primary-soft` fill, `--vt-primary` border, 600, and a check icon. Buttons use `aria-pressed`, links use `aria-current="true"`.
- The segmented control (7.7) stays for choosing one of 2 to 4 options that change a setting, such as scope or mode.

### 7.14 Disclosure, empty state, pager

- **Disclosure** (`details.vt-disclosure`): "How this works" and similar fold-out text. Summary row 44px, 14px/600, chevron on the left. `--plain` drops the border for use inside a panel.
- **Empty state** (`.vt-empty`): 1px dashed `--vt-border`, radius-lg, centered, optional 24px icon, a one-line title in `--vt-text` 600, one sentence of muted text saying why it is empty, and an optional button for the next step.
- **Pager** (`.vt-pager`): under a table, inside its card. Mono range on the left (`1 to 50 of 312`), small Secondary "Previous" and "Next" buttons on the right. A disabled button gets `aria-disabled="true"`.

### 7.15 Switch (`.vt-switch`)

For on/off settings that save on their own (client active, job enabled, "write notes automatically"). A checkbox (7.6) stays for choices inside a form that is submitted.

- A real `<button role="switch" aria-checked>` with a visible text label beside it (`.vt-switch-field`, label on the right). 36 by 20px, full radius. Off track: `--vt-text-muted` at 55% on surface. On track: `--vt-primary`. Knob: `--vt-surface` with `--vt-shadow-sm`. Disabled at 50% opacity.
- shadcn, Radix and Base UI switches are covered through `data-state="checked"` and `data-checked`.

### 7.16 More form fields

- **Textarea** (`.vt-textarea`): the same border, fill, radius and focus as `.vt-input`, min-height 88px, padding 10px 12px, resizes vertically only. Add `.vt-mono` for line lists (one account per line).
- **Date and time:** native `<input type="date">`, `time`, `datetime-local` with `.vt-input`, in mono. `color-scheme` from `data-mode` keeps the calendar icon readable in dark mode. Two date inputs side by side (`.vt-date-range`, "to" between them) make a range.
- **Calendar** (`.vt-calendar` inside a `.vt-popover`): only when a field needs a range in one control or blocked days. Today has a 1.5px `--vt-primary` ring, selected days a `--vt-primary` fill with `--vt-on-primary` text, the days between `--vt-primary-soft`, other months muted. Apps on shadcn's Calendar (react-day-picker) map its day, today, selected, range_middle and outside parts to these classes.
- **Color field** (`.vt-color-field`): a 38px swatch (`input type="color"`) and a mono hex input. The chrome uses tokens. The value is report data and keeps its own color in every theme.
- **File upload** (`.vt-upload`): a dashed box with a 64px preview, file name, a help line with the allowed types and size, and Replace and Remove buttons. The real file input sits inside the Replace label. `data-dragover` while a file is held over it, `aria-invalid="true"` and a `.vt-error` line for a wrong type or a file that is too large.

### 7.17 Sortable table headers

- The header cell holds a `<button class="vt-sort">` with three Lucide icons: `arrow-up-down` (not sorted), `arrow-up`, `arrow-down`. CSS shows the right one from `aria-sort` on the `<th>`.
- The sorted column has `aria-sort="ascending"` or `"descending"` and its header text in `--vt-text`. Other sortable columns have `aria-sort="none"`. Columns that cannot sort have no button and no `aria-sort`.
- Numeric columns keep `.vt-num`, so the button and icon align right.

### 7.18 Score ring and score bands

For apps that grade something from 0 to 100 (Sec Audit's security score).

| Band | Token | Pill | Meaning |
|---|---|---|---|
| Strong | `--vt-band-strong` (= success) | `.vt-pill--band-strong` | Meets the standard |
| Good | `--vt-band-good` (teal, new) | `.vt-pill--band-good` | Acceptable, with room to improve |
| Needs work | `--vt-band-needs-work` (= warning) | `.vt-pill--band-needs-work` | Below the standard |
| At risk | `--vt-band-at-risk` (= danger) | `.vt-pill--band-at-risk` | Act now |
| Not scored | `--vt-band-none` (= text-muted) | `.vt-pill--band-none` | No data yet |

- Band colors depend on mode only, never on the theme, like status colors. `--vt-band-good` is `#0B6B78` in light mode and `#2DD4BF` in dark mode. It passes 4.5:1 on every surface and on its soft fill in all 12 themes. Each app sets its own band cut-offs and lists them in its `CLAUDE.md`.
- **Ring** (`.vt-ring`): a donut with the arc in the band color (`.vt-band--<band>`) on a `--vt-surface-2` track, set with `style="--value:78"`. The number sits in the middle in mono. Sizes: `--sm` 32px (table cells), `--md` 64px, `--lg` 120px, `--xl` 160px.
- **Projected score:** add `--proj` (for example 86). The part of the arc between the score and the projection is drawn in the band color at 35%. Say the projected number in text too (`.vt-ring-sub`).
- The ring has `role="img"` and an `aria-label` with the score and band. The band word always shows next to or under the ring as a band pill, so the band never depends on color alone.
- **Area meters:** a `.vt-progress` (7.19) with a band class becomes a 0 to 100 bar in the band color, with `role="meter"`.
- In charts, a score line uses the series tokens like any other line (7.8), not band colors. Band zones behind a trend line may use the band colors at 9% (light) or 12% (dark).

### 7.19 Loading and progress

- **Busy button:** `aria-busy="true"` and `disabled`, with a `.vt-spinner` in place of the leading icon. Keep the label, or give the button a min-width, so its width does not change.
- **Skeleton** (`.vt-skeleton`, `--title`, `--block`, `--circle`): `--vt-surface-2` blocks shaped like the content that is coming, with a slow shimmer that turns off under `prefers-reduced-motion`. The loading region gets `aria-busy="true"`. An empty state (7.14) is for "no data", never for "loading".
- **Progress bar** (`.vt-progress`): 8px track in `--vt-surface-2`, fill in `--vt-primary`, a mono count beside it (`12 of 40`), and an optional stats line in mono 12px (`10 done` in success, `2 failed` in danger, `0 cancelled` muted). `role="progressbar"` with `aria-valuenow` and `aria-valuemax`. Indeterminate: `data-indeterminate` on the track and no `aria-valuenow`.

### 7.20 Long-form text (`.vt-prose`)

For user guides, "how to fix" steps and advisor answers rendered from Markdown. Max 72 characters wide, 14px/1.6. Headings use the type scale (h2 20px display, h3 15px, h4 14px/600). Inline `code` and `pre` sit on `--vt-surface-2` with a 1px border. Blockquotes have a 2px `--vt-border` left rule and muted text. Tables use the 7.4 header style. Links use `--vt-link`.

### 7.21 Advisor thread (`.vt-thread`)

- The user's question on the right on `--vt-primary-soft`, at most 80% wide. The answer full width on `--vt-surface` with a 1px border, its body in `.vt-prose`. Each turn ends with a mono 11px muted meta line (who or which model, and the time).
- While an answer is written: a pending turn with a spinner, "Thinking" and a small Secondary "Stop" button. The thread has `aria-live="polite"`.
- The composer (`.vt-composer`) is pinned under the thread: a textarea and one Primary button. Its background is `--vt-surface`. Set `--vt-composer-bg: var(--vt-bg)` when the thread sits straight on the page.

### 7.22 List and detail (`.vt-split`)

A list on the left and the selected item on the right (an alerts page). The detail column is 420px and sticks under the top bar on wide screens. Under 1100px the two stack. The selected row uses `tr[aria-selected="true"]` (7.4) or `.vt-list-item[aria-selected="true"]`, both on `--vt-primary-soft`. `.vt-grid-2` stays for dashboards with a main and a side panel.

### 7.23 Document preview frame (`.vt-docframe`)

For a client PDF, email or template shown inside the app. A bordered card with a toolbar strip (a mono label such as `CLIENT PREVIEW`, a muted note "Shown as the client sees it", and open and download icon buttons) and a `--vt-surface-2` stage. The iframe or image inside always renders on a light canvas (`color-scheme: light`) and keeps its own colors in every theme (14.3). Never put `data-mode` or `data-theme` on the document.

### 7.24 Checklist, reorder list, folding panel

- **Checklist** (`.vt-checklist`): numbered parts (`.vt-step-num`, a 22px mono circle) with a title and a mono count (`2 of 5`). Each item is a real checkbox label with the step text and muted `Where:` and `Done when:` lines. Checked items turn muted and stay readable.
- **Reorder list** (`.vt-reorder`): rows with a grip handle (`.vt-drag-handle`, a button named "Move <item>"). Mouse: drag the handle, with a 2px `--vt-primary` line where the row will land (`data-drop="before"` or `"after"`) and `data-dragging` on the row being moved. Keyboard: Space picks the row up (`aria-pressed="true"`), arrow keys move it, Space drops it, Escape puts it back. Every move is announced in an `aria-live` region. dnd-kit apps keep its keyboard sensor and use these classes.
- **Folding panel** (`details.vt-panel.vt-panel--fold`): a card whose body folds away, with the panel head as the `<summary>` and a chevron (`.vt-fold-chevron`) on the right. The disclosure (7.14) stays for fold-out text inside a page or panel.

---

## 8. Theme picker

### 8.1 Quick toggle (top bar, every app)

An icon button (sun/moon) that opens a small menu:

- Mode: `System` / `Light` / `Dark` (segmented control)
- "Theme settings…" link to the full picker

### 8.2 Full picker (Settings › Appearance, every app)

- Two groups: **Light theme** and **Dark theme**, each a radio group of 6 cards.
- Each card: three 18px swatches (bg, primary, accent), the theme name (Inter 15px/600) and its note (12px muted). The selected card has a 2px `--vt-primary` border and `--vt-primary-soft` fill. Use `role="radiogroup"`/`role="radio"` and arrow-key navigation.
- Clicking a card in the group that is not showing previews it right away (temporarily switch mode) and shows "Previewing. Mode is set to Light/Dark/System." Confirm by leaving the page or switching back.
- This matches the Theme Explorer on the design canvas. Use it as the visual reference.

---

## 9. Accessibility (required)

- Every token pair already passes WCAG AA (4.5:1) for text: `text`/`text-muted`/`link` on `bg` and `surface`, `on-primary` on `primary`, every status color on `surface`, and `--vt-band-good` on `surface` and on its soft fill. Do not create new pairings. If you need one, check it and add it to `tokens.css` for every theme.
- `--vt-accent` and `--vt-series-*` are never used for text.
- Status is never shown by color alone. Always include a word, an icon or both.
- Visible focus on every interactive element (`:focus-visible` ring).
- Real `<button>`, `<a href>`, `<label>` elements. No clickable `<div>`s.
- Hit targets at least 36px in dense desktop UI, and 44px on touch layouts (Site Ranger).
- Respect `prefers-reduced-motion`: disable transitions over 200ms.

---

## 10. Content rules

- No em dashes anywhere in UI copy. Use a period, comma, colon or " · ". Empty table cells use a muted hyphen (7.4).
- Sentence case for titles, buttons and labels ("Start guided cleanup", not "Start Guided Cleanup"). Exception: mono labels are UPPERCASE.
- Dates: `Nov 11, 2026`. Times: `5:43 PM MT`. Relative times: `13m`, `4h`, `2d` in freshness chips, and `13 min ago` in sentences.
- Hours: `835.7 h`. Percent: `69.4%`. Money: `$1,204.50`.

---

## 11. Migration plan

Do one app per session, following the procedure in section 14. At the end of each, run the checklist in section 12 and show Sid screenshots of 3 key pages in both Basecamp and Summit Night. The notes below are extra steps for specific apps, on top of section 14.

1. **Build the `viatek-design` repo** (sections 3 to 6.1a), including the `/theme-preview` page, deploy it to Vercel, and tag `v1.0.0`.
2. **Reconciliator** (already a sidebar app, simplest migration). Swap colors for tokens, fix the white-on-blue primary button, set pills to section 7.3, add the theme picker.
3. **Insight.** Same, plus: move the content to left-aligned max-width, standardize the KPI tiles (7.2), move chart colors to the series tokens, and turn the weekend drops in the trend chart into gaps.
4. **Envoy.** Convert the top nav to the sidebar:
   - Sidebar sections: `WORK` (Today, Worklist [count badge], Schedule), `CLIENTS` (Clients, Stack, Scorecard), `REPORTS` (Reports sub-items), `ADMIN` (Admin), `HELP` (Training).
   - The "Touch" button becomes the Primary button in the top bar ("Log touchpoint").
   - Level/XP/streak indicators move to the top bar right side as mono chips.
   - Overdue meeting rows use the attention row (7.4) plus a `overdue` danger pill instead of the solid red badge.
5. **Site Ranger, Keystone, Atlas and any others**, one at a time. Site Ranger also uses 44px touch targets.
6. Add the `@viatek/design` dependency and the CLAUDE.md block (3.2) to the starter template so every new app begins on it.

---

## 12. Acceptance checklist (per app)

- [ ] No hard-coded colors in the app (all from `@viatek/design`) (grep for hex and `rgb(`)
- [ ] All 12 themes render with no unreadable text, invisible borders or wrong-colored charts
- [ ] Mode `System` follows the OS live, with no flash of the wrong theme on load
- [ ] Theme choice survives reload (and syncs across apps if Supabase prefs are on)
- [ ] Sidebar matches 6.1: identity block, mono section labels, active bar
- [ ] Collapse matches 6.1a: button and `[` shortcut, icon-only items with tooltips, state remembered per app, no layout jump on load, drawer under 900px
- [ ] Top bar matches 6.2: breadcrumb, freshness dots with text, quick theme toggle
- [ ] Numbers, dates, IDs and costs are in mono with tabular figures
- [ ] Status pills use the shared word-to-color table
- [ ] One Primary button per view, using `--vt-on-primary` text
- [ ] Charts use series tokens in order and repaint on theme change
- [ ] Keyboard: everything reachable with Tab, visible focus ring
- [ ] No em dashes in UI copy
- [ ] Out-of-scope outputs (14.3) are unchanged: client PDFs, emails, exports, client colors
- [ ] Preview running the way 14.6 describes for this app's host, link sent to Sid
- [ ] Screenshots of 3 pages in Basecamp + Summit Night sent to Sid

---

## 13. Claude Code tooling for this work

**Skills**
- `frontend-design`: component and layout quality
- `webapp-testing` (Playwright): screenshot every page in all 12 themes and check for contrast regressions
- `supabase` / Supabase Postgres best-practices skill: `user_preferences` table and RLS (section 5.3)

**MCP servers**
- **Playwright MCP**: drive each app, switch themes, capture before/after screenshots
- **Supabase MCP**: create the `user_preferences` table, apply the RLS policies and confirm them with a test read/write
- **Vercel MCP**: preview builds, only for apps that already deploy on Vercel (14.6)
- **n8n MCP** (optional): n8n-generated HTML that is app UI can point at the same tokens. Reports and emails sent to clients are out of scope (14.3) unless Sid asks. If Sid does, email HTML cannot use CSS variables, so inline the Basecamp hex values there.
- **Context7 MCP** (optional): current docs for Tailwind, Chart.js/Recharts theming

**Working rules**
- One app per session, on its own branch (`theme/<app-id>`), with a preview (14.6) before merging.
- Do not change app behavior or data logic during the migration. Visual changes only.
- If an app needs a component this spec does not cover, do not build it in the app. List it in the gap brief (14.4). It is added to the `viatek-design` repo and `SPEC.md` and released first, then the app upgrades to that release.

---

## 14. Migrating an app: procedure for Claude Code

Every app gets the same prompt. Nothing app-specific goes in the prompt: the app id, name, stack, host and gaps all come from the repo in 14.2 and 14.4.

### 14.1 The prompt

Open Claude Code in the app's folder and paste:

```
Migrate this app to the ViaTek design system.
1. Find the latest release: run `git ls-remote --tags https://github.com/sidlpayne/viatek-design`
   and take the highest vX.Y.Z tag.
2. Read https://viatek-design.vercel.app/<that tag>/SPEC.md in full.
3. Follow section 14 of the spec step by step.
Do not edit any files until I approve the plan from 14.4.
```

To use a specific release instead of the latest, replace step 1 with the tag (for example `v1.3.0`).

### 14.2 Identify the app

1. **Find the repo.** The session may open in a parent folder. Find the git repo that holds the app (for example `web/`). Folders that are not git repos, or that hold copies of other apps (for example `reference/insight/`), are read-only reference: read them for ideas, never migrate them. If the folder holds no app or more than one app, stop and ask which one.
2. **Name it.** App id: lowercase letters and digits from the app's name (repo or `package.json` name), such as `insight`, `reconciliator`, `envoy`, `secaudit`, `configreport`. Display name: the name users see today. Branch: `theme/<app-id>` in that repo. If the app id is unclear, propose one in the plan.
3. **Stack.** A JavaScript build (Next.js, Vite, Astro, anything with a bundler) installs the package (3.2). Anything else (Streamlit, server-rendered templates, plain HTML, n8n pages) links the hosted files (3.3). Note the Tailwind version, if any, and the UI libraries in use (Radix, shadcn, Sonner, a chart library).
4. **Host.** Find out how the app ships today: `vercel.json` or `.vercel/`, extra git remotes (for example `auto2`), a Dockerfile, CI workflows, a deploy script or the README. This decides the preview in 14.6.
5. **Existing rules.** If the app's `CLAUDE.md` or memory already has design-system rules (scope, exceptions), follow them and mention them in the plan.

### 14.3 Scope

- **In scope:** every screen of the app's own UI, including sign-in, settings, error pages and pop-out windows.
- **Out of scope, leave unchanged:** anything the app produces for clients or other systems, such as generated PDFs, emails, Excel and CSV exports, client logos, client-chosen colors and saved templates. When the app shows one of these inside its UI (a PDF or email preview), the frame around it is in scope and the document inside keeps its own colors.
- Never change behavior, routes, data logic, auth or the backend.

### 14.4 Inventory and plan (before any edit)

Go through every screen and match each piece of UI to a spec section or a `vt-*` class in `components.css`. Then report:

**The plan:** app id, display name, repo and branch, stack, install method (3.2 or 3.3), host and preview method (14.6), the screens in the order you will migrate them, and any app-specific steps from section 11.

**The gap brief:** everything the release does not cover, in four groups:
1. **Components** with no match (for example a toggle switch, progress bar, file upload or sortable header).
2. **Shell needs** that section 6 does not cover (for example a user menu, sign-in page, warning banner in the shell, or a window with no sidebar).
3. **Status words** that are not in the 7.3 table, each with a suggested color using the 7.3 rules.
4. **Colors with no token** (for example a purple label), with the token or tag you suggest instead.

For each gap, say where the app uses it, the closest existing component, and your suggestion. Save the brief as `design-gaps-<app-id>.md` in the session scratchpad and give Sid the full path. It is written so it can be pasted into Claude Design or into a `viatek-design` session as it is.

Then stop and wait:
- **No gaps:** wait for Sid to approve the plan, then go to 14.5.
- **Gaps:** they are added to `viatek-design` and released first. Sid gives you the new tag, you re-read that release's SPEC.md and continue on it. Only if Sid says to go ahead without waiting: migrate everything that is covered, leave each gap piece exactly as it is, and list those pieces in the final report as open.

### 14.5 Migrate

1. Create the branch `theme/<app-id>`.
2. Install or link the release (3.2 or 3.3) and add the "Design system" block (3.2) to the app's `CLAUDE.md`.
3. Load the fonts (2), inline the no-flash snippet with this app id (5.1), and load `tokens.css` and then `components.css`. Call `initTheme()` and `initSidebar('<app-id>')`. Tailwind apps add the preset (4.5) and remove every `dark:` class.
4. Move the app onto the shell (6), then migrate each screen to the components (7), one screen at a time. Add the quick toggle and the Settings › Appearance picker (8). If the app has Supabase auth, ask Sid before adding the `user_preferences` table (5.3).
5. Replace every hard-coded color with a token (3.6) and remove em dashes from UI copy (10).
6. Commit in small steps on the branch. Never push to the production remote or branch.

### 14.6 Preview

Use the way the app already ships. Do not set up new hosting.

- **On Vercel:** push the branch and use its Vercel preview deployment.
- **Self-hosted** (for example Auto2 through `git push auto2 main`): do not push to that remote's deploy branch. Ask Sid for a spare port, then run the branch there next to production, or run it locally.
- **Anything else, or no host found:** run it locally.
- Never create a hosting project, or copy sign-in or database secrets to a new place, just to get a preview, unless Sid says to.

### 14.7 Finish

Report each item of the section 12 checklist as pass or fail. Add screenshots of 3 key pages in Basecamp and Summit Night, the preview link or the command to run it, and the open gap pieces if there are any. Do not merge. Sid merges after clicking through the preview.
