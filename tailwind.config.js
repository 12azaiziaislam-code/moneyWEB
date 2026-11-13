/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        bg2: 'var(--bg-2)',
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        surfaceElevated: 'var(--surface-elevated)',
        line: 'var(--border)',
        lineSubtle: 'var(--border-subtle)',
        fg: 'var(--fg)',
        muted: 'var(--muted)',
        mutedSoft: 'var(--muted-soft)',
        accent: {
          DEFAULT: 'var(--accent)',
          fg: 'var(--accent-fg)',
          soft: 'var(--accent-soft)',
          hover: 'var(--accent-hover)',
        },
        ok: {
          DEFAULT: 'var(--ok)',
          fg: 'var(--ok-fg)',
          soft: 'var(--ok-soft)',
        },
        warn: {
          DEFAULT: 'var(--warn)',
          fg: 'var(--warn-fg)',
          soft: 'var(--warn-soft)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          fg: 'var(--danger-fg)',
          soft: 'var(--danger-soft)',
        },
        info: {
          DEFAULT: 'var(--info)',
          fg: 'var(--info-fg)',
          soft: 'var(--info-soft)',
        },
        // Backwards compatibility aliases for existing templates
        okSoft: 'var(--ok-soft)',
        warnSoft: 'var(--warn-soft)',
        dangerSoft: 'var(--danger-soft)',
        infoSoft: 'var(--info-soft)',
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
      boxShadow: {
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
      transitionDuration: { fast: '130ms', mid: '220ms', slow: '350ms' },
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
