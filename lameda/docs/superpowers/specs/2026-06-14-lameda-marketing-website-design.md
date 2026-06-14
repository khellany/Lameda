# Lameda Marketing Website — Design Spec

**Date:** 2026-06-14
**Status:** Approved
**Replaces:** `lameda/src/app/page.tsx` (current placeholder)

---

## 1. Goal

Replace the placeholder homepage with a fully functional, single long-scroll marketing website that educates a sceptical Nigerian merchant and converts them to a free trial. The primary CTA deep-links into the Telegram bot onboarding flow. No signup form lives on the website itself.

Conversion funnel: **Read and trust → Click "Start free trial" → Telegram bot → Complete onboarding**

---

## 2. Target Audience

All Nigerian merchants, with solo hustlers and small shop owners (1-5 staff) as the emotional core.

- Primary pain: manually tracking orders in DMs
- Secondary pain: missing sales that come in at night
- They are sceptical by default — fraud is a lived experience
- They are mobile-first; many will view this on a low-bandwidth Android phone
- They do not have (or want) a developer

---

## 3. Tone and Voice

- **Headlines:** short, direct, punchy — no adjectives doing the work that specifics can do
- **Body copy:** warm, relatable, conversational — speaks the merchant's internal monologue
- **Naija flavour:** permitted in subheadlines and supporting copy ("no wahala", etc.)
- **No em dashes** anywhere in copy
- **No jargon:** "bot" is fine; "commerce infrastructure" is not for this audience
- Concrete numbers over vague claims ("4 taps", "5 minutes", "14 days")

---

## 4. Visual Direction

- **Primary background:** deep indigo `#1e1b4b`
- **Surface / card background:** `#2d2a6e` (slightly lighter indigo for cards on dark sections)
- **Light sections background:** `#f8f7ff` (near-white with a whisper of indigo — for pain, features sections)
- **Primary accent:** electric lime `#a3e635`
- **Primary text (on dark):** white `#ffffff`
- **Secondary text (on dark):** lavender `#a5b4fc`
- **Primary text (on light):** deep indigo `#1e1b4b`
- **Secondary text (on light):** `#6b7280`
- **Accent badge / highlight backgrounds:** `#a3e635` with `#1e1b4b` text
- **Borders (on light sections):** `#e0e7ff`
- **Final CTA section:** `#1e1b4b` background (same as hero) — page bookends match
- **Typography:** Poppins (headings, weights 600/700/800) + Inter (body, weights 400/500/600) — loaded from Google Fonts
- **No gradients** — flat colour only
- **Border radius:** 10-12px on cards, 6px on buttons
- **Nav background:** `#1e1b4b` (matches hero, appears as one unified top block)

---

## 5. Page Structure

Single long-scroll page at `/`. Sections in order:

### 5.1 Nav

Sticky top navigation.

| Element | Detail |
|---|---|
| Logo | Indigo-on-lime square icon + "Lameda" wordmark in white |
| Links | "How it works" (smooth scroll), "Pricing" (smooth scroll), "Sign in" — text in lavender `#a5b4fc` |
| CTA | "Start free" button in electric lime `#a3e635` with indigo text — links to `/register` |
| Mobile | Hamburger collapse on small screens |

### 5.2 Hero

**Headline:**
> From 'I want it' to 'order confirmed' in 4 taps.

**Subheadline:**
> Lameda turns your product catalogue into a shopping experience inside WhatsApp and Telegram — no website, no app, no developer needed.

**Supporting line (electric lime, bold):**
> They tap. They browse. They pay. You get notified.

**Primary CTA button:**
> Set up my store — it's free →

**Below CTA (small text):**
> 14-day free trial · No card required · Live in 5 minutes

**Channel pills (below CTA):**
- Green pill: "Telegram — available now"
- Grey pill: "WhatsApp — coming soon"

**Trust row (below pills):**
- Lock icon + "Payments by Paystack"
- Flag icon + "NDPR Compliant"
- Tick icon + "CAC Registered"

