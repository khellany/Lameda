-- Migration 009: Merchant self-service onboarding fields
-- Adds per-merchant API key for CSV import / admin operations
-- Makes whatsapp_number nullable: Telegram-first merchants may not need WhatsApp

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;

-- whatsapp_number was NOT NULL; Telegram merchants don't need it
ALTER TABLE merchants
  ALTER COLUMN whatsapp_number DROP NOT NULL;

-- Index for fast API key lookup on every import/embed request
CREATE INDEX IF NOT EXISTS idx_merchants_api_key
  ON merchants (api_key)
  WHERE api_key IS NOT NULL;
