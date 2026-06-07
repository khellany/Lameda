# Lameda - Product Roadmap Update
**Version:** 3.0 | **Date:** May 2026 | **Format:** Now / Next / Later + Initiative Map

---

## Executive Summary

This roadmap update reflects the transition from ideation to execution. The Now horizon (Sprints 1-6, Months 1-3) is fully sprint-mapped in `v2/07_Development_Backlog_v2.md`. This document focuses on the strategic roadmap: what gets built, in what sequence, and why - across the 18-month runway period covered by the seed round. It also incorporates recommendations from the product brainstorm session and the process optimization analysis.

---

## Roadmap Principles

1. **Merchant outcomes, not features:** Every item on this roadmap must map to either a merchant revenue gain or a merchant time saving. "Build X" is not acceptable framing - "increase recovered sales by Y%" is.

2. **Sequential depth over parallel breadth:** Do not start vertical expansion until the fashion vertical is profitable. Do not start regional expansion until the Nigerian playbook is reproducible.

3. **Kill the status quo in weeks 1-4:** If Lameda does not deliver a visible ROI in the first 7 days, trial conversion fails. Every Sprint 1-3 decision must be evaluated against this criterion.

4. **The AI quality bar:** A mediocre chatbot is worse than no chatbot. Every AI improvement must be tested with real merchants before release.

---

## Now Horizon (Months 1-3) - MVP Launch

**Theme:** Get to first N150K MRR with 10 paying merchants

### Sprint 1-2: Foundation
- Merchant auth, onboarding wizard, WhatsApp verification
- Dashboard home, plan enforcement, trial expiry flow

### Sprint 3-4: Core Commerce AI
- Product catalog management (manual + CSV import)
- CLIP embedding pipeline and pgvector image search
- WhatsApp webhook + intent classification (Claude Haiku)
- Product recommendation flow and variant selection

### Sprint 5-6: Order and Payment
- Full order capture from conversation
- Paystack payment link generation
- Abandoned cart recovery (15-min and 2-hr sequence)
- Human handoff trigger and dashboard alert
- Nigerian Pidgin mode

**Launch readiness criteria (end of Sprint 6):**
- 5 pilot merchants live and generating data
- At least 3 merchants with at least 1 recovered sale
- Onboarding completion rate above 70%
- Zero critical bugs in production for 7 days straight

---

## Next Horizon (Months 4-9) - Growth to 200 Merchants

**Theme:** Prove repeatability and hit N3M MRR milestone

### Sprint 7-8: Growth Infrastructure
- Analytics dashboard (conversion funnel, revenue trends, peak hours)
- Broadcast campaign manager with audience segmentation
- Customer CRM view with full conversation history
- Referral program (1 month free per successful referral)
- WhatsApp number quality monitoring (from Brainstorm idea 1.5)
- Multi-merchant directory v1 at discover.lameda.ng (from Brainstorm idea 1.3)

### Sprint 9-10: AI Intelligence and Scale
- AI restock demand forecasting (from Brainstorm idea 1.4) - weekly push to merchants
- Automated flash sale campaigns (from Brainstorm idea 1.6)
- Confidence threshold recalibration (informed by real handoff data from Months 1-3)
- Performance hardening: connection pool, message queue, caching layer
- NDPR annual audit completion

**Growth milestones:**
- Month 6: 50 paying merchants, N750K MRR
- Month 9: 200 paying merchants, N3M MRR
- Referral program active with at least 20% of new merchants from referrals
- Monthly churn under 5%

---

## Later Horizon (Months 10-18) - Scale to 500 Merchants and Series A

**Theme:** Reach Series A-ready metrics and validate expansion potential

### Platform Deepening (Months 10-12)
- WhatsApp loyalty program (from Brainstorm idea 1.2) - Growth and Pro tiers
- AI stylist / outfit builder for multi-item recommendations (from Brainstorm idea 1.1)
- Flutterwave as secondary payment provider
- GIG Logistics / Sendstack delivery tracking integration
- Advanced analytics: cohort analysis, LTV by acquisition channel

