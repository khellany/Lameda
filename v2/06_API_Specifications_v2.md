# Lameda - API Specifications v2
**Version:** 2.0 | **Base URL:** `https://api.lameda.ng` | **Date:** May 2026

---

## Global Standards (NEW in v2)

### Authentication
All requests (except auth endpoints) require: `Authorization: Bearer {access_token}`

### Standard Error Envelope
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Order not found",
    "details": [{"field": "order_id", "message": "Invalid UUID format"}]
  },
  "request_id": "01HX..."
}
```

Error codes: `UNAUTHORIZED`, `FORBIDDEN`, `RESOURCE_NOT_FOUND`, `VALIDATION_ERROR`, `RATE_LIMIT_EXCEEDED`, `CONFLICT`, `INTERNAL_ERROR`

### Pagination (all list endpoints)
Request: `?page=1&per_page=20`
Response:
```json
{
  "data": [...],
  "meta": { "total": 142, "page": 1, "per_page": 20, "total_pages": 8 }
}
```

### Rate Limiting Headers
All responses include:
- `X-RateLimit-Limit: 100`
- `X-RateLimit-Remaining: 87`
- `X-RateLimit-Reset: 1716912345`
- On 429: `Retry-After: 60`

### Idempotency
All POST mutation endpoints require: `Idempotency-Key: {uuid}` header. Duplicate requests with same key return cached response for 24 hours.

---

## Authentication

### POST /api/v1/auth/login
```json
// Request
{ "email": "merchant@example.com", "password": "..." }

// Response 200
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "merchant_id": "uuid",
  "expires_in": 3600
}
```

### POST /api/v1/auth/refresh (NEW)
```json
// Request
{ "refresh_token": "eyJ..." }

// Response 200
{ "access_token": "eyJ...", "expires_in": 3600 }
```

### POST /api/v1/auth/logout (NEW)
- Header: `Authorization: Bearer {token}`
- Response: `204 No Content`

---

## Merchants

### POST /api/v1/merchants
```json
// Request
{ "name": "Dayo", "email": "dayo@example.com", "password": "...", "phone": "+2348012345678" }

// Response 201
{ "id": "uuid", "email": "...", "trial_ends_at": "...", "subscription_status": "trial" }
```

### GET /api/v1/merchants/{merchant_id}
Returns merchant profile + channels + plan status.

### PUT /api/v1/merchants/{merchant_id}
```json
{ "persona_name": "Amaka", "language": "pcm", "business_hours": {...}, "delivery_policy": "..." }
```

### GET /api/v1/merchants/{merchant_id}/subscription (NEW)
```json
// Response 200
{
  "plan": "Growth",
  "status": "active",
  "trial_ends_at": null,
  "conversation_usage": 347,
  "conversation_limit": 2000,
  "current_period_ends_at": "2026-06-01T00:00:00Z"
}
```

---

## Products

### POST /api/v1/products
```json
// Request (Idempotency-Key required)
{ "name": "Ankara Top", "description": "...", "price": 1850000, "category": "tops", "stock_qty": 12 }

// Response 201
{ "id": "uuid", "name": "Ankara Top", "price": 1850000, "sku": "ANK-001", ... }
```

### GET /api/v1/products
`?category=tops&status=active&page=1&per_page=20`
Returns paginated product list.

### GET /api/v1/products/{product_id}
Returns product + variants + image URLs.

### PUT /api/v1/products/{product_id}
Updates product fields.

### POST /api/v1/products/{product_id}/images
`multipart/form-data` - up to 5 images, max 5MB each.
Response: `{ "image_url": "https://...", "embedding_queued": true }`

### POST /api/v1/products/bulk-import
`multipart/form-data: csv_file`
Response: `{ "imported": 47, "failed": 3, "errors": [{"row": 12, "reason": "Missing price"}] }`

### POST /api/v1/products/search (NEW - NLP semantic search)
```json
// Request
{ "query": "blue party dress under 20k", "merchant_id": "uuid", "limit": 5 }

// Response 200
{
  "results": [
    { "product": {...}, "score": 0.92, "match_reason": "color + price + category" }
  ]
}
```
Uses pgvector cosine similarity + text re-ranking. Min score threshold: 0.6.

### POST /api/v1/products/image-match (NEW - CLIP visual search)
`multipart/form-data: image` + body: `{ "merchant_id": "uuid" }`
```json
// Response 200
{
  "results": [
    { "product": {...}, "similarity_score": 0.88 }
  ]
}
```

---

## Conversations

### POST /api/v1/conversations
```json
// Request (Idempotency-Key required)
{ "customer_id": "uuid", "channel_type": "whatsapp" }

