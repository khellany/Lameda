/**
 * POST /api/webhooks/paystack
 *
 * Handles inbound Paystack webhook events.
 *
 * Two payment domains share this one webhook:
 *   1. CUSTOMER ORDERS    — matched by the `LMD-` order reference (original flow).
 *   2. MERCHANT SUBSCRIPTIONS (STORY-034) — identified by `metadata.type === 'subscription'`
 *      on the first charge, and by Paystack plan/subscription/customer codes on renewals.
 *
 * Subscription lifecycle handled:
 *   charge.success (subscription) → activate, extend renews_at, fire referral reward (once)
 *   subscription.create           → store subscription_code + customer_code + next_payment_date
 *   invoice.payment_failed        → suspend
 *   subscription.disable / .not_renew → suspend
 *
 * Security: every request is verified with HMAC-SHA512 before any DB read/write.
 * Always return 200 (even on bad signature) so Paystack retries don't leak validity.
 *
 * REQUIRES: PAYSTACK_SECRET_KEY environment variable.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  verifyWebhookSignature,
  type PaystackWebhookEvent,
} from '@/lib/payments/paystack'
import { sendTextMessage, sendButtonsMessage } from '@/lib/telegram/client'
import { createAdminClient } from '@/lib/supabase/server'
import { safeDecrypt } from '@/lib/crypto/pii'
import { hashForSearch } from '@/lib/crypto/hash'
import { formatNaira } from '@/lib/ai/respond'
import { logger } from '@/lib/utils/logger'

type AdminClient = ReturnType<typeof createAdminClient>
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

interface SubscriptionMeta {
  type?: string
  merchant_id?: string
  tier?: string
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature') ?? ''

  // Step 1: Verify signature — reject silently on failure (200 to stop retries).
  if (!verifyWebhookSignature(rawBody, signature)) {
    logger.warn('Paystack webhook signature verification failed')
    return NextResponse.json({ ok: true })
  }

  let event: PaystackWebhookEvent
  try {
    event = JSON.parse(rawBody) as PaystackWebhookEvent
  } catch {
    return NextResponse.json({ ok: true })
  }

  const supabase = createAdminClient()
  const meta = (event.data?.metadata ?? {}) as SubscriptionMeta
  const isSubscriptionCharge =
    event.event === 'charge.success' &&
    (meta.type === 'subscription' || Boolean(event.data?.plan?.plan_code))

  // ── Subscription domain (STORY-034) ──────────────────────────────────────
  if (isSubscriptionCharge) {
    await handleSubscriptionCharge(supabase, event, meta)
    return NextResponse.json({ ok: true })
  }
  if (event.event === 'subscription.create') {
    await handleSubscriptionCreate(supabase, event)
    return NextResponse.json({ ok: true })
  }
  if (
    event.event === 'invoice.payment_failed' ||
    event.event === 'subscription.disable' ||
    event.event === 'subscription.not_renew'
  ) {
    await handleSubscriptionLapse(supabase, event)
    return NextResponse.json({ ok: true })
  }

  // ── Customer-order domain (original flow) ────────────────────────────────
  if (event.event !== 'charge.success') {
    return NextResponse.json({ ok: true })
  }

  const reference = event.data.reference
  if (!reference) return NextResponse.json({ ok: true })
  logger.info({ reference, amount: event.data.amount }, 'Paystack charge.success received')

  // Find order by reference
  const { data: order } = await supabase
    .from('orders')
    .select('id, merchant_id, customer_id, conversation_id, total_kobo, reference')
    .eq('reference', reference)
    .maybeSingle()

  if (!order) {
    logger.warn({ reference }, 'Paystack webhook: order not found')
    return NextResponse.json({ ok: true })
  }

  await supabase.from('orders').update({ status: 'paid' }).eq('id', order.id)

  await supabase
    .from('payments')
    .update({
      status: 'success',
      payment_channel: event.data.channel,
      paid_at: event.data.paid_at,
    })
    .eq('paystack_reference', reference)

  const [{ data: merchant }, { data: customer }] = await Promise.all([
    supabase.from('merchants').select('telegram_bot_token').eq('id', order.merchant_id).single(),
    supabase.from('customers').select('phone_number').eq('id', order.customer_id).single(),
  ])

  if (merchant?.telegram_bot_token && customer?.phone_number) {
    // Tokens are encrypted at rest (Sprint 5); fall back to raw for legacy tokens.
    const botToken = safeDecrypt(merchant.telegram_bot_token) ?? merchant.telegram_bot_token
    const confirmMsg =
      `✅ *Payment Received!*\n\n` +
      `Order *${order.reference}* — *${formatNaira(order.total_kobo)}*\n\n` +
      `Your payment has been confirmed. We'll start processing your order now. ` +
      `You'll hear from us soon with delivery details! 🎉`

    await sendTextMessage(botToken, customer.phone_number, confirmMsg)

    const followUpMsg = `Is there anything else you'd like to order? 😊`
    await sendButtonsMessage(botToken, customer.phone_number, followUpMsg, [
      { id: 'browse_all', title: '🛍 Shop More' },
      { id: 'session_done', title: '✅ That\'s All' },
    ])
  }

  if (order.conversation_id) {
    await supabase
      .from('conversations')
      .update({
        state: { phase: 'completed', channel: 'telegram', activeOrderId: order.id },
        last_message_at: new Date().toISOString(),
      })
      .eq('id', order.conversation_id)
  }

  logger.info({ orderId: order.id, reference }, 'Order marked paid, customer notified')
  return NextResponse.json({ ok: true })
}

// ════════════════════════════════════════════════════════════════════════════
// Subscription handlers (STORY-034)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Resolves the merchant a subscription event belongs to. Tries, in order:
 *   1. metadata.merchant_id (present on the first/initiating charge)
 *   2. paystack_subscription_code (stored from subscription.create)
 *   3. paystack_customer_code (stored from subscription.create)
 *   4. email_hash of the Paystack customer email (merchant's real email at init)
 */
