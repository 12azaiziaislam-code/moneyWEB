/**
 * Halal / Ethical Evaluation Emblem — Architectural 8-fold geometric seal.
 * Dignified, modest, precision-drawn SVG.
 */

export type SheikhState = 'idle' | 'thinking' | 'nod';

export function Sheikh({
  size = 110,
  className,
}: {
  state?: SheikhState;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      className={className}
      role="img"
      aria-label="Halal Ethical Verification Seal"
      fill="none"
    >
      {/* Outer hairline circle */}
      <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="1" strokeOpacity="0.2" />
      <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" />

      {/* 8-pointed star lattice */}
      <rect
        x="24"
        y="24"
        width="48"
        height="48"
        rx="2"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeOpacity="0.8"
      />
      <rect
        x="24"
        y="24"
        width="48"
        height="48"
        rx="2"
        stroke="var(--accent-2)"
        strokeWidth="1.5"
        strokeOpacity="0.8"
        transform="rotate(45 48 48)"
      />

      {/* Central balance seal */}
      <circle cx="48" cy="48" r="16" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1" />
      {/* Central crescent */}
      <path
        d="M50 40c-4.4 1.2-7.2 5.2-6.4 9.6s5.2 7.6 9.6 6.4c-3.6.4-7.2-2-8-6s1.6-7.6 4.8-10Z"
        fill="var(--accent)"
      />
      {/* Guiding star */}
      <polygon
        points="53,42 54,44.5 56.5,44.5 54.5,46 55.2,48.5 53,47 50.8,48.5 51.5,46 49.5,44.5 52,44.5"
        fill="var(--accent-2)"
      />
    </svg>
  );
}
