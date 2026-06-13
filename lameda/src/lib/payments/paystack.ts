/**
 * Paystack API client.
 *
 * Used for:
 *  1. initializeTransaction  — generate a checkout URL to send the customer
 *  2. verifyWebhookSignature — validate inbound Paystack webhook events
 *
 * REQUIRES:
 *  PAYSTACK_SECRET_KEY — from Paystack dashboard (Settings → API Keys)
 *
 * Reference: https://paystack.com/docs/api/transaction/
 */

import crypto from 'crypto'
import { logger } from '@/lib/utils/logger'

const PAYSTACK_BASE = 'https://api.paystack.co'

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface PaystackInitResult {
  authorization_url: string  // redirect the customer here to pay
  access_code: string        // stored in payments table
  reference: string          // echoed back — same as what we sent
}

export interface PaystackChargeEvent {
  event: 'charge.success' | string
  data: {
    reference: string
    amount: number            // in kobo
    status: string
    channel: string
    paid_at: string
    customer: { email: string }
    metadata: Record<string, unknown>
  }
}

/**
 * Broader webhook event shape covering both one-off charges and native
 * subscription lifecycle events (STORY-034). All fields are optional because
 * the union of Paystack event payloads is wide; handlers read defensively.
 *
 * Events of interest:
 *   charge.success            — money received (order OR subscription, incl. renewals)
 *   subscription.create       — recurring subscription established (has subscription_code, next_payment_date)
 *   invoice.payment_failed    — a renewal charge failed
 *   subscription.disable      — subscription cancelled / exhausted
 */
export interface PaystackWebhookEvent {
  event: string
  data: {
    reference?: string
    amount?: number
    status?: string
    channel?: string
    paid_at?: string
    next_payment_date?: string
    subscription_code?: string
    email_token?: string
    customer?: { email?: string; customer_code?: string }
    plan?: { plan_code?: string; name?: string; amount?: number }
    subscription?: { subscription_code?: string; next_payment_date?: string }
    metadata?: Record<string, unknown>
  }
}

// ----------------------------------------------------------------
// Initialize transaction
// ----------------------------------------------------------------

/**
 * Creates a Paystack checkout session and returns the payment URL.
 * The URL expires after 30 minutes.
 *
 * @param amountKobo  — total in kobo (e.g. 4500000 = ₦45,000)
 * @param email       — customer email (synthetic ok: chatId@telegram.lameda.bot)
 * @param reference   — our order reference (e.g. LMD-XXXXX) — must be unique
 * @param callbackUrl — where Paystack redirects after payment (unused in bot flow)
 * @param metadata    — arbitrary data echoed back in webhook
 */
export async function initializeTransaction({
  amountKobo,
  email,
  reference,
  callbackUrl,
  metadata,
  plan,
}: {
  amountKobo: number
  email: string
  reference: string
  callbackUrl: string
  metadata: Record<string, unknown>
  /** Paystack Plan code (PLN_…). When set, Paystack sets up native recurring billing. */
  plan?: string
}): Promise<PaystackInitResult | null> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    logger.error('PAYSTACK_SECRET_KEY is not configured')
    return null
  }

  try {
    const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountKobo,
        reference,
        callback_url: callbackUrl,
        metadata,
        currency: 'NGN',
        channels: ['card', 'bank', 'ussd', 'bank_transfer'],
        // When a plan code is supplied, Paystack creates a recurring subscription
        // after the first successful charge and ignores `amount` in favour of the plan.
        ...(plan ? { plan } : {}),
      }),
    })

    const body = await res.json()

    if (!body.status) {
      logger.error({ message: body.message, reference }, 'Paystack transaction init failed')
      return null
    }

    return {
      authorization_url: body.data.authorization_url,
      access_code: body.data.access_code,
      reference: body.data.reference,
    }
  } catch (err) {
    logger.error({ err, reference }, 'Paystack initializeTransaction network error')
    return null
  }
}

// ----------------------------------------------------------------
// Webhook signature verification
// ----------------------------------------------------------------

/**
 * Verifies the X-Paystack-Signature header using HMAC-SHA512.
 * MUST be called before trusting any Paystack webhook payload.
 *
 * @param rawBody   — raw request body string (before JSON.parse)
 * @param signature — value of X-Paystack-Signature header
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) return false

  const expected = crypto
    .createHmac('sha512', secretKey)
    .update(rawBody)
    .digest('hex')

  return expected === signature
}
