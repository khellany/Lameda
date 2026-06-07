# Lameda - System Architecture v2
**Version:** 2.0 | **Date:** May 2026 | **Status:** MVP Design

---

## Executive Summary

Lameda is built on a serverless-first, multi-tenant architecture using Supabase (PostgreSQL + pgvector + Edge Functions), Vercel (Next.js frontend + API routes), and the WhatsApp Cloud API. The system is designed to handle 500 concurrent merchants at MVP and scale to 10,000+ merchants through horizontal scaling and BSP volume agreements. This document covers the C4 architecture model, tech stack decisions, core data flows, and the infrastructure scalability plan.

---

## 1. Technology Stack

### Core Infrastructure

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 14 (App Router) | Vercel-native, SSR for dashboard, React for merchant UI |
| API Layer | Next.js API Routes + Edge Runtime | Co-located with frontend, global edge network |
| Database | PostgreSQL 15 via Supabase | RLS for multi-tenancy, pgvector for embeddings, managed |
| Vector Search | pgvector (ivfflat index) | Native to Postgres, no separate vector DB required at MVP scale |
| Object Storage | Supabase Storage + Cloudflare CDN | Product images, CDN URLs for WhatsApp delivery |
| Auth | Supabase Auth + custom JWT | Merchant auth via email/password, Row Level Security |
| Realtime | Supabase Realtime (WebSockets) | Live handoff alerts, conversation updates on dashboard |
| Background Jobs | Supabase Edge Functions + pg_cron | Abandoned cart reminders, broadcast sends, embedding pipeline |
| Monitoring | Sentry (errors) + BetterStack (uptime) | Error alerting, endpoint health monitoring |
| CI/CD | GitHub Actions + Vercel | PR previews, automated test gates, production deploys |

### AI and ML Stack

| Component | Technology | Cost per Unit |
|-----------|-----------|--------------|
| Intent Classification | Claude Haiku (claude-haiku-4-5) | Less than N0.002 per message |
| Complex Reasoning / Escalation | Claude Sonnet (claude-sonnet-4-6) | N0.012 per message (used sparingly) |
| Product NLP Search | Text embedding via Supabase AI | Included in Supabase Pro |
| Image-Based Product Matching | CLIP ViT-B/32 via Replicate API | N0.08 per image match |
| Pidgin Language Support | Claude system prompt with Pidgin persona | No additional cost |

### WhatsApp and Payments

| Component | Provider | Notes |
|-----------|---------|-------|
| WhatsApp BSP | Termii | N0.38-N0.90 per message, Nigerian-licensed BSP |
| WhatsApp Cloud API | Meta (via Termii) | Webhook delivery, interactive message types |
| Payments | Paystack | Nigerian card, bank transfer, USSD |
| SMS Fallback | Termii SMS | For non-WhatsApp notifications (future) |

---

## 2. C4 Architecture Model

### Level 1 - System Context

```
                        +-------------------+
                        |   Customer        |
                        | (WhatsApp User)   |
                        +--------+----------+
                                 |
                         WhatsApp messages
                                 |
                        +--------v----------+
                        |   Meta / Termii   |
                        | WhatsApp Cloud API|
                        +--------+----------+
                                 |
                        Webhook (HMAC-SHA512)
                                 |
+---------------+      +---------v----------+      +------------------+
|  Merchant     |      |                    |      |   Paystack       |
|  Dashboard    +------>    LAMEDA PLATFORM  <------+   Payment Rail   |
| (Web Browser) |      |                    |      |                  |
+---------------+      +---------+----------+      +------------------+
                                 |
                        Anthropic API (Haiku/Sonnet)
                        Replicate API (CLIP)
                        Termii API (outbound WhatsApp)
```

### Level 2 - Container Diagram

