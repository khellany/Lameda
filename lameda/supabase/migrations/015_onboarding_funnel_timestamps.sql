-- Migration 015 — STORY-028: Onboarding funnel timestamps
--
-- Adds two nullable timestamps to merchants that mark when each merchant
-- completed key onboarding funnel steps. Used to measure the ≥70% onboarding
-- completion criterion without a separate events table.
--
-- Funnel:
--   1. form-start        → /onboard page view (Vercel Analytics, no DB needed)
--   2. register          → merchants.created_at (already exists)
--   3. webhook-configured → merchants.webhook_configured_at  ← new
--   4. first-message     → merchants.first_customer_message_at ← new
--
-- Query to measure completion rate:
--   SELECT
--     COUNT(*)                          AS total_registered,
--     COUNT(webhook_configured_at)      AS webhook_configured,
--     COUNT(first_customer_message_at)  AS sent_first_message
--   FROM merchants WHERE is_active = true;

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS webhook_configured_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_customer_message_at TIMESTAMPTZ;

-- Partial index — admin queries filtering on null (incomplete funnel) will be fast.
CREATE INDEX IF NOT EXISTS idx_merchants_funnel_incomplete
  ON merchants (created_at DESC)
  WHERE webhook_configured_at IS NULL OR first_customer_message_at IS NULL;
