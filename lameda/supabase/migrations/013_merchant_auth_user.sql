-- Migration 013: Link merchants to Supabase auth users
--
-- WHY: The merchant CRM portal uses Supabase Auth for login.
-- When a merchant registers via /onboard, we create both their
-- merchant row AND a Supabase auth user in the same transaction.
-- This column stores that auth user's ID so login sessions can
-- be linked back to the correct merchant record.
--
-- NULLABLE: Merchants registered before this migration have no
-- auth account yet; they can be back-filled later via the admin panel.

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_merchants_auth_user_id
  ON merchants(auth_user_id)
  WHERE auth_user_id IS NOT NULL;
