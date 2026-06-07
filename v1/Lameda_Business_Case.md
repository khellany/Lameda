# Lameda Business Case
## WhatsApp and Telegram Conversational Commerce for Nigerian SMEs

**Version:** 1.0  
**Date:** May 2026  
**Prepared for:** Founder, partners, and potential investors

---

## 1. Executive Summary

Lameda is a conversational commerce platform that helps Nigerian SMEs, starting with fashion retailers, sell and support customers inside WhatsApp and Telegram. The product automates product discovery, order capture, payment collection, customer support, complaint handling, and customer follow-up.

The business case is strong because the problem is recurring, measurable, and expensive. In early discovery, pilot retailers reported around 20 customer chats per day, around 50 orders per month, average order values above ₦50,000, and a loss of 3 to 4 customers daily due to slow or manual handling. Retailers also expressed willingness to pay ₦10,000 to ₦15,000 per month for a tool that helps them manage customers and guide them to payment.

Lameda is attractive as a business because it combines:
- a large SME market,
- a clear ROI story,
- subscription revenue,
- low initial build cost,
- strong expansion potential,
- and acquisition optionality.

---

## 2. Problem Statement

Many SMEs sell through messaging channels, especially WhatsApp, but they manage customer interactions manually. This creates several problems:

- delayed replies,
- missed sales,
- confusion around availability,
- inefficient payment follow-up,
- poor complaint tracking,
- and customer dissatisfaction.

For fashion retailers, the problem is even sharper because product queries are repetitive and time-sensitive. Customers want to know what is available, which sizes exist, what the price is, whether the item is still in stock, and how to pay quickly. When the merchant is busy, slow response means lost revenue.

---

## 3. Customer Validation Findings

The discovery work points to a strong market signal.

### Pilot retailer profile
- 5 pilot retailers identified
- Mainly fashion retail
- Under 100 products to start
- Nationwide delivery
- Heavy use of WhatsApp and social media

### Operating reality
- Around 20 chats per day
- Around 50 orders per month
- Average order value above ₦50,000
- 3 to 4 lost customers per day
- Manual handling across sales, support, and operations

### Adoption indicators
- Willingness to pay confirmed
- Preferred pricing range: ₦10,000 to ₦15,000 monthly
- No setup fee preferred
- 14-day free trial preferred
- Comfortable with dashboards and automation
- Less comfortable with spreadsheets, which means onboarding must be simple

---

## 4. Opportunity

The opportunity sits at the intersection of commerce, customer support, and automation.

### Why this market is attractive
- SMEs already use messaging as their primary sales channel
- Merchants need a low-cost way to scale conversations
- Customers prefer fast replies inside familiar apps
- Commerce is highly repetitive and rules-based, which makes it suitable for automation
- Revenue leakage from missed messages is easy to understand and easy to quantify

### Initial beachhead
Fashion retailers in Nigeria.

### Expansion paths
- beauty and cosmetics,
- electronics,
- pharmacies,
- food,
- home decor,
- service businesses.

---

## 5. Product Concept

Lameda is not just a chatbot. It is a commerce operating layer.

### What it does
- lets merchants upload or share product catalogs,
- helps customers search by text or image,
- answers product and pricing questions,
- collects delivery information,
- sends payment links,
- confirms payment automatically,
- creates and tracks orders,
- handles complaints,
- sends follow-up nudges,
- and supports customer segmentation and promotions.

### Channels
- WhatsApp
- Telegram

### Core design principle
The customer sees the merchant's branded assistant, not Lameda as a separate platform. Lameda operates as invisible infrastructure.

---

## 6. Target Customer

### Primary customer
Small fashion retailers in Nigeria who:
- receive many customer inquiries daily,
- sell mostly through WhatsApp and social media,
- have product catalogs under 100 items at launch,
- and want to reduce missed sales and manual work.

### Economic buyer
- founder or owner,
- operations manager,
- sales manager,
- customer service lead.

### End users
- customers buying through chat,
- merchant staff managing orders and support.

---

## 7. Value Proposition

> Turn WhatsApp into a 24/7 AI-powered sales assistant that answers customer inquiries, guides buyers to payment, and helps merchants recover lost sales.

### Merchant benefits
- faster response times,
- higher conversion rates,
- lower manual workload,
- structured order handling,
- better customer satisfaction,
- better retention,
- and better visibility into customer activity.

### Customer benefits
- quick answers,
- easier product discovery,
- smoother checkout,
- less back-and-forth,
- better order tracking,
- and clearer complaint handling.

---

## 8. Revenue Model

### Primary revenue stream
Monthly SaaS subscription.

### Pricing hypothesis
- ₦10,000 to ₦15,000 per month for the early market.

### Secondary revenue streams
- annual plans at a discount,
- premium onboarding,
- future transaction fees,
- future integrations,
- future add-on automation modules.

### Trial model
- 14-day free trial
- no onboarding fee
- paid subscription starts after trial

This model fits the customer willingness-to-pay signal gathered during discovery.

---

## 9. Cost Structure

