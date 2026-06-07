import { classifyIntent } from '@/lib/ai/classify'
import { handleGreeting } from './handlers/greeting'
import { handleBrowse } from './handlers/browse'
import { handleProductDetail, handleAddToCart } from './handlers/product'
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
 * Entry point called by the Telegram webhook handler for every inbound message.
 * Returns the handler result (new state, new cart, reply text) for the webhook
 * to persist and log.
 *
 * ROUTING LOGIC:
 * 1. Button callbacks are identified by payload prefix (product_, add_to_cart_, etc.)
 *    and routed directly — no AI classification needed.
 * 2. Phase-locked states (collecting_address, confirming_order) route by phase,
 *    not by intent — prevents misclassification during multi-step flows.
 * 3. All other messages are classified by Claude Haiku and routed by intent.
 *
 * ADDING A NEW INTENT:
 * 1. Add the intent to the Intent type in types.ts
 * 2. Add it to CLASSIFIER_SYSTEM_PROMPT in classify.ts
 * 3. Add a case to routeByIntent() below
 * 4. Create a handler in handlers/
 */

export async function runStateMachine(
  message: string,
  buttonPayload: string | null,
  state: ConversationState,
  cart: Cart,
  merchantId: string,
  customerId: string,
  conversationId: string,
  botToken: string,
  chatId: string,
): Promise<HandlerResult> {

  // ----------------------------------------------------------------
  // STEP 1: Handle button callbacks directly (no AI needed)
  // ----------------------------------------------------------------
  if (buttonPayload) {
    return routeButtonPayload(buttonPayload, {
      merchantId, customerId, conversationId, botToken, chatId,
      state, cart,
      rawMessage: message,
      intent: { intent: 'unknown', confidence: 'high', entities: {}, raw: buttonPayload },
    })
  }

  // ----------------------------------------------------------------
  // STEP 2: Phase-locked routing (multi-step flows)
  // ----------------------------------------------------------------
  const ctx: ConversationContext = {
    merchantId, customerId, conversationId, botToken, chatId,
    state, cart,
    rawMessage: message,
    intent: { intent: 'unknown', confidence: 'low', entities: {}, raw: message },
  }

  if (state.phase === 'collecting_address') {
    // Whatever the customer types here is their address
    ctx.intent = { intent: 'provide_address', confidence: 'high', entities: { address: message }, raw: message }
    return handleAddressReceived(ctx)
  }

  // ----------------------------------------------------------------
  // STEP 3: Classify intent via Claude Haiku
  // ----------------------------------------------------------------
  const classified = await classifyIntent(message)
  logger.info({ intent: classified.intent, confidence: classified.confidence }, 'Intent classified')

  ctx.intent = classified

  return routeByIntent(classified.intent, ctx)
}

// ----------------------------------------------------------------
// Button payload router
// ----------------------------------------------------------------
function routeButtonPayload(payload: string, ctx: ConversationContext): Promise<HandlerResult> {
  if (payload === 'browse_all') {
    ctx.intent = { intent: 'browse_products', confidence: 'high', entities: {}, raw: payload }
    return handleBrowse(ctx)
  }
  if (payload === 'view_cart') {
    return handleViewCart(ctx)
  }
  if (payload === 'clear_cart') {
    return handleClearCart(ctx)
  }
  if (payload === 'checkout') {
    return handleCheckoutStart(ctx)
  }
  if (payload === 'confirm_order') {
    return handleConfirmOrder(ctx)
  }
  if (payload === 'cancel_order') {
    return handleCancelOrder(ctx)
  }
  if (payload === 'support') {
    return handleSupport(ctx)
  }
  if (payload.startsWith('product_')) {
    // Embed product ID in entities for the handler
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

  // Unknown button payload — fall through to unknown handler
  return handleUnknown(ctx)
}

// ----------------------------------------------------------------
// Intent router
// ----------------------------------------------------------------
function routeByIntent(intent: Intent, ctx: ConversationContext): Promise<HandlerResult> {
  switch (intent) {
    case 'greeting':
      return handleGreeting(ctx)

    case 'browse_products':
      return handleBrowse(ctx)

    case 'product_inquiry':
      return handleProductDetail(ctx)

    case 'add_to_cart':
      return handleAddToCart(ctx)

    case 'view_cart':
      return handleViewCart(ctx)

    case 'remove_from_cart':
      return handleClearCart(ctx) // Simplified: clear cart (individual removal Sprint 3)

    case 'checkout':
      return handleCheckoutStart(ctx)

    case 'provide_address':
      return handleAddressReceived(ctx)

    case 'confirm_order':
      return handleConfirmOrder(ctx)

    case 'cancel':
      return handleCancelOrder(ctx)

    case 'support':
      return handleSupport(ctx)

    case 'unknown':
    default:
      return handleUnknown(ctx)
  }
}
