/** The archive: filter, search, index cards, swipe-free delete. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Sparkles, X } from 'lucide-react';
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
import { haptic, HAPTIC } from '../lib/haptics';
import { cn } from '../components/ui';

export function ChatsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { show } = useToast();
  const { deleteChat } = useChatMutations();
  const [filter, setFilter] = useState<'all' | ChatKind>('all');
  const [query, setQuery] = useState('');
  const { chats, loading, error } = useChatList(filter, query);
  const listRef = useRef<HTMLUListElement>(null);
  usePageTheme('chats');

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
    <div className="flex flex-1 flex-col gap-3 pb-4">
      <PageHeader title={t('chats.title')} />

      <Input
        label={t('chats.search')}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
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
        <div className="space-y-3">
          <EmptyState
            art={<ArchiveChar size={150} className="mx-auto" />}
            title={t('chats.empty')}
            body={t('chats.emptyHint')}
            action={
              <Button variant="secondary" icon={<Sparkles className="h-4 w-4" aria-hidden />} onClick={() => navigate('/')}>
                {t('halal.title')}
              </Button>
            }
          />
        </div>
      ) : (
        <ul ref={listRef} className="space-y-2">
          {chats.map((chat) => {
            const channel =
              chat.kind === 'shaykh' ? 'var(--ch-sheikh)' : chat.kind === 'doctor' ? 'var(--ch-doctor)' : 'var(--ch-accountant)';
            return (
              <li key={chat.id} data-stagger>
                <div className="flex items-stretch gap-2 rounded-lg border border-line bg-surface p-3 shadow-e1">
                  <Link to={`/chats/${chat.id}`} className="flex min-w-0 flex-1 items-start gap-3">
                    <span
                      className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[15px] font-black"
                      style={{ background: 'var(--surface-2)', color: channel }}
                      aria-hidden="true"
                    >
                      {chat.kind === 'doctor' ? '⚕' : chat.kind === 'accountant' ? '₽' : '☾'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-bold">{chat.title}</span>
                        <Chip className="pointer-events-none !min-h-0 !px-2 !py-0.5 !text-[10px]">{t(`chats.kinds.${chat.kind}`)}</Chip>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-muted">{chat.preview || '—'}</span>
                      <span className="mt-1 block text-[10px] text-muted">{formatDateTime(chat.updatedAt, 'ru')}</span>
                    </span>
                  </Link>
                  <IconButton label={t('common.delete')} onClick={() => void remove(chat.id)}>
                    <X className="h-4 w-4" aria-hidden />
                  </IconButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {error ? <p className={cn('text-center text-[12px] text-danger')}>{t('errors.network')}</p> : null}
      <p className="mt-auto text-center text-[10px] text-muted">
        <Search className="me-1 inline h-3 w-3" aria-hidden />
        {t('chats.search')}
      </p>
    </div>
  );
}
