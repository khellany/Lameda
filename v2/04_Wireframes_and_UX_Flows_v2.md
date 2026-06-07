# Lameda - Wireframes and UX Flows v2
**Version:** 2.0 | **Date:** May 2026

---

## Changelog from v1
- Added error states for all 12 primary flows
- Added empty states (first login, no products, no conversations, no orders)
- Added human handoff UI with merchant alert and conversation takeover
- Added abandoned cart recovery flow with 15-minute trigger
- Added mobile-first dashboard layout
- Added accessibility annotations (WCAG 2.1 AA target)

---

## 1. Merchant Onboarding Flow

### Screen 1: Welcome Bot (WhatsApp)
- Greeting with Lameda persona
- Qualification questions: product category, volume, current pain point
- CTA: "Get started free - no card needed"

**Error state:** If user does not respond within 10 minutes, send single follow-up: "Still there? Reply YES to continue or NO to unsubscribe."

### Screen 2: Magic Link Activation (Web)
- Business name, email, phone
- OTP verification via WhatsApp
- Account created confirmation

**Error state:** OTP expired - show "Code expired. Tap to resend." with 60-second countdown before resend is active.

### Screen 3: Setup Wizard (5 steps, progress bar)
1. Connect WhatsApp Business number (QR code or manual phone entry)
2. Upload product catalog (CSV or manual entry, max 100 SKUs for Starter)
3. Set delivery zones and fees
4. Set return and refund policy
5. Choose AI persona name and tone (professional / friendly / Pidgin)

**Empty state on step 2:** "No products yet. Upload a CSV or add your first product manually." with sample CSV download link.

**Error state on step 1:** WhatsApp connection failed - "We could not verify your number. Make sure WhatsApp Business is installed and try again." with troubleshooting link.

**Completion:** Confetti animation + "Your Lameda store is live! Share this link: wa.me/[number]?text=Hi"

---

## 2. Customer Conversation Flow (WhatsApp)

### 2.1 Product Inquiry
```
Customer: "Do you have Ankara tops in size M?"
Lameda: [Product card with image, price, available sizes]
         "Yes! We have 3 Ankara tops in size M. Which colour do you prefer?"
Customer: "The blue one"
Lameda: [Variant confirmed] "The Blue Ankara Top (Size M) is ₦18,500. 
         Shall I add it to your order?"
```

**Low confidence fallback (AI score < 0.7):**
Lameda: "Let me connect you with [Merchant name] for more details on this."
- Trigger: human handoff flow

**Error state - product not found:**
Lameda: "I could not find that exact item. Here are the closest matches:" [3 suggestions]
"None of these? Reply NOTIFY to be alerted when it arrives."

### 2.2 Image-Based Search
```
Customer: [Sends photo of dress]
Lameda: "Great taste! Here are 3 similar items from our store:" [image cards]
```

**Error state - poor image quality:**
Lameda: "I could not read that image clearly. Please send a clearer photo, or describe what you are looking for."

### 2.3 Order Placement
```
Lameda: "Your order summary:
         - Blue Ankara Top (M) x1 - ₦18,500
         Delivery to Lagos Mainland - ₦1,500
         Total: ₦20,000
         
         Please confirm your delivery address:"
Customer: [Sends address]
Lameda: "Got it. Pay securely here: [Paystack link]
         Link expires in 30 minutes."
```

**Error state - payment link expired:**
Lameda: "Your payment link expired. Reply RENEW to get a fresh link."

**Error state - payment failed:**
Lameda: "We could not confirm your payment. Please try again or use a different card: [new link]"

### 2.4 Post-Payment Confirmation
```
Lameda: "Payment confirmed! Order #ORD-2847 is being prepared.
         Estimated delivery: 2-3 business days.
         Reply TRACK to check your order status anytime."
```

---

## 3. Abandoned Cart Recovery Flow

**Trigger:** Customer adds item to cart (order captured in system) but no payment in 15 minutes.

**Message 1 (15 min after inactivity):**
"Hey! You left something behind. Your Blue Ankara Top is still reserved for you. Complete your order here: [link] - expires in 2 hours."

**Message 2 (2 hours after Message 1, if no payment):**
"Last chance - your reservation expires soon! The Blue Ankara Top (Size M) is still available. Tap to pay: [link]"

**Message 3 (if merchant enables discount automation):**
"We would hate to lose you as a customer. Here is 5% off your order. Use code SAVE5 at checkout: [link]"

**Stop condition:** Payment received at any point cancels remaining messages.

**Error state:** If customer replies "NOT INTERESTED" or "STOP" - mark as opted out, do not send further cart recovery messages for this session.

---

## 4. Human Handoff Flow

