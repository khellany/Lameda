-- =============================================================
-- MIGRATION 002: Row Level Security Policies
-- =============================================================
-- RLS is the last line of defense against data leakage between merchants.
-- Even if application code has a bug, RLS prevents cross-merchant access.
--
-- MULTI-TENANCY PATTERN:
-- Every shared table has merchant_id. RLS policies restrict reads/writes
-- to rows belonging to the authenticated merchant's own tenant scope.
--
-- ADMIN BYPASS:
-- The service role key (used in webhook handlers and background jobs)
-- bypasses RLS entirely. This is intentional - webhooks have no user
-- session. Guard usage of createAdminClient() carefully.
-- =============================================================

-- Enable RLS on all tables
ALTER TABLE merchants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs        ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- HELPER: Get the authenticated merchant's ID from JWT claims.
-- Merchants authenticate with Supabase Auth. Their merchant_id is
-- stored in app_metadata.merchant_id at registration time.
-- =============================================================

CREATE OR REPLACE FUNCTION get_merchant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'merchant_id')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================
-- merchants
-- Merchants can only read and update their own row.
-- Insert is handled by the registration API (service role).
-- =============================================================

CREATE POLICY "merchants_select_own"
  ON merchants FOR SELECT TO authenticated
  USING (id = get_merchant_id());

CREATE POLICY "merchants_update_own"
  ON merchants FOR UPDATE TO authenticated
  USING (id = get_merchant_id())
  WITH CHECK (id = get_merchant_id());

-- =============================================================
-- customers
-- Merchants can read/write customers that belong to their account.
-- =============================================================

CREATE POLICY "customers_select_own"
  ON customers FOR SELECT TO authenticated
  USING (merchant_id = get_merchant_id());

CREATE POLICY "customers_insert_own"
  ON customers FOR INSERT TO authenticated
  WITH CHECK (merchant_id = get_merchant_id());

CREATE POLICY "customers_update_own"
  ON customers FOR UPDATE TO authenticated
  USING (merchant_id = get_merchant_id())
  WITH CHECK (merchant_id = get_merchant_id());

-- =============================================================
-- products
-- =============================================================

CREATE POLICY "products_select_own"
  ON products FOR SELECT TO authenticated
  USING (merchant_id = get_merchant_id());

CREATE POLICY "products_insert_own"
  ON products FOR INSERT TO authenticated
  WITH CHECK (merchant_id = get_merchant_id());

CREATE POLICY "products_update_own"
  ON products FOR UPDATE TO authenticated
  USING (merchant_id = get_merchant_id())
  WITH CHECK (merchant_id = get_merchant_id());

CREATE POLICY "products_delete_own"
  ON products FOR DELETE TO authenticated
  USING (merchant_id = get_merchant_id());

-- =============================================================
-- product_embeddings
-- Read-only for merchants (writes via service role from embedding job)
-- =============================================================

CREATE POLICY "product_embeddings_select_own"
  ON product_embeddings FOR SELECT TO authenticated
  USING (merchant_id = get_merchant_id());

-- =============================================================
-- conversations
-- =============================================================

CREATE POLICY "conversations_select_own"
  ON conversations FOR SELECT TO authenticated
  USING (merchant_id = get_merchant_id());

-- Merchants can close or update conversation status from dashboard
CREATE POLICY "conversations_update_own"
  ON conversations FOR UPDATE TO authenticated
  USING (merchant_id = get_merchant_id())
  WITH CHECK (merchant_id = get_merchant_id());

-- =============================================================
-- messages
-- Append-only from merchant perspective (no delete/update)
-- =============================================================

CREATE POLICY "messages_select_own"
  ON messages FOR SELECT TO authenticated
  USING (merchant_id = get_merchant_id());

-- =============================================================
-- orders
-- =============================================================

CREATE POLICY "orders_select_own"
  ON orders FOR SELECT TO authenticated
  USING (merchant_id = get_merchant_id());

CREATE POLICY "orders_update_own"
  ON orders FOR UPDATE TO authenticated
  USING (merchant_id = get_merchant_id())
  WITH CHECK (merchant_id = get_merchant_id());

-- =============================================================
-- payments
-- =============================================================

CREATE POLICY "payments_select_own"
  ON payments FOR SELECT TO authenticated
  USING (merchant_id = get_merchant_id());

-- =============================================================
-- webhook_events
-- Merchants can view their own webhook logs (debugging dashboard)
-- =============================================================

-- webhook_events does not have merchant_id - it is platform-level.
-- Only service role (admin client) accesses it. No merchant RLS policy needed.
-- Authenticated merchants have no direct access to webhook_events.

-- =============================================================
-- audit_logs
-- Merchants can read their own audit trail.
-- NO INSERT via authenticated user - always via service role.
-- No UPDATE or DELETE - append-only.
-- =============================================================

CREATE POLICY "audit_logs_select_own"
  ON audit_logs FOR SELECT TO authenticated
  USING (merchant_id = get_merchant_id());
