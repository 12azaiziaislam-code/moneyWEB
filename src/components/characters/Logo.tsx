/**
 * Baraka Sovereign Brand Emblem (Khatam Baraka)
 * A mastercrafted contemporary Islamic emblem combining the sacred 8-pointed
 * Rub el Hizb geometry with a celestial crescent and guiding diamond star.
 *
 * Vector-pure, razor-sharp at 16px–512px, zero blurry micro-dots or sub-pixel artifacts.
 */

interface LogoProps {
  size?: number;
  className?: string;
  variant?: 'tile' | 'glyph';
}

export function Logo({
  size = 40,
  className,
  variant = 'tile',
}: LogoProps) {
  const isTile = variant === 'tile';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-label="Baraka Sovereign Emblem"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Luxury Obsidian Midnight Plate Gradient */}
        <linearGradient id="baraka-plate-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#181E2B" />
          <stop offset="45%" stopColor="#0F131C" />
          <stop offset="100%" stopColor="#080A0E" />
        </linearGradient>

        {/* Sovereign Gold Leaf Gradient */}
        <linearGradient id="baraka-gold-grad" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#FFF6CC" />
          <stop offset="22%" stopColor="#F4D37D" />
          <stop offset="55%" stopColor="#C89730" />
          <stop offset="85%" stopColor="#A2731C" />
          <stop offset="100%" stopColor="#7E5410" />
        </linearGradient>

        {/* Ambient Halo behind the emblem */}
        <radialGradient id="baraka-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.22" />
          <stop offset="70%" stopColor="#D4AF37" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
        </radialGradient>

        {/* Soft Golden Fill for inner star facets */}
        <linearGradient id="baraka-gold-soft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#8C6316" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      {/* Luxury Squircle Base Plate (Only for 'tile' variant) */}
      {isTile ? (
        <>
          <rect width="512" height="512" rx="116" fill="url(#baraka-plate-grad)" />
          {/* Subtle Golden Outer Contour Hairline */}
          <rect
            x="14"
            y="14"
            width="484"
            height="484"
            rx="102"
            fill="none"
            stroke="url(#baraka-gold-grad)"
            strokeWidth="5"
            strokeOpacity="0.45"
          />
        </>
      ) : null}

      {/* Sovereign Emblem Core */}
      <g transform="translate(256, 256)">
        {/* Subtle Ambient Radial Glow */}
        <circle r="195" fill="url(#baraka-halo)" />

        {/* Outer Circular Frame */}
        <circle
          r="192"
          fill="none"
          stroke="url(#baraka-gold-grad)"
          strokeWidth="4"
          strokeOpacity="0.4"
        />

        {/* Sacred 8-Pointed Star (Rub el Hizb) - Clean, bold, architectural strokes */}
        <rect
          x="-124"
          y="-124"
          width="248"
          height="248"
          rx="26"
          fill="url(#baraka-gold-soft)"
          stroke="url(#baraka-gold-grad)"
          strokeWidth="16"
          strokeLinejoin="round"
        />
        <rect
          x="-124"
          y="-124"
          width="248"
          height="248"
          rx="26"
          fill="url(#baraka-gold-soft)"
          stroke="url(#baraka-gold-grad)"
          strokeWidth="16"
          strokeLinejoin="round"
          transform="rotate(45)"
        />

        {/* Inner Core Medallion Ring */}
        <circle
          r="82"
          fill="#0B0E15"
          stroke="url(#baraka-gold-grad)"
          strokeWidth="9"
        />

        {/* Sculpted Golden Celestial Crescent */}
        <path
          d="M14 -44 C-18 -36 -36 -8 -30 24 C-24 52 4 70 36 62 C10 63 -16 44 -20 18 C-24 -8 -4 -34 20 -43 C18 -43.6 16 -43.8 14 -44 Z"
          fill="url(#baraka-gold-grad)"
        />

        {/* Radiant Celestial Diamond Star in the Crescent's Embrace */}
        <g transform="translate(22, -14)">
          <path
            d="M0 -22 Q2 -6 18 0 Q2 6 0 22 Q-2 6 -18 0 Q-2 -6 0 -22 Z"
            fill="url(#baraka-gold-grad)"
          />
          <circle r="3.5" fill="#FFF9D8" />
        </g>
      </g>
    </svg>
  );
}

/** Small hairline ornament divider used under headers. */
export function Ornament({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 12" className={className} aria-hidden="true" fill="none">
      <path d="M0 6h44" stroke="var(--border)" strokeWidth="1" />
      <path d="M76 6h44" stroke="var(--border)" strokeWidth="1" />
      <path d="M60 1l4 5-4 5-4-5z" stroke="var(--accent-2)" strokeWidth="1.2" />
      <circle cx="50" cy="6" r="1.4" fill="var(--accent-2)" />
      <circle cx="70" cy="6" r="1.4" fill="var(--accent-2)" />
    </svg>
  );
}
