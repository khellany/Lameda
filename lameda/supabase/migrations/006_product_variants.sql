-- =============================================================
-- MIGRATION 006: Product variants with per-variant stock
-- =============================================================
-- Replaces the flat sizes[] and colors[] arrays with a proper
-- variants table that tracks stock per size+color combination.
--
-- The bot uses this to:
--   1. Show only in-stock sizes/colors in selection menus
--   2. Reserve stock when a specific variant is added to cart
--
-- Existing products without variants rows continue to use the
-- parent product's stock_count (backward compatible).
-- =============================================================

CREATE TABLE IF NOT EXISTS product_variants (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID    NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  merchant_id UUID    NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  size        TEXT,                         -- NULL if product has no sizes
  color       TEXT,                         -- NULL if product has no colors
  stock_count INTEGER NOT NULL DEFAULT 0,
  sku_variant TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE NULLS NOT DISTINCT (product_id, size, color)
);

CREATE INDEX idx_product_variants_product  ON product_variants(product_id);
CREATE INDEX idx_product_variants_merchant ON product_variants(merchant_id);
CREATE INDEX idx_product_variants_active   ON product_variants(product_id, is_active)
  WHERE is_active = TRUE;

COMMENT ON TABLE product_variants IS
  'Per size+color stock tracking. One row per unique size/color combination per product. '
  'Products without variant rows fall back to products.stock_count.';
