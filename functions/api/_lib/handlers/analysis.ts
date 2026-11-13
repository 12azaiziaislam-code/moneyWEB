/** Structured analysis: halal scan, doctor photo, receipt, balance. */

import { MODELS, type GatewayOptions } from '../ai/gateway';
import {
  balanceOutputSchema,
  classificationOutputSchema,
  doctorOutputSchema,
  halalOutputSchema,
  receiptOutputSchema,
} from '../ai/schemas';
import {
  BALANCE_SHAPE,
  DOCTOR_SHAPE,
  HALAL_SHAPE,
  RECEIPT_SHAPE,
  balanceMessages,
  classifyMessages,
  doctorAnalyzeMessages,
  halalScanMessages,
  receiptMessages,
} from '../ai/prompts';
import { askJson, parseLooseDateTime } from '../ai/structured';
import { HttpError, jsonResponse, nowISO, randomId } from '../http';
import { enforceAiQuota, resolveImage } from '../guestGuard';
import { recordAiUsage } from '../rateLimit';
import type { RequestContext } from '../router';
import { doctorAnalyzeSchema, halalScanSchema, receiptScanSchema } from '../schemas';
import { sha256Hex } from '../storage';
import { exerciseEquivalent, isEmergencyText, isHealthProfileComplete } from '../../../../shared/health';
import type { DoctorResult, DoctorScanType, HalalResult, HealthProfile, ReceiptExtraction } from '../../../../shared/types';
import { DEFAULT_CURRENCY } from '../../../../shared/constants';

function gatewayOptions(ctx: RequestContext): GatewayOptions {
  if (!ctx.config.gatewayKey) {
    throw new HttpError(500, 'server_error', 'The assistant is not configured.');
  }
  const guest = ctx.auth.role === 'guest';
  return {
    baseUrl: ctx.config.gatewayBaseUrl,
    apiKey: ctx.config.gatewayKey,
    appVersion: ctx.config.appVersion,
    timeoutMs: guest ? 60_000 : 120_000,
    maxAttempts: guest ? 3 : 4,
    fallbackModel: MODELS.fast,
  };
}

