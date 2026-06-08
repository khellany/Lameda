import { classifyIntent } from '@/lib/ai/classify'
import { sendButtonsMessage as sendButtons } from '@/lib/telegram/client'
import { handleGreeting } from './handlers/greeting'
import { handleBrowse, handleBrowseCategory } from './handlers/browse'
import {
  handleProductDetail,
  handleAddToCart,
  handleQuantitySelected,
  handleSizeSelected,
  handleColorSelected,
} from './handlers/product'
import { handleSearchByPhoto, handleImageReceived } from './handlers/image'
import { handleViewCart, handleClearCart, handleRemoveCartItem } from './handlers/cart'
import {
  handleCheckoutStart,
  handleDeliveryChosen,
  handlePickupChosen,
  handleAddressReceived,
  handleLogisticsSelected,
  handleConfirmOrder,
  handleCancelOrder,
} from './handlers/checkout'
import { handleOrderStatus } from './handlers/orders'
import { handleComplaintStart, handleComplaintCategory } from './handlers/complaint'
import { handleUnknown, handleSupport, handleSocialPhrase, handleSessionDone } from './handlers/fallback'
import { handleHumanHandoff } from './handlers/handoff'
import { logger } from '@/lib/utils/logger'
import type {
  ConversationContext,
  ConversationState,
  Cart,
  HandlerResult,
  Intent,
} from './types'

/**
 * Main conversation state machine.
 *
 * ROUTING PRIORITY (highest to lowest):
 * 1. Button callbacks (product_, size_, color_, checkout, etc.) — route by payload prefix
 * 2. Phase-locked states — if in collecting_address, selecting_size, selecting_color,
 *    the customer's text is treated as the answer, not re-classified
 * 3. Intent-based routing — classify with Claude Haiku, route by result
 * 4. Context-aware fallback — unknown intent uses phase context to make a smart guess
 *    (e.g. browsing + unknown text → treat as product search)
 */
export async function runStateMachine(
  message: string,
  buttonPayload: string | null,
  mediaUrl: string | null,
  state: ConversationState,
  cart: Cart,
  merchantId: string,
  customerId: string,
  conversationId: string,
  botToken: string,
  chatId: string,
): Promise<HandlerResult> {

  // ----------------------------------------------------------------
  // STEP 0: Photo message — highest priority, handled from any phase
  // If the customer sent a photo (mediaUrl is a Telegram file_id),
  // route directly to image search regardless of current phase.
  // ----------------------------------------------------------------
  if (mediaUrl && !buttonPayload) {
    const ctx = buildCtx({ message, mediaUrl, state, cart, merchantId, customerId, conversationId, botToken, chatId })
    return handleImageReceived(ctx, mediaUrl)
  }

  // ----------------------------------------------------------------
  // STEP 1: Button callbacks — no AI needed
  // ----------------------------------------------------------------
  if (buttonPayload) {
    const ctx = buildCtx({ message, mediaUrl, state, cart, merchantId, customerId, conversationId, botToken, chatId })
    return routeButtonPayload(buttonPayload, ctx)
  }

  const ctx = buildCtx({ message, mediaUrl, state, cart, merchantId, customerId, conversationId, botToken, chatId })

  // ----------------------------------------------------------------
  // STEP 2: Phase-locked routing
  // ----------------------------------------------------------------
  if (state.phase === 'collecting_address') {
    ctx.intent = { intent: 'provide_address', confidence: 'high', entities: { address: message }, raw: message }
    return handleAddressReceived(ctx)
  }

  // Typed quantity during selecting_quantity phase
  if (state.phase === 'selecting_quantity' && state.activeProductId) {
    const qty = parseInt(ctx.rawMessage.trim(), 10)
    if (!isNaN(qty) && qty > 0) {
      return handleQuantitySelected(ctx, state.activeProductId, Math.min(qty, 10))
    }
  }

  // Typed text while awaiting logistics choice — re-prompt (buttons only)
  if (state.phase === 'selecting_logistics') {
    const msg = `Please choose your shipping method using the buttons above. 😊`
    await sendButtons(botToken, chatId, msg, [
      { id: 'logistics_gig', title: '🚐 GIG Logistics' },
      { id: 'logistics_park_waybill', title: '📦 Park Waybill' },
    ])
    return { newState: state, newCart: cart, replySent: msg }
  }

  // During size/color selection, typed text is treated as a manual selection
  if (state.phase === 'selecting_size' && state.activeProductId) {
    const trimmed = message.trim()
    ctx.intent = { intent: 'unknown', confidence: 'high', entities: {}, raw: trimmed }
    return handleSizeSelected(ctx, state.activeProductId, trimmed)
  }

  if (state.phase === 'selecting_color' && state.activeProductId) {
    const trimmed = message.trim()
    ctx.intent = { intent: 'unknown', confidence: 'high', entities: {}, raw: trimmed }
    return handleColorSelected(ctx, state.activeProductId, trimmed)
  }

  // ----------------------------------------------------------------
  // STEP 3: Classify intent via Claude Haiku
  // ----------------------------------------------------------------
  const classified = await classifyIntent(message)
  logger.info({ intent: classified.intent, confidence: classified.confidence, phase: state.phase, language: classified.language }, 'Intent classified')

  ctx.intent = classified
  // Persist detected language in conversation state so handlers can use it
  if (classified.language) ctx.state = { ...ctx.state, language: classified.language }

  // ----------------------------------------------------------------
  // STEP 3b: Low-confidence automatic handoff
  // If Claude is uncertain AND there's no context upgrade available,
  // hand off to a human rather than sending a confusing reply.
  // ----------------------------------------------------------------
  const HANDOFF_THRESHOLD = 0.6
  const humanKeywords = /\b(human|person|agent|staff|someone|representative|rep|talk to|speak to|call me)\b/i

  if (
    classified.confidence === 'low' &&
    humanKeywords.test(message)
  ) {
    return handleHumanHandoff(ctx, 'customer_request')
  }

  // ----------------------------------------------------------------
  // STEP 4: Context-aware fallback before routing
  // If Claude says unknown but we're in a context that implies an intent,
  // upgrade the intent so the customer doesn't hit a dead end.
  // ----------------------------------------------------------------
  if (classified.intent === 'unknown' || classified.confidence === 'low') {
    const contextIntent = inferFromContext(message, state)
    if (contextIntent) {
      logger.info({ contextIntent, phase: state.phase }, 'Context upgrade applied')
      ctx.intent = { ...classified, intent: contextIntent, confidence: 'medium' }
    }
  }

  return routeByIntent(ctx.intent.intent, ctx)
}

