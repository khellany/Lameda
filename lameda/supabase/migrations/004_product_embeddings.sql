-- =============================================================
-- MIGRATION 004: Product embeddings for semantic vector search
-- =============================================================
-- Enables pgvector-based semantic search on the product catalog.
--
-- Model: OpenAI text-embedding-3-small (1536 dimensions)
-- Each product row gets one embedding derived from:
--   name | description | category
--
-- Search flow:
--   1. Embed the customer's query (text or image-derived keywords)
--   2. Call search_products_by_embedding() RPC
--   3. Returns products ranked by cosine similarity (highest first)
--   4. Application falls back to pg_trgm if no rows exceed threshold
--
-- TUNING NOTE:
--   ivfflat `lists` should be sqrt(row_count). At ~100 products use 10,
--   at ~10k products retune to 100. Rebuild with REINDEX after bulk loads.
-- =============================================================

-- pgvector extension (Supabase enables this by default on paid plans)
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_embeddings (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  merchant_id    UUID        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  text_content   TEXT        NOT NULL,                          -- content that was embedded (for debugging)
  embedding      vector(1536) NOT NULL,                        -- OpenAI text-embedding-3-small
  model_version  VARCHAR(50) NOT NULL DEFAULT 'text-embedding-3-small',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id)                                           -- one embedding per product
);

COMMENT ON TABLE product_embeddings IS
  'Text embeddings for semantic product search. One row per product, regenerated when name/description/category changes.';

CREATE INDEX IF NOT EXISTS idx_product_embeddings_product  ON product_embeddings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_embeddings_merchant ON product_embeddings(merchant_id);

-- IVFFlat ANN index — cosine distance
CREATE INDEX IF NOT EXISTS idx_product_embeddings_vector
  ON product_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- ---------------------------------------------------------------
-- RPC: semantic similarity search
-- Called via supabase.rpc('search_products_by_embedding', { ... })
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION search_products_by_embedding(
  p_merchant_id UUID,
  p_embedding   vector(1536),
  p_threshold   FLOAT DEFAULT 0.5,
  p_limit       INT   DEFAULT 5
)
RETURNS TABLE (
  id          UUID,
  name        TEXT,
  description TEXT,
  price_kobo  BIGINT,
  category    TEXT,
  sizes       TEXT[],
  colors      TEXT[],
  image_url   TEXT,
  similarity  FLOAT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    p.id,
    p.name::TEXT,
    p.description::TEXT,
    p.price_kobo::BIGINT,
    p.category::TEXT,
    p.sizes,
    p.colors,
    p.image_url::TEXT,
    (1.0 - (pe.embedding <=> p_embedding))::FLOAT AS similarity
  FROM products p
  INNER JOIN product_embeddings pe ON pe.product_id = p.id
  WHERE p.merchant_id  = p_merchant_id
    AND p.is_active    = TRUE
    AND (1.0 - (pe.embedding <=> p_embedding)) > p_threshold
  ORDER BY pe.embedding <=> p_embedding
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION search_products_by_embedding IS
  'Returns products ranked by cosine similarity to the supplied embedding vector. Threshold default 0.5 means >50% similar.';
