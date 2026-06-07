import { sendTextMessage, sendButtonsMessage } from '@/lib/telegram/client'
import { getProductById } from '@/lib/products/search'
import { generateProductDescription, formatNaira } from '@/lib/ai/respond'
import type { ConversationContext, HandlerResult, CartItem } from '../types'

/**
 * Product detail handler.
 *
 * Triggered when a customer taps a product button (callback_data: product_{id})
 * or asks about a specific product.
 *
 * Displays full product detail with Add to Cart button.
 * Uses Claude Sonnet to write a warm description if the product has one.
 */
export async function handleProductDetail(ctx: ConversationContext): Promise<HandlerResult> {
  // Extract product ID from button payload (format: "product_{uuid}")
  const productId = ctx.intent.entities.productQuery?.startsWith('product_')
    ? ctx.intent.entities.productQuery.replace('product_', '')
    : ctx.state.activeProductId

  if (!productId) {
    const fallback = "Which product would you like to know more about? Try searching by name."
    await sendTextMessage(ctx.botToken, ctx.chatId, fallback)
    return { newState: ctx.state, newCart: ctx.cart, replySent: fallback }
  }

  const product = await getProductById(ctx.merchantId, productId)

  if (!product) {
    const notFound = "Sorry, I couldn't find that product. It may no longer be available. 😕"
    await sendTextMessage(ctx.botToken, ctx.chatId, notFound)
    return { newState: ctx.state, newCart: ctx.cart, replySent: notFound }
  }

  // Generate AI description if product has a description, otherwise use template
  const description = product.description
    ? await generateProductDescription(product, ctx.rawMessage)
    : buildFallbackDescription(product)

  await sendButtonsMessage(ctx.botToken, ctx.chatId, description, [
    { id: `add_to_cart_${product.id}`, title: '🛒 Add to Cart' },
    { id: 'browse_all', title: '← Back to Products' },
  ])

  return {
    newState: { ...ctx.state, phase: 'product_detail', activeProductId: product.id },
    newCart: ctx.cart,
    replySent: description,
  }
}

/**
 * Add to cart handler.
 *
 * Adds the currently viewed product to the cart.
 * Triggered by "Add to Cart" button or "I want this" intent.
 */
export async function handleAddToCart(ctx: ConversationContext): Promise<HandlerResult> {
  // Get product ID from button payload or active product
  let productId: string | undefined

  const payload = ctx.intent.entities.productQuery ?? ''
  if (payload.startsWith('add_to_cart_')) {
    productId = payload.replace('add_to_cart_', '')
  } else {
    productId = ctx.state.activeProductId
  }

  if (!productId) {
    const msg = "Please select a product first. 😊"
    await sendTextMessage(ctx.botToken, ctx.chatId, msg)
    return { newState: ctx.state, newCart: ctx.cart, replySent: msg }
  }

  const product = await getProductById(ctx.merchantId, productId)

  if (!product) {
    const msg = "That product is no longer available. 😕"
    await sendTextMessage(ctx.botToken, ctx.chatId, msg)
    return { newState: ctx.state, newCart: ctx.cart, replySent: msg }
  }

  // Check if already in cart — increment quantity
  const existingIndex = ctx.cart.items.findIndex(i => i.productId === product.id)
  let updatedItems = [...ctx.cart.items]

  if (existingIndex >= 0) {
    updatedItems[existingIndex] = {
      ...updatedItems[existingIndex],
      quantity: updatedItems[existingIndex].quantity + 1,
    }
  } else {
    const newItem: CartItem = {
      productId: product.id,
      name: product.name,
      priceKobo: product.priceKobo,
      quantity: 1,
      imageUrl: product.imageUrl,
    }
    updatedItems = [...updatedItems, newItem]
  }

  const newTotalKobo = updatedItems.reduce((sum, i) => sum + i.priceKobo * i.quantity, 0)
  const newCart = { items: updatedItems, totalKobo: newTotalKobo }

  const replyText =
    `✅ *${product.name}* added to your cart!\n\n` +
    `Cart total: *${formatNaira(newTotalKobo)}* (${updatedItems.length} item${updatedItems.length > 1 ? 's' : ''})`

  await sendButtonsMessage(ctx.botToken, ctx.chatId, replyText, [
    { id: 'view_cart', title: '🛒 View Cart' },
    { id: 'browse_all', title: '🛍 Keep Shopping' },
  ])

  return {
    newState: { ...ctx.state, phase: 'browsing' },
    newCart,
    replySent: replyText,
  }
}

function buildFallbackDescription(product: {
  name: string
  priceKobo: number
  sizes: string[]
  colors: string[]
}): string {
  const details = []
  if (product.sizes.length > 0) details.push(`Sizes: ${product.sizes.join(', ')}`)
  if (product.colors.length > 0) details.push(`Colors: ${product.colors.join(', ')}`)
  return `*${product.name}*\nPrice: *${formatNaira(product.priceKobo)}*\n${details.join(' | ')}\n\nWould you like to add this to your cart?`
}
