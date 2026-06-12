# Lameda - Development Backlog v2
**Version:** 2.1 | **Date:** June 2026 | **Sprint Duration:** 2 weeks | **Team:** 2 FTE Engineers + Founder

> **Status as of June 2026:** Sprints 1–4 complete. Sprint 5 (Commerce) is the active next milestone.
> Channel pivot: Implementation is **Telegram-first**. WhatsApp/Termii stories are re-scoped below where already implemented in Telegram.

---

## Sprint Completion Summary

| Sprint | Status | Notes |
|--------|--------|-------|
| Sprint 1 | ✅ Done | Auth, Supabase schema, merchant registration |
| Sprint 2 | ✅ Done | Dashboard CRM, plan enforcement, product CRUD, variants |
| Sprint 3 | ✅ Done | CSV import, OpenAI embeddings, pgvector search, webhook handler |
| Sprint 4 | ✅ Done | State machine, Claude intent classification, product recs, variant flow, handoff, Telegram admin commands, business-type conversation variants |
| Sprint 5 | ✅ Done | Commerce: order creation, payment links, handoff alerts, Pidgin mode, out-of-stock, TD-001/002 |
| Sprint 6+ | 🔲 Backlog | Cart recovery cron ✅ already shipped; payment expiry cron ✅ already shipped |

---

## Definition of Done

**All user stories must meet ALL of the following before closing:**
- Feature code reviewed and approved by at least 1 other engineer
- Unit tests written (minimum 80% coverage on new code)
- Integration tests pass in staging environment
- NDPR implications reviewed (any PII handling documented)
- No critical or high Sentry errors in staging
- Feature flag toggled if feature is behind a flag
- Relevant API documentation updated
- Product owner (founder) sign-off received

---

## Epic Map

| Epic | Focus | Sprints |
|------|-------|---------|
| E1 - Foundation | Auth, infra, merchant onboarding | 1-2 |
| E2 - Catalog | Products, variants, CLIP embeddings | 2-3 |
| E3 - Conversation | WhatsApp integration, AI engine, handoff | 3-5 |
| E4 - Commerce | Orders, payments, cart recovery | 5-6 |
| E5 - Infrastructure | CI/CD, monitoring, staging | 1-6 (ongoing) |
| E6 - Security | Pen test, NDPR audit, secrets management | 6-7 |
| E7 - Growth | Analytics, broadcasts, CRM | 7-9 |
| E8 - Scale | Performance, multi-tenancy hardening | 9-10 |

---

## EPIC 1 - Foundation

### Sprint 1 ✅ COMPLETE

**STORY-001: Merchant registration and login** ✅ (8pts)
As a merchant, I can create an account and log in.
*Implemented:* Self-service `/onboard` form → `/api/merchants/register`. Supabase Auth handles credentials (not bcrypt/custom JWT). Temporary password emailed via Resend. `api_key` generated and returned.

**STORY-002: JWT refresh and logout** ✅ (3pts)
As a merchant, my session refreshes automatically and I can log out to invalidate tokens.
*Implemented:* Delegated entirely to Supabase Auth SDK. `/app/(auth)/login` page live.

**STORY-003: Merchant profile setup wizard** ✅ (5pts)
As a new merchant, I complete setup to configure my store.
*Implemented:* Registration form captures business_name, owner_name, email, business_type, telegram_bot_token. Bot persona set via `bot_name` column.

**STORY-004: Telegram bot connection** ✅ (8pts) *(re-scoped from WhatsApp)*
As a merchant, I connect my Telegram bot token. System validates it against the Telegram API and registers the webhook.
*Implemented:* `/api/merchants/register` validates token via `validateBotToken()`, registers webhook at `/api/webhook/telegram/{merchant_id}`.

**STORY-005: Supabase schema migration pipeline** ✅ (5pts) - E5 overlap
Set up Supabase migrations folder. All schema changes via migrations, never manual SQL in production.
*Implemented:* 13 migrations in `lameda/supabase/migrations/`.

**Sprint 1 total: 29 story points**

### Sprint 2 ✅ COMPLETE

**STORY-006: Dashboard home screen** ✅ (5pts)
As a merchant, I see today's revenue, order count, active conversations, and handoff alerts on login.
*Implemented:* CRM dashboard with `/api/crm/orders` and `/api/crm/customers` endpoints.

**STORY-007: Plan enforcement middleware** ✅ (5pts)
As the system, I enforce conversation limits, product limits, and broadcast limits per subscription plan.
*Implemented:* `subscription_tier` and `subscription_status` enforced via merchant config.

