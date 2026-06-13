/**
 * /dashboard/handoffs — STORY-027
 *
 * Shows conversations the AI escalated to human support.
 * Merchants can review and mark them resolved once handled.
 *
 * A conversation is "open handoff" when current_intent starts with 'handoff:'.
 * Resolving clears current_intent and sets status back to 'active' so the bot
 * can resume serving the customer if they message again.
 */

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/crm/session'
import { safeDecrypt } from '@/lib/crypto/pii'
import { formatDate } from '../_ui'

export const dynamic = 'force-dynamic'

// ─── Server Action ────────────────────────────────────────────────────────────

async function resolveHandoff(formData: FormData) {
  'use server'
  const ctx = await getDashboardContext()
  if (!ctx?.merchant) return

  const conversationId = formData.get('conversationId')
  if (typeof conversationId !== 'string' || !conversationId) return

  const db = createAdminClient()
  // Scoped update: only touches a conversation that belongs to this merchant.
  await db
    .from('conversations')
    .update({ current_intent: null, status: 'active' })
    .eq('id', conversationId)
    .eq('merchant_id', ctx.merchant.id)

  revalidatePath('/dashboard/handoffs')
}

// ─── Reason label ─────────────────────────────────────────────────────────────

function handoffLabel(intent: string): { label: string; urgent: boolean } {
  if (intent.includes('low_confidence'))
    return { label: 'Bot unsure — needed human', urgent: false }
  return { label: 'Customer asked for support', urgent: true }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HandoffsPage() {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant) redirect('/login')
  const merchantId = ctx.merchant.id

  const db = createAdminClient()

  const { data: rows } = await db
    .from('conversations')
    .select(
      'id, current_intent, last_message_at, customers!inner ( display_name )',
    )
    .eq('merchant_id', merchantId)
    .like('current_intent', 'handoff:%')
    .order('last_message_at', { ascending: false })
    .limit(100)

  const handoffs = (rows ?? []).map((r) => {
    const cust = r.customers as unknown as { display_name: string | null } | null
    return {
      id: r.id,
      customerName: safeDecrypt(cust?.display_name ?? null) || 'Unknown customer',
      intent: r.current_intent ?? '',
      lastMessageAt: r.last_message_at,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Handoffs</h1>
        <p className="text-sm text-zinc-500">
          Conversations the bot escalated to human support.
          {handoffs.length > 0
            ? ` ${handoffs.length} open.`
            : ' None open right now.'}
        </p>
      </div>

      {handoffs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 px-5 py-12 text-center">
          <p className="text-2xl">🎉</p>
          <p className="mt-2 text-sm text-zinc-500">All caught up — no open handoffs.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-400 border-b border-zinc-100">
                  <th className="px-5 py-2.5 font-medium">Customer</th>
                  <th className="px-5 py-2.5 font-medium">Reason</th>
                  <th className="px-5 py-2.5 font-medium text-right">Last activity</th>
                  <th className="px-5 py-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {handoffs.map((h) => {
                  const { label, urgent } = handoffLabel(h.intent)
                  return (
                    <tr key={h.id} className="border-b border-zinc-50 last:border-0">
                      <td className="px-5 py-3 font-medium text-zinc-900">
                        {h.customerName}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${
                            urgent
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {urgent ? '🚨' : '⚠️'} {label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-500">
                        {formatDate(h.lastMessageAt)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <form action={resolveHandoff}>
                          <input type="hidden" name="conversationId" value={h.id} />
                          <button
                            type="submit"
                            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 underline underline-offset-2 transition-colors"
                          >
                            Mark resolved
                          </button>
                        </form>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
