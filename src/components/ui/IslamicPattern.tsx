import { cn } from './cn';

/**
 * Authentic Architectural Islamic Girih Pattern & Atmospheric Illumination.
 * Provides a visible, luxury geometric backdrop with warm gilded ambient depth.
 */
export function IslamicPattern({ className }: { className?: string }) {
  return (
    <div
      className={cn('pointer-events-none fixed inset-0 z-0 overflow-hidden', className)}
      aria-hidden="true"
    >
      {/* 1. Atmospheric Ambient Depth (Warm Gilded Dome Illumination) */}
      <div
        className="absolute inset-0 transition-opacity duration-slower opacity-80 dark:opacity-70"
        style={{
          background:
            'radial-gradient(110% 70% at 50% -10%, rgba(212, 175, 55, 0.18) 0%, rgba(197, 160, 89, 0.06) 45%, transparent 75%)',
        }}
      />

      {/* 2. Secondary soft vignette for dramatic framing */}
      <div
        className="absolute inset-0 opacity-50 dark:opacity-40"
        style={{
          background:
            'radial-gradient(120% 100% at 50% 100%, rgba(18, 22, 28, 0.35) 0%, transparent 60%)',
        }}
      />

      {/* 3. The Seamless Girih Geometric Star Lattice (High-definition SVG) */}
      <svg
        className="absolute inset-0 h-full w-full text-[#B88E3E]/[0.22] dark:text-[#C5A059]/[0.18]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="baraka-girih-pattern"
            width="80"
            height="80"
            patternUnits="userSpaceOnUse"
          >
            {/* Diagonal & cross alignment grid lines */}
            <path
              d="M0 0 L80 80 M80 0 L0 80 M40 0 L40 80 M0 40 L80 40"
              stroke="currentColor"
              strokeWidth="0.5"
              strokeDasharray="2 3"
              fill="none"
              opacity="0.45"
            />

            {/* Central 8-pointed star (Khatam Sulayman) */}
            <g fill="none" stroke="currentColor" strokeWidth="0.95">
              <rect x="25" y="25" width="30" height="30" />
              <rect x="25" y="25" width="30" height="30" transform="rotate(45 40 40)" />
              <circle cx="40" cy="40" r="10" strokeWidth="0.6" strokeDasharray="2 2" />
              <circle cx="40" cy="40" r="2.5" fill="currentColor" opacity="0.6" />
            </g>

            {/* Corner interlocking 8-pointed stars (seamless tiling seams) */}
            <g fill="none" stroke="currentColor" strokeWidth="0.95">
              <rect x="-15" y="-15" width="30" height="30" />
              <rect x="-15" y="-15" width="30" height="30" transform="rotate(45 0 0)" />

              <rect x="65" y="-15" width="30" height="30" />
              <rect x="65" y="-15" width="30" height="30" transform="rotate(45 80 0)" />

              <rect x="65" y="65" width="30" height="30" />
              <rect x="65" y="65" width="30" height="30" transform="rotate(45 80 80)" />

              <rect x="-15" y="65" width="30" height="30" />
              <rect x="-15" y="65" width="30" height="30" transform="rotate(45 0 80)" />
            </g>
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#baraka-girih-pattern)" />
      </svg>

      {/* Subtle hairline frame border at the very top edge */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent" />
    </div>
  );
}

