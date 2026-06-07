# Lameda - Technical Documentation
**Version:** 3.0 | **Date:** May 2026 | **Audience:** Engineering team, technical co-founders, Series A technical due diligence

---

## 1. Platform Overview

Lameda is a multi-tenant SaaS platform that automates WhatsApp-based commerce for Nigerian fashion retailers. The system receives inbound WhatsApp messages, classifies customer intent using Claude AI, handles product discovery (text and image-based), captures orders conversationally, processes payments via Paystack, and provides a web dashboard for merchant oversight.

**Primary technology choices:**
- Next.js 14 (App Router) on Vercel - frontend and API layer
- Supabase - PostgreSQL 15, Edge Functions, Realtime, Auth, Storage
- WhatsApp Cloud API via Termii BSP
- Claude Haiku (Anthropic) - intent classification and response generation
- CLIP ViT-B/32 via Replicate - product image embeddings
- Paystack - Nigerian payment processing

---

## 2. Repository Structure

```
lameda/
├── app/                        # Next.js App Router pages
│   ├── (auth)/                 # Login, signup, onboarding
│   ├── dashboard/              # Merchant dashboard
│   │   ├── conversations/      # Conversation inbox
│   │   ├── orders/             # Order management
│   │   ├── products/           # Catalog management
│   │   ├── broadcasts/         # Campaign manager
│   │   └── analytics/          # Reporting
│   └── api/                    # API routes
│       ├── v1/                 # Public API
│       └── webhooks/           # Inbound webhooks
├── components/                 # React UI components
├── lib/                        # Shared utilities
│   ├── supabase/               # Supabase client config
│   ├── ai/                     # Claude integration
│   ├── whatsapp/               # WhatsApp message builders
│   ├── payments/               # Paystack integration
│   └── conversation/           # State machine logic
├── supabase/
│   ├── migrations/             # Database migrations (numbered)
│   ├── functions/              # Edge Functions
│   │   ├── embed_product_image/
│   │   ├── abandoned_cart_worker/
│   │   └── process_broadcast_batch/
│   └── seed.sql                # Test data
├── tests/
│   ├── unit/                   # Jest unit tests
│   └── integration/            # Integration tests (staging)
├── scripts/
│   └── recalc.py               # Financial model recalculation
└── docs/                       # Extended documentation
```

---

## 3. API Reference

### Authentication

All API endpoints (except `/api/v1/auth/login` and `/api/v1/merchants` POST) require a valid JWT in the Authorization header.

```
Authorization: Bearer {access_token}
```

Access tokens expire in 1 hour. Refresh tokens expire in 7 days. Use `POST /api/v1/auth/refresh` to obtain a new access token.

### Standard Error Format

All error responses use the following envelope:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Human-readable description",
    "details": [
      { "field": "product_id", "message": "Invalid UUID format" }
    ]
  },
  "request_id": "01HX..."
}
```

**Error codes:** `UNAUTHORIZED`, `FORBIDDEN`, `RESOURCE_NOT_FOUND`, `VALIDATION_ERROR`, `RATE_LIMIT_EXCEEDED`, `CONFLICT`, `INTERNAL_ERROR`

### Idempotency

All state-mutating POST endpoints require an `Idempotency-Key` header containing a UUID. Duplicate requests with the same key return the cached response for 24 hours.

```
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

### Rate Limiting