```
+---------------------------------------------- LAMEDA PLATFORM -------------------------------------------------+
|                                                                                                                 |
|  +------------------------+    +------------------------+    +------------------------------------------+      |
|  |   Next.js Frontend     |    |   Next.js API Layer    |    |         Supabase Backend                 |      |
|  |   (Vercel CDN)         |    |   (Vercel Edge)        |    |                                          |      |
|  |                        |    |                        |    |  +------------------+  +-------------+   |      |
|  | - Merchant dashboard   |    | - /api/v1/auth         |    |  | PostgreSQL 15    |  | pgvector    |   |      |
|  | - Product catalog UI   +--->+ - /api/v1/products     +--->+  | (Supabase)       |  | Embeddings  |   |      |
|  | - Order management     |    | - /api/v1/orders       |    |  +------------------+  +-------------+   |      |
|  | - Conversation inbox   |    | - /api/v1/conversations|    |                                          |      |
|  | - Analytics            |    | - /api/webhooks/v1/*   |    |  +------------------+  +-------------+   |      |
|  | - Broadcast manager    |    |                        |    |  | Supabase Storage |  | Realtime    |   |      |
|  +------------------------+    +------------------------+    |  | (Product Images) |  | (WebSocket) |   |      |
|                                                              |  +------------------+  +-------------+   |      |
|  +-------------------------------------------------------+  |                                          |      |
|  |   Edge Functions (Supabase)                           |  |  +----------------------------------+    |      |
|  |                                                       |  |  | Edge Functions                   |    |      |
|  | - embedding_pipeline: CLIP on image upload            +->+  | - embed_product_image            |    |      |
|  | - abandoned_cart_worker: pg_cron every 5 min          |  |  | - send_abandoned_cart_reminder   |    |      |
|  | - broadcast_sender: processes queued broadcasts       |  |  | - process_broadcast_batch        |    |      |
|  +-------------------------------------------------------+  +------------------------------------------+      |
|                                                                                                                 |
+-----------------------------------------------------------------------------------------------------------------+
```

### Level 3 - Component Diagram (Conversation Engine)

```
Inbound WhatsApp Message
         |
         v
+------------------+
| Webhook Handler  |  - HMAC-SHA512 signature verification
| /webhooks/v1/    |  - Idempotency key check (webhook_events table)
| whatsapp         |  - Message deduplication
+--------+---------+
         |
         v
+------------------+
| Conversation     |  - Lookup or create conversation record
| Router           |  - Load context_json (cart state, current intent)
|                  |  - Route to AI engine or human handler
+--------+---------+
         |
    +----+----+
    |         |
    v         v
+-------+ +--------+
| AI    | | Human  |
| Engine| | Handoff|
+---+---+ +---+----+
    |           |
    v           v
+-------+ +----------+
| Haiku | | Realtime |
| Intent| | Alert to |
| Class | | Dashboard|
+---+---+ +----------+
    |
    v
+------------------+
| Response Builder |  - Product search (NLP or image)
|                  |  - Variant selection flow
|                  |  - Order capture
|                  |  - Payment link generation
|                  |  - Pidgin language rendering
+--------+---------+
         |
         v
+------------------+
| Termii / Meta    |  - WhatsApp interactive messages
| Outbound Send    |  - Image + CTA cards, list messages
+------------------+
```

---

## 3. Core Data Flows

### Flow 1 - Customer Product Inquiry (Happy Path)

```
Customer: "Do you have Ankara top in size M?"

1. Meta (Termii) receives message -> POST /api/webhooks/v1/whatsapp
2. Webhook handler validates HMAC-SHA512 signature
3. Idempotency check: insert webhook_events (idempotency_key = message_id)
4. Conversation router: load conversation context from conversations.context_json
5. AI engine: POST to Claude Haiku with merchant system prompt
   - Intent classified: product_search (confidence: 0.91)
6. Product search: pgvector text query "Ankara top" -> top 3 results
7. Variant filter: check product_variants WHERE size = 'M' AND is_active = TRUE
8. Response builder: construct WhatsApp interactive message (image + name + price + CTA)
9. Termii API: deliver WhatsApp message to customer
10. Message logged to messages table (ai_intent, ai_confidence)
11. conversations.context_json updated with current product selection
```

