# Lameda - Process Optimization Analysis
**Version:** 3.0 | **Date:** May 2026 | **Status:** Pre-Launch Operational Review

---

## Executive Summary

This analysis maps the core operational processes in Lameda's merchant and customer journeys, identifies the highest-value optimization opportunities, and provides prioritized recommendations. The primary finding is that three process areas - merchant onboarding, abandoned cart recovery timing, and human handoff resolution - account for roughly 80% of the conversion and retention risk in the early-stage business. Optimizing these three areas before scaling is essential to achieving the 80% trial-to-paid conversion target and under 5% monthly churn.

---

## 1. Process Inventory

Lameda has four core operational process domains:

1. **Merchant Acquisition and Onboarding** - Trial start to first live AI conversation
2. **Customer Commerce Flow** - Inbound WhatsApp to confirmed payment
3. **Human Handoff Resolution** - AI escalation to merchant resolution
4. **Order Fulfillment and Post-Purchase** - Payment confirmed to delivery feedback

Each domain is analysed below with current state, bottlenecks, and optimization recommendations.

---

## 2. Process Analysis: Merchant Acquisition and Onboarding

### Current State (As-Is)

```
[Merchant discovers Lameda]
     |
     | (Instagram, referral, content)
     v
[Landing page visit]
     |
     | ~60% bounce without action (estimated)
     v
[Trial signup]
     |
     | Email verification
     v
[5-step onboarding wizard]
  Step 1: Business profile (name, category, language)
  Step 2: WhatsApp number verification (OTP via WhatsApp)
  Step 3: Persona setup (AI assistant name, tone)
  Step 4: Delivery and return policy
  Step 5: Product catalog (manual or CSV)
     |
     | Average completion: 25 minutes (pilot data)
     v
[First live AI conversation possible]
```

### Bottlenecks and Failure Points

**Bottleneck 1: WhatsApp OTP verification (Step 2)**
- Root cause: Meta's OTP delivery can be delayed by 30-90 seconds during peak hours
- Impact: 15% of merchants abandon at this step (estimated from pilot feedback)
- Severity: High - this is required to activate the product

**Bottleneck 2: Product catalog entry (Step 5)**
- Root cause: Manual entry is tedious for merchants with 20+ SKUs; CSV upload requires formatting knowledge
- Impact: 25% of merchants upload incomplete catalogs in trial, reducing AI quality
- Severity: High - poor AI performance with sparse catalog leads to trial abandonment

**Bottleneck 3: No "first win" milestone**
- Root cause: After onboarding, merchants need to see the AI work to believe in it
- Impact: Without a demonstrable first result within 24 hours, trial conversion drops
- Severity: Medium

**Bottleneck 4: Persona and policy setup skipped**
- Root cause: Steps 3 and 4 are optional-feeling; merchants skip them
- Impact: Generic AI responses without merchant personality reduce customer satisfaction
- Severity: Medium

### Optimized Process (To-Be)

**Quick Win (Sprint 2-3):**
- Pre-fill WhatsApp number from trial signup form to reduce OTP friction
- Add "Retry OTP" with clearer instruction copy ("Check your WhatsApp, not SMS")
- CSV upload: add downloadable template with pre-filled example rows

**High Impact (Sprint 4-5):**
- Guided "first conversation" demo: after onboarding, send merchant a test WhatsApp message from their AI assistant so they see it working immediately
- Add a progress milestone: "Your store is 60% ready - add 5 more products to unlock AI product recommendations"
- Default persona to "Lameda" with the merchant's business name baked in, so merchants get a working AI without filling out persona fields

**KPI targets:**
- Onboarding completion rate: 75% of trial signups (from estimated 55% today)
- Time-to-first-AI-response: under 30 minutes from signup
- Catalog completeness at trial day 1: at least 10 products (from estimated average of 4)

---

## 3. Process Analysis: Customer Commerce Flow

### Current State (As-Is)