All endpoints are rate-limited to 100 requests per minute per merchant. Response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1716912345
```

On 429 responses: `Retry-After: 60`

### Full Endpoint Reference

For complete request/response schemas: `v2/06_API_Specifications_v2.md`

---

## 4. WebHook Integration

### WhatsApp (Inbound)

**Endpoint:** `POST /api/webhooks/v1/whatsapp`

Meta delivers inbound WhatsApp messages to this endpoint. The following verification is applied:

1. Extract `X-Hub-Signature-256` header
2. Compute HMAC-SHA256 of raw request body using `WHATSAPP_APP_SECRET`
3. Compare signatures using `crypto.timingSafeEqual` (prevents timing attacks)
4. Return 401 if signatures don't match

Idempotency: Each message has a unique `message.id` from Meta. This is stored as `idempotency_key` in `webhook_events`. Duplicate deliveries of the same message are discarded silently (200 returned, no reprocessing).

**Message types handled:**
- `text` - standard text message
- `image` - customer sends product photo (triggers CLIP matching)
- `interactive` - customer selects from a list or button (order flow)
- `button` - quick reply button selection

### Paystack (Inbound)

**Endpoint:** `POST /api/webhooks/v1/paystack`

1. Extract `X-Paystack-Signature` header
2. Compute HMAC-SHA512 of raw request body using `PAYSTACK_SECRET_KEY`
3. Compare signatures; return 401 if invalid

**Events handled:**
- `charge.success` - payment completed; update order to 'confirmed'
- `refund.processed` - refund completed; update payment status

All other event types are acknowledged (200) but not processed.

---

## 5. AI Integration

### Intent Classification

Every inbound customer message is classified before routing. The classification call to Claude Haiku is the first operation after webhook processing.

**Input:** Customer message text + conversation context (last 5 messages) + merchant system prompt

**Output:**
```json
{
  "intent": "product_search",
  "confidence": 0.91,
  "extracted": {
    "product_query": "blue ankara top size M",
    "price_range": null,
    "color": "blue"
  }
}
```

**Routing thresholds:**
- `confidence >= 0.70` AND intent is not `human_request` - AI handles
- `confidence < 0.70` OR intent is `human_request` - route to human handoff
- Intent is `complaint` AND message contains escalation keywords - always human handoff

### Response Generation

After classification and data retrieval (products, order status), a second Claude Haiku call generates the actual customer-facing response. The system prompt includes:

- Merchant persona name and language setting
- Relevant product data (names, prices, availability)
- Conversation history (last 10 messages)
- Specific instruction for the intent (e.g., "present these 3 products as a WhatsApp product list")

Responses are formatted for WhatsApp's message types (plain text, interactive list, product card template).

### Image-Based Product Matching

When a customer sends an image message:

1. Extract image CDN URL from Meta webhook payload
2. POST to Replicate CLIP ViT-B/32 API with image URL
3. Receive 512-dimension float array
4. Execute pgvector cosine similarity query against `product_embeddings`
5. Return top 5 products, filter by merchant and stock availability
6. Present top 3 as WhatsApp product cards

**Latency:** ~2-3 seconds end-to-end (Replicate CLIP is the bottleneck at ~1.5 seconds)

---

## 6. Database Reference

For the complete database schema including all tables, indexes, constraints, RLS policies, and stored procedures: `v2/05_Database_Schema_v2.md`

### Key Design Patterns

**Prices in kobo:** All monetary values stored as BIGINT in the smallest currency unit (kobo = N0.01). This avoids floating-point precision issues. Display layer divides by 100 to show Naira values.

**Snapshot on order:** `order_items.product_name` and `order_items.unit_price` capture the product name and price at the time of order, not by reference. This ensures order history is accurate even if product is later renamed or repriced.

**Soft deletes via `is_active`:** Products and variants are never hard-deleted. Setting `is_active = FALSE` removes them from the AI's product search while preserving order history integrity.

**NDPR-safe audit log:** `audit_logs` is append-only (enforced via RLS: no UPDATE or DELETE policy). Stores `before_json` and `after_json` for all PII mutations.

---

## 7. Background Job Reference

### abandoned_cart_worker (Edge Function)

**Schedule:** `*/5 * * * *` (every 5 minutes via pg_cron)

**Logic:**
1. Find orders with `status = 'pending'` AND `created_at < NOW() - 15 minutes` AND `abandoned_reminder_1_sent_at IS NULL`
2. Send Message 1 via WhatsApp; update `abandoned_reminder_1_sent_at`
3. Find orders with `status = 'pending'` AND `created_at < NOW() - 2 hours` AND `abandoned_reminder_2_sent_at IS NULL`
4. Send Message 2; update `abandoned_reminder_2_sent_at`
5. Find orders with `status = 'pending'` AND `created_at < NOW() - 30 minutes` AND `inventory_released = FALSE`
6. Release inventory reservation; update `inventory_released = TRUE`

### embed_product_image (Edge Function)

**Trigger:** Called after `POST /api/v1/products/{id}/images` completes storage upload

**Logic:**
1. Accept `{ product_id, image_url }` as input
2. Call Replicate CLIP API: `POST https://api.replicate.com/v1/predictions` with `clip-vit-b32` model
3. Poll for result (async prediction, typically 1-2 seconds)
4. `INSERT INTO product_embeddings (product_id, image_url, embedding, model_version)`
5. `UPDATE products SET embedding_version = 'clip-vit-b32-v1'`

### process_broadcast_batch (Edge Function)

**Schedule:** `*/2 * * * *` (every 2 minutes)

**Logic:**
1. Find one broadcast with `status = 'scheduled' AND scheduled_at <= NOW()`
2. Build audience from `customers` filtered by `audience_filter` JSONB criteria
3. Send up to 50 messages per execution (rate limit: 80/second on Termii)
4. Update `sent_count` and `failed_count`
5. Mark `status = 'sent'` when `sent_count + failed_count = recipient_count`

---

## 8. Environment Variables Reference

