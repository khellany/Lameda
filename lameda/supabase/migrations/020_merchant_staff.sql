-- Migration 020: merchant_staff table + role-based access
--
-- Adds a merchant_staff table so business owners (admin role) can invite
-- sales reps who get their own login with a restricted view of the dashboard.
--
-- Role definitions:
--   admin      — the merchant owner; full dashboard access
--   sales_rep  — invited staff; can view Orders, Customers, Handoffs only
--
-- The merchant owner's role is implicitly 'admin' (they exist in merchants.auth_user_id).
-- Staff exist in merchant_staff with an explicit role column.

CREATE TABLE IF NOT EXISTS merchant_staff (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id     uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  auth_user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role            text NOT NULL DEFAULT 'sales_rep'
                    CHECK (role IN ('sales_rep')),
  name            text NOT NULL,
  email           text NOT NULL,        -- AES-256-GCM encrypted PII
  email_hash      text NOT NULL,        -- SHA-256 hash for lookups (not reversed to plaintext)
  is_active       boolean NOT NULL DEFAULT true,
  invited_by      uuid NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchant_staff_merchant
  ON merchant_staff(merchant_id);

CREATE INDEX IF NOT EXISTS idx_merchant_staff_auth_user
  ON merchant_staff(auth_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_merchant_staff_email_hash
  ON merchant_staff(merchant_id, email_hash);
