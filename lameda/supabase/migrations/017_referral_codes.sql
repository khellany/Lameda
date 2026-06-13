-- Migration 017 — STORY-032: Referral program
--
-- Adds two columns to merchants:
--   referral_code  — the merchant's own shareable code (auto-generated, immutable)
--   referred_by_code — the code the merchant entered when registering (nullable)
--
-- Reward: when a referred merchant registers, the referrer's trial_ends_at
-- is extended by 30 days (applied in application layer, register route).

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS referral_code     TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_code  TEXT;

-- Backfill existing merchants with a deterministic code derived from their UUID.
-- Format: LMD + 5 uppercase alphanumeric chars (no ambiguous 0/O/1/I).
UPDATE merchants
SET referral_code = 'LMD' || UPPER(
  TRANSLATE(SUBSTRING(MD5(id::text), 1, 8), '01', 'XY')
  -- take first 5 non-ambiguous chars
)
WHERE referral_code IS NULL;

-- Truncate to exactly 8 chars total (LMD + 5) to make codes uniform length.
-- The MD5 + translate approach above may produce more; trim in a second pass.
UPDATE merchants
SET referral_code = SUBSTRING(referral_code, 1, 8)
WHERE char_length(referral_code) > 8;

-- Unique index already enforced by UNIQUE constraint above.
-- Partial index on referred_by_code for fast attribution lookups.
CREATE INDEX IF NOT EXISTS idx_merchants_referred_by_code
  ON merchants(referred_by_code)
  WHERE referred_by_code IS NOT NULL;
