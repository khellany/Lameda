# Operations Documentation

**Domain:** Operations and Risk
**Canonical Version:** v3

---

## Documents in This Category

### 1. Risk Assessment
- **Source:** `../../v3/operations/Risk_Assessment_v3.md`
- **Version:** v3 (authoritative)
- **Coverage:** 24 risks across 6 domains, probability/impact scoring (1-5 scale), active mitigation plans, risk owner assignments, review cadence

### 2. Process Optimization
- **Source:** `../../v3/operations/Process_Optimization_v3.md`
- **Version:** v3 (authoritative)
- **Coverage:** Process analysis across 4 operational domains, bottleneck identification, optimization recommendations, KPI targets, implementation sequence

---

## Risk Summary

### Risk Register (Top 10 by Priority Score)

| # | Risk | Domain | P | I | Score | Mitigation |
|---|------|--------|---|---|-------|-----------|
| 1 | WhatsApp API policy change or ban | Platform | 3 | 5 | 15 | Multi-channel fallback (SMS, Telegram); legal review of ToS |
| 2 | Meta restricts commerce use cases | Platform | 3 | 5 | 15 | Early relationship with Meta Nigeria; enterprise API tier |
| 3 | AI generates incorrect product info | Product | 4 | 4 | 16 | Human review toggle; confidence threshold; merchant override |
| 4 | Paystack outage during peak | Payments | 2 | 5 | 10 | Flutterwave backup; graceful degradation messaging |
| 5 | NDPR enforcement action | Compliance | 2 | 5 | 10 | Consent capture, DPO appointment, audit logs, 72hr SLA |
| 6 | Competitor copies core feature | Market | 4 | 3 | 12 | Speed advantage; deep merchant relationships; moats |
| 7 | Merchant churn due to low ROI | Business | 3 | 4 | 12 | Success metrics dashboard; CSM intervention triggers |
| 8 | WhatsApp message delivery failure | Technical | 3 | 4 | 12 | Retry queue; fallback notification; SLA monitoring |
| 9 | AI inference cost overrun | Financial | 3 | 3 | 9 | Per-merchant cost tracking; usage caps at tier limits |
| 10 | Key engineer departure | People | 2 | 4 | 8 | Documentation standards; pair programming; equity vesting |

**P = Probability (1-5), I = Impact (1-5)**

### Risk Domains

| Domain | Risk Count | Highest Priority Risk |
|--------|-----------|----------------------|
| Platform (WhatsApp/Meta) | 5 | API policy change |
| Product Quality | 4 | AI hallucination on product data |
| Financial | 4 | COGS overrun at scale |
| Compliance (NDPR) | 3 | Enforcement action |
| Market | 4 | Competitive copy |
| People | 4 | Key person dependency |

---

## Process Optimization Summary

### 4 Operational Domains Analyzed

#### 1. Merchant Onboarding
- **Current state:** 4-6 hours with manual setup assistance
- **Target state:** 25 minutes fully self-serve
- **Key bottleneck:** Catalog upload format inconsistency
- **Optimization:** CSV template with validation, drag-and-drop, real-time preview

#### 2. AI Quality Assurance
- **Current state:** No systematic review; issues caught post-deployment
- **Target state:** Pre-deployment testing + live monitoring with auto-escalation
- **Key bottleneck:** No ground truth dataset for Nigerian fashion domain
- **Optimization:** Build eval dataset from beta conversations; confidence scoring

#### 3. Customer Support
- **Current state:** Reactive; merchant WhatsApps team directly
- **Target state:** Self-serve knowledge base + ticket system; human for complex issues
- **Key bottleneck:** No categorization of support requests
- **Optimization:** Intercom or Freshdesk; auto-tagging; SLA: 2hr response, 24hr resolution

#### 4. Billing and Collections
- **Current state:** Manual payment follow-up after failed charge
- **Target state:** Automated dunning (D+1, D+3, D+7 before suspension)
- **Key bottleneck:** No automated retry logic
- **Optimization:** Paystack recurring + BullMQ dunning jobs

### KPI Targets

| KPI | Current | 3-Month Target | 12-Month Target |
|-----|---------|---------------|-----------------|
| Onboarding completion rate | Unknown | 70% | 85% |
| Time to first real conversation | Unknown | 48 hours | 24 hours |
| Trial-to-paid conversion | Unknown | 60% | 80% |
| Monthly churn | Unknown | Under 8% | Under 5% |
| Support ticket resolution | Unknown | 48 hours | 4 hours |
| System uptime | Unknown | 99% | 99.5% |
| AI response accuracy (merchant-rated) | Unknown | 85% | 95% |

---

## NDPR Compliance Requirements

| Requirement | Implementation |
|------------|---------------|
| Consent capture | WhatsApp opt-in message before first data collection |
| Right to erasure | API endpoint + automated DB procedure (anonymize within 72 hours) |
| Data residency | All data stored in AWS eu-west-1 (Lagos region when available) |
| Audit logs | All data access and modifications logged to audit_logs table |
| DPO appointment | Required before public launch; internal or external |
| Privacy policy | Displayed at signup and accessible from bot menu |
| Breach notification | 72-hour SLA to NITDA for breaches affecting 500+ individuals |
