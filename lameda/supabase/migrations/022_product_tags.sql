-- Add searchable tags to products for customer and AI discovery
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- GIN index enables fast tag-based queries: @> (contains), && (overlap)
CREATE INDEX IF NOT EXISTS idx_products_tags
  ON products USING gin (tags);