// ----------------------------------------------------------------
// Context inference — makes smart guesses based on current phase
// ----------------------------------------------------------------
function inferFromContext(message: string, state: ConversationState): Intent | null {
  const lower = message.toLowerCase().trim()

  switch (state.phase) {
    case 'browsing':
    case 'greeting':
      // Any freeform text while browsing = product search
      if (message.trim().length >= 2) return 'browse_products'
      break

    case 'product_detail':
      // Affirmatives = add to cart
      if (['yes', 'ok', 'sure', 'add', 'buy', 'i want it', 'i want this', 'take it', 'abeg add am'].some(t => lower.includes(t))) {
        return 'add_to_cart'
      }
      // Any other text while viewing a product = show product info again
      // (covers "what sizes?", "do you have red?", etc.)
      if (message.trim().length >= 2) return 'product_inquiry'
      break

    case 'selecting_size':
      // Typed text while size selection is active = treat the text as the chosen size
      if (message.trim().length >= 1) return 'unknown' // phase-lock handles this; this is a safety net
      break

    case 'selecting_color':
      // Typed text while color selection is active = treat the text as the chosen color
      if (message.trim().length >= 1) return 'unknown' // phase-lock handles this; this is a safety net
      break

    case 'cart_review':
      // Affirmatives while reviewing cart = checkout
      if (['yes', 'ok', 'proceed', 'buy', 'checkout', 'confirm'].some(t => lower.includes(t))) {
        return 'checkout'
      }
      // Anything else while in cart = show cart again
      if (message.trim().length >= 2) return 'view_cart'
      break

    case 'confirming_order':
      if (['yes', 'ok', 'confirm', 'sure', 'proceed'].some(t => lower.includes(t))) return 'confirm_order'
      if (['no', 'cancel', 'stop'].some(t => lower.includes(t))) return 'cancel'
      break
  }

  // Universal fallback: any freeform text in an unhandled phase = product search
  if (message.trim().length >= 2) return 'browse_products'

  return null
}

