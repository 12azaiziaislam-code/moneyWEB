import { describe, expect, it } from 'vitest';
import { quickScreenText } from '../shared/halalRules';

describe('halalRules: fast pre-screening engine', () => {
  it('detects pork in Russian, Arabic, and English in 0ms', () => {
    expect(quickScreenText('Состав: свинина 80%, соль').verdict).toBe('haram');
    expect(quickScreenText('لحم خنزير مقدد مع البهارات').verdict).toBe('haram');
    expect(quickScreenText('Contains smoked pork belly').verdict).toBe('haram');
  });

  it('detects E120 / Carmine as haram', () => {
    expect(quickScreenText('Краситель E120, сахар, ароматизатор').verdict).toBe('haram');
    expect(quickScreenText('يحتوي على صبغة الكارمين').verdict).toBe('haram');
    expect(quickScreenText('Color: cochineal extract').verdict).toBe('haram');
  });

  it('detects alcohol and ethanol as haram', () => {
    expect(quickScreenText('Конфеты с добавлением коньяка и спирта').verdict).toBe('haram');
    expect(quickScreenText('شوكولاتة محشوة بمسكر كحول').verdict).toBe('haram');
    expect(quickScreenText('Contains ethanol 2.5%').verdict).toBe('haram');
  });

  it('detects unverified gelatin and E471 as mashbooh', () => {
    expect(quickScreenText('Мармелад жевательный, желатин, патока').verdict).toBe('mashbooh');
    expect(quickScreenText('حلوى تحتوي على جيلاتين بقري غير محدد').verdict).toBe('mashbooh');
    expect(quickScreenText('Emulsifier E471, vegetable oil').verdict).toBe('mashbooh');
  });

  it('returns null for benign pure ingredients allowing deep check', () => {
    expect(quickScreenText('100% pure organic rolled oats').verdict).toBe(null);
    expect(quickScreenText('شوفان، ماء، ملح طعام').verdict).toBe(null);
  });
});
