/** Offers to carry local guest data into the freshly created account (once). */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from './ui/Button';
import { Sheet } from './ui/Sheet';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { clearGuestData, guestHasData } from '../lib/guestStore';

export function GuestUpgradeSheet() {
  const { t } = useTranslation();
  const { role, guestData, importGuest, setGuestData, refresh } = useAuth();
  const { show } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Only for a signed-in user who still has guest data on this device.
    if (role === 'user' && guestData && guestHasData(guestData)) setOpen(true);
  }, [role, guestData]);

  if (role !== 'user') return null;

  const importNow = async () => {
    setBusy(true);
    const result = await importGuest();
    setBusy(false);
    setOpen(false);
    if (result) show(t('guest.imported', { chats: result.chats, transactions: result.transactions }), 'success');
  };

  const startEmpty = async () => {
    await clearGuestData();
    await setGuestData({
      version: 1,
      settings: guestData?.settings ?? {
        locale: 'ru',
        currency: 'RUB',
        timezone: 'Europe/Moscow',
        madhhab: 'none',
        health: { conditions: [], medications: [], allergies: [] },
        finance: {
          currency: 'RUB',
          incomes: [],
          fixedExpenses: [],
          savingsRates: { hard: 30, normal: 15, easy: 5 },
          level: 'normal',
        },
        balanceMinor: 0,
        consentAt: null,
      },
      chats: [],
      transactions: [],
      updatedAt: new Date().toISOString(),
    });
    await refresh();
    setOpen(false);
  };

  return (
    <Sheet
      open={open}
      title={t('guest.upgradeTitle')}
      onClose={() => setOpen(false)}
      footer={
        <>
          <Button fullWidth loading={busy} icon={<ArrowRight className="h-4 w-4" aria-hidden />} onClick={() => void importNow()}>
            {t('guest.upgradeYes')}
          </Button>
          <Button fullWidth variant="ghost" onClick={() => void startEmpty()}>
            {t('guest.upgradeNo')}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3 rounded-md bg-accent-soft p-3 text-accent">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <p className="text-sm text-accent">{t('guest.upgradeBody')}</p>
      </div>
      {guestData ? (
        <p className="num text-[12px] text-muted">
          {t('guest.imported', { chats: guestData.chats.length, transactions: guestData.transactions.length })}
        </p>
      ) : null}
    </Sheet>
  );
}
