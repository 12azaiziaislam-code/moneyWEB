/** /api/uploads + /api/assets/:id — compressed images, always uid-scoped. */

import { HttpError, buildHeaders, jsonResponse } from '../http';
import type { RequestContext } from '../router';
import { uploadSchema } from '../schemas';
import { assetBytes, loadAsset, saveAsset } from '../storage';

export async function upload(ctx: RequestContext): Promise<Response> {
  const input = await ctx.parseBody(uploadSchema);
  const { id, hash } = await saveAsset(ctx.env, ctx.config, ctx.auth.uid, input.dataUrl, input.hash);
  return jsonResponse({ id, hash, url: `/api/assets/${id}` }, ctx.request, ctx.config, 201);
}

export async function getAsset(ctx: RequestContext): Promise<Response> {
  const row = await loadAsset(ctx.env, ctx.auth.uid, ctx.params.id);
  if (!row) throw new HttpError(404, 'not_found', 'Image not found.');
  const bytes = await assetBytes(ctx.env, row);
  if (!bytes) throw new HttpError(404, 'not_found', 'Image not found.');

  const headers = buildHeaders(ctx.request, ctx.config, {
    'Content-Type': row.mime,
    'Cache-Control': 'private, max-age=31536000, immutable',
    ETag: `"${row.hash}"`,
  });
  const body = bytes.buffer instanceof ArrayBuffer ? bytes.buffer : new Uint8Array(bytes).buffer;
  return new Response(body, { status: 200, headers });
}
