import { sendTextMessage, sendButtonsMessage } from '@/lib/telegram/client'
import { formatNaira } from '@/lib/ai/respond'
import type { ConversationContext, HandlerResult } from '../types'

/**
 * Cart handler — view, remove individual items, and clear.
 */
export async function handleViewCart(ctx: ConversationContext): Promise<HandlerResult> {
  const { cart } = ctx

  if (cart.items.length === 0) {
    const emptyMsg = `🛒 Your cart is empty.\n\nBrowse our products to get started!`
    await sendButtonsMessage(ctx.botToken, ctx.chatId, emptyMsg, [
      { id: 'browse_all', title: '🛍 Browse Products' },
      { id: 'search_by_photo', title: '📸 Search by Photo' },
    ])
    return { newState: { ...ctx.state, phase: 'browsing' }, newCart: cart, replySent: emptyMsg }
  }

  // Build summary lines with remove buttons per item
  const lines = cart.items.map(
    (item, i) =>
      `${i + 1}. ${item.name}${item.size ? ` (${item.size})` : ''}${item.color ? ` / ${item.color}` : ''} ×${item.quantity} — ${formatNaira(item.priceKobo * item.quantity)}`
  )

  const summary =
    `🛒 *Your Cart*\n\n${lines.join('\n')}\n\n` +
    `*Total: ${formatNaira(cart.totalKobo)}*\n\n` +
    `_Tap an item to remove it:_`

  // One remove button per item + action buttons
  const removeButtons = cart.items.map((item, i) => ({
    id: `remove_${item.productId}_${item.size ?? 'none'}_${item.color ?? 'none'}`,
    title: `🗑 Remove ${item.name.slice(0, 20)}`,
  }))

  await sendButtonsMessage(ctx.botToken, ctx.chatId, summary, [
    ...removeButtons,
    { id: 'checkout', title: '✅ Checkout' },
    { id: 'browse_all', title: '🛍 Keep Shopping' },
    { id: 'clear_cart', title: '🗑 Clear All' },
  ])

  return { newState: { ...ctx.state, phase: 'cart_review' }, newCart: cart, replySent: summary }
}

/**
 * Remove a single item from the cart.
 * Payload format: remove_{productId}_{size}_{color}
 * 'none' is used as placeholder when size or color is absent.
 */
export async function handleRemoveCartItem(
  ctx: ConversationContext,
  productId: string,
  size: string | undefined,
  color: string | undefined,
): Promise<HandlerResult> {
  const resolvedSize = size === 'none' ? undefined : size
  const resolvedColor = color === 'none' ? undefined : color

  const updatedItems = ctx.cart.items.filter(
    item =>
      !(
        item.productId === productId &&
        (item.size ?? undefined) === resolvedSize &&
        (item.color ?? undefined) === resolvedColor
      )
  )

  const totalKobo = updatedItems.reduce((sum, i) => sum + i.priceKobo * i.quantity, 0)
  const newCart = { items: updatedItems, totalKobo }

  if (updatedItems.length === 0) {
    const msg = `🗑 Item removed. Your cart is now empty.`
    await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, [
      { id: 'browse_all', title: '🛍 Browse Products' },
    ])
    return { newState: { ...ctx.state, phase: 'browsing' }, newCart, replySent: msg }
  }

  const msg = `✅ Item removed. Cart updated — *${formatNaira(totalKobo)}* remaining.`
  await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, [
    { id: 'view_cart', title: '🛒 View Cart' },
    { id: 'browse_all', title: '🛍 Keep Shopping' },
  ])

  return { newState: { ...ctx.state, phase: 'cart_review' }, newCart, replySent: msg }
}

/**
 * Clear entire cart.
 */
export async function handleClearCart(ctx: ConversationContext): Promise<HandlerResult> {
  const emptyCart = { items: [], totalKobo: 0 }
  const msg = `🗑 Cart cleared. Start fresh anytime!`
  await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, [
    { id: 'browse_all', title: '🛍 Browse Products' },
  ])
  return { newState: { ...ctx.state, phase: 'browsing' }, newCart: emptyCart, replySent: msg }
}
