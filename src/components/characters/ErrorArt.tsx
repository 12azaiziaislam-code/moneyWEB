/** Friendly art for empty / error / offline / 404 states. */

export function ErrorArt({ kind = 'error', size = 132 }: { kind?: 'error' | 'offline' | 'notfound' | 'guest'; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={kind} fill="none">
      <circle cx="58" cy="58" r="42" fill="var(--surface-2)" />
      {kind === 'offline' ? (
        <g>
          <path d="M34 54c14-12 34-12 48 0" stroke="var(--muted)" strokeWidth="3" strokeLinecap="round" />
          <path d="M43 65c9-7 21-7 30 0" stroke="var(--muted)" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
          <path d="M52 76c4-3 8-3 12 0" stroke="var(--muted)" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
          <path d="M38 36l42 44" stroke="var(--danger)" strokeWidth="3.4" strokeLinecap="round" />
        </g>
      ) : kind === 'notfound' ? (
        <g>
          <circle cx="56" cy="54" r="18" stroke="var(--accent)" strokeWidth="3" />
          <path d="M69 67l12 12" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" />
          <path d="M50 50c1.6-1.6 4-1.6 5.6 0M58 54c.4 2.6 2.4 3.6 4 2" stroke="var(--accent-2)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="86" cy="34" r="3" fill="var(--accent-2)" opacity="0.7" />
        </g>
      ) : kind === 'guest' ? (
        <g>
          <circle cx="58" cy="52" r="14" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2.4" />
          <path d="M36 92c3-14 11-20 22-20s19 6 22 20" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M74 40l3 3 6-6" stroke="var(--accent-2)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : (
        <g>
          <rect x="38" y="40" width="40" height="44" rx="10" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
          <path d="M58 50v14" stroke="var(--danger)" strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="58" cy="73" r="2.2" fill="var(--danger)" />
          <path d="M84 32l4 8" stroke="var(--accent-2)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="34" cy="30" r="2" fill="var(--accent-2)" />
        </g>
      )}
    </svg>
  );
}
