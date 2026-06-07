# Lameda - Risk Assessment and Risk Register
**Version:** 3.0 | **Date:** May 2026 | **Status:** Active Register - Review Quarterly

---

## Executive Summary

This risk register identifies 24 risks across six domains: technical infrastructure, regulatory and compliance, commercial and market, operational, financial, and strategic. Risks are rated by probability and impact using a 5-point scale. Seven risks are rated High or Critical and require active mitigation plans with named owners. The top three risks by composite score are: (1) WhatsApp platform policy violation causing account suspension, (2) Termii BSP outage during peak merchant trading hours, and (3) failure to achieve trial-to-paid conversion above 80% - which would invalidate the financial model.

---

## 1. Risk Scoring Methodology

**Probability:** 1 (Very Unlikely) to 5 (Very Likely)
**Impact:** 1 (Negligible) to 5 (Critical)
**Risk Score:** Probability x Impact (1-25)

| Score Range | Rating | Action Required |
|------------|--------|----------------|
| 20-25 | Critical | Immediate mitigation, escalate to founder |
| 12-19 | High | Active mitigation plan, monthly review |
| 6-11 | Medium | Monitor, quarterly review |
| 1-5 | Low | Accept or monitor annually |

---

## 2. Technical Infrastructure Risks

### RISK-T01: WhatsApp BSP (Termii) Outage
- **Probability:** 3 | **Impact:** 5 | **Score: 15 - HIGH**
- **Description:** Termii experiences an outage during peak merchant trading hours (Friday afternoon, weekend), causing all WhatsApp messages to fail for all merchants simultaneously.
- **Mitigation:**
  - Monitor Termii status page via automated check every 60 seconds
  - Maintain a backup BSP account with Twilio (pre-integrated, dormant)
  - Switchover runbook: DNS/config change that can route to Twilio in 15 minutes
  - Merchant communication: send SMS alert (via Termii SMS or direct USSD) if WhatsApp down for more than 5 minutes
- **Owner:** Lead Engineer
- **Review:** Monthly

### RISK-T02: Paystack API Failure
- **Probability:** 2 | **Impact:** 4 | **Score: 8 - MEDIUM**
- **Description:** Paystack experiences an outage or API errors, preventing payment link generation or confirmation webhooks from firing.
- **Mitigation:**
  - Implement payment status polling as fallback to webhooks (check Paystack API every 2 minutes for 30 minutes)
  - Queue payment link generation with retry on failure (3 attempts)
  - If Paystack down for more than 10 minutes: AI instructs customer to use bank transfer as alternative, notifies merchant
- **Owner:** Lead Engineer
- **Review:** Quarterly

### RISK-T03: Claude API Rate Limit or Outage
- **Probability:** 2 | **Impact:** 3 | **Score: 6 - MEDIUM**
- **Description:** Anthropic API throttles Lameda due to spike in concurrent merchants, or experiences a partial outage.
- **Mitigation:**
  - Implement request queue with exponential backoff
  - Pre-purchase Anthropic API capacity tier above expected usage
  - Fallback: if Claude unavailable for more than 30 seconds, route conversation to human handoff
  - Cache common intent classifications (same message text = same classification for 5 minutes)
- **Owner:** Lead Engineer
- **Review:** Quarterly

### RISK-T04: pgvector Index Degradation
- **Probability:** 2 | **Impact:** 3 | **Score: 6 - MEDIUM**
- **Description:** As product embedding count grows beyond 100,000 vectors, ivfflat index performance degrades, causing slow product search.
- **Mitigation:**
  - Monitor search latency weekly; alert if P95 exceeds 500ms
  - Rebuild ivfflat index monthly with optimal lists parameter
  - Plan migration to HNSW index algorithm at 50,000 merchants (better performance at scale)
- **Owner:** Lead Engineer
- **Review:** Quarterly

