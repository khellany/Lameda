# Technical Debt Register

**Project:** Lameda
**Maintained by:** Engineering Lead
**Last updated:** June 2026

This file tracks deliberate shortcuts, known limitations, and deferred work.
Every entry has a WHY (why we accepted the debt) and a WHEN (what milestone
triggers the fix). Undocumented shortcuts are bugs. Documented shortcuts are
decisions.

---

## How to Use This File

When you add a `TECHNICAL DEBT` comment in code, also add an entry here.
Format: **[TD-NNN]** - short title, file reference, why accepted, fix trigger.

---

## Open Items

### TD-001: Hand-authored database types
- **File:** `src/types/database.ts`
- **Debt:** Types are manually written and will drift from the real schema.
- **Why accepted:** Supabase CLI not set up locally yet. Manual types are correct at the time of writing.
- **Fix trigger:** After Supabase project is provisioned. Run `npx supabase gen types typescript` and replace the file.
- **Effort:** 30 minutes

---

### TD-002: No retry logic in Termii client
- **File:** `src/lib/whatsapp/client.ts`
- **Debt:** If Termii returns a 5xx or the network times out, the message is silently dropped.
- **Why accepted:** At MVP with <20 merchants, manual re-sends from the dashboard are acceptable. Low failure rate expected.
- **Fix trigger:** Sprint 3 or when first merchant reports a missed message.
- **Effort:** 2-3 hours (exponential backoff + pg-boss retry job)

---

### TD-003: Webhook state machine is stubbed (echo response)
- **File:** `src/app/api/webhook/whatsapp/route.ts` (Steps 6-8)
- **Debt:** The conversation routing is a simple echo. No AI, no cart, no intent classification.
- **Why accepted:** Sprint 1 scope is webhook ingestion + plumbing only. State machine is Sprint 2.
- **Fix trigger:** Sprint 2 - implement `src/lib/conversation/stateMachine.ts`
- **Effort:** 3-5 days

---

### TD-004: No customer rate limiting
- **File:** `src/app/api/webhook/whatsapp/route.ts`
- **Debt:** A single customer sending 100 messages rapidly triggers 100 AI inference calls.
- **Why accepted:** At beta with hand-picked merchants and known customers, abuse is not expected.
- **Fix trigger:** Before public launch (Sprint 3). Add Supabase-based rate limiting per customer per minute.
- **Effort:** 1 day

---

### TD-005: Pino logger incompatible with Next.js Edge Runtime
- **File:** `src/lib/utils/logger.ts`
- **Debt:** pino-pretty uses a worker thread. If any logger calls move to middleware.ts (Edge Runtime), the app will crash at cold start.
- **Why accepted:** No logging in middleware currently. Risk is zero today.
- **Fix trigger:** If logging is ever needed in Edge middleware. Replace with `console.log` or a fetch-based transport in that file only.
- **Effort:** 1 hour

---

### TD-006: Supabase admin client creates a new connection per request
- **File:** `src/lib/supabase/server.ts` - `createAdminClient()`
- **Debt:** Each webhook invocation creates a new Supabase client. At high volume, this creates connection pool pressure on the PostgreSQL instance.
- **Why accepted:** Supabase Pro plan includes PgBouncer (connection pooler) by default. At MVP scale (<50 concurrent webhooks), this is safe.
- **Fix trigger:** When webhook volume exceeds 100 concurrent requests. Enable transaction-mode PgBouncer in Supabase dashboard.
- **Effort:** 15 minutes (config change only)

---

### TD-007: Product embeddings not yet implemented
- **File:** `supabase/migrations/001_initial_schema.sql` - `product_embeddings` table
- **Debt:** The table and vector index exist but no embedding generation job exists yet.
- **Why accepted:** Catalog search (Sprint 3) depends on embeddings. Sprint 1 has no catalog.
- **Fix trigger:** Sprint 3 - implement `src/lib/ai/embeddings.ts` and the catalog upload flow.
- **Effort:** 2 days

---

### TD-008: Webhook event table has no merchant_id
- **File:** `supabase/migrations/001_initial_schema.sql`
- **Debt:** `webhook_events` is platform-level with no merchant scoping. Merchants cannot view their own webhook logs from the dashboard.
- **Why accepted:** Webhook debugging is an internal/admin concern at MVP. Merchants do not need this.
- **Fix trigger:** Sprint 4 when building the merchant debugging dashboard. Add `merchant_id` column via migration.
- **Effort:** 2 hours (migration + RLS policy update)

---

### TD-009: No abandoned cart recovery job
- **File:** Not yet implemented
- **Debt:** The pg-boss queue library is installed but no jobs are registered. Abandoned cart recovery (2-hour follow-up) requires a background job.
- **Why accepted:** Cart flow itself is not built yet (Sprint 2). No point building recovery before the cart.
- **Fix trigger:** Sprint 2, after cart state machine is complete.
- **Effort:** 1 day (`src/lib/queue/jobs.ts` + pg-boss setup)

---

### TD-010: No input validation on webhook payload
- **File:** `src/app/api/webhook/whatsapp/route.ts`
- **Debt:** Payload is cast with `as TermiiWebhookPayload` without runtime validation. A malformed payload would throw in normalizeTermiiPayload().
- **Why accepted:** Signature verification ensures only Termii sends payloads. The risk of malformed-but-signed payloads is low.
- **Fix trigger:** Sprint 2. Add Zod schema validation after JSON.parse(). Zod is already installed.
- **Effort:** 2 hours

---

## Resolved Items

_(None yet - this project was started June 2026)_

---

## Debt Score

| Sprint | Open Items | Resolved | Score |
|--------|-----------|----------|-------|
| Sprint 1 | 10 | 0 | 10 |

Target: No P0 debt items open at any time. P1 items must have a fix-trigger milestone assigned.

| Priority | Definition |
|----------|-----------|
| P0 | Security or data loss risk. Fix before next commit. |
| P1 | Correctness risk at production scale. Fix before launch. |
| P2 | Performance or reliability concern. Fix within 2 sprints. |
| P3 | Code quality / developer experience. Fix when convenient. |
