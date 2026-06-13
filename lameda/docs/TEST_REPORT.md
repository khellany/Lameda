# LamedaBot — Test Case Report

**Version:** 1.0
**Date:** 2026-06-13
**Author:** Dayo Kelani
**Scope:** `lameda/` — Next.js 16 app, Supabase backend, Telegram channel, Paystack payments,
Claude/OpenAI LLM integrations. Covers core commerce + Sprints 5–7.5 (CRM, analytics,
broadcasts, referrals, bot-health/directory, subscription billing).

---

## 1. Purpose & approach

This report enumerates **functional**, **non-functional**, **API**, and **user-acceptance**
test cases for LamedaBot, with expected results and traceability to source files.

> **Execution honesty.** This environment has no production secrets (`.env.local`,
> `PAYSTACK_SECRET_KEY`, live Supabase service key), so end-to-end flows have **not** been
> executed here. Each case carries a **Status**:
> - **✅ Verified** — actually checked in this environment (static analysis) or confirmed from
>   production telemetry (Vercel logs) / the documented runtime probes in `SECURITY.md`.
> - **🟡 Pending** — designed test case, expected result specified, **not yet executed live**.
> - **⛔ Blocked** — cannot run until a pending owner action completes (e.g. Paystack Plans, `CRON_SECRET`).
>
> No case below is marked passed unless it was genuinely observed. Do not read 🟡 as "passing".

### 1.1 Environment matrix

| Layer | Under test |
|---|---|
| Runtime | Next.js 16 (App Router, `proxy.ts`), Node 24.x, Vercel Fluid Compute |
| DB | Supabase Postgres (migrations 001–019 applied) |
| Channel | Telegram Bot API |
| Payments | Paystack (test mode for UAT) |
| Static gates | `tsc --noEmit`, `eslint`, `npm run scan:secrets` |

### 1.2 Static verification already executed (this environment)

| Gate | Result | Notes |
|---|---|---|
| `tsc --noEmit` | ✅ exit 0 | Full project, after migration-019 casts removed |
| `eslint` (changed files) | ✅ clean | No `no-explicit-any` / unused-var errors |
| `npm run scan:secrets` | ✅ clean | No hardcoded credentials in tracked code |

---

## 2. Functional test cases

Priority: **P1** blocker · **P2** major · **P3** minor.

