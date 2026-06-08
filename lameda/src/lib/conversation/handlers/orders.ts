/**
 * Order status handler — lets customers check on their orders mid-conversation.
 * Triggered by "where is my order", "track my order", "order status" etc.
 */

import { sendButtonsMessage, sendTextMessage } from '@/lib/telegram/client'
import { createAdminClient } from '@/lib/supabase/server'
import { formatNaira } from '@/lib/ai/respond'
import { logger } from '@/lib/utils/logger'
import type { ConversationContext, HandlerResult } from '../types'

const STATUS_EMOJI: Record<string, string> = {
  pending:   '⏳',
  confirmed: '✅',
  paid:      '💳',
  shipped:   '🚚',
  delivered: '🎉',
  cancelled: '❌',
}

const STATUS_LABEL: Record<string, string> = {
  pending:   'Pending payment',
  confirmed: 'Confirmed — awaiting payment',
  paid:      'Paid — being processed',
  shipped:   'On the way!',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export async function handleOrderStatus(ctx: ConversationContext): Promise<HandlerResult> {
  const supabase = createAdminClient()

  // Fetch the customer's most recent orders (up to 3)
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, reference, status, total_kobo, created_at, delivery_address')
    .eq('customer_id', ctx.customerId)
    .eq('merchant_id', ctx.merchantId)
    .order('created_at', { ascending: false })
    .limit(3)

  if (error) {
    logger.error({ err: error, customerId: ctx.customerId }, 'Order status fetch failed')
    const msg = `😕 I couldn't retrieve your order details right now. Please try again shortly.`
    await sendTextMessage(ctx.botToken, ctx.chatId, msg)
    return { newState: ctx.state, newCart: ctx.cart, replySent: msg }
  }

  if (!orders || orders.length === 0) {
    const msg =
      `You don't have any orders with us yet! 😊\n\n` +
      `Browse our products to place your first order.`
    await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, [
      { id: 'browse_all', title: '🛍 Browse Products' },
    ])
    return { newState: { ...ctx.state, phase: 'browsing' }, newCart: ctx.cart, replySent: msg }
  }

  const orderLines = orders
    .map(o => {
      const emoji = STATUS_EMOJI[o.status] ?? '📦'
      const label = STATUS_LABEL[o.status] ?? o.status
      const date = new Date(o.created_at).toLocaleDateString('en-NG', {
        day: 'numeric', month: 'short',
      })
      return `${emoji} *${o.reference}* — ${formatNaira(o.total_kobo)}\n   Status: ${label} (${date})`
    })
    .join('\n\n')

  const msg =
    orders.length === 1
      ? `📦 *Your Latest Order*\n\n${orderLines}`
      : `📦 *Your Recent Orders*\n\n${orderLines}`

  await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, [
    { id: 'browse_all', title: '🛍 Keep Shopping' },
    { id: 'support', title: '💬 Need Help?' },
  ])

  return { newState: { ...ctx.state, phase: 'browsing' }, newCart: ctx.cart, replySent: msg }
}
