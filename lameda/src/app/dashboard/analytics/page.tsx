/**
 * /dashboard/analytics — STORY-029
 *
 * Merchant analytics: revenue trend, conversion funnel, peak hours,
 * and cart recovery rate. All server-rendered with inline SVG charts —
 * zero client JS bundle cost.
 *
 * NOTE (tech debt): aggregations below do row-level reads grouped in
 * TypeScript. Move heavy queries to Postgres RPCs / materialized views
 * once any merchant exceeds ~10k orders or ~50k messages.
 */

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/crm/session'
import { formatNaira } from '@/lib/ai/respond'
import type { Enums } from '@/types/database'

export const dynamic = 'force-dynamic'

const PAID_STATUSES: Enums<'order_status'>[] = ['paid', 'shipped', 'delivered']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoDateLabel(iso: string) {
  return iso.slice(0, 10) // 'YYYY-MM-DD'
}

/** Last N calendar days (UTC), newest first */
function lastNDays(n: number): string[] {
  const days: string[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

/** Render a simple inline SVG bar chart (server-side, no JS) */
function BarChart({
  data,
  height = 56,
}: {
  data: { label: string; value: number }[]
  height?: number
}) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const w = 100 / data.length
  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
      aria-hidden="true"
    >
      {data.map((d, i) => {
        const barH = (d.value / max) * (height - 4)
        return (
          <rect
            key={d.label}
            x={i * w + w * 0.15}
            y={height - barH}
            width={w * 0.7}
            height={barH}
            rx={2}
            className="fill-zinc-800"
            opacity={d.value === 0 ? 0.12 : 0.85}
          />
        )
      })}
    </svg>
  )
}