**Triggers (any of the following):**
- AI confidence score < 0.7 on intent classification
- Customer uses keywords: "angry", "rubbish", "fraud", "complaint", "manager", "refund"
- Customer requests human explicitly: "I want to talk to a person"
- Complex negotiation: price below listed price requested

**WhatsApp to customer:**
"I am connecting you with [Merchant first name] right now. Average wait time: under 5 minutes. Your conversation history has been shared."

**Merchant dashboard alert:**
- Push notification: "Handoff required - [Customer name] - [Reason]"
- Red badge on Conversations tab
- Full conversation thread visible
- Action buttons: [Take Over] [Assign to Staff] [Snooze 10 min]

**Takeover modal:**
- Shows customer name, order history, last 10 messages
- Quick reply templates: greeting, apology, "I will check and come back to you"
- Toggle: "Resume AI after this conversation" (default ON)

**Resume AI:**
- Merchant clicks "Resume AI" button
- Customer receives: "You are back with our automated assistant. How can I help?"

**Error state - merchant does not respond within 5 minutes:**
- Customer receives: "Our team is currently busy. We will get back to you within 30 minutes."
- Dashboard escalation notification sent to backup contact

---

## 5. Order Management Dashboard (Web)

### 5.1 Main Dashboard Layout (Mobile-first, responsive)

**Header:** Logo | Search bar | Notifications (badge) | Profile

**Bottom navigation (mobile):**
- Home (today's summary)
- Orders (active + history)
- Conversations (live chats)
- Products (catalog)
- Analytics

**Home tab cards:**
- Today's Revenue: ₦XX,XXX
- New Orders: X
- Pending Handoffs: X (red if > 0)
- Abandoned Carts: X

**Empty state (new merchant, no data):**
"Your dashboard is ready. Share your WhatsApp link to get your first order." + [Copy link] button

### 5.2 Orders View

**Active orders list:** Order ID | Customer | Items | Amount | Status | Action
**Status pills:** New | Confirmed | Processing | Dispatched | Delivered | Cancelled

**Order detail view:**
- Customer info + WhatsApp button (one tap to message)
- Item list with images
- Payment status (Paystack reference, timestamp)
- Delivery address + map pin
- Action buttons: [Mark Dispatched] [Cancel] [Refund]

**Empty state:** "No orders yet. When customers complete checkout, they appear here."

**Error state - status update failed:** "Could not update order status. Check your connection and try again." with retry button.

### 5.3 Conversations View

**Tabs:** Active (live) | Handoffs (needs attention, red badge) | All

**Conversation item:** Avatar | Customer name | Last message preview | Time | Status dot (green=AI active, orange=waiting, red=handoff)

**Empty state:** "No active conversations. Customers will appear here when they message your WhatsApp number."

### 5.4 Product Catalog View

**Grid/list toggle.** Each card: Product image | Name | Price | Stock | Status toggle

**Add product form:** Name | Description | Price | Category | Stock | Sizes (multi-select) | Colors | Images (up to 5, drag-drop) | Publish toggle

**Empty state:** "Your catalog is empty. Add products manually or upload a CSV." with [Add Product] and [Upload CSV] buttons.

**Error state - image upload failed:** "Image upload failed. Max size is 5MB. Supported formats: JPG, PNG." with retry.

---

## 6. Broadcast Campaign Flow

### Create Campaign
1. Select audience (all customers / segment by tag / last order date)
2. Compose message (text + optional image, max 1024 chars)
3. Preview on mock WhatsApp screen
4. Schedule (send now / specific date-time)
5. Review: recipient count, estimated cost (N0.38/message from Termii)
6. Confirm and send

**Error state - message too long:** "WhatsApp limits broadcast messages to 1024 characters. You are X characters over."

**Error state - audience too small:** "You need at least 1 recipient. Add customers first."

---

## 7. Analytics View

**Date range picker** (last 7 / 30 / 90 days / custom)

**Key metrics (cards):**
- Total Revenue
- Conversations Started
- Orders Completed
- Conversion Rate (conversations to orders)
- Average Order Value
- AI Handoff Rate
- Abandoned Cart Recovery Rate

**Charts:**
- Revenue over time (line)
- Orders by status (donut)
- Top products by revenue (bar)
- Peak conversation hours (heatmap)

**Empty state (< 7 days data):** "Not enough data yet. Come back after 7 days of activity."

---

## 8. Accessibility Notes (WCAG 2.1 AA)

- All interactive elements minimum 44x44px touch target
- Color is never the sole means of conveying information (status pills include text label)
- All images have alt text
- Form fields have visible labels (not placeholder-only)
- Error messages specify what went wrong and how to fix it
- Keyboard navigable dashboard (tab order follows visual layout)
- Minimum 4.5:1 contrast ratio for body text
