# Design Documentation

**Domain:** Product Design and UX
**Canonical Version:** v3 (Design Philosophy) + v2 (Wireframes)

---

## Documents in This Category

### 1. Design Philosophy
- **Source:** `../../v3/design/Lameda_Design_Philosophy.md`
- **Version:** v3 (authoritative)
- **Coverage:** Brand principles, visual identity guidelines, design language, component philosophy

### 2. Visual Identity
- **Source:** `../../v3/design/Lameda_Visual_Identity_v3.png`
- **Type:** PNG image
- **Coverage:** Logo, color palette, typography specimen

### 3. Wireframes and UX Flows
- **Source:** `../../v2/04_Wireframes_and_UX_Flows_v2.md`
- **Version:** v2 (authoritative)
- **Coverage:** All core flows with error states, empty states, WCAG accessibility notes

---

## UX Scope

Lameda has two distinct interface contexts:

### 1. WhatsApp Bot Interface (Customer-Facing)

This is not a traditional UI - it is a conversational experience inside WhatsApp. Design decisions here are about:
- Message structure and length
- Button label clarity (WhatsApp supports quick reply buttons with 20-char limit)
- Flow branching logic (how the bot handles ambiguous inputs)
- Error recovery language (when customer says something unexpected)
- Payment confirmation messaging
- Abandoned cart follow-up tone and timing

Key WhatsApp UX constraints:
- No images in message flows (catalog images via separate link)
- Button labels max 20 characters
- List messages max 10 items per section
- No markdown in standard messages (bold with asterisks, italic with underscores)

### 2. Merchant Operator Dashboard (Merchant-Facing Web App)

The web dashboard is where merchants:
- Upload and manage their product catalog
- Configure bot personality and responses
- View conversation history and order log
- Track revenue and performance metrics
- Manage subscription and billing

**Design principle:** Merchants are WhatsApp-native, not app-native. The dashboard must feel as simple as using WhatsApp itself. No jargon. No complex navigation. One task per screen.

---

## Core UX Flows

### Flow 1: Product Inquiry
```
Customer sends message: "Do you have size 12 ankara dress?"
  -> Bot: "Yes! Here are our ankara dresses in size 12:" [list]
  -> Customer selects item
  -> Bot: "Here's [Product Name] - N45,000" + image link + "Add to cart?"
  -> Customer: "Yes" or "No"
```

### Flow 2: Cart and Checkout
```
Customer: "I want to buy it"
  -> Bot confirms cart contents + total
  -> Bot asks for delivery address
  -> Bot asks for delivery method (pickup / delivery)
  -> Bot summarizes order + total with delivery
  -> Customer confirms
  -> Bot sends Paystack payment link
  -> Customer pays
  -> Bot confirms payment + gives order reference
  -> Merchant is notified via WhatsApp
```

### Flow 3: Abandoned Cart Recovery
```
Customer adds to cart but does not complete payment
  -> 2-hour timer starts (BullMQ job)
  -> Bot sends: "You left something in your cart!" + cart summary + payment link
  -> If no response in 24 hours: final follow-up + 5% discount code
```

### Flow 4: Merchant Onboarding
```
Merchant lands on lameda.ng
  -> Signs up (email + phone)
  -> Uploads catalog (CSV template or manual form)
  -> Connects WhatsApp number (Business API verification)
  -> Configures bot name and personality
  -> Tests bot with sample customer conversation
  -> Goes live
```

---

## Accessibility (WCAG 2.1 AA - Dashboard)

| Requirement | Implementation |
|------------|---------------|
| Color contrast | Minimum 4.5:1 for all text elements |
| Keyboard navigation | All dashboard actions reachable via keyboard |
| Screen reader support | Semantic HTML, ARIA labels on icon buttons |
| Touch targets | Minimum 44x44px on mobile dashboard view |
| Font size | Base 16px, no text below 14px |
| Error states | Color + icon + text (not color alone) |

---

## Design Tokens (Brand)

| Token | Value |
|-------|-------|
| Primary color | Deep green (Nigerian market resonance, trust) |
| Accent color | Warm amber (energy, commerce) |
| Background | Off-white / light grey |
| Text primary | Near-black (#1A1A1A) |
| Font (headings) | Inter or similar geometric sans |
| Font (body) | Inter or similar - high legibility on mobile |
| Border radius | 8px (rounded but not playful) |
| Shadow | Subtle - 0 2px 8px rgba(0,0,0,0.08) |
