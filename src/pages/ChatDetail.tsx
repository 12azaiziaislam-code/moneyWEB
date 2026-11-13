/**
 * One Consultation Conversation Screen.
 */

import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { ChatView } from '../components/ChatView';
import { Button, IconButton } from '../components/ui/Button';
import { Disclaimer, Skeleton } from '../components/ui/Feedback';
import { PersonaAvatar } from '../components/characters/Personas';
import { useChatDetail, useChatMutations } from '../data/chats';
import { usePageTheme } from '../lib/theme';
import { useToast } from '../state/ToastContext';

export function ChatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { show } = useToast();
  const { chat, loading } = useChatDetail(id);
  const { deleteChat } = useChatMutations();

  usePageTheme(chat?.kind === 'doctor' ? 'doctor' : chat?.kind === 'accountant' ? 'accountant' : 'chats');

  const remove = async () => {
    if (!id || !window.confirm(t('chats.deleteConfirm'))) return;
    try {
      await deleteChat(id);
      navigate('/chats', { replace: true });
    } catch {
      show(t('errors.generic'), 'danger');
    }
  };

  const disclaimer =
    chat?.kind === 'doctor' ? (
      <Disclaimer>{t('doctor.disclaimer')}</Disclaimer>
    ) : chat?.kind === 'accountant' ? (
      <Disclaimer>{t('accountant.disclaimer')}</Disclaimer>
    ) : (
      <Disclaimer>{t('halal.disclaimer')}</Disclaimer>
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col h-full">
      <header className="flex items-center gap-2.5 py-2.5 border-b border-line mb-2">
        <IconButton label={t('common.back')} onClick={() => navigate('/chats')}>
          <ChevronLeft className="flip-rtl h-5 w-5" aria-hidden />
        </IconButton>
        {chat ? <PersonaAvatar kind={chat.kind} size="sm" /> : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm sm:text-base font-bold text-fg">{chat?.title ?? t('chats.title')}</h1>
          {chat ? <p className="text-[11px] text-muted">{t(`chats.kinds.${chat.kind}`)}</p> : null}
        </div>
        <IconButton label={t('common.delete')} onClick={() => void remove()}>
          <Trash2 className="h-4 w-4 text-muted hover:text-danger" aria-hidden />
        </IconButton>
      </header>

      {loading ? (
        <div className="space-y-3 py-4">
          <Skeleton className="h-16 w-3/4" />
          <Skeleton className="h-16 w-2/3 ms-auto" />
        </div>
      ) : chat ? (
        <ChatView
          kind={chat.kind}
          chatId={chat.id}
          initialMessages={chat.messages}
          disclaimer={disclaimer}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 surface-card p-8 text-center my-6">
          <p className="text-sm text-muted">{t('errors.not_found')}</p>
          <Button variant="secondary" onClick={() => navigate('/chats')}>
            {t('common.back')}
          </Button>
        </div>
      )}
    </div>
  );
}
