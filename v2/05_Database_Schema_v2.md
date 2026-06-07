# Lameda - Database Schema v2
**Version:** 2.0 | **Date:** May 2026 | **Engine:** PostgreSQL 15 + pgvector + Supabase RLS

---

## Changelog from v1
- Added `subscription_plans` table
- Added `product_embeddings` table (CLIP vectors via pgvector)
- Added `webhook_events` table (idempotency + retry tracking)
- Added `audit_logs` table (NDPR compliance)
- Added `customer_preferences` table (replaces flat memory_json)
- Added `conversation_id` FK to `orders`
- Added `idempotency_key` to `payments`
- Added `embedding_version` to `products`
- Added all missing indexes (GIN, ivfflat, composite)

---

## Extensions Required

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;        -- pgvector for CLIP embeddings
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- trigram for fuzzy text search
```

---

## Tables

### merchants
```sql
CREATE TABLE merchants (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                VARCHAR(255) NOT NULL,
  email               VARCHAR(255) UNIQUE NOT NULL,
  phone               VARCHAR(20) UNIQUE NOT NULL,
  password_hash       VARCHAR(255) NOT NULL,
  business_name       VARCHAR(255),
  business_category   VARCHAR(100) DEFAULT 'fashion',
  persona_name        VARCHAR(100) DEFAULT 'Lameda',
  language            VARCHAR(10) DEFAULT 'en',           -- en, pcm (Nigerian Pidgin)
  timezone            VARCHAR(50) DEFAULT 'Africa/Lagos',
  business_hours      JSONB DEFAULT '{"mon-fri":"09:00-18:00","sat":"10:00-15:00"}',
  delivery_policy     TEXT,
  return_policy       TEXT,
  whatsapp_number     VARCHAR(20),
  whatsapp_connected  BOOLEAN DEFAULT FALSE,
  plan_id             UUID REFERENCES subscription_plans(id),
  trial_ends_at       TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  subscription_status VARCHAR(20) DEFAULT 'trial',        -- trial, active, past_due, cancelled
  ndpr_consent_given  BOOLEAN DEFAULT FALSE,
  ndpr_consent_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_merchants_email ON merchants(email);
CREATE INDEX idx_merchants_whatsapp ON merchants(whatsapp_number);
CREATE INDEX idx_merchants_plan ON merchants(plan_id);
```

### subscription_plans
```sql
CREATE TABLE subscription_plans (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                    VARCHAR(50) NOT NULL,           -- Starter, Growth, Pro
  monthly_price_ngn       INTEGER NOT NULL,               -- 10000, 15000, 25000
  conversation_limit      INTEGER,                        -- NULL = unlimited
  product_limit           INTEGER,                        -- 100, 500, NULL
  broadcast_limit         INTEGER,                        -- 1000, 5000, NULL per month
  analytics_retention_days INTEGER DEFAULT 30,
  human_handoff_enabled   BOOLEAN DEFAULT TRUE,
  api_access_enabled      BOOLEAN DEFAULT FALSE,
  whitelabel_enabled      BOOLEAN DEFAULT FALSE,
  features                JSONB DEFAULT '[]',
  is_active               BOOLEAN DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO subscription_plans (name, monthly_price_ngn, conversation_limit, product_limit, broadcast_limit) VALUES
  ('Starter', 10000, 500, 100, 1000),
  ('Growth',  15000, 2000, 500, 5000),
  ('Pro',     25000, NULL, NULL, NULL);
```

### products
```sql
CREATE TABLE products (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id      UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name             VARCHAR(255) NOT NULL,
  description      TEXT,
  price            BIGINT NOT NULL,                       -- stored in kobo (lowest denomination)
  category         VARCHAR(100),
  sku              VARCHAR(100),
  stock_qty        INTEGER DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE,
  embedding_version VARCHAR(20),                          -- e.g. "clip-vit-b32-v1" for migration tracking
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(merchant_id, sku)
);

CREATE INDEX idx_products_merchant ON products(merchant_id);
CREATE INDEX idx_products_category ON products(merchant_id, category);
CREATE INDEX idx_products_active ON products(merchant_id, is_active);
CREATE INDEX idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);  -- fuzzy search
CREATE INDEX idx_products_description_fts ON products USING GIN(to_tsvector('english', COALESCE(description,'')));
```

### product_embeddings
```sql
CREATE TABLE product_embeddings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url        TEXT NOT NULL,
  embedding        vector(512) NOT NULL,                  -- CLIP ViT-B/32 output dimension
  model_version    VARCHAR(50) NOT NULL DEFAULT 'clip-vit-b32-v1',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, image_url)
);

