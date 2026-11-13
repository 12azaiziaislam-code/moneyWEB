/**
 * Every request body is validated with Zod before it touches D1.
 */

import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '../../../shared/constants';

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
export const idSchema = z.string().min(1).max(80);

export const localeSchema = z.enum(['ar', 'ru', 'en']);
export const chatKindSchema = z.enum(['shaykh', 'doctor', 'accountant']);
export const levelSchema = z.enum(['hard', 'normal', 'easy']);
export const categorySchema = z.enum(EXPENSE_CATEGORIES);

export const authRegisterSchema = z.object({
  email: z.string().trim().email().max(120),
  username: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_.-]+$/, 'Username must be alphanumeric or ._-'),
  password: z.string().min(6).max(100),
  locale: localeSchema.optional(),
});

export const authLoginSchema = z.object({
  login: z.string().trim().min(2).max(120),
  password: z.string().min(1).max(100),
});

export const incomeSourceSchema = z.object({
  id: idSchema,
  label: z.string().trim().min(1).max(60),
  amountMinor: z.number().int().min(0).max(1_000_000_000_000),
  cadence: z.enum(['weekly', 'biweekly', 'semimonthly', 'monthly', 'quarterly', 'custom']),
  lastPayday: isoDateSchema,
  day1: z.number().int().min(1).max(31).optional(),
  day2: z.number().int().min(1).max(31).optional(),
  customDays: z.array(z.number().int().min(1).max(31)).max(10).optional(),
  active: z.boolean().default(true),
});

export const fixedExpenseSchema = z.object({
  id: idSchema,
  label: z.string().trim().min(1).max(60),
  amountMinor: z.number().int().min(0).max(1_000_000_000_000),
  dueDay: z.number().int().min(1).max(31),
  active: z.boolean().default(true),
});

export const savingsRatesSchema = z.object({
  hard: z.number().min(0).max(90),
  normal: z.number().min(0).max(90),
  easy: z.number().min(0).max(90),
});

export const financeSchema = z.object({
  currency: z.string().length(3).toUpperCase(),
  incomes: z.array(incomeSourceSchema).max(20),
  fixedExpenses: z.array(fixedExpenseSchema).max(60),
  savingsRates: savingsRatesSchema,
  level: levelSchema,
});

export const healthSchema = z.object({
  age: z.number().int().min(1).max(120).optional(),
  heightCm: z.number().int().min(60).max(260).optional(),
  weightKg: z.number().min(20).max(400).optional(),
  sex: z.enum(['male', 'female']).optional(),
  conditions: z.array(z.string().trim().max(80)).max(30).default([]),
  medications: z.array(z.string().trim().max(80)).max(30).default([]),
  allergies: z.array(z.string().trim().max(80)).max(30).default([]),
  pregnant: z.boolean().optional(),
  breastfeeding: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
});

export const mePatchSchema = z
  .object({
    locale: localeSchema.optional(),
    timezone: z.string().max(64).optional(),
    currency: z.string().length(3).toUpperCase().optional(),
    theme: z.enum(['system', 'light', 'dark']).optional(),
    madhhab: z.enum(['hanafi', 'shafii', 'maliki', 'hanbali', 'none']).optional(),
    aiMode: z.enum(['builtin', 'own']).optional(),
    consent: z.literal(true).optional(),
    onboardingDone: z.boolean().optional(),
    health: healthSchema.optional(),
    finance: financeSchema.optional(),
    balanceMinor: z.number().int().min(0).max(1_000_000_000_000).optional(),
    displayName: z.string().max(80).nullable().optional(),
  })
  .strict();

export const dataUrlSchema = z
  .string()
  .max(8_000_000)
  .regex(/^data:image\/(jpeg|jpg|png|webp|heic|heif);base64,[A-Za-z0-9+/=\s]+$/, 'Invalid image data URL');

export const uploadSchema = z.object({
  dataUrl: dataUrlSchema,
  hash: z.string().min(4).max(128).optional(),
});

export const chatCreateSchema = z.object({
  kind: chatKindSchema,
  title: z.string().trim().max(80).optional(),
  imageId: idSchema.optional(),
  seedText: z.string().max(4000).optional(),
});

export const ownKeySchema = z.object({
  baseUrl: z.string().url().max(300),
  apiKey: z.string().min(8).max(400),
  model: z.string().min(1).max(80),
});


export const guestContextSchema = z
  .object({
    locale: localeSchema.default('ar'),
    madhhab: z.enum(['hanafi', 'shafii', 'maliki', 'hanbali', 'none']).default('none'),
    health: healthSchema.optional(),
    finance: financeSchema.optional(),
    planSummary: z.string().max(2000).optional(),
    history: z
      .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) }))
      .max(16)
      .optional(),
  })
  .strict();

