# Lameda - Engineering System Design Document
**Version:** 3.0 | **Date:** May 2026 | **Author:** Engineering Team | **Status:** Pre-Build Review

---

## Executive Summary

This document specifies the detailed engineering system design for Lameda - a multi-tenant conversational commerce platform built on WhatsApp. It covers the conversation processing pipeline, AI integration patterns, data model relationships, real-time infrastructure, and the specific engineering decisions that govern how the system handles scale, failure, and security. This document is the authoritative engineering reference for Sprint 1 through Sprint 10.

---

## 1. System Requirements

### Functional Requirements (MVP)

**Conversation Processing**
- Handle inbound WhatsApp messages from any customer of any connected merchant
- Classify intent with at least 85% accuracy for the 5 core intents
- Route to human handoff when AI confidence falls below 0.70
- Maintain conversation state across multiple messages and sessions
- Support Nigerian Pidgin as a first-class language option

**Product Discovery**
- Text-based semantic search returning ranked results in under 400ms
- Image-based product matching (CLIP) returning results in under 3 seconds
- Variant availability check in real time
- Catalog size: up to 100 SKUs (Starter), 500 (Growth), unlimited (Pro)

**Order and Payment**
- Create orders from conversation context without merchant intervention
- Generate Paystack payment links with 30-minute expiry
- Abandoned cart recovery: 2-message sequence at T+15min and T+2hr
- Inventory reservation on order creation, release on payment expiry

**Merchant Dashboard**
- Real-time conversation inbox with handoff alerts (under 2 seconds latency)
- Order management with status tracking
- Analytics: conversion funnel, revenue, peak hours
- Broadcast campaign management with audience segmentation

### Non-Functional Requirements

| Requirement | Target | Notes |
|------------|--------|-------|
| Webhook response time | Under 200ms | WhatsApp expects ACK within 15 seconds |
| AI response delivery | Under 3 seconds end-to-end | Measured customer-to-delivery |
| Dashboard load time | Under 1.5 seconds | Vercel edge + Supabase connection pool |
| System uptime | 99.5% monthly | Equals 3.6 hours downtime/month |
| Concurrent conversations | 500 at MVP | ~2.5 per merchant average |
| Data residency | Nigeria | NDPR requirement |
| Max message size | 4,096 characters | WhatsApp limit |

---

## 2. Conversation State Machine

Every conversation moves through a defined set of states. State is stored in `conversations.context_json` and persisted after every message.

### State Definitions

```
GREETING
  - Entry: First message from new or returning customer
  - Actions: Load customer preferences, generate personalised greeting
  - Transitions: -> PRODUCT_INQUIRY (product intent), -> SUPPORT (complaint intent), -> ORDER_STATUS (status intent)

PRODUCT_INQUIRY
  - Entry: Customer expresses product interest
  - Actions: Run NLP/image search, return product cards
  - Transitions: -> VARIANT_SELECTION (product selected), -> PRODUCT_INQUIRY (refine search), -> HUMAN_HANDOFF (low confidence)

VARIANT_SELECTION
  - Entry: Customer selects a specific product
  - Actions: Show available sizes/colors as WhatsApp list message
  - Transitions: -> DELIVERY_CAPTURE (variant selected), -> PRODUCT_INQUIRY (start over)

DELIVERY_CAPTURE
  - Entry: Variant confirmed, need delivery details
  - Actions: Ask for delivery address, capture and validate
  - Transitions: -> ORDER_CREATED (address captured), -> HUMAN_HANDOFF (complex delivery request)

ORDER_CREATED
  - Entry: Delivery details captured
  - Actions: Create order record, generate Paystack link, start cart timer
  - Transitions: -> AWAITING_PAYMENT, -> HUMAN_HANDOFF (payment questions)

AWAITING_PAYMENT
  - Entry: Payment link sent
  - Actions: Poll Paystack status, run abandoned cart sequence
  - Transitions: -> CONFIRMED (payment received), -> ABANDONED (timer expired + no payment)

CONFIRMED
  - Entry: Paystack charge.success webhook received
  - Actions: Update order, reserve inventory, send confirmation
  - Transitions: -> ORDER_STATUS (customer follows up), -> SUPPORT (complaint)

ABANDONED
  - Entry: T+2hr without payment
  - Actions: Release inventory reservation, send final message
  - Transitions: -> GREETING (customer re-engages)

SUPPORT
  - Entry: Complaint, high emotion, or explicit human request
  - Actions: Check complaint type, escalate appropriately
  - Transitions: -> HUMAN_HANDOFF (always for complaints), -> ORDER_STATUS (tracking query)

HUMAN_HANDOFF
  - Entry: Triggered by low confidence, emotional markers, or SUPPORT state
  - Actions: Send "connecting you" message, create handoff record, push Realtime alert
  - Transitions: -> [Merchant handles] -> GREETING or SUPPORT (when AI resumed)
```

