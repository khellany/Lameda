# Engineering Documentation

**Domain:** Engineering
**Canonical Version:** v3 (System Design, ADRs, Technical Docs) + v2.1 (Database, API)

> **Updated June 2026:** Tech stack and channel corrected to reflect actual implementation. Previous version described NestJS/WhatsApp which was never built.

---

## Resource-Constrained Decisions — Dropped for MVP, Future State Planned

These are deliberate scope cuts made due to budget, time, or operational capacity at the pre-seed stage. Each has a future state target documented below. They are **not** abandoned — they are sequenced.

| # | What was planned | What we shipped instead | Why we dropped it | Future state |
|---|-----------------|------------------------|-------------------|-------------|
| RD-001 | **WhatsApp / Termii** as primary channel (PRD FR-02) | Telegram Bot API | WhatsApp Cloud API requires Meta business verification + BSP (Termii) onboarding: multiple weeks of friction, cost per message, ongoing BSP relationship. Telegram is free, instant, and has no approval process. Infrastructure exists (`src/lib/whatsapp/`, `/api/webhook/whatsapp` stub) ready to activate. | **Phase 2.** When merchant acquisition demands WhatsApp, activate the existing stub. No schema changes required. |
| RD-002 | **NestJS** backend (v2 PRD tech stack) | Next.js 16 App Router (unified) | NestJS needs separate AWS ECS deployment, separate CI pipeline, separate environment management — roughly 2× the ops overhead for a 2-person team. Next.js collapses frontend + API into one Vercel deploy with zero infra config. | **At scale (1000+ merchants).** When webhook handler cold-start latency becomes measurable, extract conversation engine into a NestJS microservice on ECS. |
| RD-003 | **CLIP image embeddings** (PRD FR-09, TD-008 in `src/lib/ai/embed.ts`) | OpenAI `text-embedding-3-small` (text only) | CLIP (ViT-B/32 or ViT-L/14) requires a self-hosted endpoint or Replicate API (~$0.0023/call), plus a separate embedding pipeline for images vs text. Text embeddings cover 90% of search quality at a fraction of the cost and zero extra infrastructure. | **Sprint 7–8.** When customers start sending product images to search, add CLIP via Replicate. Schema already supports it: `product_embeddings` can hold a second column `clip_embedding vector(512)` alongside the existing text vector. |
| RD-004 | **Redis** for session state and rate limiting | DB-backed rate limiting (`src/lib/utils/rateLimit.ts`) + Vercel Cron | Redis adds ~$15–30/month and an additional managed service. At < 100 concurrent conversations, DB-backed rate limiting has acceptable latency (< 50ms extra per request). | **Sprint 9–10 or at 100+ concurrent conversations.** Add Upstash Redis (serverless, per-request pricing) for sub-millisecond rate checks and conversation session caching. |
| RD-005 | **BullMQ** job queue (v2 architecture docs) | Vercel Cron (`vercel.json`) | BullMQ requires a Redis connection. Vercel Cron covers the two MVP jobs (cart recovery + payment expiry) with zero infrastructure. pg-boss is the fallback for durable jobs if Cron reliability becomes an issue. | **When Vercel Hobby cron (daily) is insufficient.** Vercel Pro enables 5-minute cron intervals. Beyond that, pg-boss for durable job queues. |
| RD-006 | **Multi-model Claude routing** — Haiku for triage, Sonnet for complex intents (PRD §11) | Single model for all intents | Two-model routing adds latency (second API call for routing), billing complexity, and prompt maintenance overhead. At < 500 conversations/day, the cost difference is negligible. | **At scale.** Route low-complexity intents (greeting, order_status, simple browse) through `claude-haiku-4-5` to reduce per-conversation AI cost by ~70%. |
| RD-007 | **Sentiment analysis / emotion classifier** on every message (PRD §11) | Intent confidence threshold only (handoff at < 0.7) | Running an emotion classifier as a second Claude call doubles AI cost per message. Current approach catches most hostility via intent classification. | **Sprint 6–7.** Add emotion detection as structured output in the same classification call (no extra API call, just an additional output field). |
| RD-008 | **`subscription_plans` table** (v2 schema) | `subscription_tier` enum on merchants | A plans table is correct for dynamic pricing/feature gating. But at 3 static tiers with no UI for plan management, a table adds migration overhead with zero benefit. | **When plan pricing changes** or merchants need mid-cycle upgrades. Restore as a table seeded from the enum values. |
| RD-009 | **`customer_preferences` table** (v2 schema) — language, preferred sizes/colors, AI conversation summaries | `customers.metadata JSONB` | Separate table adds a JOIN on every conversation load with no query benefit at < 10K customers. JSONB is schema-flexible at this scale. | **Sprint 7–8.** Materialise as a proper table when building CRM personalisation (reorder nudges, preference-based recommendations). |
| RD-010 | **`order_items` separate table** (v2 schema) | `orders.line_items JSONB` | Normalised order items require a JOIN on every order read. At MVP scale, JSONB is an atomic snapshot of what was ordered at order time — prices can change without affecting history. | **Sprint 9–10 or when analytics require it.** Add `order_items` for product-level sales analytics (most-sold SKU, revenue by category). Until then JSONB is sufficient. |
| RD-011 | **Per-plan CSV import limits** (dynamic) | Hardcoded `MAX_ROWS = 100` in `/api/products/import` | Plan enforcement per route requires a plan-config service. At MVP with one effective tier, hardcoding is faster and safe. Comment in code: `// Starter plan limit; enforce per plan in future` | **Sprint 5.** Wire `subscription_tier` into import route to enforce 100 / 500 / unlimited per Starter / Growth / Pro. |
| RD-012 | **Paystack bank transfer / virtual accounts** (PRD FR-15) | Paystack hosted checkout link only | Virtual accounts require additional Paystack account configuration and a separate API flow. Hosted checkout covers 95% of payment cases with no extra setup. | **Phase 2.** Activate Paystack `dedicated_account` endpoint when merchants request bank transfer as a payment option. |
| RD-013 | **Multi-Telegram-bot per merchant** (future scale) | One bot token per merchant row | Architecture comment in webhook route: *"For multiple bots per merchant, extract to a separate table."* Current 1:1 covers all MVP merchants. | **If merchants need channel segmentation** (e.g. one bot per product line). Add `merchant_bots` table with FK to merchants. |
| RD-014 | **Sentry error monitoring** (PRD NFR-16) | Pino structured logging only | Sentry adds ~$26/month (Team plan for source maps). Pino JSON logs are sufficient for Vercel log drains and manual debugging at current scale. | **Before public launch / Sprint 6.** Add Sentry for production error tracking. One-line Next.js integration. |
| RD-015 | **Legacy shared `MERCHANT_API_KEY`** on embed routes | Per-merchant `api_key` (generated at registration) | Legacy key was a stopgap before self-service onboarding shipped. New merchants use per-merchant keys. Old embed routes still accept the shared key via fallback. | **Technical debt — retire with Sprint 5.** Remove `MERCHANT_API_KEY` env var and fallback branch once all merchants are migrated to per-merchant keys. |

