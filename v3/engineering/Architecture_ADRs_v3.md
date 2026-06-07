# Lameda - Architecture Decision Records (ADRs)
**Version:** 3.0 | **Date:** May 2026 | **Format:** MADR (Markdown Architectural Decision Records)

---

## ADR Index

| ADR | Decision | Status |
|-----|---------|--------|
| ADR-001 | Supabase as primary backend (PostgreSQL + Edge Functions) | Accepted |
| ADR-002 | Vercel for frontend hosting and API routes | Accepted |
| ADR-003 | pgvector for CLIP embedding storage (not a separate vector DB) | Accepted |
| ADR-004 | Shared-database multi-tenancy with Row Level Security | Accepted |
| ADR-005 | Claude Haiku for intent classification (not fine-tuned model) | Accepted |
| ADR-006 | Termii as WhatsApp BSP (not direct Meta API) | Accepted |
| ADR-007 | Paystack as sole payment provider (not multi-provider) | Accepted |
| ADR-008 | Conversation state stored in PostgreSQL JSONB (not Redis) | Accepted |
| ADR-009 | Idempotency keys on all payment and webhook mutations | Accepted |
| ADR-010 | NDPR compliance via anonymization (not hard delete) | Accepted |

---

## ADR-001: Supabase as Primary Backend

**Date:** April 2026
**Status:** Accepted
**Deciders:** Dayo Kelani (Founder)

### Context

Lameda needs a backend infrastructure that supports: PostgreSQL with pgvector for AI embeddings, Row Level Security for multi-tenancy, real-time WebSocket subscriptions for merchant dashboard alerts, object storage for product images, and Edge Functions for background jobs. The team is a 1-2 person engineering team at MVP stage and cannot afford to manage separate infrastructure components.

### Decision

Use Supabase as the primary backend platform, providing PostgreSQL (with pgvector and pg_trgm extensions), Supabase Auth, Supabase Storage, Supabase Realtime, and Supabase Edge Functions as a single managed service.

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Supabase | All-in-one, pgvector native, RLS built-in, generous free tier, Edge Functions | Vendor lock-in, limited to PostgreSQL |
| Neon + separate services | More Postgres flexibility, cheaper at scale | Requires assembling Auth, Storage, Realtime separately |
| Firebase + Pinecone | Strong Realtime, generous free tier | Not relational, no SQL, Pinecone adds cost and complexity |
| Railway + custom | Full control | High operational overhead for a 2-person team |
| AWS (RDS + Lambda + S3) | Maximum flexibility, scalability | Extremely high setup overhead, expensive at low volume |

### Consequences

**Positive:**
- Single vendor reduces operational complexity by 80% at MVP stage
- pgvector built into PostgreSQL eliminates a separate vector database
- RLS enforces multi-tenant isolation at the database level (security backstop)
- Supabase Realtime handles merchant dashboard WebSocket subscriptions natively
- Edge Functions run on Deno/TypeScript, same language as Next.js

**Negative:**
- Vendor lock-in: migrating off Supabase later requires significant effort
- Edge Function cold starts can be 200-400ms (acceptable for background jobs, not for latency-sensitive paths)
- Supabase Pro plan ($25/month) required for pgvector and PITR

**Mitigation for lock-in:** Use standard PostgreSQL SQL throughout. Keep Edge Function logic thin (orchestration only, business logic in Next.js API routes). This ensures migration to bare RDS is possible within 2 weeks if needed.

---

## ADR-002: Vercel for Frontend Hosting and API Routes

**Date:** April 2026
**Status:** Accepted
**Deciders:** Dayo Kelani (Founder)

### Context

Lameda's merchant dashboard (Next.js) and API layer need hosting. The API handles WhatsApp webhooks (latency-sensitive, must ACK within 15 seconds), product search, and merchant dashboard requests.

### Decision