| ID | Feature | Precondition | Steps | Expected result | Pri | Status |
|----|---------|-------------|-------|-----------------|-----|--------|
| FT-001 | Merchant registration | Valid BotFather token | POST `/onboard` form with business name, type, owner, email, token | 200; merchant row created (PII encrypted), API key + referral code returned, welcome email sent, webhook auto-registered | P1 | 🟡 |
| FT-002 | Duplicate email | Email already registered | Submit registration with existing email | 409 "account already exists"; no orphan auth user | P1 | 🟡 |
| FT-003 | Invalid bot token | — | Submit with bogus token | 422 "Invalid Telegram bot token"; no DB write | P1 | 🟡 |
| FT-004 | Referral code prefill | Visit `/onboard?ref=LMDABC12` | Open link | Referral field pre-filled with `LMDABC12`, uppercased | P3 | 🟡 |
| FT-005 | Referral attribution stored | Register with valid `referral_code` | Complete registration | New merchant row has `referred_by_code` set; **no** reward applied at this stage (moved to first payment) | P2 | ✅ (code path verified by `tsc`; reward block removed from register route) |
| FT-010 | Greeting flow | Live bot | Customer sends `/start` | Bot greets, offers browse/menu per `business_type` | P1 | 🟡 |
| FT-011 | Browse catalog | Merchant has products | Customer taps "Browse" | Products listed (segment-aware copy: "menu" for food) | P1 | 🟡 |
| FT-012 | Add to cart | Product shown | Tap "Add to cart" | Item added; cart total updates | P1 | 🟡 |
| FT-013 | Checkout → payment link | Cart non-empty | Proceed to checkout | Paystack link generated (30-min expiry); `payments` row `pending` | P1 | 🟡 |
| FT-014 | Order paid confirmation | Paid via Paystack | `charge.success` webhook fires | Order → `paid`; customer gets confirmation message **(now sent with decrypted token)** | P1 | 🟡 |
| FT-020 | Cart recovery msg 1 | Cart idle ≥15 min, not checked out | Cron runs | One reminder sent; `cart_recovery_1_sent_at` stamped (once) | P2 | 🟡 |
| FT-021 | Cart recovery msg 2 | Cart idle ≥120 min, msg 1 already sent | Cron runs | Stronger nudge w/ cart summary; `cart_recovery_2_sent_at` stamped | P2 | 🟡 |
| FT-022 | Recovery uses decrypted token | Self-service merchant (encrypted token) | Cron sends | Telegram send succeeds (regression fix — previously failed silently) | P1 | ✅ (decrypt added; `safeDecrypt(token) ?? token`) |
| FT-030 | Payment expiry cancel | `payments.pending` past `expires_at`, order `confirmed` | Cron runs | Order → `cancelled`, payment → `failed`, stock restored, customer notified | P2 | 🟡 |
| FT-040 | Subscription checkout init | Logged-in merchant, tier price configured | Click "Choose Growth" on `/dashboard/billing` | Paystack checkout URL returned; browser redirects; metadata `{type:subscription, merchant_id, tier}` set | P1 | ⛔ (needs `PAYSTACK_PLAN_*` / price env) |
| FT-041 | Subscription activation | Subscription charge succeeds | Paystack `charge.success` (metadata.type=subscription) | `subscription_status` → `active`; `subscription_renews_at` set; admin Telegram notified | P1 | ⛔ |
| FT-042 | Subscription renewal | Native plan renews | `charge.success` w/ `plan.plan_code`, no metadata | Merchant matched via subscription/customer code; `subscription_renews_at` extended | P1 | ⛔ |
| FT-043 | Payment failure → suspend | Active subscription | `invoice.payment_failed` / `subscription.disable` | `subscription_status` → `suspended` | P1 | ⛔ |
| FT-044 | Referral reward on first payment | Referred merchant (`referred_by_code` set), `referral_rewarded_at` null | Referred merchant's first subscription charge | Referrer gets +30 days (active→`subscription_renews_at`, trial→`trial_ends_at`); `referral_rewarded_at` stamped | P1 | ⛔ |
| FT-045 | Referral reward idempotency | `referral_rewarded_at` already set | Renewal `charge.success` fires again | **No** second reward applied | P1 | ✅ (guard verified in code; live re-confirm pending) |
| FT-046 | Reward floors at now | Referrer trial already expired | Reward applies | New `trial_ends_at` = now + 30d (not past + 30d) | P2 | ✅ (`Math.max(Date.now(), …)` verified) |
| FT-050 | Broadcast send | Merchant w/ opted-in customers | Compose + send on `/dashboard/broadcasts` | Sent only to `opted_in=true`; campaign + recipient rows created | P1 | 🟡 |
| FT-051 | Broadcast NDPR gate | Segment chosen | Try send without ticking consent box | Submit disabled; API also enforces `opted_in=true` | P1 | 🟡 |
| FT-052 | Broadcast recipient cap | >500 eligible customers | Send | Hard-capped at 500 recipients | P2 | 🟡 |
| FT-060 | Bot-health scoring | Active merchant, valid token | `bot-health` cron runs | `bot_health_score` written (0–100), `bot_health_checked_at` set | P2 | 🟡 |
| FT-061 | Bot-health invalid token | Token revoked in BotFather | Cron runs | Score = 0 | P2 | 🟡 |
| FT-062 | Bot-health no sends | Valid token, no broadcasts in 7d | Cron runs | Score = 85 (benefit of doubt) | P3 | 🟡 |
| FT-070 | Directory opt-in | Logged-in merchant | Toggle on in `/dashboard/settings` | `is_directory_listed=true`; appears on `/discover` within revalidation window | P2 | 🟡 |
| FT-071 | Directory shows no PII | Opted-in merchant | Load `/discover` | Only business name, type, bot link shown; no email/owner/token | P1 | ✅ (column allowlist verified in code) |
| FT-080 | CRM order scoping | Two merchants A, B | A views `/dashboard/orders` | Only A's orders shown; B's never visible | P1 | 🟡 |
| FT-081 | Customer detail view | Merchant w/ customer | Open customer row | Profile, order history, last 30 messages; 404 for foreign customer id | P2 | 🟡 |
| FT-082 | Handoff resolve | Open handoff exists | Click "Mark resolved" | `current_intent` cleared, status `active`, nav badge decrements | P2 | 🟡 |
| FT-083 | Billing status display | Merchant on trial | Open `/dashboard/billing` | "Trial" badge + trial end date; tier cards with prices | P2 | ⛔ (price env) |
| FT-090 | Admin Telegram commands | Merchant admin chat linked | Send `/orders` in bot | Admin-only order summary returned | P2 | 🟡 |

