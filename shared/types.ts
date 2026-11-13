/**
 * Types shared by the SPA (src) and the Cloudflare Pages Functions (functions/api/_lib).
 * Type-only: nothing here is executed, so importing it from either side is free.
 */

export type Locale = 'ar' | 'ru' | 'en';
export const LOCALES: Locale[] = ['ar', 'ru', 'en'];

export type ChatKind = 'shaykh' | 'doctor' | 'accountant';
export const CHAT_KINDS: ChatKind[] = ['shaykh', 'doctor', 'accountant'];

export type Verdict = 'halal' | 'haram' | 'mashbooh';
export type Madhhab = 'hanafi' | 'shafii' | 'maliki' | 'hanbali' | 'none';
export type AiMode = 'builtin' | 'own';
export type ThemeMode = 'system' | 'light' | 'dark';
export type SpendLevel = 'hard' | 'normal' | 'easy';
export type DangerLevel = 'green' | 'yellow' | 'orange' | 'red';

export type Cadence = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'quarterly' | 'custom';

export interface SavingsRates {
  hard: number; // percent of expected income (default 30)
  normal: number; // 15
  easy: number; // 5
}

export interface IncomeSource {
  id: string;
  label: string;
  amountMinor: number;
  cadence: Cadence;
  /** UTC date (YYYY-MM-DD) of the last (or first) payday used as anchor. */
  lastPayday: string;
  /** 1..31 — used by `semimonthly` / `custom`. */
  day1?: number;
  day2?: number;
  /** used by `custom` (1..31 each) */
  customDays?: number[];
  active: boolean;
}

export interface FixedExpense {
  id: string;
  label: string;
  amountMinor: number;
  dueDay: number; // 1..31
  active: boolean;
}

export interface HealthProfile {
  age?: number;
  heightCm?: number;
  weightKg?: number;
  sex?: 'male' | 'female';
  conditions: string[];
  medications: string[];
  allergies: string[];
  pregnant?: boolean;
  breastfeeding?: boolean;
  notes?: string;
  updatedAt?: string;
}

export interface FinanceProfile {
  currency: string;
  incomes: IncomeSource[];
  fixedExpenses: FixedExpense[];
  savingsRates: SavingsRates;
  level: SpendLevel;
  updatedAt?: string;
}

export interface WebUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  locale: Locale;
  timezone: string;
  currency: string;
  theme: ThemeMode;
  madhhab: Madhhab;
  aiMode: AiMode;
  consentAt: string | null;
  onboardingDone: boolean;
  health: HealthProfile;
  finance: FinanceProfile;
  balanceMinor: number;
  createdAt: string;
}

export interface ChatSummary {
  id: string;
  kind: ChatKind;
  title: string;
  preview: string;
  imageId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  chatId: string;
  role: MessageRole;
  content: string;
  imageId: string | null;
  createdAt: string;
  meta?: Record<string, unknown> | null;
}

export interface ChatDetail extends ChatSummary {
  messages: ChatMessage[];
}

export interface Transaction {
  id: string;
  kind: 'expense' | 'income';
  amountMinor: number;
  label: string;
  category: string;
  occurredAt: string; // ISO UTC
  source: 'manual' | 'scan' | 'income';
  hash?: string | null;
}

export interface HalalIngredient {
  name: string;
  status: Verdict | 'unknown';
  note?: string;
}

export interface HalalResult {
  id: string;
  product: string | null;
  verdict: Verdict;
  confidence: number;
  ingredients: HalalIngredient[];
  concerns: string[];
  reason: string;
  needed: string[];
  evidence: string | null;
  createdAt: string;
  cached: boolean;
}

export type DoctorScanType = 'medicine' | 'food' | 'receipt' | 'bank' | 'lab' | 'unclear';

export interface NutritionRange {
  min: number;
  max: number;
}

export interface DoctorResult {
  type: DoctorScanType;
  confidence: number;
  summary: string;
  medicine?: {
    name: string;
    activeIngredient: string;
    interactions: string[];
    dosage: string;
    indications: string[];
    sideEffects: string[];
    contraindications: string[];
    whenToSeeDoctor: string[];
  };
  food?: {
    calories: NutritionRange;
    proteinG: NutritionRange;
    fatG: NutritionRange;
    carbsG: NutritionRange;
    sugarG: NutritionRange;
    sodiumMg: NutritionRange;
    suitability: string;
    /** computed in code (MET based), never by the model */
    exercise?: {
      walkingMin: number;
      runningMin: number;
      cyclingMin: number;
      met: number;
    };
  };
  lab?: { values: { name: string; value: string; reference: string | null }[]; note: string };
  emergency: boolean;
  createdAt: string;
}

export interface BalanceExtraction {
  balanceMinor: number | null;
  currency: string | null;
  note: string;
}

export interface ExtractedTransaction {
  label: string;
  amountMinor: number;
  category: string;
  occurredAt: string;
  kind: 'expense' | 'income';
  /** deterministic hash used for duplicate detection */
  hash?: string | null;
  /** true when the server suspects this line is already stored */
  duplicate?: boolean;
}

export interface ReceiptExtraction {
  items: ExtractedTransaction[];
  merchant: string | null;
  note: string;
}

export type ApiErrorCode =
  | 'unauthorized'
  | 'invalid_token'
  | 'forbidden'
  | 'not_found'
  | 'bad_request'
  | 'validation_failed'
  | 'rate_limited'
  | 'payload_too_large'
  | 'ai_unavailable'
  | 'ai_auth_failed'
  | 'device_pending'
  | 'device_banned'
  | 'ai_parse_failed'
  | 'offline'
  | 'network'
  | 'server_error'
  | 'generic';

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
    retryAfter?: number;
  };
}

export interface PlanResult {
  currency: string;
  level: SpendLevel;
  danger: DangerLevel;
  cycleStart: string;
  cycleEnd: string;
  daysLeft: number;
  balanceMinor: number;
  expectedIncomeMinor: number;
  remainingFixedMinor: number;
  savingsTargetMinor: number;
  availableMinor: number;
  dailyBudgetMinor: number;
  nextDailyBudgetMinor: number;
  spentTodayMinor: number;
  spentCycleMinor: number;
  todayRatio: number;
  savingsProjectedMinor: number;
  projectedRunOutDate: string | null;
  daysWithoutMoney: number;
  averageDailySpendMinor: number;
  paydays: { date: string; label: string; amountMinor: number; sourceId: string }[];
  upcomingFixed: { date: string; label: string; amountMinor: number }[];
}

export type BudgetPlan = PlanResult;
