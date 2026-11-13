/** Health profile form (onboarding + profile sheet). */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import type { HealthProfile } from '../../shared/types';
import { Button } from './ui/Button';
import { Input, Select, Textarea } from './ui/Field';
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

      <Select
        label={t('health.sex')}
        value={form.sex ?? ''}
        onChange={(event) => setForm({ ...form, sex: (event.target.value || undefined) as HealthProfile['sex'] })}
      >
        <option value="">—</option>
        <option value="male">{t('health.male')}</option>
        <option value="female">{t('health.female')}</option>
      </Select>

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
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex min-h-[36px] items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(form.pregnant)}
              onChange={(event) => setForm({ ...form, pregnant: event.target.checked })}
              className="h-5 w-5 accent-[var(--accent)]"
            />
            {t('health.pregnant')}
          </label>
          <label className="flex min-h-[36px] items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(form.breastfeeding)}
              onChange={(event) => setForm({ ...form, breastfeeding: event.target.checked })}
              className="h-5 w-5 accent-[var(--accent)]"
            />
            {t('health.breastfeeding')}
          </label>
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
