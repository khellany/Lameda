-- Migration 011: Admin Telegram Chat ID
--
-- Allows a merchant to link their personal Telegram account as the admin
-- of their bot. Once linked, they can send /addproduct, /listproducts,
-- /updatestock, and /orders directly in the bot chat.
--
-- Set by sending /register <api_key> to the merchant's own bot.

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS admin_telegram_chat_id TEXT;

COMMENT ON COLUMN merchants.admin_telegram_chat_id IS
  'Telegram chat ID of the business owner. Authenticated by sending '
  '/register <api_key> to the merchant''s own bot. Used to gate admin '
  'commands. NULL = no admin registered yet.';
