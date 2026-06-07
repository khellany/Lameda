# Strategy and Future Product Plan
## Lameda - v2
### Version: 2.0 | Date: May 2026

---

## 1. Positioning

Lameda is a conversational commerce operating layer for Nigerian SMEs. It is not a generic chatbot. It is not a CRM. It is not a website builder. It is the revenue and support system that lives inside the channel where commerce already happens in Nigeria - WhatsApp.

The positioning statement is: "The sales assistant your store already needs, inside the app your customers already use."

---

## 2. Beachhead Market

**First beachhead:** Small Nigerian fashion retailers.

Qualifying criteria:
- Under 100 products at MVP entry.
- 20 or more daily customer conversations.
- Average order value above N50,000.
- WhatsApp as the primary or sole sales channel.
- Solo founder or small team with no dedicated support staff.

**Why this market first:**
- The pain is acute and measurable (3-4 lost customers per day, documented in discovery).
- Fashion retail has structured, repeatable product queries (size, colour, price, availability).
- Average order values justify a N10,000-N25,000/month tool.
- Fashion merchants share networks and communities - word of mouth travels fast.
- Catalog structure (product, variant, image, price) is consistent enough for clean MVP scope.

---

## 3. MRR Milestones

| Milestone | Month | MRR Target | Paying Merchants | Notes |
|---|---|---|---|---|
| M0 | Month 0 | N0 | 0 | Pre-launch, pilots on free trial |
| M1 | Month 3 | N150,000 | ~12 merchants | Post-trial conversions from pilot cohort |
| M2 | Month 6 | N750,000 | ~55 merchants | Referral growth + first sales hires |
| M3 | Month 9 | N3,000,000 | ~185 merchants | Adjacent verticals onboarding |
| M4 | Month 12 | N7,500,000 | ~450 merchants | Broadcast + retention features drive upsell to Growth/Pro |
| M5 | Month 18 | N13,400,000 | ~750 merchants | Multi-vertical, Expansion mode, Series A window |

**MRR assumptions:**
- Average revenue per merchant (ARPM): N15,000/month blended (mix of Starter, Growth, Pro).
- Monthly churn: 5% at early stage, improving to 3% at Month 12 with retention features.
- Viral coefficient: 0.3 (each merchant refers 0.3 new merchants on average per quarter).

---

## 4. BSP Vendor Comparison

WhatsApp Business API access requires a Business Solution Provider (BSP). Lameda uses Termii as primary BSP. The table below justifies this selection and documents the failover plan.

| Criteria | Termii | Infobip | Bird (MessageBird) |
|---|---|---|---|
| Monthly base cost | Low, Nigeria-adjusted pricing | Medium-high | Enterprise pricing, minimum commitments |
| Per-conversation cost | Competitive for Nigeria | Higher per message | Negotiated, not SME-friendly |
| Nigeria-specific routing | Strong, local PoP | Good but global-first | Limited Nigeria optimisation |
| API reliability (SLA) | 99.5% documented | 99.9% documented | 99.95% documented |
| Onboarding speed | Fast (1-3 days for BSP approval) | Slower (5-10 days) | Slowest (enterprise sales cycle) |
| Support quality for Nigeria | Strong, local team | Good, regional support | Limited local support |
| WhatsApp number porting | Supported | Supported | Supported |
| Failover routing | Possible via dual-BSP setup | Native multi-region | Native multi-region |
| SME fit | Excellent | Moderate | Poor |

**Decision:** Termii is primary BSP for cost, speed, and Nigeria depth. Infobip is configured as failover BSP for continuity. At 1,000+ merchants, a dual-BSP architecture becomes mandatory.

---

## 5. Competitive Positioning

### 2x2 Positioning Matrix

Axes: (1) WhatsApp-native depth vs web-first adaptation; (2) Nigeria-specific features vs generic global tool.

