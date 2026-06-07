import { sendTextMessage, sendListMessage, sendButtonsMessage } from '@/lib/telegram/client'
import { searchProducts } from '@/lib/products/search'
import { formatNaira } from '@/lib/ai/respond'
import type { ConversationContext, HandlerResult } from '../types'

/**
 * Browse handler — product search and listing.
 *
 * Shows up to 5 matching products as a Telegram inline keyboard.
 * Each button carries the product ID as callback_data so the next
 * message (a button press) can look up the exact product without
 * another search.
 */
export async function handleBrowse(ctx: ConversationContext): Promise<HandlerResult> {
  const query = ctx.intent.entities.productQuery ?? ''
  const filters = {
    size: ctx.intent.entities.size,
    color: ctx.intent.entities.color,
  }

  const products = await searchProducts(ctx.merchantId, query, filters)

  if (products.length === 0) {
    const noResultText = query
      ? `😕 I couldn't find anything matching *"${query}"*. Try a different search or browse everything below.`
      : `😕 No products are listed yet. Check back soon!`

    await sendButtonsMessage(ctx.botToken, ctx.chatId, noResultText, [
      { id: 'browse_all', title: '🛍 Browse All' },
    ])

    return {
      newState: { ...ctx.state, phase: 'browsing', lastQuery: query },
      newCart: ctx.cart,
      replySent: noResultText,
    }
  }

  const header = query
    ? `🔍 Found ${products.length} item${products.length > 1 ? 's' : ''} for *"${query}"*`
    : `🛍 Here's what we have (${products.length} items):`

  // Send as inline keyboard — each product is a button
  // Product ID is embedded in callback_data for instant lookup
  const items = products.map(p => ({
    id: `product_${p.id}`,
    title: p.name.slice(0, 40),
    description: formatNaira(p.priceKobo),
  }))

  await sendListMessage(ctx.botToken, ctx.chatId, header, items)

  return {
    newState: { ...ctx.state, phase: 'browsing', lastQuery: query },
    newCart: ctx.cart,
    replySent: header,
  }
}