async function resolveSubscriptionMerchant(
  supabase: AdminClient,
  event: PaystackWebhookEvent,
  meta: SubscriptionMeta,
) {
  const cols = 'id, referred_by_code, referral_rewarded_at, telegram_bot_token, admin_telegram_chat_id'

  if (meta.merchant_id) {
    const { data } = await supabase.from('merchants').select(cols).eq('id', meta.merchant_id).maybeSingle()
    if (data) return data
  }

  const subCode = event.data?.subscription_code ?? event.data?.subscription?.subscription_code
  if (subCode) {
    const { data } = await supabase
      .from('merchants')
      .select(cols)
      .eq('paystack_subscription_code', subCode)
      .maybeSingle()
    if (data) return data
  }

  const customerCode = event.data?.customer?.customer_code
  if (customerCode) {
    const { data } = await supabase
      .from('merchants')
      .select(cols)
      .eq('paystack_customer_code', customerCode)
      .maybeSingle()
    if (data) return data
  }

  const email = event.data?.customer?.email
  if (email) {
    const { data } = await supabase
      .from('merchants')
      .select(cols)
      .eq('email_hash', hashForSearch(email))
      .maybeSingle()
    if (data) return data
  }

  return null
}

/** A successful subscription charge: activate, extend access, reward referrer once. */
async function handleSubscriptionCharge(
  supabase: AdminClient,
  event: PaystackWebhookEvent,
  meta: SubscriptionMeta,
) {
  const merchant = await resolveSubscriptionMerchant(supabase, event, meta)
  if (!merchant) {
    logger.warn(
      { reference: event.data?.reference, event: 'subscription.charge_unmatched' },
      'Paystack subscription charge could not be matched to a merchant',
    )
    return
  }

  // Next renewal: prefer Paystack's next_payment_date, else 30 days out.
  const nextPaymentDate =
    event.data?.next_payment_date ?? event.data?.subscription?.next_payment_date
  const renewsAt = nextPaymentDate
    ? new Date(nextPaymentDate).toISOString()
    : new Date(Date.now() + THIRTY_DAYS_MS).toISOString()

  await supabase
    .from('merchants')
    .update({
      subscription_status: 'active',
      subscription_renews_at: renewsAt,
      ...(event.data?.customer?.customer_code
        ? { paystack_customer_code: event.data.customer.customer_code }
        : {}),
    })
    .eq('id', merchant.id)

  logger.info(
    { merchantId: merchant.id, tier: meta.tier, event: 'subscription.activated' },
    'Merchant subscription activated via Paystack charge',
  )

  // Notify the merchant in their admin Telegram chat, if linked.
  const botToken = merchant.telegram_bot_token
    ? safeDecrypt(merchant.telegram_bot_token) ?? merchant.telegram_bot_token
    : null
  if (botToken && merchant.admin_telegram_chat_id) {
    await sendTextMessage(
      botToken,
      merchant.admin_telegram_chat_id,
      `✅ *Subscription active!*\n\nThank you — your Lameda subscription is now active. ` +
        `Your bot will keep serving customers without interruption. 🎉`,
    ).catch(() => null)
  }

  // Referral reward (STORY-032, moved to first payment): fire exactly once.
  const referralRewardedAt = (merchant as { referral_rewarded_at?: string | null }).referral_rewarded_at
  if (merchant.referred_by_code && !referralRewardedAt) {
    await applyReferralReward(supabase, merchant.id, merchant.referred_by_code)
  }
}

