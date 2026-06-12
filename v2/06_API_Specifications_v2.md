# Lameda — API Specifications
**Version:** 2.1 | **Base URL:** `https://lameda.vercel.app` | **Date:** June 2026

> **v2.1 update:** Reflects actual implemented routes as of Sprint 4. Previous v2.0 described a planned NestJS REST API that was never built. The actual system is a Next.js App Router API with route handlers.

---

## Authentication

The platform uses two auth models depending on the caller:

| Caller | Auth method | Header |
|--------|------------|--------|
| Merchant CRM dashboard | Supabase Auth session (cookie-based) | Managed by Supabase JS SDK |
| Server-to-server / CRM API | Per-merchant API key | `X-Merchant-Api-Key: <key>` |
| Cron jobs | Shared cron secret | `Authorization: Bearer <CRON_SECRET>` |
| Admin endpoints | Shared admin secret | `x-admin-secret: <ADMIN_SECRET>` |
| Webhook receivers (Telegram) | HMAC-SHA256 signed by `TELEGRAM_WEBHOOK_SECRET` | `X-Telegram-Bot-Api-Secret-Token` |
| Webhook receivers (Paystack) | HMAC-SHA512 signed by `PAYSTACK_WEBHOOK_SECRET` | `X-Paystack-Signature` |
| Webhook receivers (order-delivered) | Shared webhook secret | `x-webhook-secret` |

> There is no custom JWT auth system. JWT handling is fully delegated to Supabase Auth.

---

## Standard Error Envelope

```json
{
  "error": "MERCHANT_NOT_FOUND",
  "details": "No merchant found with that API key"
}
```

HTTP status codes: `400` (validation), `401` (missing auth), `403` (wrong secret), `404` (not found), `409` (conflict), `429` (rate limited), `500` (internal error).

---

## Global Standards

- Money values: always in **kobo** (1 NGN = 100 kobo) — never floats
- All IDs: UUID v4
- Timestamps: ISO 8601 UTC (`2026-06-12T14:23:00.000Z`)
- PII fields: decrypted transparently by the server before returning to CRM callers; never return ciphertext to the client

---

## Merchant Onboarding

### POST /api/merchants/register

Self-service merchant registration. Creates merchant row + Supabase Auth account + sends welcome email with credentials.

**Auth:** None (public endpoint)

**Request body:**
```json
{
  "business_name": "Adire Lagos",
  "owner_name": "Amaka Obi",
  "email": "amaka@adirelags.com",
  "business_type": "fashion",
  "telegram_bot_token": "7123456789:AAF...",
  "whatsapp_number": "+2348012345678"  // optional
}
```

`business_type` enum: `fashion | food | electronics | beauty | services | general`

**Response 201:**
```json
{
  "merchant_id": "uuid",
  "api_key": "lmd_...",
  "message": "Merchant registered. Check email for login credentials."
}
```

**Side effects on success:**
- Merchant row inserted with encrypted PII
- Supabase Auth user created with temporary password
- Telegram webhook registered at `/api/webhook/telegram/{merchant_id}`
- Welcome email sent via Resend (includes login URL + bot setup instructions)
- API key generated and stored

**Error cases:**
- `409` — email already registered
- `422` — invalid Telegram bot token (validated against Telegram API)
- `400` — validation failure (Zod schema)

---

### POST /api/merchants/rotate-token

Rotate a merchant's Telegram bot token. Re-registers the webhook with the new token.

**Auth:** `X-Merchant-Api-Key`

**Request body:**
```json
{ "telegram_bot_token": "7987654321:AAG..." }
```

**Response 200:**
```json
{ "message": "Token rotated and webhook re-registered." }
```

---

## Products

### POST /api/products/import

CSV bulk product import. Validates row by row, imports valid rows.

**Auth:** `X-Merchant-Api-Key`

**Request:** `multipart/form-data` with `file` field (CSV)

**CSV columns:** `name` (required), `description`, `price` (NGN — converted to kobo), `category`, `image_url`, `stock_count`, `sizes` (pipe-separated), `colors` (pipe-separated)

**Response 200:**
```json
{
  "imported": 47,
  "skipped": 3,
  "errors": [
    { "row": 12, "error": "price must be a positive number" }
  ]
}
```

---

### POST /api/products/[productId]/embed

Generate and store OpenAI embedding for a single product.

**Auth:** `X-Merchant-Api-Key`

**Response 200:**
```json
{ "product_id": "uuid", "embedded": true }
```

---

### POST /api/products/embed-all

Bulk re-embed entire merchant catalogue. Skips products that already have an embedding.

**Auth:** `X-Merchant-Api-Key` (or legacy `MERCHANT_API_KEY` env var — to be retired)

**Response 200:**
```json
{ "embedded": 42, "skipped": 5, "errors": 0 }
```

---

## CRM

### GET /api/crm/customers

Paginated customer list. PII fields (display_name) are transparently decrypted before returning.

**Auth:** `X-Merchant-Api-Key`

**Query params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | int | 50 | Max rows (max 100) |
| `offset` | int | 0 | Pagination offset |
| `opted_in` | bool | — | Filter by opt-in status |

**Response 200:**
```json
{
  "customers": [
    {
      "id": "uuid",
      "phone_number": "5012345678",
      "display_name": "Tunde Adeleke",
      "opted_in": true,
      "opted_in_at": "2026-05-01T10:00:00Z",
      "language_preference": "en",
      "created_at": "2026-04-28T08:00:00Z"
    }
  ],
  "total": 143,
  "limit": 50,
  "offset": 0
}
```

---

### GET /api/crm/orders

