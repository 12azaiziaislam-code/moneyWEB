/** Brand mark (crescent + star) used in the splash, login and the PWA icon. */

export function Logo({ size = 64, className, animated = false }: { size?: number; className?: string; animated?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Baraka"
      fill="none"
    >
      <defs>
        <linearGradient id="logoBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--hero-grad-a)" />
          <stop offset="1" stopColor="var(--hero-grad-b)" />
        </linearGradient>
        <mask id="logoCrescent">
          <rect width="64" height="64" fill="black" />
          <circle cx="30" cy="33" r="17" fill="white" />
          <circle cx="38" cy="29" r="15" fill="black" />
        </mask>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logoBg)" />
      <rect width="64" height="64" rx="16" fill="white" mask="url(#logoCrescent)" />
      <path
        d={animated ? 'M44 15l1.4 3.3 3.6.4-2.7 2.5.7 3.5-3-1.8-3 1.8.7-3.5-2.7-2.5 3.6-.4z' : 'M45 16l1.3 3 3.3.4-2.5 2.3.6 3.3-2.7-1.7-2.8 1.7.6-3.3-2.4-2.3 3.3-.4z'}
        fill="#fffdf5"
        className={animated ? 'animate-pop' : undefined}
      />
    </svg>
  );
}

/** Small ornament divider used under page titles. */
export function Ornament({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 12" className={className} aria-hidden="true" fill="none">
      <path d="M0 6h42" stroke="var(--border)" strokeWidth="1" />
      <path d="M78 6h42" stroke="var(--border)" strokeWidth="1" />
      <path d="M60 1l4 5-4 5-4-5z" stroke="var(--accent-2)" strokeWidth="1.2" />
      <circle cx="50" cy="6" r="1.4" fill="var(--accent-2)" />
      <circle cx="70" cy="6" r="1.4" fill="var(--accent-2)" />
    </svg>
  );
}
