-- =============================================================
-- MIGRATION 007: Add 'telegram' to webhook_source enum
-- =============================================================
-- The webhook_source enum was created in migration 001 with only
-- ('termii', 'paystack'). When Telegram support was added in
-- Sprint 2, the webhook handler temporarily used 'termii' as a
-- placeholder (see technical debt comment in the route file).
--
-- This migration adds the 'telegram' value so that Telegram events
-- are correctly scoped. Without this, deduplication checks on
-- webhook_events could theoretically cross-match Telegram and
-- Termii update_ids if they share the same external_id value.
--
-- NOTE: PostgreSQL does not support removing enum values, only
-- adding them. The 'termii' value remains valid for WhatsApp/Termii
-- webhook events.
-- =============================================================

ALTER TYPE webhook_source ADD VALUE IF NOT EXISTS 'telegram';

COMMENT ON TYPE webhook_source IS
  'Source system that sent the webhook. termii=WhatsApp via Termii, paystack=payment events, telegram=Telegram bot updates.';
