import { classifyIntent } from '@/lib/ai/classify'
import { handleGreeting } from './handlers/greeting'
import { handleBrowse } from './handlers/browse'
import {
  handleProductDetail,
  handleAddToCart,
  handleSizeSelected,
  handleColorSelected,
} from './handlers/product'
import { handleSearchByPhoto, handleImageReceived } from './handlers/image'
import { handleViewCart, handleClearCart } from './handlers/cart'
import {
  handleCheckoutStart,
  handleAddressReceived,
  handleConfirmOrder,
  handleCancelOrder,
} from './handlers/checkout'
import { handleUnknown, handleSupport } from './handlers/fallback'
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
  logger.info({ intent: classified.intent, confidence: classified.confidence, phase: state.phase }, 'Intent classified')

  ctx.intent = classified

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
    case 'browse_products': return handleBrowse(ctx)
    case 'product_inquiry': return handleProductDetail(ctx)
    case 'add_to_cart':     return handleAddToCart(ctx)
    case 'view_cart':       return handleViewCart(ctx)
    case 'remove_from_cart':return handleClearCart(ctx)
    case 'checkout':        return handleCheckoutStart(ctx)
    case 'provide_address': return handleAddressReceived(ctx)
    case 'confirm_order':   return handleConfirmOrder(ctx)
    case 'cancel':          return handleCancelOrder(ctx)
    case 'support':         return handleSupport(ctx)
    case 'unknown':
    default:                return handleUnknown(ctx)
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
