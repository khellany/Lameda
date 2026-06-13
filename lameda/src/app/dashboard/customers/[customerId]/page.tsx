/**
 * /dashboard/customers/[customerId] — STORY-031
 *
 * Customer detail view: profile, order history, and conversation history.
 * All queries are double-scoped (merchant_id + customer_id) so a merchant
 * can only see their own customers — never another merchant's.
 */

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/crm/session'
import { safeDecrypt } from '@/lib/crypto/pii'
import { formatNaira } from '@/lib/ai/respond'
import { StatusBadge, formatDate } from '../../_ui'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ customerId: string }>
}

export default async function CustomerDetailPage({ params }: Props) {
  const { customerId } = await params
  const ctx = await getDashboardContext()
  if (!ctx?.merchant) redirect('/login')
  const merchantId = ctx.merchant.id

  const db = createAdminClient()

  // Fetch customer — double-scoped: merchant_id + id
  const { data: customer } = await db
    .from('customers')
    .select('id, display_name, phone_number, opted_in, opted_in_at, opted_out_at, language_preference, created_at')
    .eq('merchant_id', merchantId)
    .eq('id', customerId)
    .single()

  if (!customer) notFound()

  const name = safeDecrypt(customer.display_name) || 'Unknown customer'

  // Orders for this customer scoped to this merchant
  const { data: orders } = await db
    .from('orders')
    .select('id, reference, status, total_kobo, created_at')
    .eq('merchant_id', merchantId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(50)

  // Most recent conversation id for this customer+merchant pair
  const { data: conversation } = await db
    .from('conversations')
    .select('id, status, current_intent, last_message_at, message_count')
    .eq('merchant_id', merchantId)
    .eq('customer_id', customerId)
    .order('last_message_at', { ascending: false })
    .limit(1)
    .single()

  // Last 30 messages from the most recent conversation
  const messages = conversation
    ? (
        await db
          .from('messages')
          .select('id, direction, content, message_type, created_at')
          .eq('merchant_id', merchantId)
          .eq('customer_id', customerId)
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(30)
      ).data ?? []
    : []

  const isHandoff = conversation?.current_intent?.startsWith('handoff:') ?? false

  return (
    <div className="space-y-8">
      {/* Back + header */}
      <div>
        <Link href="/dashboard/customers" className="text-sm text-zinc-400 hover:text-zinc-600 mb-3 inline-block">
          &larr; All customers
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">{name}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{customer.phone_number}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isHandoff && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border bg-red-50 text-red-700 border-red-200">
                🚨 Needs support
              </span>
            )}
            {customer.opted_in ? (
              <span className="text-xs px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                Opted in
              </span>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-full border bg-zinc-100 text-zinc-500 border-zinc-200">
                Opted out
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Profile stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Orders', value: orders?.length ?? 0 },
          {
            label: 'Total spent',
            value: formatNaira(
              (orders ?? []).reduce((s, o) => s + (o.total_kobo ?? 0), 0),
            ),
          },
          { label: 'Messages', value: conversation?.message_count ?? 0 },
          { label: 'Joined', value: formatDate(customer.created_at) },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-zinc-100 p-4">
            <p className="text-xs text-zinc-400">{s.label}</p>
            <p className="mt-1 text-lg font-bold text-zinc-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Order history */}
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-900">Order history</h2>
        </div>
        {!orders || orders.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-400">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-400 border-b border-zinc-100">
                  <th className="px-5 py-2.5 font-medium">Reference</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium text-right">Total</th>
                  <th className="px-5 py-2.5 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-zinc-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-zinc-900">{o.reference}</td>
                    <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-5 py-3 text-right text-zinc-900">{formatNaira(o.total_kobo)}</td>
                    <td className="px-5 py-3 text-right text-zinc-500">{formatDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Conversation history */}
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900">Conversation</h2>
          {conversation && (
            <span className="text-xs text-zinc-400">
              {conversation.message_count} messages · last active {formatDate(conversation.last_message_at)}
            </span>
          )}
        </div>
        {messages.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-400">No messages yet.</p>
        ) : (
          <div className="px-5 py-4 space-y-3 max-h-[480px] overflow-y-auto flex flex-col-reverse">
            {/* Messages rendered newest-first (column-reverse) so the latest is at bottom */}
            {messages.map((m) => {
              const isInbound = m.direction === 'inbound'
              return (
                <div
                  key={m.id}
                  className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                      isInbound
                        ? 'bg-zinc-100 text-zinc-800 rounded-tl-sm'
                        : 'bg-zinc-900 text-white rounded-tr-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p className={`text-[10px] mt-1 ${isInbound ? 'text-zinc-400' : 'text-zinc-400'}`}>
                      {formatDate(m.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
