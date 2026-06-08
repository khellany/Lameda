-- =============================================================
-- MIGRATION 008: Business type + merchant config
-- =============================================================
-- Enables Lameda to serve multiple business segments beyond fashion.
-- Each merchant declares their business type; the bot uses this to
-- adjust prompts, product terminology, and conversation flow.
--
-- business_type drives:
--   - AI system prompt context ("You are a bot for a food business...")
--   - Product label ("item" vs "dish" vs "service")
--   - Catalog label ("catalog" vs "menu" vs "services")
--   - Variant display (fashion: size/color; food: none; services: none)
--   - Cart behavior (services may use booking instead of cart)
--
-- merchant_config is a JSONB escape hatch for per-merchant overrides
-- on top of the business_type defaults. Examples:
--   {"productLabel": "gown", "hasVariants": true}   (custom fashion override)
--   {"catalogLabel": "menu", "hasDelivery": false}   (eat-in food joint)
-- =============================================================

CREATE TYPE business_type AS ENUM (
  'fashion',
  'food',
  'electronics',
  'beauty',
  'services',
  'general'
);

COMMENT ON TYPE business_type IS
  'The merchant''s primary business segment. Drives bot prompt context, product labels, and conversation flow defaults.';

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS business_type business_type NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS merchant_config JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN merchants.business_type IS
  'Primary business segment. Controls prompt injection and UX defaults.';

COMMENT ON COLUMN merchants.merchant_config IS
  'Per-merchant overrides on top of business_type defaults. See MerchantConfig type in src/lib/merchant/config.ts.';

-- Existing test merchant should stay as-is (general = safe default).
-- Manually UPDATE to business_type = 'fashion' after migration for the test merchant.