### Context JSON Schema

```json
{
  "state": "VARIANT_SELECTION",
  "selected_product_id": "uuid",
  "selected_variant_id": null,
  "cart": {
    "items": [{ "product_id": "uuid", "variant_id": "uuid", "quantity": 1 }],
    "delivery_address": null,
    "order_id": null
  },
  "search_history": ["ankara top", "blue dress"],
  "language": "pcm",
  "last_intent": "product_search",
  "last_confidence": 0.91,
  "handoff_count": 0,
  "session_start": "2026-05-22T10:00:00Z"
}
```

---

## 3. AI Integration Architecture

### Intent Classification (Claude Haiku)

Every inbound message is classified before routing. The system prompt is constructed at runtime using merchant-specific configuration.

**System Prompt Template:**
```
You are [persona_name], a sales assistant for [business_name], a Nigerian fashion retailer.
Language: [en|pcm]
Products available: [catalog_summary]
Business hours: [hours]
Delivery policy: [policy]

Your job is to help customers find products, place orders, and resolve queries.
Always respond warmly and conversationally.
If a customer is upset or you are unsure, always offer to connect them with the store owner.

Classify the customer intent as one of:
- product_search: customer wants to find or browse products
- order_status: customer asking about existing order
- complaint: customer expressing dissatisfaction
- price_inquiry: asking about price or discounts
- human_request: explicitly asking for a human
- greeting: casual greeting with no specific intent
- other: does not fit above categories

Return JSON: {"intent": "[intent]", "confidence": [0.0-1.0], "extracted": {"product_query": "...", "order_ref": "..."}}
```

**Routing Logic:**
```
confidence >= 0.70 AND intent != human_request -> AI handles
confidence < 0.70 OR intent == human_request -> human_handoff
intent == complaint -> check keywords: if ["angry", "refund", "horrible", "scam"] present -> human_handoff
```

### Response Generation (Claude Haiku)

After intent classification, the response generator is given the full conversation context, intent, and relevant product or order data. It outputs conversational WhatsApp-formatted text.

**Key constraint:** Maximum 3 product suggestions per message (WhatsApp interactive message limit). If more than 3 match, re-rank by: stock availability first, then similarity score.

### CLIP Image Matching

CLIP (Contrastive Language-Image Pre-Training) is used for image-based product search. The customer sends a photo; the system encodes it with CLIP and retrieves the 5 nearest products by cosine similarity against pre-computed product embeddings.

**Embedding Pipeline:**
1. Merchant uploads product image
2. Supabase Edge Function triggers `embed_product_image`
3. Replicate API: CLIP ViT-B/32 encodes image to 512-dimension vector
4. Vector stored in `product_embeddings` with `model_version`
5. ivfflat index updated automatically for ANN search

