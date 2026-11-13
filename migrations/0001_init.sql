-- ===========================================================================
-- Baraka | بركة — D1 schema (migration 0001)
-- EVERY query in the worker filters by uid. No exceptions.
-- Amounts are INTEGERs in the smallest currency unit (kopeks).
-- Timestamps are ISO-8601 UTC strings ("2026-11-02T09:30:00.000Z").
-- ===========================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- users: one row per Firebase account. Health / finance profiles are JSON
-- documents owned by exactly one uid (never joined across users).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  uid              TEXT PRIMARY KEY,
  email            TEXT,
  display_name     TEXT,
  locale           TEXT NOT NULL DEFAULT 'ar',
  timezone         TEXT NOT NULL DEFAULT 'Europe/Moscow',
  currency         TEXT NOT NULL DEFAULT 'RUB',
  theme            TEXT NOT NULL DEFAULT 'system',
  madhhab          TEXT NOT NULL DEFAULT 'none',
  ai_mode          TEXT NOT NULL DEFAULT 'builtin',
  consent_at       TEXT,
  onboarding_done  INTEGER NOT NULL DEFAULT 0,
  health_json      TEXT NOT NULL DEFAULT '{}',
  finance_json     TEXT NOT NULL DEFAULT '{}',
  balance_minor    INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- chats: conversation list for shaykh / doctor / accountant
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chats (
  id          TEXT PRIMARY KEY,
  uid         TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('shaykh', 'doctor', 'accountant')),
  title       TEXT NOT NULL,
  preview     TEXT NOT NULL DEFAULT '',
  image_id    TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  FOREIGN KEY (uid) REFERENCES users (uid) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_chats_uid_updated ON chats (uid, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_uid_kind ON chats (uid, kind, updated_at DESC);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id          TEXT PRIMARY KEY,
  chat_id     TEXT NOT NULL,
  uid         TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content     TEXT NOT NULL,
  image_id    TEXT,
  meta_json   TEXT,
  created_at  TEXT NOT NULL,
  FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE,
  FOREIGN KEY (uid) REFERENCES users (uid) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_messages_uid_chat ON messages (uid, chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages (chat_id, created_at);

-- ---------------------------------------------------------------------------
-- assets: compressed thumbnails. When USE_R2="true" the bytes live in R2 and
-- `data` stays NULL (r2_key is set instead). Otherwise bytes live in D1.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assets (
  id          TEXT PRIMARY KEY,
  uid         TEXT NOT NULL,
  mime        TEXT NOT NULL,
  size        INTEGER NOT NULL,
  data        BLOB,
  r2_key      TEXT,
  hash        TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  FOREIGN KEY (uid) REFERENCES users (uid) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_assets_uid ON assets (uid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_uid_hash ON assets (uid, hash);

-- ---------------------------------------------------------------------------
-- transactions: money movements (expense = negative by convention)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id            TEXT PRIMARY KEY,
  uid           TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
  amount_minor  INTEGER NOT NULL CHECK (amount_minor >= 0),
  label         TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'other',
  occurred_at   TEXT NOT NULL,
  source        TEXT NOT NULL DEFAULT 'manual',
  hash          TEXT,
  created_at    TEXT NOT NULL,
  FOREIGN KEY (uid) REFERENCES users (uid) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tx_uid_date ON transactions (uid, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_uid_hash ON transactions (uid, hash);

-- ---------------------------------------------------------------------------
-- halal_scans: cache of verdicts keyed by (uid, image hash) — saves AI quota
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS halal_scans (
  id            TEXT PRIMARY KEY,
  uid           TEXT NOT NULL,
  hash          TEXT NOT NULL,
  verdict       TEXT NOT NULL CHECK (verdict IN ('halal', 'haram', 'mashbooh')),
  confidence    REAL NOT NULL DEFAULT 0,
  product       TEXT,
  payload_json  TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  FOREIGN KEY (uid) REFERENCES users (uid) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_halal_uid_hash ON halal_scans (uid, hash);

-- ---------------------------------------------------------------------------
-- rate_limits: durable per-user, per-window counters (free-plan friendly)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limits (
  uid           TEXT NOT NULL,
  bucket        TEXT NOT NULL,
  window_start  INTEGER NOT NULL,
  count         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (uid, bucket, window_start)
);