**STORY-008: Trial expiry and upgrade flow** ✅ (3pts)
As a merchant on trial, alerts sent on trial expiry.
*Implemented:* `trial_ends_at` tracked; enforcement logic in place.

---

## EPIC 2 - Product Catalog

### Sprint 2 (continued) ✅ COMPLETE

**STORY-009: Manual product creation** ✅ (5pts)
As a merchant, I can add a product with name, description, price, category, and stock quantity.
*Implemented:* Products table live with full CRUD support.

**STORY-010: Product variants** ✅ (5pts)
As a merchant, I can add size and color variants, each with its own stock count.
*Implemented:* `product_variants` table (migration 006). `UNIQUE NULLS NOT DISTINCT (product_id, size, color)`.

**STORY-011: Product image upload to Supabase Storage** (3pts) ⚠️ *Partial*
*Status:* `image_url` column stores URL. Direct Supabase Storage upload integration not yet wired in dashboard UI.

### Sprint 3 ✅ COMPLETE

**STORY-012: CSV bulk product import** ✅ (8pts)
As a merchant, I can upload a CSV with products. Validation errors shown row by row.
*Implemented:* `POST /api/products/import`. Supports: name, description, price_ngn (converted to kobo), category, image_url, stock_count, sizes (pipe-separated), colors (pipe-separated).

**STORY-013: OpenAI text embedding pipeline** ✅ (13pts) *(re-scoped from CLIP to OpenAI text-embedding-3-small)*
As the system, I embed product text (name | description | category) and store 1536-dim vectors in pgvector.
*Implemented:* `POST /api/products/[productId]/embed` and `POST /api/products/embed-all`. Model: `text-embedding-3-small`. RPC: `search_products_by_embedding()`.

**STORY-014: pgvector semantic product search** ✅ (8pts)
Products returned by cosine similarity via `search_products_by_embedding()` RPC. Threshold 0.5. Fallback to pg_trgm.
*Implemented:* `src/lib/products/search.ts`.

**STORY-015: NLP semantic product search** ✅ (8pts)
Customer query embedded at runtime and matched against catalog.
*Implemented:* Same pipeline as STORY-013/014. Both text and image-to-text paths covered.

---

## EPIC 3 - Conversation Engine

### Sprint 3 (continued) ✅ COMPLETE

**STORY-016: Telegram inbound webhook handler** ✅ (8pts) *(re-scoped from WhatsApp)*
`POST /api/webhook/telegram/[merchantId]` receives and validates Telegram updates via `X-Telegram-Bot-Api-Secret-Token`. Deduplicates via `webhook_events` table (source=telegram, external_id=update_id).
*Implemented:* `src/app/api/webhook/telegram/[merchantId]/route.ts`. HMAC-SHA256 verification in `src/lib/telegram/verify.ts`.

**STORY-017: Conversation state machine** ✅ (13pts)
Full state machine managing: greeting → browse → product → cart → checkout → handoff → orders → complaint → admin.
*Implemented:* `src/lib/conversation/stateMachine.ts`. State stored in `conversations.state JSONB`. One handler file per intent in `src/lib/conversation/handlers/`.

### Sprint 4 ✅ COMPLETE

**STORY-018: Intent classification with Claude** ✅ (8pts)
Claude classifies customer messages into intents with confidence scores. Low confidence triggers handoff.
*Implemented:* `src/lib/ai/classify.ts`. Intents: browse, product_search, add_to_cart, checkout, order_status, complaint, human_request, admin, image_search, greeting, fallback.

**STORY-019: Product recommendation response** ✅ (8pts)
For product_search intent, semantic search returns top matches sent as Telegram messages (name + price + description).
*Implemented:* `src/lib/conversation/handlers/product.ts` + `src/lib/conversation/handlers/browse.ts`.

**STORY-020: Variant selection flow** ✅ (5pts)
After product selection, guides customer through size/color selection using Telegram inline keyboards.
*Implemented:* `src/lib/conversation/handlers/cart.ts`.

**STORY-021: Telegram admin commands for merchant bot management** ✅ (8pts)
Merchant sends `/register`, `/addproduct`, `/listproducts`, `/updatestock`, `/orders` directly in their own bot.
*Implemented:* `src/lib/conversation/handlers/admin.ts`. Admin authenticated via `admin_telegram_chat_id` (migration 011).

**STORY-022: Business-type-aware conversation variants** ✅ (5pts)
Bot prompts and product labels adapt to the merchant's `business_type` (fashion/food/electronics/beauty/services/general).
*Implemented:* `src/lib/merchant/config.ts` — `BusinessType` enum + config helpers injected into AI prompts.

### Sprint 5 — NEXT