### 5.3 Pain Section

**Label:** "Sound familiar?"

**Section headline:**
> Running a business from your DMs is exhausting.

**Subheadline:**
> You did not start a business to spend your whole day copying orders and chasing payments.

**Four pain cards (2x2 grid). Priority order — cards 1 and 2 get green top border:**

| # | Emoji | Title | Body copy |
|---|---|---|---|
| 1 | 📋 | Order chaos | "Customer sends a message. You reply. You note it somewhere. Then you forget. Then they ask again." |
| 2 | 🌙 | Missed night sales | "A customer wanted to buy at 11pm. Nobody replied. By morning, they had found someone else." |
| 3 | 💸 | "I have paid" — have they? | "They send a screenshot. You check your account. You wait. You release the goods. It bounces." |
| 4 | 📢 | Restocked. Nobody knows. | "New stock arrived. You post a status. 20 people see it. Your other 300 customers have no idea." |

**Bridge line (centred, bold):**
> Lameda handles all of this. Automatically.

### 5.4 How It Works

**Section headline:**
> You set up once. Your customers buy forever.

**Two sub-sections:**

**For the merchant — 3 steps with numbered circles and connector line:**

| Step | Title | Body |
|---|---|---|
| 1 | Add your products | "Upload photos, set prices, connect your Paystack account. Takes about 5 minutes." |
| 2 | Share your link | "You get a unique store link. Drop it in your WhatsApp status, Telegram channel, or Instagram bio." |
| 3 | Get paid automatically | "Orders come in, payments are verified by Paystack, and you are notified. No manual checking." |

**For the customer — 4 tap cards (horizontal row):**

| Tap | Emoji | Label | Sub-label |
|---|---|---|---|
| 1 | 💬 | Open the store link | "In WhatsApp or Telegram" |
| 2 | 🛍️ | Browse and pick an item | "No scrolling through DMs" |
| 3 | ✅ | Confirm the order | "Quantity, address, done" |
| 4 (dark green card) | 💳 | Pay securely | "Card, transfer, USSD" |

**Closing line:**
> Order placed. Payment verified. You both get a confirmation. That is it.

### 5.5 Features

**Label:** "What Lameda does for you"

**Section headline:**
> Everything your store needs. Nothing you do not.

**Six feature cards (2x3 grid):**

| Emoji | Title | Body |
|---|---|---|
| 🤖 | 24/7 automated store | "Your bot takes orders and answers product questions while you sleep, eat, or rest." |
| ✅ | Verified payments only | "Paystack confirms every payment before your customer gets an order confirmation. No more fake alerts." |
| 📦 | Product catalogue | "Add photos, prices, and descriptions. Your customers browse it directly inside WhatsApp or Telegram." |
| 📊 | Sales dashboard | "See every order, every payment, and every customer in one place. No more counting notebooks." |
| 📢 | Customer broadcasts | "Restocked? New promo? Send a message to all your opted-in customers at once." |
| 👥 | Team access | "Add sales reps who can manage orders and customers without accessing your payments or settings." |

### 5.6 Pricing

**Section headline:**
> Simple. Naira. No surprises.

**Subheadline:**
> Start free for 14 days. No card required.

**Three tier cards (Starter highlighted as "Most popular" → **NOTE:** confirm with owner whether Growth or Starter should be highlighted):**

| Tier | Price | Blurb | Included | Not included |
|---|---|---|---|---|
| Starter | ₦5,000/mo | For new stores | Bot store (Telegram), unlimited products, Paystack payments, order notifications | Broadcasts, team access |
| Growth | ₦15,000/mo | For busy stores | Everything in Starter + broadcasts, sales analytics, 1 sales rep | WhatsApp, priority support |
| Pro | ₦40,000/mo | For high-volume stores | Everything in Growth + WhatsApp (coming), multiple sales reps, advanced analytics, priority support, dedicated onboarding | |