/** subscription.create: persist Paystack handles + first renewal date. */
async function handleSubscriptionCreate(supabase: AdminClient, event: PaystackWebhookEvent) {
  const merchant = await resolveSubscriptionMerchant(supabase, event, {})
  if (!merchant) return

  const subCode = event.data?.subscription_code ?? event.data?.subscription?.subscription_code
  const nextPaymentDate =
    event.data?.next_payment_date ?? event.data?.subscription?.next_payment_date

  await supabase
    .from('merchants')
    .update({
      ...(subCode ? { paystack_subscription_code: subCode } : {}),
      ...(event.data?.customer?.customer_code
        ? { paystack_customer_code: event.data.customer.customer_code }
        : {}),
      ...(nextPaymentDate ? { subscription_renews_at: new Date(nextPaymentDate).toISOString() } : {}),
    })
    .eq('id', merchant.id)

  logger.info(
    { merchantId: merchant.id, event: 'subscription.create_stored' },
    'Stored Paystack subscription handles',
  )
}

/** invoice.payment_failed / subscription.disable: suspend the merchant. */
async function handleSubscriptionLapse(supabase: AdminClient, event: PaystackWebhookEvent) {
  const merchant = await resolveSubscriptionMerchant(supabase, event, {})
  if (!merchant) return

  await supabase
    .from('merchants')
    .update({ subscription_status: 'suspended' })
    .eq('id', merchant.id)

  logger.warn(
    { merchantId: merchant.id, event: event.event },
    'Merchant subscription lapsed/suspended',
  )
}

/**
 * Extends the referring merchant's access by 30 days, then stamps
 * referral_rewarded_at on the *referred* merchant so this fires only once.
 * Soft-fails: a bad/inactive code never blocks subscription activation.
 */
async function applyReferralReward(
  supabase: AdminClient,
  referredMerchantId: string,
  referralCode: string,
) {
  const { data: referrer } = await supabase
    .from('merchants')
    .select('id, trial_ends_at, subscription_renews_at, subscription_status')
    .eq('referral_code', referralCode)
    .eq('is_active', true)
    .neq('id', referredMerchantId)
    .maybeSingle()

  if (!referrer) {
    logger.warn(
      { referralCode, event: 'referral.code_not_found_at_payment' },
      'Referral code not found at first-payment reward time',
    )
    // Still stamp so we don't re-attempt on every renewal charge.
    await supabase
      .from('merchants')
      .update({ referral_rewarded_at: new Date().toISOString() })
      .eq('id', referredMerchantId)
    return
  }

  // Reward an active referrer by pushing their next renewal (a free month);
  // reward a trialing referrer by extending their trial. Floor at now so an
  // already-expired date still yields a full 30 days of value.
  if (referrer.subscription_status === 'active') {
    const base = referrer.subscription_renews_at
      ? Math.max(Date.now(), new Date(referrer.subscription_renews_at).getTime())
      : Date.now()
    await supabase
      .from('merchants')
      .update({ subscription_renews_at: new Date(base + THIRTY_DAYS_MS).toISOString() })
      .eq('id', referrer.id)
  } else {
    const base = referrer.trial_ends_at
      ? Math.max(Date.now(), new Date(referrer.trial_ends_at).getTime())
      : Date.now()
    await supabase
      .from('merchants')
      .update({ trial_ends_at: new Date(base + THIRTY_DAYS_MS).toISOString() })
      .eq('id', referrer.id)
  }

  await supabase
    .from('merchants')
    .update({ referral_rewarded_at: new Date().toISOString() })
    .eq('id', referredMerchantId)

  logger.info(
    { referrerId: referrer.id, referredMerchantId, event: 'referral.reward_applied_at_payment' },
    'Referral reward applied on referred merchant first payment',
  )
}