```
[Customer messages WhatsApp number]
     |
     v
[AI greeting + intent classification]  ~500ms
     |
     v
[Product inquiry handling]
  - NLP search: ~400ms
  - Image match: ~3 seconds
  - Product cards returned: 1-3 items
     |
     v
[Variant selection]  ~1 exchange
     |
     v
[Delivery address capture]  ~2-3 exchanges
     |
     v
[Order creation + payment link sent]  ~1 second
     |
     v
[Customer pays or abandons]
  - Pays: confirmation, merchant alert
  - Abandons: T+15min reminder, T+2hr reminder
```

### Bottlenecks and Failure Points

**Bottleneck 1: Multi-step delivery address capture**
- Root cause: Capturing street, city, and state conversationally takes 2-4 exchanges
- Impact: ~20% drop-off between order intent and delivery address completion
- Severity: High

**Bottleneck 2: Payment link abandonment**
- Root cause: Customers leave WhatsApp to complete payment, causing friction
- Impact: 30-40% of payment links are not clicked (industry benchmark for WhatsApp)
- Severity: High

**Bottleneck 3: Out-of-stock dead ends**
- Root cause: When a preferred item is out of stock, alternative suggestions are generic
- Impact: Customers disengage rather than switching to an alternative
- Severity: Medium

**Bottleneck 4: AI over-cautious handoffs**
- Root cause: Confidence threshold set at 0.70 may be too conservative for common queries
- Impact: Merchants get flooded with unnecessary handoffs, eroding trust in the AI
- Severity: Medium

### Optimized Process (To-Be)

**Quick Win:**
- Delivery address: offer "Use your last delivery address" for returning customers (stored in customer_preferences)
- Payment link message: use rich WhatsApp template with product image + order summary above the payment button (higher click rate vs. plain text link)
- Out-of-stock response: proactively offer "notify when back in stock" as a WhatsApp opt-in (captured in customer_preferences)

**High Impact:**
- Track AI handoff reasons for 30 days; recalibrate confidence thresholds for common query types that should NOT be escalated (e.g., "what's the price?" being escalated due to borderline confidence)
- A/B test abandoned cart message copy: emotional appeal ("You left something beautiful behind") vs. functional reminder ("Your order is waiting")
- Add delivery address shortcut: integrate with Google Maps Places API to allow address autocomplete in WhatsApp (via link, opens Maps briefly)

**KPI targets:**
- Checkout completion rate: 35% of started orders (from estimated 20% today)
- Abandoned cart recovery rate: 25-30% of abandoned orders
- Unnecessary handoff rate: under 8% of total conversations

---

## 4. Process Analysis: Human Handoff Resolution

### Current State (As-Is)

```
[Handoff triggered]
     |
     v
[Customer receives "connecting you" message]
     |
     v
[Merchant receives Realtime alert]
     |
     | Merchant must:
     | - Open dashboard
     | - Find the conversation
     | - Read full history
     | - Respond
     v
[Merchant resolves issue]
     |
     v
[Merchant manually clicks "Resume AI"]
     |
     v
[AI resumes with context]
```

### Bottlenecks and Failure Points

**Bottleneck 1: Merchant response time to handoff alerts**
- Root cause: Merchants are away from dashboard (especially at night)
- Impact: Customer waits, becomes more frustrated, abandons
- Severity: Critical

**Bottleneck 2: Context catch-up time**
- Root cause: Merchant must read full conversation history to understand the situation
- Impact: Delays initial merchant response by 1-2 minutes
- Severity: Medium

**Bottleneck 3: "Resume AI" step is forgotten**
- Root cause: After resolving the issue, merchants forget to re-enable the AI
- Impact: Subsequent messages from the same customer go unanswered
- Severity: Medium

### Optimized Process (To-Be)

**Quick Win:**
- Mobile PWA push notifications for handoff alerts (works on Android, iOS Safari)
- Handoff alert includes AI-generated 2-sentence summary of what the customer wants
- Auto-resume AI timer: if merchant has not responded within 30 minutes, AI sends "Our team is currently busy, I'll continue helping you" and resumes

**High Impact:**
- Pre-written response templates for common handoff scenarios (discount request, complaint, custom order) that merchant can send in one tap
- Handoff SLA timer visible on dashboard: shows time elapsed since handoff was created
- Daily summary of handoff rate per merchant: if above 15%, flag for merchant to review AI persona settings

