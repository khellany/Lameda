import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/crm/session'
import { safeDecrypt } from '@/lib/crypto/pii'
import { formatNaira } from '@/lib/ai/respond'
import { StatusBadge, formatDate } from '../_ui'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20
const STATUSES = ['pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled'] as const
type Status = (typeof STATUSES)[number]

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant) redirect('/login')
  const merchantId = ctx.merchant.id

  const sp = await searchParams
  // Allowlist the status filter — never interpolate raw user input into the query.
  const status = STATUSES.includes(sp.status as Status) ? (sp.status as Status) : undefined
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const db = createAdminClient()
  let query = db
    .from('orders')
    .select(
      'id, reference, status, total_kobo, delivery_address, delivery_method, created_at, customers!inner ( phone_number, display_name )',
      { count: 'exact' },
    )
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .range(from, to)
  if (status) query = query.eq('status', status)

  const { data, count } = await query
  const orders = data ?? []
  const total = count ?? 0
  const hasPrev = page > 1
  const hasNext = from + orders.length < total

  // Build a filter-preserving link for the pager.
  const pageHref = (p: number) => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (p > 1) params.set('page', String(p))
    const s = params.toString()
    return s ? `/dashboard/orders?${s}` : '/dashboard/orders'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Orders</h1>
        <p className="text-sm text-zinc-500">{total} total{status ? ` · ${status}` : ''}</p>
      </div>

      {/* Status filter chips (each resets to page 1) */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/orders"
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !status
              ? 'bg-zinc-900 text-white border-zinc-900'
              : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
          }`}
        >
          All
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/dashboard/orders?status=${s}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-colors ${
              status === s
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        {orders.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-zinc-400">
            No orders{status ? ` with status “${status}”` : ' yet'}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-400 border-b border-zinc-100">
                  <th className="px-5 py-2.5 font-medium">Reference</th>
                  <th className="px-5 py-2.5 font-medium">Customer</th>
                  <th className="px-5 py-2.5 font-medium">Delivery</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium text-right">Total</th>
                  <th className="px-5 py-2.5 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const cust = o.customers as unknown as {
                    phone_number: string
                    display_name: string | null
                  } | null
                  return (
                    <tr key={o.id} className="border-b border-zinc-50 last:border-0 align-top">
                      <td className="px-5 py-3 font-medium text-zinc-900 whitespace-nowrap">
                        {o.reference}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">
                        <div>{safeDecrypt(cust?.display_name ?? null) || '—'}</div>
                        <div className="text-xs text-zinc-400">{cust?.phone_number ?? ''}</div>
                      </td>
                      <td className="px-5 py-3 text-zinc-600 max-w-[16rem]">
                        <div className="capitalize">{o.delivery_method ?? '—'}</div>
                        <div className="text-xs text-zinc-400 truncate">
                          {safeDecrypt(o.delivery_address) || ''}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-900 whitespace-nowrap">
                        {formatNaira(o.total_kobo)}
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-500 whitespace-nowrap">
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

      {/* Pager */}
      {(hasPrev || hasNext) && (
        <div className="flex items-center justify-between text-sm">
          {hasPrev ? (
            <Link href={pageHref(page - 1)} className="text-zinc-600 hover:text-zinc-900">
              &larr; Previous
            </Link>
          ) : (
            <span className="text-zinc-300">&larr; Previous</span>
          )}
          <span className="text-zinc-400">Page {page}</span>
          {hasNext ? (
            <Link href={pageHref(page + 1)} className="text-zinc-600 hover:text-zinc-900">
              Next &rarr;
            </Link>
          ) : (
            <span className="text-zinc-300">Next &rarr;</span>
          )}
        </div>
      )}
    </div>
  )
}