// ----------------------------------------------------------------
// Button payload router
// ----------------------------------------------------------------
function routeButtonPayload(payload: string, ctx: ConversationContext): Promise<HandlerResult> {
  // Size selection: size_{productId}_{size}
  // UUIDs contain hyphens, not underscores, so the first '_' after the prefix
  // is always the separator between productId and the size value.
  if (payload.startsWith('size_')) {
    const rest = payload.slice('size_'.length)
    const sep = rest.indexOf('_')
    const productId = rest.slice(0, sep)
    const selectedSize = rest.slice(sep + 1)
    return handleSizeSelected(ctx, productId, selectedSize)
  }

  // Color selection: color_{productId}_{color}
  if (payload.startsWith('color_')) {
    const rest = payload.slice('color_'.length)
    const sep = rest.indexOf('_')
    const productId = rest.slice(0, sep)
    const selectedColor = rest.slice(sep + 1)
    return handleColorSelected(ctx, productId, selectedColor)
  }

  if (payload === 'search_by_photo') return handleSearchByPhoto(ctx)
  if (payload === 'order_status')    return handleOrderStatus(ctx)

  // Quantity: qty_{productId}_{qty}
  if (payload.startsWith('qty_')) {
    const rest = payload.slice('qty_'.length)
    const lastUnderscore = rest.lastIndexOf('_')
    const productId = rest.slice(0, lastUnderscore)
    const qty = parseInt(rest.slice(lastUnderscore + 1), 10)
    return handleQuantitySelected(ctx, productId, isNaN(qty) ? 1 : qty)
  }

  // Remove cart item: remove_{productId}_{size}_{color}
  if (payload.startsWith('remove_')) {
    const rest = payload.slice('remove_'.length)
    // productId is UUID (hyphens), then _size_color
    // Find the first underscore AFTER the UUID (which ends 36 chars in)
    const productId = rest.slice(0, 36)
    const remainder = rest.slice(37) // skip the underscore after UUID
    const underIdx = remainder.indexOf('_')
    const size = remainder.slice(0, underIdx)
    const color = remainder.slice(underIdx + 1)
    return handleRemoveCartItem(ctx, productId, size, color)
  }

  // Delivery method
  if (payload === 'delivery_choice_delivery') return handleDeliveryChosen(ctx)
  if (payload === 'delivery_choice_pickup')   return handlePickupChosen(ctx)

  // Logistics method (outside Lagos)
  if (payload === 'logistics_gig')          return handleLogisticsSelected(ctx, 'gig')
  if (payload === 'logistics_park_waybill') return handleLogisticsSelected(ctx, 'park_waybill')

  // Post-order session end
  if (payload === 'session_done') return handleSessionDone(ctx)

  // Complaint categories
  if (payload === 'complaint_wrong_item') return handleComplaintCategory(ctx, 'wrong_item')
  if (payload === 'complaint_delivery')   return handleComplaintCategory(ctx, 'delivery')
  if (payload === 'complaint_return')     return handleComplaintCategory(ctx, 'return')
  if (payload === 'complaint_other')      return handleComplaintCategory(ctx, 'other')

  // Category drill-down: category_{categoryName}
  if (payload.startsWith('category_')) {
    const category = payload.slice('category_'.length)
    return handleBrowseCategory(ctx, category)
  }

  // "Search Everything" — bypasses category menu, shows all products
  if (payload === 'browse_all_products') {
    ctx.intent = { intent: 'browse_products', confidence: 'high', entities: {}, raw: payload }
    return handleBrowse(ctx)
  }

  if (payload === 'browse_all') {
    ctx.intent = { intent: 'browse_products', confidence: 'high', entities: {}, raw: payload }
    return handleBrowse(ctx)
  }
  if (payload === 'view_cart') return handleViewCart(ctx)
  if (payload === 'clear_cart') return handleClearCart(ctx)
  if (payload === 'checkout') return handleCheckoutStart(ctx)
  if (payload === 'confirm_order') return handleConfirmOrder(ctx)
  if (payload === 'cancel_order') return handleCancelOrder(ctx)
  if (payload === 'support') return handleSupport(ctx)

  if (payload.startsWith('product_')) {
    ctx.intent = {
      intent: 'product_inquiry',
      confidence: 'high',
      entities: { productQuery: payload },
      raw: payload,
    }
    return handleProductDetail(ctx)
  }

  if (payload.startsWith('add_to_cart_')) {
    ctx.intent = {
      intent: 'add_to_cart',
      confidence: 'high',
      entities: { productQuery: payload },
      raw: payload,
    }
    return handleAddToCart(ctx)
  }

  return handleUnknown(ctx)
}

// ----------------------------------------------------------------
// Intent router
// ----------------------------------------------------------------
function routeByIntent(intent: Intent, ctx: ConversationContext): Promise<HandlerResult> {
  switch (intent) {
    case 'greeting':        return handleGreeting(ctx)
    case 'social_phrase':   return handleSocialPhrase(ctx)
    case 'browse_products': return handleBrowse(ctx)
    case 'product_inquiry': return handleProductDetail(ctx)
    case 'add_to_cart':     return handleAddToCart(ctx)
    case 'view_cart':       return handleViewCart(ctx)
    case 'remove_from_cart':return handleClearCart(ctx)
    case 'checkout':        return handleCheckoutStart(ctx)
    case 'provide_address': return handleAddressReceived(ctx)
    case 'confirm_order':   return handleConfirmOrder(ctx)
    case 'cancel':          return handleCancelOrder(ctx)
    case 'order_status':    return handleOrderStatus(ctx)
    case 'complaint':       return handleComplaintStart(ctx)
    case 'support':         return handleSupport(ctx)
    case 'unknown':
    default:
      if (/\b(frustrated|angry|useless|rubbish|this is not working)\b/i.test(ctx.rawMessage)) {
        return handleHumanHandoff(ctx, 'low_confidence')
      }
      return handleUnknown(ctx)
  }
}

// ----------------------------------------------------------------
// Helper
// ----------------------------------------------------------------
function buildCtx(params: {
  message: string
  mediaUrl: string | null
  state: ConversationState
  cart: Cart
  merchantId: string
  customerId: string
  conversationId: string
  botToken: string
  chatId: string
}): ConversationContext {
  return {
    merchantId: params.merchantId,
    customerId: params.customerId,
    conversationId: params.conversationId,
    botToken: params.botToken,
    chatId: params.chatId,
    state: params.state,
    cart: params.cart,
    rawMessage: params.message,
    mediaUrl: params.mediaUrl,
    intent: { intent: 'unknown', confidence: 'low', entities: {}, raw: params.message },
  }
}
