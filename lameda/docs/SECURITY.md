# LamedaBot — Security Vulnerability Register

> Living document. Every security finding — open or resolved — is logged here for
> future reference and audit. Update it whenever a vulnerability is discovered,
> remediated, or re-classified. Reviewed at the end of every sprint.

**Last updated:** 2026-06-13 (VULN-001b resolved — service_role key rotated)
**Owner:** Dayo Kelani
**Scope:** `lameda/` Next.js app, Supabase backend, LLM integrations (Anthropic, OpenAI)

---

## Severity scale

| Level | Meaning |
|---|---|
| 🔴 Critical | Exploitable now, full data/credential exposure or RCE. Fix immediately, block release. |
| 🟠 High | Credential exposure or auth bypass possible under realistic conditions. Fix before next deploy. |
| 🟡 Medium | Limited blast radius, requires preconditions. Fix before production / next sprint. |
| 🟢 Low | Hardening / defence-in-depth. Schedule opportunistically. |

## Status legend

`OPEN` · `IN PROGRESS` · `RESOLVED` · `ACCEPTED RISK` · `WONT FIX`

---

## Open findings

_None._ (All findings resolved as of 2026-06-13. See Resolved findings below.)

---

## Resolved findings

| ID | Severity | Title | Resolved | Commit |
|----|----------|-------|----------|--------|
| VULN-001 | 🟠 High | Hardcoded service_role key in `__dbcheck.mjs` (in-repo) | 2026-06-12 | Sprint 6 / STORY-026 |
| VULN-001b | 🟠 High | Rotate exposed Supabase `service_role` key | 2026-06-13 | Owner action (key rotated) |
| VULN-002 | 🟡 Medium | Guessable test-merchant API key (`lmd_test123`) | 2026-06-12 | migration `014` |
| VULN-R001 | 🟡 Medium | CRM orders pagination — `limit=-1` → HTTP 500 | 2026-06-12 | `c09830d` |
| VULN-R002 | 🟡 Medium | CRM orders pagination — `limit=abc` (NaN) bypassed 100-row cap | 2026-06-12 | `c09830d` |
| VULN-003 | 🟡 Medium | Cron auth silent-open when `CRON_SECRET` unset (`undefined !== undefined`) | 2026-06-13 | STORY-034 |

### VULN-001b — Rotate the previously-exposed service_role key
- **Resolution (2026-06-13):** owner rotated the Supabase `service_role` key (Supabase dashboard →
  Settings → API → roll key) and updated `SUPABASE_SERVICE_ROLE_KEY` in Vercel + `.env.local`.
  The previously-exposed key (which had existed in plaintext on disk) is now invalidated.
- **Residual:** none. Confirm the app still authenticates after the next deploy.

### VULN-003 — Cron auth silent-open when `CRON_SECRET` is unset
- **File:** `src/app/api/cron/cart-recovery/route.ts`, `src/app/api/cron/payment-expiry/route.ts`
- **Detail:** The gate `if (secret !== process.env.CRON_SECRET)` evaluates `undefined !== undefined`
  → `false` when `CRON_SECRET` is unset, so the cron would run **unauthenticated**. (Discovered
  while diagnosing the *opposite* production symptom: a 401 when the env var *is* set but the
  bearer doesn't reach the function — see SPRINT_LOG STORY-034 cron section.)
- **Fix:** Fail-closed `if (!expected || secret !== expected)` — matches the `merchant-digest`
  and `bot-health` crons. Now rejects when the secret is missing.
- **Status:** Fixed. Operational follow-up: ensure `CRON_SECRET` is set in Vercel **Production**
  env and the project is redeployed so Vercel injects `Authorization: Bearer <CRON_SECRET>`.

### VULN-001 — Hardcoded service_role key in `__dbcheck.mjs` (in-repo portion)
- **Fix:** Rewrote `lameda/__dbcheck.mjs` to read `process.env.{NEXT_PUBLIC_SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY}`
  (run via `node --env-file=.env.local __dbcheck.mjs`). Added `__dbcheck.mjs` + `*.local.mjs` to `.gitignore`.
  Added a repo secret scanner (`scripts/scan-secrets.mjs`, `npm run scan:secrets`) gated in CI
  (`.github/workflows/security.yml`).
- **Residual:** key rotation tracked separately as **VULN-001b** (owner action — the key was on disk).

### VULN-002 — Guessable test-merchant API key
- **Fix:** Migration `014_deactivate_test_merchant.sql` sets `is_active = false` where `api_key = 'lmd_test123'`.
  `resolveMerchantFromApiKey()` filters on `is_active`, so the key can no longer authenticate.
- **Apply:** `supabase db push` (or run the migration against the project). Idempotent.

### VULN-R001 / R002 — CRM orders pagination input validation
- **File:** `src/app/api/crm/orders/route.ts`
- **Detail:** `Math.min(parseInt(limit), 100)` let `limit=-1` reach Supabase `.range(0, -2)`
  (500 error) and `limit=abc` → `NaN` ran the query with no row cap.
- **Fix:** `Math.max(1, Math.min(parseInt(...) || 50, 100))` for limit; `Math.max(0, … || 0)` for offset.
- **Status:** Fixed and UAT-confirmed.

---

## Verified-secure controls (audit baseline — 2026-06-12)

These were probed adversarially and held. Re-verify if the related code changes.

- **Central auth gate (`src/proxy.ts`, Next.js 16 proxy):** fail-closed, defense-in-depth.
  `/dashboard/**` redirects to `/login` without a session cookie; `/api/crm/**`,
  `/api/products/embed-all`, `/api/merchants/rotate-token` return 401 without a well-formed
  `X-Merchant-Api-Key`. Optimistic (no DB) — authoritative checks remain in routes/layout.
  Channel webhooks/cron are intentionally excluded (own secret/HMAC auth). Runtime-verified:
  401 on missing/malformed key, 307→/login on no cookie, 200 on unmatched public routes.
- **LLM / secret handling:** `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  are read only from `process.env.*`, server-side, never `NEXT_PUBLIC_`. No hardcoded keys in `src/`.
- **SQL injection (CRM orders `status` param):** blocked by `VALID_STATUSES.includes()` allowlist
  before the query is built.
- **Cross-merchant isolation:** every query scopes `.eq('merchant_id', merchant.id)`.
- **Auth gates:** `X-Merchant-Api-Key` validated against `merchants.api_key` + `is_active`,
  with `lmd_` prefix pre-check before any DB lookup.
- **PII at rest:** owner name, email, bot token encrypted (`encryptPii`); email searchable via
  `email_hash` (`hashForSearch`); delivery address decrypted transparently only in CRM responses.

---

## Auditing checklist (run each sprint)

- [ ] Repo-wide grep for secret prefixes: `sk-ant-`, `sk-proj-`, `eyJhbGciOiJ`, `service_role`.
- [ ] Confirm no new file outside `.env*` carries a literal credential (`git ls-files` + grep).
- [ ] Confirm new API routes enforce auth + merchant scoping + input validation.
- [ ] Confirm new `NEXT_PUBLIC_` vars contain only non-secret values.
- [ ] Re-run the verified-secure probes for any endpoint touched this sprint.
