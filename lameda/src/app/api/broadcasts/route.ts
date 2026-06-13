/**
 * POST /api/broadcasts — STORY-030
 *
 * Creates and immediately sends a broadcast campaign to opted-in customers.
 *
 * Segments:
 *   all_opted_in   — every customer with opted_in = true
 *   past_buyers    — customers with at least one paid order
 *   abandoned_cart — customers whose most recent conversation has cart items
 *                    but no completed order (proxy: active conversation with non-empty cart)
 *
 * NDPR: only customers with opted_in = true are eligible regardless of segment.
 *
 * Rate limiting: 30 messages/second cap (300 ms sleep between sends) to avoid
 * hitting Telegram's 30 msg/s bot limit.
 *
 * Auth: X-Merchant-Api-Key (handled by proxy.ts)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { sendTextMessage } from '@/lib/telegram/client'
import { safeDecrypt } from '@/lib/crypto/pii'
import { logger } from '@/lib/utils/logger'

const BroadcastSchema = z.object({
  segment: z.enum(['all_opted_in', 'past_buyers', 'abandoned_cart']),
  message: z.string().min(1).max(1000),
})

/** 300 ms sleep to stay under Telegram's 30 msg/s limit */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function POST(request: NextRequest) {
  // Merchant identity resolved from API key (already validated by proxy)
  const apiKey = request.headers.get('x-merchant-api-key')
  if (!apiKey) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BroadcastSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
  }

  const { segment, message } = parsed.data
  const db = createAdminClient()

  // Resolve merchant from API key
  const { data: merchant } = await db
    .from('merchants')
    .select('id, telegram_bot_token, is_active')
    .eq('api_key', apiKey)
    .eq('is_active', true)
    .single()

  if (!merchant?.telegram_bot_token) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
  }

  const botToken = safeDecrypt(merchant.telegram_bot_token) ?? merchant.telegram_bot_token
  const merchantId = merchant.id

  // Build recipient list (NDPR: always gate on opted_in = true)
  let customerQuery = db
    .from('customers')
    .select('id, phone_number')
    .eq('merchant_id', merchantId)
    .eq('opted_in', true)

  if (segment === 'past_buyers') {
    // Sub-select: customers with at least one paid order
    const { data: buyerRows } = await db
      .from('orders')
      .select('customer_id')
      .eq('merchant_id', merchantId)
      .in('status', ['paid', 'shipped', 'delivered'])
    const buyerIds = [...new Set((buyerRows ?? []).map((r) => r.customer_id))]
    if (buyerIds.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, failed: 0, message: 'No past buyers found' })
    }
    customerQuery = customerQuery.in('id', buyerIds)
  }

  if (segment === 'abandoned_cart') {
    // Sub-select: customers whose active conversation still has cart items
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
    if (abandonedIds.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, failed: 0, message: 'No abandoned carts found' })
    }
    customerQuery = customerQuery.in('id', abandonedIds)
  }

  const { data: recipients } = await customerQuery.limit(500) // hard cap per campaign
  if (!recipients || recipients.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, failed: 0, message: 'No eligible recipients' })
  }

  const { data: campaign } = await db
    .from('broadcast_campaigns')
    .insert({ merchant_id: merchantId, segment, message, status: 'sending' })
    .select('id')
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }

  let sent = 0
  let failed = 0

  for (const recipient of recipients) {
    try {
      const result = await sendTextMessage(botToken, recipient.phone_number, message)
      await db.from('broadcast_recipients').insert({
        campaign_id: campaign.id,
        customer_id: recipient.id,
        delivered: result.success,
        error_message: result.success ? null : result.error,
      })
      if (result.success) sent++; else failed++
    } catch (err) {
      failed++
      logger.warn({ err, customerId: recipient.id, campaignId: campaign.id }, 'Broadcast send failed')
    }
    await sleep(300)
  }

  await db
    .from('broadcast_campaigns')
    .update({ status: failed === recipients.length ? 'failed' : 'sent', sent_count: sent, failed_count: failed, sent_at: new Date().toISOString() })
    .eq('id', campaign.id)

  logger.info({ merchantId, campaignId: campaign.id, segment, sent, failed }, 'Broadcast campaign complete')

  return NextResponse.json({ ok: true, campaign_id: campaign.id, sent, failed, total: recipients.length })
}
