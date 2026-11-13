/**
 * Error / Notice Emblem — Understated architectural seal.
 */

export function ErrorArt({
  size = 110,
  className,
}: {
  kind?: 'network' | 'server' | 'notfound';
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      className={className}
      role="img"
      aria-label="Status Notice Emblem"
      fill="none"
    >
      <circle cx="48" cy="48" r="42" stroke="var(--border)" strokeWidth="1" />
      <circle cx="48" cy="48" r="36" fill="var(--surface-2)" stroke="var(--warn)" strokeWidth="1.2" strokeOpacity="0.5" />
      {/* 8-pointed star perimeter */}
      <rect
        x="28"
        y="28"
        width="40"
        height="40"
        rx="2"
        stroke="var(--warn)"
        strokeWidth="1.4"
        transform="rotate(45 48 48)"
      />
      {/* Gentle center mark */}
      <circle cx="48" cy="48" r="5" fill="var(--warn)" fillOpacity="0.8" />
    </svg>
  );
}
