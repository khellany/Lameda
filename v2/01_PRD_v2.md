# Product Requirements Document (PRD)
## Lameda - v2
### Version: 2.0 | Date: May 2026 | Status: Engineering-Ready

---

## 1. Executive Summary

Lameda is a WhatsApp-first conversational commerce platform for Nigerian SMEs, starting with fashion retailers. It automates product inquiries, order processing, payment collection, delivery updates, and customer support entirely inside WhatsApp. The platform uses rule-based workflows augmented by Claude AI (Haiku for triage, Sonnet for complex intent) and CLIP-based image matching.

The MVP targets merchants with under 100 products, approximately 20 daily customer chats, average order values above N50,000, and a strong need to eliminate manual workload. The commercial model is a monthly SaaS subscription (Starter N10K, Growth N15K, Pro N25K) with a 14-day free trial. The system is built on Supabase + pgvector, Next.js 14, Vercel Edge, WhatsApp Cloud API, Paystack, and Termii as BSP.

---

## 2. Problem Statement

SMEs selling through WhatsApp handle all customer interactions manually. Merchants frequently have full-time jobs or other responsibilities, making fast response impossible. The result is delayed replies, missed sales, fragmented order records, no payment reconciliation, and poor complaint visibility. For fashion retailers specifically, product queries are repetitive and time-sensitive - customers want size, colour, price, and availability confirmed before a competitor responds.

---

## 3. Product Goal

Turn WhatsApp into a sales and service operating layer that enables merchants to:
- Respond instantly at any hour without hiring staff.
- Convert a higher proportion of inquiries into confirmed, paid orders.
- Guide customers through payment without leaving the chat thread.
- Manage complaints and support with visibility and accountability.
- Improve customer retention through automated follow-up.

---

## 4. Product Vision

A merchant uploads products once, shares a bot link, and Lameda handles the full customer conversation from greeting to order confirmation to post-delivery feedback - while the merchant focuses solely on fulfilment.

---

## 5. Objectives and Success Metrics

### Business Objectives
- Validate willingness to pay with 3 to 5 pilot retailers within Month 1-2.
- Convert 80% of successful pilots to paid subscriptions post-trial.
- Reach N150K MRR by Month 3 and N750K MRR by Month 6.

### Product Success Metrics
| Metric | Target |
|---|---|
| Pilot response time improvement | 50% faster than manual baseline |
| Inquiry-to-order conversion uplift | +20% over pre-Lameda baseline |
| Support workload reduction | -30% in manual messages handled |
| Recovered sales per day per pilot | At least 1 |
| Trial-to-paid conversion | 80% among pilots completing the trial |
| p95 end-to-end API response time | Under 2 seconds |
| WhatsApp webhook acknowledgement | Under 500ms |
| Platform uptime | 99.9% monthly (max 43.8 min downtime/month) |

---

## 6. Target Users

### Primary Merchant Segment
- Nigerian fashion retailers (ready-to-wear, custom, thrift, accessories).
- Under 100 SKUs at MVP launch.
- 20+ daily customer conversations.
- Average order value above N50,000.
- WhatsApp as primary sales channel.
- Comfortable with dashboards; uncomfortable with spreadsheets.

### Primary Customer Segment
- Buyers who prefer to shop through chat.
- Comfortable sending pictures and asking questions conversationally.
- Located across Nigeria with varying connectivity.

### Secondary Merchant Segments (Post-MVP)
- Beauty and cosmetics retailers.
- Home decor stores.
- Food and grocery SMEs.

---

## 7. Scope

### In Scope (MVP)
- Merchant onboarding via web setup wizard.
- Product upload via form and image-first input.
- Product discovery via text search and customer image upload.
- Cart creation, variant selection, and guided checkout.
- Payment via Paystack hosted link and bank transfer.
- Automated payment reconciliation via webhooks.
- Order status notifications through WhatsApp.
- Human handoff for ambiguous, aggressive, or emotional conversations.
- Complaint logging and resolution workflow.
- Testimonial collection and reorder nudge.
- Basic analytics dashboard (orders, revenue, response time, complaints).
- English and Nigerian Pidgin support.
- NDPR-compliant consent capture and data handling.