**KPI targets:**
- Merchant first response time (handoff): under 15 minutes during business hours
- Handoff resolution rate: 90% resolved within 2 hours
- AI resume rate: 85% of handoffs end with AI resumed (not conversation abandoned)

---

## 5. Process Analysis: Order Fulfillment and Post-Purchase

### Current State (As-Is)

```
[Order confirmed (payment received)]
     |
     v
[Merchant notified via dashboard]
     |
     v
[Merchant manually fulfills order]
     |
     | No automated tracking in MVP
     v
[Merchant updates order status to "dispatched"]
     |
     v
[Customer receives WhatsApp dispatch notification]
     |
     v
[Order delivered / dispute raised]
```

### Bottlenecks and Failure Points

**Bottleneck 1: No delivery tracking integration**
- Root cause: MVP has no logistics partner integration
- Impact: Customers message asking "where is my order?" creating support load
- Severity: Medium (acceptable at MVP scale)

**Bottleneck 2: No post-purchase engagement**
- Root cause: After delivery confirmation, no automated re-engagement
- Impact: Missed upsell and re-order opportunities
- Severity: Low (post-MVP)

**Bottleneck 3: Merchant forgets to update order status**
- Root cause: Dashboard requires manual status update; no reminder
- Impact: Customer has no visibility; satisfaction drops
- Severity: Medium

### Optimized Process (To-Be)

**Quick Win:**
- Order dispatch reminder: pg_cron sends merchant WhatsApp message "You have 3 orders confirmed but not dispatched from yesterday. Update status?" (24 hours after payment)
- Post-delivery automated message: 48 hours after dispatch, send "How did your order arrive?" to customer (captures NPS-style feedback)

**High Impact (Sprint 7+):**
- GIG Logistics or Sendstack integration: automatic tracking link sent to customer on dispatch
- Re-order campaign: 30 days after last purchase, segment customer into "re-order candidates" for broadcast campaign

---

## 6. Process Optimization Priority Matrix

| Process | Effort | Impact | Priority | Sprint Target |
|---------|--------|--------|----------|--------------|
| WhatsApp OTP retry UX | Low | High | P0 | Sprint 2 |
| CSV product import template | Low | High | P0 | Sprint 2 |
| First-win guided demo post-onboarding | Medium | High | P0 | Sprint 3 |
| Payment link as rich WhatsApp template | Medium | High | P1 | Sprint 5 |
| Returning customer address shortcut | Low | Medium | P1 | Sprint 5 |
| Handoff AI summary in alert | Medium | High | P1 | Sprint 4 |
| Mobile PWA push notifications | Medium | High | P1 | Sprint 4 |
| Auto-resume AI after 30-min timeout | Medium | High | P1 | Sprint 5 |
| Handoff SLA timer on dashboard | Low | Medium | P2 | Sprint 7 |
| Order dispatch reminder (merchant) | Low | Medium | P2 | Sprint 7 |
| Confidence threshold recalibration | Medium | Medium | P2 | Sprint 6 |
| Logistics integration | High | Medium | P3 | Sprint 9+ |

---

## 7. Recommended Operating Metrics

Track these weekly from Day 1 to catch process failures early:

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Onboarding completion rate | 75% | Below 60% |
| Time to first AI conversation | Under 30 min | Above 60 min |
| Catalog completeness at trial day 1 | 10+ products | Below 5 products |
| Checkout completion rate | 35% | Below 20% |
| Abandoned cart recovery rate | 25% | Below 15% |
| Handoff rate | Under 10% of conversations | Above 20% |
| Merchant response to handoff | Under 15 min | Above 30 min |
| Trial-to-paid conversion | 80% | Below 65% |
| Monthly churn | Under 5% | Above 8% |

---

## 8. Quick Wins Summary (Can Be Implemented Before Launch)

1. Pre-fill WhatsApp number in OTP step from signup data
2. Add downloadable CSV template with example fashion product rows
3. Default AI persona to "[Business Name] Store Assistant" with no setup required
4. Make delivery policy and return policy fields optional (but prompted)
5. Add "Your AI is live!" confirmation screen after onboarding with a test message button
6. Rich payment link template with product image above the pay button
7. "Notify me when back in stock" opt-in button on out-of-stock messages