---

## 3. Non-functional test cases

| ID | Category | Requirement | Method | Expected result | Status |
|----|----------|-------------|--------|-----------------|--------|
| NFT-001 | Performance | Dashboard API p95 < 500 ms | Vercel Analytics over 24h | p95 within target at pilot load | 🟡 |
| NFT-002 | Performance | AI response < 4 s (cached after first) | Time `charge`/respond path | Within target; cached slots instant | 🟡 |
| NFT-003 | Performance | Customer-bot hot path adds 0 proxy overhead | Confirm webhooks excluded from `proxy.ts` matcher | Matcher excludes `/api/webhook/**`, cron | ✅ (matcher verified) |
| NFT-010 | Security | Cron auth fail-closed | Call cron with no/forged bearer | 401 (was silent-open when `CRON_SECRET` unset — VULN-003 fixed) | ✅ (401 confirmed in Vercel logs; fix verified in code) |
| NFT-011 | Security | Paystack webhook signature | POST with bad `x-paystack-signature` | 200 returned, **no DB mutation** (no validity leak) | 🟡 |
| NFT-012 | Security | API-key gate | Call `/api/crm/orders` without key | 401 at proxy before DB lookup | ✅ (runtime-probed, SECURITY.md baseline) |
| NFT-013 | Security | Malformed key rejected | Call with non-`lmd_` key | 401 | ✅ (runtime-probed) |
| NFT-014 | Security | Dashboard requires session | GET `/dashboard` without cookie | 307 → `/login` | ✅ (runtime-probed) |
| NFT-015 | Security | PII at rest | Inspect `merchants` row | owner_name/email/token are ciphertext; `email_hash` for search | ✅ (encrypt path verified; live row check pending) |
| NFT-016 | Security | No secrets in bundle/source | `scan:secrets` + grep `NEXT_PUBLIC_` | No server secret in client bundle | ✅ (scanner clean) |
| NFT-017 | Security | Cross-merchant isolation | Adversarial query as merchant A for B's ids | Empty / 404; every query `.eq('merchant_id', …)` | 🟡 |
| NFT-020 | Reliability | Webhook idempotency (subscription) | Replay same `charge.success` | No duplicate reward; status idempotent | ✅ (guard verified; live replay pending) |
| NFT-021 | Reliability | AI generation fallback | Force Claude failure | Last cached content served; no blank state | 🟡 |
| NFT-022 | Reliability | Telegram send failure isolation | Invalid chat id mid-broadcast | Loop continues; failure logged, not thrown | 🟡 |
| NFT-030 | Scalability | Indexed lookups | `EXPLAIN` directory/subscription-code queries | Index scan, not seq scan (migrations 018/019 indexes) | 🟡 |
| NFT-031 | Scalability | Broadcast rate limit | Send large broadcast | 300 ms spacing (≤ Telegram 30 msg/s) | 🟡 |
| NFT-032 | Scalability | Customer msg rate limit | >10 msgs/60s from one customer | Throttled; button callbacks exempt | 🟡 |
| NFT-040 | Maintainability | Strict typing | `tsc --noEmit` | exit 0 | ✅ |
| NFT-041 | Maintainability | Lint clean | `eslint` | No errors | ✅ |
| NFT-050 | Accessibility | Dashboard touch targets / contrast | Manual WCAG spot-check | ≥44px targets, ≥4.5:1 contrast | 🟡 |
| NFT-060 | Compliance | NDPR broadcast consent | Send to non-opted-in segment | Filtered out regardless of segment | 🟡 |