### Out of Scope (MVP)
- Deep ERP integrations.
- Multi-country localization.
- Native mobile apps.
- Automated courier API integration.
- Advanced loyalty engine.
- Telegram channel support (deferred to Phase 2).

---

## 8. Core Workflows

### 8.1 Merchant Onboarding
1. Merchant discovers Lameda via social proof or outreach.
2. Web intake form captures business type, product count, current channel.
3. Magic link sent to email for account activation.
4. Setup wizard: connect WhatsApp number, upload catalog, set policies and FAQs, choose bot persona, set operating hours.
5. Merchant reviews bot preview and goes live.
6. Bot link is shared to customers.

**Acceptance criterion:** Merchant completes full onboarding within 30 minutes from signup.

### 8.2 Customer Commerce Flow
1. Customer opens merchant bot link.
2. Consent notice is displayed and captured with timestamp.
3. Customer selects: Shop, Search, My Orders, or Help.
4. Product matching is returned (text or image search).
5. Customer selects product, chooses variant.
6. Delivery details captured (address, preferred date, instructions).
7. Payment link (Paystack) or virtual account (bank transfer) issued.
8. Webhook confirms payment automatically.
9. Order confirmation sent to customer and merchant.
10. Status updates sent at each fulfilment stage.
11. Post-delivery: feedback and reorder nudge triggered.

### 8.3 Human Handoff Flow
1. AI confidence score drops below 0.7 OR emotion classifier detects hostility/distress.
2. System sends customer: "I'm connecting you with a team member now."
3. Merchant receives alert in dashboard with full conversation context.
4. Merchant opens conversation takeover modal and accepts handoff.
5. Merchant responds directly; bot is paused for this session.
6. Merchant can resume bot at any time via dashboard action.
7. Handoff event and resolution are logged to audit_logs.

### 8.4 Abandoned Cart Recovery Flow
1. Cart is created but no payment action taken within 15 minutes.
2. Recovery sequence triggered:
   - Message 1 (15 min): "Your cart is still waiting - complete your order here: [link]."
   - Message 2 (2 hours): "We saved your items! Here is what you had: [cart summary + link]."
   - Message 3 (24 hours): "Last reminder - these items may sell out. [link]"
3. If payment is completed at any point, sequence stops.
4. After Message 3, cart status moves to expired.

---

## 9. Functional Requirements

### Merchant Setup
- FR-01: Merchant shall create an account with email and password.
- FR-02: Merchant shall connect a WhatsApp number via WhatsApp Cloud API through Termii BSP.
- FR-03: Merchant shall upload products individually or in bulk via CSV.
- FR-04: Merchant shall define business hours, delivery policy, return policy, and FAQ bank.
- FR-05: Merchant shall select a bot persona (professional, friendly, vibrant).
- FR-06: Merchant shall preview the bot experience before going live.

### Customer Experience
- FR-07: Customer shall browse products by category with image and price.
- FR-08: Customer shall search using natural language text queries.
- FR-09: Customer shall share a product image to receive CLIP-matched item suggestions.
- FR-10: Customer shall add items to cart and select variants.
- FR-11: Customer shall receive a Paystack hosted link or bank transfer account.
- FR-12: Customer shall receive order confirmation and status updates automatically.
- FR-13: Customer shall be able to view order history via "My Orders."

### Payments
- FR-14: System shall generate a Paystack hosted checkout link per order.
- FR-15: System shall generate a bank transfer virtual account per order.
- FR-16: System shall reconcile payment automatically via Paystack webhook.
- FR-17: System shall reserve stock after confirmed payment.
- FR-18: Unpaid orders shall expire after 24 hours and release reserved stock.

