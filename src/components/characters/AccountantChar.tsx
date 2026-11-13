import { useId } from 'react';
/**
 * Royal Treasury & Personal Budgeting Crest (Sovereign Vault & Balance Seal).
 * Multi-layered sovereign seal with gold-leaf gradients, architectural vault arches,
 * and obsidian-amber enamel core.
 */

export type AccountantMood = 'happy' | 'calm' | 'worried' | 'panic';

export function AccountantChar({
  size = 120,
  className,
}: {
  mood?: AccountantMood;
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Soft ambient backlight halo */}
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-35 dark:opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.45) 0%, rgba(184, 142, 62, 0.25) 50%, transparent 70%)',
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        className={className}
        role="img"
        aria-label="Financial Governance Emblem"
        fill="none"
      >
        <defs>
          {/* Sovereign Metallic Gold Leaf Gradient */}
          <linearGradient id={`${uid}acc-gold`} x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FDEAA8" />
            <stop offset="25%" stopColor="#DFB75A" />
            <stop offset="65%" stopColor="#B3862D" />
            <stop offset="90%" stopColor="#D8AF4F" />
            <stop offset="100%" stopColor="#8A6318" />
          </linearGradient>

          {/* Deep Royal Amber-Bronze Enamel Gradient */}
          <radialGradient id={`${uid}acc-amber`} cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#3D2912" />
            <stop offset="60%" stopColor="#241708" />
            <stop offset="100%" stopColor="#120A03" />
          </radialGradient>

          <radialGradient id={`${uid}acc-shadow`} cx="50%" cy="50%" r="50%">
            <stop offset="75%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
          </radialGradient>
        </defs>

        {/* Outer Medallion Base Plate */}
        <circle cx="60" cy="60" r="56" fill={`url(#${uid}acc-amber)`} stroke={`url(#${uid}acc-gold)`} strokeWidth="1.5" />
        <circle cx="60" cy="60" r="56" fill={`url(#${uid}acc-shadow)`} />

        {/* Perimeter Beaded Rim (32 golden pearls) */}
        {Array.from({ length: 32 }).map((_, i) => {
          const angle = (i * 360) / 32;
          const rad = (angle * Math.PI) / 180;
          const x = 60 + 52.5 * Math.cos(rad);
          const y = 60 + 52.5 * Math.sin(rad);
          return <circle key={i} cx={x} cy={y} r="1.2" fill={`url(#${uid}acc-gold)`} opacity="0.85" />;
        })}

        {/* Concentric Decorative Rings */}
        <circle cx="60" cy="60" r="49" stroke={`url(#${uid}acc-gold)`} strokeWidth="0.8" strokeOpacity="0.5" strokeDasharray="3 2" />
        <circle cx="60" cy="60" r="46" stroke={`url(#${uid}acc-gold)`} strokeWidth="0.8" strokeOpacity="0.35" />

        {/* Central Treasury Vault Core */}
        <circle cx="60" cy="60" r="32" fill="#140E07" stroke={`url(#${uid}acc-gold)`} strokeWidth="1.3" />
        <circle cx="60" cy="60" r="28" stroke={`url(#${uid}acc-gold)`} strokeWidth="0.6" strokeDasharray="1.5 1.5" strokeOpacity="0.6" />

        {/* Architectural Vault Portal / Arch */}
        <path
          d="M44 76 V 56 A 16 16 0 0 1 76 56 V 76 Z"
          stroke={`url(#${uid}acc-gold)`}
          strokeWidth="1.8"
          fill="none"
        />

        {/* Scales of Justice & Financial Equilibrium Bar */}
        <line x1="38" y1="46" x2="82" y2="46" stroke={`url(#${uid}acc-gold)`} strokeWidth="2" strokeLinecap="round" />
        <circle cx="60" cy="46" r="3.5" fill={`url(#${uid}acc-gold)`} />

        {/* Left Scale Pan */}
        <path d="M42 46 L 36 60 H 48 Z" stroke={`url(#${uid}acc-gold)`} strokeWidth="1.2" fill={`url(#${uid}acc-gold)`} fillOpacity="0.25" />
        {/* Right Scale Pan */}
        <path d="M78 46 L 72 60 H 84 Z" stroke={`url(#${uid}acc-gold)`} strokeWidth="1.2" fill={`url(#${uid}acc-gold)`} fillOpacity="0.25" />

        {/* Central Vault Keyhole & Guiding 8-Pointed Star */}
        <g transform="translate(60, 64)">
          <polygon
            points="0,-5 1.5,-1.5 5,0 1.5,1.5 0,5 -1.5,1.5 -5,0 -1.5,-1.5"
            fill={`url(#${uid}acc-gold)`}
          />
        </g>

        {/* Treasury Pillar Base Pedestal */}
        <line x1="40" y1="76" x2="80" y2="76" stroke={`url(#${uid}acc-gold)`} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
