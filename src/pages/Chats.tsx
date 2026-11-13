/**
 * The Archive: Filter, Search, Consultation Index Cards, Deletion.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, ShieldCheck, Stethoscope, Wallet, X } from 'lucide-react';
import type { ChatKind } from '../../shared/types';
import { PageHeader } from '../components/AppShell';
import { ArchiveChar } from '../components/characters/ArchiveChar';
import { Button, IconButton } from '../components/ui/Button';
import { Chip, EmptyState, Skeleton } from '../components/ui/Feedback';
import { Input } from '../components/ui/Field';
import { Segmented } from '../components/ui/Controls';
import { useChatList, useChatMutations } from '../data/chats';
import { formatDateTime } from '../lib/format';
import { usePageTheme } from '../lib/theme';
import { staggerRise } from '../lib/motion';
import { useToast } from '../state/ToastContext';
import { useAuth } from '../state/AuthContext';
import { haptic, HAPTIC } from '../lib/haptics';
import type { Locale } from '../i18n';

export function ChatsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { show } = useToast();
  const { user, role, signIn } = useAuth();
  const { deleteChat } = useChatMutations();
  const [filter, setFilter] = useState<'all' | ChatKind>('all');
  const [query, setQuery] = useState('');
  const { chats, loading } = useChatList(filter, query);
  const listRef = useRef<HTMLUListElement>(null);
  usePageTheme('chats');

  const locale = (user?.locale ?? i18n.language ?? 'ru') as Locale;

  useEffect(() => {
    staggerRise(listRef.current, 'li');
  }, [chats.length]);

  const empty = useMemo(() => !loading && chats.length === 0, [chats.length, loading]);

  const remove = async (id: string) => {
    if (!window.confirm(t('chats.deleteConfirm'))) return;
    try {
      await deleteChat(id);
      haptic(HAPTIC.heavy);
      show(t('common2.deleted'), 'success');
    } catch {
      show(t('errors.generic'), 'danger');
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 pb-6">
      <PageHeader title={t('chats.title')} />

      {role === 'guest' ? (
        <div className="surface-card p-5 rounded-xl border border-[#B88E3E]/40 bg-[#B88E3E]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-start">
          <p className="text-xs sm:text-sm text-fg leading-relaxed">
            {t('guest.aiRequiresAuth')}
          </p>
          <Button size="sm" variant="gold" onClick={() => void signIn()} className="shrink-0 w-full sm:w-auto">
            {t('guest.signInPrompt')}
          </Button>
        </div>
      ) : null}

      <Input
        label={t('chats.search')}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        suffix={<Search className="h-4 w-4 text-muted" />}
      />

      <Segmented
        ariaLabel={t('chats.title')}
        value={filter}
        onChange={(value) => setFilter(value)}
        options={[
          { value: 'all', label: t('common.all') },
          { value: 'shaykh', label: t('chats.kinds.shaykh') },
          { value: 'doctor', label: t('chats.kinds.doctor') },
          { value: 'accountant', label: t('chats.kinds.accountant') },
        ]}
      />

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-[86px] w-full" />
          ))}
        </div>
      ) : empty ? (
        <div className="space-y-4 surface-card p-6 text-center">
          <EmptyState
            art={<ArchiveChar size={100} className="mx-auto" />}
            title={t('chats.empty')}
            body={t('chats.emptyHint')}
            action={
              <Button
                variant="secondary"
                icon={<ShieldCheck className="h-4 w-4" aria-hidden />}
                onClick={() => navigate('/')}
                className="mt-2"
              >
                {t('halal.title')}
              </Button>
            }
          />
        </div>
      ) : (
        <ul ref={listRef} className="space-y-2.5">
          {chats.map((chat) => {
            const channel =
              chat.kind === 'shaykh' ? 'var(--ch-sheikh)' : chat.kind === 'doctor' ? 'var(--ch-doctor)' : 'var(--ch-accountant)';
            return (
              <li key={chat.id} data-stagger>
                <div className="surface-card flex items-stretch gap-3 p-3.5 hover:border-accent/40 transition-colors">
                  <Link to={`/chats/${chat.id}`} className="flex min-w-0 flex-1 items-start gap-3">
                    <span
                      className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line"
                      style={{ background: 'var(--surface-2)', color: channel }}
                      aria-hidden="true"
                    >
                      {chat.kind === 'doctor' ? (
                        <Stethoscope className="h-5 w-5" strokeWidth={1.8} />
                      ) : chat.kind === 'accountant' ? (
                        <Wallet className="h-5 w-5" strokeWidth={1.8} />
                      ) : (
                        <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-fg">{chat.title}</span>
                        <Chip className="pointer-events-none !min-h-0 !px-2 !py-0.5 !text-[10px]">{t(`chats.kinds.${chat.kind}`)}</Chip>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-muted">{chat.preview || '—'}</span>
                      <span className="mt-1 block text-[10px] text-muted">{formatDateTime(chat.updatedAt, locale)}</span>
                    </span>
                  </Link>
                  <IconButton label={t('common.delete')} onClick={() => void remove(chat.id)} className="self-center">
                    <X className="h-4 w-4" aria-hidden />
                  </IconButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
