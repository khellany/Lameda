# Development Backlog in Jira Format

## Epic 1: Merchant Onboarding
| Issue Key | Summary | Type | Priority | Story Points | Acceptance Criteria |
|---|---|---|---|---:|---|
| LAM-1 | Create merchant account and trial flow | Story | High | 5 | Merchant can sign up and enter trial. |
| LAM-2 | Telegram intake bot | Story | High | 8 | Bot collects business type and pain points. |
| LAM-3 | Magic-link activation | Story | High | 5 | Merchant can activate via email link. |
| LAM-4 | Setup wizard | Story | High | 8 | Merchant can complete onboarding in under 30 minutes. |

## Epic 2: Product Catalog
| Issue Key | Summary | Type | Priority | Story Points | Acceptance Criteria |
|---|---|---|---|---:|---|
| LAM-5 | Create product form | Story | High | 5 | Merchant can add a product with required fields. |
| LAM-6 | Product image upload | Story | High | 5 | Merchant can attach images to products. |
| LAM-7 | Variant management | Story | Medium | 8 | Merchant can define sizes and colors. |
| LAM-8 | Product search index | Story | High | 8 | Product data can be searched semantically. |

## Epic 3: Customer Commerce Flow
| Issue Key | Summary | Type | Priority | Story Points | Acceptance Criteria |
|---|---|---|---|---:|---|
| LAM-9 | Consent capture | Story | High | 3 | First-time customer sees consent notice. |
| LAM-10 | Browse products | Story | High | 8 | Customer can browse category items. |
| LAM-11 | Natural language search | Story | High | 8 | Search returns relevant product matches. |
| LAM-12 | Image-based matching | Story | Medium | 8 | Customer photo can trigger item suggestions. |
| LAM-13 | Cart and checkout | Story | High | 8 | Customer can add items and checkout. |

## Epic 4: Payments
| Issue Key | Summary | Type | Priority | Story Points | Acceptance Criteria |
|---|---|---|---|---:|---|
| LAM-14 | Paystack hosted checkout | Story | High | 8 | Card payment creates a unique payment link. |
| LAM-15 | Bank transfer flow | Story | High | 8 | Transfer account is generated for order. |
| LAM-16 | Webhook reconciliation | Story | High | 8 | Order becomes paid automatically. |
| LAM-17 | Timeout and expiry logic | Story | Medium | 5 | Unpaid orders expire after the reservation window. |

## Epic 5: Order and Delivery
| Issue Key | Summary | Type | Priority | Story Points | Acceptance Criteria |
|---|---|---|---|---:|---|
| LAM-18 | Merchant order dashboard | Story | High | 8 | Merchant can see and manage orders. |
| LAM-19 | Order status updates | Story | High | 5 | Merchant can move orders through statuses. |
| LAM-20 | Shipping notifications | Story | Medium | 5 | Customer receives shipping updates. |
| LAM-21 | Delivery confirmation | Story | Medium | 5 | Customer can confirm receipt or raise issue. |

## Epic 6: Support and Complaints
| Issue Key | Summary | Type | Priority | Story Points | Acceptance Criteria |
|---|---|---|---|---:|---|
| LAM-22 | Complaint detection | Story | High | 8 | Complaint intent creates a ticket. |
| LAM-23 | Human handoff routing | Story | High | 5 | Complex cases are escalated to a person. |
| LAM-24 | Refund or replacement workflow | Story | High | 8 | Merchant can resolve complaint outcomes. |

## Epic 7: Retention and Growth
| Issue Key | Summary | Type | Priority | Story Points | Acceptance Criteria |
|---|---|---|---|---:|---|
| LAM-25 | Customer segmentation | Story | Medium | 5 | Customers are categorized by value and recency. |
| LAM-26 | Broadcast campaigns | Story | Medium | 8 | Merchant can message segments. |
| LAM-27 | Testimonial generation | Story | Medium | 5 | Positive reviews create shareable assets. |
| LAM-28 | Reorder nudges | Story | Medium | 5 | System can follow up after delivery. |

## Epic 8: Analytics and Admin
| Issue Key | Summary | Type | Priority | Story Points | Acceptance Criteria |
|---|---|---|---|---:|---|
| LAM-29 | KPI dashboard | Story | High | 5 | Revenue, orders, and response time are visible. |
| LAM-30 | Conversation memory store | Story | Medium | 5 | Merchant preferences and customer history persist. |
| LAM-31 | Audit and logs | Story | High | 5 | Key actions are traceable. |
| LAM-32 | Multi-tenant access controls | Story | High | 8 | Merchants only see their own data. |

## Suggested Jira Labels
- epic:onboarding
- epic:catalog
- epic:payments
- epic:orders
- epic:complaints
- epic:growth
- epic:analytics
