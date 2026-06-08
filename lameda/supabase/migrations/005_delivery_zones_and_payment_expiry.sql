-- =============================================================
-- MIGRATION 005: Delivery zones, merchant pickup, payment expiry
-- =============================================================

-- Merchant-configurable delivery zones.
-- Each zone has a name, area keywords, and a fee.
-- The bot matches the customer's address against keywords to apply the right fee.
-- One zone per merchant can be flagged is_default (catchall).
--
-- Example zones for a Lagos merchant:
--   Lagos Island  | keywords: [lekki, victoria, ikoyi, island]   | ₦2,500
--   Lagos Mainland| keywords: [ikeja, surulere, yaba, mushin]      | ₦1,500
--   Abuja         | keywords: [abuja, fct, wuse, maitama, garki]   | ₦5,000
--   Default       | keywords: []                                    | ₦3,000

CREATE TABLE IF NOT EXISTS merchant_delivery_zones (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID    NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  zone_name   TEXT    NOT NULL,
  keywords    TEXT[]  NOT NULL DEFAULT '{}',
  fee_kobo    BIGINT  NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delivery_zones_merchant ON merchant_delivery_zones(merchant_id, sort_order);

-- Merchant-level defaults
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS pickup_address          TEXT,
  ADD COLUMN IF NOT EXISTS default_delivery_fee_kobo BIGINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN merchants.pickup_address IS
  'Physical pickup address shown to customers who choose pickup at checkout.';
COMMENT ON COLUMN merchants.default_delivery_fee_kobo IS
  'Fallback delivery fee when no zone matches the customer address. In kobo.';

-- Payment link expiry tracking
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

COMMENT ON COLUMN payments.expires_at IS
  'When the Paystack payment link expires. NULL = no expiry tracked. Used by cron to send regeneration reminders.';

-- Abandoned cart recovery — track when recovery messages were sent
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS cart_recovery_1_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cart_recovery_2_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN conversations.cart_recovery_1_sent_at IS
  'Timestamp of first cart recovery message (sent 15 min after abandonment).';
COMMENT ON COLUMN conversations.cart_recovery_2_sent_at IS
  'Timestamp of second cart recovery message (sent 2 hours after abandonment).';
