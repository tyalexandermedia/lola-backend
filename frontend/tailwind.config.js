/**
 * Tailwind theme — bound to the design tokens in src/index.css.
 *
 * Every colour here resolves to a CSS custom property holding raw RGB
 * channels, which is what lets `text-gold/70` compile to
 * `rgb(var(--gold) / 0.7)`. Defining them as hex would force a separate token
 * for every opacity the design uses.
 *
 * The previous config defined a `gold` scale in #FFD166/#F4B942 while the
 * components used #D4AF37 in 722 places — so the one file a designer would
 * open to change the brand colour was the one file that wouldn't change it.
 * That is fixed: `gold` here IS the gold the UI paints.
 *
 * Legacy `navy` / `lola` / `amber` scales are gone. Nothing referenced them,
 * and leaving unused palettes in a theme is how the next person picks a colour
 * that isn't in the design.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Sharp, confident display face for headlines (loaded in index.html
        // with display=swap, so text is never invisible if it's slow/blocked).
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        gold: {
          DEFAULT: 'rgb(var(--gold) / <alpha-value>)',
          bright: 'rgb(var(--gold-bright) / <alpha-value>)',
          hi: 'rgb(var(--gold-hi) / <alpha-value>)',
          deep: 'rgb(var(--gold-deep) / <alpha-value>)',
        },
        ok: 'rgb(var(--ok) / <alpha-value>)',
        ground: 'rgb(var(--ground) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          2: 'rgb(var(--surface-2) / <alpha-value>)',
        },
        'on-gold': 'rgb(var(--on-gold) / <alpha-value>)',
        // Ink scale, ordered by measured contrast on the ground colour.
        // ink-4 (4.87:1) is the floor — there is deliberately no dimmer step,
        // because the greys below it failed WCAG AA and were being used in
        // footers.
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          2: 'rgb(var(--ink-2) / <alpha-value>)',
          3: 'rgb(var(--ink-3) / <alpha-value>)',
          4: 'rgb(var(--ink-4) / <alpha-value>)',
        },
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
      },
      boxShadow: {
        lift: 'var(--shadow-lift)',
        glow: 'var(--shadow-glow)',
      },
      spacing: {
        // Section rhythm as one token, so vertical spacing is a decision made
        // once instead of re-typed as mt-12/mt-14/mt-16 file by file.
        section: 'var(--section-y)',
      },
      transitionTimingFunction: {
        press: 'cubic-bezier(0.2, 0.8, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
