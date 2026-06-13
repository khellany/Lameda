-- Migration 014: Deactivate guessable test merchant (docs/SECURITY.md VULN-002)
--
-- The test merchant used a weak, guessable API key ('lmd_test123'). Production
-- keys are 32-char hex (lmd_<uuid-without-dashes>). Deactivating removes the
-- attack surface before launch: resolveMerchantFromApiKey() filters on
-- is_active = true, so a deactivated merchant can no longer authenticate.
--
-- Idempotent: affects 0 rows if the test merchant was already removed.

UPDATE merchants
SET is_active = false,
    updated_at = now()
WHERE api_key = 'lmd_test123';
