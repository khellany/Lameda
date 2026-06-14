'use server'

/**
 * Server Action for broadcasting from the dashboard.
 * Uses Supabase session auth (getDashboardContext) instead of the API key —
 * the API key must never be sent to the browser.
 */

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { getDashboardContext } from '@/lib/crm/session'
import { createAdminClient } from '@/lib/supabase/server'
import { sendTextMessage } from '@/lib/telegram/client'
import { safeDecrypt } from '@/lib/crypto/pii'
import { logger } from '@/lib/utils/logger'

const BroadcastSchema = z.object({
  segment: z.enum(['all_opted_in', 'past_buyers', 'abandoned_cart']),
  message: z.string().min(1).max(1000),
})

type BroadcastResult =
  | { ok: true; sent: number; failed: number; total: number; message?: string }
  | { ok: false; error: string }

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export async function sendBroadcast(
  segment: string,
  message: string,
): Promise<BroadcastResult> {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant) redirect('/login')
  if (ctx.role === 'sales_rep') return { ok: false, error: 'Only admins can send broadcasts.' }

  const parsed = BroadcastSchema.safeParse({ segment, message })
  if (!parsed.success) return { ok: false, error: 'Invalid input' }

  const merchantId = ctx.merchant.id
  const db = createAdminClient()

  const { data: merchant } = await db
    .from('merchants')
    .select('telegram_bot_token')
    .eq('id', merchantId)
    .single()

  if (!merchant?.telegram_bot_token) return { ok: false, error: 'Bot not configured' }

  const botToken = safeDecrypt(merchant.telegram_bot_token) ?? merchant.telegram_bot_token

  let customerQuery = db
    .from('customers')
    .select('id, phone_number')
    .eq('merchant_id', merchantId)
    .eq('opted_in', true)

  if (parsed.data.segment === 'past_buyers') {
    const { data: buyerRows } = await db
      .from('orders')
      .select('customer_id')
      .eq('merchant_id', merchantId)
      .in('status', ['paid', 'shipped', 'delivered'])
    const buyerIds = [...new Set((buyerRows ?? []).map((r) => r.customer_id))]
    if (buyerIds.length === 0)
      return { ok: true, sent: 0, failed: 0, total: 0, message: 'No past buyers found' }
    customerQuery = customerQuery.in('id', buyerIds)
  }

  if (parsed.data.segment === 'abandoned_cart') {
    const { data: cartConvs } = await db
      .from('conversations')
      .select('customer_id, cart')
      .eq('merchant_id', merchantId)
      .eq('status', 'active')
    const abandonedIds = (cartConvs ?? [])
      .filter((c) => {
        const cart = c.cart as { items?: unknown[] } | null
        return Array.isArray(cart?.items) && cart.items.length > 0
      })
      .map((c) => c.customer_id)
    if (abandonedIds.length === 0)
      return { ok: true, sent: 0, failed: 0, total: 0, message: 'No abandoned carts found' }
    customerQuery = customerQuery.in('id', abandonedIds)
  }

  const { data: recipients } = await customerQuery.limit(500)
  if (!recipients || recipients.length === 0)
    return { ok: true, sent: 0, failed: 0, total: 0, message: 'No eligible recipients' }

  const { data: campaign } = await db
    .from('broadcast_campaigns')
    .insert({ merchant_id: merchantId, segment: parsed.data.segment, message: parsed.data.message, status: 'sending' })
    .select('id')
    .single()

  if (!campaign) return { ok: false, error: 'Failed to create campaign' }

  let sent = 0
  let failed = 0

  for (const recipient of recipients) {
    try {
      const result = await sendTextMessage(botToken, recipient.phone_number, parsed.data.message)
      await db.from('broadcast_recipients').insert({
        campaign_id: campaign.id,
        customer_id: recipient.id,
        delivered: result.success,
        error_message: result.success ? null : (result.error ?? null),
      })
      if (result.success) sent++; else failed++
    } catch (err) {
      failed++
      logger.warn({ err, customerId: recipient.id }, 'Dashboard broadcast send failed')
    }
    await sleep(300)
  }

  await db
    .from('broadcast_campaigns')
    .update({ status: failed === recipients.length ? 'failed' : 'sent', sent_count: sent, failed_count: failed, sent_at: new Date().toISOString() })
    .eq('id', campaign.id)

  return { ok: true, sent, failed, total: recipients.length }
}
