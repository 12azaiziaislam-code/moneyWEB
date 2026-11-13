/**
 * Accountant / Budgeting Emblem — Architectural Ledger & Vault Seal.
 * Replaces cartoon clerk with an authentic financial governance emblem.
 */

export type AccountantMood = 'happy' | 'calm' | 'worried' | 'panic';

export function AccountantChar({
  mood = 'calm',
  size = 56,
  className,
}: {
  mood?: AccountantMood;
  size?: number;
  className?: string;
}) {
  const toneColor =
    mood === 'panic'
      ? 'var(--danger)'
      : mood === 'worried'
        ? 'var(--warn)'
        : 'var(--accent)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Financial Governance Emblem"
      fill="none"
    >
      <circle cx="32" cy="32" r="29" stroke="var(--border)" strokeWidth="1" />
      <circle cx="32" cy="32" r="26" fill="var(--surface-2)" stroke={toneColor} strokeWidth="1.2" strokeOpacity="0.6" />

      {/* Architectural vault / ledger motif */}
      <rect
        x="20"
        y="18"
        width="24"
        height="28"
        rx="3"
        stroke={toneColor}
        strokeWidth="1.6"
        fill="var(--surface)"
      />
      {/* Ledger horizontal lines */}
      <line x1="25" y1="24" x2="39" y2="24" stroke="var(--muted)" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="25" y1="29" x2="35" y2="29" stroke="var(--muted)" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="25" y1="34" x2="37" y2="34" stroke="var(--muted)" strokeWidth="1.4" strokeLinecap="round" />
      {/* Balance check indicator */}
      <circle cx="32" cy="40" r="2" fill="var(--accent-2)" />
    </svg>
  );
}
