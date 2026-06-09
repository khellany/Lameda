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
| Database | Supabase (PostgreSQL 15 + Auth + Realtime) |
| ORM | Supabase JS SDK + generated types |
| AI | Anthropic Claude (intent classification, responses) |
| Embeddings | OpenAI (product semantic search) |
| Payments | Paystack |
| Email | Resend |
| Logging | Pino (structured JSON in production) |
| Deployment | Vercel (Node.js 24) |
| Job Queue | pg-boss |

---

## Project Structure

```
lameda/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/              # Merchant CRM login page
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   └── merchants/
│   │   │   │       └── resend-welcome/  # Admin: resend onboarding email
│   │   │   ├── crm/
│   │   │   │   ├── customers/      # CRM customer list
│   │   │   │   ├── orders/         # CRM order list
│   │   │   │   └── reveal-token/   # Decrypt PII for CRM display
│   │   │   ├── cron/
│   │   │   │   ├── cart-recovery/  # Abandoned cart nudges
│   │   │   │   └── payment-expiry/ # Expire unpaid payment links
│   │   │   ├── health/             # Health check
│   │   │   ├── merchants/
│   │   │   │   ├── register/       # Self-service merchant onboarding
│   │   │   │   └── rotate-token/   # API key rotation
│   │   │   ├── products/
│   │   │   │   ├── [productId]/embed/  # Embed single product
│   │   │   │   ├── embed-all/      # Bulk embed catalogue
│   │   │   │   └── import/         # CSV product import
│   │   │   ├── webhook/
│   │   │   │   ├── telegram/[merchantId]/  # Telegram update receiver
│   │   │   │   └── whatsapp/       # WhatsApp webhook (future)
│   │   │   └── webhooks/
│   │   │       ├── order-delivered/
│   │   │       └── paystack/       # Paystack payment events
│   │   ├── onboard/                # Self-service merchant registration form
│   │   ├── payment/callback/       # Payment redirect handler
│   │   └── page.tsx                # Landing page
│   ├── lib/
│   │   ├── ai/                     # Claude client, intent classify, embed, respond
│   │   ├── conversation/           # State machine + per-intent handlers
│   │   ├── crm/                    # CRM auth helpers
│   │   ├── crypto/
│   │   │   ├── pii.ts              # AES-256-GCM field-level PII encryption
│   │   │   └── hash.ts             # HMAC-SHA256 search hashing
│   │   ├── email/
│   │   │   ├── client.ts           # Resend singleton
│   │   │   └── templates/
│   │   │       └── merchant-welcome.ts  # Onboarding email (HTML + text)
│   │   ├── merchant/config.ts      # Business type definitions
│   │   ├── payments/paystack.ts    # Paystack integration
│   │   ├── products/search.ts      # Semantic product search
│   │   ├── supabase/
│   │   │   ├── client.ts           # Browser Supabase client
│   │   │   └── server.ts           # Server + admin clients
│   │   ├── telegram/               # Telegram client, webhook, verification
│   │   ├── utils/
│   │   │   ├── logger.ts           # Pino structured logger
│   │   │   └── rateLimit.ts        # DB-backed rate limiting
│   │   └── whatsapp/               # WhatsApp client (future)
│   └── types/
│       └── database.ts             # Auto-generated Supabase types
└── supabase/
    └── migrations/                 # Versioned schema migrations (001–013)
```

---

## Environment Variables

All variables are set in Vercel → Project → Settings → Environment Variables.

### Required (will crash on missing)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (safe in client bundle — RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — **server-side only** |
| `PII_ENCRYPTION_KEY` | 64-char hex string (32 bytes). Encrypts email, owner_name, bot_token at rest |
| `TELEGRAM_WEBHOOK_SECRET` | Arbitrary secret used to sign and verify Telegram webhook requests |
| `ANTHROPIC_API_KEY` | Claude API key for intent classification and response generation |
| `OPENAI_API_KEY` | OpenAI key for product embedding (semantic search) |
| `PAYSTACK_SECRET_KEY` | Paystack secret key for payment initiation and webhook verification |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `ADMIN_SECRET` | Arbitrary secret for admin-only API endpoints (`x-admin-secret` header) |

