-- Migration 019 — STORY-034: Merchant subscription billing (Paystack)
--
-- Wires the existing Paystack webhook to activate merchant subscriptions and
-- moves the referral reward (STORY-032) from registration to first payment.
--
-- New columns on merchants:
--   paystack_subscription_code — Paystack subscription handle (from subscription.create)
--   subscription_renews_at     — next renewal / paid-until date (access boundary)
--   referral_rewarded_at       — set once when this merchant's first payment triggers
--                                the referrer reward; guards against double-rewarding
--                                on renewal charges (which also emit charge.success).
--
-- (paystack_customer_code already exists from migration 001.)

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS paystack_subscription_code TEXT,
  ADD COLUMN IF NOT EXISTS subscription_renews_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS referral_rewarded_at       TIMESTAMPTZ;

-- Fast lookup of a merchant by their Paystack subscription/customer code when a
-- renewal or lifecycle event arrives without our original metadata.
CREATE INDEX IF NOT EXISTS idx_merchants_paystack_subscription_code
  ON merchants(paystack_subscription_code)
  WHERE paystack_subscription_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_merchants_paystack_customer_code
  ON merchants(paystack_customer_code)
  WHERE paystack_customer_code IS NOT NULL;
