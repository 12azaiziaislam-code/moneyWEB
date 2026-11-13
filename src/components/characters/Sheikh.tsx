/**
 * Royal Halal & Ethical Verification Medallion (Khatam Sulayman Seal).
 * A handcrafted, multi-layered sovereign medallion with gold-leaf gradients,
 * 8-fold geometric lattice, beaded rim, and enameled emerald core.
 */

export type SheikhState = 'idle' | 'thinking' | 'nod';

export function Sheikh({
  size = 120,
  className,
}: {
  state?: SheikhState;
  size?: number;
  className?: string;
}) {
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Soft ambient backlight halo */}
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-35 dark:opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.45) 0%, rgba(27, 94, 75, 0.25) 50%, transparent 70%)',
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        className={className}
        role="img"
        aria-label="Halal Ethical Verification Seal"
        fill="none"
      >
        <defs>
          {/* Sovereign Metallic Gold Leaf Gradient */}
          <linearGradient id="halal-gold" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FDEAA8" />
            <stop offset="25%" stopColor="#DFB75A" />
            <stop offset="65%" stopColor="#B3862D" />
            <stop offset="90%" stopColor="#D8AF4F" />
            <stop offset="100%" stopColor="#8A6318" />
          </linearGradient>

          {/* Deep Royal Emerald Enamel Gradient */}
          <radialGradient id="halal-emerald" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#1E5C49" />
            <stop offset="60%" stopColor="#113A2E" />
            <stop offset="100%" stopColor="#0A221B" />
          </radialGradient>

          {/* Obsidian Bevel Shadow */}
          <radialGradient id="halal-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="75%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
          </radialGradient>
        </defs>

        {/* Outer Medallion Base Plate */}
        <circle cx="60" cy="60" r="56" fill="url(#halal-emerald)" stroke="url(#halal-gold)" strokeWidth="1.5" />
        <circle cx="60" cy="60" r="56" fill="url(#halal-shadow)" />

        {/* Perimeter Beaded Rim (32 golden pearls) */}
        {Array.from({ length: 32 }).map((_, i) => {
          const angle = (i * 360) / 32;
          const rad = (angle * Math.PI) / 180;
          const x = 60 + 52.5 * Math.cos(rad);
          const y = 60 + 52.5 * Math.sin(rad);
          return <circle key={i} cx={x} cy={y} r="1.2" fill="url(#halal-gold)" opacity="0.85" />;
        })}

        {/* Stepped Concentric Hairline Rings */}
        <circle cx="60" cy="60" r="49" stroke="url(#halal-gold)" strokeWidth="0.8" strokeOpacity="0.6" strokeDasharray="3 2" />
        <circle cx="60" cy="60" r="46" stroke="url(#halal-gold)" strokeWidth="0.8" strokeOpacity="0.4" />

        {/* Interlocking 8-Pointed Star (Khatam Sulayman) - First Square */}
        <rect
          x="30"
          y="30"
          width="60"
          height="60"
          rx="3"
          stroke="url(#halal-gold)"
          strokeWidth="1.8"
          strokeOpacity="0.9"
        />
        {/* Interlocking 8-Pointed Star - Rotated 45 degrees */}
        <rect
          x="30"
          y="30"
          width="60"
          height="60"
          rx="3"
          stroke="url(#halal-gold)"
          strokeWidth="1.8"
          strokeOpacity="0.9"
          transform="rotate(45 60 60)"
        />

        {/* Radiating Islamic Facet Rhombs */}
        <g stroke="url(#halal-gold)" strokeWidth="0.75" strokeOpacity="0.5">
          <line x1="60" y1="14" x2="60" y2="30" />
          <line x1="60" y1="90" x2="60" y2="106" />
          <line x1="14" y1="60" x2="30" y2="60" />
          <line x1="90" y1="60" x2="106" y2="60" />
          <line x1="27.5" y1="27.5" x2="38.8" y2="38.8" />
          <line x1="81.2" y1="81.2" x2="92.5" y2="92.5" />
          <line x1="92.5" y1="27.5" x2="81.2" y2="38.8" />
          <line x1="38.8" y1="81.2" x2="27.5" y2="92.5" />
        </g>

        {/* Inner Guilloché Core Medallion */}
        <circle cx="60" cy="60" r="23" fill="#0C1B16" stroke="url(#halal-gold)" strokeWidth="1.4" />
        <circle cx="60" cy="60" r="20" stroke="url(#halal-gold)" strokeWidth="0.6" strokeDasharray="1.5 1.5" strokeOpacity="0.7" />

        {/* Sculpted Celestial Crescent in Gold & Alabaster */}
        <path
          d="M62 44c-8.8 2.2-14.4 9.8-12.8 18.6s9.8 14.4 18.6 12.8c-7.2.8-14.4-4-16-12s3.2-15.2 10.2-19.4Z"
          fill="url(#halal-gold)"
        />

        {/* Central Guiding 8-Pointed Star in Pure Gold */}
        <g transform="translate(68, 52)">
          <polygon
            points="0,-6 1.8,-1.8 6,0 1.8,1.8 0,6 -1.8,1.8 -6,0 -1.8,-1.8"
            fill="url(#halal-gold)"
          />
        </g>

        {/* 4 Corner Jewel Accents */}
        <circle cx="60" cy="27" r="1.5" fill="url(#halal-gold)" />
        <circle cx="60" cy="93" r="1.5" fill="url(#halal-gold)" />
        <circle cx="27" cy="60" r="1.5" fill="url(#halal-gold)" />
        <circle cx="93" cy="60" r="1.5" fill="url(#halal-gold)" />
      </svg>
    </div>
  );
}
