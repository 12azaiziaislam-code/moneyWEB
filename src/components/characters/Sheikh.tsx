/**
 * «الشيخ AI» — a calm, humble scholar illustration (no real person depicted).
 * Pure SVG: no images, no external assets. Animations are CSS-only and stop
 * when the user prefers reduced motion.
 */

export type SheikhState = 'idle' | 'thinking' | 'nod';

export function Sheikh({ state = 'idle', size = 132, className }: { state?: SheikhState; size?: number; className?: string }) {
  const thinking = state === 'thinking';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label="Sheikh AI"
      fill="none"
    >
      <defs>
        <linearGradient id="sheikhTunic" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--hero-grad-b)" />
        </linearGradient>
        <linearGradient id="sheikhTurban" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffdf6" />
          <stop offset="1" stopColor="#e9e2cd" />
        </linearGradient>
      </defs>

      {/* halo + body */}
      <circle cx="60" cy="58" r="44" fill="var(--accent-soft)" opacity="0.55" />
      <path d="M28 112c2-16 15-25 32-25s30 9 32 25z" fill="url(#sheikhTunic)" />
      <path d="M54 84h12l-6 12z" fill="#fffdf6" opacity="0.9" />

      {/* head */}
      <g className={state === 'nod' ? 'animate-nod' : undefined} style={{ transformOrigin: '60px 84px' }}>
        <ellipse cx="60" cy="58" rx="21" ry="23" fill="#f3dcc4" />
        {/* beard */}
        <path d="M41 62c2 16 9 24 19 24s17-8 19-24c-5 6-11 8-19 8s-14-2-19-8z" fill="#e8e4da" />
        <path d="M47 70c3 6 7 9 13 9s10-3 13-9" stroke="#cfc9bb" strokeWidth="1.2" strokeLinecap="round" />
        {/* smile */}
        <path d="M55 65c2.5 2 7.5 2 10 0" stroke="#8a6a52" strokeWidth="1.6" strokeLinecap="round" />

        {/* eyes (blink) */}
        <g className="animate-blink" style={{ transformOrigin: '60px 55px' }}>
          <ellipse cx="52" cy="54" rx="2.4" ry="3" fill="#3b3128" />
          <ellipse cx="68" cy="54" rx="2.4" ry="3" fill="#3b3128" />
        </g>
        <path d="M47.5 48.5c2-1.4 5-1.4 7 0M65.5 48.5c2-1.4 5-1.4 7 0" stroke="#b9a894" strokeWidth="1.4" strokeLinecap="round" />

        {/* turban */}
        <path d="M37 44c0-13 10-21 23-21s23 8 23 21c-6-5-14-7-23-7s-17 2-23 7z" fill="url(#sheikhTurban)" />
        <path d="M39 41c5-6 12-9 21-9s16 3 21 9" stroke="#d9d1b8" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M60 23c0 3 0 6-1 9" stroke="#cfc7ae" strokeWidth="1.2" />
        <circle cx="72" cy="30" r="2.2" fill="var(--accent-2)" />
      </g>

      {/* tasbih / fanoos hint while thinking */}
      {thinking ? (
        <g style={{ transformOrigin: '96px 92px' }} className="animate-float">
          <circle cx="96" cy="92" r="9" fill="var(--accent-2)" opacity="0.18" />
          <path d="M92 96c0-4 2-6 4-8 2 2 4 4 4 8z" fill="var(--accent-2)" />
          <path d="M96 84v4" stroke="var(--accent-2)" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="96" cy="99" r="1.6" fill="var(--accent-2)" />
        </g>
      ) : (
        <g>
          <path d="M20 96c6-6 12-9 18-10" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" opacity="0.65" />
          {[0, 1, 2, 3].map((index) => (
            <circle key={index} cx={23 + index * 4.4} cy={95 - index * 2.4} r="1.9" fill="var(--accent)" opacity={0.75 - index * 0.08} />
          ))}
        </g>
      )}
    </svg>
  );
}
