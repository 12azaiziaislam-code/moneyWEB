/**
 * «المحاسب الذكي» — a friendly accountant whose face reacts to the money risk
 * level (happy → calm → worried → panic). No images, pure SVG.
 */

export type AccountantMood = 'happy' | 'calm' | 'worried' | 'panic';

export function AccountantChar({
  mood = 'calm',
  size = 132,
  className,
}: {
  mood?: AccountantMood;
  size?: number;
  className?: string;
}) {
  const eye = mood === 'panic' ? 3.4 : mood === 'worried' ? 2.6 : 2.4;
  const mouth =
    mood === 'happy'
      ? 'M53 66c3 4 11 4 14 0'
      : mood === 'calm'
        ? 'M54 66c2.6 2 9.4 2 12 0'
        : mood === 'worried'
          ? 'M54 68c2.6-2 9.4-2 12 0'
          : 'M53 68c3.4-1.6 10.6-1.6 14 0';
  const brow = mood === 'worried' || mood === 'panic' ? 'M47 47.5l6 2M73 47.5l-6 2' : 'M47 46.5h6M67 46.5h6';

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} role="img" aria-label="Accountant AI" fill="none">
      <defs>
        <linearGradient id="accSuit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--hero-grad-b)" />
        </linearGradient>
      </defs>

      <circle cx="60" cy="58" r="44" fill="var(--accent-soft)" opacity="0.55" />

      {/* suit + shirt */}
      <path d="M26 112c2-18 15-28 34-28s32 10 34 28z" fill="url(#accSuit)" />
      <path d="M52 84h16l-8 28z" fill="#fffdf6" opacity="0.92" />
      <path d="M60 92l-3 6 3 5 3-5z" fill="var(--accent-2)" />

      {/* head */}
      <ellipse cx="60" cy="58" rx="20" ry="22" fill="#f4dcc6" />
      <path d="M41 47c3-9 10-14 19-14s16 5 19 14c-5-3-11-4-19-4s-14 1-19 4z" fill="#2b2622" />
      <ellipse cx="52" cy="56" rx={eye * 0.8} ry={eye} fill="#241f1b" />
      <ellipse cx="68" cy="56" rx={eye * 0.8} ry={eye} fill="#241f1b" />
      <path d={brow} stroke="#3b332c" strokeWidth="1.3" strokeLinecap="round" />
      <path d={mouth} stroke="#a0664f" strokeWidth="1.7" strokeLinecap="round" />

      {/* glasses */}
      <g stroke="var(--accent-2)" strokeWidth="1.6" opacity="0.95">
        <rect x="43" y="50.5" width="14" height="11" rx="4.5" />
        <rect x="63" y="50.5" width="14" height="11" rx="4.5" />
        <path d="M57 56h6" />
      </g>

      {/* calculator */}
      <g className={mood === 'panic' ? 'animate-shake' : undefined} style={{ transformOrigin: '22px 96px' }}>
        <rect x="10" y="84" width="24" height="30" rx="5" fill="#fffdf6" stroke="var(--accent-2)" strokeWidth="1.4" />
        <rect x="14" y="88" width="16" height="7" rx="2" fill="var(--accent-soft)" />
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => (
            <circle key={`${row}-${col}`} cx={16 + col * 5} cy={99.5 + row * 4.4} r="1.5" fill="var(--accent)" opacity="0.75" />
          )),
        )}
      </g>

      {/* mood spark */}
      {mood === 'happy' ? (
        <g className="animate-pop" style={{ transformOrigin: '94px 38px' }}>
          <circle cx="94" cy="38" r="10" fill="var(--risk-green)" />
          <path d="M89.5 38.5l3.2 3.2 6-6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : null}
      {mood === 'panic' ? (
        <g className="animate-pulse">
          <circle cx="94" cy="38" r="10" fill="var(--risk-red)" />
          <path d="M94 32.5v6" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="94" cy="43" r="1.6" fill="#fff" />
        </g>
      ) : null}
      {mood === 'worried' ? (
        <g>
          <circle cx="94" cy="38" r="10" fill="var(--risk-orange)" opacity="0.9" />
          <path d="M89.5 39c2-3 7-4 9 0" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      ) : null}
    </svg>
  );
}
