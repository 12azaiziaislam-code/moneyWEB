import { describe, expect, it } from 'vitest';
import { doctorAnalyzeMessages } from '../functions/api/_lib/ai/prompts';
import ar from '../src/i18n/ar.json';
import en from '../src/i18n/en.json';
import ru from '../src/i18n/ru.json';

describe('Doctor AI text vs image prompt separation', () => {
  it('omits image references when text inquiry has no image', () => {
    const prompt = doctorAnalyzeMessages({
      locale: 'ar',
      health: {
        age: 21,
        weightKg: 78,
        heightCm: 173,
        conditions: [],
        medications: [],
        allergies: [],
      },
      type: 'unclear',
      imageDataUrl: '',
      text: 'هل وزني طبيعي بالنسبة لطولي و عمري ام احتاج لكي انحف',
    });

    // Must NOT ask to analyse attached image
    expect(prompt.user).not.toContain('Analyse the attached image');
    expect(prompt.system).not.toContain('The photo was classified as');

    // Must explicitly instruct the model that there is NO photo
    expect(prompt.system).toContain('NO photo or image attached');
    expect(prompt.user).toContain('هل وزني طبيعي بالنسبة لطولي و عمري ام احتاج لكي انحف');
  });

  it('includes image analysis instructions when image is present', () => {
    const prompt = doctorAnalyzeMessages({
      locale: 'ar',
      health: {
        age: 21,
        weightKg: 78,
        heightCm: 173,
        conditions: [],
        medications: [],
        allergies: [],
      },
      type: 'medicine',
      imageDataUrl: 'data:image/jpeg;base64,abc123mock',
      text: 'ما هو هذا الدواء',
    });

    expect(prompt.user).toContain('Analyse the attached image');
    expect(prompt.system).toContain('The photo was classified as: medicine');
  });
});

describe('Doctor i18n localization checks', () => {
  it('has doctor.discuss in Arabic saying استشارة الطبيب, NOT ناقش الشيخ', () => {
    expect(ar.doctor.discuss).toBe('استشارة الطبيب');
    expect(ar.doctor.discuss).not.toContain('الشيخ');
    expect(en.doctor.discuss).toBe('Consult Doctor');
    expect(ru.doctor.discuss).toBe('Консультация с врачом');
  });

  it('has dedicated text vs image analyzing progress messages', () => {
    expect(ar.doctor.analyzingImage).toContain('الصورة');
    expect(ar.doctor.analyzingText).not.toContain('الصورة');
    expect(ar.doctor.analyzingText).toContain('الاستفسار');
  });

  it('localizes unclear type nicely instead of raw English', () => {
    expect(ar.doctor.types.unclear).toBe('استشارة وتقييم صحي عام');
    expect(en.doctor.types.unclear).toBe('General Health Assessment');
    expect(ru.doctor.types.unclear).toBe('Общая медицинская консультация');
  });
});