// ---------------------------------------------------------------------------
// Halal scan
// ---------------------------------------------------------------------------
export async function halalScan(ctx: RequestContext): Promise<Response> {
  const input = await ctx.parseBody(halalScanSchema);
  const guest = ctx.auth.role === 'guest';
  const image = await resolveImage(ctx, input);
  const hash = input.hash ?? (image ? await sha256Hex(new TextEncoder().encode(image.dataUrl)) : null);

  // 1. Instant shared cache by image/text hash across all users and guests (~10ms)
  if (hash) {
    const cached = await ctx.env.DB.prepare(
      'SELECT id, verdict, confidence, product, payload_json, created_at FROM halal_scans WHERE hash = ? ORDER BY created_at DESC LIMIT 1',
    )
      .bind(hash)
      .first<{
        id: string;
        verdict: string;
        confidence: number;
        product: string | null;
        payload_json: string;
        created_at: string;
      }>();
    if (cached) {
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(cached.payload_json) as Record<string, unknown>;
      } catch {
        payload = {};
      }
      const result: HalalResult = {
        id: cached.id,
        product: cached.product,
        verdict: cached.verdict as HalalResult['verdict'],
        confidence: cached.confidence,
        ingredients: (payload.ingredients as HalalResult['ingredients']) ?? [],
        concerns: (payload.concerns as string[]) ?? [],
        reason: (payload.reason as string) ?? '',
        needed: (payload.needed as string[]) ?? [],
        evidence: (payload.evidence as string | null) ?? null,
        createdAt: cached.created_at,
        cached: true,
      };
      return jsonResponse({ result }, ctx.request, ctx.config);
    }
  }

  await enforceAiQuota(ctx);

  const locale = guest ? (input.guest?.locale ?? ctx.user.locale) : ctx.user.locale;
  const madhhab = guest ? (input.guest?.madhhab ?? ctx.user.madhhab) : ctx.user.madhhab;

  const prompt = halalScanMessages({
    locale,
    madhhab,
    text: input.text,
    imageDataUrl: image?.dataUrl,
    productHint: input.product,
  });

  const messages = [
    { role: 'system' as const, content: prompt.system },
    {
      role: 'user' as const,
      content: image
        ? [
            { type: 'image_url' as const, image_url: { url: image.dataUrl } },
            { type: 'text' as const, text: prompt.user },
          ]
        : prompt.user,
    },
  ];

  const { data, model } = await askJson({
    options: gatewayOptions(ctx),
    model: image ? MODELS.vision : MODELS.fast,
    messages,
    schema: halalOutputSchema,
    shapeHint: HALAL_SHAPE,
    maxTokens: 800,
  });
  await recordAiUsage(ctx.env.DB, ctx.auth.uid, true, model);

  const id = randomId('scan');
  const createdAt = nowISO();
  const payload = {
    ingredients: data.ingredients,
    concerns: data.concerns,
    reason: data.reason,
    needed: data.needed,
    evidence: data.evidence ?? null,
  };

  if (hash) {
    await ctx.env.DB.prepare(
      `INSERT INTO halal_scans (id, uid, hash, verdict, confidence, product, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(uid, hash) DO UPDATE SET
         verdict = excluded.verdict, confidence = excluded.confidence, product = excluded.product,
         payload_json = excluded.payload_json, created_at = excluded.created_at`,
    )
      .bind(id, ctx.auth.uid, hash, data.verdict, data.confidence, data.product ?? null, JSON.stringify(payload), createdAt)
      .run();
  }

  const result: HalalResult = {
    id,
    product: data.product ?? null,
    verdict: data.verdict,
    confidence: data.confidence,
    ingredients: data.ingredients,
    concerns: data.concerns,
    reason: data.reason,
    needed: data.needed,
    evidence: data.evidence ?? null,
    createdAt,
    cached: false,
  };
  return jsonResponse({ result }, ctx.request, ctx.config);
}

// ---------------------------------------------------------------------------
// Doctor photo analysis (classify -> route -> analyse)
// ---------------------------------------------------------------------------
function guessTypeFromText(text: string): DoctorScanType {
  const value = text.toLowerCase();
  if (/чек|кассов|квитанц|receipt|ticket|فاتورة|إيصال/.test(value)) return 'receipt';
  if (/баланс|карт[аеу]|сч[её]т|balance|card|بطاق|رصيد/.test(value)) return 'bank';
  if (/анализ|кровь|lab result|تحليل/.test(value)) return 'lab';
  if (/таблет|лекарств|препарат|дозировк|medicine|pill|دواء|حبوب/.test(value)) return 'medicine';
  if (/еда|продукт|блюдо|калори|food|meal|طعام|سعرات/.test(value)) return 'food';
  return 'unclear';
}