/** Percentage bar */
function PctBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-zinc-800 rounded-full"
        style={{ width: `${Math.min(100, Math.round(pct))}%` }}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant) redirect('/login')
  const merchantId = ctx.merchant.id

  const db = createAdminClient()
  const days30 = lastNDays(30)
  const since30 = `${days30[days30.length - 1]}T00:00:00.000Z`

  // ── Fetch raw data ──────────────────────────────────────────────────────────

  const [ordersRes, conversationsRes, messagesRes, recoveryRes] = await Promise.all([
    // All orders in last 30 days
    db
      .from('orders')
      .select('id, status, total_kobo, created_at')
      .eq('merchant_id', merchantId)
      .gte('created_at', since30),
    // All conversations (funnel)
    db
      .from('conversations')
      .select('id, cart, cart_recovery_1_sent_at')
      .eq('merchant_id', merchantId),
    // Messages for peak-hour analysis (last 30 days)
    db
      .from('messages')
      .select('created_at')
      .eq('merchant_id', merchantId)
      .eq('direction', 'inbound')
      .gte('created_at', since30),
    // Orders linked to conversations that had cart recovery sent
    db
      .from('orders')
      .select('conversation_id')
      .eq('merchant_id', merchantId)
      .in('status', PAID_STATUSES),
  ])

  const orders = ordersRes.data ?? []
  const conversations = conversationsRes.data ?? []
  const messages = messagesRes.data ?? []
  const recoveredConvIds = new Set((recoveryRes.data ?? []).map((o) => o.conversation_id))

  // ── Revenue trend (last 14 days shown in chart) ─────────────────────────────

  const revenueByDay = new Map<string, number>()
  for (const o of orders) {
    if (!PAID_STATUSES.includes(o.status as Enums<'order_status'>)) continue
    const day = isoDateLabel(o.created_at)
    revenueByDay.set(day, (revenueByDay.get(day) ?? 0) + (o.total_kobo ?? 0))
  }

  const chartDays = days30.slice(0, 14).reverse()
  const revenueChartData = chartDays.map((d) => ({
    label: d.slice(5), // 'MM-DD'
    value: revenueByDay.get(d) ?? 0,
  }))

  const totalRevenue30 = [...revenueByDay.values()].reduce((s, v) => s + v, 0)
  const totalOrders30 = orders.length
  const paidOrders30 = orders.filter((o) =>
    PAID_STATUSES.includes(o.status as Enums<'order_status'>),
  ).length

  // ── Conversion funnel ────────────────────────────────────────────────────────

  const totalConvs = conversations.length
  const cartsAdded = conversations.filter((c) => {
    const cart = c.cart as { items?: unknown[] } | null
    return Array.isArray(cart?.items) && cart.items.length > 0
  }).length
  const totalOrdersAllTime = (
    await db.from('orders').select('*', { count: 'exact', head: true }).eq('merchant_id', merchantId)
  ).count ?? 0
  const paidOrdersAllTime = (
    await db.from('orders').select('*', { count: 'exact', head: true }).eq('merchant_id', merchantId).in('status', PAID_STATUSES)
  ).count ?? 0

  const funnelSteps = [
    { label: 'Conversations started', value: totalConvs, pct: 100 },
    { label: 'Added to cart', value: cartsAdded, pct: totalConvs ? (cartsAdded / totalConvs) * 100 : 0 },
    { label: 'Orders placed', value: totalOrdersAllTime, pct: cartsAdded ? (totalOrdersAllTime / cartsAdded) * 100 : 0 },
    { label: 'Paid', value: paidOrdersAllTime, pct: totalOrdersAllTime ? (paidOrdersAllTime / totalOrdersAllTime) * 100 : 0 },
  ]

  // ── Peak hours ───────────────────────────────────────────────────────────────

  const hourCounts = new Array<number>(24).fill(0)
  for (const m of messages) {
    const h = new Date(m.created_at).getUTCHours()
    // Shift to WAT (UTC+1)
    const watH = (h + 1) % 24
    hourCounts[watH]++
  }
  const peakHours = hourCounts
    .map((count, h) => ({ hour: h, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // ── Cart recovery ────────────────────────────────────────────────────────────

  const recoverySent = conversations.filter((c) => c.cart_recovery_1_sent_at).length
  const recoveryConverted = conversations.filter(
    (c) => c.cart_recovery_1_sent_at && recoveredConvIds.has(c.id),
  ).length
  const recoveryRate = recoverySent > 0 ? (recoveryConverted / recoverySent) * 100 : 0

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Analytics</h1>
        <p className="text-sm text-zinc-500">Last 30 days · all times in WAT</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Revenue (paid)', value: formatNaira(totalRevenue30) },
          { label: 'Orders', value: totalOrders30 },
          { label: 'Paid orders', value: paidOrders30 },
          { label: 'Messages received', value: messages.length },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-zinc-100 p-5">
            <p className="text-xs text-zinc-400">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue trend */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-5">
        <h2 className="font-semibold text-zinc-900 mb-1">Revenue trend</h2>
        <p className="text-xs text-zinc-400 mb-4">Paid orders · last 14 days</p>
        <BarChart data={revenueChartData} height={72} />
        <div className="flex justify-between text-[10px] text-zinc-300 mt-1">
          <span>{revenueChartData[0]?.label}</span>
          <span>{revenueChartData[revenueChartData.length - 1]?.label}</span>
        </div>
      </div>

      {/* Conversion funnel */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-5">
        <h2 className="font-semibold text-zinc-900 mb-4">Conversion funnel</h2>
        <div className="space-y-4">
          {funnelSteps.map((step, i) => (
            <div key={step.label}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-zinc-600">
                  <span className="text-zinc-300 mr-2">{i + 1}</span>
                  {step.label}
                </span>
                <span className="font-medium text-zinc-900">
                  {step.value.toLocaleString()}{' '}
                  {i > 0 && (
                    <span className="text-xs text-zinc-400 font-normal">
                      ({Math.round(step.pct)}%)
                    </span>
                  )}
                </span>
              </div>
              <PctBar pct={step.pct} />
            </div>
          ))}
        </div>
      </div>

      {/* Peak hours + Cart recovery side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Peak hours */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-5">
          <h2 className="font-semibold text-zinc-900 mb-1">Peak hours</h2>
          <p className="text-xs text-zinc-400 mb-4">Inbound messages · WAT</p>
          {messages.length === 0 ? (
            <p className="text-sm text-zinc-400">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {peakHours.map(({ hour, count }) => {
                const label = `${String(hour).padStart(2, '0')}:00`
                const pct = (count / Math.max(...peakHours.map((h) => h.count), 1)) * 100
                return (
                  <div key={hour} className="flex items-center gap-3 text-sm">
                    <span className="w-12 text-zinc-500 tabular-nums">{label}</span>
                    <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-800 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-zinc-400 text-xs tabular-nums">{count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Cart recovery */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-5">
          <h2 className="font-semibold text-zinc-900 mb-1">Cart recovery</h2>
          <p className="text-xs text-zinc-400 mb-4">Automated follow-up performance</p>
          <div className="space-y-5">
            {[
              { label: 'Recovery messages sent', value: recoverySent },
              { label: 'Converted to paid order', value: recoveryConverted },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-xs text-zinc-400 mb-0.5">{s.label}</p>
                <p className="text-2xl font-bold text-zinc-900">{s.value}</p>
              </div>
            ))}
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-zinc-600">Recovery rate</span>
                <span className="font-medium text-zinc-900">{Math.round(recoveryRate)}%</span>
              </div>
              <PctBar pct={recoveryRate} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
