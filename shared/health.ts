/**
 * Health maths — MET based exercise equivalents are computed HERE (in code),
 * never by the language model.
 */

import type { HealthProfile } from './types';

/** Minimum data required before the doctor chat is allowed. */
export function isHealthProfileComplete(health: HealthProfile | null | undefined): boolean {
  if (!health) return false;
  return Boolean(health.age && health.weightKg && (health.heightCm || (health.conditions?.length ?? 0) > 0));
}

export const MET = {
  walking: 3.5,
  running: 9.8,
  cycling: 6.8,
} as const;

export function safeWeight(weightKg?: number): number {
  return weightKg && weightKg >= 25 && weightKg <= 300 ? weightKg : 70;
}

/** kcal burned per minute for a given MET and body weight. */
export function kcalPerMinute(met: number, weightKg?: number): number {
  return (met * 3.5 * safeWeight(weightKg)) / 200;
}

/** Minutes of an activity needed to burn `kcal`. Always >= 1. */
export function minutesForKcal(kcal: number, met: number, weightKg?: number): number {
  const rate = kcalPerMinute(met, weightKg);
  if (!Number.isFinite(kcal) || kcal <= 0 || rate <= 0) return 0;
  return Math.max(1, Math.round(kcal / rate));
}

export function exerciseEquivalent(
  kcal: number,
  weightKg?: number,
): { walkingMin: number; runningMin: number; cyclingMin: number; met: number } {
  const safeKcal = Number.isFinite(kcal) && kcal > 0 ? Math.min(kcal, 10_000) : 0;
  return {
    walkingMin: minutesForKcal(safeKcal, MET.walking, weightKg),
    runningMin: minutesForKcal(safeKcal, MET.running, weightKg),
    cyclingMin: minutesForKcal(safeKcal, MET.cycling, weightKg),
    met: MET.walking,
  };
}

export function bmi(weightKg?: number, heightCm?: number): number | null {
  if (!weightKg || !heightCm || heightCm < 80 || heightCm > 260) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

/** Mifflin–St Jeor resting energy expenditure (kcal/day). */
export function bmrMifflin(input: {
  weightKg?: number;
  heightCm?: number;
  age?: number;
  sex?: 'male' | 'female';
}): number | null {
  const { weightKg, heightCm, age } = input;
  if (!weightKg || !heightCm || !age || age < 10 || age > 110) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(input.sex === 'female' ? base - 161 : base + 5);
}

const EMERGENCY_PATTERNS: RegExp[] = [
  /chest\s*pain|crushing chest|heart attack|can'?t breathe|shortness of breath|severe bleeding/i,
  /боль в груди|давит в груди|не могу дышать|задыхаюсь|сильное кровотечение|инфаркт|инсульт/i,
  /ألم في الصدر|ألم بالصدر|لا أستطيع التنفس|ضيق تنفس|نزيف شديد|جلطة|سكتة/i,
];

/** Immediate red-flag triage on user text (safety net before/after the model). */
export function isEmergencyText(text: string): boolean {
  if (!text) return false;
  return EMERGENCY_PATTERNS.some((re) => re.test(text));
}
