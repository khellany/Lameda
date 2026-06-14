/**
 * /dashboard/handoffs — STORY-027
 *
 * Agent inbox: conversations the bot escalated to a human.
 * Agents can read the thread, reply to the customer (sent via Telegram),
 * and mark conversations resolved (which re-activates the bot).
 *
 * The handoff guard in the Telegram webhook ensures the bot stays silent
 * while a conversation has status='idle' + current_intent='handoff:*'.
 */

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/crm/session'
import { safeDecrypt } from '@/lib/crypto/pii'
import { HandoffsClient } from './HandoffsClient'
import type { HandoffData } from './HandoffsClient'

export const dynamic = 'force-dynamic'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HandoffsPage() {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant) redirect('/login')
  const merchantId = ctx.merchant.id
  const db = createAdminClient()

  // Fetch open handoff conversations
  const { data: rows } = await db
    .from('conversations')
    .select('id, current_intent, last_message_at, customers!inner ( display_name )')
    .eq('merchant_id', merchantId)
    .like('current_intent', 'handoff:%')
    .order('last_message_at', { ascending: false })
    .limit(50)

  const convIds = (rows ?? []).map(r => r.id)

  // Fetch recent messages for those conversations in one query
  const { data: msgRows } = convIds.length
    ? await db
        .from('messages')
        .select('id, conversation_id, direction, content, created_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false })
        .limit(convIds.length * 8) // up to 8 messages per conversation
    : { data: [] }

  // Group messages by conversation, keep last 6 in chronological order
  const msgMap: Record<string, { id: string; direction: 'inbound' | 'outbound'; content: string; createdAt: string }[]> = {}
  for (const m of msgRows ?? []) {
    if (!msgMap[m.conversation_id]) msgMap[m.conversation_id] = []
    if (msgMap[m.conversation_id].length < 6) {
      msgMap[m.conversation_id].push({
        id: m.id,
        direction: m.direction as 'inbound' | 'outbound',
        content: m.content ?? '',
        createdAt: m.created_at,
      })
    }
  }
  // Reverse each group so messages appear oldest-first in the UI
  for (const id of Object.keys(msgMap)) {
    msgMap[id] = msgMap[id].reverse()
  }

  const handoffs: HandoffData[] = (rows ?? []).map(r => {
    const cust = r.customers as unknown as { display_name: string | null } | null
    return {
      id: r.id,
      shortcode: r.id.replace(/-/g, '').slice(-8),
      customerName: safeDecrypt(cust?.display_name ?? null) || 'Unknown customer',
      intent: r.current_intent ?? '',
      lastMessageAt: r.last_message_at,
      messages: msgMap[r.id] ?? [],
    }
  })

  return (
    <div className="space-y-6">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-lm-indigo">Agent Inbox</h1>
            {handoffs.length > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full
                               bg-lm-lime text-lm-indigo text-xs font-black tabular-nums">
                {handoffs.length}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {handoffs.length > 0
              ? `${handoffs.length} conversation${handoffs.length === 1 ? '' : 's'} waiting for your reply.`
              : 'All clear — no open handoffs right now.'}
          </p>
        </div>
        {handoffs.length > 0 && (
          <div className="shrink-0 bg-lm-indigo/5 border border-lm-indigo/10 rounded-xl px-3 py-2 text-[0.75rem] text-lm-indigo/60 leading-snug max-w-[220px]">
            <p className="font-medium text-lm-indigo/80 mb-0.5">Reply from Telegram too</p>
            Reply directly in your bot, or use{' '}
            <code className="font-mono bg-lm-indigo/10 px-1 rounded">/reply &lt;id&gt; message</code>
          </div>
        )}
      </div>

      {/* ── Handoff cards ─────────────────────────────────────────────────── */}
      <HandoffsClient handoffs={handoffs} />
    </div>
  )
}
