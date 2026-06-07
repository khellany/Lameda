# Lameda - Business Case v2
**Version:** 2.0 | **Date:** May 2026 | **Status:** Pre-Seed / Investor Ready

---

## 1. Executive Summary

Lameda is a conversational commerce SaaS platform that turns WhatsApp into a 24/7 AI-powered sales assistant for Nigerian SMEs. Starting with fashion retailers, Lameda automates product inquiries, order capture, payment collection, customer support, and abandoned cart recovery - entirely inside WhatsApp.

The Nigerian SME market has 41 million+ registered businesses, 76% WhatsApp penetration, and N4.3 trillion in annual e-commerce GMV. Fashion retail alone accounts for N1.2 trillion of that GMV, with over 200,000 retailers selling primarily through social channels and WhatsApp.

The product is validated: 5 pilot merchants are live, recovering an average of 3+ sales per week that were previously lost to slow response times. Merchants are paying or committed to pay N10,000 to N15,000/month.

Lameda seeks N50,000,000 (approximately $30,000 USD) in seed capital to fund 18 months of engineering, reach 200 paying merchants, and achieve N3M monthly recurring revenue - establishing the metrics required for a Series A.

---

## 2. Problem Statement

Nigerian fashion retailers sell through WhatsApp but manage every conversation manually. A typical Lagos retailer handles 20+ customer inquiries daily, across product questions, size availability, pricing, delivery logistics, payment follow-up, and complaints. This creates:

- Lost sales from slow or missed replies (estimated 3-5 customers per retailer daily)
- 8+ hours per week of manual, repetitive messaging work
- No order records, no customer history, no analytics
- Payment friction (chasing customers for bank transfers)
- Inability to serve customers overnight or during peak periods

The deeper problem: these retailers are not failing due to lack of demand. They are failing to capture demand they already have, because the operational overhead of WhatsApp commerce scales linearly with every new customer.

---

## 3. Customer Validation

**5 pilot merchants identified and onboarded:**
- All Lagos-based fashion retailers
- Product range: 20-80 SKUs
- Average 20 daily WhatsApp conversations
- Average order value: N50,000 - N120,000
- 3-5 customers lost per day due to slow responses
- All confirmed willingness to pay N10,000-N15,000/month

**Validation signals:**
- 100% of pilots completed the onboarding wizard in < 25 minutes
- Average of 3.2 abandoned cart recoveries per merchant in first 7 days
- Zero requests to cancel after first week live
- One merchant recovered N85,000 from a single overnight conversation

---

## 4. Competitive Landscape

No competitor delivers WhatsApp-native, Nigeria-first conversational commerce end-to-end.

| Feature | WATI | Bumpa | ManyChat | Bird.com | Lameda |
|---------|------|-------|----------|----------|--------|
| WhatsApp-native | Yes | No | Partial | Yes | Yes |
| Nigeria-first | No | Yes | No | No | Yes |
| AI product search | No | No | No | No | Yes |
| Image-based matching | No | No | No | No | Yes |
| Paystack integration | No | No | No | No | Yes |
| Nigerian Pidgin | No | No | No | No | Yes |
| Order management | No | Yes | No | No | Yes |
| Pricing (SME tier) | $49/mo | N5,000/mo | $15/mo | Enterprise | N10,000/mo |

**WATI** ($49/mo, ~N80,000): Global WhatsApp automation tool. No AI product discovery, no payment integration, no order management. Primarily for customer support teams, not retail commerce.

**Bumpa** (N5,000/mo): Nigerian inventory and sales app. Strong in point-of-sale and invoicing, but web-first and not WhatsApp-native. No conversational AI, no image search.

**ManyChat** ($15/mo): Global chat marketing tool. Supports WhatsApp but without Nigerian payment rails, Nigerian language support, or product catalog AI. Geared toward marketing automation, not commerce.

**Bird.com**: Enterprise messaging platform. Pricing starts at enterprise level, making it inaccessible to the SME segment Lameda targets.

**Positioning:** Lameda occupies the WhatsApp-native + Nigeria-first quadrant - a position none of the above competitors hold. The moat is built on Pidgin NLP training data, local BSP relationships, and deep integration with Nigerian payment and logistics infrastructure.

---

## 5. Market Sizing

**TAM - Total Addressable Market:**
Nigeria has 41M+ registered SMEs. 76% use WhatsApp as a primary business channel (Hootsuite Digital 2024). At N10,000/month per merchant: N4.1 trillion annual TAM. Cross-referenced with Nigeria's N4.3 trillion e-commerce GMV (NBS 2023).

**SAM - Serviceable Addressable Market:**
Focus on 200,000+ fashion retailers with WhatsApp-first operations, AOV > N30,000, and 10+ daily conversations. At N12,000/month average: N28.8 billion annual SAM.

**SOM - Serviceable Obtainable Market (18 months):**
Target 500 merchants in Lagos, Abuja, and Port Harcourt via direct sales, content marketing, and referral. At N15,000/month blended ARPU: N90M annual recurring revenue (N7.5M MRR).

---

## 6. Why Now

Three converging forces make 2026 the right moment to build Lameda:

