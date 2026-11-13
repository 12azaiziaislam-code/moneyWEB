/**
 * Baraka v2 — Health Profile Form
 * Clean regular-font numbers, Tag-based conditions & medications, Luxury Gender Segmented Control, live BMI.
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Plus, X } from 'lucide-react';
import type { HealthProfile } from '../../shared/types';
import { bmi } from '../../shared/health';
import { Button } from './ui/Button';
import { Input } from './ui/Field';
import { cn } from './ui';
import { haptic, HAPTIC } from '../lib/haptics';
import { useFinance } from '../data/finance';
import { useToast } from '../state/ToastContext';

function TagListInput({
  label,
  placeholder,
  tags,
  onChange,
}: {
  label: string;
  placeholder?: string;
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');

  const addTag = () => {
    const val = draft.trim();
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
      setDraft('');
      haptic(HAPTIC.tap);
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
    haptic(HAPTIC.tap);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-end gap-2">
        <div className="flex-1 min-w-0">
          <Input
            label={label}
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={addTag}
          icon={<Plus className="h-4 w-4" />}
          className="shrink-0 mb-0.5"
        >
          {t('common.add', 'إضافة')}
        </Button>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {tags.map((tag, idx) => (
            <span
              key={`${tag}-${idx}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-surface2 border border-line text-fg"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(idx)}
                className="text-muted hover:text-danger cursor-pointer transition-colors"
                aria-label={t('common.delete', 'حذف')}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

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

  const liveBmi = form.weightKg && form.heightCm ? bmi(form.weightKg, form.heightCm) : null;

  const submit = async () => {
    setSaving(true);
    try {
      await saveHealth({ ...form, updatedAt: new Date().toISOString() });
      savedRef.current = true;
      haptic(HAPTIC.tap);
      show(t('common.saved', 'تم حفظ الملف الصحي'), 'info');
      onSaved?.();
    } catch {
      show(t('common2.saveFailed', 'فشل حفظ الملف الصحي'), 'danger');
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
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {/* 1. Age, Height, Weight in regular font */}
      <div className="grid grid-cols-3 gap-2.5">
        <Input
          label={t('health.age', 'العمر')}
          type="number"
          inputMode="numeric"
          min={1}
          max={120}
          value={form.age ?? ''}
          onChange={(event) => setForm({ ...form, age: Number(event.target.value) || undefined })}
        />
        <Input
          label={t('health.height', 'الطول (سم)')}
          type="number"
          inputMode="numeric"
          min={60}
          max={260}
          value={form.heightCm ?? ''}
          onChange={(event) => setForm({ ...form, heightCm: Number(event.target.value) || undefined })}
        />
        <Input
          label={t('health.weight', 'الوزن (كغ)')}
          type="number"
          inputMode="decimal"
          step="0.1"
          min={20}
          max={400}
          value={form.weightKg ?? ''}
          onChange={(event) => setForm({ ...form, weightKg: Number(event.target.value) || undefined })}
        />
      </div>

      {/* Live Calculated BMI Badge in regular font */}
      {liveBmi !== null && (
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-line bg-surface2/40 text-xs">
          <span className="text-muted font-medium">مؤشر كتلة الجسم (BMI):</span>
          <span className="font-sans font-bold text-fg">
            {liveBmi} —{' '}
            {liveBmi < 18.5
              ? 'نقص وزن'
              : liveBmi < 25
                ? 'وزن مثالي'
                : liveBmi < 30
                  ? 'وزن زائد'
                  : 'سمنة'}
          </span>
        </div>
      )}

      {/* 2. Luxury Gender Segmented Control */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted block">
          {t('health.sex', 'الجنس')}
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
              'flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-sm transition-all cursor-pointer',
              form.sex === 'male'
                ? 'bg-accent text-accent-fg shadow-xs'
                : 'text-muted hover:text-fg hover:bg-surface2/80',
            )}
          >
            <span>{t('health.male', 'ذكر')}</span>
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
              'flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-sm transition-all cursor-pointer',
              form.sex === 'female'
                ? 'bg-accent text-accent-fg shadow-xs'
                : 'text-muted hover:text-fg hover:bg-surface2/80',
            )}
          >
            <span>{t('health.female', 'أنثى')}</span>
            {form.sex === 'female' ? <Check className="h-4 w-4" strokeWidth={2.5} /> : null}
          </button>
        </div>
      </div>

      {/* 3. Conditions, Medications, Allergies as Interactive Tag Inputs */}
      <TagListInput
        label={t('health.conditions', 'الأمراض المزمنة')}
        placeholder="مثال: السكري، الضغط..."
        tags={form.conditions ?? []}
        onChange={(conditions) => setForm({ ...form, conditions })}
      />

      <TagListInput
        label={t('health.medications', 'الأدوية الحالية')}
        placeholder="مثال: أسبرين، ميتفورمين..."
        tags={form.medications ?? []}
        onChange={(medications) => setForm({ ...form, medications })}
      />

      <TagListInput
        label={t('health.allergies', 'الحساسية')}
        placeholder="مثال: بنسلين، مكسرات..."
        tags={form.allergies ?? []}
        onChange={(allergies) => setForm({ ...form, allergies })}
      />

      {/* Female-specific toggles */}
      {form.sex === 'female' && (
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
            <span>{t('health.pregnant', 'حامل')}</span>
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
            <span>{t('health.breastfeeding', 'مرضع')}</span>
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
      )}

      <div className="pt-2">
        <Button fullWidth size="lg" variant="primary" loading={saving} type="submit">
          {t('common.save', 'حفظ الملف الصحي')}
        </Button>
      </div>
    </form>
  );
}
