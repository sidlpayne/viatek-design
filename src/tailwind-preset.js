// @viatek/design · tailwind-preset.js (SPEC.md section 4.5)
// tailwind.config.js:  presets: [require('@viatek/design/tailwind-preset.js')]
// Dark mode is handled by tokens. Do not use Tailwind's dark: variant in migrated code.
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
        band: {
          strong: v('band-strong'), good: v('band-good'), 'good-soft': v('band-good-soft'),
          'needs-work': v('band-needs-work'), 'at-risk': v('band-at-risk'), none: v('band-none'),
        },
        series: Object.fromEntries([1,2,3,4,5,6,7,8].map(n => [n, v(`series-${n}`)])),
      },
      fontFamily: { display: v('font-display'), sans: v('font-sans'), mono: v('font-mono') },
      borderRadius: { sm: v('radius-sm'), md: v('radius-md'), lg: v('radius-lg'), xl: v('radius-xl') },
      boxShadow: { sm: v('shadow-sm'), md: v('shadow-md'), lg: v('shadow-lg') },
    },
  },
};
