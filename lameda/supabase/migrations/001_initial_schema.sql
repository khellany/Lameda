-- =============================================================
-- MIGRATION 001: Initial Schema
-- Lameda Conversational Commerce Platform
-- Created: June 2026
-- =============================================================
-- IMPORTANT: All money values stored in kobo (1 NGN = 100 kobo).
-- Never store Naira floats - floating point arithmetic causes
-- rounding errors in financial calculations.
--
-- NDPR COMPLIANCE:
-- - customers table contains PII (phone numbers).
-- - The anonymize_customer() function at the bottom of this file
--   handles right-to-erasure requests per NDPR Article 26.
-- - audit_logs table is append-only (no UPDATE/DELETE policies).
-- =============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";       -- pgvector for product embeddings
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- Fuzzy text search on product names

-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE subscription_tier AS ENUM ('starter', 'growth', 'pro');
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'suspended', 'cancelled');
CREATE TYPE conversation_status AS ENUM ('active', 'idle', 'closed');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed', 'refunded');
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE message_type AS ENUM ('text', 'image', 'button', 'list', 'template');
CREATE TYPE webhook_source AS ENUM ('termii', 'paystack');
CREATE TYPE webhook_status AS ENUM ('received', 'processed', 'failed', 'duplicate');
CREATE TYPE actor_type AS ENUM ('merchant', 'customer', 'system', 'admin');
CREATE TYPE delivery_method AS ENUM ('pickup', 'delivery');

-- =============================================================
-- UTILITY: auto-update updated_at on every mutable table
-- =============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- TABLE: merchants
-- One row per merchant account.
-- =============================================================

CREATE TABLE merchants (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Identity
  business_name           TEXT NOT NULL CHECK (char_length(business_name) BETWEEN 1 AND 200),
  owner_name              TEXT NOT NULL CHECK (char_length(owner_name) BETWEEN 1 AND 200),
  email                   TEXT NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),

  -- WhatsApp
  whatsapp_number         TEXT NOT NULL UNIQUE,
  termii_instance_id      TEXT,

  -- Subscription
  subscription_tier       subscription_tier NOT NULL DEFAULT 'starter',
  subscription_status     subscription_status NOT NULL DEFAULT 'trial',
  trial_ends_at           TIMESTAMPTZ,
  paystack_customer_code  TEXT,

  -- Bot configuration
  bot_name                TEXT NOT NULL DEFAULT 'Lameda',
  bot_personality         TEXT CHECK (char_length(bot_personality) <= 1000),

  -- NDPR: explicit consent timestamp for data processing
  ndpr_consent_at         TIMESTAMPTZ,

  is_active               BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TRIGGER merchants_updated_at
  BEFORE UPDATE ON merchants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- TABLE: customers
-- End customers who interact with merchant bots via WhatsApp.
-- CONTAINS PII - subject to NDPR right-to-erasure.
-- =============================================================

CREATE TABLE customers (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  merchant_id             UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  phone_number            TEXT NOT NULL,            -- PII: anonymized on erasure request
  display_name            TEXT,                     -- PII: set null on erasure
  whatsapp_name           TEXT,                     -- PII: set null on erasure

  -- NDPR consent tracking
  opted_in                BOOLEAN NOT NULL DEFAULT FALSE,
  opted_in_at             TIMESTAMPTZ,
  opted_out_at            TIMESTAMPTZ,

  language_preference     TEXT NOT NULL DEFAULT 'en',
  metadata                JSONB NOT NULL DEFAULT '{}',

  UNIQUE (merchant_id, phone_number)
);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- TABLE: products
-- Merchant product catalog.
-- =============================================================

CREATE TABLE products (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  merchant_id             UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 300),
  description             TEXT CHECK (char_length(description) <= 2000),

  -- Money in kobo (1 NGN = 100 kobo). Never store as float.
  price_kobo              BIGINT NOT NULL CHECK (price_kobo >= 0),

  category                TEXT,
  sizes                   TEXT[] NOT NULL DEFAULT '{}',
  colors                  TEXT[] NOT NULL DEFAULT '{}',
  stock_count             INT CHECK (stock_count >= 0),
  image_url               TEXT,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  metadata                JSONB NOT NULL DEFAULT '{}'
);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigram index for fuzzy product name search (pidgin spellings)
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX idx_products_merchant_active ON products (merchant_id, is_active);

-- =============================================================
-- TABLE: product_embeddings
-- pgvector embeddings for semantic catalog search.
-- One row per product.
-- =============================================================

CREATE TABLE product_embeddings (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  product_id              UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  merchant_id             UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

  -- OpenAI text-embedding-ada-002 outputs 1536 dimensions
  embedding               vector(1536) NOT NULL,
  embedding_text          TEXT NOT NULL    -- The text that was embedded (for re-embedding on update)
);

-- IVFFlat index for approximate nearest-neighbor search
-- lists=100 is recommended for tables under 1M rows
CREATE INDEX idx_product_embeddings_vector
  ON product_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- =============================================================
-- TABLE: conversations
-- Active conversation sessions. State machine state stored in JSONB.
-- Cart is a JSONB column, not a separate table, to allow atomic updates.
-- =============================================================

CREATE TABLE conversations (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  merchant_id             UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  customer_id             UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  status                  conversation_status NOT NULL DEFAULT 'active',

  -- Full state machine state (phase, intent, collected fields)
  state                   JSONB NOT NULL DEFAULT '{"phase": "greeting"}',

  current_intent          TEXT,

  -- Shopping cart: { items: [...], total_kobo: number }
  -- Stored inline for atomic read/write in a single query
  cart                    JSONB NOT NULL DEFAULT '{"items": [], "total_kobo": 0}',

  last_message_at         TIMESTAMPTZ,
  message_count           INT NOT NULL DEFAULT 0
);

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_conversations_merchant_customer ON conversations (merchant_id, customer_id, status);
CREATE INDEX idx_conversations_last_message ON conversations (last_message_at) WHERE status = 'active';

