# Business Model Canvas
## Lameda - v2
### Version: 2.0 | Date: May 2026

---

## Customer Segments

### Primary Segment
Small Nigerian fashion retailers operating on WhatsApp:
- Founders or solo operators managing all sales personally.
- Under 100 SKUs at MVP entry point.
- 20 or more daily customer conversations.
- Average order value above N50,000.
- Revenue leakage from slow manual response is measurable and painful.

### Secondary Segments (Post-MVP)
- Beauty and cosmetics retailers.
- Accessories and thrift fashion.
- Home decor and lifestyle SMEs.
- Food and grocery merchants.

### Buyer Personas
- Founder or owner: primary decision-maker, pays the subscription.
- Operations manager: manages order flow and customer responses.
- Sales lead: handles customer conversations and conversion.

---

## Value Proposition

### Core Value Statement
Turn WhatsApp into a 24/7 AI-powered sales assistant that answers product inquiries, guides buyers through checkout, confirms payment automatically, and recovers lost sales while the merchant focuses on fulfilment.

### Quantified Value
- Eliminate 3 to 4 lost customers per day from slow manual response.
- Reduce manual messaging workload by 30%.
- Increase inquiry-to-order conversion by 20%.
- Recover at least one abandoned sale per merchant per day.
- Allow a solo founder to appear like a team of three.

### Brand Promise
The customer always sees the merchant's branded assistant. Lameda operates as invisible infrastructure. Merchants keep their identity; they gain automation.

---

## Channels

- Founder-led direct outreach to fashion retailers and WhatsApp commerce communities.
- Instagram and WhatsApp community groups where target merchants congregate.
- Referral loops from pilot merchants to peers (incentivised in Phase 2).
- Demo videos showing product discovery, image search, and payment - shareable on social.
- LinkedIn content targeting SME founders and e-commerce operators.
- Lightweight onboarding promise: live in under 30 minutes.

---

## Customer Relationships

| Stage | Relationship Type |
|---|---|
| Discovery | Founder-led demos and social proof |
| Trial (Day 1-14) | Guided onboarding with hands-on support |
| Early paying (Month 1-3) | Done-for-you catalog migration, weekly check-ins |
| Mature (Month 4+) | Self-service dashboard, in-product support |
| At-risk | Proactive churn alerts and intervention |

---

## Revenue Streams

### Primary: Monthly SaaS Subscription

| Plan | Price | Conversation Limit | Key Features |
|---|---|---|---|
| Starter | N10,000/mo | 500 conversations/month | 1 WhatsApp number, product catalog, order capture, Paystack, basic dashboard |
| Growth | N15,000/mo | 2,000 conversations/month | Everything in Starter + broadcasts, segmentation, abandoned cart recovery, analytics |
| Pro | N25,000/mo | Unlimited conversations + API access | Everything in Growth + human handoff queue, multi-agent, CLIP image match, priority support |

### Secondary Revenue Streams
- Annual plans at 20% discount (improves cash flow and reduces churn).
- Premium onboarding package: N25,000 one-time for done-for-you catalog setup.
- Future: usage-based overages above conversation limits.
- Future: transaction-based fee (0.5-1%) on orders processed above a volume threshold.
- Future: API access tier for developers building on Lameda.

---

## Key Activities

- Product development (conversational flows, AI tuning, dashboard, API).
- Merchant onboarding and success management.
- AI workflow tuning (Pidgin NLP, CLIP model improvements, confidence calibration).
- Sales and pilot management.
- Compliance monitoring (NDPR, WhatsApp Business Policy).
- BSP relationship management (Termii primary, Infobip backup).
- Data flywheel: merchant catalog data improves product matching over time.

---

## Key Resources

### Technology
- Conversational workflow engine (Supabase Edge Functions + Claude AI).
- CLIP image matching service (pgvector + ivfflat index).
- WhatsApp Cloud API integration via Termii BSP.
- Paystack payment integration with webhook reconciliation.
- Next.js merchant dashboard (Vercel Edge).
- Supabase for multi-tenant data, auth, and storage.

### Data Assets
- Nigerian fashion product catalog data (training and matching).
- Pidgin NLP training corpus (proprietary over time).
- Merchant workflow templates by vertical.

