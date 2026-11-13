/**
 * Image storage: compressed thumbnails only. R2 when available (USE_R2="true"),
 * otherwise a BLOB in D1 — both work on the free plan.
 */

import type { AppConfig, Env } from './env';
import { HttpError, randomId } from './http';

export interface AssetRow {
  id: string;
  uid: string;
  mime: string;
  size: number;
  data: ArrayBuffer | null;
  r2_key: string | null;
  hash: string;
  created_at: string;
}

const MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'image/heif': 'image/heic',
};

export function normalizeMime(mime: string): string | null {
  const clean = (mime || '').toLowerCase().split(';')[0].trim();
  const normalized = MIME_ALIASES[clean] ?? clean;
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  return allowed.includes(normalized) ? normalized : null;
}

/** Magic-byte check so a renamed .exe can never be stored as a "photo". */
export function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp';
  const brand = String.fromCharCode(...bytes.slice(4, 8));
  if (brand === 'ftyp') {
    const sub = String.fromCharCode(...bytes.slice(8, 12));
    if (['heic', 'heix', 'hevc', 'mif1', 'msf1', 'heif'].includes(sub)) return 'image/heic';
  }
  return null;
}

export function decodeDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } {
  const match = /^data:(image\/[a-z+.-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl.trim());
  if (!match) throw new HttpError(400, 'bad_request', 'Unsupported image format.');
  const mime = normalizeMime(match[1]);
  if (!mime) throw new HttpError(400, 'bad_request', 'Unsupported image type.');
  let binary: string;
  try {
    binary = atob(match[2].replace(/\s/g, ''));
  } catch {
    throw new HttpError(400, 'bad_request', 'Corrupted image data.');
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { mime, bytes };
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function saveAsset(
  env: Env,
  config: AppConfig,
  uid: string,
  dataUrl: string,
  hashHint?: string,
): Promise<{ id: string; hash: string }> {
  const { mime, bytes } = decodeDataUrl(dataUrl);
  if (bytes.length > config.maxImageBytes) {
    throw new HttpError(413, 'payload_too_large', 'Image is too large. Please retake it.');
  }
  const sniffed = sniffImageMime(bytes);
  if (sniffed && sniffed !== mime) {
    throw new HttpError(400, 'bad_request', 'Image content does not match its type.');
  }

  const id = randomId('img');
  const hash = hashHint && hashHint.length >= 8 ? hashHint.slice(0, 128) : await sha256Hex(bytes);
  const useR2 = config.useR2 && env.BUCKET;
  const r2Key = useR2 ? `${uid}/${id}` : null;

  if (useR2 && env.BUCKET) {
    await env.BUCKET.put(r2Key as string, bytes, {
      httpMetadata: { contentType: mime, cacheControl: 'private, max-age=31536000, immutable' },
      customMetadata: { uid },
    });
  }

  await env.DB.prepare(
    `INSERT INTO assets (id, uid, mime, size, data, r2_key, hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, uid, mime, bytes.length, useR2 ? null : bytes, r2Key, hash, new Date().toISOString())
    .run();

  return { id, hash };
}

export async function loadAsset(env: Env, uid: string, id: string): Promise<AssetRow | null> {
  const row = await env.DB.prepare('SELECT * FROM assets WHERE id = ? AND uid = ?').bind(id, uid).first<AssetRow>();
  return row ?? null;
}

export async function assetBytes(env: Env, row: AssetRow): Promise<Uint8Array | null> {
  if (row.r2_key && env.BUCKET) {
    const object = await env.BUCKET.get(row.r2_key);
    if (!object) return null;
    return new Uint8Array(await object.arrayBuffer());
  }
  if (!row.data) return null;
  return row.data instanceof ArrayBuffer ? new Uint8Array(row.data) : new Uint8Array(row.data as unknown as number[]);
}

/** Data URL ready to be sent to the vision model as an image_url part. */
export async function assetToDataUrl(env: Env, uid: string, id: string): Promise<{ dataUrl: string; mime: string }> {
  const row = await loadAsset(env, uid, id);
  if (!row) throw new HttpError(404, 'not_found', 'Image not found.');
  const bytes = await assetBytes(env, row);
  if (!bytes) throw new HttpError(404, 'not_found', 'Image not found.');
  return { dataUrl: `data:${row.mime};base64,${toBase64(bytes)}`, mime: row.mime };
}

/** Removes R2 objects before the D1 rows disappear. */
export async function purgeUserR2(env: Env, uid: string): Promise<void> {
  if (!env.BUCKET) return;
  try {
    const list = await env.BUCKET.list({ prefix: `${uid}/`, limit: 1000 });
    for (const object of list.objects) {
      await env.BUCKET.delete(object.key);
    }
  } catch {
    /* best effort */
  }
}