### Operations
- FR-19: Merchant shall receive real-time WhatsApp notification for new paid orders.
- FR-20: Merchant shall move orders through states: confirm, pack, ship, deliver, complete.
- FR-21: Merchant shall log complaint resolutions (replace, refund, exchange, investigate).
- FR-22: Merchant shall schedule broadcast messages to customer segments.
- FR-23: Merchant shall view dashboard analytics (revenue, orders, conversion, complaints).

### Support and Escalation
- FR-24: System shall trigger human handoff when AI confidence is below 0.7.
- FR-25: System shall trigger human handoff when sentiment analysis detects hostility or emotional distress.
- FR-26: System shall preserve full conversation memory across sessions.
- FR-27: System shall auto-create complaint tickets on negative intent detection.
- FR-28: System shall send abandoned cart recovery messages at 15-minute, 2-hour, and 24-hour intervals.

---

## 10. Non-Functional Requirements

### Performance
- NFR-01: p95 end-to-end API response time shall be under 2 seconds under normal load.
- NFR-02: WhatsApp Cloud API webhook acknowledgement shall return HTTP 200 within 500ms.
- NFR-03: Platform uptime shall be 99.9% per calendar month (maximum 43.8 minutes downtime/month).
- NFR-04: Product image search (CLIP vector match) shall return results within 3 seconds.
- NFR-05: Dashboard page load shall be under 1.5 seconds for First Contentful Paint.

### Security
- NFR-06: All data at rest shall be encrypted with AES-256.
- NFR-07: All data in transit shall use TLS 1.3.
- NFR-08: Authentication shall use JWT access tokens (15-minute expiry) with refresh tokens (7-day expiry).
- NFR-09: Webhook endpoints shall verify HMAC-SHA256 signatures on every request.
- NFR-10: Application shall pass OWASP Top 10 assessment prior to production launch.
- NFR-11: Multi-tenant data isolation shall be enforced at row level using Supabase RLS policies.
- NFR-12: Secrets shall be managed via environment variables and not committed to source control.

### Scalability
- NFR-13: System shall support up to 100 merchants in single Supabase project configuration.
- NFR-14: Architecture shall be designed to support read replicas and Redis caching at 100-1000 merchant scale.
- NFR-15: System shall handle up to 10,000 inbound WhatsApp messages per day at MVP scale.

### Observability
- NFR-16: All API errors shall be captured in Sentry with merchant_id, request_id, and stack trace.
- NFR-17: Infrastructure metrics (CPU, memory, latency, error rate) shall be visible in Grafana.
- NFR-18: Webhook delivery failures shall trigger automatic retry with exponential backoff (max 3 attempts).

---

## 11. AI and ML Specification

### Intent Classification
- Model: Claude Haiku for triage, Claude Sonnet for complex intents.
- Confidence threshold: Actions are taken automatically above 0.85 confidence.
- Clarification requested from customer between 0.70 and 0.85 confidence.
- Human handoff triggered below 0.70 confidence.
- Intent classes: browse, search, cart_add, checkout, payment_query, complaint, returns, general_support, off_topic.

### Image-Based Product Matching
- Model: CLIP (clip-vit-large-patch14) running as a Supabase Edge Function or dedicated micro-service.
- Process: Customer image is encoded into a 768-dimension embedding; cosine similarity search is run against product_embeddings via pgvector ivfflat index.
- Top-3 matches returned if similarity > 0.65 threshold.
- If no match above 0.65, bot responds: "I could not find an exact match - would you like to describe what you are looking for?"
- Embeddings are regenerated when product images are updated.

### Sentiment Analysis
- Emotion classifier runs on every customer message using Claude Haiku.
- Labels: neutral, positive, frustrated, angry, distressed.
- Handoff triggered on frustrated, angry, or distressed labels combined with message count > 3 on same issue.

### Language Detection
- Automatic detection of English vs Nigerian Pidgin on first message.
- Merchant-configured default language is used as fallback.
- Bot responses adapt language register to match detected customer input.

---

## 12. NDPR Compliance Requirements

Lameda processes personal data on behalf of merchants (data processors) whose customers are data subjects. Compliance with the Nigeria Data Protection Regulation (NDPR) and Nigeria Data Protection Act (NDPA) 2023 is mandatory.