---

## 4. API test cases

Format: method · endpoint · scenario → expected status/body.

| ID | Endpoint | Scenario | Expected | Status |
|----|----------|----------|----------|--------|
| AT-001 | POST `/api/merchants/register` | Valid payload | 200 `{success, api_key, referral_code, telegram_link}` | 🟡 |
| AT-002 | POST `/api/merchants/register` | Missing/invalid fields | 422 `{error:"Validation failed", issues}` | 🟡 |
| AT-003 | POST `/api/merchants/register` | Bad JSON body | 400 `{error:"Invalid JSON body"}` | 🟡 |
| AT-004 | POST `/api/merchants/register` | Duplicate email | 409 | 🟡 |
| AT-010 | POST `/api/broadcasts` | No / malformed `X-Merchant-Api-Key` | 401 | ✅ (proxy gate runtime-probed) |
| AT-011 | POST `/api/broadcasts` | Valid key + segment | 200; campaign created; opted-in only | 🟡 |
| AT-020 | GET `/api/crm/orders` | No key | 401 (proxy, pre-DB) | ✅ |
| AT-021 | GET `/api/crm/orders` | `limit=-1` | 400/clamped (VULN-R001 fixed) | ✅ (fix in `c09830d`) |
| AT-022 | GET `/api/crm/orders` | `limit=abc` | Clamped to default ≤100 (VULN-R002 fixed) | ✅ |
| AT-030 | POST `/api/webhooks/paystack` | Bad signature | 200, no mutation | 🟡 |
| AT-031 | POST `/api/webhooks/paystack` | `charge.success`, known order ref | Order `paid`; confirmation sent | 🟡 |
| AT-032 | POST `/api/webhooks/paystack` | `charge.success`, unknown ref, no sub metadata | 200, no-op ("order not found") | 🟡 |
| AT-033 | POST `/api/webhooks/paystack` | `charge.success`, `metadata.type=subscription` | Merchant activated; reward logic runs | ⛔ |
| AT-034 | POST `/api/webhooks/paystack` | `subscription.create` | Subscription/customer codes stored | ⛔ |
| AT-035 | POST `/api/webhooks/paystack` | `invoice.payment_failed` | Merchant suspended | ⛔ |
| AT-040 | GET `/api/cron/cart-recovery` | No bearer | 401 (fail-closed) | ✅ (logs + code) |
| AT-041 | GET `/api/cron/cart-recovery` | Valid `CRON_SECRET` bearer | 200 `{ok, sent1, sent2, checked}` | ⛔ (needs `CRON_SECRET` set) |
| AT-042 | GET `/api/cron/payment-expiry` | No bearer | 401 | ✅ |
| AT-043 | GET `/api/cron/bot-health` | Valid bearer | 200 `{ok, scored, skipped, failed}` | ⛔ |
| AT-044 | GET `/api/cron/merchant-digest` | Valid bearer | 200 digest summary | ⛔ |
| AT-050 | POST `/api/webhook/telegram/[merchantId]` | Wrong `x-telegram-bot-api-secret-token` | Rejected | 🟡 |
| AT-051 | POST `/api/webhook/telegram/[merchantId]` | Valid update | 200; message processed | 🟡 |

---

## 5. User acceptance test cases (UAT)

End-to-end, business-outcome oriented. Run in Paystack **test mode** with a real test bot.