### Flow 2 - Image-Based Product Match

```
Customer: [sends photo of a dress]

1. Webhook receives image message (image URL from Meta CDN)
2. AI engine receives image URL -> POST to Replicate CLIP ViT-B/32 API
3. CLIP returns 512-dimension embedding vector
4. pgvector query: SELECT product_id FROM product_embeddings
   ORDER BY embedding <=> '[customer_image_vector]' LIMIT 5
5. Top 5 products returned by cosine similarity
6. Response builder sends product cards to customer
```

### Flow 3 - Order Capture and Payment

```
Customer selects product, confirms size and delivery address

1. AI captures delivery details via conversational flow
2. POST /api/v1/orders - order created with status "pending"
3. inventory_reservation: UPDATE product_variants SET reserved = reserved + 1
4. POST /api/v1/payments/initiate
   - Paystack checkout URL generated (30-minute expiry)
   - idempotency_key stored to prevent duplicate charges
5. Payment link sent via WhatsApp
6. Abandoned cart timer starts: pg_cron schedules check at T+15min

Payment success path:
7. Paystack fires POST /api/webhooks/v1/paystack (charge.success)
8. Paystack secret key signature verification
9. UPDATE orders SET status = 'confirmed'
10. UPDATE product_variants: reserved - 1, stock_qty - 1
11. WhatsApp confirmation message sent to customer
12. Merchant dashboard updated via Supabase Realtime

Payment abandoned path:
7. pg_cron fires abandoned_cart_worker at T+15min
8. Check orders WHERE status = 'pending' AND created_at < NOW() - INTERVAL '15 min'
9. Send WhatsApp Message 1: "You left something behind..."
10. If still unpaid at T+2hr: send Message 2 with alternative CTA
11. Inventory reservation released at T+30min (payment link expiry)
```

### Flow 4 - Human Handoff

```
1. AI confidence falls below 0.7 threshold (OR emotional/complaint keyword detected)
2. AI sends customer: "Connecting you with [persona_name] now..."
3. UPDATE conversations SET status = 'waiting_human', handoff_reason = '[reason]'
4. Supabase Realtime broadcasts handoff event to merchant dashboard
5. Merchant receives push notification (browser + mobile PWA)
6. Merchant opens conversation: full message history loaded
7. PUT /api/v1/conversations/{id}/handoff { "action": "take_over" }
8. UPDATE conversations SET status = 'human_active', assigned_to = merchant_id
9. Merchant resolves issue, clicks "Resume AI"
10. PUT /api/v1/conversations/{id}/handoff { "action": "resume_ai" }
11. AI resumes with full conversation context preserved
```

### Flow 5 - Product Image Embedding Pipeline

```
Merchant uploads product image via dashboard

1. POST /api/v1/products/{id}/images (multipart form)
2. Image stored in Supabase Storage -> CDN URL returned
3. Supabase Edge Function: embed_product_image triggered
4. Edge Function calls Replicate CLIP ViT-B/32 API with image URL
5. 512-dimension vector returned
6. INSERT INTO product_embeddings (product_id, image_url, embedding, model_version)
7. UPDATE products SET embedding_version = 'clip-vit-b32-v1'
8. ivfflat index automatically includes new vector for ANN search
```

---

## 4. Multi-Tenancy Architecture

Lameda uses a shared-database, shared-schema multi-tenant model. All merchant data is isolated through:

**Row Level Security (RLS):** Every table with merchant data has `merchant_id` as a foreign key, and Supabase RLS policies enforce `WHERE merchant_id = auth.uid()` at the database level. Even if a query bug exists in application code, cross-tenant data leakage is blocked at the DB layer.