### Optional (have defaults)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `''` | Full origin URL e.g. `https://lameda.vercel.app`. Used in email links and webhook registration |
| `EMAIL_FROM` | `Lameda <hello@lameda.ng>` | Resend `from` address. Must use a verified domain — or set to `Lameda <onboarding@resend.dev>` for testing |

### Generating keys

```bash
# PII_ENCRYPTION_KEY — 32 random bytes as hex
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# TELEGRAM_WEBHOOK_SECRET / ADMIN_SECRET — any strong random string
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

---

## Database Migrations

Migrations live in `supabase/migrations/` and must be applied in order via the Supabase SQL Editor (Dashboard → SQL Editor → New Query).

| Migration | What it does |
|---|---|
| `001_initial_schema.sql` | Core tables: merchants, products, customers, orders, order_items |
| `002_rls_policies.sql` | Row Level Security policies |
| `003_add_telegram.sql` | Telegram-specific columns |
| `004_product_embeddings.sql` | `pgvector` extension + embedding column on products |
| `005_delivery_zones_and_payment_expiry.sql` | Delivery zone config + payment expiry tracking |
| `006_product_variants.sql` | Product variant support |
| `007_telegram_webhook_source.sql` | Track which webhook source triggered an order |
| `008_business_type.sql` | `business_type` enum on merchants |
| `009_merchant_self_service.sql` | `api_key`, `subscription_tier`, `trial_ends_at`, `bot_name` |
| `010_pii_encryption.sql` | `email_hash` column (HMAC search); removes plaintext PII columns |
| `011_admin_telegram.sql` | Admin Telegram notification support |
| `012_drop_email_check_constraint.sql` | **Required** — drops `merchants_email_check` (incompatible with AES ciphertext) |
| `013_merchant_auth_user.sql` | **Required** — adds `auth_user_id UUID` to merchants, links to Supabase auth |

> **Important:** Migrations 012 and 013 must be applied before running registration. Without 012, the DB insert fails. Without 013, the API key insert fails.

### After applying migrations

Regenerate TypeScript types so the codebase has full type safety:

```bash
# From inside lameda/ directory
npx supabase login   # if not already authenticated
npx supabase gen types typescript --project-id <YOUR_PROJECT_ID> > src/types/database.ts
```

Until types are regenerated, routes that use `auth_user_id` suppress the type error with `@ts-expect-error`. Remove those comments after regenerating.

---

## Key API Endpoints

### Public

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/merchants/register` | Self-service merchant onboarding. Validates bot token, creates Supabase auth user, inserts merchant row, registers Telegram webhook, sends welcome email |
| `POST` | `/api/webhook/telegram/[merchantId]` | Receives Telegram updates for a merchant's bot |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/webhooks/paystack` | Paystack payment event handler |
| `GET` | `/api/products/[productId]/embed` | Trigger embedding for a single product |

### Protected (require `Authorization: Bearer <api_key>`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/products/import` | Bulk CSV product import |
| `GET` | `/api/crm/orders` | Paginated order list for merchant |
| `GET` | `/api/crm/customers` | Customer list for merchant |
| `POST` | `/api/merchants/rotate-token` | Rotate merchant API key |

### Admin (require `x-admin-secret: <ADMIN_SECRET>`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/admin/merchants/resend-welcome` | Resend onboarding email. Resets Supabase auth password to new temp value and resends welcome email with fresh credentials |

#### Resend welcome email

```bash
curl -X POST https://lameda.vercel.app/api/admin/merchants/resend-welcome \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -d '{"api_key":"lmd_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"}'
```

Response:
```json
{
  "success": true,
  "merchant_id": "uuid",
  "business_name": "Acme Foods",
  "email_id": "resend-email-id",
  "password_reset": true
}
```

---

## Merchant Registration Flow