-- =============================================================
-- TABLE: messages
-- Full message history, inbound and outbound.
-- =============================================================

CREATE TABLE messages (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  conversation_id         UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  merchant_id             UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  customer_id             UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  direction               message_direction NOT NULL,
  content                 TEXT NOT NULL CHECK (char_length(content) <= 4096),
  message_type            message_type NOT NULL DEFAULT 'text',

  -- ID from Termii or Paystack for correlation
  external_message_id     TEXT,

  metadata                JSONB NOT NULL DEFAULT '{}'
);

-- No UPDATE trigger - messages are append-only
CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at DESC);
CREATE INDEX idx_messages_merchant ON messages (merchant_id, created_at DESC);

-- =============================================================
-- TABLE: orders
-- =============================================================

CREATE TABLE orders (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  merchant_id             UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  customer_id             UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  conversation_id         UUID NOT NULL REFERENCES conversations(id),

  status                  order_status NOT NULL DEFAULT 'pending',

  -- Line items: [{ product_id, name, price_kobo, qty, size, color }]
  line_items              JSONB NOT NULL DEFAULT '[]',

  subtotal_kobo           BIGINT NOT NULL CHECK (subtotal_kobo >= 0),
  delivery_fee_kobo       BIGINT NOT NULL DEFAULT 0 CHECK (delivery_fee_kobo >= 0),
  total_kobo              BIGINT NOT NULL CHECK (total_kobo >= 0),

  delivery_address        TEXT,
  delivery_method         delivery_method,
  notes                   TEXT CHECK (char_length(notes) <= 1000),

  -- Unique human-readable reference (e.g. LMD-20260607-XXXX)
  reference               TEXT NOT NULL UNIQUE
);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_orders_merchant ON orders (merchant_id, created_at DESC);
CREATE INDEX idx_orders_customer ON orders (customer_id);
CREATE INDEX idx_orders_status ON orders (status);

-- =============================================================
-- TABLE: payments
-- =============================================================

CREATE TABLE payments (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  order_id                UUID NOT NULL REFERENCES orders(id),
  merchant_id             UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

  status                  payment_status NOT NULL DEFAULT 'pending',
  amount_kobo             BIGINT NOT NULL CHECK (amount_kobo > 0),
  currency                TEXT NOT NULL DEFAULT 'NGN',

  paystack_reference      TEXT NOT NULL UNIQUE,
  paystack_access_code    TEXT,

  payment_channel         TEXT,
  paid_at                 TIMESTAMPTZ,
  metadata                JSONB NOT NULL DEFAULT '{}'
);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- TABLE: webhook_events
-- Raw webhook log for idempotency and debugging.
-- Every inbound webhook is recorded before processing.
-- =============================================================

CREATE TABLE webhook_events (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  source                  webhook_source NOT NULL,
  event_type              TEXT NOT NULL,
  external_id             TEXT,
  status                  webhook_status NOT NULL DEFAULT 'received',
  payload                 JSONB NOT NULL,
  error_message           TEXT,
  processed_at            TIMESTAMPTZ
);

-- Idempotency: fast lookup by external_id per source
CREATE UNIQUE INDEX idx_webhook_events_dedup
  ON webhook_events (source, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX idx_webhook_events_status ON webhook_events (status, created_at DESC);

-- =============================================================
-- TABLE: audit_logs
-- Append-only log for NDPR compliance and security audit.
-- No UPDATE or DELETE allowed via RLS.
-- =============================================================

CREATE TABLE audit_logs (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  merchant_id             UUID REFERENCES merchants(id) ON DELETE SET NULL,
  actor_id                UUID,
  actor_type              actor_type NOT NULL DEFAULT 'system',
  action                  TEXT NOT NULL,
  resource_type           TEXT NOT NULL,
  resource_id             UUID,
  metadata                JSONB NOT NULL DEFAULT '{}',
  ip_address              TEXT
  -- No updated_at - this table is append-only
);

CREATE INDEX idx_audit_logs_merchant ON audit_logs (merchant_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id, created_at DESC);

-- =============================================================
-- NDPR: Right to erasure procedure
-- Call this when a customer submits a deletion request.
-- Anonymizes PII while preserving order/financial records.
-- =============================================================

CREATE OR REPLACE FUNCTION anonymize_customer(p_customer_id UUID)
RETURNS VOID AS $$
DECLARE
  anon_phone TEXT := 'DELETED-' || LEFT(p_customer_id::TEXT, 8);
BEGIN
  UPDATE customers SET
    phone_number    = anon_phone,
    display_name    = NULL,
    whatsapp_name   = NULL,
    opted_in        = FALSE,
    opted_out_at    = NOW(),
    metadata        = '{}'
  WHERE id = p_customer_id;

  -- Anonymize message content for this customer
  UPDATE messages SET
    content = '[Message removed - NDPR erasure]',
    metadata = '{}'
  WHERE customer_id = p_customer_id;

  -- Log the erasure (without PII)
  INSERT INTO audit_logs (actor_type, action, resource_type, resource_id, metadata)
  VALUES (
    'system',
    'ndpr_erasure',
    'customer',
    p_customer_id,
    jsonb_build_object('erased_at', NOW(), 'reason', 'customer_request')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
