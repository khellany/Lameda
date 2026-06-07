# Product Documentation

**Domain:** Product Management
**Canonical Version:** v2 (PRD, Backlog) + v3 (Roadmap, Brainstorm)

---

## Documents in This Category

### 1. Product Requirements Document (PRD)
- **Source:** `../../v2/01_PRD_v2.md`
- **Version:** v2 (authoritative)
- **Coverage:** Full feature spec, user stories, acceptance criteria, NDPR compliance requirements, non-functional requirements
- **Key sections:** Core bot flows (inquiry, cart, payment, recovery), WhatsApp Business API integration, operator dashboard, onboarding

### 2. 18-Month Roadmap
- **Source:** `../../v3/product/Roadmap_Update_v3.md`
- **Version:** v3 (most current)
- **Coverage:** Now/Next/Later initiative map, decision gates, success criteria per phase
- **Key sections:** Phase 1 (MVP launch), Phase 2 (growth engine), Phase 3 (platform expansion)

### 3. Feature Brainstorm
- **Source:** `../../v3/product/Product_Brainstorm_v3.md`
- **Version:** v3
- **Coverage:** 10 product ideas with prioritization matrix, recommended next 2 builds, N1B ARR strategic path

### 4. Development Backlog
- **Source:** `../../v2/07_Development_Backlog_v2.md`
- **Version:** v2
- **Coverage:** 8 epics, Sprints 1-10, 43 user stories with acceptance criteria and story points

---

## Product Summary

### What Lameda Does

Lameda turns WhatsApp into a 24/7 AI-powered sales assistant for Nigerian fashion retailers. The platform automates:
- Product inquiries (natural language catalog search via vector embeddings)
- Order capture (structured form inside WhatsApp chat)
- Payment collection (Paystack integration with confirmation)
- Abandoned cart recovery (automated follow-up sequences)
- Customer support (FAQ deflection + human escalation)

No technical skills required. Setup in under 25 minutes.

### Core User Types

| User | Role | Primary Need |
|------|------|-------------|
| Fashion Retailer | Paying customer | Reduce time spent on repetitive WhatsApp queries |
| End Customer | Bot user | Get product info and complete purchase without leaving WhatsApp |
| Lameda Admin | Internal | Monitor platform health, manage merchant accounts |

### Pricing Tiers

| Tier | Price (NGN/month) | Key Limits |
|------|--------------------|-----------|
| Starter | N10,000 | 500 conversations/month, 50 products |
| Growth | N15,000 | 2,000 conversations/month, 200 products |
| Pro | N25,000 | Unlimited conversations, unlimited products |

### MVP Feature Set (Sprint 1-4)

1. WhatsApp webhook ingestion and message routing
2. AI product inquiry handling (vector search on merchant catalog)
3. Cart state machine (browse, add, checkout, confirm)
4. Paystack payment link generation and confirmation
5. Merchant onboarding flow (catalog upload, bot configuration)
6. Basic operator dashboard (conversation history, order log)

---

## v1 vs v2 Differences

The v2 PRD added:
- NDPR compliance requirements throughout
- Detailed acceptance criteria per user story
- Non-functional requirements (latency, uptime, scalability)
- Error state handling for all core flows
- Explicit WhatsApp Business API policy compliance section

For baseline only: `../../v1/01_PRD.md`
