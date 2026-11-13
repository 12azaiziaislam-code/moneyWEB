/**
 * Secret redaction helpers. Kept dependency-free so the AI gateway (and its
 * unit tests) never pull in Cloudflare-only types.
 */

/** Redacts secrets and bearer tokens from anything that might be logged/shown. */
export function maskSecret(input: unknown, secrets: string[] = []): string {
  let text: string;
  if (typeof input === 'string') {
    text = input;
  } else {
    try {
      text = JSON.stringify(input);
    } catch {
      text = String(input);
    }
  }
  let out = text ?? '';
  for (const secret of secrets) {
    if (secret && secret.length >= 6) out = out.split(secret).join('***');
  }
  out = out.replace(/Bearer\s+[A-Za-z0-9._-]{8,}/gi, 'Bearer ***');
  out = out.replace(/\b(sk|gwk|gsk|AIza)[-_A-Za-z0-9]{6,}/g, '***');
  return out;
}
