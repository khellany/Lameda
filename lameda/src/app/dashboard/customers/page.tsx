import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/crm/session'
import { safeDecrypt } from '@/lib/crypto/pii'
import { formatDate } from '../_ui'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ opted?: string; page?: string }>
}) {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant) redirect('/login')
  const merchantId = ctx.merchant.id

  const sp = await searchParams
  const opted = sp.opted === 'in' ? 'in' : sp.opted === 'out' ? 'out' : undefined
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const db = createAdminClient()
  let query = db
    .from('customers')
    .select(
      'id, phone_number, display_name, opted_in, language_preference, created_at',
      { count: 'exact' },
    )
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .range(from, to)
  if (opted) query = query.eq('opted_in', opted === 'in')

  const { data, count } = await query
  const customers = data ?? []
  const total = count ?? 0
  const hasPrev = page > 1
  const hasNext = from + customers.length < total

  const pageHref = (p: number) => {
    const params = new URLSearchParams()
    if (opted) params.set('opted', opted)
    if (p > 1) params.set('page', String(p))
    const s = params.toString()
    return s ? `/dashboard/customers?${s}` : '/dashboard/customers'
  }

  const chip = (label: string, value?: 'in' | 'out') => {
    const active = opted === value
    const href = value ? `/dashboard/customers?opted=${value}` : '/dashboard/customers'
    return (
      <Link
        href={href}
        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
          active
            ? 'bg-zinc-900 text-white border-zinc-900'
            : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Customers</h1>
        <p className="text-sm text-zinc-500">{total} total</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {chip('All')}
        {chip('Opted in', 'in')}
        {chip('Opted out', 'out')}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        {customers.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-zinc-400">No customers yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-400 border-b border-zinc-100">
                  <th className="px-5 py-2.5 font-medium">Name</th>
                  <th className="px-5 py-2.5 font-medium">Telegram chat ID</th>
                  <th className="px-5 py-2.5 font-medium">Marketing</th>
                  <th className="px-5 py-2.5 font-medium">Language</th>
                  <th className="px-5 py-2.5 font-medium text-right">Joined</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-zinc-900">
                      <Link href={`/dashboard/customers/${c.id}`} className="hover:underline">
                        {safeDecrypt(c.display_name) || '—'}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-zinc-500">{c.phone_number}</td>
                    <td className="px-5 py-3">
                      {c.opted_in ? (
                        <span className="text-xs px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                          Opted in
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full border bg-zinc-100 text-zinc-500 border-zinc-200">
                          Opted out
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-zinc-600 uppercase text-xs">
                      {c.language_preference ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-500 whitespace-nowrap">
                      <Link href={`/dashboard/customers/${c.id}`} className="hover:underline">
                        {formatDate(c.created_at)}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
