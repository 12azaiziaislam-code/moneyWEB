/**
 * Theme colors are CSS variables. Wrapping them in color-mix with <alpha-value>
 * makes Tailwind opacity modifiers (bg-surface/80, border-line/60, …) work.
 */
const v = (name) => `color-mix(in srgb, var(--${name}) calc(<alpha-value> * 100%), transparent)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        bg2: v('bg-2'),
        surface: v('surface'),
        surface2: v('surface-2'),
        surfaceElevated: v('surface-elevated'),
        line: v('border'),
        lineSubtle: v('border-subtle'),
        fg: v('fg'),
        muted: v('muted'),
        mutedSoft: v('muted-soft'),
        'muted-soft': v('muted-soft'),
        accent: {
          DEFAULT: v('accent'),
          fg: v('accent-fg'),
          soft: v('accent-soft'),
          hover: v('accent-hover'),
        },
        ok: {
          DEFAULT: v('ok'),
          fg: v('ok-fg'),
          soft: v('ok-soft'),
        },
        warn: {
          DEFAULT: v('warn'),
          fg: v('warn-fg'),
          soft: v('warn-soft'),
        },
        danger: {
          DEFAULT: v('danger'),
          fg: v('danger-fg'),
          soft: v('danger-soft'),
        },
        info: {
          DEFAULT: v('info'),
          fg: v('info-fg'),
          soft: v('info-soft'),
        },
        border: v('border'),
        tool: {
          halal: v('tool-halal'),
          'halal-soft': v('tool-halal-soft'),
          doctor: v('tool-doctor'),
          'doctor-soft': v('tool-doctor-soft'),
          money: v('tool-money'),
          'money-soft': v('tool-money-soft'),
        },
        // Backwards compatibility aliases for existing templates
        okSoft: v('ok-soft'),
        warnSoft: v('warn-soft'),
        dangerSoft: v('danger-soft'),
        infoSoft: v('info-soft'),
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        latin: 'var(--font-latin)',
        num: 'var(--font-num)',
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },
      backdropBlur: { xs: '2px' },
      boxShadow: {
        xs: '0 1px 2px rgba(0, 0, 0, 0.06)',
        e1: 'var(--shadow-1)',
        e2: 'var(--shadow-2)',
        e3: 'var(--shadow-3)',
      },
      maxWidth: { app: 'var(--app-max)' },
      spacing: { nav: 'var(--nav-h)' },
      fontSize: {
        xs: 'var(--text-xs)',
        sm: 'var(--text-sm)',
        base: 'var(--text-base)',
        lg: 'var(--text-lg)',
        xl: 'var(--text-xl)',
        '2xl': 'var(--text-2xl)',
        '3xl': 'var(--text-3xl)',
        '4xl': 'var(--text-4xl)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        spring: 'var(--ease-spring)',
      },
      transitionDuration: { fast: '130ms', mid: '220ms', slow: '350ms', slower: '700ms' },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(.9)', opacity: '0' },
          '60%': { transform: 'scale(1.02)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        riseIn: {
          from: { opacity: '0', transform: 'translate3d(0,10px,0)' },
          to: { opacity: '1', transform: 'translate3d(0,0,0)' },
        },
        scanBeam: {
          '0%': { top: '2%', opacity: '0.3' },
          '50%': { top: '96%', opacity: '1' },
          '100%': { top: '2%', opacity: '0.3' },
        },
      },
      animation: {
        pop: 'pop .4s var(--ease-spring) both',
        rise: 'riseIn .32s var(--ease-out) both',
        scan: 'scanBeam 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