**Quadrant mapping:**
- **Top-right (WhatsApp-native + Nigeria-specific): Lameda** - purpose-built for Nigerian SME WhatsApp commerce with Pidgin NLP, Paystack + bank transfer, and local product catalog intelligence.
- **Top-left (WhatsApp-native + generic global): WATI** - strong WhatsApp tooling but no Pidgin support, no Paystack integration, no Nigerian pricing sensitivity.
- **Bottom-right (web-first + Nigeria-specific): Bumpa** - excellent for Nigerian SME inventory management and e-commerce, but not WhatsApp-native. Commerce happens on a web storefront, not in chat.
- **Bottom-left (web-first + generic global): ManyChat, Bird.com** - powerful global automation platforms with no meaningful Nigeria localisation, no Pidgin, no local payment integration.

### Competitor Profiles

| Competitor | Pricing | Core Strength | Key Gap vs Lameda |
|---|---|---|---|
| WATI | $49/month (~N75K) | WhatsApp team inbox, automation | No Pidgin NLP, no Paystack, expensive for Nigerian SMEs, no image matching |
| Bumpa | N5,000/month | Nigerian SME inventory + web store | Not WhatsApp-native, no conversational checkout, no AI intent classification |
| ManyChat | $15+/month (global) | Multi-channel chatbot builder | No payment integration, no Pidgin, designed for ads/marketing not commerce |
| Bird.com | Enterprise pricing | Omnichannel at scale | No SME fit, no Nigeria localisation, complex onboarding |

**Lameda's wedge:** WhatsApp-native conversational checkout with Nigerian payment rails, Pidgin-aware AI, and CLIP image matching - at SME-accessible pricing.

---

## 6. Go-To-Market Strategy

### Phase 1 - Founder-Led Sales (Months 1-4)
- Founder directly identifies and onboards 5 pilot merchants.
- Done-for-you setup: Lameda migrates catalog, configures bot, and runs first week alongside merchant.
- Weekly calls collect feedback and measure outcomes.
- Social proof documented: screenshots, recovered sales, time saved.

### Phase 2 - Referral and Community (Months 5-8)
- Pilot merchants become advocates. Referral incentive: one month free for every paying referral.
- Content distribution: demo videos on Instagram and TikTok showing bot in action.
- Partnerships with WhatsApp fashion commerce communities (groups with 500+ sellers).
- First sales hire focused on inbound demo-to-close.

### Phase 3 - Vertical Expansion (Months 9-14)
- Vertical templates for beauty, food, and home decor.
- Partnerships with business associations (Lagos Chamber of Commerce, SME accelerators).
- Growth via inside sales team and self-serve onboarding.

### Phase 4 - Regional and Platform Scale (Months 15+)
- Ghana, Kenya as next geographies (English-dominant, WhatsApp-heavy commerce).
- Developer API for third-party integrations.
- Consideration of Series A raise to fund engineering depth and market expansion.

---

## 7. Commercial Strategy

1. Validate on 3-5 pilot retailers. Provide free setup. Charge after 14-day trial.
2. Prove ROI with measurement: compare response time, conversion rate, and order volume before and after Lameda.
3. Use pilot results as sales collateral for the next 50 merchants.
4. Expand to adjacent verticals once merchant onboarding is repeatable and self-service.
5. Introduce Growth and Pro upsells once merchants see value in Starter.

---

## 8. Expansion Playbook

### Vertical Entry Criteria
A vertical is ready for expansion when:
- At least 10 paying merchants from that vertical have approached Lameda or been piloted.
- The product catalog structure is compatible with existing data model (products, variants, images, price).
- Payment and fulfilment patterns match existing flows.
- Pilot NPS in the vertical is above 40.

### Vertical Playbooks

**Beauty and Cosmetics**
- Key difference: shade matching matters (CLIP image match is especially valuable).
- Template: skin type preference capture in onboarding, product ingredient FAQs.
- Target merchants: Lagos beauty stores, cosmetic resellers, skin care brands.
- Entry timing: Month 9-10.

