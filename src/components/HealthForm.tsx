/** Health profile form (onboarding + profile sheet). */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import type { HealthProfile } from '../../shared/types';
import { Button } from './ui/Button';
import { Input, Textarea } from './ui/Field';
import { cn } from './ui';
import { haptic, HAPTIC } from '../lib/haptics';
import { useFinance } from '../data/finance';
import { useToast } from '../state/ToastContext';

const toLines = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 30);

export function HealthForm({ initial, onSaved }: { initial: HealthProfile; onSaved?: () => void }) {
  const { t } = useTranslation();
  const { saveHealth } = useFinance();
  const { show } = useToast();
  const [form, setForm] = useState<HealthProfile>({
    ...initial,
    conditions: initial.conditions ?? [],
    medications: initial.medications ?? [],
    allergies: initial.allergies ?? [],
  });
  const [saving, setSaving] = useState(false);

  const formRef = useRef(form);
  formRef.current = form;
  const initialRef = useRef(initial);
  const savedRef = useRef(false);

  const submit = async () => {
    setSaving(true);
    try {
      await saveHealth({ ...form, updatedAt: new Date().toISOString() });
      savedRef.current = true;
      show(t('common.saved'), 'success');
      onSaved?.();
    } catch {
      show(t('common2.saveFailed'), 'danger');
    } finally {
      setSaving(false);
    }
  };

  // Defensive auto-save on unmount if modified and not yet saved
  useEffect(() => {
    return () => {
      if (savedRef.current) return;
      const current = formRef.current;
      const init = initialRef.current;
      const hasAnyData = Boolean(
        current.age ||
        current.heightCm ||
        current.weightKg ||
        current.sex ||
        current.conditions?.length ||
        current.medications?.length ||
        current.allergies?.length ||
        current.notes?.trim(),
      );
      if (hasAnyData && JSON.stringify(current) !== JSON.stringify(init)) {
        void saveHealth({ ...current, updatedAt: new Date().toISOString() });
      }
    };
  }, [saveHealth]);

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="grid grid-cols-3 gap-2">
        <Input
          label={t('health.age')}
          type="number"
          inputMode="numeric"
          min={1}
          max={120}
          value={form.age ?? ''}
          onChange={(event) => setForm({ ...form, age: Number(event.target.value) || undefined })}
        />
        <Input
          label={t('health.height')}
          type="number"
          inputMode="numeric"
          min={60}
          max={260}
          value={form.heightCm ?? ''}
          onChange={(event) => setForm({ ...form, heightCm: Number(event.target.value) || undefined })}
        />
        <Input
          label={t('health.weight')}
          type="number"
          inputMode="decimal"
          step="0.1"
          min={20}
          max={400}
          value={form.weightKg ?? ''}
          onChange={(event) => setForm({ ...form, weightKg: Number(event.target.value) || undefined })}
        />
      </div>

      {/* 3. Luxury Gender Segmented Control */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted tracking-tight block">
          {t('health.sex')}
        </label>
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl border border-line bg-surface2/60">
          <button
            type="button"
            onClick={() => {
              const next = form.sex === 'male' ? undefined : 'male';
              setForm({ ...form, sex: next });
              haptic(HAPTIC.select);
            }}
            className={cn(
              'flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-sm transition-all duration-fast cursor-pointer',
              form.sex === 'male'
                ? 'bg-accent text-accent-fg shadow-sm'
                : 'text-muted hover:text-fg hover:bg-surface2/80',
            )}
          >
            <span>{t('health.male')}</span>
            {form.sex === 'male' ? <Check className="h-4 w-4" strokeWidth={2.5} /> : null}
          </button>

          <button
            type="button"
            onClick={() => {
              const next = form.sex === 'female' ? undefined : 'female';
              setForm({ ...form, sex: next });
              haptic(HAPTIC.select);
            }}
            className={cn(
              'flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-sm transition-all duration-fast cursor-pointer',
              form.sex === 'female'
                ? 'bg-accent text-accent-fg shadow-sm'
                : 'text-muted hover:text-fg hover:bg-surface2/80',
            )}
          >
            <span>{t('health.female')}</span>
            {form.sex === 'female' ? <Check className="h-4 w-4" strokeWidth={2.5} /> : null}
          </button>
        </div>
      </div>

      <Textarea
        label={t('health.conditions')}
        hint={t('health.hint')}
        value={(form.conditions ?? []).join('\n')}
        onChange={(event) => setForm({ ...form, conditions: toLines(event.target.value) })}
      />
      <Textarea
        label={t('health.medications')}
        hint={t('health.hint')}
        value={(form.medications ?? []).join('\n')}
        onChange={(event) => setForm({ ...form, medications: toLines(event.target.value) })}
      />
      <Textarea
        label={t('health.allergies')}
        hint={t('health.hint')}
        value={(form.allergies ?? []).join('\n')}
        onChange={(event) => setForm({ ...form, allergies: toLines(event.target.value) })}
      />

      {form.sex === 'female' ? (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setForm({ ...form, pregnant: !form.pregnant });
              haptic(HAPTIC.tap);
            }}
            className={cn(
              'flex items-center justify-between gap-2 py-2.5 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer',
              form.pregnant
                ? 'border-accent bg-accent-soft text-accent shadow-xs'
                : 'border-line bg-surface text-muted hover:text-fg hover:bg-surface2/60',
            )}
          >
            <span>{t('health.pregnant')}</span>
            <span
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                form.pregnant ? 'border-accent bg-accent text-accent-fg' : 'border-line',
              )}
            >
              {form.pregnant ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setForm({ ...form, breastfeeding: !form.breastfeeding });
              haptic(HAPTIC.tap);
            }}
            className={cn(
              'flex items-center justify-between gap-2 py-2.5 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer',
              form.breastfeeding
                ? 'border-accent bg-accent-soft text-accent shadow-xs'
                : 'border-line bg-surface text-muted hover:text-fg hover:bg-surface2/60',
            )}
          >
            <span>{t('health.breastfeeding')}</span>
            <span
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                form.breastfeeding ? 'border-accent bg-accent text-accent-fg' : 'border-line',
              )}
            >
              {form.breastfeeding ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
            </span>
          </button>
        </div>
      ) : null}

      <Textarea
        label={t('health.notes')}
        maxLength={1000}
        value={form.notes ?? ''}
        onChange={(event) => setForm({ ...form, notes: event.target.value })}
      />

      {/* Permanently visible sticky bottom save button */}
      <div className="sticky bottom-0 -mx-5 -mb-4 mt-6 border-t border-line bg-surface/95 backdrop-blur-md px-5 py-3.5 shadow-e2 z-20">
        <Button type="submit" fullWidth size="lg" loading={saving} icon={<Check className="h-4 w-4" />}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
