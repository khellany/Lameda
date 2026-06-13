import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/crm/session'
import { safeDecrypt } from '@/lib/crypto/pii'
import { formatNaira } from '@/lib/ai/respond'
import type { Enums } from '@/types/database'
import { StatusBadge, formatDate } from './_ui'

function BotHealthBadge({ score }: { score: number | null }) {
  if (score === null) return null
  const healthy = score >= 80
  const degraded = score >= 50 && score < 80
  const cls = healthy
    ? 'bg-emerald-50 text-emerald-700'
    : degraded
    ? 'bg-amber-50 text-amber-700'
    : 'bg-red-50 text-red-700'
  const dot = healthy ? 'bg-emerald-500' : degraded ? 'bg-amber-400' : 'bg-red-500'
  const label = healthy ? 'Bot healthy' : degraded ? 'Bot degraded' : 'Bot unhealthy'
  return (
    <Link
      href="/dashboard/settings"
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label} ({score}/100)
    </Link>
  )
}

export const dynamic = 'force-dynamic'

const PAID_STATUSES: Enums<'order_status'>[] = ['paid', 'shipped', 'delivered']

export default async function OverviewPage() {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant) redirect('/login')
  const merchantId = ctx.merchant.id

  const db = createAdminClient()

  // Bot health score (migration 018). Null until the daily cron has run at least once.
  const { data: healthRow } = await db
    .from('merchants')
    .select('bot_health_score')
    .eq('id', merchantId)
    .single()
  const botHealthScore = healthRow?.bot_health_score ?? null

  const [ordersCountRes, customersCountRes, revenueRes, recentRes] = await Promise.all([
    db.from('orders').select('*', { count: 'exact', head: true }).eq('merchant_id', merchantId),
    db.from('customers').select('*', { count: 'exact', head: true }).eq('merchant_id', merchantId),
    // Revenue = sum of paid+ orders. Scoped to a single column.
    // NOTE (tech debt): unbounded row read — move to a Postgres aggregate/RPC or a
    // materialised view once merchants exceed a few thousand orders.
    db.from('orders').select('total_kobo').eq('merchant_id', merchantId).in('status', PAID_STATUSES),
    db
      .from('orders')
      .select('id, reference, status, total_kobo, created_at, customers!inner ( display_name )')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const revenueKobo = (revenueRes.data ?? []).reduce((s, r) => s + (r.total_kobo ?? 0), 0)
  const recent = recentRes.data ?? []

  const stats: { label: string; value: string | number }[] = [
    { label: 'Total orders', value: ordersCountRes.count ?? 0 },
    { label: 'Revenue (paid)', value: formatNaira(revenueKobo) },
    { label: 'Customers', value: customersCountRes.count ?? 0 },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Overview</h1>
        <p className="text-sm text-zinc-500">A snapshot of your store.</p>
      </div>

      {botHealthScore !== null && (
        <div className="flex items-center gap-2">
          <BotHealthBadge score={botHealthScore} />
          {botHealthScore < 80 && (
            <span className="text-xs text-zinc-400">
              Review your bot settings to improve delivery.
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-zinc-100 p-5">
            <p className="text-sm text-zinc-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900">Recent orders</h2>
          <Link href="/dashboard/orders" className="text-sm text-zinc-500 hover:text-zinc-900">
            View all &rarr;
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-400">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-400 border-b border-zinc-100">
                  <th className="px-5 py-2.5 font-medium">Reference</th>
                  <th className="px-5 py-2.5 font-medium">Customer</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium text-right">Total</th>
                  <th className="px-5 py-2.5 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => {
                  const cust = o.customers as unknown as { display_name: string | null } | null
                  return (
                    <tr key={o.id} className="border-b border-zinc-50 last:border-0">
                      <td className="px-5 py-3 font-medium text-zinc-900">{o.reference}</td>
                      <td className="px-5 py-3 text-zinc-600">
                        {safeDecrypt(cust?.display_name ?? null) || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-900">
                        {formatNaira(o.total_kobo)}
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-500">
                        {formatDate(o.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
