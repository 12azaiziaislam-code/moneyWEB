/**
 * Zod schemas for every STRUCTURED AI output. Anything the model returns is
 * untrusted data: it is validated here before it reaches D1 or the UI.
 */

import { z } from 'zod';
import { numberToMinor, majorToMinor } from '../../../../shared/money';
import { EXPENSE_CATEGORIES } from '../../../../shared/constants';

/** Accepts 0..1 or 0..100 (as number or string) and normalises to 0..1. */
export const confidenceSchema = z
  .preprocess((value) => {
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value.replace('%', '').trim());
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return value;
  }, z.number())
  .transform((n) => (n > 1 ? Math.min(100, n) / 100 : Math.max(0, n)));

/** Accepts "1 234,56" / 1234.56 / "1234,56 ₽" and returns minor units. */
export const minorAmountSchema = z.preprocess((value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return numberToMinor(value);
  if (typeof value === 'string') {
    const parsed = majorToMinor(value);
    return parsed === null ? undefined : parsed;
  }
  return undefined;
}, z.number().int().min(0).max(1_000_000_000_000));

export const verdictSchema = z.enum(['halal', 'haram', 'mashbooh']);

export const halalOutputSchema = z.object({
  product: z.string().max(160).nullable().optional(),
  verdict: verdictSchema,
  confidence: confidenceSchema,
  ingredients: z
    .array(
      z.object({
        name: z.string().max(160),
        status: z.enum(['halal', 'haram', 'mashbooh', 'unknown']).default('unknown'),
        note: z.string().max(300).optional(),
      }),
    )
    .max(60)
    .default([]),
  concerns: z.array(z.string().max(300)).max(20).default([]),
  reason: z.string().min(3).max(1500),
  needed: z.array(z.string().max(300)).max(20).default([]),
  evidence: z.string().max(900).nullable().optional(),
});
export type HalalOutput = z.infer<typeof halalOutputSchema>;

export const nutritionRangeSchema = z.object({
  min: z.number().min(0).max(100_000),
  max: z.number().min(0).max(100_000),
});

export const doctorOutputSchema = z.object({
  type: z.enum(['medicine', 'food', 'receipt', 'bank', 'lab', 'unclear']),
  confidence: confidenceSchema,
  summary: z.string().min(2).max(1200),
  medicine: z
    .object({
      name: z.string().max(160),
      activeIngredient: z.string().max(200).default(''),
      interactions: z.array(z.string().max(300)).max(20).default([]),
      dosage: z.string().max(600).default(''),
      indications: z.array(z.string().max(300)).max(20).default([]),
      sideEffects: z.array(z.string().max(300)).max(20).default([]),
      contraindications: z.array(z.string().max(300)).max(20).default([]),
      whenToSeeDoctor: z.array(z.string().max(300)).max(20).default([]),
    })
    .optional(),
  food: z
    .object({
      calories: nutritionRangeSchema.optional(),
      proteinG: nutritionRangeSchema.optional(),
      fatG: nutritionRangeSchema.optional(),
      carbsG: nutritionRangeSchema.optional(),
      sugarG: nutritionRangeSchema.optional(),
      sodiumMg: nutritionRangeSchema.optional(),
      suitability: z.string().max(900).default(''),
    })
    .optional(),
  lab: z
    .object({
      values: z
        .array(
          z.object({
            name: z.string().max(120),
            value: z.string().max(80),
            reference: z.string().max(80).nullable().default(null),
          }),
        )
        .max(40)
        .default([]),
      note: z.string().max(900).default(''),
    })
    .optional(),
  emergency: z.boolean().default(false),
});
export type DoctorOutput = z.infer<typeof doctorOutputSchema>;

export const classificationOutputSchema = z.object({
  type: z.enum(['medicine', 'food', 'receipt', 'bank', 'lab', 'unclear']),
  confidence: confidenceSchema,
  summary: z.string().max(400).default(''),
});

export const extractedItemSchema = z.object({
  label: z.string().max(120),
  amount: minorAmountSchema,
  category: z
    .preprocess(
      (value) => (typeof value === 'string' && EXPENSE_CATEGORIES.includes(value as never) ? value : 'other'),
      z.string(),
    )
    .default('other'),
  occurredAt: z.string().max(40).optional(),
  kind: z.enum(['expense', 'income']).default('expense'),
});

export const receiptOutputSchema = z.object({
  items: z.array(extractedItemSchema).max(30).default([]),
  merchant: z.string().max(120).nullable().optional(),
  currency: z.string().max(8).nullable().optional(),
  note: z.string().max(600).default(''),
});
export type ReceiptOutput = z.infer<typeof receiptOutputSchema>;

export const balanceOutputSchema = z.object({
  balance: minorAmountSchema.nullable().default(null),
  currency: z.string().max(8).nullable().optional(),
  note: z.string().max(400).default(''),
});
export type BalanceOutput = z.infer<typeof balanceOutputSchema>;
