/**
 * Royal Dietary & Health Guidance Crest (Botanical & Wellness Medallion).
 * Multi-layered sovereign seal with gold-leaf gradients, botanical olive wreath,
 * and azure-emerald enamel core.
 */

export function DoctorChar({
  size = 120,
  className,
}: {
  state?: 'idle' | 'listening' | 'done';
  size?: number;
  className?: string;
}) {
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Soft ambient backlight halo */}
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-35 dark:opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.4) 0%, rgba(27, 88, 117, 0.25) 50%, transparent 70%)',
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        className={className}
        role="img"
        aria-label="Health and Wellness Emblem"
        fill="none"
      >
        <defs>
          {/* Sovereign Metallic Gold Leaf Gradient */}
          <linearGradient id="doc-gold" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FDEAA8" />
            <stop offset="25%" stopColor="#DFB75A" />
            <stop offset="65%" stopColor="#B3862D" />
            <stop offset="90%" stopColor="#D8AF4F" />
            <stop offset="100%" stopColor="#8A6318" />
          </linearGradient>

          {/* Deep Royal Azure Enamel Gradient */}
          <radialGradient id="doc-azure" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#1B5875" />
            <stop offset="60%" stopColor="#103649" />
            <stop offset="100%" stopColor="#081E29" />
          </radialGradient>

          <radialGradient id="doc-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="75%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
          </radialGradient>
        </defs>

        {/* Outer Medallion Base Plate */}
        <circle cx="60" cy="60" r="56" fill="url(#doc-azure)" stroke="url(#doc-gold)" strokeWidth="1.5" />
        <circle cx="60" cy="60" r="56" fill="url(#doc-shadow)" />

        {/* Perimeter Beaded Rim (32 golden pearls) */}
        {Array.from({ length: 32 }).map((_, i) => {
          const angle = (i * 360) / 32;
          const rad = (angle * Math.PI) / 180;
          const x = 60 + 52.5 * Math.cos(rad);
          const y = 60 + 52.5 * Math.sin(rad);
          return <circle key={i} cx={x} cy={y} r="1.2" fill="url(#doc-gold)" opacity="0.85" />;
        })}

        {/* Concentric Decorative Rings */}
        <circle cx="60" cy="60" r="49" stroke="url(#doc-gold)" strokeWidth="0.8" strokeOpacity="0.5" strokeDasharray="3 2" />
        <circle cx="60" cy="60" r="46" stroke="url(#doc-gold)" strokeWidth="0.8" strokeOpacity="0.35" />

        {/* Inner Core Shield */}
        <circle cx="60" cy="60" r="32" fill="#0A1C24" stroke="url(#doc-gold)" strokeWidth="1.3" />
        <circle cx="60" cy="60" r="28" stroke="url(#doc-gold)" strokeWidth="0.6" strokeDasharray="1.5 1.5" strokeOpacity="0.6" />

        {/* Botanical Laurel of Olive / Medicinal Leaves (Symmetrical) */}
        {/* Left Branch */}
        <path
          d="M42 74 C 36 64, 36 50, 46 40 C 42 46, 42 58, 48 68 Z"
          fill="url(#doc-gold)"
          opacity="0.85"
        />
        <path
          d="M36 58 C 30 52, 32 44, 40 42 C 37 46, 38 52, 42 55 Z"
          fill="url(#doc-gold)"
          opacity="0.75"
        />
        <path
          d="M40 44 C 36 38, 40 32, 48 34 C 44 37, 44 41, 46 44 Z"
          fill="url(#doc-gold)"
          opacity="0.75"
        />

        {/* Right Branch */}
        <path
          d="M78 74 C 84 64, 84 50, 74 40 C 78 46, 78 58, 72 68 Z"
          fill="url(#doc-gold)"
          opacity="0.85"
        />
        <path
          d="M84 58 C 90 52, 88 44, 80 42 C 83 46, 82 52, 78 55 Z"
          fill="url(#doc-gold)"
          opacity="0.75"
        />
        <path
          d="M80 44 C 84 38, 80 32, 72 34 C 76 37, 76 41, 74 44 Z"
          fill="url(#doc-gold)"
          opacity="0.75"
        />

        {/* Central Sceptre of Wellness & Precision Star */}
        <path d="M60 30 V 78" stroke="url(#doc-gold)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="60" cy="28" r="3" fill="url(#doc-gold)" />
        <circle cx="60" cy="80" r="2" fill="url(#doc-gold)" />

        {/* Central Pure Heart-Pulse Cross (Sovereign Healthcare Emblem) */}
        <g transform="translate(60, 54)">
          <path
            d="M-8 0 H -3 L -1 -5 L 2 6 L 4 -2 L 5 0 H 8"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
}
