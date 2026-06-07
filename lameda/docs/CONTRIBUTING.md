# Contributing to Lameda

This guide is for engineers joining the project or handing over work.

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 11+
- A Supabase account (free tier is fine for local dev)
- A Termii account with WhatsApp enabled

### Local Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd LamedaBot/lameda

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.local.example .env.local
# Edit .env.local with your Supabase and Termii credentials

# 4. Apply database migrations
# Install Supabase CLI: npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase db push

# 5. Generate TypeScript types from schema
npx supabase gen types typescript --project-id your-project-ref > src/types/database.ts

# 6. Start dev server
npm run dev
```

App runs at: http://localhost:3000
Health check: http://localhost:3000/api/health
Webhook endpoint: http://localhost:3000/api/webhook/whatsapp

---

## Project Structure

```
lameda/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── webhook/whatsapp/route.ts  ← WhatsApp webhook (start here)
│   │   │   ├── webhook/paystack/route.ts  ← Paystack payment webhook (Sprint 2)
│   │   │   └── health/route.ts            ← Health check
│   │   └── (merchant)/                    ← Merchant dashboard (Sprint 2)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts     ← Browser client (Client Components)
│   │   │   └── server.ts     ← Server client + admin client
│   │   ├── whatsapp/
│   │   │   ├── types.ts      ← Message types + normalizer
│   │   │   ├── verify.ts     ← HMAC signature verification
│   │   │   └── client.ts     ← Termii API calls
│   │   ├── ai/               ← (Sprint 2) Claude + OpenAI clients
│   │   ├── queue/            ← (Sprint 2) pg-boss job definitions
│   │   └── utils/
│   │       └── logger.ts     ← Pino structured logger
│   └── types/
│       └── database.ts       ← Supabase table types (regenerate from schema)
└── supabase/
    └── migrations/
        ├── 001_initial_schema.sql  ← Tables, enums, NDPR procedure
        └── 002_rls_policies.sql    ← Row Level Security
```

---

## Code Standards

### Comments

Write comments only for the WHY, not the WHAT. Good names explain the what.

```typescript
// Good: explains a non-obvious constraint
// Termii retries on non-200, so return 200 even on processing errors.
return NextResponse.json({ received: true })

// Bad: narrates the code
// Return JSON response with received true
return NextResponse.json({ received: true })
```

### Technical Debt

When taking a shortcut:
1. Add a `TECHNICAL DEBT` comment at the code location.
2. Add an entry to `docs/TECHNICAL_DEBT.md` with the TD number, file, why, and fix trigger.

Do not leave undocumented shortcuts. They become invisible bugs.

### Money

Always store in kobo. Never in Naira floats.

```typescript
// Correct
const priceKobo = 450000 // N4,500

// Wrong - floating point errors
const priceNaira = 4500.00
```

### Error Handling

Webhook handlers must never return 5xx — Termii and Paystack retry on non-200.
Log the error, mark the webhook event as failed, return 200.

```typescript
// Wrong
return NextResponse.json({ error: 'DB failed' }, { status: 500 })

// Correct
logger.error({ err }, 'DB failed')
await markWebhookFailed(supabase, webhookEventId, String(err))
return NextResponse.json({ received: true })
```

---

## Git Workflow

### Branch naming

```
feature/TD-NNN-short-description
fix/short-description
sprint/sprint-N-description
```

### Commit message format

```
type(scope): short description

type: feat | fix | docs | refactor | test | chore
scope: webhook | auth | db | queue | ai | dashboard

Examples:
feat(webhook): add Paystack payment confirmation handler
fix(whatsapp): handle undefined button_reply payload
docs(debt): add TD-011 for missing input validation
```

### Before pushing

```bash
npm run lint
npm run type-check
npm run build   # catch build errors before CI does
```

---

## Testing WhatsApp Webhooks Locally

Use ngrok or Cloudflare Tunnel to expose localhost to Termii:

```bash
# Option 1: ngrok
npx ngrok http 3000

# Option 2: Cloudflare Tunnel (free, no account needed)
npx cloudflared tunnel --url http://localhost:3000
```

Set the public URL as your Termii webhook URL in the dashboard.
Use the same `TERMII_WEBHOOK_SECRET` in both places.

---

## Environment Variables

See `.env.local.example` for the full list with descriptions.

Never commit real keys. The `.gitignore` excludes `.env.local` and all `.env*` files.
`.env.local.example` is committed — it is a safe template with no real values.

---

## Handover Checklist

If handing this project to another engineer:

- [ ] Share Supabase project access (Settings > Access Control)
- [ ] Share Termii account credentials
- [ ] Share Paystack dashboard access
- [ ] Share Vercel project access
- [ ] Transfer `ANTHROPIC_API_KEY` via secrets manager (never email/Slack)
- [ ] Walk through `docs/TECHNICAL_DEBT.md` — explain all open items
- [ ] Run through the local setup steps together
- [ ] Send first test WhatsApp message end-to-end in their environment