Paginated order list. `delivery_address` is transparently decrypted before returning.

**Auth:** `X-Merchant-Api-Key`

**Query params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | — | Filter: `pending\|confirmed\|paid\|shipped\|delivered\|cancelled` |
| `limit` | int | 50 | Max rows (max 100) |
| `offset` | int | 0 | Pagination offset |

**Response 200:**
```json
{
  "orders": [
    {
      "id": "uuid",
      "reference": "LMD-20260607-A3F2",
      "status": "paid",
      "total_kobo": 7500000,
      "delivery_address": "14 Bode Thomas Street, Surulere, Lagos",
      "delivery_method": "delivery",
      "line_items": [
        { "product_id": "uuid", "name": "Adire Shirt (XL, Blue)", "price_kobo": 7500000, "qty": 1 }
      ],
      "customer_phone": "5012345678",
      "created_at": "2026-06-07T09:30:00Z"
    }
  ],
  "total": 28,
  "limit": 50,
  "offset": 0
}
```

---

### POST /api/crm/reveal-token

Audit-gated bot token reveal. Rate limited (3 requests per 24 hours per merchant). Logs to `audit_logs`.

**Auth:** `X-Merchant-Api-Key`

**Response 200:**
```json
{ "telegram_bot_token": "7123456789:AAF..." }
```

**Response 429:**
```json
{ "error": "RATE_LIMIT_EXCEEDED", "details": "Token reveal limited to 3 requests per 24 hours." }
```

---

## Webhooks

### POST /api/webhook/telegram/[merchantId]

Receives Telegram Update objects for a specific merchant bot. Per-merchant endpoint — each merchant bot is pointed to their own URL.

**Auth:** `X-Telegram-Bot-Api-Secret-Token: <TELEGRAM_WEBHOOK_SECRET>` (verified by Lameda; set when registering the webhook)

**Body:** Telegram `Update` object (application/json)

**Response 200:** `{ "ok": true }` — always ACKs quickly; processing is synchronous but fast

**Flow:**
1. Verify secret token
2. Parse update type (message / callback_query)
3. Upsert customer row
4. Load or create conversation
5. Route to state machine handler
6. Send Telegram reply
7. Persist conversation state

---

### POST /api/webhook/whatsapp

WhatsApp Cloud API webhook receiver. Currently a stub — Termii/WhatsApp integration is planned for a future sprint.

**Auth:** WhatsApp HMAC-SHA256 signature verification

**Response 200:** ACK (no processing implemented)

---

### POST /api/webhooks/paystack

Paystack `charge.success` webhook handler.

**Auth:** `X-Paystack-Signature` (HMAC-SHA512 of body with `PAYSTACK_WEBHOOK_SECRET`)

**Body:** Paystack webhook event object

**Flow on `charge.success`:**
1. Verify HMAC signature
2. Idempotency check via `webhook_events` table
3. Update `payments.status = 'success'`, `paid_at = now()`
4. Update `orders.status = 'confirmed'`
5. Restore reserved stock
6. Send Telegram confirmation to customer
7. Send Telegram notification to merchant admin

---

### POST /api/webhooks/order-delivered

Supabase Database Webhook — fires when `orders.status` changes to `'delivered'`. Sends delivery confirmation message to customer via Telegram.

**Auth:** `x-webhook-secret` header

---

## Cron Jobs

### POST /api/cron/cart-recovery

Abandoned cart recovery. Sends nudge messages for carts idle > 15 min (message 1) or > 2 hours (message 2).

**Auth:** `Authorization: Bearer <CRON_SECRET>`

**Schedule:** Every 5 minutes (configured in `vercel.json`)

**Response 200:**
```json
{ "sent_1": 3, "sent_2": 1 }
```

---

### POST /api/cron/payment-expiry

Expires unpaid Paystack payment links older than 30 minutes. Restores reserved stock. Updates payment status to `failed`.

**Auth:** `Authorization: Bearer <CRON_SECRET>`

**Schedule:** Every 5 minutes (configured in `vercel.json`)

**Response 200:**
```json
{ "expired": 2 }
```

---

## Admin

### POST /api/admin/merchants/resend-welcome

Reset a merchant's Supabase Auth password and resend the welcome email. Used when a merchant loses access or onboarding email was not received.

**Auth:** `x-admin-secret: <ADMIN_SECRET>`

**Request body:**
```json
{ "merchant_id": "uuid" }
```

**Response 200:**
```json
{ "message": "Password reset and welcome email resent." }
```

---

## Health

### GET /api/health

Liveness check. Tests DB connectivity.

**Auth:** None

**Response 200:**
```json
{ "status": "ok", "db": "connected", "timestamp": "2026-06-12T14:00:00Z" }
```

**Response 503:**
```json
{ "status": "error", "db": "unreachable" }
```

---

## Test (Dev Only)

### POST /api/test/payment-link

Generate a short-lived Paystack payment link for a test order. Only available in non-production environments.

**Auth:** `Authorization: Bearer <CRON_SECRET>`

---

## Rate Limiting

Rate limiting is enforced at the application layer using a DB-backed counter (serverless-safe — no Redis required in current architecture).

| Endpoint | Limit |
|----------|-------|
| `/api/crm/reveal-token` | 3 requests / 24h per merchant |
| `/api/merchants/register` | 10 requests / hour per IP |
| Telegram webhook handler | 30 messages / minute per customer |

---

## Money Representation

All monetary values in API responses are in **kobo** (integer). Divide by 100 for NGN display.

```
7_500_000 kobo = ₦75,000.00
```

Never store or transmit money as a float.