**Footer line below cards:**
> All plans include a 14-day free trial. Payments processed securely by Paystack.

**Open question:** Which tier card gets "Most popular" badge — Growth or Starter? Currently shows Growth. Owner to confirm.

**Open question:** Exact feature gates per tier (broadcasts on Starter? how many reps on Growth vs Pro?) — owner to confirm before build.

### 5.7 Trust Section

**Label:** "Built to be trusted"

**Section headline:**
> Your money and your data are safe with us.

**Three trust cards:**

| Emoji | Title | Body |
|---|---|---|
| 🔒 | Payments by Paystack | "Every transaction goes through Paystack, a CBN-licensed payment processor." |
| 🇳🇬 | NDPR Compliant | "Your customer data is stored and handled in line with Nigeria Data Protection Regulation." |
| 📋 | CAC Registered | "Lameda is a registered Nigerian business. We are not going anywhere." |

**Early adopter card (full width, below trust cards):**

> **Be among the first.**
> Lameda is new and growing. Early merchants get direct access to us — your feedback shapes what we build next. This is your chance to get in before everyone else does.

### 5.8 Final CTA Section

Dark green background (`#0d1f14`).

**Headline:**
> Your first sale is closer than you think.

**Subheadline:**
> Set up your store in 5 minutes. No code. No developer. Free for 14 days.

**CTA button (same as hero):**
> Launch my free store →

**Small text below:**
> Available now on Telegram. WhatsApp coming soon.

### 5.9 Footer

- Logo + wordmark (left)
- Links: How it works, Pricing, Sign in, Privacy Policy, Terms
- Copyright: "© 2025 Lameda. All rights reserved. Lagos, Nigeria."

---

## 6. Primary CTA Behaviour

All CTA buttons ("Start free trial", "Set up my store", "Launch my free store") follow this flow:

```
CTA click → /register (website signup page) → Telegram bot → complete onboarding
```

The `/register` page already exists in the codebase (`src/app/(auth)/register` or equivalent). After successful registration, the merchant is directed to launch their Telegram bot to complete the onboarding flow.

The Telegram bot deep-link URL is injected from an environment variable so it can change without a deploy:

```
NEXT_PUBLIC_TELEGRAM_BOT_URL=https://t.me/YourBotName
```

When WhatsApp support ships, a second env var `NEXT_PUBLIC_WHATSAPP_URL` will be added and the CTA can be updated to show both channel options.

---

## 7. Technical Constraints

- Framework: Next.js App Router (existing project)
- File: `lameda/src/app/page.tsx` — full replacement
- Styling: Tailwind CSS (existing)
- Page type: `export const dynamic = 'force-static'` — this is a pure marketing page, no auth required
- Smooth scroll: nav anchor links use `scroll-behavior: smooth` via Tailwind or CSS
- Mobile-first: all grids collapse to single column on small screens
- Performance: no heavy JS — no Three.js, no animation libraries needed on this page
- Images: none required at MVP; emoji used as visual anchors throughout
- No form on this page — all conversion happens via Telegram deep-link

---

## 8. Out of Scope (for this build)

- `/pricing`, `/how-it-works`, `/about` sub-pages (Approach A = single page)
- Blog or SEO content pages
- WhatsApp CTA (placeholder pill only — goes active when WhatsApp ships)
- Named testimonials or merchant logos (no social proof available yet)
- Animation or scroll effects (can be added in a polish pass)
- Cookie consent banner (add before public launch)

---

## 9. Open Questions (owner to resolve before build)

1. What is the exact Telegram bot deep-link URL? (needed for `NEXT_PUBLIC_TELEGRAM_BOT_URL`)
2. Which tier shows "Most popular" — Growth or Starter?
3. Confirm feature gates: does Starter include broadcasts? How many reps per tier?
4. CAC registration number — should it be shown visibly on the page or just in the footer/Privacy Policy?
5. Any social media handles to include in the footer?

---

*Spec approved by owner on 2026-06-14. Ready for implementation planning.*
