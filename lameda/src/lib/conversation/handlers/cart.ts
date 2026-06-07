import { sendTextMessage, sendButtonsMessage } from '@/lib/telegram/client'
import { formatNaira } from '@/lib/ai/respond'
import type { ConversationContext, HandlerResult } from '../types'

/**
 * Cart handler — view cart and remove items.
 */
export async function handleViewCart(ctx: ConversationContext): Promise<HandlerResult> {
  const { cart } = ctx

  if (cart.items.length === 0) {
    const emptyMsg = `🛒 Your cart is empty.\n\nBrowse our products to get started!`
    await sendButtonsMessage(ctx.botToken, ctx.chatId, emptyMsg, [
      { id: 'browse_all', title: '🛍 Browse Products' },
    ])
    return { newState: { ...ctx.state, phase: 'browsing' }, newCart: cart, replySent: emptyMsg }
  }

  // Build cart summary
  const lines = cart.items.map(
    (item, i) => `${i + 1}. ${item.name} x${item.quantity} — ${formatNaira(item.priceKobo * item.quantity)}`
  )
  const summary =
    `🛒 *Your Cart*\n\n${lines.join('\n')}\n\n` +
    `*Total: ${formatNaira(cart.totalKobo)}*`

  await sendButtonsMessage(ctx.botToken, ctx.chatId, summary, [
    { id: 'checkout', title: '✅ Checkout' },
    { id: 'browse_all', title: '🛍 Keep Shopping' },
    { id: 'clear_cart', title: '🗑 Clear Cart' },
  ])

  return { newState: { ...ctx.state, phase: 'cart_review' }, newCart: cart, replySent: summary }
}

/**
 * Clear cart handler.
 */
export async function handleClearCart(ctx: ConversationContext): Promise<HandlerResult> {
  const emptyCart = { items: [], totalKobo: 0 }
  const msg = `🗑 Cart cleared. Start fresh anytime!`
  await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, [
    { id: 'browse_all', title: '🛍 Browse Products' },
  ])
  return { newState: { ...ctx.state, phase: 'browsing' }, newCart: emptyCart, replySent: msg }
}