### Main operating costs
- Vercel for frontend hosting,
- Supabase for database, auth, and storage,
- Pinecone or pgvector for vector search,
- Resend for transactional email,
- AI API usage,
- messaging platform costs,
- payment provider costs,
- support,
- marketing,
- monitoring,
- and founder/team compensation.

### Notes on architecture choice
For MVP, Supabase with pgvector can be cheaper and simpler than a dedicated vector database. Pinecone can be introduced later if scale demands it.

### Why these costs matter
They determine:
- monthly burn,
- break-even point,
- pricing floor,
- and gross margin potential.

---

## 10. Unit Economics

A simple break-even example:

If monthly operating expenses are ₦225,000 and the average subscription is ₦12,500, then the business needs about 18 paying merchants to cover recurring costs.

That is a very manageable early-stage target.

### Early economics logic
- high average order value,
- frequent missed-sales problem,
- monthly recurring revenue,
- low cost to serve after automation,
- and strong upside if merchant count grows.

---

## 11. Business Model Canvas Summary

### Customer Segments
- fashion retailers,
- later, other SMEs selling through chat.

### Value Proposition
- automate sales and support in chat,
- recover lost sales,
- reduce manual workload.

### Channels
- direct outreach,
- WhatsApp groups,
- Instagram,
- word of mouth,
- pilot merchant referrals.

### Customer Relationships
- 14-day free trial,
- self-service onboarding,
- guided onboarding,
- done-for-you setup for early customers.

### Revenue Streams
- monthly subscriptions,
- annual subscriptions,
- future add-ons.

### Key Resources
- messaging integrations,
- AI layer,
- product catalog system,
- database and auth,
- pilot customers,
- founder execution.

### Key Activities
- product development,
- onboarding,
- support,
- sales,
- customer feedback loops,
- workflow improvement.

### Key Partners
- Meta WhatsApp Business Platform,
- Telegram,
- Paystack,
- Monnify,
- cloud hosting providers,
- delivery partners.

### Cost Structure
- cloud and infrastructure,
- AI usage,
- messaging,
- support,
- marketing,
- software tools.

---

## 12. Risks

### Product risk
The onboarding flow could be too hard if catalog upload is not simple.

### Trust risk
Merchants may hesitate to let automation handle sales and complaints.

### Dependency risk
The product depends on external platform policies for WhatsApp and payments.

### Operational risk
Payment settlement design must be carefully handled if Lameda holds funds before disbursement.

### AI risk
The bot must not over-automate ambiguous or emotional cases.

---

## 13. Risk Mitigation

- keep the MVP narrow,
- support human handoff,
- keep onboarding simple,
- start with a small pilot group,
- use a guided setup flow,
- use rule-based flows with AI support,
- collect merchant feedback weekly,
- and avoid overbuilding.

---

## 14. Execution Plan

### Phase 1: Validate and design
- confirm workflows,
- finalize product scope,
- prepare wireframes,
- define data model,
- define pricing.

### Phase 2: Build MVP
- merchant onboarding,
- catalog upload,
- WhatsApp/Telegram bot,
- order capture,
- payment integration,
- dashboard,
- human handoff,
- basic analytics.

### Phase 3: Pilot
- onboard 3 to 5 retailers,
- measure conversions,
- improve onboarding,
- validate willingness to pay,
- refine message flows.

### Phase 4: Scale
- improve automation,
- expand to more merchants,
- add segments,
- add broadcast and retention tools,
- expand beyond fashion.

---

## 15. Success Metrics

### Merchant metrics
- faster response times,
- fewer lost sales,
- more paid orders,
- lower support workload,
- higher repeat sales.

### Business metrics
- monthly recurring revenue,
- churn,
- trial conversion rate,
- cost to serve,
- gross margin,
- customer acquisition cost,
- customer lifetime value.

### Pilot success targets
- 50% faster response times,
- 20% higher conversion,
- 30% lower support workload,
- measurable recovery of lost sales,
- strong willingness to continue after trial.

---

## 16. Strategic Outlook

If executed well, Lameda can evolve from a simple WhatsApp sales assistant into a broader commerce operating system for SMEs.

### Future product direction
- customer segmentation,
- abandoned cart recovery,
- repeat purchase nudges,
- promotions and broadcast campaigns,
- complaint ticketing,
- testimonials,
- analytics,
- multi-agent support,
- richer integrations with stores and logistics.

### Strategic value
The platform becomes more valuable as it accumulates:
- transaction data,
- customer behavior data,
- merchant workflows,
- and operational intelligence.

That creates defensibility and opens acquisition opportunities later.

---

## 17. Recommendation

Proceed with the MVP.

The evidence so far suggests that:
- the pain is real,
- the target customers are accessible,
- the pricing is acceptable,
- the workflow is well understood,
- and the solution can be built leanly.

The strongest path is to:
1. build the WhatsApp-first MVP,
2. keep the scope tight,
3. onboard a few pilot merchants,
4. prove value quickly,
5. and then expand.

---

## 18. Conclusion

Lameda is a credible and commercially attractive business because it solves a painful, high-frequency problem in a market that already behaves conversationally. The business is small enough to launch lean, but large enough to scale into a meaningful SaaS platform.

If the MVP proves that merchants can recover sales and reduce manual work through chat automation, the business has strong long-term potential.
