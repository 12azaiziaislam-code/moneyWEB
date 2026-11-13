/**
 * Baraka v2 — Consultations & Chats Archive
 * Unified category tabs matching navigation, real-time query filtering,
 * human-designed empty states (no server rack art), and fast management.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  ShieldCheck,
  Trash2,
  MessagesSquare,
  Clock,
} from 'lucide-react';
import type { ChatKind } from '../../shared/types';
import { PageHeader } from '../components/AppShell';
import { Button, IconButton } from '../components/ui/Button';
import { Badge, EmptyState, Skeleton } from '../components/ui/Feedback';
import { Input } from '../components/ui/Field';
import { Segmented } from '../components/ui/Controls';
import { PersonaAvatar } from '../components/characters/Personas';
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
  const { user } = useAuth();
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

  const remove = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    <div className="flex flex-1 flex-col gap-4 pb-8">
      <PageHeader title={t('chats.title')} />

      {/* Search Input */}
      <Input
        label={t('chats.search')}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        suffix={<Search className="h-4 w-4 text-muted" />}
      />

      {/* Filter Tabs Matching Bottom Navigation Items */}
      <Segmented
        ariaLabel={t('chats.title')}
        value={filter}
        onChange={(value) => setFilter(value)}
        options={[
          { value: 'all', label: t('common.all') },
          { value: 'shaykh', label: t('nav.halal') },
          { value: 'doctor', label: t('nav.doctor') },
          { value: 'accountant', label: t('nav.accountant') },
        ]}
      />

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : empty ? (
        /* Empty State with Line-Art Icon */
        <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-e1">
          <EmptyState
            icon={<MessagesSquare className="h-12 w-12 text-accent" strokeWidth={1.5} />}
            title={t('chats.empty')}
            body={t('chats.emptyHint')}
            action={
              <Button
                variant="primary"
                icon={<ShieldCheck className="h-4 w-4" />}
                onClick={() => navigate('/')}
                className="mt-2"
              >
                {t('home.cta')}
              </Button>
            }
          />
        </div>
      ) : (
        /* Conversations List */
        <ul ref={listRef} className="space-y-2.5">
          {chats.map((chat) => {
            return (
              <li key={chat.id} data-stagger>
                <div className="group rounded-xl border border-line bg-surface p-3.5 hover:border-accent/40 hover:shadow-e1 transition-all">
                  <div className="flex items-center gap-3">
                    <Link to={`/chats/${chat.id}`} className="flex min-w-0 flex-1 items-start gap-3">
                      <PersonaAvatar kind={chat.kind} size="md" />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-display text-sm font-bold text-fg truncate">{chat.title}</p>
                          <Badge tone="neutral" className="shrink-0 text-[10px]">
                            {t(`chats.kinds.${chat.kind}`)}
                          </Badge>
                        </div>
                        <p className="line-clamp-1 text-xs text-muted leading-relaxed">
                          {chat.preview || '—'}
                        </p>
                        <div className="flex items-center gap-1.5 pt-0.5 text-[11px] text-muted-soft">
                          <Clock className="h-3 w-3" />
                          <span>{formatDateTime(chat.updatedAt, locale)}</span>
                        </div>
                      </div>
                    </Link>
                    <IconButton
                      label={t('common.delete')}
                      onClick={(e) => void remove(chat.id, e)}
                      className="text-muted hover:text-danger hover:bg-danger-soft/40"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </IconButton>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
