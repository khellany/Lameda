-- Migration 018: Bot health monitoring + merchant directory opt-in
--
-- STORY-033 (Sprint 7 stretch)
-- Adds three columns to merchants:
--   is_directory_listed — merchant can opt in to the public /discover directory
--   bot_health_score    — 0-100 score written by the /api/cron/bot-health job
--   bot_health_checked_at — last time the cron ran for this merchant

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS is_directory_listed  BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bot_health_score     SMALLINT,
  ADD COLUMN IF NOT EXISTS bot_health_checked_at TIMESTAMPTZ;

-- Partial index: directory query only touches opted-in active merchants
CREATE INDEX IF NOT EXISTS idx_merchants_directory
  ON merchants (business_name)
  WHERE is_active = true AND is_directory_listed = true;

-- Optional composite index for the cron (fetches all active merchants with tokens)
CREATE INDEX IF NOT EXISTS idx_merchants_health_check
  ON merchants (id)
  WHERE is_active = true;