- FR-NDPR-01: Consent Capture - System shall display a plain-language consent notice to every first-time customer before processing any personal data. Consent timestamp, notice version, and customer channel ID shall be recorded in customer_preferences table.
- FR-NDPR-02: Audit Log - System shall record all create, update, delete, and export operations to the audit_logs table, capturing actor_type, actor_id, action, resource_type, resource_id, before_json, after_json, and IP address.
- FR-NDPR-03: Right to Erasure - System shall expose a GDPR/NDPR erasure API endpoint (DELETE /api/v1/ndpr/erasure) that anonymises all PII for a customer record within 72 hours of request.
- FR-NDPR-04: Data Minimisation - System shall collect only the data fields required for order processing (name, phone, delivery address). Optional fields shall be clearly marked optional.
- FR-NDPR-05: DPA Appointment - Lameda shall appoint a Data Protection Administrator and include a DPA agreement in the merchant Terms of Service.
- FR-NDPR-06: Breach Notification - System shall include an incident response runbook. In the event of a data breach, affected merchants and the NITDA shall be notified within 72 hours of discovery.
- FR-NDPR-07: Data Residency - Customer and transaction data for Nigerian merchants shall be stored in Supabase regions hosted within or closest to Nigeria (currently Africa - South Africa as nearest available, with a migration plan to Nigeria-hosted infrastructure when available).
- FR-NDPR-08: Privacy Notice - A public-facing privacy notice shall be published at lameda.ng/privacy, linked from all consent notices and the merchant onboarding flow.

---

## 13. Key Decisions

- WhatsApp Cloud API via Termii BSP is the primary channel. Telegram deferred to Phase 2.
- Human handoff is required and must be triggered by confidence and sentiment thresholds, not just merchant request.
- Order payment confirmation must be automatic via webhook - no manual payment marking in MVP.
- CLIP image matching is core, not a stretch feature - it is a primary product differentiator.
- NDPR compliance is built in from day one, not retrofitted.
- Supabase with pgvector is used for both relational data and vector search to reduce operational complexity at MVP scale.

---

## 14. Acceptance Criteria Highlights

- Merchant completes signup to live store within 30 minutes.
- Customer can search, select, pay, and receive confirmation without leaving WhatsApp.
- Payment confirmation triggers order status update and merchant notification automatically.
- AI escalates to human within one message turn when confidence is below threshold.
- Retailer can see orders, revenue, and customer segments in the dashboard.
- Abandoned cart recovery sends three messages on schedule without manual intervention.
- Consent is captured and stored before any customer PII is processed.
- Erasure request API anonymises PII within 72 hours.

---

## 15. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Catalog upload friction | Image-first entry, guided wizard, bulk CSV import |
| Trust in automation | Human handoff always available, transparent confirmation messages |
| Platform dependence on WhatsApp | Design channel abstraction layer, BSP failover plan |
| NDPR non-compliance | Built-in consent, audit logs, erasure API from day one |
| AI hallucination in product search | Confidence thresholds enforced, fallback to text search if CLIP confidence low |
| Payment webhook failure | Idempotency keys, retry logic, manual reconciliation fallback |
| BSP downtime (Termii) | Failover routing to Infobip configured at infrastructure level |

---

## 16. Release Plan

### Phase 1 - MVP (Months 1-4)
Core catalog, WhatsApp bot, order flow, Paystack payment, human handoff, basic dashboard, NDPR compliance.

### Phase 2 - Growth (Months 5-8)
Broadcasts, customer segmentation, abandoned cart recovery, improved analytics, Pidgin NLP tuning, testimonials, reorder nudges.

### Phase 3 - Scale (Months 9-14)
Advanced integrations, Telegram channel, multi-agent support, loyalty engine, API for merchant integrations, expansion to beauty and home decor verticals.

### Phase 4 - Expansion (Months 15+)
Regional expansion, multi-vertical templates, ecosystem partnerships, Series A readiness.
