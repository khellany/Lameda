# Lameda - Product and Strategy Repository
**Project:** Lameda Conversational Commerce Platform
**Founder:** Dayo Oladayo Kelani
**Status:** Pre-Seed | Active Development

---

## Development Status

| Sprint | Scope | Status | Last Updated |
|--------|-------|--------|-------------|
| Sprint 1 | Foundation - Webhook ingestion, DB schema, project scaffold | **In Progress** | June 2026 |
| Sprint 2 | Conversation state machine, AI intent classification | Not started | - |
| Sprint 3 | Cart flow, Paystack payment integration | Not started | - |
| Sprint 4 | Merchant onboarding dashboard | Not started | - |

### Sprint 1 - Completed Items

- [x] Git repository initialized
- [x] Product documentation committed (v1, v2, v3, artifacts)
- [x] Next.js 14 (App Router) scaffold created in `lameda/`
- [x] TypeScript, Tailwind, ESLint configured
- [x] Supabase client (browser + server + admin) set up
- [x] Structured logger (Pino) configured with PII redaction
- [x] WhatsApp webhook endpoint (`POST /api/webhook/whatsapp`)
- [x] HMAC-SHA512 signature verification (Termii + Paystack)
- [x] Webhook idempotency (deduplication via `webhook_events` table)
- [x] Message normalization (BSP-agnostic `NormalizedMessage` type)
- [x] Merchant lookup by WhatsApp destination number
- [x] Customer upsert on first contact
- [x] Conversation create/load with JSONB state
- [x] Full message history persistence (inbound + outbound)
- [x] Health check endpoint (`GET /api/health`)
- [x] PostgreSQL schema with all 9 core tables
- [x] Row Level Security policies (multi-tenant isolation)
- [x] pgvector extension + product_embeddings table
- [x] NDPR erasure procedure (`anonymize_customer()`)
- [x] Technical debt register (`lameda/docs/TECHNICAL_DEBT.md`)
- [x] Contributing and handover guide (`lameda/docs/CONTRIBUTING.md`)
- [x] Environment variables template (`.env.local.example`)

### Sprint 1 - In Progress / Pending

- [ ] Supabase project provisioned (pending credentials from founder)
- [ ] Termii webhook URL configured in Termii dashboard
- [ ] `.env.local` filled in and verified
- [ ] End-to-end test: send WhatsApp message, verify DB record created
- [ ] Vercel project created and first deployment

---

## What is Lameda?

Lameda turns WhatsApp into a 24/7 AI-powered sales assistant for Nigerian fashion retailers. The platform automates product inquiries, order capture, payment collection, abandoned cart recovery, and customer support - entirely inside WhatsApp. No technical skills required. Setup in under 25 minutes.

**Target:** Nigerian SME fashion retailers with 20+ daily WhatsApp conversations and an average order value above N50,000.

**Pricing:** N10,000 (Starter) / N15,000 (Growth) / N25,000 (Pro) per month.

**Seed ask:** N50,000,000 (~$30,000 USD) for 18 months runway.

---

## Repository Structure

```
LamedaBot/
├── README.md                      This file - project index
├── v1/                            Original product artifacts (baseline)
├── v2/                            Improved artifacts (post-critique)
└── v3/                            Deep-dive strategic and engineering documents
    ├── engineering/               System design, ADRs, technical documentation
    ├── marketing/                 Competitive brief
    ├── operations/                Process optimization, risk register
    └── product/                   Brainstorm, roadmap, strategic analysis
```

---

## Version Changelog

### v1 - Original Artifacts (April 2026)

First complete set of product documentation. Covers PRD, business model, strategy, wireframes, database schema, API specs, backlog, landing page copy, financial model, and investor pitch deck.

**Quality rating:** 6.0/10 average across all artifacts (per critique report in v2/).

**Key gaps identified:** Incomplete competitive landscape, no unit economics detail, no NDPR compliance plan, database schema missing key tables (subscriptions, embeddings, webhooks), API spec missing pagination and error standards.

| File | Description |
|------|-------------|
| v1/01_PRD.md | Product Requirements Document |
| v1/02_Business_Model_Canvas.md | Business Model Canvas |
| v1/03_Strategy_and_Future_Plan.md | Go-to-market strategy |
| v1/04_Wireframes_and_UX_Flows.md | UX wireframes |
| v1/05_Database_Schema.md | PostgreSQL schema |
| v1/06_API_Specifications.md | REST API spec |
| v1/07_Development_Backlog_Jira.md | Sprint backlog |
| v1/08_Landing_Page_Copy.md | Marketing copy |
| v1/09_Financial_Model.xlsx | Financial model |
| v1/10_Investor_Pitch_Deck.pptx | Pitch deck |
| v1/Lameda_Business_Case.md | Business case |

---

### v2 - Improved Artifacts (May 2026)

Complete overhaul of all v1 artifacts addressing the 17 critique recommendations. Average quality rating improved from 6.0/10 to 8.5/10.

