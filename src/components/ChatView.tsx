import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, Square } from 'lucide-react';
import type { ChatDetail, ChatKind, ChatMessage } from '../../shared/types';
import { ApiError, apiFetch, streamAiChat } from '../lib/api';
import { CacheKeys, idbGet } from '../lib/idb';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { useChatMutations } from '../data/chats';
import { RichText } from './RichText';
import { IconButton } from './ui/Button';
import { Textarea } from './ui/Field';
import { cn } from './ui';
import { haptic, HAPTIC } from '../lib/haptics';
import { Sheikh } from './characters/Sheikh';
import { DoctorChar } from './characters/DoctorChar';
import { AccountantChar } from './characters/AccountantChar';

export interface ChatViewProps {
  kind: ChatKind;
  chatId: string | null;
  initialMessages?: ChatMessage[];
  contextText?: string;
  disclaimer?: ReactNode;
}

export function ChatView({ kind, chatId, initialMessages, contextText, disclaimer }: ChatViewProps) {
  const { t, i18n } = useTranslation();
  const { role, user, guestData } = useAuth();
  const { show } = useToast();
  const { appendMessages } = useChatMutations();
  const isGuest = role === 'guest';

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages ?? []);
  const [text, setText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(chatId) && !initialMessages && !isGuest);

  const controllerRef = useRef<AbortController | null>(null);
  const chatRef = useRef<string | null>(chatId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current = chatId;
  }, [chatId]);

  useEffect(() => {
    if (!chatId || initialMessages || isGuest) {
      setLoading(false);
      return;
    }
    let active = true;
    apiFetch<{ chat: ChatDetail }>(`/api/chats/${chatId}`)
      .then((response) => active && setMessages(response.chat.messages))
      .catch(() => active && setError(t('errors.network')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [chatId, initialMessages, isGuest, t]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, draft]);

  const describe = (cause: unknown): string => {
    if (cause instanceof ApiError && i18n.exists(`errors.${cause.code}`)) return t(`errors.${cause.code}`);
    return t('errors.generic');
  };

  const guestHistory = () =>
    (guestData?.chats.find((chat) => chat.id === chatRef.current)?.messages ?? [])
      .slice(-12)
      .map((message) => ({ role: message.role, content: message.content.slice(0, 2000) }));

  const runStream = async (prompt: string) => {
    setStreaming(true);
    setError(null);
    setDraft('');
    const controller = new AbortController();
    controllerRef.current = controller;
    let accumulated = '';

    try {
      const ownKey =
        user?.aiMode === 'own'
          ? await idbGet<{ baseUrl: string; apiKey: string; model: string }>(CacheKeys.ownKey)
          : null;
      await streamAiChat(
        {
          kind,
          chatId: isGuest ? undefined : chatRef.current ?? undefined,
          text: prompt || undefined,
          context: contextText,
          ownKey: ownKey ?? undefined,
          guest: isGuest
            ? {
                locale: user?.locale ?? 'ar',
                madhhab: user?.madhhab ?? 'none',
                health: guestData?.settings.health,
                finance: guestData?.settings.finance,
                planSummary: contextText?.slice(0, 1900),
                history: guestHistory(),
              }
            : undefined,
        },
        {
          onDelta: (delta) => {
            accumulated += delta;
            setDraft(accumulated);
          },
          onDone: async ({ messageId }) => {
            const finalText = accumulated;
            setMessages((current) => [
              ...current,
              {
                id: messageId ?? `assistant-${Date.now()}`,
                chatId: chatRef.current ?? '',
                role: 'assistant',
                content: finalText,
                imageId: null,
                createdAt: new Date().toISOString(),
              },
            ]);
            setDraft('');
            if (isGuest && chatRef.current) {
              await appendMessages(chatRef.current, [
                { role: 'user', content: prompt },
                { role: 'assistant', content: finalText },
              ]);
            }
          },
          onError: (streamError) => {
            setError(describe(streamError));
            haptic(HAPTIC.warning);
          },
        },
        controller.signal,
      );
    } catch (cause) {
      if ((cause as Error)?.message !== 'aborted') setError(describe(cause));
    } finally {
      setStreaming(false);
      controllerRef.current = null;
      setDraft('');
    }
  };

  const send = async () => {
    const prompt = text.trim();
    if (!prompt || streaming) return;
    setMessages((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        chatId: chatRef.current ?? '',
        role: 'user',
        content: prompt,
        imageId: null,
        createdAt: new Date().toISOString(),
      },
    ]);
    setText('');
    haptic(HAPTIC.tap);
    await runStream(prompt);
  };

  const stop = () => {
    controllerRef.current?.abort();
    setStreaming(false);
    show(t('chats.stopped'), 'warning');
  };

  const avatar =
    kind === 'doctor' ? <DoctorChar size={32} /> : kind === 'accountant' ? <AccountantChar size={32} mood="calm" /> : <Sheikh size={32} />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-2.5 overflow-y-auto px-0.5 py-2">
        {loading ? (
          <div className="space-y-2">
            <div className="skeleton h-16 w-3/4 rounded-md bg-surface2" />
            <div className="skeleton ms-auto h-16 w-2/3 rounded-md bg-surface2" />
          </div>
        ) : null}

        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <div key={message.id} className={cn('flex items-end gap-1.5', isUser ? 'justify-end' : 'justify-start')}>
              {!isUser ? <div className="mb-0.5 shrink-0">{avatar}</div> : null}
              <div
                className={cn(
                  'max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed shadow-e1',
                  isUser ? 'rounded-ee-md bg-accent text-accent-fg' : 'rounded-es-md border border-line bg-surface text-fg',
                )}
              >
                {isUser ? <p className="whitespace-pre-wrap">{message.content}</p> : <RichText text={message.content} />}
              </div>
            </div>
          );
        })}

        {draft ? (
          <div className="flex items-end gap-1.5">
            <div className="mb-0.5 shrink-0">{avatar}</div>
            <div className="max-w-[86%] rounded-2xl rounded-es-md border border-line bg-surface px-3.5 py-2.5 text-[14px]">
              <RichText text={draft} />
              <span className="ms-0.5 inline-block h-3.5 w-1 animate-pulse bg-accent" aria-hidden="true" />
            </div>
          </div>
        ) : null}

        {streaming && !draft ? (
          <div className="flex items-center gap-1.5 px-2 text-[12px] text-muted">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:.3s]" />
            {t('chats.thinking')}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md bg-dangerSoft p-3 text-[13px] text-danger">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void runStream(messages.filter((m) => m.role === 'user').slice(-1)[0]?.content ?? '')}
              className="mt-1 min-h-[32px] text-[12px] font-bold underline"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {disclaimer ? <div className="px-0.5 pb-1">{disclaimer}</div> : null}

      <form
        className="sticky bottom-0 space-y-2 bg-bg/95 pb-1 pt-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <div className="flex items-end gap-1.5">
          <Textarea
            label={t('chats.typeMessage')}
            value={text}
            rows={1}
            maxLength={4000}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void send();
              }
            }}
            className="max-h-28 min-h-[46px] resize-none py-3"
          />
          {streaming ? (
            <IconButton label={t('common.stop')} onClick={stop} className="bg-danger text-white">
              <Square className="h-4 w-4" aria-hidden />
            </IconButton>
          ) : (
            <IconButton
              label={t('common.send')}
              onClick={() => void send()}
              className="bg-accent text-accent-fg disabled:opacity-40"
              disabled={!text.trim()}
            >
              <ArrowUp className="h-5 w-5" aria-hidden />
            </IconButton>
          )}
        </div>
      </form>
    </div>
  );
}
