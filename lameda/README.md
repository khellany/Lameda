# Lameda

**Multi-tenant AI commerce bot platform. Telegram-first.**

Lameda lets merchants connect a Telegram bot to a hosted storefront in minutes. Customers browse products, place orders, and pay — all inside Telegram. Merchants manage everything from a CRM dashboard.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL + Auth + Realtime) |
| ORM | Supabase JS SDK + generated types |
| AI | Anthropic Claude (intent classification, response generation) |
| Embeddings | OpenAI (product semantic search via pgvector) |
| Payments | Paystack |
| Email | Resend |
| Logging | Pino (structured JSON in production) |
| Job Queue | pg-boss |
| Deployment | Vercel (Node.js 24) |

---

## Project Structure

```
lameda/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/                    # Merchant CRM login page
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   └── merchants/
│   │   │   │       └── resend-welcome/   # Admin: reset password + resend onboarding email
│   │   │   ├── crm/
│   │   │   │   ├── customers/            # Paginated customer list (PII decrypted)
│   │   │   │   ├── orders/               # Paginated order list (delivery address decrypted)
│   │   │   │   └── reveal-token/         # Audit-gated bot token reveal (POST, rate-limited)
│   │   │   ├── cron/
│   │   │   │   ├── cart-recovery/        # Abandoned cart nudge messages
│   │   │   │   └── payment-expiry/       # Expire unpaid Paystack links, restore stock
│   │   │   ├── health/                   # Liveness + DB connectivity check
│   │   │   ├── merchants/
│   │   │   │   ├── register/             # Self-service merchant onboarding
│   │   │   │   └── rotate-token/         # Telegram bot token rotation
│   │   │   ├── products/
│   │   │   │   ├── [productId]/embed/    # Embed single product (POST)
│   │   │   │   ├── embed-all/            # Bulk embed entire catalogue (POST)
│   │   │   │   └── import/               # CSV product import (POST)
│   │   │   ├── test/
│   │   │   │   └── payment-link/         # Dev-only: generate short-lived payment link
│   │   │   ├── webhook/
│   │   │   │   ├── telegram/[merchantId]/  # Telegram update receiver (per-merchant)
│   │   │   │   └── whatsapp/             # WhatsApp webhook (future — Termii)
│   │   │   └── webhooks/
│   │   │       ├── order-delivered/      # Supabase DB webhook → Telegram delivery confirm
│   │   │       └── paystack/             # Paystack charge.success handler
│   │   ├── onboard/                      # Self-service merchant registration form
│   │   ├── payment/callback/             # Paystack payment redirect handler
│   │   └── page.tsx                      # Landing page
│   ├── lib/
│   │   ├── ai/                           # Claude client, classify, embed, respond
│   │   ├── conversation/
│   │   │   ├── stateMachine.ts           # Intent → handler routing
│   │   │   ├── types.ts                  # ConversationState, Cart types
│   │   │   └── handlers/                 # One file per intent (see below)
│   │   ├── crm/
│   │   │   └── auth.ts                   # resolveMerchantFromApiKey, getCallerIp
│   │   ├── crypto/
│   │   │   ├── pii.ts                    # AES-256-GCM field encryption / decryption
│   │   │   └── hash.ts                   # HMAC-SHA256 search hashing
│   │   ├── email/
│   │   │   ├── client.ts                 # Resend singleton + FROM_ADDRESS
│   │   │   └── templates/
│   │   │       └── merchant-welcome.ts   # Onboarding email (HTML + plain text)
│   │   ├── merchant/config.ts            # BusinessType enum + merchant config helpers
│   │   ├── payments/paystack.ts          # Payment initiation + HMAC-SHA512 verification
│   │   ├── products/search.ts            # pgvector semantic search
│   │   ├── supabase/
│   │   │   ├── client.ts                 # Browser Supabase client (anon key)
│   │   │   └── server.ts                 # Server client + admin (service role) client
│   │   ├── telegram/                     # Telegram client, webhook registration, verify
│   │   ├── utils/
│   │   │   ├── logger.ts                 # Pino logger (PII redact config)
│   │   │   └── rateLimit.ts              # DB-backed rate limiting (serverless-safe)
│   │   └── whatsapp/                     # WhatsApp/Termii client + verify (future)
│   └── types/
│       └── database.ts                   # Auto-generated Supabase types
├── supabase/
│   └── migrations/                       # Versioned SQL migrations (001–013)
├── vercel.json                           # Cron schedule + build config
└── .env.local.example                    # Env var template — copy to .env.local
```

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in values for local development.
In production, set all variables in **Vercel → Project → Settings → Environment Variables**.

### Supabase