export async function doctorAnalyze(ctx: RequestContext): Promise<Response> {
  const input = await ctx.parseBody(doctorAnalyzeSchema);
  const guest = ctx.auth.role === 'guest';
  const health: HealthProfile | null = guest ? (input.guest?.health ?? null) : ctx.user.health;
  const locale = guest ? (input.guest?.locale ?? ctx.user.locale) : ctx.user.locale;

  if (!isHealthProfileComplete(health)) {
    throw new HttpError(403, 'forbidden', 'Please complete your health profile first.', {
      reason: 'health_profile_incomplete',
    });
  }

  const image = await resolveImage(ctx, input);
  await enforceAiQuota(ctx);

  let type: DoctorScanType = 'unclear';
  let confidence = 0.25;
  let classificationSummary = '';

  if (image) {
    const classifier = classifyMessages({ locale, imageDataUrl: image.dataUrl, text: input.text });
    const classification = await askJson({
      options: gatewayOptions(ctx),
      model: MODELS.vision,
      messages: [
        { role: 'system' as const, content: classifier.system },
        {
          role: 'user' as const,
          content: [
            { type: 'image_url' as const, image_url: { url: image.dataUrl } },
            { type: 'text' as const, text: classifier.user },
          ],
        },
      ],
      schema: classificationOutputSchema,
      shapeHint: '{ "type": "medicine"|"food"|"receipt"|"bank"|"lab"|"unclear", "confidence": 0..1, "summary": string }',
      maxTokens: 512,
      temperature: 0.1,
    });
    type = classification.data.type;
    confidence = classification.data.confidence;
    classificationSummary = classification.data.summary;
  } else {
    type = guessTypeFromText(input.text ?? '');
  }

  // Receipts and bank screenshots belong to the accountant screen — no deep call.
  if (type === 'receipt' || type === 'bank') {
    const result: DoctorResult = {
      type,
      confidence,
      summary: classificationSummary || 'This looks like a receipt or a bank screen.',
      emergency: false,
      createdAt: nowISO(),
    };
    return jsonResponse({ result, redirect: 'accountant' }, ctx.request, ctx.config);
  }

  const prompt = doctorAnalyzeMessages({
    locale,
    health,
    type: classificationSummary ? `${type} - ${classificationSummary}` : type,
    imageDataUrl: image?.dataUrl ?? '',
    text: input.text,
  });

  const { data, model } = await askJson({
    options: gatewayOptions(ctx),
    model: image ? MODELS.vision : MODELS.fast,
    messages: [
      { role: 'system' as const, content: prompt.system },
      {
        role: 'user' as const,
        content: image
          ? [
              { type: 'image_url' as const, image_url: { url: image.dataUrl } },
              { type: 'text' as const, text: prompt.user },
            ]
          : prompt.user,
      },
    ],
    schema: doctorOutputSchema,
    shapeHint: DOCTOR_SHAPE,
    maxTokens: 2800,
  });
  await recordAiUsage(ctx.env.DB, ctx.auth.uid, true, model);

  const food = data.food
    ? {
        ...data.food,
        calories: data.food.calories ?? { min: 0, max: 0 },
        proteinG: data.food.proteinG ?? { min: 0, max: 0 },
        fatG: data.food.fatG ?? { min: 0, max: 0 },
        carbsG: data.food.carbsG ?? { min: 0, max: 0 },
        sugarG: data.food.sugarG ?? { min: 0, max: 0 },
        sodiumMg: data.food.sodiumMg ?? { min: 0, max: 0 },
        suitability: data.food.suitability ?? '',
        // MET maths happens in code, never in the model.
        exercise: exerciseEquivalent(
          ((data.food.calories?.min ?? 0) + (data.food.calories?.max ?? 0)) / 2,
          health?.weightKg,
        ),
      }
    : undefined;

  const result: DoctorResult = {
    type: data.type,
    confidence: data.confidence,
    summary: data.summary,
    medicine: data.medicine,
    food,
    lab: data.lab,
    emergency: data.emergency || isEmergencyText(input.text ?? ''),
    createdAt: nowISO(),
  };
  return jsonResponse({ result }, ctx.request, ctx.config);
}

