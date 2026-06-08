-- Migration 010: PII field-level encryption support
--
-- WHAT CHANGES:
--   Application layer now encrypts PII using AES-256-GCM before writing to DB.
--   Existing TEXT columns (email, owner_name, telegram_bot_token, delivery_address,
--   display_name) hold encrypted ciphertext — no column type change needed.
--
-- SCHEMA CHANGES:
--   merchants.email_hash — HMAC-SHA256 of the email for exact-match CRM search.
--   Searching by encrypted email requires the hash (see src/lib/crypto/hash.ts).
--
-- FIELDS ENCRYPTED AT APPLICATION LAYER (no schema change required):
--   merchants.email                 — owner PII
--   merchants.owner_name            — owner PII
--   merchants.telegram_bot_token    — bot credential
--   orders.delivery_address         — customer physical address
--   customers.display_name          — customer name when provided
--
-- FIELDS NOT ENCRYPTED (intentional — see pii.ts for rationale):
--   customers.phone_number          — Telegram chat IDs (upsert conflict key)
--   merchants.api_key               — credential returned verbatim on creation
--
-- DATA MIGRATION NOTE:
--   Existing rows contain plaintext values. The decryptPii() function handles
--   this gracefully: values not starting with "enc:" are returned as-is.
--   Run a background job to re-encrypt existing rows after this migration:
--     SELECT id, email FROM merchants WHERE email NOT LIKE 'enc:%';
--   Then UPDATE each row with encryptPii(email) + hashForSearch(email).
--   Until then, existing rows are readable but not encrypted.

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS email_hash TEXT;

-- Unique index for merchant lookup by email hash (CRM login, duplicate check)
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchants_email_hash
  ON merchants (email_hash)
  WHERE email_hash IS NOT NULL;

-- Comment the columns so future engineers understand the encryption contract
COMMENT ON COLUMN merchants.email IS
  'AES-256-GCM encrypted (enc:v1:...). Use email_hash for lookups.';

COMMENT ON COLUMN merchants.email_hash IS
  'HMAC-SHA256 of normalized email for indexed search. See src/lib/crypto/hash.ts.';

COMMENT ON COLUMN merchants.owner_name IS
  'AES-256-GCM encrypted (enc:v1:...). Decrypt at application layer before display.';

COMMENT ON COLUMN merchants.telegram_bot_token IS
  'AES-256-GCM encrypted (enc:v1:...). Decrypt before Telegram API calls.';

COMMENT ON COLUMN orders.delivery_address IS
  'AES-256-GCM encrypted (enc:v1:...). Decrypt at application layer before display.';

COMMENT ON COLUMN customers.display_name IS
  'AES-256-GCM encrypted (enc:v1:...) when set. Decrypt before display.';