| Variable | Side | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Anon key — safe in browser (RLS enforces access) |
| `SUPABASE_URL` | Server only | Runtime alias of `NEXT_PUBLIC_SUPABASE_URL`. Required because `NEXT_PUBLIC_` vars are baked at build time and may be undefined at runtime in serverless functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Bypasses RLS — never expose to client |

### Telegram

| Variable | Description |
|---|---|
| `TELEGRAM_WEBHOOK_SECRET` | Random string used to sign and verify Telegram webhook requests. Set the same value in `vercel.json` and your bot setup script |

### AI

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key — intent classification and response generation |
| `OPENAI_API_KEY` | OpenAI key — product embedding for semantic search (pgvector) |

### Payments

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack public key — safe in client bundle (payment initialisation) |
| `PAYSTACK_SECRET_KEY` | Paystack secret key — server only (payment verification, refunds) |
| `PAYSTACK_WEBHOOK_SECRET` | HMAC-SHA512 secret for verifying Paystack webhook payloads |

### Email

| Variable | Default | Description |
|---|---|---|
| `RESEND_API_KEY` | — | Resend API key — required for all transactional email |
| `EMAIL_FROM` | `Lameda <hello@lameda.ng>` | Resend `from` address. Domain must be verified in Resend. Use `Lameda <onboarding@resend.dev>` for testing without domain verification |

### Security & Admin

| Variable | Description |
|---|---|
| `ADMIN_SECRET` | Protects admin-only API endpoints via `x-admin-secret` header |
| `CRON_SECRET` | Protects cron endpoints (`/api/cron/*`) and the test payment link endpoint |
| `WEBHOOK_SECRET` | Protects the Supabase Database Webhook endpoint (`/api/webhooks/order-delivered`) — set the same value in the Supabase webhook config |

### App

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `''` | Full origin URL e.g. `https://lameda.vercel.app`. Used in webhook registration and email links |
| `NEXT_PUBLIC_APP_NAME` | — | Display name (optional) |

### Legacy (technical debt — to be retired)

| Variable | Description |
|---|---|
| `MERCHANT_API_KEY` | Shared API key used by `/api/products/embed-all` and `/api/products/[productId]/embed`. To be replaced with per-merchant `X-Merchant-Api-Key` once all merchants are on self-service onboarding |

### Generating secrets

```bash
# PII_ENCRYPTION_KEY — 32 random bytes as hex (64 chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ADMIN_SECRET / CRON_SECRET / WEBHOOK_SECRET / TELEGRAM_WEBHOOK_SECRET
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

---

## Database Migrations

Migrations live in `supabase/migrations/` and must be applied in order.
Run each file in the **Supabase Dashboard → SQL Editor → New Query**.

| Migration | What it does |
|---|---|
| `001_initial_schema.sql` | Core tables: merchants, products, customers, orders, order_items |
| `002_rls_policies.sql` | Row Level Security policies |
| `003_add_telegram.sql` | Telegram-specific columns on merchants and customers |
| `004_product_embeddings.sql` | `pgvector` extension + embedding column on products |
| `005_delivery_zones_and_payment_expiry.sql` | Delivery zone config + payment expiry tracking |
| `006_product_variants.sql` | Product variant support (sizes, colours) |
| `007_telegram_webhook_source.sql` | Track which webhook source triggered an order |
| `008_business_type.sql` | `business_type` enum on merchants |
| `009_merchant_self_service.sql` | `api_key`, `subscription_tier`, `trial_ends_at`, `bot_name` |
| `010_pii_encryption.sql` | `email_hash` column (HMAC search); removes plaintext PII columns |
| `011_admin_telegram.sql` | Admin Telegram notification support |
| `012_drop_email_check_constraint.sql` | **Required** — drops `merchants_email_check` constraint, which rejects AES-256-GCM ciphertext values |
| `013_merchant_auth_user.sql` | **Required** — adds `auth_user_id UUID` to merchants, linking each merchant row to their Supabase auth account |

> **Migrations 012 and 013 are blocking.** Without 012, the DB insert during registration fails with a check constraint violation. Without 013, the `auth_user_id` column doesn't exist and the insert fails.

### Regenerate TypeScript types after any migration

```bash
# Run from inside the lameda/ directory
npx supabase login          # authenticate if needed
npx supabase gen types typescript --project-id vcimxquovtqsqcwuqmfq > src/types/database.ts
```

Until types are regenerated after migration 013, two routes suppress type errors with `@ts-expect-error` — see [Known Workarounds](#known-temporary-workarounds).

---

## API Endpoints

### Public (no auth)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness check. Also pings the DB — returns `200 ok` or `503 degraded` |
| `POST` | `/api/merchants/register` | Self-service merchant onboarding (see [Registration Flow](#merchant-registration-flow)) |
| `POST` | `/api/webhook/telegram/[merchantId]` | Receives Telegram updates for a merchant's bot. Verified via `X-Telegram-Bot-Api-Secret-Token` header |
| `POST` | `/api/webhooks/paystack` | Paystack `charge.success` event handler. Verified via HMAC-SHA512 |
| `POST` | `/api/webhooks/order-delivered` | Supabase Database Webhook — fires on `orders.status = delivered`. Verified via `webhook-secret` header |

### Merchant (require `X-Merchant-Api-Key: lmd_...`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/crm/orders` | Paginated order list. Supports `?status=`, `?limit=`, `?offset=`. Delivery addresses decrypted transparently |
| `GET` | `/api/crm/customers` | Paginated customer list. Supports `?opted_in=`, `?limit=`, `?offset=`. PII decrypted transparently |
| `POST` | `/api/crm/reveal-token` | Returns the merchant's plaintext bot token. Writes an audit log entry before returning. Rate-limited to 5 reveals per hour |
| `POST` | `/api/merchants/rotate-token` | Rotates the Telegram bot token. Validates new token, deletes old webhook, re-registers new webhook, writes audit log |
| `POST` | `/api/products/import` | Bulk CSV product import. Max 100 rows. Format: `name,description,price_ngn,category,sizes,colors,image_url,stock_count` |

