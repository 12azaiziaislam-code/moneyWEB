-- ===========================================================================
-- Baraka | بركة — migration 0002
-- Payday confirmations (never auto-credit money without the user's consent)
-- + privacy-preserving AI counters (NO prompts, NO images, NO health data).
-- ===========================================================================

CREATE TABLE IF NOT EXISTS income_confirmations (
  id           TEXT PRIMARY KEY,
  uid          TEXT NOT NULL,
  source_id    TEXT NOT NULL,
  payday_date  TEXT NOT NULL,          -- YYYY-MM-DD (calendar)
  amount_minor INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'confirmed', -- confirmed | skipped
  created_at   TEXT NOT NULL,
  FOREIGN KEY (uid) REFERENCES users (uid) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_income_conf_uid_source_date
  ON income_confirmations (uid, source_id, payday_date);
CREATE INDEX IF NOT EXISTS idx_income_conf_uid ON income_confirmations (uid, payday_date DESC);

-- Aggregated AI usage per user per day: counters only, never content.
CREATE TABLE IF NOT EXISTS ai_usage (
  uid         TEXT NOT NULL,
  day         TEXT NOT NULL,           -- YYYY-MM-DD (UTC)
  requests    INTEGER NOT NULL DEFAULT 0,
  failures    INTEGER NOT NULL DEFAULT 0,
  last_model  TEXT,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (uid, day)
);

-- Speeds up the "my recent transactions" query used by the planner.
CREATE INDEX IF NOT EXISTS idx_tx_uid_kind_date ON transactions (uid, kind, occurred_at DESC);
