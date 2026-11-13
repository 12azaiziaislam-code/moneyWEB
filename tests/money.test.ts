import { describe, expect, it } from 'vitest';
import {
  currencyExponent,
  formatMoney,
  majorToMinor,
  minorToDecimalString,
  numberToMinor,
  percentOf,
  sumMinor,
} from '../shared/money';

describe('money: parsing human input', () => {
  it('parses plain numbers', () => {
    expect(majorToMinor('150')).toBe(15000);
    expect(majorToMinor('0')).toBe(0);
  });

  it('parses Russian formatting with spaces and comma decimals', () => {
    expect(majorToMinor('1 234,56')).toBe(123456);
    expect(majorToMinor('1\u00a0234,5')).toBe(123450);
    expect(majorToMinor('₽ 150')).toBe(15000);
    expect(majorToMinor('150 р.')).toBe(15000);
  });

  it('parses English formatting with thousands separators', () => {
    expect(majorToMinor('1,234.56')).toBe(123456);
    expect(majorToMinor('1.234.567,89')).toBe(123456789);
    expect(majorToMinor('1,234,567')).toBe(123456700);
  });

  it('rounds half-up to the currency exponent', () => {
    expect(majorToMinor('12.3456')).toBe(1235); // 12.3456 -> 12.35
    expect(majorToMinor('12.3444')).toBe(1234);
    expect(majorToMinor('19.9999')).toBe(2000);
    // three-digit groups without other separators are read as thousands
    expect(majorToMinor('1.234')).toBe(123400);
  });

  it('handles zero-decimal currencies', () => {
    expect(currencyExponent('JPY')).toBe(0);
    expect(majorToMinor('1500', 'JPY')).toBe(1500);
  });

  it('returns null for garbage', () => {
    expect(majorToMinor('')).toBeNull();
    expect(majorToMinor('abc')).toBeNull();
    expect(majorToMinor('...')).toBeNull();
  });

  it('supports negative values', () => {
    expect(majorToMinor('-12,50')).toBe(-1250);
  });
});

describe('money: minor unit helpers', () => {
  it('converts numbers without float drift for typical prices', () => {
    expect(numberToMinor(19.99)).toBe(1999);
    expect(numberToMinor(0.1 + 0.2)).toBe(30);
    expect(numberToMinor(1290)).toBe(129000);
  });

  it('formats minor units back to a decimal string', () => {
    expect(minorToDecimalString(123456)).toBe('1234.56');
    expect(minorToDecimalString(5)).toBe('0.05');
    expect(minorToDecimalString(-1250)).toBe('-12.50');
    expect(minorToDecimalString(1500, 'JPY')).toBe('1500');
  });

  it('sums integer minor units', () => {
    expect(sumMinor([100, 250, 0])).toBe(350);
    expect(sumMinor([Number.NaN as unknown as number, 100])).toBe(100);
  });

  it('formats with Intl and never throws', () => {
    const ru = formatMoney(150000, 'RUB', 'ru');
    expect(ru).toContain('1');
    expect(ru.length).toBeGreaterThan(3);
    const ar = formatMoney(150000, 'RUB', 'ar');
    expect(ar.length).toBeGreaterThan(3);
    // Unknown locale should not crash the UI.
    const fallback = formatMoney(150000, 'RUB', 'xx-unknown');
    expect(typeof fallback).toBe('string');
    expect(fallback.length).toBeGreaterThan(2);
  });

  it('computes clamped percentages', () => {
    expect(percentOf(50, 100)).toBe(50);
    expect(percentOf(50, 0)).toBe(0);
    expect(percentOf(5000, 100)).toBe(999);
  });
});
