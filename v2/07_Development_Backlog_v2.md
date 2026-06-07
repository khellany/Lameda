# Lameda - Development Backlog v2
**Version:** 2.0 | **Date:** May 2026 | **Sprint Duration:** 2 weeks | **Team:** 2 FTE Engineers + Founder

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

### Sprint 1

**STORY-001: Merchant registration and login** (8pts)
As a merchant, I can create an account with email + password and log in to receive a JWT.
Acceptance criteria:
- POST /api/v1/auth/login returns access_token + refresh_token
- Tokens expire in 1hr / 7 days respectively
- Passwords hashed with bcrypt (cost 12)
- NDPR consent checkbox required at registration

**STORY-002: JWT refresh and logout** (3pts)
As a merchant, my session refreshes automatically and I can log out to invalidate tokens.

**STORY-003: Merchant profile setup wizard** (5pts)
As a new merchant, I complete a 5-step wizard to configure my store (WhatsApp number, persona, delivery policy, return policy, FAQs).

**STORY-004: WhatsApp Business number verification** (8pts)
As a merchant, I connect my WhatsApp Business number via OTP verification through the WhatsApp Cloud API.
Technical note: Use WhatsApp Cloud API phone number registration endpoint. Verify via OTP to registered number.

**STORY-005: Supabase schema migration pipeline** (5pts) - E5 overlap
Set up Supabase migrations folder + GitHub Actions workflow. All schema changes via migrations, never manual SQL in production.

**Sprint 1 total: 29 story points**

### Sprint 2

**STORY-006: Dashboard home screen** (5pts)
As a merchant, I see today's revenue, order count, active conversations, and handoff alerts on login.

**STORY-007: Plan enforcement middleware** (5pts)
As the system, I enforce conversation limits, product limits, and broadcast limits per subscription plan. Merchants over limit receive in-app prompt to upgrade.

**STORY-008: Trial expiry and upgrade flow** (3pts)
As a merchant on trial, I receive in-app and WhatsApp alerts at day 10, day 12, day 14. After day 14, non-paying merchants are read-only.

---

## EPIC 2 - Product Catalog

### Sprint 2 (continued)

**STORY-009: Manual product creation** (5pts)
As a merchant, I can add a product with name, description, price, category, images (up to 5), and stock quantity.

**STORY-010: Product variants** (5pts)
As a merchant, I can add size and color variants to a product, each with its own stock count and optional price adjustment.

**STORY-011: Product image upload to Supabase Storage** (3pts)
Images uploaded via dashboard are stored in Supabase Storage with CDN URLs.

### Sprint 3

**STORY-012: CSV bulk product import** (8pts)
As a merchant, I can upload a CSV with up to 100 products. Validation errors are shown row by row. Successful rows are imported immediately.

**STORY-013: CLIP embedding pipeline** (13pts)
As the system, when a product image is uploaded, I generate a CLIP ViT-B/32 embedding and store it in product_embeddings with the model version.
Technical: Supabase Edge Function calls CLIP API (self-hosted or Replicate), stores vector in pgvector column.

**STORY-014: pgvector image similarity search** (8pts)
POST /api/v1/products/image-match returns top-5 products by cosine similarity to an uploaded image.

**STORY-015: NLP semantic product search** (8pts)
POST /api/v1/products/search uses text embeddings + pgvector to return ranked results. Fallback to trigram (pg_trgm) if vector score < 0.6.

---

## EPIC 3 - Conversation Engine

### Sprint 3 (continued)

**STORY-016: WhatsApp inbound webhook handler** (8pts)
POST /api/webhooks/v1/whatsapp receives and validates (HMAC-SHA512) incoming messages. Deduplicates via webhook_events idempotency_key.

**STORY-017: Conversation state machine** (13pts)
As the AI, I manage conversation context across: greeting, product inquiry, variant selection, delivery capture, payment, confirmation, and support states.
Technical: State stored in conversations.context_json. Transitions logged to messages table.

### Sprint 4

**STORY-018: Intent classification with Claude Haiku** (8pts)
As the AI, I classify customer messages into intents (product_search, order_status, complaint, price_inquiry, human_request) with confidence scores. Confidence < 0.7 triggers handoff.

**STORY-019: Product recommendation response** (8pts)
For product_search intent, I search the catalog (NLP or image), return up to 3 product cards via WhatsApp interactive messages (image + name + price + CTA).

**STORY-020: Variant selection flow** (5pts)
After product selection, I guide customer through size and color selection using WhatsApp list messages.

**STORY-021: Human handoff trigger and alert** (8pts)
When handoff is triggered, I send customer a "connecting you now" message, create handoff record, and push real-time notification to merchant dashboard via Supabase Realtime.

### Sprint 5

**STORY-022: Merchant conversation takeover** (5pts)
As a merchant, I can take over a conversation, see full history, send messages directly, and resume AI when done.

**STORY-023: Nigerian Pidgin language mode** (8pts)
As the AI, when merchant sets language to "pcm", I respond in Nigerian Pidgin across all flows.

**STORY-024: Out-of-stock handling** (3pts)
When item is out of stock, I suggest alternatives and offer to notify customer when restocked (stored in customer_preferences).

---

## EPIC 4 - Commerce

### Sprint 5 (continued)

**STORY-025: Order creation from conversation** (8pts)
As the AI, after delivery address capture, I create an order record and link it to the active conversation.

**STORY-026: Paystack payment link generation** (8pts)
I generate a Paystack checkout URL (30-minute expiry), send it via WhatsApp, and poll for payment confirmation via webhook.

### Sprint 6

**STORY-027: Payment webhook handler** (8pts)
POST /api/webhooks/v1/paystack handles charge.success: updates order to "confirmed", sends WhatsApp confirmation to customer, updates merchant dashboard.

**STORY-028: Abandoned cart recovery** (8pts)
As the system, 15 minutes after an order is created but not paid, I send Message 1. If unpaid after 2 hours, send Message 2. Stop on payment or opt-out.

**STORY-029: Order status tracking** (5pts)
As a merchant, I can update order status (dispatched, delivered, cancelled). Customer receives WhatsApp notification on each status change.

**STORY-030: Inventory reservation** (3pts)
When an order is created (pre-payment), reserve inventory. Release reservation if payment not received in 30 minutes.

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
