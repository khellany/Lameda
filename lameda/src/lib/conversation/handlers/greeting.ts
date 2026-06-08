import { sendButtonsMessage } from '@/lib/telegram/client'
import { createAdminClient } from '@/lib/supabase/server'
import { formatNaira } from '@/lib/ai/respond'
import type { ConversationContext, HandlerResult } from '../types'

/**
 * Greeting handler — first contact, /start, and return visits.
 *
 * Personalises the welcome for returning customers:
 *  - Shows previous order count and status if any
 *  - Reminds them of cart items if they left without checking out
 */
export async function handleGreeting(ctx: ConversationContext): Promise<HandlerResult> {
  const supabase = createAdminClient()

  // Check previous orders for this customer
  const { count: orderCount } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', ctx.customerId)
    .eq('merchant_id', ctx.merchantId)

  const isReturning = (orderCount ?? 0) > 0
  const hasCartItems = ctx.cart.items.length > 0

  // Build personalised greeting
  let welcomeText: string

  if (isReturning && hasCartItems) {
    const cartTotal = formatNaira(ctx.cart.totalKobo)
    welcomeText =
      `👋 Welcome back! Great to see you again.\n\n` +
      `🛒 You still have items in your cart (${ctx.cart.items.length} item${ctx.cart.items.length > 1 ? 's' : ''}, *${cartTotal}*).\n\n` +
      `What would you like to do?`
  } else if (isReturning) {
    welcomeText =
      `👋 Welcome back! You've placed *${orderCount}* order${(orderCount ?? 0) > 1 ? 's' : ''} with us.\n\n` +
      `What would you like to do today?`
  } else if (hasCartItems) {
    welcomeText =
      `👗 Welcome! I'm here to help you find the perfect outfit.\n\n` +
      `🛒 You have *${ctx.cart.items.length} item${ctx.cart.items.length > 1 ? 's' : ''}* waiting in your cart.\n\n` +
      `What would you like to do?`
  } else {
    welcomeText =
      `👗 Welcome to our store! I'm here to help you find the perfect outfit.\n\n` +
      `What would you like to do?`
  }

  const buttons = [
    { id: 'browse_all', title: '🛍 Browse Products' },
    { id: 'search_by_photo', title: '📸 Search by Photo' },
    ...(hasCartItems ? [{ id: 'view_cart', title: `🛒 View Cart (${ctx.cart.items.length})` }] : [{ id: 'view_cart', title: '🛒 View My Cart' }]),
    ...(isReturning ? [{ id: 'order_status', title: '📦 My Orders' }] : []),
    { id: 'support', title: '💬 Get Help' },
  ]

  await sendButtonsMessage(ctx.botToken, ctx.chatId, welcomeText, buttons)

  return {
    newState: { ...ctx.state, phase: 'browsing' },
    newCart: ctx.cart,
    replySent: welcomeText,
  }
}