---

## Documents in This Category

### 1. System Design Document
- **Source:** `../../v3/engineering/System_Design_Document_v3.md`
- **Version:** v3 (authoritative)
- **Coverage:** State machine design for conversation flows, AI integration patterns, background job architecture, error handling, testing strategy
- **⚠️ Note:** References WhatsApp as primary channel — predates the Telegram-first pivot. Read alongside this file.

### 2. Architecture Decision Records (ADRs)
- **Source:** `../../v3/engineering/Architecture_ADRs_v3.md`
- **Version:** v3 (authoritative)
- **Coverage:** 10 ADRs covering every major technology choice with rationale, alternatives, and consequences

### 3. Technical Documentation
- **Source:** `../../v3/engineering/Technical_Documentation_v3.md`
- **Version:** v3 (authoritative)
- **Coverage:** Developer reference — repo structure, API usage, webhooks, AI integration patterns, DB access patterns, deployment, monitoring

### 4. Database Schema
- **Source:** `../../v2/05_Database_Schema_v2.md`
- **Version:** v2.1 (authoritative — updated June 2026)
- **Coverage:** Full PostgreSQL schema reflecting all 13 migrations: core tables, pgvector, PII encryption, delivery zones, variants, business_type, Telegram columns, Supabase Auth integration

### 5. API Specifications
- **Source:** `../../v2/06_API_Specifications_v2.md`
- **Version:** v2.1 (authoritative — updated June 2026)
- **Coverage:** All implemented routes: merchant onboarding, products (import/embed), CRM (customers/orders/reveal-token), Telegram webhook, Paystack webhook, cron jobs, admin endpoints, health check