export const imageDataUrlField = dataUrlSchema.optional();

export const aiChatSchema = z.object({
  kind: chatKindSchema,
  chatId: idSchema.optional(),
  text: z.string().max(4000).optional(),
  imageId: idSchema.optional(),
  /** guests send the compressed photo inline (never stored server-side) */
  imageDataUrl: imageDataUrlField,
  /** Optional structured context (verdict, extraction…) already validated server-side. */
  context: z.string().max(4000).optional(),
  ownKey: ownKeySchema.optional(),
  guest: guestContextSchema.optional(),
});

export const halalScanSchema = z
  .object({
    assetId: idSchema.optional(),
    imageDataUrl: imageDataUrlField,
    text: z.string().max(4000).optional(),
    hash: z.string().min(4).max(128).optional(),
    product: z.string().max(120).optional(),
    guest: guestContextSchema.optional(),
  })
  .refine((v) => Boolean(v.assetId || v.imageDataUrl || (v.text && v.text.trim().length >= 2)), {
    message: 'Provide an image or some text about the product',
  });

export const doctorAnalyzeSchema = z
  .object({
    assetId: idSchema.optional(),
    imageDataUrl: imageDataUrlField,
    text: z.string().max(4000).optional(),
    hash: z.string().min(4).max(128).optional(),
    guest: guestContextSchema.optional(),
  })
  .refine((v) => Boolean(v.assetId || v.imageDataUrl || (v.text && v.text.trim().length >= 2)), {
    message: 'Provide an image or a description',
  });

export const receiptScanSchema = z.object({
  assetId: idSchema.optional(),
  imageDataUrl: imageDataUrlField,
  hash: z.string().min(4).max(128).optional(),
  guest: guestContextSchema.optional(),
});

export const guestImportSchema = z
  .object({
    chats: z
      .array(
        z.object({
          kind: chatKindSchema,
          title: z.string().max(80).default('Chat'),
          preview: z.string().max(200).optional(),
          messages: z
            .array(
              z.object({
                role: z.enum(['user', 'assistant']),
                content: z.string().max(4000),
                createdAt: z.string().max(40).optional(),
              }),
            )
            .max(40)
            .default([]),
        }),
      )
      .max(30)
      .default([]),
    transactions: z
      .array(
        z.object({
          kind: z.enum(['expense', 'income']),
          amountMinor: z.number().int().min(0).max(1_000_000_000_000),
          label: z.string().max(80),
          category: z.string().max(32).default('other'),
          occurredAt: z.string().max(40),
          hash: z.string().max(128).nullable().optional(),
        }),
      )
      .max(200)
      .default([]),
    health: healthSchema.optional(),
    finance: financeSchema.optional(),
    balanceMinor: z.number().int().min(0).max(1_000_000_000_000).optional(),
  })
  .strict();

export const guestStartSchema = z.object({ turnstileToken: z.string().max(4096).optional() }).strict();

export const transactionCreateSchema = z.object({
  kind: z.enum(['expense', 'income']),
  amountMinor: z.number().int().min(0).max(1_000_000_000_000),
  label: z.string().trim().min(1).max(80),
  category: z.string().max(32).default('other'),
  occurredAt: z.string().datetime(),
  hash: z.string().max(128).nullable().optional(),
});

export const transactionPatchSchema = z
  .object({
    kind: z.enum(['expense', 'income']).optional(),
    amountMinor: z.number().int().min(0).max(1_000_000_000_000).optional(),
    label: z.string().trim().min(1).max(80).optional(),
    category: z.string().max(32).optional(),
    occurredAt: z.string().datetime().optional(),
  })
  .strict();

export const transactionsBulkSchema = z.object({
  items: z.array(transactionCreateSchema).min(1).max(30),
});

export const deleteAccountSchema = z.object({
  confirm: z.literal('DELETE'),
});

export const balanceSchema = z.object({
  balanceMinor: z.number().int().min(0).max(1_000_000_000_000),
});

export const confirmIncomeSchema = z.object({
  sourceId: idSchema,
  paydayDate: isoDateSchema,
  amountMinor: z.number().int().min(0).max(1_000_000_000_000),
  status: z.enum(['confirmed', 'skipped']).default('confirmed'),
});

export type MePatch = z.infer<typeof mePatchSchema>;
export type AiChatInput = z.infer<typeof aiChatSchema>;
export type UploadInput = z.infer<typeof uploadSchema>;
export type FinanceInput = z.infer<typeof financeSchema>;
export type HealthInput = z.infer<typeof healthSchema>;