### Admin (require `x-admin-secret: <ADMIN_SECRET>`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/admin/merchants/resend-welcome` | Resets merchant CRM password to a new temp value and resends the full onboarding welcome email |

### Cron (require `CRON_SECRET` header — called by Vercel)

| Method | Path | Schedule | Description |
|---|---|---|---|
| `GET` | `/api/cron/cart-recovery` | Daily 08:00 UTC | Sends cart recovery messages (15 min + 2 hr nudges) |
| `GET` | `/api/cron/payment-expiry` | Daily 08:00 UTC | Cancels orders with expired payment links, restores stock |

### Legacy embedding (require `X-Merchant-Id` + `X-Api-Key: <MERCHANT_API_KEY>`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/products/[productId]/embed` | Generate or regenerate embedding for one product |
| `POST` | `/api/products/embed-all` | Bulk embed all unembedded products for a merchant |

### Dev / test only

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/test/payment-link` | Generates a 2-minute Paystack payment link for testing the expiry → cancel → stock-restore cycle. Auth: `CRON_SECRET` header |

---

## Example Calls

### Resend onboarding email (admin)

```bash
curl -X POST https://lameda.vercel.app/api/admin/merchants/resend-welcome \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -d '{"api_key":"lmd_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"}'
```

```json
{
  "success": true,
  "merchant_id": "uuid",
  "business_name": "Acme Foods",
  "email_id": "resend-email-id",
  "password_reset": true
}
```

### Fetch orders (CRM)

```bash
curl "https://lameda.vercel.app/api/crm/orders?status=pending&limit=20" \
  -H "X-Merchant-Api-Key: lmd_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### Reveal bot token (audited)

```bash
curl -X POST https://lameda.vercel.app/api/crm/reveal-token \
  -H "X-Merchant-Api-Key: lmd_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

---

## Merchant Registration Flow

```
POST /api/merchants/register
        │
        ▼
1. Validate input (Zod schema)
2. Validate Telegram bot token → GET api.telegram.org/getMe
3. Create Supabase auth user
   · email_confirm: true (skips verification email)
   · temp password generated (readable: word-word-NNNN)
4. Encrypt PII before DB write (AES-256-GCM)
   · email, owner_name, telegram_bot_token
5. Hash email for uniqueness search (HMAC-SHA256 → email_hash)
6. Insert merchant row with auth_user_id
   └─ On failure → delete auth user (no orphans)
7. Register Telegram webhook → POST api.telegram.org/setWebhook
8. Send welcome email via Resend
   ├─ Portal URL + email + temp password
   ├─ API key
   └─ 6-step getting started guide