### 6. System Architecture Overview
- **Source:** `../../v2/11_System_Architecture_v2.md`
- **Version:** v2
- **Coverage:** C4 diagrams, core data flows, scalability tiers, COGS model, DR plan

---

## Tech Stack (Actual Implementation)

| Layer | Technology | Why |
|-------|-----------|-----|
| Runtime | Node.js 24 + TypeScript | Type safety across webhook handlers and AI calls |
| Framework | **Next.js 16 (App Router)** | Unified frontend + API routes on Vercel; no separate NestJS service |
| Database | PostgreSQL + pgvector (Supabase) | Relational + vector search in one system; built-in Auth and RLS |
| ORM | Supabase JS SDK + generated types | Type-safe DB access; auto-generated from schema |
| AI — Classification & Response | Claude (Anthropic) | Superior instruction-following for sales dialogue; intent classification + response generation |
| AI — Embeddings | OpenAI `text-embedding-3-small` | 1536-dim product catalog semantic search via pgvector |
| Messaging | **Telegram Bot API** | Core channel — Telegram-first MVP |
| Messaging (future) | WhatsApp Business API (Termii BSP) | Deferred to Phase 2 |
| Payments | Paystack | Nigerian-market-native payment gateway |
| Email | Resend | Transactional email (merchant onboarding, welcome email) |
| Logging | Pino | Structured JSON logging with PII redaction |
| Queue / Cron | Vercel Cron (pg-boss for durable jobs) | Cart recovery, payment expiry |
| Hosting | Vercel (Node.js 24) | Frontend + API routes; native Next.js support |
| Database hosting | Supabase Cloud | PostgreSQL + Auth + Realtime + Storage |

---

## Core Data Flows

### 1. Incoming Telegram Message

```
Customer → Telegram servers → POST /api/webhook/telegram/{merchantId}
  → Verify X-Telegram-Bot-Api-Secret-Token (HMAC-SHA256)
  → Deduplicate via webhook_events (source=telegram, external_id=update_id)
  → Upsert customer row (phone_number = chat_id)
  → Load or create conversation (state JSONB from DB)
  → Route to state machine handler (src/lib/conversation/stateMachine.ts)
  → Classify intent via Claude (src/lib/ai/classify.ts)
  → Execute handler (greeting / browse / product / cart / checkout / handoff / orders / complaint / admin)
  → Generate response via Claude (src/lib/ai/respond.ts)
  → Send reply via Telegram Bot API (src/lib/telegram/client.ts)
  → Persist conversation state to PostgreSQL
  → Return 200 OK to Telegram (within 500ms)
```

### 2. Catalog Semantic Search

```
Merchant uploads catalog CSV → POST /api/products/import
  → Parse + validate rows
  → Insert into products table

POST /api/products/embed-all (or /[productId]/embed)
  → Combine: name | description | category
  → OpenAI text-embedding-3-small (1536 dims)
  → Upsert into product_embeddings (pgvector)

Customer query arrives → classify intent as product_search
  → Embed query text (same model)
  → Call search_products_by_embedding() RPC (cosine similarity, threshold 0.5)
  → Return top-5 matches → send as Telegram messages
  → Fallback to pg_trgm if similarity < 0.5
```

