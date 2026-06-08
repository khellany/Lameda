import { sendListMessage, sendButtonsMessage } from '@/lib/telegram/client'
import { searchProducts, getProductCategories } from '@/lib/products/search'
import { formatNaira } from '@/lib/ai/respond'
import type { ConversationContext, HandlerResult } from '../types'

// Emoji map for known categories — falls back to 🛍 for anything else
const CATEGORY_EMOJI: Record<string, string> = {
  Women: '👗',
  Men: '👔',
  Children: '👶',
  Unisex: '✨',
  Accessories: '👜',
  Fabrics: '🪡',
}

// Button payload IDs that reach handleBrowse via the button router.
// When rawMessage matches these, the user clicked a button — not a search.
const BUTTON_RAW = /^(browse_all|view_cart|checkout|support|product_|add_to_cart_|size_|color_|confirm_order|cancel_order|category_)/

/**
 * Browse entry point — called for both "Browse Products" button and typed searches.
 *
 * Two modes:
 * 1. Button click (browse_all) with no query → show category menu
 * 2. Text message → semantic search, show matching products directly
 */
export async function handleBrowse(ctx: ConversationContext): Promise<HandlerResult> {
  const isButtonAction = BUTTON_RAW.test(ctx.rawMessage)

  const query =
    ctx.intent.entities.productQuery ||
    (!isButtonAction ? ctx.rawMessage.trim() : '') ||
    ''

  // No query = user clicked Browse Products → show category selector
  if (!query) {
    return showCategoryMenu(ctx)
  }

  // Has query = typed search → run semantic search and show results
  const filters = {
    size: ctx.intent.entities.size,
    color: ctx.intent.entities.color,
  }

  return showProductResults(ctx, query, filters)
}

/**
 * Shows products filtered to a specific category.
 * Called from the state machine when the user clicks a category button.
 */
export async function handleBrowseCategory(
  ctx: ConversationContext,
  category: string,
): Promise<HandlerResult> {
  return showProductResults(ctx, '', { category })
}

// ----------------------------------------------------------------
// Private helpers
// ----------------------------------------------------------------

async function showCategoryMenu(ctx: ConversationContext): Promise<HandlerResult> {
  const categories = await getProductCategories(ctx.merchantId)

  // If no categories yet, fall through to showing all products
  if (categories.length === 0) {
    return showProductResults(ctx, '', {})
  }

  const msg = `🛍 What are you shopping for?`

  const buttons = [
    ...categories.map(cat => ({
      id: `category_${cat}`,
      title: `${CATEGORY_EMOJI[cat] ?? '🛍'} ${cat}`,
    })),
    { id: 'browse_all_products', title: '🔍 Search Everything' },
  ]

  await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, buttons)

  return {
    newState: { ...ctx.state, phase: 'browsing' },
    newCart: ctx.cart,
    replySent: msg,
  }
}

async function showProductResults(
  ctx: ConversationContext,
  query: string,
  filters: { size?: string; color?: string; category?: string },
): Promise<HandlerResult> {
  const products = await searchProducts(ctx.merchantId, query, filters)

  if (products.length === 0) {
    // Try a shorter query (first 2 words) before giving up
    if (query) {
      const shortQuery = query.split(/\s+/).slice(0, 2).join(' ')
      if (shortQuery !== query) {
        const fallback = await searchProducts(ctx.merchantId, shortQuery, filters)
        if (fallback.length > 0) {
          const fallbackHeader = `No exact match for *"${query}"* — here are the closest results:`
          await sendListMessage(ctx.botToken, ctx.chatId, fallbackHeader, fallback.map(p => ({
            id: `product_${p.id}`,
            title: p.name.slice(0, 40),
            description: formatNaira(p.priceKobo),
          })))
          return { newState: { ...ctx.state, phase: 'browsing', lastQuery: query }, newCart: ctx.cart, replySent: fallbackHeader }
        }
      }
    }

    // Nothing found — show all products as a safety net
    const allProducts = await searchProducts(ctx.merchantId, '', {})
    const label = filters.category ?? query
    const noResultText = label
      ? `😕 Nothing for *"${label}"* right now. ${allProducts.length > 0 ? "Here's what we have:" : 'Check back soon!'}`
      : `😕 No products listed yet. Check back soon!`

    if (allProducts.length > 0) {
      await sendListMessage(ctx.botToken, ctx.chatId, noResultText, allProducts.map(p => ({
        id: `product_${p.id}`,
        title: p.name.slice(0, 40),
        description: formatNaira(p.priceKobo),
      })))
    } else {
      await sendButtonsMessage(ctx.botToken, ctx.chatId, noResultText, [
        { id: 'search_by_photo', title: '📸 Search by Photo' },
      ])
    }

    return { newState: { ...ctx.state, phase: 'browsing' }, newCart: ctx.cart, replySent: noResultText }
  }

  const categoryLabel = filters.category
    ? `${CATEGORY_EMOJI[filters.category] ?? '🛍'} *${filters.category}*`
    : null

  const header = categoryLabel
    ? `${categoryLabel} — ${products.length} item${products.length > 1 ? 's' : ''}:`
    : query
      ? `🔍 Found ${products.length} item${products.length > 1 ? 's' : ''} for *"${query}"*`
      : `🛍 Here's what we have (${products.length} items):`

  await sendListMessage(
    ctx.botToken,
    ctx.chatId,
    header,
    products.map(p => ({
      id: `product_${p.id}`,
      title: p.name.slice(0, 40),
      description: formatNaira(p.priceKobo),
    })),
  )

  return {
    newState: { ...ctx.state, phase: 'browsing', lastQuery: query || filters.category },
    newCart: ctx.cart,
    replySent: header,
  }
}
