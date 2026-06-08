/**
 * GET /api/cron/cart-recovery
 *
 * Sends cart recovery messages to customers who added items but didn't checkout.
 *
 * Message 1: 15 minutes after last activity — gentle reminder
 * Message 2: 2 hours after last activity — stronger nudge with cart summary
 *
 * Each message is sent only once (tracked via cart_recovery_1/2_sent_at).
 * Stops if the conversation is completed (order placed).
 *
 * Schedule (vercel.json): every 15 minutes — requires Vercel Pro plan.
 * On Hobby plan this fires daily; recovery messages will still send, just later.
 *
 * Auth: CRON_SECRET header (set in Vercel env, also in vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendButtonsMessage } from '@/lib/telegram/client'
import { formatNaira } from '@/lib/ai/respond'
import { logger } from '@/lib/utils/logger'

const RECOVERY_1_MINUTES = 15
const RECOVERY_2_MINUTES = 120

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized triggers
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()

  // Find active conversations with cart items that haven't completed checkout
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('id, merchant_id, customer_id, cart, last_message_at, cart_recovery_1_sent_at, cart_recovery_2_sent_at, state')
    .eq('status', 'active')
    .not('cart', 'eq', '{"items":[],"totalKobo":0}')

  if (error || !conversations) {
    logger.error({ err: error }, 'Cart recovery: failed to fetch conversations')
    return NextResponse.json({ ok: false })
  }

  let sent1 = 0, sent2 = 0

  for (const conv of conversations) {
    const cart = conv.cart as unknown as { items: Array<{ name: string; priceKobo: number; quantity: number }>; totalKobo: number }
    const state = conv.state as unknown as { phase: string }

    // Skip completed/paid orders
    if (['completed', 'payment_sent', 'confirming_order'].includes(state?.phase ?? '')) continue

    // Skip if no items
    if (!cart?.items?.length) continue

    const lastActivity = new Date(conv.last_message_at ?? conv.id)
    const minutesSinceActivity = (now.getTime() - lastActivity.getTime()) / 60000

    // Find merchant bot token and customer chat ID
    const [{ data: merchant }, { data: customer }] = await Promise.all([
      supabase.from('merchants').select('telegram_bot_token').eq('id', conv.merchant_id).single(),
      supabase.from('customers').select('phone_number').eq('id', conv.customer_id).single(),
    ])

    if (!merchant?.telegram_bot_token || !customer?.phone_number) continue

    const cartSummary = cart.items
      .map(i => `• ${i.name} ×${i.quantity} — ${formatNaira(i.priceKobo * i.quantity)}`)
      .join('\n')

    // Message 2: 2 hours after abandonment
    if (
      minutesSinceActivity >= RECOVERY_2_MINUTES &&
      !conv.cart_recovery_2_sent_at &&
      conv.cart_recovery_1_sent_at
    ) {
      const msg =
        `🛒 Your cart is still waiting!\n\n${cartSummary}\n\n` +
        `*Total: ${formatNaira(cart.totalKobo)}*\n\n` +
        `Complete your order before your items sell out! 🏃‍♀️`

      await sendButtonsMessage(merchant.telegram_bot_token, customer.phone_number, msg, [
        { id: 'view_cart', title: '🛒 Complete Order' },
        { id: 'browse_all', title: '🛍 Keep Browsing' },
      ])

      await supabase
        .from('conversations')
        .update({ cart_recovery_2_sent_at: now.toISOString() })
        .eq('id', conv.id)

      sent2++
    }

    // Message 1: 15 minutes after abandonment
    else if (
      minutesSinceActivity >= RECOVERY_1_MINUTES &&
      !conv.cart_recovery_1_sent_at
    ) {
      const itemCount = cart.items.length
      const msg =
        `👋 Hey! You left *${itemCount} item${itemCount > 1 ? 's' : ''}* in your cart.\n\n` +
        `Total: *${formatNaira(cart.totalKobo)}*\n\n` +
        `Still interested? Your cart is saved and ready! 😊`

      await sendButtonsMessage(merchant.telegram_bot_token, customer.phone_number, msg, [
        { id: 'view_cart', title: '🛒 View Cart' },
        { id: 'browse_all', title: '🛍 Keep Browsing' },
      ])

      await supabase
        .from('conversations')
        .update({ cart_recovery_1_sent_at: now.toISOString() })
        .eq('id', conv.id)

      sent1++
    }
  }

  logger.info({ sent1, sent2, checked: conversations.length }, 'Cart recovery cron complete')
  return NextResponse.json({ ok: true, sent1, sent2, checked: conversations.length })
}