**Query Pipeline:**
1. Customer sends image via WhatsApp
2. Meta CDN URL extracted from webhook payload
3. Edge Function calls Replicate with CDN URL
4. Query: `SELECT product_id FROM product_embeddings ORDER BY embedding <=> $1 LIMIT 5`
5. Join with products and variants to check availability
6. Return top 3 available matches

---

## 4. Real-Time Infrastructure

The merchant dashboard needs sub-2-second latency for handoff alerts. Supabase Realtime (built on Phoenix Channels / WebSocket) is used.

### Channels

```
Channel: merchants:{merchant_id}
  Events:
  - handoff_alert: { conversation_id, customer_name, reason, preview_message }
  - new_order: { order_id, order_number, amount, customer_name }
  - payment_confirmed: { order_id, amount }
  - conversation_update: { conversation_id, last_message, status }
```

### Frontend Subscription (Next.js)

```typescript
const channel = supabase
  .channel(`merchants:${merchantId}`)
  .on('broadcast', { event: 'handoff_alert' }, (payload) => {
    showHandoffNotification(payload);
    incrementHandoffBadge();
  })
  .on('broadcast', { event: 'new_order' }, (payload) => {
    refreshOrderList();
    playOrderSound();
  })
  .subscribe();
```

### Server-Side Event Broadcasting

After any state-changing operation (handoff created, payment confirmed), the API route broadcasts to the merchant's Realtime channel:

```typescript
await supabase
  .channel(`merchants:${merchantId}`)
  .send({
    type: 'broadcast',
    event: 'handoff_alert',
    payload: { conversation_id, customer_name, reason, preview_message }
  });
```

---

## 5. Background Job Architecture

Time-sensitive background tasks are managed by Supabase Edge Functions triggered by pg_cron.

### Abandoned Cart Worker

```
Schedule: Every 5 minutes (*/5 * * * *)
Function: abandoned_cart_worker

Algorithm:
1. SELECT orders WHERE status = 'pending'
   AND created_at < NOW() - INTERVAL '15 minutes'
   AND abandoned_reminder_1_sent_at IS NULL
   -> Send Message 1: "Your order is waiting..."
   -> UPDATE orders SET abandoned_reminder_1_sent_at = NOW()

2. SELECT orders WHERE status = 'pending'
   AND created_at < NOW() - INTERVAL '2 hours'
   AND abandoned_reminder_2_sent_at IS NULL
   -> Send Message 2: "Still thinking? Here's 10% off..."
   -> UPDATE orders SET abandoned_reminder_2_sent_at = NOW()

3. SELECT orders WHERE status = 'pending'
   AND created_at < NOW() - INTERVAL '30 minutes'
   AND inventory_released = FALSE
   -> UPDATE product_variants: release reservation
   -> UPDATE orders SET inventory_released = TRUE
```

### Broadcast Sender

```
Schedule: Every 2 minutes (*/2 * * * *)
Function: process_broadcast_batch

Algorithm:
1. SELECT broadcasts WHERE status = 'scheduled' AND scheduled_at <= NOW() LIMIT 1
2. SELECT customers matching audience_filter (tags, last_order_days)
3. Send batch of 50 messages via Termii API
4. UPDATE broadcasts SET sent_count = sent_count + batch_size
5. If all sent: UPDATE broadcasts SET status = 'sent', sent_at = NOW()
6. Rate limiting: 80 messages/second max (Termii limit)
```

---

## 6. Error Handling Strategy

### Webhook Processing

Webhooks from Meta and Paystack MUST be ACK'd within 15 seconds to prevent retries. The pattern is:

1. Immediately validate signature and return 200 ACK
2. Insert event into `webhook_events` with status = 'pending'
3. Process asynchronously via Edge Function or background job
4. Update `webhook_events.status` to 'processed' or 'failed'
5. If failed: retry_count incremented, retry at 1s, 4s, 16s (exponential backoff)
6. After 3 retries: status = 'failed', alert to Sentry

### AI Failure Modes