**1. WhatsApp Business API maturity:** Meta opened the WhatsApp Cloud API to developers in 2022. BSPs like Termii now offer competitive per-message pricing (N0.38-N0.90) enabling affordable automation at SME scale. This did not exist in usable form before 2023.

**2. AI cost collapse:** Claude Haiku processes intent classification at under N0.002 per message. 18 months ago, the cost per conversation would have made the unit economics unworkable. The AI cost per merchant is now under N1,836/month - less than 20% of the subscription price.

**3. CBN digital payments mandate:** The Central Bank of Nigeria's cashless policy and the Paystack/Flutterwave ecosystem have driven merchant payment adoption to an inflection point. Merchants are now comfortable with digital payment links - the friction point that killed earlier attempts at WhatsApp commerce automation.

---

## 7. Business Model

**Revenue:** Monthly SaaS subscription (N10K / N15K / N25K per merchant per tier)

**Cost structure (per merchant, early stage):**
- WhatsApp BSP (Termii): N9,000/mo (51% of COGS, compresses to N4,500 at volume)
- AI API (Haiku + Sonnet): N1,836/mo
- Infrastructure (Supabase, Vercel, CLIP): N500/mo
- Support (blended): N300/mo
- **Total COGS (Growth tier): N11,636/mo**

**Gross margin:** 21% at early stage (Growth tier), improving to 54% at scale with BSP volume pricing.

**Unit economics:**
- Average MRR per merchant: N15,000
- LTV (18-month average lifetime): N270,000
- CAC (content + referral + direct sales): N50,000-N90,000
- LTV:CAC: 3:1 to 5:1
- Payback period: 4-6 months

---

## 8. Financial Projections (Base Scenario)

| Metric | Month 3 | Month 6 | Month 9 | Month 12 | Month 18 |
|--------|---------|---------|---------|---------|---------|
| Paying Merchants | 10 | 50 | 200 | 500 | 890 |
| MRR | N150K | N750K | N3M | N7.5M | N13.4M |
| Gross Margin | 21% | 35% | 52% | 65% | 72% |
| Cumulative Burn | N8M | N18M | N30M | N38M | N44M |
| Break-even | - | - | Month 11 | Profitable | N+24M profit |

Full 3-scenario model (Conservative / Base / Optimistic) with monthly granularity and sensitivity analysis available in `09_Financial_Model_v2.xlsx`.

---

## 9. Go-to-Market Strategy

**Phase 1 (Months 1-3): Validate - 10 merchants**
- Founder-led direct outreach to Lagos fashion retailers
- Instagram DM campaigns targeting fashion community accounts
- Case study documentation with specific metrics (sales recovered, hours saved)
- Target: 80% trial-to-paid conversion

**Phase 2 (Months 4-9): Accelerate - 200 merchants**
- Content marketing: "WhatsApp selling tips for Nigerian fashion retailers" (SEO + social)
- Referral program: 1 free month per successful referral
- Trade association partnerships (Lagos Chamber of Commerce, fashion markets)
- Target: 15% month-on-month merchant growth

**Phase 3 (Months 10-18): Scale - 500+ merchants**
- Agency/reseller channel: digital marketing agencies offer Lameda to retail clients
- Vertical expansion: beauty retailers, food vendors, home decor
- Regional expansion: Ghana and Kenya using same playbook with local BSP partners

---

## 10. NDPR Compliance

Lameda processes customer PII (names, phone numbers, conversation history, order data). As a Nigerian data processor, Lameda is subject to the Nigeria Data Protection Regulation (NDPR) and NITDA guidance.

Compliance commitments:
- Data residency: all customer data stored in Supabase instance with Nigerian data residency
- Consent: explicit opt-in captured at first WhatsApp interaction
- Right to erasure: merchant can delete customer PII via dashboard (completed within 72 hours)
- Data Protection Officer appointed before first paid customer
- Privacy notice published on landing page and linked in WhatsApp welcome message
- Annual NDPR audit commissioned

---

## 11. Founding Team

**Dayo Oladayo Kelani - Founder and CEO**
Product strategy, go-to-market, and investor relations. Deep understanding of Nigerian retail and WhatsApp commerce pain points validated through direct customer discovery with 20+ merchants across Lagos, Abuja, and Port Harcourt.

**Planned hires with seed capital:**
- 2x Full-Stack Engineers (Next.js, Supabase, Node.js)
- 1x Customer Success Lead (Nigerian market, Pidgin-fluent)

---

## 12. The Ask

**Seeking:** N50,000,000 seed round (~$30,000 USD)
**Structure:** Convertible note or SAFE
**Runway:** 18 months
**Use of funds:**
- Engineering (2 FTEs x 9 months): 45% - N22.5M
- Product infrastructure (hosting, APIs, BSP credits): 20% - N10M
- Marketing and customer acquisition: 20% - N10M
- Operations, legal, and NDPR compliance: 10% - N5M
- Reserve: 5% - N2.5M

**Series A readiness criteria (Month 12):**
- 500 paying merchants
- N7.5M MRR
- 72% gross margin
- Less than 5% monthly churn
- Proven unit economics (LTV:CAC > 3:1)
