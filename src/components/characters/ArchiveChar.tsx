/**
 * Archival Emblem — Library and Manuscript Document Seal.
 * Replaces cartoon filing box with an authentic library crest.
 */

export function ArchiveChar({
  size = 110,
  className,
}: {
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
      aria-label="Archive and Consultations Seal"
      fill="none"
    >
      <circle cx="48" cy="48" r="42" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
      <circle cx="48" cy="48" r="36" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1.2" />

      {/* Folio / Manuscript Pages */}
      <rect
        x="30"
        y="26"
        width="36"
        height="44"
        rx="3"
        fill="var(--surface)"
        stroke="var(--accent)"
        strokeWidth="1.6"
      />
      {/* Interior document spine & lines */}
      <line x1="36" y1="36" x2="60" y2="36" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="36" y1="44" x2="56" y2="44" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="36" y1="52" x2="52" y2="52" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="48" cy="61" r="2.5" fill="var(--accent-2)" />
    </svg>
  );
}
