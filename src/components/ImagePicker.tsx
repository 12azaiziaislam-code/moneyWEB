/** Camera/gallery picker with client-side compression + preview. */

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { prepareImage, type PreparedImage } from '../lib/image';
import { haptic } from '../lib/format';
import { cn, Spinner } from './ui';

export function ImagePicker({
  image,
  onSelect,
  onError,
  disabled,
  compact = false,
}: {
  image: PreparedImage | null;
  onSelect: (image: PreparedImage | null) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const prepared = await prepareImage(file);
      haptic(10);
      onSelect(prepared);
    } catch (error) {
      const code = (error as Error)?.message ?? '';
      onError?.(
        code === 'too_large'
          ? t('errors.payload_too_large')
          : code === 'unsupported_image'
            ? t('errors.validation_failed')
            : t('errors.generic'),
      );
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = '';
      if (galleryRef.current) galleryRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      {image && !compact ? (
        <div className="relative overflow-hidden rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700">
          <img src={image.dataUrl} alt="" className="max-h-56 w-full object-cover" />
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="absolute end-2 top-2 rounded-full bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-white min-h-[36px]"
          >
            {t('common.clear')}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={disabled || busy}
            aria-label={t('common.camera')}
            title={t('common.camera')}
            className={cn(
              'inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-2xl bg-white px-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 disabled:opacity-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700',
            )}
          >
            <span aria-hidden="true">📷</span>
            {compact ? null : <span>{t('common.camera')}</span>}
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            disabled={disabled || busy}
            aria-label={t('common.gallery')}
            title={t('common.gallery')}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-2xl bg-transparent px-3 text-sm font-semibold text-brand-700 disabled:opacity-50 dark:text-brand-300"
          >
            <span aria-hidden="true">🖼</span>
            {compact ? null : <span>{t('common.gallery')}</span>}
          </button>
          {busy ? <Spinner className="self-center text-brand-600" /> : null}
        </div>
      )}
    </div>
  );
}
