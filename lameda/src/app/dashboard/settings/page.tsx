/**
 * /dashboard/settings — STORY-033
 *
 * Merchant settings: public directory opt-in + bot health readout.
 */

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/crm/session'
import { DirectoryToggle } from './DirectoryToggle'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function healthLabel(score: number | null): { text: string; color: string } {
  if (score === null) return { text: 'Not yet checked', color: 'text-zinc-400' }
  if (score >= 80) return { text: `Healthy (${score}/100)`, color: 'text-emerald-600' }
  if (score >= 50) return { text: `Degraded (${score}/100)`, color: 'text-amber-600' }
  return { text: `Unhealthy (${score}/100)`, color: 'text-red-600' }
}

function healthDot(score: number | null): string {
  if (score === null) return 'bg-zinc-300'
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 50) return 'bg-amber-400'
  return 'bg-red-500'
}

export default async function SettingsPage() {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant) redirect('/login')
  if (ctx.role === 'sales_rep') redirect('/dashboard')

  const db = createAdminClient()

  const { data: merchant } = await db
    .from('merchants')
    .select('business_name, bot_name, is_directory_listed, bot_health_score, bot_health_checked_at')
    .eq('id', ctx.merchant.id)
    .single()

  const isListed = merchant?.is_directory_listed ?? false
  const healthScore = merchant?.bot_health_score ?? null
  const checkedAt = merchant?.bot_health_checked_at
    ? new Date(merchant.bot_health_checked_at).toLocaleString('en-NG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null

  const { text: healthText, color: healthColor } = healthLabel(healthScore)

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Settings</h1>
        <p className="text-sm text-zinc-500">Manage your store's visibility and bot health.</p>
      </div>

      {/* Bot health */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-3">
        <h2 className="font-semibold text-zinc-900">Bot health</h2>
        <div className="flex items-center gap-2.5">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${healthDot(healthScore)}`} />
          <span className={`text-sm font-medium ${healthColor}`}>{healthText}</span>
        </div>
        <p className="text-xs text-zinc-400">
          {checkedAt
            ? `Last checked: ${checkedAt}`
            : 'Health check runs daily at 07:00 WAT. Scores reflect bot token validity and broadcast delivery rate over the last 7 days.'}
        </p>
        {healthScore !== null && healthScore < 50 && (
          <div className="text-xs bg-red-50 text-red-700 rounded-lg px-3 py-2.5 space-y-1">
            <p className="font-semibold">Action needed</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Confirm your bot token is still active in @BotFather</li>
              <li>Check if customers have blocked your bot</li>
              <li>Review failed broadcasts in the Broadcasts tab</li>
            </ul>
          </div>
        )}
        {healthScore !== null && healthScore >= 50 && healthScore < 80 && (
          <p className="text-xs bg-amber-50 text-amber-700 rounded-lg px-3 py-2">
            Delivery rate is below target. Review recent broadcasts for failed sends.
          </p>
        )}
      </div>

      {/* Directory listing */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-zinc-900">Public directory</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Let new customers find your store on{' '}
              <Link href="/discover" className="underline text-zinc-700" target="_blank">
                /discover
              </Link>
              .
            </p>
          </div>
        </div>
        <DirectoryToggle
          initialListed={isListed}
          businessName={merchant?.business_name ?? ctx.merchant.id}
        />
      </div>
    </div>
  )
}
