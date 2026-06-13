-- Migration 012: Drop email format check constraint on merchants table
--
-- WHY: The email column now stores AES-256-GCM encrypted ciphertext
-- (format: "enc:v1:<iv_hex>:<ciphertext_hex>") rather than plaintext email
-- addresses. The original CHECK constraint enforcing a valid email regex
-- rejects this format with error code 23514.
--
-- The plaintext email value is preserved via the email_hash column
-- (HMAC-SHA256 of the email, used for duplicate detection and search)
-- and can be recovered by decrypting the email column using the PII key.
--
-- SAFE TO RUN: ALTER TABLE ... DROP CONSTRAINT is non-destructive.
-- No data is modified; only the validation rule is removed.

ALTER TABLE merchants
  DROP CONSTRAINT IF EXISTS merchants_email_check;
