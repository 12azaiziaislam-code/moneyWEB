/** Animated progress ring used for the daily budget and macro circles. */

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from './cn';
import { prefersReducedMotion } from '../../lib/motion';

export type RingTone = 'accent' | 'ok' | 'warn' | 'danger' | 'info';

const toneVar: Record<RingTone, string> = {
  accent: 'var(--accent)',
  ok: 'var(--risk-green)',
  warn: 'var(--risk-yellow)',
  danger: 'var(--risk-red)',
  info: 'var(--info)',
};

export function ProgressRing({
  value,
  size = 148,
  stroke = 12,
  tone = 'accent',
  children,
  label,
  pulse = false,
}: {
  /** 0..100 (clamped) */
  value: number;
  size?: number;
  stroke?: number;
  tone?: RingTone;
  children?: ReactNode;
  label: string;
  pulse?: boolean;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const offset = circumference * (1 - clamped / 100);
  const circleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;
    if (prefersReducedMotion()) {
      circle.style.strokeDashoffset = String(offset);
      return;
    }
    circle.style.transition = 'stroke-dashoffset 700ms var(--ease-out)';
    circle.style.strokeDashoffset = String(offset);
  }, [offset]);

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', pulse && 'animate-pulse-ring')}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${Math.round(clamped)}%`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={toneVar[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.12))' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
