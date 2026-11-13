/**
 * Worker environment + normalised configuration.
 * Secrets never leave this module in a loggable shape.
 */

export interface Env {
  DB: D1Database;
  BUCKET?: R2Bucket;

  USE_R2?: string;
  GATEWAY_API_KEY?: string;
  GATEWAY_BASE_URL?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_API_KEY?: string;
  APP_ORIGIN?: string;
  APP_VERSION?: string;

  RATE_LIMIT_PER_HOUR?: string;
  RATE_LIMIT_PER_DAY?: string;
  MAX_BODY_BYTES?: string;
  MAX_IMAGE_BYTES?: string;
  JWT_SECRET?: string;

  // ---- guest mode ----
  GUEST_MODE_ENABLED?: string;
  GUEST_JWT_SECRET?: string;
  GUEST_LIMIT_PER_HOUR?: string;
  GUEST_LIMIT_PER_DAY?: string;
  GUEST_IP_LIMIT_PER_DAY?: string;
  GUEST_TOKENS_PER_IP_HOUR?: string;
  GUEST_MAX_IMAGE_BYTES?: string;
  TURNSTILE_SECRET?: string;

  // Cloudflare Pages runtime injection points
  ASSETS?: { fetch: (req: Request) => Promise<Response> };
}

export interface GuestConfig {
  enabled: boolean;
  secret: string;
  perHour: number;
  perDay: number;
  ipPerDay: number;
  tokensPerIpHour: number;
  maxImageBytes: number;
  turnstileSecret: string;
}

export interface AppConfig {
  gatewayBaseUrl: string;
  gatewayKey: string;
  projectId: string;
  firebaseApiKey: string;
  appVersion: string;
  allowedOrigins: string[];
  useR2: boolean;
  limitPerHour: number;
  limitPerDay: number;
  maxBodyBytes: number;
  maxImageBytes: number;
  jwtSecret: string;
  guest: GuestConfig;
}

function num(value: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

/** Trims the version header to the gateway contract (<= 30 chars, ascii). */
export function safeAppVersion(version: string | undefined): string {
  const cleaned = (version ?? '1.0.0')
    .replace(/[^\x20-\x7e]/g, '')
    .trim()
    .slice(0, 30);
  return cleaned || '1.0.0';
}

export function readConfig(env: Env): AppConfig {
  const origins = (env.APP_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  return {
    gatewayBaseUrl: (env.GATEWAY_BASE_URL || 'https://gemma-gateway.pages.dev/v1').replace(/\/$/, ''),
    gatewayKey: (env.GATEWAY_API_KEY ?? '').trim(),
    projectId: (env.FIREBASE_PROJECT_ID ?? '').trim(),
    firebaseApiKey: (env.FIREBASE_API_KEY ?? '').trim(),
    appVersion: safeAppVersion(env.APP_VERSION),
    allowedOrigins: origins,
    useR2: String(env.USE_R2 ?? '').toLowerCase() === 'true',
    limitPerHour: num(env.RATE_LIMIT_PER_HOUR, 30, 1, 10_000),
    limitPerDay: num(env.RATE_LIMIT_PER_DAY, 200, 1, 100_000),
    maxBodyBytes: num(env.MAX_BODY_BYTES, 6_000_000, 100_000, 20_000_000),
    maxImageBytes: num(env.MAX_IMAGE_BYTES, 1_200_000, 50_000, 5_000_000),
    jwtSecret: (env.JWT_SECRET || env.GUEST_JWT_SECRET || 'baraka-app-jwt-secret-key-production-32chars').trim(),
    guest: {
      // Off by default: one variable turns the whole mode on/off.
      enabled: String(env.GUEST_MODE_ENABLED ?? '').toLowerCase() === 'true',
      secret: (env.GUEST_JWT_SECRET ?? '').trim(),
      perHour: num(env.GUEST_LIMIT_PER_HOUR, 4, 1, 100),
      perDay: num(env.GUEST_LIMIT_PER_DAY, 10, 1, 1_000),
      ipPerDay: num(env.GUEST_IP_LIMIT_PER_DAY, 30, 1, 10_000),
      tokensPerIpHour: num(env.GUEST_TOKENS_PER_IP_HOUR, 6, 1, 1_000),
      maxImageBytes: num(env.GUEST_MAX_IMAGE_BYTES, 700_000, 50_000, 2_000_000),
      turnstileSecret: (env.TURNSTILE_SECRET ?? '').trim(),
    },
  };
}

/** Guest mode needs both the switch and a strong secret. */
export function guestModeActive(config: AppConfig): boolean {
  return config.guest.enabled && config.guest.secret.length >= 32;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export function assertGatewayConfigured(config: AppConfig): void {
  if (!config.gatewayKey) {
    throw new ConfigError('GATEWAY_API_KEY is not configured');
  }
}
