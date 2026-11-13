import { useEffect, useState } from 'react';
import { cn } from './cn';
import { prefersReducedMotion } from '../../lib/motion';

/**
 * Baraka v2 — Fine Architectural Watermark
 * Ultra-subtle, monochromatic geometric rosette with delicate noise grain.
 * Opacity <= 2% to ensure it never competes with foreground content.
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
      <svg className="absolute inset-0 h-full w-full opacity-[0.02] dark:opacity-[0.03] mix-blend-overlay">
        <filter id="baraka-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#baraka-grain)" />
      </svg>

      {/* 2. Delicate 8-Pointed Star Rosette (Monochromatic, low opacity) */}
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
            width="144"
            height="144"
            patternUnits="userSpaceOnUse"
          >
            {/* Subtle central star rosette */}
            <g fill="none" stroke="var(--pattern-ink)" strokeWidth="0.75">
              <rect x="44" y="44" width="56" height="56" rx="2" />
              <rect x="44" y="44" width="56" height="56" rx="2" transform="rotate(45 72 72)" />
              <circle cx="72" cy="72" r="18" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.5" />
            </g>

            {/* Corner rosettes */}
            <g fill="none" stroke="var(--pattern-ink)" strokeWidth="0.75" opacity="0.6">
              <rect x="-28" y="-28" width="56" height="56" rx="2" />
              <rect x="-28" y="-28" width="56" height="56" rx="2" transform="rotate(45 0 0)" />
              <rect x="116" y="-28" width="56" height="56" rx="2" />
              <rect x="116" y="-28" width="56" height="56" rx="2" transform="rotate(45 144 0)" />
              <rect x="116" y="116" width="56" height="56" rx="2" />
              <rect x="116" y="116" width="56" height="56" rx="2" transform="rotate(45 144 144)" />
              <rect x="-28" y="116" width="56" height="56" rx="2" />
              <rect x="-28" y="116" width="56" height="56" rx="2" transform="rotate(45 0 144)" />
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
    </div>
  );
}
