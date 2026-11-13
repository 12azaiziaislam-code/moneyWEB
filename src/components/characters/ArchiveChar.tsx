/** Chats identity: an archive shelf with index cards. */

export function ArchiveChar({ size = 140, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 140 120" className={className} role="img" aria-label="Archive" fill="none">
      <rect x="10" y="20" width="120" height="82" rx="12" fill="var(--surface-2)" stroke="var(--border)" />
      <rect x="18" y="28" width="104" height="6" rx="3" fill="var(--border)" />

      {/* index cards */}
      <g>
        <rect x="26" y="48" width="34" height="44" rx="4" fill="var(--surface)" stroke="var(--ch-sheikh)" strokeWidth="1.6" transform="rotate(-6 43 70)" />
        <path d="M32 58h20M32 64h14" stroke="var(--ch-sheikh)" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" transform="rotate(-6 43 70)" />
      </g>
      <g>
        <rect x="52" y="44" width="34" height="48" rx="4" fill="var(--surface)" stroke="var(--ch-doctor)" strokeWidth="1.6" />
        <circle cx="69" cy="58" r="5" stroke="var(--ch-doctor)" strokeWidth="1.6" />
        <path d="M58 70h22M58 76h16" stroke="var(--ch-doctor)" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      </g>
      <g>
        <rect x="82" y="46" width="34" height="46" rx="4" fill="var(--surface)" stroke="var(--ch-accountant)" strokeWidth="1.6" transform="rotate(5 99 69)" />
        <path d="M88 60h18M88 66h12M88 72h16" stroke="var(--ch-accountant)" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" transform="rotate(5 99 69)" />
      </g>

      <rect x="18" y="94" width="104" height="8" rx="4" fill="var(--border)" />
      <g opacity="0.5">
        <circle cx="120" cy="30" r="2" fill="var(--accent-2)" />
        <circle cx="24" cy="36" r="1.6" fill="var(--accent-2)" />
      </g>
    </svg>
  );
}