// Response 201
{ "id": "uuid", "status": "active", "context_json": {} }
```

### GET /api/v1/conversations/{id}
Returns conversation + paginated messages (`?page=1&per_page=50`).

### POST /api/v1/conversations/{id}/messages
```json
{ "sender_type": "customer", "message_type": "text", "body_text": "Do you have size M?" }
```

### GET /api/v1/conversations/handoffs (NEW)
`?status=waiting_human&page=1&per_page=20`
Returns paginated list of conversations needing human attention.

### PUT /api/v1/conversations/{id}/handoff (NEW)
```json
// Request - merchant takes over
{ "action": "take_over" }          // or "assign", "snooze", "resume_ai"
// Response 200
{ "status": "human_active", "assigned_to": "merchant_id" }
```

### GET /api/v1/conversations/{id}/memory (NEW)
Returns AI-generated summary of customer preferences and history.

### PUT /api/v1/conversations/{id}/memory (NEW)
Allows merchant to add notes to customer memory (persisted to customer_preferences).

---

## Orders

### POST /api/v1/orders
```json
// Request (Idempotency-Key required)
{
  "customer_id": "uuid",
  "conversation_id": "uuid",
  "items": [{ "product_id": "uuid", "variant_id": "uuid", "quantity": 1 }],
  "delivery_address": { "street": "...", "city": "Lagos", "state": "Lagos" }
}
// Response 201 - order created with status "pending"
```

### GET /api/v1/orders
`?status=pending&page=1&per_page=20` - Returns merchant's orders.

### GET /api/v1/orders/{order_id}
Returns full order + items + payment status.

### PUT /api/v1/orders/{order_id}/status
```json
{ "status": "dispatched", "tracking_info": "..." }
```

### POST /api/v1/orders/{order_id}/refund (NEW)
```json
{ "reason": "Customer returned item", "amount": 1850000 }
// Triggers Paystack refund + updates payment record
```

---

## Payments

### POST /api/v1/payments/initiate
```json
// Request (Idempotency-Key required)
{ "order_id": "uuid", "provider": "paystack" }

// Response 201
{
  "payment_id": "uuid",
  "checkout_url": "https://checkout.paystack.com/xxx",
  "reference": "LMD-2847-1716912345",
  "expires_at": "2026-05-22T14:30:00Z"
}
```

### GET /api/v1/payments/{payment_id}
Returns payment status + provider response.

---

## Broadcasts

### POST /api/v1/broadcasts
```json
{
  "name": "June Flash Sale",
  "message_text": "...",
  "audience_filter": { "tags": ["vip"], "last_order_days": 90 },
  "scheduled_at": "2026-06-01T09:00:00Z"
}
// Response 201 with estimated recipient_count
```

### GET /api/v1/broadcasts
`?status=sent&page=1` - Returns broadcast list.

### POST /api/v1/broadcasts/{id}/schedule (NEW)
`{ "scheduled_at": "2026-06-01T09:00:00Z" }` - Schedules or reschedules broadcast.

---

## Analytics

### GET /api/v1/analytics/summary (NEW)
`?from=2026-05-01&to=2026-05-31`
```json
{
  "revenue": 1425000,
  "orders_completed": 87,
  "conversations_started": 312,
  "conversion_rate": 0.279,
  "avg_order_value": 16379,
  "handoff_rate": 0.043,
  "abandoned_cart_recovery_rate": 0.28
}
```

---

## NDPR / Compliance

### DELETE /api/v1/customers/{customer_id}/data (NEW - Right to Erasure)
- Requires merchant authorization
- Anonymises PII within 72 hours (per NDPR requirement)
- Returns: `{ "erasure_requested_at": "...", "estimated_completion": "..." }`
- Audit log entry created automatically

---

## Webhooks (Inbound)

### POST /api/webhooks/v1/whatsapp
- Signed with HMAC-SHA512 using `X-Hub-Signature-256` header
- Deduplicated via `idempotency_key` in webhook_events table
- Retry policy: 3 retries with exponential backoff (1s, 4s, 16s)

### POST /api/webhooks/v1/paystack
- Verified via Paystack secret key in `X-Paystack-Signature`
- Events handled: `charge.success`, `refund.processed`

### GET /api/v1/webhooks/health (NEW)
Returns last 10 webhook events with status - for merchant debugging.
