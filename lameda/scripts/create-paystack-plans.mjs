/**
 * Creates (or reuses) the three Paystack subscription Plans for STORY-034,
 * verifies each one exists under the supplied key's mode, and prints the env
 * lines to paste into Vercel.
 *
 * Idempotent: looks up existing plans by name first and reuses their plan_code,
 * so re-running never creates duplicates.
 *
 * Prices mirror src/lib/payments/subscription.ts — set SUBSCRIPTION_PRICE_<TIER>_KOBO
 * in your env first to override the placeholders, so the Plan amount matches what
 * the app charges.
 *
 * Run:
 *   node --env-file=.env.local scripts/create-paystack-plans.mjs
 *
 * Then copy the printed PAYSTACK_PLAN_* / SUBSCRIPTION_PRICE_*_KOBO lines into
 * Vercel → Settings → Environment Variables (Production + Preview), and redeploy.
 *
 * REQUIRES: PAYSTACK_SECRET_KEY in env (sk_test_… or sk_live_…).
 *
 * NOTE ON MODE: plans created with a test key exist only in test mode and have
 * different plan codes from live. Create plans with the SAME key (mode) your
 * production app uses, or the app will reference codes that don't exist.
 */

const PAYSTACK_BASE = 'https://api.paystack.co'

// Placeholder monthly prices (kobo) — must match subscription.ts. Override via env.
const PLACEHOLDER_PRICE_KOBO = {
  starter: 5_000_00, // ₦5,000
  growth: 15_000_00, // ₦15,000
  pro: 40_000_00, // ₦40,000
}

const TIERS = ['starter', 'growth', 'pro']

const naira = (kobo) => `₦${(kobo / 100).toLocaleString('en-NG')}`

function priceKobo(tier) {
  const raw = process.env[`SUBSCRIPTION_PRICE_${tier.toUpperCase()}_KOBO`]
  const parsed = raw ? parseInt(raw, 10) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : PLACEHOLDER_PRICE_KOBO[tier]
}

function planName(tier) {
  return `Lameda ${tier.charAt(0).toUpperCase() + tier.slice(1)} (Monthly)`
}

const secretKey = process.env.PAYSTACK_SECRET_KEY
if (!secretKey) {
  console.error('✗ PAYSTACK_SECRET_KEY is not set. Run with: node --env-file=.env.local scripts/create-paystack-plans.mjs')
  process.exit(1)
}

// Detect mode from the key prefix so the operator knows which environment they're touching.
const mode = secretKey.startsWith('sk_live_')
  ? 'LIVE'
  : secretKey.startsWith('sk_test_')
    ? 'TEST'
    : 'UNKNOWN'

const headers = {
  Authorization: `Bearer ${secretKey}`,
  'Content-Type': 'application/json',
}

async function listExistingPlans() {
  const res = await fetch(`${PAYSTACK_BASE}/plan?perPage=100`, { headers })
  const body = await res.json()
  if (!body.status) throw new Error(`List plans failed: ${body.message}`)
  return body.data ?? []
}

async function createPlan(name, amountKobo) {
  const res = await fetch(`${PAYSTACK_BASE}/plan`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, amount: amountKobo, interval: 'monthly', currency: 'NGN' }),
  })
  const body = await res.json()
  if (!body.status) throw new Error(`Create plan failed (${name}): ${body.message}`)
  return body.data
}

/** Fetch a plan back by its code to confirm it's retrievable under this key's mode. */
async function verifyPlan(planCode) {
  const res = await fetch(`${PAYSTACK_BASE}/plan/${planCode}`, { headers })
  const body = await res.json()
  if (!body.status || !body.data?.plan_code) {
    throw new Error(`Verify failed for ${planCode}: ${body.message ?? 'not found'}`)
  }
  return body.data
}

async function main() {
  console.log(`\nPaystack mode: ${mode}${mode === 'UNKNOWN' ? ' (key prefix not recognised — check it is a valid secret key)' : ''}`)
  if (mode === 'UNKNOWN') {
    console.error('✗ PAYSTACK_SECRET_KEY does not start with sk_test_ or sk_live_. Aborting.')
    process.exit(1)
  }
  console.log('')

  const existing = await listExistingPlans()
  const byName = new Map(existing.map((p) => [p.name, p]))

  const envLines = []
  for (const tier of TIERS) {
    const name = planName(tier)
    const amountKobo = priceKobo(tier)

    let plan = byName.get(name)
    if (plan) {
      console.log(`= ${name}: reusing ${plan.plan_code} (${naira(plan.amount)})`)
      if (plan.amount !== amountKobo) {
        console.log(`  ⚠ amount mismatch — Paystack plan is ${naira(plan.amount)} but env/placeholder is ${naira(amountKobo)}.`)
        console.log(`    Update the plan amount in the Paystack dashboard, or align SUBSCRIPTION_PRICE_${tier.toUpperCase()}_KOBO.`)
      }
    } else {
      plan = await createPlan(name, amountKobo)
      console.log(`+ ${name}: created ${plan.plan_code} (${naira(amountKobo)})`)
    }

    // Verify the plan is retrievable under this key's mode.
    const verified = await verifyPlan(plan.plan_code)
    console.log(`  ✓ verified ${verified.plan_code} — ${naira(verified.amount)}/${verified.interval}, ${mode} mode`)

    envLines.push(`PAYSTACK_PLAN_${tier.toUpperCase()}=${plan.plan_code}`)
    envLines.push(`SUBSCRIPTION_PRICE_${tier.toUpperCase()}_KOBO=${amountKobo}   # ${naira(amountKobo)}`)
  }

  console.log(`\n--- Paste into Vercel env (Production + Preview), then redeploy [${mode} mode] ---`)
  console.log('(strip the "# ₦…" comment after each price — it is for your reference only)\n')
  console.log(envLines.join('\n'))
  console.log('')
}

main().catch((err) => {
  console.error('✗', err.message)
  process.exit(1)
})