**API-Level Enforcement:** All API routes extract `merchant_id` from the verified JWT and pass it explicitly to all queries. No endpoint accepts a `merchant_id` parameter from the request body for data-access operations.

**Plan Enforcement Middleware:** A middleware layer checks `subscription_plans` limits before processing requests:
- Conversations: count active conversations in current billing period vs. plan limit
- Products: count active products vs. plan limit
- Broadcasts: count monthly broadcast sends vs. plan limit
- Merchants over limit: 402 response with upgrade prompt

---

## 5. Security Architecture

### Authentication and Authorization

```
JWT Flow:
- Access token: 1hr expiry, signed HS256 with Supabase secret
- Refresh token: 7-day expiry, stored in httpOnly cookie
- All API routes: extract and verify JWT before handler executes
- Token rotation: refresh endpoint issues new access token, extends refresh window
```

### Webhook Security

```
WhatsApp (Meta):
- X-Hub-Signature-256 header: HMAC-SHA256 of body with app secret
- Validated before any processing begins
- 401 returned for invalid signatures (never process)

Paystack:
- X-Paystack-Signature: HMAC-SHA512 of body with Paystack secret key
- Event type whitelist: only charge.success and refund.processed processed
- Reference cross-check: payment reference must exist in payments table
```

### Secret Management

All secrets stored as Vercel Environment Variables (encrypted at rest):
- `ANTHROPIC_API_KEY` - Claude API access
- `PAYSTACK_SECRET_KEY` - payment processing and webhook verification
- `TERMII_API_KEY` - WhatsApp BSP integration
- `WHATSAPP_APP_SECRET` - webhook signature verification
- `SUPABASE_SERVICE_ROLE_KEY` - privileged DB operations (Edge Functions only)
- `REPLICATE_API_KEY` - CLIP embedding generation

No secrets in codebase, logs, or error responses. Sentry scrubs PII from stack traces via `beforeSend` filter.

---

## 6. Scalability Design

### Current MVP Limits (0-200 merchants)

| Resource | Current Sizing | Limit |
|----------|---------------|-------|
| Supabase tier | Pro ($25/month) | 8GB DB, 100GB storage |
| Vercel tier | Pro ($20/month) | 1TB bandwidth, global edge |
| pgvector index | lists=100 (ivfflat) | ~500K embeddings |
| Concurrent connections | Supabase default | 60 connections (pooler) |
| WhatsApp throughput | Termii standard | 80 messages/second |

### Scale-Out Plan (200-2,000 merchants)

**Database:**
- Enable Supabase connection pooler (PgBouncer) - supports 1,000+ connections
- Partition `messages` and `audit_logs` by `created_at` (monthly partitions)
- Add read replicas for analytics queries

**AI Cost Optimization:**
- Cache intent classification for identical messages (Redis via Upstash)
- Batch embedding generation (group 10 images per Replicate call)
- Upgrade BSP agreement: Termii volume pricing reduces per-message cost by 50%+

**Conversation Throughput:**
- Move webhook handler to dedicated Vercel Fluid Function (isolated compute)
- Implement message queue (Supabase pg_notify + Edge Function consumers)
- Target: 500 concurrent conversations across all merchants

### Scale-Out Plan (2,000+ merchants - Series A)

- Migrate to dedicated Supabase project per enterprise merchant
- Introduce Redis (Upstash) for conversation state caching
- Sharded pgvector index (multiple lists, HNSW algorithm)
- Dedicated Termii integration account with SLA
- Multi-region deployment (Lagos + London) for NDPR data residency and latency

---

## 7. Disaster Recovery and Business Continuity

### Recovery Objectives

| Scenario | RTO (Recovery Time Objective) | RPO (Recovery Point Objective) |
|---------|-------------------------------|-------------------------------|
| Application bug / bad deploy | 15 minutes | 0 (Vercel instant rollback) |
| Database corruption | 4 hours | 1 hour (Supabase PITR) |
| BSP (Termii) outage | 30 minutes | N/A (switch to backup BSP) |
| Paystack outage | 30 minutes | N/A (pause payment, notify merchants) |

