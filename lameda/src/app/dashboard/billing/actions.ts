'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/crm/session'
import { initializeTransaction } from '@/lib/payments/paystack'
import { getTierConfig, type SubscriptionTier } from '@/lib/payments/subscription'
import { safeDecrypt } from '@/lib/crypto/pii'
import { logger } from '@/lib/utils/logger'

const VALID_TIERS: SubscriptionTier[] = ['starter', 'growth', 'pro']

/**
 * Starts a Paystack subscription checkout for the logged-in merchant and returns
 * the authorization URL for the client to redirect to. The webhook (authoritative)
 * activates the subscription once payment succeeds — the redirect is cosmetic.
 */
export async function startSubscriptionCheckout(
  tier: SubscriptionTier,
): Promise<{ url?: string; error?: string }> {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant) redirect('/login')

  if (!VALID_TIERS.includes(tier)) {
    return { error: 'Invalid plan selected.' }
  }

  const cfg = getTierConfig(tier)
  const db = createAdminClient()

  // Need the merchant's real email (encrypted at rest) for the Paystack customer.
  const { data: merchant } = await db
    .from('merchants')
    .select('id, email')
    .eq('id', ctx.merchant.id)
    .single()

  const email = merchant?.email ? safeDecrypt(merchant.email) ?? merchant.email : null
  if (!email) {
    return { error: 'Could not resolve your account email. Contact support.' }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const reference = `SUB-${ctx.merchant.id}-${Date.now()}`

  const result = await initializeTransaction({
    amountKobo: cfg.amountKobo,
    email,
    reference,
    callbackUrl: `${appUrl}/dashboard/billing?status=success`,
    metadata: { type: 'subscription', merchant_id: ctx.merchant.id, tier },
    plan: cfg.planCode ?? undefined,
  })

  if (!result) {
    logger.error({ merchantId: ctx.merchant.id, tier }, 'Subscription checkout init failed')
    return { error: 'Could not start checkout. Please try again shortly.' }
  }

  logger.info(
    { merchantId: ctx.merchant.id, tier, recurring: Boolean(cfg.planCode), event: 'subscription.checkout_started' },
    'Subscription checkout initialized',
  )
  return { url: result.authorization_url }
}
