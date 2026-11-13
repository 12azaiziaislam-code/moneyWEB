/** Conversation list/detail for both roles (guests read & write IndexedDB). */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChatDetail, ChatKind, ChatMessage, ChatSummary } from '../../shared/types';
import { apiFetch } from '../lib/api';
import type { GuestChat, GuestMessage } from '../lib/guestStore';
import { useAuth } from '../state/AuthContext';

function toSummary(chat: GuestChat): ChatSummary {
  return {
    id: chat.id,
    kind: chat.kind,
    title: chat.title,
    preview: chat.preview,
    imageId: null,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  };
}

function toMessages(chat: GuestChat): ChatMessage[] {
  return chat.messages.map((message: GuestMessage) => ({
    id: message.id,
    chatId: chat.id,
    role: message.role,
    content: message.content,
    imageId: null,
    createdAt: message.createdAt,
  }));
}

export function useChatList(kind: 'all' | ChatKind, query: string) {
  const { role, guestData } = useAuth();
  const isGuest = role === 'guest';
  const [remote, setRemote] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(!isGuest);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (kind !== 'all') params.set('kind', kind);
      if (query.trim()) params.set('q', query.trim());
      const response = await apiFetch<{ chats: ChatSummary[] }>(`/api/chats?${params.toString()}`);
      setRemote(response.chats);
      setError(null);
    } catch {
      setError('network');
    } finally {
      setLoading(false);
    }
  }, [isGuest, kind, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), query ? 280 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  const chats = useMemo(() => {
    if (!isGuest) return remote;
    const all = (guestData?.chats ?? []).map(toSummary);
    const needle = query.trim().toLowerCase();
    return all
      .filter((chat) => (kind === 'all' ? true : chat.kind === kind))
      .filter((chat) => (needle ? `${chat.title} ${chat.preview}`.toLowerCase().includes(needle) : true))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [guestData?.chats, isGuest, kind, query, remote]);

  return { chats, loading, error, refresh: load, isGuest };
}

export function useChatDetail(id: string | undefined) {
  const { role, guestData } = useAuth();
  const isGuest = role === 'guest';
  const [remote, setRemote] = useState<ChatDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(id) && !isGuest);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || isGuest) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    apiFetch<{ chat: ChatDetail }>(`/api/chats/${id}`)
      .then((response) => {
        if (active) setRemote(response.chat);
      })
      .catch(() => {
        if (active) setError('not_found');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, isGuest]);

  const guestChat = useMemo<ChatDetail | null>(() => {
    if (!isGuest || !id) return null;
    const chat = guestData?.chats.find((entry) => entry.id === id);
    if (!chat) return null;
    return { ...toSummary(chat), messages: toMessages(chat) };
  }, [guestData?.chats, id, isGuest]);

  return { chat: isGuest ? guestChat : remote, loading, error, isGuest };
}

/** Local writes for guests; signed-in users are persisted by the worker. */
export function useChatMutations() {
  const { role, guestData, setGuestData } = useAuth();
  const isGuest = role === 'guest';

  const createChat = useCallback(
    async (input: {
      kind: ChatKind;
      title: string;
      seedText?: string;
      initialUserMessage?: string;
    }): Promise<ChatDetail | null> => {
      if (isGuest) {
        if (!guestData) return null;
        const now = new Date().toISOString();
        const past = new Date(Date.now() - 1000).toISOString();
        const messages: GuestMessage[] = [];
        if (input.initialUserMessage) {
          messages.push({
            id: `m-${Date.now()}-u`,
            role: 'user',
            content: input.initialUserMessage,
            createdAt: past,
          });
        }
        if (input.seedText) {
          messages.push({
            id: `m-${Date.now()}-a`,
            role: 'assistant',
            content: input.seedText,
            createdAt: now,
          });
        }
        const chat: GuestChat = {
          id: `g-${Date.now()}`,
          kind: input.kind,
          title: input.title.slice(0, 80),
          preview: (input.seedText ?? input.initialUserMessage ?? '').slice(0, 140),
          createdAt: now,
          updatedAt: now,
          messages,
        };
        await setGuestData({ ...guestData, chats: [chat, ...guestData.chats] });
        return { ...toSummary(chat), messages: toMessages(chat) };
      }
      const response = await apiFetch<{ chat: ChatDetail }>('/api/chats', {
        method: 'POST',
        body: {
          kind: input.kind,
          title: input.title,
          seedText: input.seedText,
          initialUserMessage: input.initialUserMessage,
        },
      });
      return response.chat;
    },
    [guestData, isGuest, setGuestData],
  );

  const appendMessages = useCallback(
    async (chatId: string, messages: Array<{ role: 'user' | 'assistant'; content: string }>) => {
      if (!isGuest || !guestData) return;
      const now = new Date().toISOString();
      const chats = guestData.chats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              preview: messages[messages.length - 1]?.content.slice(0, 140) ?? chat.preview,
              updatedAt: now,
              messages: [
                ...chat.messages,
                ...messages.map((message, index) => ({
                  id: `m-${Date.now()}-${index}`,
                  role: message.role,
                  content: message.content,
                  createdAt: now,
                })),
              ],
            }
          : chat,
      );
      await setGuestData({ ...guestData, chats });
    },
    [guestData, isGuest, setGuestData],
  );

  const deleteChat = useCallback(
    async (chatId: string) => {
      if (isGuest) {
        if (!guestData) return;
        await setGuestData({ ...guestData, chats: guestData.chats.filter((chat) => chat.id !== chatId) });
        return;
      }
      await apiFetch<void>(`/api/chats/${chatId}`, { method: 'DELETE' });
    },
    [guestData, isGuest, setGuestData],
  );

  return { createChat, appendMessages, deleteChat, isGuest };
}