-- ivfflat index for approximate nearest-neighbour search
CREATE INDEX idx_product_embeddings_vector ON product_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_product_embeddings_product ON product_embeddings(product_id);
```

### product_variants
```sql
CREATE TABLE product_variants (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size             VARCHAR(20),
  color            VARCHAR(50),
  stock_qty        INTEGER DEFAULT 0,
  price_adjustment BIGINT DEFAULT 0,                      -- delta from base price in kobo
  sku_variant      VARCHAR(100),
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_active ON product_variants(product_id, is_active);
```

### customers
```sql
CREATE TABLE customers (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id      UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  phone            VARCHAR(20) NOT NULL,
  name             VARCHAR(255),
  email            VARCHAR(255),
  tags             TEXT[] DEFAULT '{}',
  total_orders     INTEGER DEFAULT 0,
  total_spent      BIGINT DEFAULT 0,                      -- kobo
  last_active_at   TIMESTAMPTZ,
  opted_out        BOOLEAN DEFAULT FALSE,                 -- NDPR: opted out of marketing
  opted_out_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(merchant_id, phone)
);

CREATE INDEX idx_customers_merchant ON customers(merchant_id);
CREATE INDEX idx_customers_phone ON customers(merchant_id, phone);
CREATE INDEX idx_customers_tags ON customers USING GIN(tags);
```

### customer_preferences
```sql
CREATE TABLE customer_preferences (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id           UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  language              VARCHAR(10) DEFAULT 'en',
  preferred_sizes       TEXT[] DEFAULT '{}',
  preferred_colors      TEXT[] DEFAULT '{}',
  marketing_consent     BOOLEAN DEFAULT FALSE,
  marketing_consent_at  TIMESTAMPTZ,
  conversation_summary  TEXT,                             -- AI-generated summary of history
  last_conversation_id  UUID,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id)
);

CREATE INDEX idx_customer_prefs_customer ON customer_preferences(customer_id);
```

### conversations
```sql
CREATE TABLE conversations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id      UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  customer_id      UUID NOT NULL REFERENCES customers(id),
  channel_type     VARCHAR(20) DEFAULT 'whatsapp',
  status           VARCHAR(30) DEFAULT 'active',          -- active, waiting_human, human_active, closed
  ai_confidence    FLOAT,                                 -- last AI confidence score
  handoff_reason   TEXT,
  assigned_to      UUID REFERENCES merchants(id),
  context_json     JSONB DEFAULT '{}',                    -- cart state, current intent
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  last_message_at  TIMESTAMPTZ DEFAULT NOW(),
  closed_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_merchant ON conversations(merchant_id);