| Variable | Required | Description |
|---------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public anon key (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `PAYSTACK_SECRET_KEY` | Yes | Paystack secret key (not public key) |
| `PAYSTACK_PUBLIC_KEY` | Yes | Paystack public key (for client-side init) |
| `TERMII_API_KEY` | Yes | Termii API key for WhatsApp sending |
| `WHATSAPP_APP_SECRET` | Yes | Meta app secret for webhook HMAC verification |
| `WHATSAPP_PHONE_NUMBER_ID` | Yes | Meta WhatsApp phone number ID |
| `REPLICATE_API_KEY` | Yes | Replicate API key for CLIP embeddings |
| `SENTRY_DSN` | Yes | Sentry project DSN for error tracking |
| `NEXT_PUBLIC_APP_URL` | Yes | Full app URL (for OAuth redirects, etc.) |

**Security:** All of the above are stored as Vercel Environment Variables (encrypted at rest). Never commit these to the codebase or include them in logs.

---

## 9. Deployment and Operations

### Standard Deploy

All code changes go through the following pipeline:

1. Create a feature branch from `main`
2. GitHub Actions runs: ESLint, Prettier check, Jest unit tests
3. Vercel creates a preview deployment (unique URL per PR)
4. Integration tests run against preview + staging Supabase
5. PR requires 1 review approval before merge
6. Merge to `main` triggers automatic Vercel production deployment
7. If a migration file is included, Supabase applies it automatically on deploy
8. Sentry release is tagged for error attribution
9. BetterStack uptime check confirms production is healthy

### Rollback

Vercel supports instant rollback to any previous deployment via the Vercel dashboard or CLI:

```bash
vercel rollback [deployment-url]
```

Database migrations are forward-only. Rollback requires a new migration that reverses the change.

### Database Migrations

All schema changes go through Supabase migrations:

```bash
# Create a new migration
supabase migration new add_something

# Apply to local
supabase db push

# Apply to production (via CI)
supabase db push --db-url [production-url]
```

Migration files are numbered sequentially: `20260501000000_initial_schema.sql`, `20260510000001_add_subscription_plans.sql`, etc.

---

## 10. Monitoring and Alerting

### Error Monitoring (Sentry)

Sentry captures all unhandled exceptions in Next.js API routes and Edge Functions. Configuration:

- Alert on new `critical` or `high` severity errors in production
- Alerts delivered to `#lameda-errors` Slack channel
- PII scrubbing via `beforeSend` filter (customer names, phone numbers, emails removed from stack traces)
- Release tagging on every deploy for regression attribution

### Uptime Monitoring (BetterStack)

Checks every 60 seconds:
- `GET /api/v1/webhooks/health` - webhook processing health
- `GET /` - frontend load
- `POST /api/v1/auth/login` - authentication health (test account)

Alert: PagerDuty escalation to founder's phone if downtime exceeds 2 minutes.

### Performance Baselines

Vercel Analytics tracks:
- API route P50/P95/P99 latency per endpoint
- Core Web Vitals for dashboard
- Error rate per route

Alert thresholds:
- Webhook handler P95 above 500ms - investigate
- Product search P95 above 600ms - investigate
- Auth endpoints P95 above 300ms - investigate

---

## 11. Security Checklist

Pre-launch security requirements:

- [ ] OWASP ZAP automated scan - all critical and high findings resolved (STORY-038)
- [ ] All API keys in Vercel Environment Variables, none in code or logs
- [ ] Rate limiting active on all API endpoints
- [ ] Webhook signature verification active (WhatsApp and Paystack)
- [ ] RLS policies enabled on all merchant-data tables
- [ ] NDPR erasure endpoint tested and audited
- [ ] Sentry PII scrubbing verified
- [ ] bcrypt cost factor 12 for password hashing
- [ ] HTTPS enforced on all endpoints (Vercel handles this)
- [ ] CSP headers configured in Next.js
- [ ] SQL injection: parameterized queries everywhere (Supabase JS client enforces this)

---

## 12. Glossary

| Term | Definition |
|------|-----------|
| BSP | Business Solution Provider - a Meta-certified partner that provides access to the WhatsApp Cloud API |
| CLIP | Contrastive Language-Image Pre-Training - OpenAI's multimodal model used for image embeddings |
| ivfflat | Inverted File with Flat Quantization - an approximate nearest-neighbor index algorithm in pgvector |
| NDPR | Nigeria Data Protection Regulation - Nigeria's primary data protection law, enforced by NITDA |
| PCM | ISO language code for Nigerian Pidgin (Creole, English-based) |
| Kobo | Smallest denomination of Nigerian Naira. N1 = 100 kobo. All prices stored in kobo. |
| Handoff | The process of transferring an AI conversation to a human merchant |
| AOV | Average Order Value |
| BSP | Business Solution Provider (WhatsApp) |
| RLS | Row Level Security - PostgreSQL feature for row-level access control |
| PITR | Point-In-Time Recovery - Supabase database backup with minute-level granularity |
| ANN | Approximate Nearest Neighbor - the search algorithm used by pgvector for embedding similarity |