Deploy the Next.js application (both frontend and API routes) on Vercel. Use Vercel Edge Runtime for webhook handlers to minimize latency.

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Vercel | Zero-config Next.js deploy, PR preview environments, global edge, instant rollbacks | Cost scales with function invocations; Edge Runtime has constraints |
| Railway | Simple, supports any Node.js app, predictable pricing | No built-in CDN, no PR previews, more DevOps setup |
| Render | Good free tier, simple | Slower cold starts, no edge network |
| Self-hosted VPS (AWS/DigitalOcean) | Maximum control, cheapest at scale | Requires DevOps setup, no automatic SSL, no global edge |
| Cloudflare Workers + Pages | Fastest edge, low cost | Next.js support is partial; complex setup |

### Consequences

**Positive:**
- PR preview deployments enable integration testing against real staging Supabase
- Edge Runtime for webhook handlers: under 10ms cold start, global PoPs
- Vercel Analytics gives performance baseline without additional tooling
- Instant rollback on bad deploy (critical for production stability)
- Automatic SSL, CDN, and custom domain management

**Negative:**
- Vercel Pro plan ($20/month) required for team features and higher function limits
- Vendor lock-in: Next.js-specific features (App Router, Edge Runtime) create switching cost
- Function timeout: 30 seconds maximum on Edge Runtime (sufficient for current needs)

---

## ADR-003: pgvector for CLIP Embedding Storage

**Date:** April 2026
**Status:** Accepted
**Deciders:** Dayo Kelani (Founder)

### Context

Lameda requires vector similarity search to support image-based product matching (CLIP ViT-B/32, 512-dimension vectors) and semantic text search. Options include a dedicated vector database (Pinecone, Weaviate, Qdrant) or PostgreSQL with pgvector extension.

### Decision

Use pgvector (PostgreSQL extension) for all vector storage and similarity search. Store embeddings in the `product_embeddings` table with an ivfflat index.

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| pgvector (in Supabase) | No new service, same DB transaction scope, RLS applies to vectors too | ANN search slower than dedicated vector DB above 1M vectors |
| Pinecone | Fastest ANN search, purpose-built | Additional $70+/month, separate auth, complex to keep in sync with PostgreSQL |
| Weaviate | Open source, self-hostable, strong semantic search | High operational overhead, separate infrastructure |
| Qdrant | Fast, Rust-based, self-hostable | Separate service to operate |

### Rationale

At MVP scale (up to 500 merchants x average 50 products x 3 images = 75,000 vectors), pgvector with ivfflat (lists=100) delivers under 50ms search latency - well within the 400ms target. The operational simplicity of keeping vectors in PostgreSQL (same transactions, same RLS, same backups) outweighs the performance advantage of a dedicated vector database. Migration to a dedicated vector DB (if needed at 2,000+ merchants) is straightforward: the embedding values in `product_embeddings` are portable.

### Consequences

