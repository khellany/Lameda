# Lameda — Database Schema
**Version:** 2.1 | **Date:** June 2026 | **Engine:** PostgreSQL 15 + pgvector + Supabase

> **v2.1 update:** This document now reflects the actual database state as of migration 013. Previous v2.0 described a planned schema that diverged from the implementation in column names, table structure, and auth model. The authoritative migration source is `lameda/supabase/migrations/`.

---

## Schema Decisions: Dropped for MVP, Future State Planned

These schema choices were simplified due to resource constraints. Each has a planned future state.

| Ref | Original design | Shipped instead | Reason dropped | Future state |
|-----|----------------|-----------------|----------------|-------------|
| RD-008 | `subscription_plans` table — dynamic plan definitions with price and feature flags | `subscription_tier` enum on `merchants` | 3 static tiers need no dynamic config at MVP. A table adds migration overhead with zero product benefit now. | Restore as a seeded table when plan pricing or feature flags need to change without a code deploy. |
| RD-009 | `customer_preferences` table — language, preferred sizes, colors, AI conversation summaries | `customers.metadata JSONB` | Separate table adds a JOIN on every conversation load. JSONB is schema-flexible at < 10K customers. | Materialise as a normalised table in Sprint 7–8 when building preference-based recommendations and reorder nudges. |
| RD-010 | `order_items` table — normalised line items with product FK | `orders.line_items JSONB` | Avoids JOIN on every order read. JSONB is an atomic snapshot — historical order accuracy preserved even when product prices change. | Add `order_items` for product-level analytics (top-selling SKU, revenue by category). Needed before any BI integration. |
| RD-003 | `product_embeddings.embedding vector(512)` — CLIP ViT-B/32 image vectors | `vector(1536)` — OpenAI text-embedding-3-small | CLIP requires a separate inference endpoint (self-hosted or Replicate). Text embeddings cover 90% of search quality at near-zero cost with no extra infrastructure. | Add `clip_embedding vector(512)` as a second column on `product_embeddings` in Sprint 7–8. Schema already accommodates it. |
| RD-013 | `merchant_bots` join table — multiple Telegram bots per merchant | `merchants.telegram_bot_token` (single column) | 1:1 merchant:bot covers all MVP merchants. Multi-bot adds routing complexity with no current demand. | Extract to `merchant_bots(id, merchant_id, bot_token, bot_name, webhook_url)` when merchants need channel segmentation. |

---

## Migration History

| # | File | What it does |
|---|------|-------------|
| 001 | `001_initial_schema.sql` | Core tables: merchants, customers, products, product_embeddings, conversations, messages, orders, payments, webhook_events, audit_logs. All enums. NDPR erasure function. |
| 002 | `002_rls_policies.sql` | Row Level Security policies — every table locked down by merchant_id scope |
| 003 | `003_add_telegram.sql` | `merchants.telegram_bot_token` (encrypted TEXT) |
| 004 | `004_product_embeddings.sql` | Drops and recreates product_embeddings with OpenAI 1536-dim vectors. Adds `search_products_by_embedding()` RPC. Adds ivfflat index (lists=50). |
| 005 | `005_delivery_zones_and_payment_expiry.sql` | `merchant_delivery_zones` table; `merchants.pickup_address`, `merchants.default_delivery_fee_kobo`; `payments.expires_at`; `conversations.cart_recovery_1_sent_at`, `conversations.cart_recovery_2_sent_at` |
| 006 | `006_product_variants.sql` | `product_variants` table with per-variant stock and UNIQUE NULLS NOT DISTINCT on (product_id, size, color) |
| 007 | `007_telegram_webhook_source.sql` | Adds `'telegram'` to `webhook_source` enum |
| 008 | `008_business_type.sql` | `business_type` enum (`fashion\|food\|electronics\|beauty\|services\|general`); `merchants.business_type`, `merchants.merchant_config JSONB` |
| 009 | `009_merchant_self_service.sql` | `merchants.api_key TEXT UNIQUE`; makes `merchants.whatsapp_number` nullable; index on api_key |
| 010 | `010_pii_encryption.sql` | `merchants.email_hash TEXT` (HMAC-SHA256 for search); unique index; encrypts email/owner_name/telegram_bot_token/orders.delivery_address/customers.display_name at application layer (enc:v1:… format) |
| 011 | `011_admin_telegram.sql` | `merchants.admin_telegram_chat_id TEXT` — merchant owner's personal Telegram ID for admin commands |
| 012 | `012_drop_email_check_constraint.sql` | Drops `merchants_email_check` constraint (rejects AES ciphertext) |
| 013 | `013_merchant_auth_user.sql` | `merchants.auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL` — links merchant row to Supabase Auth account |

---

## Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";     -- pgvector: semantic product search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fuzzy text search (pidgin spellings)
```

---

## Enums

```sql
CREATE TYPE subscription_tier    AS ENUM ('starter', 'growth', 'pro');
CREATE TYPE subscription_status  AS ENUM ('trial', 'active', 'suspended', 'cancelled');
CREATE TYPE conversation_status  AS ENUM ('active', 'idle', 'closed');
CREATE TYPE order_status         AS ENUM ('pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled');
CREATE TYPE payment_status       AS ENUM ('pending', 'success', 'failed', 'refunded');
CREATE TYPE message_direction    AS ENUM ('inbound', 'outbound');
CREATE TYPE message_type         AS ENUM ('text', 'image', 'button', 'list', 'template');
CREATE TYPE webhook_source       AS ENUM ('termii', 'paystack', 'telegram');  -- 'telegram' added in migration 007
CREATE TYPE webhook_status       AS ENUM ('received', 'processed', 'failed', 'duplicate');
CREATE TYPE actor_type           AS ENUM ('merchant', 'customer', 'system', 'admin');
CREATE TYPE delivery_method      AS ENUM ('pickup', 'delivery');
CREATE TYPE business_type        AS ENUM ('fashion', 'food', 'electronics', 'beauty', 'services', 'general');  -- added migration 008
```

---

## Utility Function

```sql
-- Auto-update updated_at on every mutable table
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Table: merchants

One row per merchant account.

> **PII note:** `email`, `owner_name`, `telegram_bot_token` are AES-256-GCM encrypted at the application layer (format: `enc:v1:<iv_hex>:<ciphertext_hex>`). Use `email_hash` for email lookups. Decrypt via `decryptPii()` in `src/lib/crypto/pii.ts`.

```sql
CREATE TABLE merchants (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Identity (PII — encrypted at app layer)
  business_name             TEXT NOT NULL CHECK (char_length(business_name) BETWEEN 1 AND 200),
  owner_name                TEXT NOT NULL,               -- enc:v1:...
  email                     TEXT NOT NULL UNIQUE,        -- enc:v1:... ; use email_hash for search
  email_hash                TEXT UNIQUE,                 -- HMAC-SHA256 of normalised email (migration 010)

  -- Auth
  auth_user_id              UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- migration 013
  api_key                   TEXT UNIQUE,                 -- lmd_... generated at registration (migration 009)

  -- Telegram (migration 003, 009, 011)
  telegram_bot_token        TEXT,                        -- enc:v1:... ; decrypted server-side only
  whatsapp_number           TEXT,                        -- nullable (migration 009); Telegram-first
  termii_instance_id        TEXT,

  -- Business configuration (migration 008)
  business_type             business_type NOT NULL DEFAULT 'general',
  merchant_config           JSONB NOT NULL DEFAULT '{}', -- per-merchant overrides on business_type defaults
  bot_name                  TEXT NOT NULL DEFAULT 'Lameda',
  bot_personality           TEXT CHECK (char_length(bot_personality) <= 1000),
  admin_telegram_chat_id    TEXT,                        -- migration 011: merchant owner's personal Telegram ID

  -- Delivery (migration 005)
  pickup_address            TEXT,
  default_delivery_fee_kobo BIGINT NOT NULL DEFAULT 0,

  -- Subscription
  subscription_tier         subscription_tier NOT NULL DEFAULT 'starter',
  subscription_status       subscription_status NOT NULL DEFAULT 'trial',
  trial_ends_at             TIMESTAMPTZ,
  paystack_customer_code    TEXT,

  -- NDPR
  ndpr_consent_at           TIMESTAMPTZ,

  is_active                 BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TRIGGER merchants_updated_at
  BEFORE UPDATE ON merchants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_merchants_email_hash   ON merchants(email_hash) WHERE email_hash IS NOT NULL;
CREATE INDEX idx_merchants_api_key      ON merchants(api_key) WHERE api_key IS NOT NULL;
CREATE INDEX idx_merchants_auth_user_id ON merchants(auth_user_id) WHERE auth_user_id IS NOT NULL;
```

---

## Table: merchant_delivery_zones

*(Added migration 005)*

Merchant-configurable delivery zones. Bot matches customer address against keywords to select fee.

```sql
CREATE TABLE merchant_delivery_zones (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID    NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  zone_name   TEXT    NOT NULL,
  keywords    TEXT[]  NOT NULL DEFAULT '{}',
  fee_kobo    BIGINT  NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delivery_zones_merchant ON merchant_delivery_zones(merchant_id, sort_order);
```

---

## Table: customers

End customers who interact with merchant bots via Telegram. Contains PII — subject to NDPR right-to-erasure.

> `display_name` is AES-256-GCM encrypted when set (migration 010). `phone_number` is the Telegram chat ID — not encrypted (used as upsert conflict key).