9. Return: { success, business_name, api_key, bot_name, telegram_link }
```

---

## PII Encryption

Sensitive fields are encrypted with AES-256-GCM before being written to the database. Plaintext never touches the DB and is never logged.

**Encrypted fields:**
- `merchants.email`
- `merchants.owner_name`
- `merchants.telegram_bot_token`
- `orders.delivery_address`
- `customers.display_name` (when set)

**Not encrypted** (intentional):
- `customers.phone_number` — Telegram chat IDs, used as upsert conflict keys
- `merchants.api_key` — returned verbatim on first creation; not PII

**Stored format:** `enc:v1:{iv_hex}:{auth_tag_hex}:{ciphertext_hex}`

**Search:** Plaintext email is never stored. `email_hash` (HMAC-SHA256) handles uniqueness checks and duplicate detection.

**Key rotation:** The `v1` version prefix supports future key rotation without a big-bang migration. See `src/lib/crypto/pii.ts` for the full rotation procedure.

---

## Conversation State Machine

Telegram updates enter `src/lib/conversation/stateMachine.ts`. Claude classifies intent, then the matching handler runs:

| Handler | Trigger |
|---|---|
| `greeting` | `/start`, first message, returning customer greeting |
| `browse` | Product search, browsing, "show me…" |
| `product` | Single product detail request |
| `cart` | Add to cart, view cart, remove item, clear cart |
| `checkout` | Proceed to checkout, address collection, delivery selection |
| `orders` | Order status lookup, order history |
| `complaint` | Returns, complaints, bad experience reports |
| `handoff` | Escalate to human agent |
| `admin` | Merchant-side admin commands via Telegram (add product, list orders, etc.) |
| `image` | Customer sends an image (product photo search) |
| `fallback` | Unrecognised or out-of-scope intent |

---

## Security Model

| Layer | Mechanism |
|---|---|
| Telegram webhooks | `X-Telegram-Bot-Api-Secret-Token` header verified on every update |
| Paystack webhooks | HMAC-SHA512 signature verified before any DB read/write |
| Supabase DB webhook | `webhook-secret` header verified |
| CRM endpoints | `X-Merchant-Api-Key` — scoped to active merchants only |
| Admin endpoints | `x-admin-secret` header |
| Cron endpoints | `CRON_SECRET` header |
| PII at rest | AES-256-GCM encrypted; auth tag prevents silent tampering |
| Logs | Pino redacts `email`, `api_key`, `token`, `secret`, `delivery_address`, and other PII keys at any depth |
| Service role key | Used only in server-side API routes — never in client bundle |
| Bot token reveal | Writes audit log before returning; rate-limited to 5/hour per merchant |

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in values
cp .env.local.example .env.local

# 3. Start Supabase locally (or point .env.local at a remote project)
npx supabase start

# 4. Apply all migrations
npx supabase db push

# 5. Generate TypeScript types
npx supabase gen types typescript --local > src/types/database.ts

# 6. Start dev server
npm run dev
```

App runs at `http://localhost:3000`.

**Telegram webhooks locally:** Telegram requires a public HTTPS URL. Use a tunnel to expose your local server:

```bash
# ngrok
ngrok http 3000

# Cloudflare Tunnel
cloudflared tunnel --url http://localhost:3000
```

Set `NEXT_PUBLIC_APP_URL` to the tunnel URL, then re-register the webhook by running through merchant onboarding or calling the rotate-token endpoint.

---

## Deployment

Vercel deploys automatically on every push to `main`.

**Manual deploy:**
```bash
npm install -g vercel
vercel --prod
```

**Pre-deploy checklist:**
- All required env vars set in Vercel dashboard
- Migrations 012 and 013 applied in Supabase
- `EMAIL_FROM` uses a verified Resend domain (or `onboarding@resend.dev` for testing)
- `NEXT_PUBLIC_APP_URL` set to the production domain

**Cron jobs** are configured in `vercel.json`. Both currently run daily at 08:00 UTC. Vercel Pro plan is required for sub-hourly schedules — on Hobby they run once daily regardless of the configured schedule.

---

## Supabase Database Webhook Setup

The `/api/webhooks/order-delivered` endpoint is triggered by a Supabase Database Webhook (not a Paystack event). Configure it once in the Supabase dashboard:

1. **Database → Webhooks → Create a new hook**
2. Table: `orders` | Events: `UPDATE`
3. Method: `POST`
4. URL: `https://lameda.vercel.app/api/webhooks/order-delivered`
5. HTTP Headers: `{ "webhook-secret": "<your WEBHOOK_SECRET value>" }`

The handler fires whenever an order's status is set to `delivered` and sends a Telegram confirmation message to the customer.

---

## Known Temporary Workarounds

These will be resolved once TypeScript types are regenerated after migration 013 is applied.

| File | Workaround | Resolution |
|---|---|---|
| `src/app/api/merchants/register/route.ts` | `@ts-expect-error` on `auth_user_id` field in the insert payload | Run `supabase gen types typescript` after migration 013 |
| `src/app/api/admin/merchants/resend-welcome/route.ts` | Separate `@ts-expect-error` query to fetch `auth_user_id` | Run `supabase gen types typescript` after migration 013 |

**One command to fix both:**

```bash
# From inside lameda/ directory
npx supabase gen types typescript --project-id vcimxquovtqsqcwuqmfq > src/types/database.ts
```

Then remove all `@ts-expect-error` comments related to `auth_user_id` and commit.