### Relationships
- 3-5 pilot merchants with active feedback loops.
- Termii BSP partnership for WhatsApp access.
- Paystack integration partner status.

---

## Key Partners

| Partner | Role | Dependency Level |
|---|---|---|
| Meta (WhatsApp Cloud API) | Core messaging channel | Critical |
| Termii BSP | WhatsApp Business API access | High |
| Paystack | Card payment processing | Critical |
| Supabase | Database, auth, storage, vector search | High |
| Vercel | Frontend hosting and edge functions | Medium |
| Anthropic (Claude) | AI intent classification and response | High |
| Infobip | BSP failover and backup routing | Medium |

---

## Unfair Advantage

These are assets that competitors cannot easily replicate:

1. **Pidgin NLP Training Data** - Lameda accumulates real Nigerian Pidgin commerce conversations from live merchant interactions. This corpus is not publicly available and takes months to build with real context.

2. **WhatsApp-Native UX** - The product is designed exclusively for WhatsApp commerce workflows, not adapted from a web-first or email-first tool. The UX, message flow design, and button sequences are built for how Nigerians actually chat to buy.

3. **Termii BSP Partnership** - Direct BSP relationship gives Lameda access to WhatsApp Business API at favourable rates and with Nigerian-specific routing quality, ahead of foreign competitors who face BSP onboarding friction.

4. **Nigerian Fashion Catalog Data** - Merchant product catalogs, images, categories, price points, and variant patterns in the Nigerian fashion context create a richer embedding corpus that improves CLIP matching accuracy specifically for ankara, Aso-oke, sneakers, and ready-to-wear categories that generic CLIP models do not handle well.

5. **Local Payment Depth** - Deep integration with both Paystack hosted checkout and bank transfer virtual accounts covers the full payment reality of Nigerian buyers, including those who prefer bank transfer over card.

---

## Cost Structure

### Cost Categories

| Category | Share of COGS (Early Stage) | Notes |
|---|---|---|
| Messaging (BSP fees via Termii) | ~51% | Dominant COGS driver. WhatsApp charges per conversation window. Reduces as scale negotiates lower rates. |
| AI API usage (Claude Haiku + Sonnet) | ~18% | Haiku for triage (cheap), Sonnet for complex flows. Mix managed by confidence routing. |
| Supabase (DB, storage, edge functions) | ~12% | Scales with data volume and function invocations. |
| Vercel (hosting, edge) | ~5% | Minimal at MVP scale. |
| Paystack (payment processing) | ~4% | Only on revenue-generating transactions. |
| Other tooling (Sentry, Resend, monitoring) | ~10% | Fixed or near-fixed at MVP scale. |

### Operating Cost Categories
- Engineering salaries (founders + early hires).
- Customer success and support.
- Sales and marketing (pilot acquisition, content, demos).
- Legal and compliance (NDPR DPA, company filings).
- Infrastructure scaling.

### Unit Economics Targets

| Metric | Target |
|---|---|
| CAC (Customer Acquisition Cost) | N50,000 to N90,000 per merchant |
| Average Contract Value (ACV) | N150,000/year (Growth plan, monthly) |
| Average Merchant Lifetime | 18 months |
| LTV (Lifetime Value) | N270,000 at 18-month lifetime (Growth plan) |
| LTV:CAC Ratio | 3x to 5x |
| CAC Payback Period | 4 to 6 months |
| Gross Margin Target (Mature) | 70%+ after BSP costs at scale |

---

## Strategic Assumptions

- The pain of lost sales in chat is recurring, measurable, and motivating enough to sustain a monthly subscription.
- Merchants will accept guided onboarding if the promise is "live in 30 minutes."
- Product catalog upload can be simplified to image-first entry and CSV for early adopters.
- Nigerian buyers trust WhatsApp as a commerce channel and will complete payment through it.
- Pidgin-aware AI is a material differentiator - merchants whose customers chat in Pidgin will convert better.
- BSP pricing with Termii remains stable enough to maintain margins through early scale.
- WhatsApp Business Policy does not restrict automated commerce flows in the Nigerian context.