### Backup Strategy

- **Database:** Supabase Point-In-Time Recovery (PITR) enabled. 7-day recovery window on Pro plan. Weekly restore test to staging environment (STORY-035).
- **Product images:** Supabase Storage with automatic redundancy. CDN cached globally.
- **Configuration:** All infrastructure as code (Vercel config, migration scripts). Reproducible from scratch in under 2 hours.

### Monitoring and Alerting Stack

```
Error Layer:    Sentry -> Slack #lameda-errors (critical + high severity)
Uptime Layer:   BetterStack -> PagerDuty -> Founder phone (downtime > 2 min)
Performance:    Vercel Analytics -> weekly review
DB Health:      Supabase Dashboard + pg_stat_statements -> slow query alerts
Business KPIs:  Custom analytics dashboard -> merchant-facing
```

---

## 8. NDPR Data Architecture

All customer PII is stored exclusively in the Nigerian Supabase region (eu-central-1 mapped to Nigerian data residency per Supabase policy). The data architecture enforces the following NDPR obligations:

**Consent Capture:** `customers.opted_out`, `customer_preferences.marketing_consent`, `merchants.ndpr_consent_given` - all with timestamps. First WhatsApp interaction triggers explicit consent message.

**Data Minimisation:** Only the minimum fields necessary for commerce are captured. No device fingerprinting, no location tracking beyond delivery address, no browsing analytics beyond conversation history.

**Right to Erasure:** `erase_customer_data()` stored procedure anonymises PII within 72 hours. PII fields replaced with `'ERASED'`. Order records preserved for financial audit trail (name removed, amounts retained). Full audit trail in `audit_logs` (append-only via RLS).

**Data Portability:** Merchant can export all customer data via dashboard. `GET /api/v1/customers?export=csv` returns full dataset within 24 hours.

**Retention Policy:** Conversation messages retained for 90 days (Pro plan) or 30 days (Starter/Growth). Automated pg_cron job deletes expired messages monthly.

---

## 9. API Architecture Summary

The API follows a RESTful design with pragmatic conventions:

- All routes under `/api/v1/` for versioning
- Standard error envelope on all 4xx/5xx responses
- Idempotency-Key required on all state-mutating POST endpoints
- Pagination on all list endpoints (page + per_page, meta in response)
- Rate limiting: 100 requests/minute per merchant, headers on every response
- Webhooks: HMAC-verified, idempotent processing, 3-retry exponential backoff

Full specification: `06_API_Specifications_v2.md`

---

## 10. Infrastructure Cost Model (Per Merchant)

| Component | Monthly Cost (NGN) | Notes |
|-----------|-------------------|-------|
| WhatsApp BSP (Termii) | N9,000 | 51% of COGS, compresses to N4,500 at 500+ merchants |
| Claude AI (Haiku + occasional Sonnet) | N1,836 | ~918 conversations at N2/message average |
| Supabase (Pro tier, amortised) | N300 | N18,500/mo / 62 merchants |
| Vercel (Pro tier, amortised) | N130 | N8,000/mo / 62 merchants |
| Replicate CLIP (image matches) | N70 | ~875 image matches per merchant/mo |
| Support (blended) | N300 | Customer success time |
| **Total COGS (Growth tier)** | **N11,636** | **Gross margin: 21% at N15K/mo** |

At 500 merchants with BSP volume pricing:
- BSP cost falls to N4,500/merchant
- Total COGS: N7,136/merchant
- Gross margin: 52% at N15K/mo blended ARPU

At 2,000 merchants:
- BSP cost: N3,500/merchant (enterprise agreement)
- Infrastructure amortises further
- Target gross margin: 72%

Full financial model: `09_Financial_Model_v2.xlsx`
