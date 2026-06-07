# Engineering Documentation

**Domain:** Engineering
**Canonical Version:** v3 (System Design, ADRs, Technical Docs) + v2 (Database, API)

---

## Documents in This Category

### 1. System Design Document
- **Source:** `../../v3/engineering/System_Design_Document_v3.md`
- **Version:** v3 (authoritative)
- **Coverage:** State machine design for conversation flows, AI integration patterns, Realtime infrastructure, background job architecture, error handling, testing strategy

### 2. Architecture Decision Records (ADRs)
- **Source:** `../../v3/engineering/Architecture_ADRs_v3.md`
- **Version:** v3 (authoritative)
- **Coverage:** 10 ADRs covering every major technology choice with rationale, alternatives considered, and consequences

### 3. Technical Documentation
- **Source:** `../../v3/engineering/Technical_Documentation_v3.md`
- **Version:** v3 (authoritative)
- **Coverage:** Developer reference - repo structure, API usage, webhooks, AI integration patterns, DB access patterns, deployment, monitoring

### 4. Database Schema
- **Source:** `../../v2/05_Database_Schema_v2.md`
- **Version:** v2 (authoritative)
- **Coverage:** Full PostgreSQL schema including pgvector, RLS policies, NDPR erasure procedures, all 5 new tables added in v2

### 5. API Specifications
- **Source:** `../../v2/06_API_Specifications_v2.md`
- **Version:** v2 (authoritative)
- **Coverage:** Versioned REST API with global error envelope, pagination standard, rate limiting headers, idempotency keys, 13 new endpoints

### 6. System Architecture Overview
- **Source:** `../../v2/11_System_Architecture_v2.md`
- **Version:** v2
- **Coverage:** C4 diagrams, 5 core data flows, scalability tiers, COGS model, DR plan

---

## Tech Stack Summary

| Layer | Technology | Why |
|-------|-----------|-----|
| Runtime | Node.js + TypeScript | Type safety across webhook handlers and AI calls |
| Framework | NestJS | Modular, dependency injection, built-in queue support |
| Database | PostgreSQL + pgvector | Relational + vector search in one system |
| ORM | Prisma | Type-safe DB access, migration management |
| AI | OpenAI text-embedding-ada-002 | Catalog semantic search |
| AI | Claude (Anthropic) | Conversation response generation |
| Messaging | WhatsApp Business API (Meta) | Core channel |
| Payments | Paystack | Nigerian market-native payment gateway |
| Cache | Redis | Session state, rate limiting, conversation context |
| Queue | BullMQ | Abandoned cart jobs, async webhook processing |
| Hosting | AWS (ECS + RDS) | Production; Railway for staging |
| CDN | Cloudflare | Webhook ingestion edge, DDoS protection |

---

## Core Data Flows

### 1. Incoming WhatsApp Message
```
WhatsApp -> Cloudflare -> /webhook endpoint
  -> Verify signature
  -> Parse message type (text / image / button / order)
  -> Load conversation state from Redis
  -> Route to state machine (Inquiry / Cart / Support)
  -> Generate AI response (Claude API)
  -> Send response via WhatsApp API
  -> Persist state to PostgreSQL
```

### 2. Catalog Vector Search
```
Merchant uploads catalog CSV
  -> Parse + validate
  -> Embed each product (OpenAI ada-002)
  -> Store in product_embeddings (pgvector)
  
Customer query arrives
  -> Embed query text
  -> pgvector similarity search (top 5 matches)
  -> Return to Claude as context for response
```

### 3. Payment Flow
```
Customer confirms order
  -> Create order record (status: pending)
  -> Generate Paystack payment link
  -> Send link in WhatsApp message
  -> Paystack webhook fires on payment
  -> Verify webhook signature
  -> Update order status to paid
  -> Send confirmation message to customer
  -> Notify merchant via WhatsApp
```

---

## Key Architecture Decisions (ADR Summary)

| ADR | Decision | Rationale |
|-----|---------|-----------|
| ADR-001 | PostgreSQL over MongoDB | ACID compliance required for financial transactions |
| ADR-002 | NestJS over Express | Structured modules essential for growing team |
| ADR-003 | pgvector over Pinecone | Avoids external dependency; cost at scale |
| ADR-004 | BullMQ over SQS | Simpler ops; AWS SQS at scale milestone |
| ADR-005 | Claude for generation | Superior instruction-following for sales dialogue |
| ADR-006 | Paystack over Flutterwave | Nigerian-first; webhook reliability |
| ADR-007 | Redis for session state | Sub-5ms reads for conversation continuity |
| ADR-008 | Cloudflare for webhook edge | DDoS protection + latency improvement |
| ADR-009 | ECS over Lambda | Predictable latency for stateful bot sessions |
| ADR-010 | Prisma over raw SQL | Migration safety; type generation |

---

## Database Tables (v2 Schema)

| Table | Purpose |
|-------|---------|
| merchants | Merchant accounts, subscription tier, WhatsApp number |
| customers | End customers, contact info, NDPR consent |
| conversations | Active conversation sessions, state machine state |
| messages | Full message history (inbound + outbound) |
| products | Merchant catalog |
| product_embeddings | pgvector embeddings for semantic search |
| orders | Order records with line items (JSONB) |
| payments | Payment records linked to orders and Paystack |
| subscription_plans | Plan definitions and limits |
| webhook_events | Raw webhook log for idempotency and debugging |
| audit_logs | NDPR-compliant action log |
| customer_preferences | Opt-in/opt-out status, language preference |

---

## API Versioning

All endpoints are prefixed `/api/v1/`. Breaking changes require a new version prefix.

Standard error envelope:
```json
{
  "success": false,
  "error": {
    "code": "MERCHANT_NOT_FOUND",
    "message": "No merchant found with that ID",
    "requestId": "req_abc123"
  }
}
```

Standard pagination:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 143,
    "hasNext": true
  }
}
```
