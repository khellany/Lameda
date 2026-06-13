/**
 * /dashboard/referrals — STORY-032
 *
 * Shows the merchant's referral code, share link, referred-merchant count,
 * and the total trial days earned from referrals.
 */

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/crm/session'
import { ReferralCopyButton } from './ReferralCopyButton'

export const dynamic = 'force-dynamic'

export default async function ReferralsPage() {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant) redirect('/login')

  const merchantId = ctx.merchant.id
  const db = createAdminClient()

  const { data: merchant } = await db
    .from('merchants')
    .select('referral_code, trial_ends_at, subscription_status')
    .eq('id', merchantId)
    .single()

  const referralCode = merchant?.referral_code ?? null

  const { count: referralCount } = referralCode
    ? await db
        .from('merchants')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by_code', referralCode)
        .eq('is_active', true)
    : { count: 0 }

  // Reward fires on the referred merchant's FIRST PAYMENT (STORY-034), so days
  // earned reflects only referrals that converted to a paying (active) subscription.
  const { count: payingReferralCount } = referralCode
    ? await db
        .from('merchants')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by_code', referralCode)
        .eq('is_active', true)
        .eq('subscription_status', 'active')
    : { count: 0 }

  const rewardDaysEarned = (payingReferralCount ?? 0) * 30

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Referrals</h1>
        <p className="text-sm text-zinc-500">
          Refer another merchant and earn <strong>30 free days</strong> when they subscribe.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Merchants referred', value: referralCount ?? 0 },
          { label: 'Paying referrals', value: payingReferralCount ?? 0 },
          { label: 'Days earned', value: rewardDaysEarned },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-zinc-100 p-5 text-center">
            <p className="text-2xl font-bold text-zinc-900">{s.value}</p>
            <p className="text-xs text-zinc-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Share card */}
      {referralCode ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-4">
          <h2 className="font-semibold text-zinc-900">Your referral link</h2>
          <p className="text-sm text-zinc-500">
            Share this link with other business owners. When they sign up and go live,
            you automatically get 30 days added to your trial.
          </p>
          <ReferralCopyButton referralCode={referralCode} />
          <p className="text-xs text-zinc-400">
            Your code: <span className="font-mono font-medium text-zinc-700">{referralCode}</span>
          </p>
        </div>
      ) : (
        <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-6 text-sm text-zinc-500">
          Referral code not yet generated. It will appear here on your next dashboard load.
        </div>
      )}

      {/* How it works */}
      <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-5">
        <h2 className="font-semibold text-zinc-800 mb-3 text-sm">How it works</h2>
        <ol className="space-y-2 text-sm text-zinc-600 list-decimal list-inside">
          <li>Share your referral link with another business owner.</li>
          <li>They sign up using your link or enter your code at registration.</li>
          <li>Once their bot is live, <strong>30 days are added to your trial automatically</strong>.</li>
          <li>No limit — refer as many merchants as you like.</li>
        </ol>
      </div>
    </div>
  )
}
