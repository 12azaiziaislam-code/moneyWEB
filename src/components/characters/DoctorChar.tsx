/**
 * Health & Dietary Wellness Emblem — Botanical crest.
 * Replaces cartoon doctor with a dignified botanical wellness emblem.
 */

export function DoctorChar({
  size = 56,
  className,
}: {
  state?: 'idle' | 'listening' | 'done';
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Health and Wellness Emblem"
      fill="none"
    >
      <circle cx="32" cy="32" r="29" stroke="var(--border)" strokeWidth="1" />
      <circle cx="32" cy="32" r="26" fill="var(--surface-2)" stroke="var(--ch-doctor)" strokeWidth="1.2" strokeOpacity="0.5" />
      {/* Botanical olive branch / medicinal leaf motif */}
      <path
        d="M32 18c0 14-8 22-8 22s8-2 14-8 4-14-6-14Z"
        fill="var(--ch-doctor)"
        fillOpacity="0.85"
      />
      <path
        d="M32 24c0 10 6 16 6 16s-6-1-10-6-3-10 4-10Z"
        fill="var(--accent-2)"
        fillOpacity="0.85"
      />
      {/* Subtle central stem */}
      <path d="M32 46V18" stroke="var(--fg)" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
      {/* Bottom base dot */}
      <circle cx="32" cy="48" r="2" fill="var(--accent-2)" />
    </svg>
  );
}