// ---------------------------------------------------------------------------
// Receipt / bank statement extraction (editable review happens on the client)
// ---------------------------------------------------------------------------
export async function receiptExtract(ctx: RequestContext): Promise<Response> {
  const input = await ctx.parseBody(receiptScanSchema);
  const guest = ctx.auth.role === 'guest';
  const image = await resolveImage(ctx, input);
  if (!image) throw new HttpError(400, 'bad_request', 'Please attach a receipt photo.');

  await enforceAiQuota(ctx);

  const currency = guest ? (input.guest?.finance?.currency ?? DEFAULT_CURRENCY) : ctx.user.currency;
  const locale = guest ? (input.guest?.locale ?? ctx.user.locale) : ctx.user.locale;
  const timezone = ctx.user.timezone;

  const prompt = receiptMessages({ locale, currency, timezone, imageDataUrl: image.dataUrl });

  const { data, model } = await askJson({
    options: gatewayOptions(ctx),
    model: MODELS.vision,
    messages: [
      { role: 'system' as const, content: prompt.system },
      {
        role: 'user' as const,
        content: [
          { type: 'image_url' as const, image_url: { url: image.dataUrl } },
          { type: 'text' as const, text: prompt.user },
        ],
      },
    ],
    schema: receiptOutputSchema,
    shapeHint: RECEIPT_SHAPE,
    maxTokens: 2600,
  });
  await recordAiUsage(ctx.env.DB, ctx.auth.uid, true, model);

  const now = nowISO();
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();

  // Guests have no server history — duplicates are detected on their device.
  const existing = guest
    ? []
    : ((
        await ctx.env.DB.prepare(
          `SELECT amount_minor, occurred_at, hash FROM transactions
           WHERE uid = ? AND occurred_at >= ? ORDER BY occurred_at DESC LIMIT 300`,
        )
          .bind(ctx.auth.uid, since)
          .all<{ amount_minor: number; occurred_at: string; hash: string | null }>()
      ).results ?? []);

  const existingHashes = new Set(existing.map((row) => row.hash).filter((hash): hash is string => Boolean(hash)));

  const items = await Promise.all(
    data.items.map(async (item) => {
      const occurredAt = parseLooseDateTime(item.occurredAt, now, timezone);
      // Same formula as the bulk insert -> a re-scanned receipt is caught by hash.
      const hash = await sha256Hex(new TextEncoder().encode(`${item.label}|${item.amount}|${occurredAt.slice(0, 16)}`));
      const duplicate =
        existingHashes.has(hash) ||
        existing.some((row) => {
          if (row.amount_minor !== item.amount) return false;
          const delta = Math.abs(new Date(row.occurred_at).getTime() - new Date(occurredAt).getTime());
          return delta <= 30 * 60 * 1000;
        });
      return {
        label: item.label.slice(0, 80),
        amountMinor: item.amount,
        category: item.category,
        occurredAt,
        kind: item.kind,
        hash,
        duplicate,
      };
    }),
  );

  const result: ReceiptExtraction = { items, merchant: data.merchant ?? null, note: data.note ?? '' };
  return jsonResponse({ result }, ctx.request, ctx.config);
}

export async function balanceExtract(ctx: RequestContext): Promise<Response> {
  const input = await ctx.parseBody(receiptScanSchema);
  const guest = ctx.auth.role === 'guest';
  const image = await resolveImage(ctx, input);
  if (!image) throw new HttpError(400, 'bad_request', 'Please attach a screenshot.');

  await enforceAiQuota(ctx);

  const currency = guest ? (input.guest?.finance?.currency ?? DEFAULT_CURRENCY) : ctx.user.currency;
  const locale = guest ? (input.guest?.locale ?? ctx.user.locale) : ctx.user.locale;
  const prompt = balanceMessages({ locale, currency, imageDataUrl: image.dataUrl });

  const { data, model } = await askJson({
    options: gatewayOptions(ctx),
    model: MODELS.vision,
    messages: [
      { role: 'system' as const, content: prompt.system },
      {
        role: 'user' as const,
        content: [
          { type: 'image_url' as const, image_url: { url: image.dataUrl } },
          { type: 'text' as const, text: prompt.user },
        ],
      },
    ],
    schema: balanceOutputSchema,
    shapeHint: BALANCE_SHAPE,
    maxTokens: 512,
    temperature: 0.1,
  });
  await recordAiUsage(ctx.env.DB, ctx.auth.uid, true, model);

  const detected = data.currency && /^[A-Za-z]{3}$/.test(data.currency) ? data.currency.toUpperCase() : currency;

  return jsonResponse(
    { result: { balanceMinor: data.balance ?? null, currency: detected, note: data.note ?? '', extractedAt: nowISO() } },
    ctx.request,
    ctx.config,
  );
}