**Positive:**
- Zero additional infrastructure to manage
- RLS applies to vector search (merchants cannot search other merchants' embeddings)
- Atomic transactions: product creation and embedding storage in same transaction
- No embedding sync lag (vectors are always consistent with product records)

**Negative:**
- ivfflat requires periodic index rebuild for optimal performance
- Approximate (not exact) nearest-neighbor search: occasional false near-misses
- Performance ceiling: needs re-evaluation above 500,000 vectors

---

## ADR-004: Shared-Database Multi-Tenancy with Row Level Security

**Date:** April 2026
**Status:** Accepted
**Deciders:** Dayo Kelani (Founder)

### Context

Lameda is a multi-tenant SaaS where each merchant's data (products, customers, orders, conversations) must be completely isolated. Three common multi-tenancy patterns exist: separate databases per tenant, separate schemas per tenant, and shared schema with tenant isolation enforced in application code or database.

### Decision

Use a shared-schema multi-tenant model with PostgreSQL Row Level Security (RLS) as the primary isolation mechanism. Every table with merchant-owned data includes a `merchant_id` foreign key and an RLS policy enforcing `merchant_id = auth.uid()`.

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Shared schema + RLS (chosen) | Simple, scales to 10,000+ tenants, enforced at DB level | RLS policy mistakes can cause leakage; must test thoroughly |
| Separate schema per tenant | Strong isolation, easy to dump/restore per tenant | Complex Supabase management, schema migration complexity multiplies by tenant count |
| Separate database per tenant | Maximum isolation, easy GDPR compliance | Completely impractical at MVP; 500 Supabase projects = $12,500/month |
| Shared schema + application-level isolation | Simplest to implement | No DB-level backstop; a single query bug leaks cross-tenant data |

### Rationale

RLS provides a database-level backstop that means a bug in application code cannot leak data between merchants. At 500 merchants, the shared schema avoids the operational overhead of 500 separate migration pipelines. NDPR compliance is maintained through the erasure stored procedure, which works on a per-customer basis within the shared schema.

### Consequences

**Positive:**
- Cross-tenant data leakage is blocked at the DB level even if application bugs exist
- Single migration pipeline for all tenants
- Supabase Auth integrates directly with RLS (`auth.uid()` is the JWT sub)

**Negative:**
- RLS policies must be added to every new table (process enforcement required in code review)
- Some analytics queries (cross-merchant aggregates for Lameda's own analytics) require the service role key, bypassing RLS - these must be carefully controlled

---

## ADR-005: Claude Haiku for Intent Classification (No Fine-Tuning)

**Date:** April 2026
**Status:** Accepted
**Deciders:** Dayo Kelani (Founder)

### Context

Lameda needs intent classification for every inbound WhatsApp message. Options include: a fine-tuned classification model (e.g., fine-tuned GPT or BERT), a zero-shot/few-shot approach with a large language model, or rule-based classification.

### Decision

Use Claude Haiku (claude-haiku-4-5) for intent classification with a detailed system prompt and few-shot examples. No fine-tuning at MVP stage.

### Rationale

Fine-tuning requires a labelled training dataset (minimum 500-1,000 examples per intent), which Lameda does not have before launch. Claude Haiku's few-shot capability with a well-structured system prompt achieves 85%+ accuracy on Nigerian retail intents in internal testing. At under N0.002 per message, the cost is within the COGS model. Fine-tuning can be introduced at Month 9+ once sufficient conversation data exists (target: 10,000+ labelled examples).

### Consequences

**Positive:**
- No training data requirement before launch
- System prompt updates can improve classification without a new model deployment
- Nigerian Pidgin handled through prompt instruction without language-specific model
- Cost predictable and within model

**Negative:**
- Prompt tokens increase COGS by N0.0003 per message vs. a fine-tuned model
- Occasional hallucinated confidence scores (Claude sometimes over-confident on ambiguous messages)
- Latency: ~400ms per classification vs. ~50ms for a fine-tuned model (acceptable within 3-second total response target)

---

## ADR-006: Termii as WhatsApp BSP

**Date:** April 2026
**Status:** Accepted
**Deciders:** Dayo Kelani (Founder)

### Context

To send and receive WhatsApp Business messages programmatically, Lameda needs a WhatsApp Business Solution Provider (BSP). Meta allows direct Cloud API access, but BSPs handle the business verification, number registration, and per-message billing.

### Decision

Use Termii as the primary WhatsApp BSP, with Twilio configured as a dormant backup.

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Termii (chosen) | Nigerian company, Naira billing, local support, N0.38-N0.90/msg | Smaller global footprint vs. Twilio |
| Meta Cloud API direct | No BSP markup on per-message cost | Complex business verification, USD billing, no local support |
| Twilio | Global reliability, excellent docs, large feature set | USD billing increases Naira exposure, expensive per message ($0.005 = ~N8) |
| Vonage/Bird.com | Enterprise features | Pricing not SME-accessible |
| 360Dialog | WhatsApp-focused BSP | Limited Nigerian presence, EUR billing |

### Rationale

Termii's Naira billing removes USD FX exposure on the highest-cost COGS line (51% of COGS). Nigerian company means local support during outages. Per-message cost (N0.38-N0.90) is 8-20x cheaper than Twilio in NGN terms. Twilio is pre-integrated as a backup for continuity.

---

## ADR-007: Paystack as Sole Payment Provider (MVP)

**Date:** April 2026
**Status:** Accepted
**Deciders:** Dayo Kelani (Founder)

### Context

Lameda needs to generate payment links for customers to complete purchases. Nigerian customers pay via debit card, bank transfer, or USSD.

### Decision

Use Paystack as the sole payment provider for MVP. Add Flutterwave as a secondary option in Phase 2.

### Rationale

Paystack has the highest trust recognition among Nigerian consumers and merchants. Integration is well-documented. Paystack handles card, bank transfer, and USSD in a single checkout. Adding Flutterwave at MVP introduces complexity without significant incremental payment coverage (both serve the same Nigerian payment rails).

### Consequences

**Negative:**
- Single provider dependency: Paystack outage affects all merchants simultaneously (see RISK-T02)
- Paystack charges 1.5% + N100 per transaction: at N50,000 AOV, Paystack fee is N850 (1.7%) - not paid by Lameda (passed to customer or absorbed by merchant)

---

## ADR-008: Conversation State in PostgreSQL JSONB (Not Redis)

**Date:** April 2026
**Status:** Accepted
**Deciders:** Dayo Kelani (Founder)

### Context

Conversation state (current intent, cart contents, selected products, delivery details) must be maintained across multiple WhatsApp messages and potentially across sessions. Options include in-memory caching (Redis), a session store, or persisting to the primary database.

### Decision

Store conversation state in `conversations.context_json` (PostgreSQL JSONB column). Read on every message, update after every state transition.

### Rationale

At MVP scale (500 concurrent conversations), PostgreSQL read latency is under 5ms for a single-row lookup by UUID. The operational complexity and cost of adding Redis ($20-50/month on Upstash) is not justified until at least 5,000 concurrent conversations. JSONB is queryable for analytics (e.g., "how many conversations are in AWAITING_PAYMENT state?"). State persists across server restarts without a warm-up phase.

### Consequences

**Negative:**
- PostgreSQL write on every message increases DB write load (acceptable at MVP)
- No built-in TTL for stale conversations (handled by cleanup pg_cron job)
- Migration path: add Redis cache layer at 5,000+ concurrent conversations without changing data model

---

## ADR-009: Idempotency Keys on All Payment and Webhook Mutations

**Date:** April 2026
**Status:** Accepted
**Deciders:** Dayo Kelani (Founder)

### Context

Paystack webhooks can be delivered multiple times for the same event (Meta webhooks also retry on non-2xx). Without idempotency, a customer could be double-charged or an order confirmed twice.

### Decision

Require `Idempotency-Key` header on all state-mutating POST endpoints. Store keys in `webhook_events.idempotency_key` (UNIQUE constraint) and `payments.idempotency_key` (UNIQUE constraint). Return cached response for duplicate requests within 24 hours.

### Rationale

Financial correctness is non-negotiable. The N50,000 average order value means a double-charge creates a significant customer experience failure and potential chargeback. The implementation cost (adding a UNIQUE column and a check on entry) is minimal.

---

## ADR-010: NDPR Compliance via Anonymization (Not Hard Delete)

**Date:** April 2026
**Status:** Accepted
**Deciders:** Dayo Kelani (Founder)

### Context

NDPR grants customers the right to erasure of their personal data. However, hard-deleting customer records would break order history (financial records that merchants need for accounting and tax purposes).

### Decision

Implement NDPR right-to-erasure via anonymization: replace PII fields with `'ERASED'` within 72 hours, preserve non-PII fields (order amounts, dates, SKUs) for financial audit trail. Full implementation via `erase_customer_data()` stored procedure.

### Rationale

NDPR permits anonymization as an alternative to deletion where legitimate interests (financial record-keeping) apply, provided the anonymized data can no longer be linked to an identifiable individual. Preserving `ERASED` orders allows merchants to reconcile accounts without customer PII. Legal review confirms this approach is NDPR-compliant.

### Consequences

**Positive:**
- Merchant accounting records remain intact after erasure
- Order analytics (revenue, AOV) remain accurate after erasure
- Simpler implementation than cascading deletes across 8+ tables

**Negative:**
- Anonymized records still occupy DB storage
- Requires careful implementation to ensure ALL PII fields are covered (audit via NDPR consultant - STORY-036)