**STORY-023: Human handoff trigger and alert** ✅ (8pts)
When handoff is triggered, send customer "connecting you now", create handoff record, notify merchant admin via Telegram.
*Implemented:* `src/lib/conversation/handlers/handoff.ts` — customer message + merchant admin Telegram alert via `admin_telegram_chat_id`. Conversation flagged with `current_intent: 'handoff:{reason}'` for Sprint 7 dashboard pickup.

**STORY-024: Nigerian Pidgin language mode** ✅ (8pts)
When customer uses Pidgin, AI responds in warm Nigerian Pidgin across product descriptions and support replies.
*Implemented:* `classify.ts` detects `language: 'pcm'`. `respond.ts` has dedicated `PIDGIN_SYSTEM` prompt. Language wired to `generateProductDescription` (`product.ts`) and `generateSupportReply` (`fallback.ts`) via `ctx.state.language`.

**STORY-025: Out-of-stock handling** ✅ (3pts)
When item is out of stock, suggest up to 3 similar alternatives. Browse button shown if no alternatives found.
*Implemented:* `handleOutOfStock()` in `src/lib/conversation/handlers/product.ts:325`.

---

## EPIC 4 - Commerce

### Sprint 5 (continued) — NEXT

**STORY-026: Order creation from conversation** ✅ (8pts)
After delivery address capture and order confirmation, order record created with line_items JSONB, encrypted delivery_address, reference, delivery_fee_kobo, and linked conversation_id.
*Implemented:* `handleConfirmOrder()` in `src/lib/conversation/handlers/checkout.ts`.

**STORY-027: Paystack payment link generation** ✅ (8pts)
Paystack checkout URL generated (30-min expiry), sent via Telegram. Payment record inserted with `expires_at`. Mock mode available via `PAYMENT_MOCK=true` env var for prototype testing.
*Implemented:* `handleConfirmOrder()` calls `initializeTransaction()` in `src/lib/payments/paystack.ts`.

### Sprint 6

**STORY-028: Payment webhook handler** ✅ (8pts)
*Already shipped:* `POST /api/webhooks/paystack` handles `charge.success`. Updates payment + order status. Sends Telegram confirmation to customer. Notifies merchant admin via Telegram.

**STORY-029: Abandoned cart recovery** ✅ (8pts)
*Already shipped:* `GET /api/cron/cart-recovery`. Message 1 at 15 min, Message 2 at 2 hours. Tracked via `conversations.cart_recovery_1/2_sent_at`. Scheduled in `vercel.json`.

**STORY-030: Order status tracking** 🔲 (5pts)
As a merchant, I can update order status (dispatched, delivered, cancelled). Customer receives Telegram notification.
*Note:* `POST /api/webhooks/order-delivered` (Supabase DB webhook) sends delivery confirmation — partially implemented.

**STORY-031: Inventory reservation** 🔲 (3pts)
When an order is created (pre-payment), reserve inventory. Release if payment not received.

**STORY-032: Payment expiry cron** ✅ (3pts)
*Already shipped:* `GET /api/cron/payment-expiry`. Expires unpaid Paystack links > 30 min. Restores reserved stock. Scheduled in `vercel.json`.

---

## EPIC 5 - Infrastructure (Ongoing, Sprints 1-6)

**STORY-031: GitHub Actions CI pipeline** (8pts)
Run linting, unit tests, and integration tests on every PR. Block merge on test failure.

**STORY-032: Staging environment** (5pts)
Vercel preview deployments for every PR. Separate Supabase project for staging. Environment variables via Vercel environment management.

**STORY-033: Error monitoring with Sentry** (3pts)
Sentry integrated into Next.js and Edge Functions. Alerts to Slack channel on new critical errors.

**STORY-034: Uptime monitoring** (2pts)
Betterstack or Uptime Robot checks all critical endpoints every 60 seconds. PagerDuty alert to founder's phone if downtime > 2 minutes.

**STORY-035: Database backup verification** (3pts)
Supabase Point-In-Time-Recovery enabled. Weekly restore test to verify backup integrity.

---

## EPIC 6 - Security (Sprints 6-7)

**STORY-036: NDPR compliance audit** (13pts)
Engage NDPR-certified consultant to review data flows. Implement any remediation items. Publish privacy notice on landing page.

**STORY-037: Secrets management** (5pts)
All API keys (Paystack, Termii, WhatsApp, Anthropic) stored in Vercel Environment Variables (encrypted at rest). No secrets in codebase or logs.

**STORY-038: OWASP Top 10 remediation** (8pts)
Automated OWASP ZAP scan. Remediate all critical and high findings before launch.

