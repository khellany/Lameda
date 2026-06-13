/**
 * GET /api/cron/payment-expiry
 *
 * Finds confirmed orders whose Paystack payment link has expired without payment.
 * For each: cancels the order, restores product stock, marks payment expired,
 * and notifies the customer.
 *
 * Only ONE payment link is ever generated per order (no reissue).
 * Non-payment after expiry = cancelled.
 *
 * Schedule: every 15 minutes via cron-job.org (UTC). See docs/CRON_SETUP.md for the cron expression.
 * Auth: `Authorization: Bearer <CRON_SECRET>` — fail-closed.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendButtonsMessage } from '@/lib/telegram/client'
import { safeDecrypt } from '@/lib/crypto/pii'
import { formatNaira } from '@/lib/ai/respond'
import { logger } from '@/lib/utils/logger'

interface CartItem {
  productId: string
  quantity: number
  name: string
}

export async function GET(request: NextRequest) {
  // Fail closed: reject if the cron secret is unset/empty OR doesn't match.
  // Vercel injects `Authorization: Bearer <CRON_SECRET>` only when CRON_SECRET
  // is set in the deployment's env — see merchant-digest for the same pattern.
  const expected = process.env.CRON_SECRET
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Fetch all pending payments whose link has expired
  const { data: expiredPayments, error } = await supabase
    .from('payments')
    .select('id, order_id, merchant_id, amount_kobo')
    .eq('status', 'pending')
    .lt('expires_at', now)

  if (error || !expiredPayments) {
    logger.error({ err: error }, 'Payment expiry cron: failed to fetch payments')
    return NextResponse.json({ ok: false })
  }

  let cancelled = 0

  for (const payment of expiredPayments) {
    const { data: order } = await supabase
      .from('orders')
      .select('id, reference, total_kobo, customer_id, merchant_id, line_items, status')
      .eq('id', payment.order_id)
      .single()

    // Only act on orders still waiting for payment
    if (!order || order.status !== 'confirmed') continue

    const [{ data: merchant }, { data: customer }] = await Promise.all([
      supabase.from('merchants').select('telegram_bot_token').eq('id', order.merchant_id).single(),
      supabase.from('customers').select('phone_number').eq('id', order.customer_id).single(),
    ])

    // 1. Cancel the order
    await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', order.id)

    // 2. Mark payment as failed (link expired without payment)
    await supabase
      .from('payments')
      .update({ status: 'failed' })
      .eq('id', payment.id)

    // 3. Restore stock for each line item
    const lineItems = (order.line_items ?? []) as unknown as CartItem[]
    for (const item of lineItems) {
      if (!item.productId || !item.quantity) continue

      const { data: product } = await supabase
        .from('products')
        .select('stock_count')
        .eq('id', item.productId)
        .single()

      // null stock_count = unlimited — no adjustment needed
      if (product && product.stock_count !== null) {
        await supabase
          .from('products')
          .update({ stock_count: product.stock_count + item.quantity })
          .eq('id', item.productId)
      }
    }

    // 4. Notify customer
    if (merchant?.telegram_bot_token && customer?.phone_number) {
      // Tokens are encrypted at rest (Sprint 5); fall back to raw for legacy tokens.
      const botToken = safeDecrypt(merchant.telegram_bot_token) ?? merchant.telegram_bot_token
      const msg =
        `❌ *Order Cancelled — ${order.reference}*\n\n` +
        `Your payment link expired before payment was completed.\n\n` +
        `Total was: *${formatNaira(order.total_kobo)}*\n\n` +
        `Would you like to place a new order?`

      await sendButtonsMessage(botToken, customer.phone_number, msg, [
        { id: 'browse_all', title: '🛍 Shop Again' },
      ])
    }

    logger.info({ orderId: order.id, ref: order.reference }, 'Order cancelled — payment link expired')
    cancelled++
  }

  logger.info({ cancelled, checked: expiredPayments.length }, 'Payment expiry cron complete')
  return NextResponse.json({ ok: true, cancelled, checked: expiredPayments.length })
}