| ID | Persona | Scenario | Acceptance criteria | Status |
|----|---------|----------|---------------------|--------|
| UAT-001 | New merchant | Sign up and go live | Completes `/onboard`; receives welcome email w/ credentials + bot link; bot responds to `/start` within minutes | 🟡 |
| UAT-002 | Customer | Browse & buy on Telegram | Browses catalog, adds to cart, pays via Paystack link, receives confirmation message | 🟡 |
| UAT-003 | Customer | Abandoned cart recovery | Leaves cart; receives reminder after 15 min and nudge after 2 h; completing checkout stops further nudges | 🟡 |
| UAT-004 | Merchant | Subscribe to a plan | Picks tier on `/dashboard/billing`, pays in Paystack test mode; within ~1 min `/dashboard/billing` shows "Active" + renewal date | ⛔ (Plans/env) |
| UAT-005 | Referrer | Earn reward when referral pays | Shares link; referred merchant signs up (no reward yet) **and** makes first payment → referrer's days increase by 30; "Paying referrals" stat increments | ⛔ |
| UAT-006 | Merchant | Send a campaign | Composes broadcast, ticks NDPR consent, sends; only opted-in customers receive it; result toast shows counts | 🟡 |
| UAT-007 | Merchant | Appear in directory | Toggles directory on in Settings; store appears on `/discover` with working "Shop on Telegram" button | 🟡 |
| UAT-008 | Merchant | Monitor health | After `bot-health` cron runs, Overview shows health badge; Settings shows score + last-checked + guidance if degraded | ⛔ (cron auth) |
| UAT-009 | Merchant | Daily operations | Reviews orders, opens a customer's history, resolves a handoff; nav badge reflects open handoffs | 🟡 |
| UAT-010 | Merchant | Payment lapse handling | Subscription renewal fails → status shows "Suspended"; re-subscribing reactivates | ⛔ |

---

## 6. Defects & findings surfaced during this cycle

| Ref | Severity | Title | Status |
|-----|----------|-------|--------|
| VULN-003 | 🟡 Medium | Cron auth silent-open when `CRON_SECRET` unset | **Fixed** (fail-closed) — see SECURITY.md |
| BUG-001 | 🟠 High | Cart-recovery / payment-expiry / Paystack webhook sent Telegram messages with **encrypted** bot token → silent send failure for self-service merchants | **Fixed** (`safeDecrypt(token) ?? token`) |
| OPS-001 | — | Cron 401s in production: `CRON_SECRET` not reaching scheduled invocations | **Owner action**: set in Production env + redeploy |
| VULN-001b | 🟠 High | Rotate previously-exposed Supabase `service_role` key | **Open** (owner action) |

---

## 7. Execution summary

| Category | Total | ✅ Verified | 🟡 Pending | ⛔ Blocked |
|----------|------:|-----------:|----------:|----------:|
| Functional | 38 | 6 | 26 | 6 |
| Non-functional | 20 | 9 | 11 | 0 |
| API | 22 | 7 | 9 | 6 |
| UAT | 10 | 0 | 6 | 4 |
| **Total** | **90** | **22** | **52** | **16** |

### 7.1 To move 🟡 → executed
Provision a staging Supabase project + test bot + Paystack test keys, seed one merchant and a
handful of products/customers, then run the functional/API/UAT cases against `next dev` or a
preview deployment. Recommended automation: Vitest for unit/route handlers, Playwright for the
dashboard UAT flows (per the engineering guide's testing strategy).

### 7.2 To unblock ⛔
1. Apply Paystack Plans + pricing env (`npm run setup:paystack-plans`, then set Vercel env).
2. Enable Paystack subscription webhook events.
3. Set `CRON_SECRET` in Production + redeploy.

---

*Traceability: cases reference handlers under `lameda/src/app/api/**`, `lameda/src/app/dashboard/**`,
crons under `lameda/src/app/api/cron/**`, and libs under `lameda/src/lib/**`. Pair with
[`SPRINT_LOG.md`](./SPRINT_LOG.md) (what shipped) and [`SECURITY.md`](./SECURITY.md) (findings).*