**STORY-039: Right to erasure implementation** (5pts)
DELETE /api/v1/customers/{id}/data endpoint. Anonymises PII within 72 hours. Audit log entry created.

---

## EPIC 7 - Growth (Sprints 7-9)

**STORY-040: Analytics dashboard** (13pts)
Revenue over time, conversion funnel, top products, peak hours heatmap. Date range selector.

**STORY-041: Broadcast campaign manager** (8pts)
Create, schedule, and send WhatsApp broadcasts. Audience segmentation by tag and last order date.

**STORY-042: Customer CRM view** (5pts)
Customer list with total orders, total spend, last active date. Click through to conversation history.

**STORY-043: Referral program** (8pts)
Unique referral link per merchant. 1 free month credited when referred merchant completes trial. Tracked in audit_logs.

---

## Sprint Velocity Target
- Sprint 1-2: 30 pts/sprint (ramp-up)
- Sprint 3-6: 45 pts/sprint (full velocity)
- Sprint 7-10: 40 pts/sprint (scale + polish)

**MVP launch target: End of Sprint 6 (Week 12)**

---

## Technical Debt Register

Items below are known technical debt accrued during Sprints 1–4. They are not blocking but should be scheduled before the platform reaches 100+ active merchants. See `ENGINEERING.md` for the full Resource-Constrained Decisions (RD-001 through RD-015) table with future state plans.

| ID | Debt item | Source decision | Effort | Priority | Target sprint |
|----|-----------|----------------|--------|----------|---------------|
| TD-001 | ✅ **Removed `MERCHANT_API_KEY` shared env var** from `/api/products/embed-all` — now uses per-merchant `X-Merchant-Api-Key` with DB lookup, same as import route. | RD-015 | 1 pt | ~~High~~ Done | Sprint 5 |
| TD-002 | ✅ **Per-plan CSV import limits enforced** — `PLAN_ROW_LIMITS` map in `/api/products/import`: starter=100, growth=500, pro=unlimited. Reads `subscription_tier` from merchant row. | RD-011 | 3 pts | ~~Medium~~ Done | Sprint 5 |
| TD-003 | **Rename STORY-041 broadcast story** — references "WhatsApp broadcasts". Update to "Telegram broadcasts" (channel pivot). Broadcast via `sendMessage` to opted-in customer chat IDs. | RD-001 | 1 pt | Low | Sprint 7 |
| TD-004 | **STORY-037 secrets audit** — references "Termii" in the secrets list. Termii is deferred to Phase 2; update the story to reflect actual secrets: Paystack, OpenAI, Anthropic, Telegram webhook secret, Resend. | RD-001 | 1 pt | Low | Sprint 6 |
| TD-005 | **`conversation.state` JSONB schema validation** — state machine writes arbitrary shape to `state` column with no runtime schema check. Add Zod validation on read/write in `stateMachine.ts` to catch shape drift early. | ADR-007 | 3 pts | Medium | Sprint 5 |
| TD-006 | **pgvector IVFFlat index tuning** — `lists=50` was set at schema creation with no data. Re-run `VACUUM ANALYZE product_embeddings` and tune `lists` once catalog reaches 10K rows (rule: `sqrt(rows)`). | Schema v2.1 | 1 pt | Low | Sprint 8 |
| TD-007 | **Paystack test mode cleanup** — `/api/test/payment-link` is only blocked by `NODE_ENV !== 'production'` check. Add an explicit `IS_TEST_ENDPOINT_ENABLED` env flag so it can be toggled in staging without a deploy. | Sprint 3 | 1 pt | Low | Sprint 6 |
| TD-008 | **`audit_logs` pruning policy** — table is append-only (correct for compliance) but has no archival job. At 1M rows (~100K orders), query performance degrades. Add a Vercel Cron job to archive rows older than 1 year to a cold `audit_logs_archive` table. | Schema v2.1 | 3 pts | Low | Sprint 9 |
| TD-009 | **Missing webhook idempotency for `order-delivered`** — Paystack and Telegram webhooks both deduplicate via `webhook_events`. The `order-delivered` Supabase Database Webhook does not. Add dedup check before sending delivery confirmation to prevent double-messages on retry. | Sprint 4 | 2 pts | High | Sprint 5 |
| TD-010 | **`customers.phone_number` stores Telegram `chat_id` not a phone number** — column name is misleading. When WhatsApp is activated in Phase 2, there will be two different identifier types. Add `channel_identifier` column and deprecate `phone_number`, or at minimum add a `source_channel` column to `customers`. | RD-001 | 5 pts | Medium | Phase 2 prep |
