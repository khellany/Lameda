/**
 * POST /api/webhooks/order-delivered
 *
 * Called by a Supabase Database Webhook whenever orders.status is set to 'delivered'.
 * Sends a Telegram delivery confirmation message to the customer.
 *
 * Supabase webhook payload shape:
 *   { type: 'UPDATE', table: 'orders', record: { id, status, reference, ... }, old_record: {...} }
 *
 * Auth: WEBHOOK_SECRET header (set this in Supabase webhook config + Vercel env vars)
 *
 * Setup (one-time in Supabase Dashboard):
 *   Database → Webhooks → Create a new hook
 *   Table: orders | Events: UPDATE
 *   Method: POST | URL: https://lameda.vercel.app/api/webhooks/order-delivered
 *   HTTP Headers: { "webhook-secret": "<your WEBHOOK_SECRET value>" }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendButtonsMessage, sendTextMessage } from '@/lib/telegram/client'
import { formatNaira } from '@/lib/ai/respond'
import { safeDecrypt } from '@/lib/crypto/pii'
import { logger } from '@/lib/utils/logger'

interface SupabaseOrderRow {
  id: string
  reference: string
  status: string
  merchant_id: string
  customer_id: string
  total_kobo: number
  line_items: unknown
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: SupabaseOrderRow
  old_record: SupabaseOrderRow | null
}

interface CartItem {
  name: string
  quantity: number
  priceKobo: number
}

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secret = request.headers.get('webhook-secret')
  if (secret !== process.env.WEBHOOK_SECRET) {
    logger.warn('order-delivered webhook: invalid secret')
    return NextResponse.json({ ok: true }) // 200 to stop retries
  }

  let payload: WebhookPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const { type, record, old_record } = payload

  // Only act on UPDATE events where status just changed TO 'delivered'
  if (type !== 'UPDATE') return NextResponse.json({ ok: true })
  if (record.status !== 'delivered') return NextResponse.json({ ok: true })
  if (old_record?.status === 'delivered') return NextResponse.json({ ok: true }) // Already delivered

  logger.info({ orderId: record.id, reference: record.reference }, 'Delivery notification triggered')

  const supabase = createAdminClient()

  const [{ data: merchant }, { data: customer }] = await Promise.all([
    supabase.from('merchants').select('telegram_bot_token').eq('id', record.merchant_id).single(),
    supabase.from('customers').select('phone_number').eq('id', record.customer_id).single(),
  ])

  if (!merchant?.telegram_bot_token || !customer?.phone_number) {
    logger.warn({ orderId: record.id }, 'Delivery notification: missing merchant token or customer chat ID')
    return NextResponse.json({ ok: true })
  }

  // Decrypt bot token — stored as AES-256-GCM ciphertext; safeDecrypt handles legacy plaintext
  const botToken = safeDecrypt(merchant.telegram_bot_token) ?? merchant.telegram_bot_token

  // Build item summary from line items
  const lineItems = (record.line_items ?? []) as unknown as CartItem[]
  const itemLines = lineItems.map(
    (item) => `• ${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`
  )

  const deliveryMsg =
    `🎉 *Your order has been delivered!*\n\n` +
    `Order: \`${record.reference}\`\n` +
    (itemLines.length > 0 ? `${itemLines.join('\n')}\n` : '') +
    `\nThank you for shopping with us! 😊\n\n` +
    `We'd love to hear how everything went.`

  await sendTextMessage(botToken, customer.phone_number, deliveryMsg)

  // Offer a quick feedback / support option
  const followUpMsg = `Was everything as expected?`
  await sendButtonsMessage(botToken, customer.phone_number, followUpMsg, [
    { id: 'browse_all', title: '🛍 Shop Again' },
    { id: 'support',    title: '⚠️ Report an Issue' },
  ])

  logger.info({ orderId: record.id, reference: record.reference }, 'Delivery notification sent')
  return NextResponse.json({ ok: true })
}
