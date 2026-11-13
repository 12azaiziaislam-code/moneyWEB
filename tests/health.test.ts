import { describe, expect, it } from 'vitest';
import { bmi, exerciseEquivalent, isEmergencyText, kcalPerMinute, minutesForKcal } from '../shared/health';

describe('health: MET maths (computed in code, never by the model)', () => {
  it('computes kcal per minute', () => {
    // walking 3.5 MET, 70 kg -> 3.5 * 3.5 * 70 / 200 = 4.2875
    expect(kcalPerMinute(3.5, 70)).toBeCloseTo(4.2875, 3);
    // unknown weight falls back to 70 kg
    expect(kcalPerMinute(3.5)).toBeCloseTo(4.2875, 3);
  });

  it('converts kcal into minutes', () => {
    expect(minutesForKcal(500, 3.5, 70)).toBe(117);
    expect(minutesForKcal(0, 3.5, 70)).toBe(0);
    expect(minutesForKcal(-10, 3.5, 70)).toBe(0);
  });

  it('returns the three exercise equivalents, ordered by intensity', () => {
    const result = exerciseEquivalent(300, 80);
    expect(result.walkingMin).toBeGreaterThan(result.runningMin);
    expect(result.cyclingMin).toBeGreaterThan(result.runningMin);
    expect(result.cyclingMin).toBeLessThan(result.walkingMin);
    expect(result.met).toBe(3.5);
  });

  it('computes BMI safely', () => {
    expect(bmi(80, 180)).toBeCloseTo(24.7, 1);
    expect(bmi(undefined, 180)).toBeNull();
    expect(bmi(80, 10)).toBeNull();
  });
});

describe('health: emergency triage', () => {
  it('detects red flags in three languages', () => {
    expect(isEmergencyText('I have crushing chest pain')).toBe(true);
    expect(isEmergencyText('боль в груди')).toBe(true);
    expect(isEmergencyText('ألم في الصدر')).toBe(true);
  });

  it('does not flag ordinary text', () => {
    expect(isEmergencyText('hello, what is in this chocolate?')).toBe(false);
    expect(isEmergencyText('')).toBe(false);
  });
});
