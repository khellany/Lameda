/**
 * /dashboard/billing — STORY-034
 *
 * Merchant subscription billing. Shows current status (trial / active / suspended),
 * renewal or trial end date, and tier cards that start a Paystack checkout.
 *
 * Activation is driven by the Paystack webhook (authoritative) — the ?status=success
 * banner shown after redirect is cosmetic and does not itself grant access.
 */

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/crm/session'
import { getAllTierConfigs } from '@/lib/payments/subscription'
import { formatNaira } from '@/lib/ai/respond'
import { SubscribeButton } from './SubscribeButton'

export const dynamic = 'force-dynamic'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NG', { dateStyle: 'medium' })
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant) redirect('/login')

  const sp = await searchParams
  const justPaid = sp.status === 'success'

  const db = createAdminClient()

  const { data: merchant } = await db
    .from('merchants')
    .select('subscription_tier, subscription_status, trial_ends_at, subscription_renews_at')
    .eq('id', ctx.merchant.id)
    .single()

  const status = merchant?.subscription_status ?? 'trial'
  const tiers = getAllTierConfigs()

  const statusBadge =
    status === 'active'
      ? { text: 'Active', cls: 'bg-emerald-50 text-emerald-700' }
      : status === 'suspended'
      ? { text: 'Suspended', cls: 'bg-red-50 text-red-700' }
      : status === 'cancelled'
      ? { text: 'Cancelled', cls: 'bg-zinc-100 text-zinc-500' }
      : { text: 'Trial', cls: 'bg-amber-50 text-amber-700' }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Billing</h1>
        <p className="text-sm text-zinc-500">Manage your Lameda subscription.</p>
      </div>

      {justPaid && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl px-5 py-4 text-sm">
          <p className="font-semibold">Payment received — thank you! 🎉</p>
          <p className="mt-0.5 text-emerald-700">
            Your subscription will show as active here within a minute, once Paystack
            confirms the payment.
          </p>
        </div>
      )}

      {/* Current status */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900">Current plan</h2>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge.cls}`}>
            {statusBadge.text}
          </span>
        </div>
        <p className="text-sm text-zinc-600 capitalize">
          {merchant?.subscription_tier ?? 'starter'} tier
        </p>
        <p className="text-xs text-zinc-400">
          {status === 'active'
            ? `Renews on ${formatDate(merchant?.subscription_renews_at ?? null)}`
            : status === 'trial'
            ? `Trial ends on ${formatDate(merchant?.trial_ends_at ?? null)}`
            : status === 'suspended'
            ? 'Your last payment did not go through. Choose a plan below to reactivate.'
            : 'No active subscription.'}
        </p>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tiers.map((t) => {
          const isCurrent = status === 'active' && merchant?.subscription_tier === t.tier
          const highlighted = t.tier === 'growth'
          return (
            <div
              key={t.tier}
              className={[
                'rounded-2xl border p-5 flex flex-col gap-3',
                highlighted ? 'border-zinc-900 bg-white shadow-sm' : 'border-zinc-100 bg-white',
              ].join(' ')}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-zinc-900">{t.label}</h3>
                  {highlighted && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-900 text-white font-medium">
                      Popular
                    </span>
                  )}
                </div>
                <p className="mt-1 text-2xl font-bold text-zinc-900">
                  {formatNaira(t.amountKobo)}
                  <span className="text-sm font-normal text-zinc-400">/mo</span>
                </p>
                <p className="mt-1 text-xs text-zinc-500">{t.blurb}</p>
              </div>
              <div className="mt-auto">
                <SubscribeButton
                  tier={t.tier}
                  label={t.label}
                  highlighted={highlighted}
                  current={isCurrent}
                />
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-zinc-400">
        Payments are processed securely by Paystack. You can change or cancel your plan
        anytime — your bot keeps running until the end of your paid period.
      </p>
    </div>
  )
}