**Food and Grocery**
- Key difference: perishable stock, daily price changes, delivery time windows.
- Template: daily menu updates, time-slot booking, perishable expiry logic.
- Complexity: higher than fashion. Entry timing: Month 12-14.

**Home Decor and Lifestyle**
- Key difference: high-consideration purchase, more customer questions before buying.
- Template: dimension capture, room type matching, bulk order handling.
- Entry timing: Month 10-12.

---

## 9. Defensibility

| Moat | How It Builds Over Time |
|---|---|
| Pidgin NLP Training Data | Every live conversation adds to the corpus. Not available to purchase. |
| Merchant Switching Costs | Catalog is built in Lameda. Workflow templates are tuned. Customers know the bot. Migration is painful. |
| Local Payment Depth | Bank transfer + Paystack integration tuned to Nigerian edge cases. Not trivial to replicate. |
| Product Experience Tuning | Workflow data shows which message sequences convert. Compound improvement with every pilot. |
| CLIP Fashion Corpus | Nigerian fashion image embeddings improve matching accuracy beyond generic CLIP. Proprietary over time. |

---

## 10. Series A Readiness Criteria

Lameda is Series A ready when it meets all of the following:

| Criteria | Target |
|---|---|
| MRR | N13M+ (approximately $8,500 USD/month) |
| Paying merchants | 750+ |
| Monthly churn | Under 3% |
| Gross margin | 65%+ |
| Trial-to-paid conversion | 70%+ |
| NPS | 45+ |
| Active verticals | 3+ (fashion, beauty, home decor minimum) |
| NDPR compliance | Full audit passed |
| Team | 4+ full-time (2 engineering, 1 growth, 1 operations) |
| Institutional validation | At least 1 accelerator cohort completed or strategic angel with SME network |

Estimated Series A timing: Month 18-24 based on MRR trajectory.

---

## 11. Product Growth Strategy

### Phase 1 (Months 1-4): Prove Core Loop
- Product catalog upload.
- WhatsApp conversational search.
- Order capture.
- Paystack + bank transfer payment.
- Human handoff.
- Basic analytics dashboard.

### Phase 2 (Months 5-8): Retention and Expansion
- Customer segmentation (new, repeat, high-value, dormant).
- Broadcast campaigns to segments.
- Abandoned cart recovery (15-min, 2-hour, 24-hour sequence).
- Testimonial generation.
- Reorder nudges post-delivery.
- CLIP image matching (if not already shipped in Phase 1).
- Improved analytics: conversion funnel, response time trends.

### Phase 3 (Months 9-14): Intelligence and Scale
- Deeper Pidgin NLP accuracy (custom fine-tuning on corpus).
- Multi-agent support (multiple merchant team members).
- Rule automation builder for merchants to configure custom flows.
- Rich CRM capabilities (conversation tagging, notes, customer scoring).
- Vertical templates (beauty, home decor).

### Phase 4 (Months 15+): Platform
- Developer API and webhook platform.
- Telegram channel support.
- Regional expansion (Ghana, Kenya).
- Ecosystem partnerships (logistics, ERP, accounting).
- Acquisition readiness positioning.

---

## 12. Major Strategic Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| WhatsApp policy change restricting commerce automation | Medium | Critical | Design channel abstraction layer; monitor policy updates; BSP relationship for early notice |
| Onboarding friction stops pilot conversion | High | High | Done-for-you setup for first 20 merchants; simplify catalog upload |
| Merchant distrust of AI in customer conversations | Medium | High | Human handoff always available; transparent bot persona; merchant reviews all messages |
| Complexity creep delays MVP | High | High | Strict scope enforcement; weekly backlog review |
| BSP cost increase erodes margins | Medium | Medium | Dual-BSP setup; volume negotiation at 500+ merchants |

---

## 13. Strategic Principle

Build the smallest product that consistently converts WhatsApp chat into paid orders and reduces merchant workload. Expand only after that loop is proven, measured, and repeatable.
