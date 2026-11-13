/**
 * Sovereign Brand Emblem (Khatam Sulayman & Celestial Crescent)
 * Handcrafted multi-layered royal medallion seal with obsidian base,
 * gold-leaf gradients, 36 beaded pearls, and sacred 8-pointed star geometry.
 */

export function Logo({
  size = 48,
  className,
}: {
  size?: number;
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-label="Baraka Sovereign Emblem"
      fill="none"
    >
      <defs>
        {/* Deep Obsidian / Royal Midnight Blue-Black Plate */}
        <radialGradient id="baraka-logo-plate" cx="50%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#1E2836" />
          <stop offset="60%" stopColor="#0F141C" />
          <stop offset="100%" stopColor="#080B10" />
        </radialGradient>

        {/* Sovereign Metallic Gold Leaf Gradient */}
        <linearGradient id="baraka-logo-gold" x1="60" y1="40" x2="450" y2="470" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF3B8" />
          <stop offset="18%" stopColor="#E8C87A" />
          <stop offset="45%" stopColor="#BD8E32" />
          <stop offset="70%" stopColor="#E2BD64" />
          <stop offset="100%" stopColor="#8C6316" />
        </linearGradient>

        {/* Depth Shadow */}
        <radialGradient id="baraka-logo-vignette" cx="50%" cy="50%" r="50%">
          <stop offset="80%" stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(0, 0, 0, 0.65)" />
        </radialGradient>
      </defs>

      {/* Base Plate with continuous rounded squircle */}
      <rect width="512" height="512" rx="118" fill="url(#baraka-logo-plate)" />
      <rect width="512" height="512" rx="118" fill="url(#baraka-logo-vignette)" />

      {/* Outer Double Hairline Gold Border */}
      <rect x="14" y="14" width="484" height="484" rx="104" stroke="url(#baraka-logo-gold)" strokeWidth="3" strokeOpacity="0.5" />
      <rect x="24" y="24" width="464" height="464" rx="96" stroke="url(#baraka-logo-gold)" strokeWidth="1.5" strokeOpacity="0.3" strokeDasharray="8 6" />

      {/* Medallion Center Group */}
      <g transform="translate(256, 256)">
        {/* Outer Medallion Plate */}
        <circle r="208" fill="#111720" stroke="url(#baraka-logo-gold)" strokeWidth="5" />

        {/* 36 Beaded Gold Pearls Rim */}
        <g fill="url(#baraka-logo-gold)">
          <circle cx="0" cy="-196" r="4.5" />
          <circle cx="34" cy="-193" r="4.5" />
          <circle cx="67" cy="-184" r="4.5" />
          <circle cx="98" cy="-170" r="4.5" />
          <circle cx="126" cy="-150" r="4.5" />
          <circle cx="150" cy="-126" r="4.5" />
          <circle cx="170" cy="-98" r="4.5" />
          <circle cx="184" cy="-67" r="4.5" />
          <circle cx="193" cy="-34" r="4.5" />
          <circle cx="196" cy="0" r="4.5" />
          <circle cx="193" cy="34" r="4.5" />
          <circle cx="184" cy="67" r="4.5" />
          <circle cx="170" cy="98" r="4.5" />
          <circle cx="150" cy="126" r="4.5" />
          <circle cx="126" cy="150" r="4.5" />
          <circle cx="98" cy="170" r="4.5" />
          <circle cx="67" cy="184" r="4.5" />
          <circle cx="34" cy="193" r="4.5" />
          <circle cx="0" cy="196" r="4.5" />
          <circle cx="-34" cy="193" r="4.5" />
          <circle cx="-67" cy="184" r="4.5" />
          <circle cx="-98" cy="170" r="4.5" />
          <circle cx="-126" cy="150" r="4.5" />
          <circle cx="-150" cy="126" r="4.5" />
          <circle cx="-170" cy="98" r="4.5" />
          <circle cx="-184" cy="67" r="4.5" />
          <circle cx="-193" cy="34" r="4.5" />
          <circle cx="-196" cy="0" r="4.5" />
          <circle cx="-193" cy="-34" r="4.5" />
          <circle cx="-184" cy="-67" r="4.5" />
          <circle cx="-170" cy="-98" r="4.5" />
          <circle cx="-150" cy="-126" r="4.5" />
          <circle cx="-126" cy="-150" r="4.5" />
          <circle cx="-98" cy="-170" r="4.5" />
          <circle cx="-67" cy="-184" r="4.5" />
          <circle cx="-34" cy="-193" r="4.5" />
        </g>

        {/* Concentric Stepped Hairline Rings */}
        <circle r="182" stroke="url(#baraka-logo-gold)" strokeWidth="2" strokeOpacity="0.6" strokeDasharray="10 6" />
        <circle r="172" stroke="url(#baraka-logo-gold)" strokeWidth="1.5" strokeOpacity="0.4" />

        {/* Sacred 8-Pointed Star Lattice (Khatam Sulayman) */}
        <rect x="-116" y="-116" width="232" height="232" rx="10" stroke="url(#baraka-logo-gold)" strokeWidth="6.5" strokeOpacity="0.95" />
        <rect x="-116" y="-116" width="232" height="232" rx="10" stroke="url(#baraka-logo-gold)" strokeWidth="6.5" strokeOpacity="0.95" transform="rotate(45)" />

        <path d="M-116,-48 L-116,48 L-48,116 L48,116 L116,48 L116,-48 L48,-116 L-48,-116 Z" fill="url(#baraka-logo-gold)" fillOpacity="0.08" />

        {/* Radiating Islamic Geometric Facets */}
        <g stroke="url(#baraka-logo-gold)" strokeWidth="2" strokeOpacity="0.45">
          <line x1="0" y1="-172" x2="0" y2="-116" />
          <line x1="0" y1="116" x2="0" y2="172" />
          <line x1="-172" y1="0" x2="-116" y2="0" />
          <line x1="116" y1="0" x2="172" y2="0" />
          <line x1="-122" y1="-122" x2="-82" y2="-82" />
          <line x1="82" y1="82" x2="122" y2="122" />
          <line x1="122" y1="-122" x2="82" y2="-82" />
          <line x1="-82" y1="82" x2="-122" y2="122" />
        </g>

        {/* Inner Core Guilloché Medallion */}
        <circle r="88" fill="#0A0E14" stroke="url(#baraka-logo-gold)" strokeWidth="4.5" />
        <circle r="78" stroke="url(#baraka-logo-gold)" strokeWidth="1.8" strokeDasharray="5 4" strokeOpacity="0.75" />

        {/* Sculpted Celestial Crescent in Sovereign Gold Leaf */}
        <path
          d="M12 -58 C-26 -48 -50 -14 -42 26 C-34 66 4 92 46 82 C14 84 -22 62 -28 26 C-34 -10 -8 -44 24 -56 C20 -57 16 -57.5 12 -58 Z"
          fill="url(#baraka-logo-gold)"
        />

        {/* Guiding 8-Pointed Star in Pure Gold */}
        <g transform="translate(30, -22)">
          <polygon
            points="0,-24 7,-7 24,0 7,7 0,24 -7,7 -24,0 -7,-7"
            fill="url(#baraka-logo-gold)"
          />
          <circle r="3" fill="#FFF3B8" />
        </g>

        {/* Cardinal Jewel Points */}
        <circle cx="0" cy="-148" r="4.5" fill="url(#baraka-logo-gold)" />
        <circle cx="0" cy="148" r="4.5" fill="url(#baraka-logo-gold)" />
        <circle cx="-148" cy="0" r="4.5" fill="url(#baraka-logo-gold)" />
        <circle cx="148" cy="0" r="4.5" fill="url(#baraka-logo-gold)" />
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