```sql
CREATE TABLE customers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  merchant_id         UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  phone_number        TEXT NOT NULL,         -- Telegram chat_id (not actually a phone — legacy column name)
  display_name        TEXT,                  -- enc:v1:... when set; null on NDPR erasure
  whatsapp_name       TEXT,                  -- legacy; unused in Telegram-first flow

  opted_in            BOOLEAN NOT NULL DEFAULT FALSE,
  opted_in_at         TIMESTAMPTZ,
  opted_out_at        TIMESTAMPTZ,

  language_preference TEXT NOT NULL DEFAULT 'en',
  metadata            JSONB NOT NULL DEFAULT '{}',

  UNIQUE (merchant_id, phone_number)
);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Table: products

Merchant product catalog.

```sql
CREATE TABLE products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 300),
  description TEXT CHECK (char_length(description) <= 2000),
  price_kobo  BIGINT NOT NULL CHECK (price_kobo >= 0),  -- NEVER store as float
  category    TEXT,
  sizes       TEXT[] NOT NULL DEFAULT '{}',             -- legacy flat array; product_variants preferred
  colors      TEXT[] NOT NULL DEFAULT '{}',             -- legacy flat array; product_variants preferred
  stock_count INT CHECK (stock_count >= 0),             -- parent stock; variants override per-variant
  image_url   TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  metadata    JSONB NOT NULL DEFAULT '{}'
);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_products_name_trgm      ON products USING gin (name gin_trgm_ops);
CREATE INDEX idx_products_merchant_active ON products(merchant_id, is_active);
```

---

## Table: product_variants

*(Added migration 006)*

Per size+color stock tracking. Products without variant rows fall back to `products.stock_count`.

```sql
CREATE TABLE product_variants (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID    NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  merchant_id UUID    NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  size        TEXT,                          -- NULL if product has no sizes
  color       TEXT,                         -- NULL if product has no colors
  stock_count INTEGER NOT NULL DEFAULT 0,
  sku_variant TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE NULLS NOT DISTINCT (product_id, size, color)
);

CREATE INDEX idx_product_variants_product  ON product_variants(product_id);
CREATE INDEX idx_product_variants_merchant ON product_variants(merchant_id);
CREATE INDEX idx_product_variants_active   ON product_variants(product_id, is_active) WHERE is_active = TRUE;
```

---

## Table: product_embeddings

*(Recreated in migration 004 with 1536-dim OpenAI vectors)*

Semantic search embeddings. One row per product. Model: `text-embedding-3-small`.

```sql
CREATE TABLE product_embeddings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID        NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  merchant_id   UUID        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  text_content  TEXT        NOT NULL,                    -- content that was embedded (name | description | category)
  embedding     vector(1536) NOT NULL,                  -- OpenAI text-embedding-3-small
  model_version VARCHAR(50) NOT NULL DEFAULT 'text-embedding-3-small',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IVFFlat ANN index — cosine distance
-- lists=50 tuned for ~100-1000 products; rebuild with REINDEX after bulk loads
CREATE INDEX idx_product_embeddings_vector ON product_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

CREATE INDEX idx_product_embeddings_merchant ON product_embeddings(merchant_id);
```

### RPC: search_products_by_embedding

```sql
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
  SELECT p.id, p.name::TEXT, p.description::TEXT, p.price_kobo::BIGINT,
         p.category::TEXT, p.sizes, p.colors, p.image_url::TEXT,
         (1.0 - (pe.embedding <=> p_embedding))::FLOAT AS similarity
  FROM products p
  INNER JOIN product_embeddings pe ON pe.product_id = p.id
  WHERE p.merchant_id = p_merchant_id
    AND p.is_active = TRUE
    AND (1.0 - (pe.embedding <=> p_embedding)) > p_threshold
  ORDER BY pe.embedding <=> p_embedding
  LIMIT p_limit;