CREATE INDEX idx_conversations_customer ON conversations(customer_id);
CREATE INDEX idx_conversations_status ON conversations(merchant_id, status);
CREATE INDEX idx_conversations_last_msg ON conversations(merchant_id, last_message_at DESC);
```

### messages
```sql
CREATE TABLE messages (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type      VARCHAR(20) NOT NULL,                  -- customer, ai, merchant
  sender_id        UUID,
  message_type     VARCHAR(20) DEFAULT 'text',            -- text, image, order_card, payment_link
  body_text        TEXT,
  payload_json     JSONB DEFAULT '{}',                    -- structured card data
  ai_intent        VARCHAR(100),
  ai_confidence    FLOAT,
  channel_msg_id   VARCHAR(255),                          -- WhatsApp message ID
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(conversation_id, created_at DESC);
```

### orders
```sql
CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id      UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  customer_id      UUID NOT NULL REFERENCES customers(id),
  conversation_id  UUID REFERENCES conversations(id),     -- NEW in v2
  order_number     VARCHAR(20) UNIQUE NOT NULL,           -- ORD-XXXX
  status           VARCHAR(30) DEFAULT 'pending',         -- pending, confirmed, processing, dispatched, delivered, cancelled, refunded
  subtotal         BIGINT NOT NULL,                       -- kobo
  delivery_fee     BIGINT DEFAULT 0,
  discount         BIGINT DEFAULT 0,
  total            BIGINT NOT NULL,
  delivery_address JSONB,
  delivery_notes   TEXT,
  cancelled_reason TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_merchant ON orders(merchant_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_conversation ON orders(conversation_id);
CREATE INDEX idx_orders_status ON orders(merchant_id, status);
CREATE INDEX idx_orders_created ON orders(merchant_id, created_at DESC);
```

### order_items
```sql
CREATE TABLE order_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products(id),
  variant_id       UUID REFERENCES product_variants(id),
  product_name     VARCHAR(255) NOT NULL,                 -- snapshot at order time
  variant_label    VARCHAR(100),
  unit_price       BIGINT NOT NULL,
  quantity         INTEGER NOT NULL DEFAULT 1,
  line_total       BIGINT NOT NULL
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
```

### payments
```sql
CREATE TABLE payments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider         VARCHAR(20) DEFAULT 'paystack',
  reference        VARCHAR(100) UNIQUE NOT NULL,
  idempotency_key  VARCHAR(100) UNIQUE NOT NULL,          -- NEW in v2: prevents double-charge
  amount           BIGINT NOT NULL,
  currency         VARCHAR(3) DEFAULT 'NGN',
  status           VARCHAR(20) DEFAULT 'pending',         -- pending, success, failed, refunded
  provider_response JSONB DEFAULT '{}',
  paid_at          TIMESTAMPTZ,
  refunded_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_reference ON payments(reference);
CREATE INDEX idx_payments_status ON payments(status);
```

### broadcasts
```sql
CREATE TABLE broadcasts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id      UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name             VARCHAR(255),
  message_text     TEXT NOT NULL,
  image_url        TEXT,
  audience_filter  JSONB DEFAULT '{}',
  recipient_count  INTEGER DEFAULT 0,
  sent_count       INTEGER DEFAULT 0,
  failed_count     INTEGER DEFAULT 0,
  status           VARCHAR(20) DEFAULT 'draft',           -- draft, scheduled, sending, sent, failed
  scheduled_at     TIMESTAMPTZ,
  sent_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_broadcasts_merchant ON broadcasts(merchant_id);
CREATE INDEX idx_broadcasts_status ON broadcasts(merchant_id, status);
```

### webhook_events
```sql
CREATE TABLE webhook_events (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source           VARCHAR(30) NOT NULL,                  -- whatsapp, paystack, system
  event_type       VARCHAR(100) NOT NULL,
  idempotency_key  VARCHAR(255) UNIQUE NOT NULL,          -- prevents duplicate processing
  payload          JSONB NOT NULL,
  status           VARCHAR(20) DEFAULT 'pending',         -- pending, processed, failed, skipped
  retry_count      INTEGER DEFAULT 0,
  last_error       TEXT,
  processed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_source ON webhook_events(source, event_type);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_idempotency ON webhook_events(idempotency_key);
CREATE INDEX idx_webhook_events_created ON webhook_events(created_at DESC);
```

### audit_logs
```sql
-- NDPR compliance: immutable log of all data access and mutations
CREATE TABLE audit_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_type       VARCHAR(20) NOT NULL,                  -- merchant, customer, system, admin
  actor_id         UUID NOT NULL,
  action           VARCHAR(50) NOT NULL,                  -- CREATE, READ, UPDATE, DELETE, EXPORT, ERASE
  resource_type    VARCHAR(50) NOT NULL,                  -- customer, order, conversation, product
  resource_id      UUID NOT NULL,
  before_json      JSONB,                                 -- NULL for CREATE
  after_json       JSONB,                                 -- NULL for DELETE
  ip_address       INET,
  user_agent       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
  -- No UPDATE or DELETE on this table - append-only via RLS
);

CREATE INDEX idx_audit_actor ON audit_logs(actor_type, actor_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
```

---

## Row Level Security (Supabase RLS)

```sql
-- Merchants can only access their own data
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY merchant_owns_products ON products
  USING (merchant_id = auth.uid());

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY merchant_owns_customers ON customers
  USING (merchant_id = auth.uid());

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY merchant_owns_orders ON orders
  USING (merchant_id = auth.uid());

-- audit_logs: merchants can read their own, but not write directly
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY merchant_reads_own_audit ON audit_logs
  FOR SELECT USING (actor_id = auth.uid() OR resource_id IN (
    SELECT id FROM customers WHERE merchant_id = auth.uid()
  ));
```

---

## NDPR Data Erasure Procedure

```sql
-- Called when merchant or customer invokes right to erasure
CREATE OR REPLACE FUNCTION erase_customer_data(p_customer_id UUID, p_requested_by UUID)
RETURNS void AS $$
BEGIN
  -- Log the erasure request first
  INSERT INTO audit_logs(actor_type, actor_id, action, resource_type, resource_id)
  VALUES ('merchant', p_requested_by, 'ERASE', 'customer', p_customer_id);

  -- Anonymise PII (do not hard-delete to preserve order integrity)
  UPDATE customers SET
    name = 'ERASED',
    email = NULL,
    phone = 'ERASED-' || SUBSTR(phone, -4),
    updated_at = NOW()
  WHERE id = p_customer_id;

  UPDATE customer_preferences SET
    conversation_summary = NULL,
    notes = NULL,
    updated_at = NOW()
  WHERE customer_id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
