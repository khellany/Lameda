/**
 * Merchant subscription billing config (STORY-034).
 *
 * Maps each subscription tier to its monthly price (kobo) and — for native
 * Paystack recurring billing — its Paystack Plan code. Both are read from env so
 * pricing can change without a deploy and plan codes never live in source.
 *
 * Configure in Vercel env (Production + Preview):
 *   SUBSCRIPTION_PRICE_STARTER_KOBO, SUBSCRIPTION_PRICE_GROWTH_KOBO, SUBSCRIPTION_PRICE_PRO_KOBO
 *   PAYSTACK_PLAN_STARTER, PAYSTACK_PLAN_GROWTH, PAYSTACK_PLAN_PRO   (plan codes: PLN_xxx)
 *
 * If a plan code is set, the checkout uses Paystack's native recurring
 * subscription (auto-renews monthly). If only a price is set, it's a one-off
 * charge that the merchant must repeat each cycle. If neither is set, checkout
 * for that tier is disabled (the init action returns a clear error).
 *
 * The PLACEHOLDER prices below are used only when the matching env var is unset —
 * they exist so the flow is demonstrable in dev. SET REAL PRICES IN ENV BEFORE LAUNCH.
 */

import type { Enums } from '@/types/database'

export type SubscriptionTier = Enums<'subscription_tier'> // 'starter' | 'growth' | 'pro'

export interface TierConfig {
  tier: SubscriptionTier
  label: string
  /** Monthly price in kobo (₦ ×100). */
  amountKobo: number
  /** Paystack Plan code (PLN_…) for native recurring billing, or null for one-off. */
  planCode: string | null
  /** Short marketing blurb for the billing page. */
  blurb: string
}

// PLACEHOLDER monthly prices (kobo) — overridden by env. EDIT / set env before launch.
const PLACEHOLDER_PRICE_KOBO: Record<SubscriptionTier, number> = {
  starter: 5_000_00, // ₦5,000
  growth: 15_000_00, // ₦15,000
  pro: 40_000_00, // ₦40,000
}

const TIER_META: Record<SubscriptionTier, { label: string; blurb: string }> = {
  starter: { label: 'Starter', blurb: 'For new stores getting their first orders.' },
  growth: { label: 'Growth', blurb: 'For busy stores scaling up sales.' },
  pro: { label: 'Pro', blurb: 'For high-volume merchants who need it all.' },
}

function priceKobo(tier: SubscriptionTier): number {
  const raw = process.env[`SUBSCRIPTION_PRICE_${tier.toUpperCase()}_KOBO`]
  const parsed = raw ? parseInt(raw, 10) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : PLACEHOLDER_PRICE_KOBO[tier]
}

function planCode(tier: SubscriptionTier): string | null {
  const code = process.env[`PAYSTACK_PLAN_${tier.toUpperCase()}`]
  return code && code.trim() ? code.trim() : null
}

export function getTierConfig(tier: SubscriptionTier): TierConfig {
  return {
    tier,
    label: TIER_META[tier].label,
    blurb: TIER_META[tier].blurb,
    amountKobo: priceKobo(tier),
    planCode: planCode(tier),
  }
}

export const ALL_TIERS: SubscriptionTier[] = ['starter', 'growth', 'pro']

export function getAllTierConfigs(): TierConfig[] {
  return ALL_TIERS.map(getTierConfig)
}

/** True when env var SUBSCRIPTION_PRICE_<TIER>_KOBO is explicitly set (not placeholder). */
export function isPricingConfigured(tier: SubscriptionTier): boolean {
  const raw = process.env[`SUBSCRIPTION_PRICE_${tier.toUpperCase()}_KOBO`]
  const parsed = raw ? parseInt(raw, 10) : NaN
  return Number.isFinite(parsed) && parsed > 0
}