### RISK-T05: Database Connection Pool Exhaustion
- **Probability:** 2 | **Impact:** 4 | **Score: 8 - MEDIUM**
- **Description:** During peak traffic (major Lagos market days, end-of-month paydays), concurrent database connections exceed Supabase Pro plan limit (60 connections), causing timeouts.
- **Mitigation:**
  - Enable PgBouncer connection pooler (Supabase Pro includes this)
  - Target: connection pool mode = transaction (not session), supports 1,000+ app connections
  - Alert at 80% of connection limit
  - Scale plan to Supabase Business ($599/month) if sustained above 60 connections
- **Owner:** Lead Engineer
- **Review:** Monthly

---

## 3. Regulatory and Compliance Risks

### RISK-R01: WhatsApp Meta Platform Policy Violation
- **Probability:** 3 | **Impact:** 5 | **Score: 15 - HIGH**
- **Description:** Meta suspends Lameda's WhatsApp Business API access due to a policy violation (e.g., unsolicited broadcast messages, prohibited product category, spam complaints exceeding threshold).
- **Mitigation:**
  - Assign one team member to review Meta's WhatsApp Business Policy quarterly
  - Implement spam complaint rate monitoring: alert if any merchant exceeds 0.3% complaint rate (Meta's threshold)
  - Pre-screen broadcast messages against prohibited categories
  - Require explicit opt-in for all broadcast campaign recipients
  - Maintain a policy violation response plan: can switch to Telegram as a backup channel within 72 hours
  - Legal review of WhatsApp terms before MVP launch
- **Owner:** Founder (CEO)
- **Review:** Monthly

### RISK-R02: NDPR Non-Compliance
- **Probability:** 2 | **Impact:** 4 | **Score: 8 - MEDIUM**
- **Description:** NITDA (National Information Technology Development Agency) finds Lameda in violation of NDPR, resulting in fines (up to 2% of annual gross revenue or N10 million, whichever is higher), reputational damage, and investor concern.
- **Mitigation:**
  - Engage NDPR-certified consultant before first paid customer (STORY-036)
  - Complete right-to-erasure implementation (STORY-039)
  - Publish privacy notice and NDPR data protection notice on landing page
  - Appoint Data Protection Officer (founder in early stage)
  - Annual NDPR audit commissioned
  - Customer data stored in Nigerian data residency (Supabase configuration)
- **Owner:** Founder (CEO)
- **Review:** Quarterly

### RISK-R03: CBN Fintech Regulation Changes
- **Probability:** 2 | **Impact:** 3 | **Score: 6 - MEDIUM**
- **Description:** Central Bank of Nigeria introduces new regulations around digital payment facilitation that affect how Paystack payment links can be sent via WhatsApp, potentially requiring Lameda to obtain a fintech license.
- **Mitigation:**
  - Monitor CBN regulatory publications quarterly
  - Maintain relationship with Paystack partner team (they will flag regulatory changes that affect their partners)
  - Legal opinion obtained: Lameda is a commerce software platform, not a payment processor - Paystack holds the license
- **Owner:** Founder (CEO)
- **Review:** Quarterly

---

## 4. Commercial and Market Risks

### RISK-C01: Failure to Achieve 80% Trial-to-Paid Conversion
- **Probability:** 3 | **Impact:** 5 | **Score: 15 - HIGH**
- **Description:** Trial-to-paid conversion falls below 80% target, invalidating unit economics model. At 50% conversion, CAC doubles and the N50M seed runway does not reach the 200-merchant milestone required for Series A readiness.
- **Mitigation:**
  - Define specific conversion success criteria per merchant (at least 1 AI-recovered sale during trial)
  - White-glove onboarding for first 50 merchants (founder-led)
  - Day 7 check-in call: review catalog completeness, conversation quality
  - Exit interview for every merchant who doesn't convert: identify top 3 objections
  - If conversion below 65% at month 3: pivot onboarding flow, delay paid acquisition spend
- **Owner:** Founder (CEO)
- **Review:** Weekly (critical metric)

### RISK-C02: Bumpa Adds WhatsApp AI Integration
- **Probability:** 3 | **Impact:** 4 | **Score: 12 - HIGH**
- **Description:** Bumpa (50,000+ merchants, Nigeria-first, well-funded) announces WhatsApp AI integration, directly competing with Lameda's core offering with an existing merchant base and brand recognition.
- **Mitigation:**
  - Build AI quality moat: proprietary Nigerian fashion retail training data, Pidgin NLP, image search - features requiring 12+ months to replicate
  - Accelerate merchant acquisition before Bumpa ships (lock in 200 merchants with annual plan incentives)
  - Consider positioning Lameda as the "WhatsApp AI layer" that works with Bumpa data (CSV import from Bumpa)
  - Monitor Bumpa product updates and funding news monthly
- **Owner:** Founder (CEO)
- **Review:** Monthly

### RISK-C03: Price Sensitivity - Merchants Unwilling to Pay N10,000/month
- **Probability:** 3 | **Impact:** 3 | **Score: 9 - MEDIUM**
- **Description:** Target merchant segment (under 100 SKUs, 20+ daily conversations) demonstrates resistance to N10,000/month subscription, especially during a Nigerian inflation environment.
- **Mitigation:**
  - ROI calculator on landing page: 1 recovered sale per day at N50,000 AOV = N1.5M/month recovered
  - Offer quarterly billing with 10% discount (reduces monthly perceived cost)
  - Pilot data: N85,000 recovered overnight - use this as primary objection response
  - If widespread price resistance: introduce N7,500/month "Starter Light" tier with 200 conversations (test at Month 4)
- **Owner:** Founder (CEO)
- **Review:** Monthly

### RISK-C04: Merchant Churn Above 5% Monthly
- **Probability:** 3 | **Impact:** 4 | **Score: 12 - HIGH**
- **Description:** Monthly churn exceeds 5% target. At 10% monthly churn, LTV falls to N90,000 (6-month average) versus the model assumption of N270,000 (18-month average), destroying unit economics.
- **Mitigation:**
  - Track NPS by merchant weekly (1-question WhatsApp survey)
  - Identify at-risk merchants: below 5 conversations/week in second month = at-risk flag
  - Proactive CSM outreach to at-risk merchants within 48 hours
  - Exit interview: mandatory for every churned merchant in first 6 months
  - Churn early warning dashboard for founder review every Monday
- **Owner:** Customer Success Lead (to be hired)
- **Review:** Weekly

---

## 5. Operational Risks

### RISK-O01: Engineering Team Capacity (Single FTE Pre-Funding)
- **Probability:** 4 | **Impact:** 4 | **Score: 16 - HIGH**
- **Description:** Pre-seed, Lameda has only the founder and a contract engineer. If the contract engineer exits, the engineering timeline slips by 6+ weeks, missing the pilot merchant launch window.
- **Mitigation:**
  - Document all architecture decisions, system design, and API specs (this document set)
  - Maintain 80% unit test coverage to reduce bus factor risk
  - Identify 2 backup contract engineers who could step in quickly
  - Seed funding allocation: 45% to engineering (2 FTE x 9 months) - hire as soon as funded
- **Owner:** Founder (CEO)
- **Review:** Monthly

### RISK-O02: Pilot Merchant Drops Out Before Case Study Captured
- **Probability:** 2 | **Impact:** 3 | **Score: 6 - MEDIUM**
- **Description:** One or more of the 5 pilot merchants withdraws before providing usable metrics, weakening the validation story for investors and GTM.
- **Mitigation:**
  - Capture metrics daily from Day 1 (Lameda's own analytics, not relying on merchant reports)
  - Get signed permission for case study use within first 7 days of pilot
  - Identify 3 backup pilot merchants already interested
  - Offer pilot merchants 3 months free subscription post-launch in exchange for case study rights
- **Owner:** Founder (CEO)
- **Review:** Weekly

### RISK-O03: AI Response Quality Degradation
- **Probability:** 2 | **Impact:** 4 | **Score: 8 - MEDIUM**
- **Description:** AI responses become inappropriate, embarrassing, or culturally offensive (e.g., incorrect Pidgin, price hallucinations, inappropriate tone with frustrated customers), leading to merchant complaints and churn.
- **Mitigation:**
  - System prompt review process: any prompt change requires founder approval
  - Random sample review: founder reviews 20 random AI conversations per week during first 3 months
  - Merchant feedback button on dashboard: "Flag bad AI response" linked to Sentry
  - Hard guardrails: AI can never quote a price lower than the catalog price (validated in response builder before sending)
  - Pidgin language review by native speaker before PCM mode launches
- **Owner:** Founder (CEO)
- **Review:** Weekly

---

## 6. Financial Risks

### RISK-F01: Seed Round Not Closing
- **Probability:** 2 | **Impact:** 5 | **Score: 10 - MEDIUM**
- **Description:** N50M seed round does not close within 90 days, leaving the business undercapitalized. At current runway (bootstrapped), the engineering timeline slips and the GTM plan stalls.
- **Mitigation:**
  - Pilot metrics validation before investor outreach: 5 merchants, 3 weeks live, quantified results
  - Target 10 Nigerian seed funds and angels (Voltron Capital, Ventures Platform, Microtraction)
  - Convertible note or SAFE structure: faster to close than priced round
  - Plan B: launch with 2 paying merchants at N15,000 each to generate first MRR, extend runway
  - Revenue-based financing via Pipe or Capchase if SaaS metrics are strong by Month 6
- **Owner:** Founder (CEO)
- **Review:** Monthly

### RISK-F02: COGS Higher Than Modelled (BSP Costs)
- **Probability:** 3 | **Impact:** 3 | **Score: 9 - MEDIUM**
- **Description:** WhatsApp BSP costs (Termii) increase due to Meta pricing changes or Naira devaluation, pushing COGS above model assumptions and compressing gross margin below 20% at early stage.
- **Mitigation:**
  - Monitor Meta's WhatsApp API pricing announcements quarterly
  - Negotiate Termii volume pricing agreement before 100-merchant milestone
  - Model a "high COGS" scenario: if COGS rises by 30%, what is the minimum viable ARPU? (Currently N16,500 - within 10% of Growth tier)
  - BSP cost reduction lever: prompt engineering to reduce average message count per conversation (currently ~12 messages, target under 10)
- **Owner:** Founder (CEO)
- **Review:** Quarterly

### RISK-F03: Naira Devaluation Affecting USD-Denominated Costs
- **Probability:** 3 | **Impact:** 3 | **Score: 9 - MEDIUM**
- **Description:** Key costs (Anthropic API, Replicate, Vercel, Supabase) are billed in USD. If Naira devalues significantly (from current N1,600/USD), USD costs as a percentage of NGN revenue increase.
- **Mitigation:**
  - Current model already uses conservative N1,600/USD rate
  - Price plan in Naira but index to USD cost baseline; include clause in terms allowing 10% annual price increase
  - Hedge by maintaining USD buffer (from seed round) for 6 months of USD costs
- **Owner:** Founder (CEO)
- **Review:** Quarterly

---

## 7. Strategic Risks

### RISK-S01: Meta Changes WhatsApp Business API Terms
- **Probability:** 2 | **Impact:** 5 | **Score: 10 - MEDIUM**
- **Description:** Meta deprecates or significantly changes the WhatsApp Business API in a way that makes Lameda's core product non-viable (e.g., prohibiting AI-generated responses, introducing per-conversation fees that destroy unit economics).
- **Mitigation:**
  - Platform diversification: build Telegram integration in parallel as alternative channel (Phase 2 roadmap item)
  - Monitor Meta's developer blog and BSP partner communications monthly
  - Business model resilience: even without WhatsApp, the AI commerce engine has value via SMS or web chat
  - Legal: Meta's terms currently explicitly allow AI chatbots; document this baseline
- **Owner:** Founder (CEO)
- **Review:** Quarterly

### RISK-S02: Insufficient Differentiation from Future Nigerian Entrants
- **Probability:** 3 | **Impact:** 3 | **Score: 9 - MEDIUM**
- **Description:** A well-funded Nigerian startup (or an international player like Africa-focused Paystack) builds a near-identical product within 18 months, commoditising the market before Lameda reaches Series A.
- **Mitigation:**
  - Build proprietary data moat: conversation patterns, product terminology, price points from real Nigerian fashion commerce
  - Speed of merchant acquisition: 200 merchants by Month 9 creates compounding word-of-mouth and referral network effects
  - Deepen integrations (logistics, POS, accounting) that take competitors 12+ months to replicate
  - Build merchant community (Lameda Fashion Retailers WhatsApp group) that creates switching costs and loyalty
- **Owner:** Founder (CEO)
- **Review:** Quarterly

### RISK-S03: Product-Market Fit Narrow (Only Works for Fashion)
- **Probability:** 2 | **Impact:** 3 | **Score: 6 - MEDIUM**
- **Description:** The product proves very effective for fashion retailers but fails to translate to other verticals (beauty, food, home decor), limiting the TAM and making regional expansion difficult.
- **Mitigation:**
  - Vertical-agnostic architecture: product catalog, conversation engine, and payment flow are not fashion-specific at the code level
  - Test 2 beauty merchant pilots by Month 9 before committing to vertical expansion
  - If fashion-only, the SAM is still N28.8B (200,000 fashion retailers) - sufficient for Series A
- **Owner:** Founder (CEO)
- **Review:** Quarterly

---

## 8. Risk Dashboard Summary

| ID | Risk | Score | Rating | Status |
|----|------|-------|--------|--------|
| RISK-T01 | Termii BSP outage | 15 | HIGH | Mitigating - Twilio backup in progress |
| RISK-R01 | WhatsApp policy violation | 15 | HIGH | Mitigating - Policy review assigned |
| RISK-C01 | Trial-to-paid conversion failure | 15 | HIGH | Active monitoring - weekly review |
| RISK-O01 | Engineering capacity (pre-funding) | 16 | HIGH | Mitigating - documentation complete |
| RISK-C02 | Bumpa adds WhatsApp AI | 12 | HIGH | Monitor - monthly Bumpa watch |
| RISK-C04 | Merchant churn above 5% | 12 | HIGH | Mitigating - NPS monitoring setup |
| RISK-R02 | NDPR non-compliance | 8 | MEDIUM | Mitigating - consultant engaged |
| RISK-T02 | Paystack API failure | 8 | MEDIUM | Mitigating - polling fallback built |
| RISK-T05 | DB connection exhaustion | 8 | MEDIUM | Mitigating - PgBouncer configured |
| RISK-O03 | AI response quality degradation | 8 | MEDIUM | Active - weekly conversation review |
| RISK-F01 | Seed round not closing | 10 | MEDIUM | Active - investor outreach Q3 2026 |
| RISK-S01 | Meta API terms change | 10 | MEDIUM | Monitor - Telegram integration in Phase 2 |
| RISK-F02 | COGS above model | 9 | MEDIUM | Monitor - Termii volume negotiation |
| RISK-F03 | Naira devaluation | 9 | MEDIUM | Monitor - USD buffer maintained |
| RISK-C03 | Price sensitivity | 9 | MEDIUM | Monitor - pricing A/B test ready |
| RISK-S02 | New Nigerian entrant | 9 | MEDIUM | Monitor - speed of acquisition |
| RISK-T03 | Claude API rate limit | 6 | MEDIUM | Mitigating - queue and cache built |
| RISK-T04 | pgvector degradation | 6 | MEDIUM | Monitor - latency alerts configured |
| RISK-R03 | CBN fintech regulation | 6 | MEDIUM | Monitor - legal opinion obtained |
| RISK-O02 | Pilot merchant dropout | 6 | MEDIUM | Mitigating - backup pilots identified |
| RISK-S03 | Narrow PMF (fashion only) | 6 | MEDIUM | Monitor - beauty pilot planned |
| All others | Low risks | Under 5 | LOW | Accept/Annual review |

---

## 9. Risk Review Process

**Weekly:** Critical and High risks reviewed by founder. Trial-to-paid conversion and churn checked every Monday.

**Monthly:** Full risk register reviewed, probabilities updated based on new information, new risks added if identified.

**Quarterly:** External risks (regulatory, competitive, macroeconomic) formally reassessed. Risk register shared with seed investors as part of board update.

**Trigger-based:** Any High or Critical risk moving to a new state (e.g., Bumpa announcement, Termii outage, NDPR communication) triggers an immediate out-of-cycle review and documented response.
