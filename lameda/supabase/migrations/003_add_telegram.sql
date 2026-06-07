-- =============================================================
-- MIGRATION 003: Add Telegram bot support to merchants table
-- =============================================================
-- Adds telegram_bot_token column so each merchant can connect
-- their own Telegram bot. The webhook URL per merchant is:
--   /api/webhook/telegram/{merchant_id}
--
-- The bot token is sensitive - never expose it to the client.
-- It is read server-side only via createAdminClient().
-- =============================================================

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT;

-- Add comment for documentation
COMMENT ON COLUMN merchants.telegram_bot_token IS
  'Telegram bot token from BotFather. Server-side only. Used to send messages via Telegram Bot API.';
