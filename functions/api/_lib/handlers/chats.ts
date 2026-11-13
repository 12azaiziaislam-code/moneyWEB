/** /api/chats — list, create (with optional seed message), read, rename, delete. */

import type { ChatDetail, ChatMessage, ChatSummary, ChatKind } from '../../../../shared/types';
import { HttpError, jsonResponse, noContent, nowISO, randomId } from '../http';
import type { RequestContext } from '../router';
import { chatCreateSchema, idSchema } from '../schemas';
import { z } from 'zod';

interface ChatRow {
  id: string;
  kind: string;
  title: string;
  preview: string;
  image_id: string | null;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  image_id: string | null;
  meta_json: string | null;
  created_at: string;
}

function mapChat(row: ChatRow): ChatSummary {
  return {
    id: row.id,
    kind: row.kind as ChatKind,
    title: row.title,
    preview: row.preview ?? '',
    imageId: row.image_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: MessageRow): ChatMessage {
  let meta: Record<string, unknown> | null = null;
  if (row.meta_json) {
    try {
      meta = JSON.parse(row.meta_json) as Record<string, unknown>;
    } catch {
      meta = null;
    }
  }
  return {
    id: row.id,
    chatId: row.chat_id,
    role: row.role as ChatMessage['role'],
    content: row.content,
    imageId: row.image_id ?? null,
    createdAt: row.created_at,
    meta,
  };
}

export async function listChats(ctx: RequestContext): Promise<Response> {
  const kind = ctx.url.searchParams.get('kind') ?? '';
  const search = (ctx.url.searchParams.get('q') ?? '').trim().slice(0, 60);

  const clauses = ['uid = ?'];
  const values: unknown[] = [ctx.auth.uid];
  if (kind && ['shaykh', 'doctor', 'accountant'].includes(kind)) {
    clauses.push('kind = ?');
    values.push(kind);
  }
  if (search) {
    clauses.push('(title LIKE ? OR preview LIKE ?)');
    values.push(`%${search}%`, `%${search}%`);
  }

  const { results } = await ctx.env.DB.prepare(
    `SELECT id, kind, title, preview, image_id, created_at, updated_at FROM chats
     WHERE ${clauses.join(' AND ')} ORDER BY updated_at DESC LIMIT 100`,
  )
    .bind(...values)
    .all<ChatRow>();

  return jsonResponse({ chats: (results ?? []).map(mapChat) }, ctx.request, ctx.config);
}

export async function createChat(ctx: RequestContext): Promise<Response> {
  const input = await ctx.parseBody(chatCreateSchema);
  const id = randomId('chat');
  const ts = nowISO();
  const title = (input.title?.trim() || 'Chat').slice(0, 80);

  await ctx.env.DB.prepare(
    `INSERT INTO chats (id, uid, kind, title, preview, image_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, '', ?, ?, ?)`,
  )
    .bind(id, ctx.auth.uid, input.kind, title, input.imageId ?? null, ts, ts)
    .run();

  let userMessage: ChatMessage | null = null;
  if (input.initialUserMessage && input.initialUserMessage.trim()) {
    const userMsgId = randomId('msg');
    const userTs = new Date(Date.now() - 1000).toISOString();
    await ctx.env.DB.prepare(
      `INSERT INTO messages (id, chat_id, uid, role, content, image_id, meta_json, created_at)
       VALUES (?, ?, ?, 'user', ?, NULL, NULL, ?)`,
    )
      .bind(userMsgId, id, ctx.auth.uid, input.initialUserMessage.slice(0, 4000), userTs)
      .run();
    userMessage = {
      id: userMsgId,
      chatId: id,
      role: 'user',
      content: input.initialUserMessage.slice(0, 4000),
      imageId: null,
      createdAt: userTs,
    };
  }

  let seedMessage: ChatMessage | null = null;
  if (input.seedText && input.seedText.trim()) {
    const messageId = randomId('msg');
    await ctx.env.DB.prepare(
      `INSERT INTO messages (id, chat_id, uid, role, content, image_id, meta_json, created_at)
       VALUES (?, ?, ?, 'assistant', ?, NULL, ?, ?)`,
    )
      .bind(messageId, id, ctx.auth.uid, input.seedText.slice(0, 4000), JSON.stringify({ seed: true }), ts)
      .run();
    seedMessage = {
      id: messageId,
      chatId: id,
      role: 'assistant',
      content: input.seedText.slice(0, 4000),
      imageId: null,
      createdAt: ts,
      meta: { seed: true },
    };
    await ctx.env.DB.prepare('UPDATE chats SET preview = ? WHERE id = ? AND uid = ?')
      .bind(input.seedText.slice(0, 140), id, ctx.auth.uid)
      .run();
  }

  const messages: ChatMessage[] = [];
  if (userMessage) messages.push(userMessage);
  if (seedMessage) messages.push(seedMessage);

  const preview = seedMessage
    ? seedMessage.content.slice(0, 140)
    : userMessage
      ? userMessage.content.slice(0, 140)
      : '';

  const chat: ChatDetail = {
    id,
    kind: input.kind,
    title,
    preview,
    imageId: input.imageId ?? null,
    createdAt: ts,
    updatedAt: ts,
    messages,
  };
  return jsonResponse({ chat }, ctx.request, ctx.config, 201);
}

export async function getChat(ctx: RequestContext): Promise<Response> {
  const id = idSchema.parse(ctx.params.id);
  const chat = await ctx.env.DB.prepare(
    'SELECT id, kind, title, preview, image_id, created_at, updated_at FROM chats WHERE id = ? AND uid = ?',
  )
    .bind(id, ctx.auth.uid)
    .first<ChatRow>();
  if (!chat) throw new HttpError(404, 'not_found', 'Conversation not found.');

  const { results } = await ctx.env.DB.prepare(
    `SELECT id, chat_id, role, content, image_id, meta_json, created_at FROM messages
     WHERE chat_id = ? AND uid = ? ORDER BY created_at ASC LIMIT 200`,
  )
    .bind(id, ctx.auth.uid)
    .all<MessageRow>();

  const detail: ChatDetail = { ...mapChat(chat), messages: (results ?? []).map(mapMessage) };
  return jsonResponse({ chat: detail }, ctx.request, ctx.config);
}

export async function patchChat(ctx: RequestContext): Promise<Response> {
  const id = idSchema.parse(ctx.params.id);
  const { title } = await ctx.parseBody(z.object({ title: z.string().trim().min(1).max(80) }).strict());
  const result = await ctx.env.DB.prepare('UPDATE chats SET title = ?, updated_at = ? WHERE id = ? AND uid = ?')
    .bind(title, nowISO(), id, ctx.auth.uid)
    .run();
  if (!result.meta.changes) throw new HttpError(404, 'not_found', 'Conversation not found.');
  return jsonResponse({ ok: true, title }, ctx.request, ctx.config);
}

export async function deleteChat(ctx: RequestContext): Promise<Response> {
  const id = idSchema.parse(ctx.params.id);
  const existing = await ctx.env.DB.prepare('SELECT id FROM chats WHERE id = ? AND uid = ?')
    .bind(id, ctx.auth.uid)
    .first<{ id: string }>();
  if (!existing) throw new HttpError(404, 'not_found', 'Conversation not found.');

  await ctx.env.DB.batch([
    ctx.env.DB.prepare('DELETE FROM messages WHERE chat_id = ? AND uid = ?').bind(id, ctx.auth.uid),
    ctx.env.DB.prepare('DELETE FROM chats WHERE id = ? AND uid = ?').bind(id, ctx.auth.uid),
  ]);
  return noContent(ctx.request, ctx.config);
}
