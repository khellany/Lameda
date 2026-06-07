import { sendTextMessage, sendButtonsMessage } from '@/lib/telegram/client'
import { getProductById } from '@/lib/products/search'
import { generateProductDescription, formatNaira } from '@/lib/ai/respond'
import type { ConversationContext, HandlerResult, CartItem } from '../types'

/**
 * Product detail handler.
 * Shows full product info with Add to Cart button.
 */
export async function handleProductDetail(ctx: ConversationContext): Promise<HandlerResult> {
  const productId = extractProductId(ctx)

  if (!productId) {
    const msg = "Which product would you like to know more about? Try searching by name."
    await sendTextMessage(ctx.botToken, ctx.chatId, msg)
    return { newState: ctx.state, newCart: ctx.cart, replySent: msg }
  }

  const product = await getProductById(ctx.merchantId, productId)

  if (!product) {
    const msg = "Sorry, I couldn't find that product. It may no longer be available. 😕"
    await sendTextMessage(ctx.botToken, ctx.chatId, msg)
    return { newState: { ...ctx.state, phase: 'browsing' }, newCart: ctx.cart, replySent: msg }
  }

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
 * Add to cart — entry point from "Add to Cart" button.
 * If the product has sizes, routes to size selection first.
 * If it has colors (but no sizes), routes to color selection.
 * Otherwise adds immediately.
 */
export async function handleAddToCart(ctx: ConversationContext): Promise<HandlerResult> {
  const payload = ctx.intent.entities.productQuery ?? ''
  const productId = payload.startsWith('add_to_cart_')
    ? payload.replace('add_to_cart_', '')
    : ctx.state.activeProductId

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

  // Route to size selection if product has sizes
  if (product.sizes.length > 0) {
    return showSizeSelection(ctx, product.id, product.name, product.sizes)
  }

  // Route to color selection if product has colors but no sizes
  if (product.colors.length > 0) {
    return showColorSelection(ctx, product.id, product.name, product.colors)
  }

  // No variants — add directly
  return addToCartFinal(ctx, product.id, product.name, product.priceKobo, product.imageUrl, undefined, undefined)
}

/**
 * Handle size button selection (payload: size_{productId}_{size}).
 */
export async function handleSizeSelected(
  ctx: ConversationContext,
  productId: string,
  selectedSize: string,
): Promise<HandlerResult> {
  const product = await getProductById(ctx.merchantId, productId)
  if (!product) {
    const msg = "That product is no longer available. 😕"
    await sendTextMessage(ctx.botToken, ctx.chatId, msg)
    return { newState: { ...ctx.state, phase: 'browsing' }, newCart: ctx.cart, replySent: msg }
  }

  // If product also has colors, ask for color next
  if (product.colors.length > 0) {
    return showColorSelection(ctx, product.id, product.name, product.colors, selectedSize)
  }

  // No colors — add with just size
  return addToCartFinal(ctx, product.id, product.name, product.priceKobo, product.imageUrl, selectedSize, undefined)
}

/**
 * Handle color button selection (payload: color_{productId}_{color}).
 */
export async function handleColorSelected(
  ctx: ConversationContext,
  productId: string,
  selectedColor: string,
): Promise<HandlerResult> {
  const product = await getProductById(ctx.merchantId, productId)
  if (!product) {
    const msg = "That product is no longer available. 😕"
    await sendTextMessage(ctx.botToken, ctx.chatId, msg)
    return { newState: { ...ctx.state, phase: 'browsing' }, newCart: ctx.cart, replySent: msg }
  }

  // Use pending size from state if it was set during size selection step
  const size = ctx.state.pendingSize
  return addToCartFinal(ctx, product.id, product.name, product.priceKobo, product.imageUrl, size, selectedColor)
}

// ----------------------------------------------------------------
// Private helpers
// ----------------------------------------------------------------

async function showSizeSelection(
  ctx: ConversationContext,
  productId: string,
  productName: string,
  sizes: string[],
): Promise<HandlerResult> {
  const msg = `📐 What size would you like for *${productName}*?`

  // Each button encodes productId so we know which product to resume
  const buttons = sizes.map(s => ({
    id: `size_${productId}_${s}`,
    title: `Size ${s}`,
  }))

  await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, buttons)

  return {
    newState: { ...ctx.state, phase: 'selecting_size', activeProductId: productId },
    newCart: ctx.cart,
    replySent: msg,
  }
}

async function showColorSelection(
  ctx: ConversationContext,
  productId: string,
  productName: string,
  colors: string[],
  pendingSize?: string,
): Promise<HandlerResult> {
  const sizeText = pendingSize ? ` (Size ${pendingSize})` : ''
  const msg = `🎨 Which color would you like for *${productName}*${sizeText}?`

  const buttons = colors.map(c => ({
    id: `color_${productId}_${c}`,
    title: c,
  }))

  await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, buttons)

  return {
    newState: {
      ...ctx.state,
      phase: 'selecting_color',
      activeProductId: productId,
      pendingSize,
    },
    newCart: ctx.cart,
    replySent: msg,
  }
}

async function addToCartFinal(
  ctx: ConversationContext,
  productId: string,
  productName: string,
  priceKobo: number,
  imageUrl: string | null,
  size?: string,
  color?: string,
): Promise<HandlerResult> {
  const existingIndex = ctx.cart.items.findIndex(
    i => i.productId === productId && i.size === size && i.color === color
  )

  let updatedItems = [...ctx.cart.items]

  if (existingIndex >= 0) {
    updatedItems[existingIndex] = {
      ...updatedItems[existingIndex],
      quantity: updatedItems[existingIndex].quantity + 1,
    }
  } else {
    const newItem: CartItem = {
      productId,
      name: productName,
      priceKobo,
      quantity: 1,
      size,
      color,
      imageUrl,
    }
    updatedItems = [...updatedItems, newItem]
  }

  const totalKobo = updatedItems.reduce((sum, i) => sum + i.priceKobo * i.quantity, 0)
  const newCart = { items: updatedItems, totalKobo }

  const variant = [size, color].filter(Boolean).join(', ')
  const variantText = variant ? ` (${variant})` : ''
  const replyText =
    `✅ *${productName}*${variantText} added to cart!\n\n` +
    `Cart total: *${formatNaira(totalKobo)}* (${updatedItems.length} item${updatedItems.length > 1 ? 's' : ''})`

  await sendButtonsMessage(ctx.botToken, ctx.chatId, replyText, [
    { id: 'view_cart', title: '🛒 View Cart' },
    { id: 'browse_all', title: '🛍 Keep Shopping' },
  ])

  return {
    newState: {
      ...ctx.state,
      phase: 'browsing',
      activeProductId: undefined,
      pendingSize: undefined,
      pendingColor: undefined,
    },
    newCart,
    replySent: replyText,
  }
}

function extractProductId(ctx: ConversationContext): string | undefined {
  const payload = ctx.intent.entities.productQuery ?? ''
  if (payload.startsWith('product_')) return payload.replace('product_', '')
  return ctx.state.activeProductId
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
  const detailStr = details.length > 0 ? `\n${details.join(' | ')}` : ''
  return `*${product.name}*\nPrice: *${formatNaira(product.priceKobo)}*${detailStr}\n\nWould you like to add this to your cart?`
}
