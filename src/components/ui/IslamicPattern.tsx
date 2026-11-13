import { useEffect, useState } from 'react';
import { cn } from './cn';
import { prefersReducedMotion } from '../../lib/motion';

/**
 * Baraka v2 — Sovereign Islamic Geometric Tessellation (Girih Star Rosette).
 * Crisp vector line art at low opacity with subtle organic grain.
 * High performance: pure CSS/SVG, GPU-composited, zero blurry blobs, <1% CPU.
 */
export function IslamicPattern({ className }: { className?: string }) {
  const [active, setActive] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onVisibility = () => setActive(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const reduced = prefersReducedMotion();

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-0 z-0 overflow-hidden select-none',
        !active && 'opacity-0',
        className,
      )}
      aria-hidden="true"
    >
      {/* 1. Subtle Paper Grain Texture (SVG Noise Filter) */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.025] dark:opacity-[0.035] mix-blend-overlay">
        <filter id="baraka-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#baraka-grain)" />
      </svg>

      {/* 2. Crisp 8-Pointed Star Girih Tessellation */}
      <svg
        className={cn(
          'absolute inset-0 h-full w-full transition-opacity duration-slower',
          mounted || reduced ? 'opacity-100' : 'opacity-0',
        )}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="baraka-girih-lattice"
            width="96"
            height="96"
            patternUnits="userSpaceOnUse"
          >
            {/* Structural construction lines (0.5px hairline) */}
            <path
              d="M0 0 L96 96 M96 0 L0 96 M48 0 L48 96 M0 48 L96 48"
              stroke="var(--pattern-ink)"
              strokeWidth="0.5"
              strokeDasharray="2 4"
              fill="none"
              opacity="0.3"
            />

            {/* Central 8-pointed star rosette (Khatam) */}
            <g fill="none" stroke="var(--pattern-ink)" strokeWidth="0.85">
              <rect x="30" y="30" width="36" height="36" rx="1.5" />
              <rect x="30" y="30" width="36" height="36" rx="1.5" transform="rotate(45 48 48)" />
              <circle cx="48" cy="48" r="12" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />
              <circle cx="48" cy="48" r="2.5" fill="var(--pattern-ink)" opacity="0.5" />
            </g>

            {/* Interlocking corner rosettes for seamless tiling */}
            <g fill="none" stroke="var(--pattern-ink)" strokeWidth="0.85">
              {/* Top-Left */}
              <rect x="-18" y="-18" width="36" height="36" rx="1.5" />
              <rect x="-18" y="-18" width="36" height="36" rx="1.5" transform="rotate(45 0 0)" />
              {/* Top-Right */}
              <rect x="78" y="-18" width="36" height="36" rx="1.5" />
              <rect x="78" y="-18" width="36" height="36" rx="1.5" transform="rotate(45 96 0)" />
              {/* Bottom-Right */}
              <rect x="78" y="78" width="36" height="36" rx="1.5" />
              <rect x="78" y="78" width="36" height="36" rx="1.5" transform="rotate(45 96 96)" />
              {/* Bottom-Left */}
              <rect x="-18" y="78" width="36" height="36" rx="1.5" />
              <rect x="-18" y="78" width="36" height="36" rx="1.5" transform="rotate(45 0 96)" />
            </g>
          </pattern>
        </defs>

        <rect
          width="100%"
          height="100%"
          fill="url(#baraka-girih-lattice)"
          opacity="var(--pattern-opacity)"
        />
      </svg>

      {/* 3. Subtle hairline horizon separator */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-60" />
    </div>
  );
}