$$;
```

---

## Table: conversations

Active conversation sessions. State machine state stored in JSONB. Cart stored inline for atomic updates.

```sql
CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  merchant_id     UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  status          conversation_status NOT NULL DEFAULT 'active',
  state           JSONB NOT NULL DEFAULT '{"phase": "greeting"}',  -- full state machine state
  current_intent  TEXT,
  cart            JSONB NOT NULL DEFAULT '{"items": [], "total_kobo": 0}',

  -- Cart recovery tracking (migration 005)
  cart_recovery_1_sent_at TIMESTAMPTZ,
  cart_recovery_2_sent_at TIMESTAMPTZ,

  last_message_at TIMESTAMPTZ,
  message_count   INT NOT NULL DEFAULT 0
);

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_conversations_merchant_customer ON conversations(merchant_id, customer_id, status);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at) WHERE status = 'active';
```

---

## Table: messages

Full message history, append-only.

```sql
CREATE TABLE messages (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  merchant_id         UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  direction           message_direction NOT NULL,
  content             TEXT NOT NULL CHECK (char_length(content) <= 4096),
  message_type        message_type NOT NULL DEFAULT 'text',
  external_message_id TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_merchant     ON messages(merchant_id, created_at DESC);
```

---

## Table: orders

```sql
CREATE TABLE orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  merchant_id       UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  conversation_id   UUID NOT NULL REFERENCES conversations(id),

  status            order_status NOT NULL DEFAULT 'pending',

  -- Line items stored as JSONB: [{ product_id, name, price_kobo, qty, size, color }]
  line_items        JSONB NOT NULL DEFAULT '[]',

  subtotal_kobo     BIGINT NOT NULL CHECK (subtotal_kobo >= 0),
  delivery_fee_kobo BIGINT NOT NULL DEFAULT 0 CHECK (delivery_fee_kobo >= 0),
  total_kobo        BIGINT NOT NULL CHECK (total_kobo >= 0),

  -- PII: delivery_address is AES-256-GCM encrypted (migration 010)
  delivery_address  TEXT,
  delivery_method   delivery_method,
  notes             TEXT CHECK (char_length(notes) <= 1000),

  reference         TEXT NOT NULL UNIQUE    -- human-readable, e.g. LMD-20260607-A3F2

  -- webhook_source on orders tracks which channel created the order (migration 007)
);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_orders_merchant ON orders(merchant_id, created_at DESC);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status   ON orders(status);
```

---

## Table: payments

```sql
CREATE TABLE payments (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  order_id             UUID NOT NULL REFERENCES orders(id),
  merchant_id          UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

  status               payment_status NOT NULL DEFAULT 'pending',
  amount_kobo          BIGINT NOT NULL CHECK (amount_kobo > 0),
  currency             TEXT NOT NULL DEFAULT 'NGN',

  paystack_reference   TEXT NOT NULL UNIQUE,
  paystack_access_code TEXT,
  expires_at           TIMESTAMPTZ,          -- migration 005: payment link expiry tracking

  payment_channel      TEXT,
  paid_at              TIMESTAMPTZ,
  metadata             JSONB NOT NULL DEFAULT '{}'
);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Table: webhook_events

Raw webhook log for idempotency and debugging. Every inbound webhook is recorded before processing.

```sql
CREATE TABLE webhook_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  source       webhook_source NOT NULL,   -- 'termii' | 'paystack' | 'telegram'
  event_type   TEXT NOT NULL,
  external_id  TEXT,
  status       webhook_status NOT NULL DEFAULT 'received',
  payload      JSONB NOT NULL,
  error_message TEXT,
  processed_at TIMESTAMPTZ
);

-- Idempotency: prevents double-processing the same Telegram update_id or Paystack event
CREATE UNIQUE INDEX idx_webhook_events_dedup ON webhook_events(source, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX idx_webhook_events_status ON webhook_events(status, created_at DESC);
```

---

## Table: audit_logs

Append-only log for NDPR compliance and security audit. No UPDATE or DELETE allowed via RLS.

```sql
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  merchant_id   UUID REFERENCES merchants(id) ON DELETE SET NULL,
  actor_id      UUID,
  actor_type    actor_type NOT NULL DEFAULT 'system',
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   UUID,
  metadata      JSONB NOT NULL DEFAULT '{}',
  ip_address    TEXT
);

CREATE INDEX idx_audit_logs_merchant  ON audit_logs(merchant_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource  ON audit_logs(resource_type, resource_id, created_at DESC);
```

---

## NDPR: Right-to-Erasure Procedure

```sql
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

  UPDATE messages SET
    content = '[Message removed - NDPR erasure]',
    metadata = '{}'
  WHERE customer_id = p_customer_id;

  INSERT INTO audit_logs (actor_type, action, resource_type, resource_id, metadata)
  VALUES (
    'system', 'ndpr_erasure', 'customer', p_customer_id,
    jsonb_build_object('erased_at', NOW(), 'reason', 'customer_request')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Money in kobo | Avoids float rounding errors in financial calculations. Never store NGN as float. |
| Line items as JSONB | Atomic cart-to-order snapshot. Avoids join at order read time; products can change price without affecting historical orders. |
| Conversation state in JSONB | Single atomic read/write for state machine transition; no separate state table needed at MVP scale. |
| PII encrypted at app layer (not Postgres) | Column-level encryption transparent to Supabase RLS; no Postgres extension dependency. Encryption key rotatable without schema change. |
| email_hash for search | AES ciphertext is not searchable. HMAC-SHA256 hash allows exact-match email lookup (duplicate detection, CRM login) without decrypting. |
| auth_user_id FK to auth.users | Delegates credential management to Supabase Auth. No custom password_hash column. |
| pgvector IVFFlat index | Approximate nearest-neighbour at low latency. `lists=50` tuned for < 10K products; rebuild with REINDEX at scale. |
