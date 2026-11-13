/**
 * Baraka v2 — Consultations & Chats Archive (المحادثات)
 * Features:
 * 1. Chronological time grouping: اليوم (Today), أمس (Yesterday), هذا الأسبوع (This Week), أقدم (Older).
 * 2. Navigation-matched category filters: الكل، الحلال، الطبيب، المحاسب.
 * 3. Consistent card design: Assistant Persona Avatar, bold title, line-clamp preview, relative timestamp.
 * 4. Safe deletion via ConfirmDialog with instant feedback.
 * 5. Clean, professional empty state without cartoon illustrations.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  ShieldCheck,
  Trash2,
  MessagesSquare,
  Clock,
  Activity,
  CreditCard,
} from 'lucide-react';
import type { ChatKind, ChatSummary } from '../../shared/types';
import { localDateISO } from '../../shared/payday';
import { PageHeader } from '../components/AppShell';
import { Button, IconButton } from '../components/ui/Button';
import { StatusBadge, EmptyState, Skeleton, ConfirmDialog } from '../components/ui/Feedback';
import { Input } from '../components/ui/Field';
import { Segmented } from '../components/ui/Controls';
import { PersonaAvatar } from '../components/characters/Personas';
import { useChatList, useChatMutations } from '../data/chats';
import { formatRelativeTime } from '../lib/format';
import { usePageTheme } from '../lib/theme';
import { useToast } from '../state/ToastContext';
import { useAuth } from '../state/AuthContext';
import { haptic, HAPTIC } from '../lib/haptics';
import type { Locale } from '../i18n';

interface TimeGroup {
  key: string;
  labelKey: string;
  chats: ChatSummary[];
}

function groupChatsByTime(chats: ChatSummary[], tz = 'Europe/Moscow'): TimeGroup[] {
  const now = new Date();
  const today = localDateISO(now.toISOString(), tz);
  const yesterday = localDateISO(new Date(now.getTime() - 86400000).toISOString(), tz);
  const sevenDaysAgo = localDateISO(new Date(now.getTime() - 7 * 86400000).toISOString(), tz);

  const groups: TimeGroup[] = [
    { key: 'today', labelKey: 'chats.today', chats: [] },
    { key: 'yesterday', labelKey: 'chats.yesterday', chats: [] },
    { key: 'thisWeek', labelKey: 'chats.thisWeek', chats: [] },
    { key: 'older', labelKey: 'chats.older', chats: [] },
  ];

  for (const chat of chats) {
    const chatDate = localDateISO(chat.updatedAt, tz);
    if (chatDate === today) {
      groups[0].chats.push(chat);
    } else if (chatDate === yesterday) {
      groups[1].chats.push(chat);
    } else if (chatDate >= sevenDaysAgo) {
      groups[2].chats.push(chat);
    } else {
      groups[3].chats.push(chat);
    }
  }

  return groups.filter((g) => g.chats.length > 0);
}

export function ChatsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { show } = useToast();
  const { user } = useAuth();
  const { deleteChat } = useChatMutations();
  const [filter, setFilter] = useState<'all' | ChatKind>('all');
  const [query, setQuery] = useState('');
  const { chats, loading } = useChatList(filter, query);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  usePageTheme('chats');

  const locale = (user?.locale ?? i18n.language ?? 'ar') as Locale;
  const timezone = user?.timezone || 'Europe/Moscow';

  const empty = useMemo(() => !loading && chats.length === 0, [chats.length, loading]);
  const groupedChats = useMemo(() => groupChatsByTime(chats, timezone), [chats, timezone]);

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await deleteChat(deleteTargetId);
      haptic(HAPTIC.tap);
      show(t('common.deleted', 'تم حذف المحادثة'), 'info');
      setDeleteTargetId(null);
    } catch {
      show(t('errors.generic'), 'danger');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-5 pb-8">
      <PageHeader title={t('chats2.title')} subtitle={t('chats2.subtitle')} />

      {/* Search + filter toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="md:flex-1">
          <Input
            label={t('chats.search', 'ابحث في محادثاتك')}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            suffix={<Search className="h-4 w-4 text-muted" />}
          />
        </div>
        <Segmented
          className="md:w-[26rem]"
          ariaLabel={t('chats2.title')}
          value={filter}
          onChange={(value) => setFilter(value as 'all' | ChatKind)}
          options={[
            { value: 'all', label: t('common.all', 'الكل') },
            { value: 'shaykh', label: t('nav.halal', 'الحلال') },
            { value: 'doctor', label: t('nav.doctor', 'الطبيب') },
            { value: 'accountant', label: t('nav.accountant', 'المحاسب') },
          ]}
        />
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : empty ? (
        /* Empty State with Role-Tailored Guidance & Direct Action */
        <div className="surface-card p-8 text-center space-y-4">
          {filter === 'doctor' ? (
            <EmptyState
              icon={<Activity className="h-10 w-10 text-accent" strokeWidth={1.8} />}
              title={t('chats.emptyDoctor', 'لا توجد استشارات مع الطبيب بعد')}
              body={t(
                'chats.emptyDoctorHint',
                'اطرح أي استفسار صحي أو افحص دوائك وملاءمته لملفك الطبي لبدء محادثة طبية متخصصة.'
              )}
              action={
                <Button
                  variant="primary"
                  icon={<Activity className="h-4 w-4" />}
                  onClick={() => navigate('/doctor')}
                  className="mt-2"
                >
                  {t('chats.ctaDoctor', 'استشر الطبيب الآن')}
                </Button>
              }
            />
          ) : filter === 'accountant' ? (
            <EmptyState
              icon={<CreditCard className="h-10 w-10 text-accent" strokeWidth={1.8} />}
              title={t('chats.emptyAccountant', 'لا توجد محادثات محاسبية بعد')}
              body={t(
                'chats.emptyAccountantHint',
                'استشر المحاسب بخصوص خطة التوفير، حساب المصروف اليومي، ومتابعة ميزانيتك.'
              )}
              action={
                <Button
                  variant="primary"
                  icon={<CreditCard className="h-4 w-4" />}
                  onClick={() => navigate('/accountant')}
                  className="mt-2"
                >
                  {t('chats.ctaAccountant', 'استشر المحاسب')}
                </Button>
              }
            />
          ) : filter === 'shaykh' ? (
            <EmptyState
              icon={<ShieldCheck className="h-10 w-10 text-accent" strokeWidth={1.8} />}
              title={t('chats.emptyShaykh', 'لا توجد استفسارات حلال بعد')}
              body={t(
                'chats.emptyShaykhHint',
                'صوّر مكونات أي منتج أو استشر مساعد الحلال في الأحكام الغذائية والشبهات.'
              )}
              action={
                <Button
                  variant="primary"
                  icon={<ShieldCheck className="h-4 w-4" />}
                  onClick={() => navigate('/halal')}
                  className="mt-2"
                >
                  {t('chats.ctaShaykh', 'فحص منتج غذائي')}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<MessagesSquare className="h-10 w-10 text-accent" strokeWidth={1.8} />}
              title={t('chats.empty', 'لا محادثات بعد')}
              body={t('chats.emptyHint', 'ابدأ من فحص الحلال أو الطبيب أو المحاسب.')}
              action={
                <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<ShieldCheck className="h-3.5 w-3.5" />}
                    onClick={() => navigate('/halal')}
                  >
                    {t('nav.halal', 'الحلال')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Activity className="h-3.5 w-3.5" />}
                    onClick={() => navigate('/doctor')}
                  >
                    {t('nav.doctor', 'الطبيب')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<CreditCard className="h-3.5 w-3.5" />}
                    onClick={() => navigate('/accountant')}
                  >
                    {t('nav.accountant', 'المحاسب')}
                  </Button>
                </div>
              }
            />
          )}
        </div>
      ) : (
        /* Chronologically Grouped Conversations List */
        <div className="space-y-6">
          {groupedChats.map((group) => (
            <div key={group.key} className="space-y-2.5">
              <h3 className="text-xs font-bold text-muted ps-1">
                {t(group.labelKey)}
              </h3>

              <ul className="space-y-2.5">
                {group.chats.map((chat) => (
                  <li key={chat.id}>
                    <div className="group surface-card p-3.5 hover:border-accent/40 hover:shadow-e1 transition-all">
                      <div className="flex items-center gap-3">
                        <Link to={`/chats/${chat.id}`} className="flex min-w-0 flex-1 items-start gap-3">
                          <PersonaAvatar kind={chat.kind} size="md" />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-display text-sm font-bold text-fg truncate">
                                <bdi dir="auto">{chat.title}</bdi>
                              </p>
                              <StatusBadge tone="neutral" className="text-[11px] shrink-0">
                                {t(`chats.kinds.${chat.kind}`)}
                              </StatusBadge>
                            </div>
                            <p className="line-clamp-1 text-xs text-muted leading-relaxed">
                              <bdi dir="auto">{chat.preview || '—'}</bdi>
                            </p>
                            <div className="flex items-center gap-1.5 pt-0.5 text-[11px] text-muted font-normal">
                              <Clock className="h-3 w-3" />
                              <span>{formatRelativeTime(chat.updatedAt, locale)}</span>
                            </div>
                          </div>
                        </Link>

                        <IconButton
                          label={t('common.delete', 'حذف')}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteTargetId(chat.id);
                          }}
                          className="text-muted hover:text-danger hover:bg-danger-soft/40 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </IconButton>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog for Chat Deletion */}
      <ConfirmDialog
        open={Boolean(deleteTargetId)}
        title={t('chats.deleteTitle', 'حذف المحادثة')}
        message={t('chats.deleteConfirm', 'هل أنت متأكد من حذف هذه المحادثة نهائياً؟')}
        confirmLabel={t('common.delete', 'حذف')}
        cancelLabel={t('common.cancel', 'إلغاء')}
        tone="danger"
        loading={isDeleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
