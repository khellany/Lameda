# Product Requirements Document (PRD)
## Lameda

### 1. Executive Summary
Lameda is a WhatsApp-first and Telegram-enabled conversational commerce platform for SMEs, starting with Nigerian fashion retailers. It helps merchants manage customer inquiries, product discovery, orders, payment collection, delivery updates, complaints, feedback, and repeat sales inside the channels customers already use.

The MVP focuses on merchants with under 100 products, around 20 daily customer chats, average order values above ₦50,000, and a strong need to reduce manual workload. The commercial model is a monthly subscription with a 14-day free trial. The product uses rule-based workflows with conversational AI for intent detection, product search, and guided checkout.

### 2. Problem Statement
SMEs selling through social messaging channels lose sales because they handle orders and inquiries manually. Retailers often have full-time jobs or other responsibilities, so they cannot respond fast enough. This creates delayed replies, missed sales, poor customer experience, and fragmented support.

### 3. Product Goal
Turn WhatsApp and Telegram into a sales and service operating layer that helps merchants:
- respond faster,
- convert more inquiries into orders,
- guide customers to payment,
- manage complaints,
- and improve retention.

### 4. Product Vision
A merchant can upload products once, share a bot link, and let the system handle customer conversations end-to-end while the merchant focuses on fulfilment.

### 5. Objectives and Success Metrics
Business objectives:
- Validate willingness to pay among 3 to 5 pilot retailers.
- Prove that the platform recovers lost sales.
- Convert trials to paid subscriptions.

Product success metrics:
- 50% faster response time.
- 20% higher conversion rate.
- 30% lower support workload.
- At least 1 recovered sale per day for pilot merchants.
- 80% trial-to-paid conversion among successful pilots.

### 6. Target Users
Primary merchant segment:
- Nigerian fashion retailers.
- Under 100 SKUs at MVP start.
- 20+ daily customer conversations.
- Average order value above ₦50,000.
- Uses WhatsApp heavily for commerce.

Primary customer segment:
- Buyers who prefer to shop through chat.
- Comfortable sending pictures and asking questions in conversation.

### 7. Scope
In scope:
- Merchant onboarding through Telegram or guided web setup.
- Product upload through forms and image-first inputs.
- Product discovery by chat and by customer image.
- Cart and order creation.
- Payment via Paystack and bank transfer support.
- Order notifications and tracking updates.
- Human handoff for ambiguous, aggressive, or emotional conversations.
- Complaint handling.
- Testimonials and reorder nudges.
- Basic analytics and segmentation.
- English and Nigerian Pidgin support.

Out of scope:
- Deep ERP integrations.
- Multi-country localization.
- Native mobile apps.
- Automated courier API integration.
- Advanced loyalty engine.

### 8. Core Workflows
Merchant onboarding:
1. Merchant discovers Lameda.
2. Bot conducts intake.
3. Merchant confirms interest.
4. Merchant activates via magic link.
5. Merchant sets up catalog, policies, FAQs, and payment settings.
6. Merchant goes live and shares bot link.

Customer commerce flow:
1. Customer opens merchant bot.
2. Consent is captured.
3. Customer browses or searches.
4. Product matching is returned.
5. Customer chooses variants.
6. Delivery details are collected.
7. Payment link or transfer account is issued.
8. Order is confirmed and tracked.
9. Complaints and feedback are handled.

### 9. Functional Requirements
Merchant setup:
- FR-01: Merchant shall be able to create an account.
- FR-02: Merchant shall connect a WhatsApp or Telegram branded bot experience.
- FR-03: Merchant shall upload products individually or in bulk later.
- FR-04: Merchant shall define business hours, delivery policy, return policy, and FAQs.
- FR-05: Merchant shall select a bot persona.

Customer experience:
- FR-06: Customer shall be able to browse items by category.
- FR-07: Customer shall be able to search using natural language.
- FR-08: Customer shall be able to share a product image to request matching items.
- FR-09: Customer shall be able to add items to cart and checkout.
- FR-10: Customer shall receive payment guidance.
- FR-11: Customer shall receive order status updates.

Payments:
- FR-12: System shall support Paystack payment flow.
- FR-13: System shall support bank transfer flow.
- FR-14: System shall reconcile payment automatically through webhooks.
- FR-15: System shall reserve stock after confirmed payment.

Operations:
- FR-16: Merchant shall receive order notifications.
- FR-17: Merchant shall be able to confirm, pack, ship, and mark complete.
- FR-18: Merchant shall be able to handle complaints and refunds.
- FR-19: Merchant shall be able to broadcast promotions to segmented customers.
- FR-20: Merchant shall see analytics in the dashboard.

Support and escalation:
- FR-21: System shall hand off to a human when confidence is low or emotions are high.
- FR-22: System shall preserve conversation memory.
- FR-23: System shall create complaint tickets.

### 10. Non-Functional Requirements
- NFR-01: The system should respond quickly enough to feel conversational.
- NFR-02: The product should work on low-end devices and messaging-first user behavior.
- NFR-03: Security should protect customer and merchant data.
- NFR-04: Data access must be tenant-isolated.
- NFR-05: System should be observable through logs and dashboards.

### 11. Key Decisions
- WhatsApp and Telegram are the primary channels.
- Human handoff is required for ambiguous, aggressive, or emotional cases.
- Order payment confirmation must be automatic.
- The MVP should keep onboarding simple and lightweight.
- The initial niche is fashion retail.

### 12. Acceptance Criteria Highlights
- Merchant can go from signup to live store within 30 minutes.
- Customer can search, select, pay, and receive confirmation without leaving chat.
- Payment confirmation triggers order status updates automatically.
- A complaint can be escalated to a human from within the conversation.
- Retailer can see orders, revenue, and customer segments in the dashboard.

### 13. Risks and Mitigations
- Catalog upload friction: offer guided onboarding and image-first entry.
- Trust concerns: keep human handoff and transparent confirmations.
- Platform dependence: start with one channel and design abstraction layers.
- Compliance risk: capture consent and minimize unnecessary data collection.

### 14. Release Plan
Phase 1: Core catalog, order, payment, and handoff flows.
Phase 2: Broadcasts, deeper analytics, improved customer memory, and richer merchandising tools.
Phase 3: Advanced integrations, loyalty, and scale features.