### Series A Preparation (Months 13-18)
- Beauty vertical pilot (5 merchants) - validate vertical expansion thesis
- Regional proof-of-concept: Ghana pilot (5 merchants) with Flutterwave + local BSP
- Enterprise tier: API access for large retailers and agencies
- Intelligence dashboard v1: anonymised merchant benchmarking (from Brainstorm idea 1.10)
- Investor data room preparation: 18-month metrics, cohort analysis, NPS data

**Series A readiness criteria (Month 12):**
- 500 paying merchants
- N7.5M MRR
- Gross margin at 65%+
- Monthly churn under 5%
- LTV:CAC ratio above 3:1
- 2+ verticals with at least 10 merchants each
- At least 1 expansion market (Ghana or Kenya) with revenue

---

## Roadmap Initiative Map

```
Q2 2026 (Months 1-3)          Q3 2026 (Months 4-6)        Q4 2026 (Months 7-9)
-----------------------        -----------------------      -----------------------
[MVP Core Commerce]            [Growth Infrastructure]      [AI Intelligence]
- Auth + Onboarding            - Analytics dashboard        - Demand forecasting
- WhatsApp AI engine           - Broadcast campaigns        - Flash sale automation
- Product search (NLP+image)   - Customer CRM               - Confidence recalibration
- Order + payment flow         - Referral program           [Platform]
- Human handoff                - Merchant directory v1      - Performance hardening
- Nigerian Pidgin              - WA quality monitoring      - NDPR audit
[Infrastructure]               [Scale]                      [Scale]
- CI/CD, staging, monitoring   - 50 merchants               - 200 merchants
- NDPR compliance v1           - N750K MRR                  - N3M MRR

Q1 2027 (Months 10-12)        Q2-Q3 2027 (Months 13-18)
-----------------------        -----------------------
[Deep Features]                [Expansion]
- Loyalty program              - Beauty vertical pilot
- AI stylist                   - Ghana pilot
- Flutterwave integration      - Enterprise tier API
- Delivery tracking            [Series A]
[Series A Prep]                - Intelligence dashboard
- 500 merchants                - Investor data room
- N7.5M MRR                    - Series A raise
- 65%+ gross margin
```

---

## Deprioritized Items (Not on 18-Month Roadmap)

| Item | Reason Deprioritized |
|------|---------------------|
| Video product demos | Destroys unit economics at current AI generation costs |
| Instagram DM automation | Meta terms compliance risk |
| Cryptocurrency payments | Less than 5% merchant demand |
| Standalone customer app | Contradicts core WhatsApp-native positioning |
| Wholesale / B2B mode | Interesting but requires separate UX investment |
| Customer photo reviews | Complex moderation requirements, post-Series A |
| Full logistics platform | Partnership strategy (GIG, Sendstack) preferred over building |

---

## Key Decision Points

**Month 3 decision:** If trial-to-paid conversion is below 65%, pause paid acquisition and diagnose onboarding friction before Month 4 growth push.

**Month 6 decision:** If 50-merchant milestone is not reached, evaluate whether the referral program is working. If not, consider agency/reseller channel 2 months earlier than planned.

**Month 9 decision:** Review beauty vertical pilot results. If conversion and churn metrics are comparable to fashion, green-light full vertical expansion sprint (Month 10). If worse, stay fashion-only through Series A.

**Month 12 decision:** Review Ghana pilot results before committing regional expansion budget. If Ghana CAC is more than 2x Nigeria CAC, delay regional expansion to post-Series A and focus on deeper Nigerian market penetration.

---

## What's Not Changing

The following are not up for debate regardless of what the roadmap review finds:

1. **WhatsApp as primary channel** - the entire product is built around this
2. **Paystack as payment provider** - deepest Nigerian market trust, full NDPR compliance
3. **Nigerian Pidgin as a first-class language** - this is core to the "Nigeria-first" positioning
4. **N10,000 minimum price point** - below this, unit economics are unworkable at any scale
5. **NDPR compliance** - non-negotiable regulatory requirement, never traded for speed
