/**
 * «د. صحتك» — friendly clinician illustration. The stethoscope pulses while the
 * model is reading, and a check badge appears when the analysis is complete.
 */

export type DoctorState = 'idle' | 'listening' | 'done';

export function DoctorChar({ state = 'idle', size = 132, className }: { state?: DoctorState; size?: number; className?: string }) {
  const listening = state === 'listening';
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} role="img" aria-label="Doctor AI" fill="none">
      <defs>
        <linearGradient id="docCoat" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e6f4f6" />
        </linearGradient>
        <linearGradient id="docScrub" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--hero-grad-b)" />
        </linearGradient>
      </defs>

      <circle cx="60" cy="58" r="44" fill="var(--accent-soft)" opacity="0.6" />

      {/* coat */}
      <path d="M26 112c2-18 15-28 34-28s32 10 34 28z" fill="url(#docCoat)" stroke="#d7e9ec" />
      <path d="M52 84h16l-4 14h-8z" fill="url(#docScrub)" />
      <path d="M60 84v28" stroke="#d7e9ec" strokeWidth="1.2" />

      {/* head */}
      <g>
        <ellipse cx="60" cy="57" rx="20" ry="22" fill="#f6ddc8" />
        <path d="M40 46c4-10 11-15 20-15s16 5 20 15c-6-4-12-5-20-5s-14 1-20 5z" fill="#3f3a36" />
        <ellipse cx="52" cy="55" rx="2.3" ry="2.9" fill="#2f2a26" />
        <ellipse cx="68" cy="55" rx="2.3" ry="2.9" fill="#2f2a26" />
        <path d="M55 64c2.4 2 7.6 2 10 0" stroke="#b9795f" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="47" cy="60" r="3" fill="#f2b7a0" opacity="0.55" />
        <circle cx="73" cy="60" r="3" fill="#f2b7a0" opacity="0.55" />
      </g>

      {/* stethoscope */}
      <path d="M48 84c0 12 5 18 12 18s12-6 12-18" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="72" cy="88" r="4.2" fill="var(--accent)" className={listening ? 'animate-pulse-ring' : undefined} />
      <circle cx="72" cy="88" r="1.6" fill="#ffffff" />

      {/* check badge when done */}
      {state === 'done' ? (
        <g className="animate-pop" style={{ transformOrigin: '92px 40px' }}>
          <circle cx="92" cy="40" r="12" fill="var(--risk-green)" />
          <path d="M86.5 40.5l3.6 3.6 7-7" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : (
        <g opacity="0.9">
          <rect x="14" y="30" width="18" height="24" rx="4" fill="#ffffff" stroke="#d7e9ec" />
          <path d="M23 36v12M17 42h12" stroke="var(--risk-red)" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