**Key improvements:**
- Full competitive landscape (WATI, Bumpa, ManyChat, Bird.com) with 8-feature comparison matrix
- Detailed unit economics: LTV N270K, CAC N50-90K, LTV:CAC 3-5x, payback 4-6 months
- NDPR compliance plan: consent capture, right to erasure, audit logs, 72-hour SLA
- Database schema: 5 new tables (subscription_plans, product_embeddings, webhook_events, audit_logs, customer_preferences)
- API spec: global standards (error envelope, pagination, rate limiting, idempotency), 13 new endpoints
- System architecture: C4 diagrams, 5 core data flows, scalability tiers, DR plan
- Financial projections: Month 3 (N150K MRR) through Month 18 (N13.4M MRR)

| File | Description |
|------|-------------|
| v2/00_Critique_Implementation_Audit.md | Verification that all 17 critique recommendations were implemented |
| v2/01_PRD_v2.md | Product Requirements Document v2 |
| v2/02_Business_Model_Canvas_v2.md | Business Model Canvas v2 |
| v2/03_Strategy_and_Future_Plan_v2.md | Go-to-market strategy v2 |
| v2/04_Wireframes_and_UX_Flows_v2.md | UX wireframes v2 (with error states, empty states, WCAG notes) |
| v2/05_Database_Schema_v2.md | PostgreSQL schema v2 (pgvector, RLS, NDPR procedures) |
| v2/06_API_Specifications_v2.md | REST API spec v2 (versioned, paginated, idempotent) |
| v2/07_Development_Backlog_v2.md | Sprint backlog v2 (8 epics, Sprints 1-10, 43 user stories) |
| v2/08_Landing_Page_Copy_v2.md | Marketing copy v2 (ROI-anchored, 5 testimonials, pricing) |
| v2/09_Financial_Model_v2.xlsx | Financial model v2 (3-scenario, sensitivity analysis) |
| v2/10_Pitch_Deck_v2.pptx | Investor pitch deck v2 (16 slides) |
| v2/11_System_Architecture_v2.md | System architecture v2 (C4, tech stack, data flows, COGS model) |
| v2/Lameda_Business_Case_v2.md | Business case v2 (TAM/SAM/SOM, Why Now, seed ask) |
| v2/Lameda_Critique_Report.docx | Full critique report with gap analysis and recommendations |

---

### v3 - Deep-Dive Documents (May 2026)

Extended strategic and engineering analysis produced after v2 completion. These documents provide deeper coverage of areas that are referenced but not fully developed in v2.

| File | Description |
|------|-------------|
| v3/engineering/System_Design_Document_v3.md | Full engineering system design: state machine, AI integration patterns, Realtime infrastructure, background jobs, error handling, testing strategy |
| v3/engineering/Architecture_ADRs_v3.md | 10 Architecture Decision Records covering every major technology choice with alternatives and consequences |
| v3/engineering/Technical_Documentation_v3.md | Developer-facing technical reference: repo structure, API, webhooks, AI integration, DB patterns, deployment, monitoring |
| v3/marketing/Competitive_Brief_v3.md | Full competitive analysis: 6 competitors, 12-dimension feature matrix, positioning map, threat assessment, win/loss framework |
| v3/operations/Process_Optimization_v3.md | Process analysis across 4 operational domains with bottleneck identification, optimization recommendations, and KPI targets |
| v3/operations/Risk_Assessment_v3.md | Risk register with 24 risks across 6 domains, probability/impact scoring, and active mitigation plans |
| v3/product/Product_Brainstorm_v3.md | 10 product ideas with prioritization, two recommended next builds, and the "N1B ARR" strategic path |
| v3/product/Roadmap_Update_v3.md | 18-month roadmap: Now/Next/Later initiative map with decision points and success criteria |
| v3/product/Strategic_Brainstorm_v3.md | Co-founder strategic analysis: core bets, exit thesis, contrarian views, and the highest-leverage 90-day decisions |

---

## Quick Reference: Key Numbers

| Metric | Value |
|--------|-------|
| TAM | N4.1 trillion (41M SMEs x N10K/month) |
| SAM | N28.8 billion (200K fashion retailers) |
| SOM (18 months) | N90M ARR (500 merchants) |
| Seed ask | N50,000,000 (~$30,000) |
| Monthly pricing | N10K (Starter) / N15K (Growth) / N25K (Pro) |
| COGS (Growth tier) | N11,636/month per merchant |
| Gross margin (early) | 21% improving to 72% at scale |
| LTV | N270,000 (18-month average) |
| CAC | N50,000 - N90,000 |
| LTV:CAC | 3:1 to 5:1 |
| Payback period | 4-6 months |
| Target churn | Under 5% monthly |
| Trial-to-paid target | 80% |
| Break-even | Month 11 |
| Series A milestone | Month 12: 500 merchants, N7.5M MRR |

---

## Document Production Notes

All documents in this repository were produced with the following constraints:
- No em dash character anywhere in any file
- Nigerian Naira values in NGN (N prefix)
- Prices stored in kobo in technical schemas (N1 = 100 kobo)
- All future dates relative to May 2026 baseline
- NDPR compliance referenced throughout (Nigerian Data Protection Regulation)

---

## Contact

Dayo Oladayo Kelani - Founder and CEO
hello@lameda.ng | Lagos, Nigeria
