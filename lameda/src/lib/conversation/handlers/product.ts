import { sendTextMessage, sendButtonsMessage, sendPhotoMessage } from '@/lib/telegram/client'
import { getProductById, searchProducts, getAvailableVariants } from '@/lib/products/search'
import { generateProductDescription, formatNaira } from '@/lib/ai/respond'
import type { ConversationContext, HandlerResult, CartItem, ProductSummary } from '../types'

/**
 * Product detail handler.
 * Shows product image (if available) + description + Add to Cart button.
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

  const buttons = [
    { id: `add_to_cart_${product.id}`, title: '🛒 Add to Cart' },
    { id: 'browse_all', title: '← Back to Products' },
  ]

  // Show image when available — visually essential for fashion
  if (product.imageUrl) {
    await sendPhotoMessage(ctx.botToken, ctx.chatId, product.imageUrl, description, buttons)
  } else {
    await sendButtonsMessage(ctx.botToken, ctx.chatId, description, buttons)
  }

  return {
    newState: { ...ctx.state, phase: 'product_detail', activeProductId: product.id },
    newCart: ctx.cart,
    replySent: description,
  }
}

/**
 * Add to cart — entry point from "Add to Cart" button.
 * Flow: quantity → size (if any) → color (if any) → cart
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

  // Check overall stock
  if (product.stockCount === 0) {
    return handleOutOfStock(ctx, product)
  }

  // Always ask quantity first
  return showQuantitySelection(ctx, product.id, product.name)
}

/**
 * Called when a qty_{productId}_{qty} button is pressed.
 * Stores pending quantity then routes to size → color → cart.
 */
export async function handleQuantitySelected(
  ctx: ConversationContext,
  productId: string,
  quantity: number,
): Promise<HandlerResult> {
  const product = await getProductById(ctx.merchantId, productId)
  if (!product) {
    const msg = "That product is no longer available. 😕"
    await sendTextMessage(ctx.botToken, ctx.chatId, msg)
    return { newState: { ...ctx.state, phase: 'browsing' }, newCart: ctx.cart, replySent: msg }
  }

  // Use variant stock data if available, otherwise fall back to product arrays
  const variants = await getAvailableVariants(productId)
  const hasVariantData = variants.sizes.length > 0 || variants.colors.length > 0
  const sizes = hasVariantData ? variants.sizes : product.sizes
  const colors = hasVariantData ? variants.colors : product.colors

  // Store quantity in state, then route to size/color/cart
  const stateWithQty = { ...ctx.state, pendingQuantity: quantity }

  if (sizes.length > 0) {
    return showSizeSelection({ ...ctx, state: stateWithQty }, product.id, product.name, sizes)
  }
  if (colors.length > 0) {
    return showColorSelection({ ...ctx, state: stateWithQty }, product.id, product.name, colors)
  }

  return addToCartFinal({ ...ctx, state: stateWithQty }, product.id, product.name, product.priceKobo, product.imageUrl, undefined, undefined)
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

async function showQuantitySelection(
  ctx: ConversationContext,
  productId: string,
  productName: string,
): Promise<HandlerResult> {
  const msg = `🔢 How many *${productName}* would you like?`

  await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, [
    { id: `qty_${productId}_1`, title: '1' },
    { id: `qty_${productId}_2`, title: '2' },
    { id: `qty_${productId}_3`, title: '3' },
  ])

  return {
    newState: { ...ctx.state, phase: 'selecting_quantity', activeProductId: productId },
    newCart: ctx.cart,
    replySent: msg,
  }
}

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
  const qty = ctx.state.pendingQuantity ?? 1

  const existingIndex = ctx.cart.items.findIndex(
    i => i.productId === productId && i.size === size && i.color === color
  )

  let updatedItems = [...ctx.cart.items]

  if (existingIndex >= 0) {
    updatedItems[existingIndex] = {
      ...updatedItems[existingIndex],
      quantity: updatedItems[existingIndex].quantity + qty,
    }
  } else {
    const newItem: CartItem = {
      productId,
      name: productName,
      priceKobo,
      quantity: qty,
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
  const qtyText = qty > 1 ? ` ×${qty}` : ''
  const replyText =
    `✅ *${productName}*${variantText}${qtyText} added to cart!\n\n` +
    `Cart total: *${formatNaira(totalKobo)}* (${updatedItems.reduce((s, i) => s + i.quantity, 0)} item${updatedItems.reduce((s, i) => s + i.quantity, 0) > 1 ? 's' : ''})`

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
      pendingQuantity: undefined,
    },
    newCart,
    replySent: replyText,
  }
}

// ----------------------------------------------------------------
// Out-of-stock handler (STORY-024)
// ----------------------------------------------------------------

async function handleOutOfStock(
  ctx: ConversationContext,
  product: ProductSummary,
): Promise<HandlerResult> {
  // Find similar products as alternatives
  const alternatives = await searchProducts(ctx.merchantId, product.name, {
    category: product.category ?? undefined,
  })
  const others = alternatives.filter(p => p.id !== product.id).slice(0, 3)

  let msg =
    `😕 Sorry, *${product.name}* is currently out of stock.\n\n`

  if (others.length > 0) {
    msg += `Here are some similar items you might like:`
    await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, [
      ...others.map(p => ({ id: `product_${p.id}`, title: p.name.slice(0, 40) })),
      { id: 'browse_all', title: '🛍 Browse More' },
    ])
  } else {
    msg += `We don't have alternatives right now, but check back soon!`
    await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, [
      { id: 'browse_all', title: '🛍 Browse Products' },
    ])
  }

  return {
    newState: { ...ctx.state, phase: 'browsing', activeProductId: undefined },
    newCart: ctx.cart,
    replySent: msg,
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
