/**
 * Brand Emblem (Architectural Star & Crescent) and Hairline Ornament.
 * Crafted with noble obsidian and illuminated gold leaf.
 */

export function Logo({
  size = 64,
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
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Baraka"
      fill="none"
    >
      <defs>
        <linearGradient id="baraka-logo-base" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#18202A" />
          <stop offset="1" stopColor="#0F141C" />
        </linearGradient>
        <linearGradient id="baraka-gold-accent" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E5C77A" />
          <stop offset="1" stopColor="#B08332" />
        </linearGradient>
      </defs>

      {/* Outer base container */}
      <rect width="64" height="64" rx="14" fill="url(#baraka-logo-base)" />
      <rect
        x="0.75"
        y="0.75"
        width="62.5"
        height="62.5"
        rx="13.25"
        stroke="url(#baraka-gold-accent)"
        strokeWidth="1.2"
        strokeOpacity="0.5"
      />

      {/* 8-pointed star perimeter (Khatam Sulayman) in illuminated gold */}
      <rect
        x="18"
        y="18"
        width="28"
        height="28"
        rx="2"
        stroke="url(#baraka-gold-accent)"
        strokeWidth="1.3"
        strokeOpacity="0.85"
      />
      <rect
        x="18"
        y="18"
        width="28"
        height="28"
        rx="2"
        stroke="url(#baraka-gold-accent)"
        strokeWidth="1.3"
        strokeOpacity="0.85"
        transform="rotate(45 32 32)"
      />

      {/* Celestial Crescent in Pure Alabaster */}
      <path
        d="M34 22c-6 1.6-9.8 7-8.7 13s7 9.8 13 8.7c-4.8.5-9.8-2.7-10.9-8.2s2.2-10.4 6.6-13.5Z"
        fill="#FAF9F5"
      />

      {/* Guiding star in Gilded Gold Leaf */}
      <polygon
        points="39,25 40.2,28.2 43.5,28.2 40.8,30.2 41.8,33.5 39,31.5 36.2,33.5 37.2,30.2 34.5,28.2 37.8,28.2"
        fill="url(#baraka-gold-accent)"
      />
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
