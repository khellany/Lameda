# Detailed Database Schema

## Design Principles
- Multi-tenant from day one.
- Merchant data isolated by tenant ID.
- Conversation history preserved.
- Order and payment states auditable.

## Core Tables

### merchants
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| name | text | Merchant name |
| slug | text | Public identifier |
| email | text | Login/contact |
| phone | text | Optional |
| status | text | trial, active, suspended |
| plan | text | starter, growth, pro |
| persona | text | professional, friendly, vibrant |
| language_default | text | en, pidgin |
| created_at | timestamp | |
| updated_at | timestamp | |

### merchant_channels
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| merchant_id | uuid | FK merchants.id |
| channel_type | text | whatsapp, telegram |
| channel_handle | text | bot name or identifier |
| channel_status | text | active, pending, disabled |
| config_json | jsonb | Channel settings |
| created_at | timestamp | |

### products
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| merchant_id | uuid | FK |
| sku | text | Unique within merchant |
| name | text | Product name |
| category | text | Clothing, shoes, etc. |
| description | text | |
| price | numeric | |
| currency | text | NGN |
| stock_qty | integer | Current stock |
| status | text | active, sold_out, hidden |
| created_at | timestamp | |
| updated_at | timestamp | |

### product_images
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| product_id | uuid | FK products.id |
| image_url | text | Storage URL |
| sort_order | integer | |
| created_at | timestamp | |

### product_variants
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| product_id | uuid | FK |
| size | text | Optional |
| color | text | Optional |
| quantity | integer | |
| sku_suffix | text | Optional |

### customers
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| merchant_id | uuid | FK |
| channel_user_id | text | Telegram/WhatsApp identity |
| full_name | text | |
| phone | text | Optional |
| consent_status | text | yes, no, pending |
| consent_at | timestamp | |
| segment | text | new, repeat, high_value, dormant |
| last_seen_at | timestamp | |
| memory_json | jsonb | preferences and notes |

### conversations
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| merchant_id | uuid | FK |
| customer_id | uuid | FK |
| channel_type | text | whatsapp, telegram |
| status | text | open, waiting_human, closed |
| intent | text | browse, search, complaint, support |
| last_message_at | timestamp | |
| created_at | timestamp | |

### messages
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| conversation_id | uuid | FK |
| sender_type | text | customer, bot, merchant |
| message_type | text | text, image, button, system |
| body_text | text | |
| payload_json | jsonb | structured content |
| created_at | timestamp | |

### carts
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| merchant_id | uuid | FK |
| customer_id | uuid | FK |
| status | text | active, converted, expired |
| expires_at | timestamp | |
| subtotal | numeric | |

### cart_items
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| cart_id | uuid | FK |
| product_id | uuid | FK |
| variant_id | uuid | FK nullable |
| quantity | integer | |
| unit_price | numeric | |

### orders
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| order_ref | text | Human-readable ref |
| merchant_id | uuid | FK |
| customer_id | uuid | FK |
| status | text | pending_payment, paid, preparing, shipped, delivered, complete, cancelled |
| payment_status | text | pending, paid, failed, refunded |
| subtotal | numeric | |
| delivery_fee | numeric | |
| total | numeric | |
| delivery_address | text | |
| preferred_delivery_date | date | Optional |
| special_instructions | text | Optional |
| created_at | timestamp | |
| updated_at | timestamp | |

### order_items
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| order_id | uuid | FK |
| product_id | uuid | FK |
| variant_id | uuid | FK nullable |
| quantity | integer | |
| unit_price | numeric | |

### payments
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| order_id | uuid | FK |
| provider | text | paystack, monnify |
| method | text | card, bank_transfer |
| provider_ref | text | Gateway reference |
| amount | numeric | |
| status | text | pending, success, failed, refunded |
| webhook_payload | jsonb | Raw webhook data |
| created_at | timestamp | |

### complaints
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| order_id | uuid | FK nullable |
| customer_id | uuid | FK |
| merchant_id | uuid | FK |
| status | text | open, investigating, resolved, escalated |
| complaint_text | text | |
| resolution_type | text | replacement, refund, exchange |
| created_at | timestamp | |

### feedback
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| order_id | uuid | FK |
| customer_id | uuid | FK |
| rating | integer | 1 to 5 |
| review_text | text | |
| testimonial_card_url | text | Optional |
| created_at | timestamp | |

### broadcasts
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| merchant_id | uuid | FK |
| segment | text | new, repeat, high_value, dormant |
| message_text | text | |
| scheduled_at | timestamp | |
| sent_at | timestamp | |

## Suggested Indexes
- merchant_id on every tenant table.
- order_ref unique index.
- channel_user_id + merchant_id unique composite index.
- stock and status indexes for products.
- created_at indexes for reporting.

## Suggested Relationships
- Merchant 1:N Products
- Merchant 1:N Customers
- Merchant 1:N Conversations
- Conversation 1:N Messages
- Cart 1:N Cart Items
- Order 1:N Order Items
- Order 1:N Payments
- Order 1:N Complaints
- Order 1:N Feedback
