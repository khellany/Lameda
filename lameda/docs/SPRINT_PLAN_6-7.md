# LamedaBot — Sprint 6 & 7 Plan

**Drafted:** 2026-06-12 · **Status:** Proposed (awaiting owner sign-off)
**Anchors:** `v3/product/Roadmap_Update_v3.md` (Now → Next horizon), verified code state, [[project-status]].
**Guiding principle (roadmap #1):** every item maps to a merchant revenue gain or time saving — not "build X".

---

## Where we actually are (verified 2026-06-12)

**Built & working:** conversation engine + all handlers, Telegram channel, Claude classify/respond,
OpenAI embeddings + pgvector search, Paystack payments + expiry/recovery crons, CSV import,
merchant self-service onboarding (`/onboard` + `register`), Telegram admin commands (`admin.ts`),
CRM **APIs** (`/api/crm/{orders,customers,reveal-token}`, `rotate-token`), PII encryption at rest.

**Concrete gaps (the planning target):**
1. CRM APIs exist but have **no merchant-facing UI** — only pages are landing, onboard, login, payment callback.
2. **No merchant analytics / daily digest** — no `merchant-digest` cron.
3. **Pidgin mode + business-type conversation variants** only partially wired.
4. **No handoff alert surface** — AI can trigger handoff, merchant isn't notified in a dashboard.
5. **Open security launch-blockers** — VULN-001 (service_role key in `__dbcheck.mjs`), VULN-002 (`lmd_test123`).

**Roadmap launch-readiness gate (end of "Now" horizon):** 5 pilot merchants live, ≥3 with ≥1 recovered
sale, onboarding completion >70%, zero critical bugs in prod for 7 days. Sprint 6 is scoped to *hit this gate*.

---

## Sprint 6 — "Merchant Self-Sufficiency & Launch Hardening"

**Theme:** Everything a pilot merchant needs to run the bot without the founder in the loop, plus
close the launch-blocking security items. **Outcome:** merchants self-serve daily operations →
onboarding sticks, churn risk drops, launch gate becomes reachable.

| ID | Story | Merchant outcome | Size | Depends on |
|----|-------|------------------|------|-----------|
| STORY-024 | **Merchant CRM dashboard UI** — authenticated pages over existing CRM APIs: orders list + detail, customer list, reveal-contact, search/filter/pagination. | "I can see my orders and customers without messaging the founder." | L | existing `/api/crm/*`, `(auth)/login` |
| STORY-025 | **Daily merchant digest** — `/api/cron/merchant-digest` → Telegram push: orders, revenue, top products, recovered carts. | "Every morning I know yesterday's numbers." (drives daily active habit) | M | Telegram client, orders/payments tables |
| STORY-026 | **Security launch-blockers** — remediate VULN-001 (delete/rotate service_role key, gitignore), VULN-002 (deactivate `lmd_test123`), add secret-scan to CI/pre-commit. | "My customers' data is safe." (trust + NDPR) | S | SECURITY.md |
| STORY-027 | **Handoff alert surface** — when AI triggers handoff, flag it in the dashboard + Telegram ping to merchant. | "I never miss a customer the bot couldn't help." (saves sales) | M | `handoff.ts`, STORY-024 shell |
| STORY-028 *(stretch)* | **Onboarding funnel telemetry** — track form-start → register → webhook-configured → first-message. | Measures the >70% onboarding-completion launch criterion. | S | `register` route |

**Acceptance / Definition of Done (Sprint 6)**
- A merchant logs in and sees only their own orders/customers (RLS + `merchant_id` scoping verified).
- Reveal-contact and token rotation work from the UI.
- Daily digest fires on schedule; figures reconcile against the DB.
- SECURITY.md VULN-001 & VULN-002 → `RESOLVED`; CI fails on a planted secret prefix.
- Handoff events reach the merchant within seconds.
- Zero critical bugs across a 7-day soak with pilot merchants.

**Trade-offs to decide at kickoff**
- Dashboard auth: reuse existing Supabase Auth session from `(auth)/login`, or merchant-API-key gate? (Recommend Supabase Auth — already wired in onboarding.)
- Digest channel: Telegram-only for v1 (email digest deferred to keep scope tight).

---

## Sprint 7 — "Growth Infrastructure" (aligns with roadmap Sprint 7-8)

**Theme:** Prove repeatability — give merchants the retention + acquisition loops that move MRR.
**Outcome:** more revenue per merchant (broadcasts, analytics-driven action) and cheaper growth (referrals).
**Gate it targets:** Month-6 milestone — 50 paying merchants, ₦750K MRR, referral program active.

| ID | Story | Merchant outcome | Size | Depends on |
|----|-------|------------------|------|-----------|
| STORY-029 | **Analytics dashboard** — conversion funnel, revenue trends, peak hours, recovered-cart rate. | "I can see what's working and act on it." | L | STORY-024 shell, order/conversation data |
| STORY-030 | **Broadcast campaign manager** — segment (all / past buyers / abandoned cart) + send via Telegram; rate-limited; opt-out enforced. | "I can re-engage customers and drive repeat sales." | L | NDPR opt-out infra, rate limiter |
| STORY-031 | **Customer CRM view + conversation history** — drill into a customer → full message/order timeline. | "I know each customer before I reply." | M | STORY-024, conversation store |
| STORY-032 | **Referral program** — referral codes, attribution, 1-month-free reward application. | "Happy merchants bring me free merchants." (CAC ↓) | M | billing/plan enforcement |
| STORY-033 *(stretch)* | **Number-quality monitoring + merchant directory v1** (`discover.lameda.ng`). | Protects deliverability; adds an organic acquisition surface. | M | — |

**Acceptance / Definition of Done (Sprint 7)**
- Merchant sees an accurate funnel + revenue trend for their own data only.
- A broadcast sends to a chosen segment, respects opt-out + rate limits, and reports delivery counts.
- Customer drill-down shows the full, correctly-scoped conversation + order history.
- Referral code issued → new paying merchant attributed → reward applied automatically.

**Cross-cutting (both sprints)**
- **NDPR:** broadcasts require opt-out + consent tracking; CRM data-export endpoint should land by Sprint 7.
- **Security:** run the SECURITY.md per-sprint checklist; every new route gets auth + `merchant_id` scoping + input validation.
- **Docs:** update SPRINT_LOG.md (decisions/trade-offs) and SECURITY.md at each sprint's end.

---

## Sequencing rationale

1. **Sprint 6 before 7 is non-negotiable** — Sprint 7's analytics, broadcasts, and customer drill-down
   all sit on the dashboard shell + auth from STORY-024. Building Growth Infra without the merchant UI
   shell would mean throwaway scaffolding.
2. **Security first within Sprint 6** — VULN-001/002 are launch-blockers; the roadmap makes "zero
   critical bugs / NDPR" non-negotiable. Cheap to fix now, expensive to fix post-leak.
3. **Digest is the retention hook** — a daily numbers push is the single highest-leverage habit driver
   for the launch-readiness "merchants live and generating data" criterion.