### 3. Payment Flow

```
Customer confirms order in conversation
  → Order record created (status: pending)
  → Paystack payment link generated (src/lib/payments/paystack.ts)
  → Link sent to customer via Telegram (30-min expiry tracked in payments.expires_at)

Paystack fires charge.success webhook → POST /api/webhooks/paystack
  → Verify HMAC-SHA512 signature
  → Idempotency check (webhook_events table)
  → Update payments.status = 'success', paid_at = now()
  → Update orders.status = 'confirmed'
  → Send Telegram confirmation to customer
  → Notify merchant via admin_telegram_chat_id

Cron (every 5 min) → POST /api/cron/payment-expiry
  → Find payments older than 30 min still pending
  → Mark as failed → restore reserved stock
```

### 4. Cart Recovery

```
Cron (every 5 min) → POST /api/cron/cart-recovery
  → Find conversations with cart.items > 0, status = active
  → If 15 min idle, cart_recovery_1_sent_at is NULL → send Message 1
  → If 2 hours idle, cart_recovery_2_sent_at is NULL → send Message 2
  → Stop if conversation reaches checkout
```

---

## Key Architecture Decisions (ADR Summary)

| ADR | Decision | Rationale |
|-----|---------|-----------|
| ADR-001 | PostgreSQL over MongoDB | ACID compliance required for financial transactions |
| ADR-002 | **Next.js over NestJS** | Single deployment on Vercel; unified codebase; faster iteration at current scale |
| ADR-003 | pgvector over Pinecone | Avoids external dependency; cost at scale; already in Supabase |
| ADR-004 | Vercel Cron over BullMQ | Simpler ops at MVP scale; pg-boss for durable jobs if needed |
| ADR-005 | Claude for classification + generation | Superior instruction-following for sales dialogue |
| ADR-006 | Paystack over Flutterwave | Nigerian-first; webhook reliability |
| ADR-007 | Conversation state in JSONB | Atomic read/write for state machine; no separate state table needed at MVP |
| ADR-008 | Supabase Auth over custom JWT | Eliminates auth surface area; refresh token rotation built in |
| ADR-009 | PII encrypted at app layer | Transparent to RLS; key rotatable without schema change |
| ADR-010 | Telegram-first over WhatsApp | Faster to integrate (no BSP approval process); API is free; WhatsApp deferred |

---

## Database Tables (Schema v2.1 — all 13 migrations)

| Table | Purpose |
|-------|---------|
| merchants | Merchant accounts, Telegram token, subscription tier, business type, PII (encrypted) |
| merchant_delivery_zones | Per-merchant delivery zones with keyword matching and fees |
| customers | End customers — Telegram chat IDs, opt-in status, PII (encrypted display_name) |
| products | Merchant catalog with price in kobo, sizes[], colors[] |
| product_variants | Per size+color stock tracking (overrides products.stock_count) |
| product_embeddings | pgvector 1536-dim embeddings (OpenAI text-embedding-3-small) |
| conversations | Active sessions — state machine JSONB, cart JSONB, cart recovery timestamps |
| messages | Full message history (inbound + outbound), append-only |
| orders | Orders with line_items JSONB, delivery_address (encrypted), reference |
| payments | Paystack payment records, expires_at tracking |
| webhook_events | Raw webhook log for idempotency (Telegram update_id dedup, Paystack event dedup) |
| audit_logs | NDPR-compliant append-only action log |

---

## API Versioning

All endpoints are Next.js App Router route handlers under `/api/`. No version prefix in current implementation — breaking changes managed via new route paths.

Standard error envelope:
```json
{
  "error": "MERCHANT_NOT_FOUND",
  "details": "No merchant found with that API key"
}
```
