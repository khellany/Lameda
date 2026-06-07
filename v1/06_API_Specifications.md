# API Specifications

## API Style
- REST JSON API for web dashboard and integrations.
- Webhooks for payment and status events.
- Auth via merchant session token and signed bot/webhook credentials.

## Authentication
### POST /api/auth/login
Request:
```json
{ "email": "merchant@example.com", "password": "******" }
```
Response:
```json
{ "access_token": "jwt", "merchant_id": "uuid" }
```

## Merchant Setup
### POST /api/merchants
Create merchant workspace.

### GET /api/merchants/{merchant_id}
Return merchant profile and settings.

### PUT /api/merchants/{merchant_id}
Update settings, persona, language, and operating hours.

## Products
### POST /api/products
Create a product.

### GET /api/products
List products with filters for category, status, and stock.

### GET /api/products/{product_id}
Fetch product details.

### PUT /api/products/{product_id}
Update product and variants.

### POST /api/products/{product_id}/images
Upload product images.

### POST /api/products/bulk-import
Import products from CSV or structured payload.

## Conversations
### POST /api/conversations
Create or resume a conversation.

### GET /api/conversations/{conversation_id}
Fetch conversation timeline.

### POST /api/conversations/{conversation_id}/messages
Add a message to the thread.

### POST /api/webhooks/channel-message
Inbound message from WhatsApp or Telegram.

## Cart and Checkout
### POST /api/carts
Create cart.

### POST /api/carts/{cart_id}/items
Add cart item.

### GET /api/carts/{cart_id}
Return cart summary.

### POST /api/carts/{cart_id}/checkout
Create order from cart.

## Orders
### GET /api/orders
List orders.

### GET /api/orders/{order_id}
Fetch order details.

### PATCH /api/orders/{order_id}
Update status.

### POST /api/orders/{order_id}/confirm
Merchant confirms preparation.

### POST /api/orders/{order_id}/ship
Mark shipped and attach tracking.

### POST /api/orders/{order_id}/deliver
Mark delivered.

### POST /api/orders/{order_id}/complete
Mark complete.

## Payments
### POST /api/payments/paystack/create-link
Create hosted payment link.

### POST /api/payments/monnify/create-virtual-account
Create transfer account.

### POST /api/webhooks/paystack
Receive Paystack webhook events.

### POST /api/webhooks/monnify
Receive Monnify webhook events.

## Complaints and Support
### POST /api/complaints
Create complaint ticket.

### GET /api/complaints
List complaints.

### PATCH /api/complaints/{complaint_id}
Update complaint status and resolution.

## Feedback
### POST /api/feedback
Collect rating and review.

### GET /api/testimonials
Fetch testimonial assets.

## Broadcasts and Segments
### POST /api/broadcasts
Create broadcast.

### GET /api/customers/segments
Return customer segments.

## Analytics
### GET /api/analytics/overview
Return MRR, orders, conversion, response time, complaints, and churn indicators.

### GET /api/analytics/orders
Return order funnel performance.

## Example Order Creation Payload
```json
{
  "merchant_id": "uuid",
  "customer_id": "uuid",
  "delivery_address": "Lagos, Nigeria",
  "items": [
    { "product_id": "uuid", "quantity": 1, "variant_id": "uuid" }
  ],
  "payment_method": "paystack"
}
```

## Key Event Payloads
### order.paid
### order.shipped
### order.delivered
### complaint.created
### feedback.created
### broadcast.sent

## API Notes
- All merchant-facing endpoints require authorization.
- Webhook endpoints must verify signatures.
- Tenant checks must be enforced on every request.