| Failure | Detection | Response |
|---------|-----------|----------|
| Claude API timeout (>5s) | Try/catch on API call | Fallback message + human handoff |
| Classification confidence = 0 | confidence check | Human handoff with reason: "ai_error" |
| Replicate CLIP timeout | Try/catch on API call | Text search fallback |
| Rate limit (429) | Status code check | Queue message, retry after header |

### Payment Failure Modes

| Failure | Detection | Response |
|---------|-----------|----------|
| Paystack link generation fails | API error | Retry once, then human handoff |
| Webhook not received (30 min) | pg_cron poll | Check Paystack status API directly |
| Duplicate webhook (same reference) | idempotency_key check | Discard silently, return 200 |
| Partial payment | amount mismatch | Flag for human review |

---

## 7. Testing Strategy

### Unit Tests (Jest)

- Intent classification: 50+ test cases across 5 intents, edge cases in Pidgin
- State machine transitions: all valid and invalid state transitions
- Payment reference generation: uniqueness, format validation
- Webhook signature verification: valid, invalid, missing signature

### Integration Tests (Staging Environment)

- End-to-end conversation flow: greeting -> product search -> order -> payment
- Human handoff: trigger, takeover, resume AI
- Abandoned cart: time-mocked triggers, message delivery verification
- CSV bulk import: valid file, row-level error handling, limit enforcement

### Load Tests (k6)

Before MVP launch (end of Sprint 6):
- 100 concurrent conversations for 10 minutes
- Webhook processing: 50 messages/second sustained
- Target: P95 webhook ACK under 200ms

### Acceptance Criteria Gates

Every story requires:
- 80% unit test coverage on new code
- All integration tests passing in staging
- No critical or high Sentry errors in staging under normal usage
- Performance: no regressions vs. baseline (Vercel Analytics)

---

## 8. Developer Environment Setup

### Prerequisites

- Node.js 20 LTS
- Supabase CLI
- Vercel CLI
- Docker (for local Supabase)

### Local Development

```bash
# Clone and install
git clone [repo]
npm install

# Start local Supabase
supabase start

# Run migrations
supabase db push

# Seed test data
npm run db:seed

# Start Next.js
npm run dev

# Run tests
npm test

# Run integration tests (requires local Supabase running)
npm run test:integration
```

### Environment Variables (Local)

```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=[local anon key]
SUPABASE_SERVICE_ROLE_KEY=[local service role key]
ANTHROPIC_API_KEY=[dev key]
PAYSTACK_SECRET_KEY=sk_test_[test key]
TERMII_API_KEY=[dev key]
WHATSAPP_APP_SECRET=[test secret]
REPLICATE_API_KEY=[dev key]
```

---

## 9. Deployment Pipeline

```
Developer pushes branch
        |
        v
GitHub Actions: lint + unit tests
        |
    Pass / Fail
        |
       Pass
        v
Vercel: Preview deployment (unique URL per PR)
        |
Integration tests run against preview + staging Supabase
        |
    Pass / Fail
        |
       Pass
        v
PR review: 1 engineer approval required
        |
       Merge to main
        v
Vercel: Production deployment (automatic)
        |
Supabase: Migration auto-applied (if migration file included)
        |
Sentry: Release tagged for error attribution
        |
BetterStack: Uptime check confirms production healthy
```

---

## 10. Key Engineering Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Termii BSP outage | Medium | High | Monitor status page, maintain Twilio as backup BSP (15-min switchover) |
| Claude API rate limits | Low | High | Implement request queuing, fallback to human handoff during throttle |
| pgvector performance degradation | Low | Medium | Monitor ANN index, rebuild ivfflat index monthly |
| WhatsApp policy violation | Low | Critical | Review Meta commerce policy quarterly, maintain compliant message templates |
| Multi-tenant data leak | Very Low | Critical | RLS at DB level + application-level merchant_id enforcement + quarterly security audit |
| Paystack double-charge | Low | High | idempotency_key on all payment records, Paystack reference deduplication |
