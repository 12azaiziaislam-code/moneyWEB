/**
 * Structured output: strict JSON extraction + Zod validation + ONE repair pass.
 * If the second attempt still fails we throw AiParseError and the handler shows
 * a friendly "couldn't read that, try a clearer photo" message.
 */

import { z, type ZodTypeAny } from 'zod';
import { gatewayComplete, type GatewayMessage, type GatewayOptions } from './gateway';

export class AiParseError extends Error {
  details?: string;
  constructor(message: string, details?: string) {
    super(message);
    this.name = 'AiParseError';
    this.details = details;
  }
}

/** Finds and parses the first JSON object in a model answer. */
export function extractJsonBlock(raw: string): unknown | null {
  if (!raw) return null;
  const candidates: string[] = [];
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  candidates.push(raw.trim());
  const start = raw.indexOf('{');
  if (start >= 0) {
    const balanced = sliceBalanced(raw, start);
    if (balanced) candidates.push(balanced);
  }
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      try {
        // Some models emit trailing commas — clean them before giving up.
        return JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1'));
      } catch {
        /* next candidate */
      }
    }
  }
  return null;
}

export function sliceBalanced(text: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{' || char === '[') depth += 1;
    else if (char === '}' || char === ']') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export function tzOffsetMinutes(timeZone: string, atUTC: number): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(new Date(atUTC));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
    return Math.round((asUTC - atUTC) / 60_000);
  } catch {
    return 180; // Europe/Moscow fallback (UTC+3)
  }
}

/** Converts a wall-clock time in `timeZone` to a real UTC ISO timestamp. */
export function zonedWallClockToISO(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone = 'Europe/Moscow',
): string {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offset = tzOffsetMinutes(timeZone, guess);
  return new Date(guess - offset * 60_000).toISOString();
}

const ISO_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/;
const RU_DATE_TIME = /^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:[ ,]+(\d{1,2}):(\d{2}))?/;
const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Best-effort parsing of the messy dates models return from receipts. */
export function parseLooseDateTime(
  value: string | undefined | null,
  fallbackISO: string,
  timeZone = 'Europe/Moscow',
): string {
  if (!value) return fallbackISO;
  const clean = String(value).trim();
  if (!clean) return fallbackISO;

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(clean)) {
    const parsed = new Date(clean);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  const iso = ISO_DATE_TIME.exec(clean);
  if (iso) return zonedWallClockToISO(+iso[1], +iso[2], +iso[3], +iso[4], +iso[5], timeZone);

  const ru = RU_DATE_TIME.exec(clean);
  if (ru) {
    return zonedWallClockToISO(+ru[3], +ru[2], +ru[1], ru[4] ? +ru[4] : 12, ru[5] ? +ru[5] : 0, timeZone);
  }

  const dateOnly = ISO_DATE_ONLY.exec(clean);
  if (dateOnly) return zonedWallClockToISO(+dateOnly[1], +dateOnly[2], +dateOnly[3], 12, 0, timeZone);

  return fallbackISO;
}


export interface AskJsonParams<S extends ZodTypeAny> {
  options: GatewayOptions;
  model: string;
  messages: GatewayMessage[];
  schema: S;
  /** Compact description of the expected JSON shape, given to the repair pass. */
  shapeHint: string;
  maxTokens?: number;
  temperature?: number;
  onPhase?: (phase: 'first' | 'repair') => void;
}

/**
 * Asks the model for JSON, validates it, and repairs once.
 * `stream: true` is always used (see gateway) — no request ever looks frozen.
 */
export async function askJson<S extends ZodTypeAny>(
  params: AskJsonParams<S>,
): Promise<{ data: z.infer<S>; model: string }> {
  const shapeSystem: GatewayMessage = {
    role: 'system',
    content:
      'OUTPUT FORMAT: return exactly ONE JSON object and nothing else. No markdown fences, no comments, ' +
      'no prose before or after. All numbers must be plain numbers (never strings with spaces or symbols). ' +
      `Expected shape:\n${params.shapeHint}`,
  };

  params.onPhase?.('first');
  const first = await gatewayComplete(params.options, {
    model: params.model,
    messages: [...params.messages, shapeSystem],
    stream: true,
    max_tokens: Math.max(1024, params.maxTokens ?? 2048),
    temperature: params.temperature ?? 0.2,
  });

  const parsedFirst = extractJsonBlock(first.text);
  if (parsedFirst !== null) {
    const result = params.schema.safeParse(parsedFirst);
    if (result.success) return { data: result.data, model: first.model };
    return repair(params, first.text, formatZodError(result.error.issues), first.model);
  }

  return repair(params, first.text, 'Output was not valid JSON.', first.model);
}

export function formatZodError(issues: { path: (string | number)[]; message: string }[]): string {
  return issues
    .slice(0, 8)
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
}

async function repair<S extends ZodTypeAny>(
  params: AskJsonParams<S>,
  invalidOutput: string,
  problem: string,
  model: string,
): Promise<{ data: z.infer<S>; model: string }> {
  params.onPhase?.('repair');
  const repaired = await gatewayComplete(params.options, {
    model,
    messages: [
      {
        role: 'system',
        content:
          'You fix invalid JSON. Return ONLY the corrected JSON object that satisfies the requested shape. ' +
          'Never add explanations. Never invent new facts — keep the original meaning.',
      },
      {
        role: 'user',
        content:
          `Problem: ${problem}\n\nExpected shape:\n${params.shapeHint}\n\n` +
          `Invalid output to fix:\n${invalidOutput.slice(0, 6000)}`,
      },
    ],
    stream: true,
    max_tokens: Math.max(1024, params.maxTokens ?? 2048),
    temperature: 0,
  });

  const parsed = extractJsonBlock(repaired.text);
  if (parsed !== null) {
    const result = params.schema.safeParse(parsed);
    if (result.success) return { data: result.data, model: repaired.model };
    throw new AiParseError('AI returned an invalid structure after repair.', formatZodError(result.error.issues));
  }
  throw new AiParseError('AI did not return parseable JSON after repair.', problem);
}
