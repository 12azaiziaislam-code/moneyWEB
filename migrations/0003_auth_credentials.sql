-- ===========================================================================
-- Baraka | بركة — migration 0003
-- Local email & username password credentials for direct user registration
-- ===========================================================================

ALTER TABLE users ADD COLUMN username TEXT;
ALTER TABLE users ADD COLUMN password_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