```
POST /api/merchants/register
        │
        ▼
1. Validate input (Zod schema)
2. Validate Telegram bot token (GET /getMe)
3. Create Supabase auth user (email_confirm: true, temp password)
4. Encrypt PII: email, owner_name, bot_token (AES-256-GCM)
5. Hash email for search (HMAC-SHA256)
6. Insert merchant row with auth_user_id
   └─ If insert fails → delete auth user (cleanup)
7. Register Telegram webhook
8. Send welcome email via Resend
   ├─ Login credentials (portal URL + email + temp password)
   ├─ API key
   └─ 6-step getting started guide
9. Return: { success, business_name, api_key, bot_name, telegram_link }
```

---

## PII Encryption

Sensitive fields are encrypted at rest using AES-256-GCM before being written to the database.

**Encrypted fields:** `merchants.email`, `merchants.owner_name`, `merchants.telegram_bot_token`, `orders.delivery_address`

**Stored format:** `enc:v1:{iv_hex}:{auth_tag_hex}:{ciphertext_hex}`

**Search:** Plaintext email is never stored. A HMAC-SHA256 hash (`email_hash`) is stored separately for uniqueness checks and lookups.

**Key rotation:** The version prefix (`v1`) supports future key rotation without a big-bang migration. See `src/lib/crypto/pii.ts` for the rotation procedure.

---

## Conversation State Machine

Telegram updates flow through a state machine in `src/lib/conversation/stateMachine.ts`. Claude classifies intent, then the appropriate handler fires:

| Handler | Trigger |
|---|---|
| `greeting` | `/start`, first message |
| `browse` | Product browsing, search queries |
| `product` | Single product detail request |
| `cart` | Add to cart, view cart, remove item |
| `checkout` | Proceed to checkout, address collection |
| `orders` | Order status, order history |
| `complaint` | Returns, complaints, issues |
| `handoff` | Escalate to human agent |
| `admin` | Admin commands (merchant-only) |
| `image` | Image messages |
| `fallback` | Unrecognised intent |

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in values
cp .env.example .env.local

# 3. Start Supabase locally (optional — or point to remote project)
npx supabase start

# 4. Apply migrations
npx supabase db push

# 5. Generate TypeScript types
npx supabase gen types typescript --local > src/types/database.ts

# 6. Start dev server
npm run dev
```

App runs at `http://localhost:3000`.

For local Telegram webhook testing, use a tunnel (ngrok or Cloudflare Tunnel) to expose `localhost:3000` and update `NEXT_PUBLIC_APP_URL` accordingly.

---

## Deployment

The project deploys automatically to Vercel on every push to `main`.

**Manual deploy:**
```bash
vercel --prod
```

**Environment variables** must be set in the Vercel dashboard before the first deploy. The build will fail without `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

**Email (Resend):** The `from` address must use a domain verified in your Resend account. For testing without domain verification, use `EMAIL_FROM=Lameda <onboarding@resend.dev>`.

---

## Cron Jobs

| Route | Schedule | Purpose |
|---|---|---|
| `/api/cron/cart-recovery` | Every 30 min | Send nudges for abandoned carts |
| `/api/cron/payment-expiry` | Every 15 min | Expire payment links older than 24h |

Configure in `vercel.json` or Vercel dashboard → Cron Jobs.

---

## Security Notes

- `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `ADMIN_SECRET` are **server-side only** — never prefixed with `NEXT_PUBLIC_`
- Telegram webhooks are verified against `TELEGRAM_WEBHOOK_SECRET` on every request
- Admin endpoints are protected by `x-admin-secret` header — never expose publicly
- PII fields are AES-256-GCM encrypted at rest; plaintext never logged (Pino redact config)
- Rate limiting is DB-backed (`src/lib/utils/rateLimit.ts`) — works across serverless instances

---

## Known Temporary Workarounds

| Location | Issue | Fix when |
|---|---|---|
| `src/app/api/merchants/register/route.ts` | `@ts-expect-error` on `auth_user_id` insert | After regenerating DB types (migration 013) |
| `src/app/api/admin/merchants/resend-welcome/route.ts` | Separate query + `@ts-expect-error` for `auth_user_id` | After regenerating DB types (migration 013) |

Run `npx supabase gen types typescript --project-id vcimxquovtqsqcwuqmfq > src/types/database.ts` from the `lameda/` directory to resolve both.
