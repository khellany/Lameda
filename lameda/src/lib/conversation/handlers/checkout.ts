import { sendTextMessage, sendButtonsMessage } from '@/lib/telegram/client'
import { createAdminClient } from '@/lib/supabase/server'
import { formatNaira } from '@/lib/ai/respond'
import { initializeTransaction } from '@/lib/payments/paystack'
import { logger } from '@/lib/utils/logger'
import type { ConversationContext, HandlerResult } from '../types'

/**
 * Checkout handler — full flow:
 * 1. Empty cart guard
 * 2. Delivery vs pickup choice
 * 3a. If delivery: collect address → match delivery zone → fee shown in summary
 * 3b. If pickup:   show pickup address
 * 4. Order summary + confirm
 * 5. Create order + Paystack link
 */

// ----------------------------------------------------------------
// Step 1: Start checkout — ask delivery or pickup
// ----------------------------------------------------------------

export async function handleCheckoutStart(ctx: ConversationContext): Promise<HandlerResult> {
  if (ctx.cart.items.length === 0) {
    const msg = `Your cart is empty! Add some items before checking out. 🛍`
    await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, [
      { id: 'browse_all', title: '🛍 Browse Products' },
    ])
    return { newState: { ...ctx.state, phase: 'browsing' }, newCart: ctx.cart, replySent: msg }
  }

  // Check if merchant has a pickup address configured
  const supabase = createAdminClient()
  const { data: merchant } = await supabase
    .from('merchants')
    .select('pickup_address, default_delivery_fee_kobo')
    .eq('id', ctx.merchantId)
    .single()

  const hasPickup = !!merchant?.pickup_address

  const msg = `📦 How would you like to receive your order?`

  const buttons = hasPickup
    ? [
        { id: 'delivery_choice_delivery', title: '🏍 Delivery' },
        { id: 'delivery_choice_pickup', title: '🏪 Pickup' },
      ]
    : [
        { id: 'delivery_choice_delivery', title: '🏍 Delivery' },
      ]

  await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, buttons)

  return {
    newState: { ...ctx.state, phase: 'selecting_delivery' },
    newCart: ctx.cart,
    replySent: msg,
  }
}

// ----------------------------------------------------------------
// Step 2a: Delivery chosen — ask for address
// ----------------------------------------------------------------

export async function handleDeliveryChosen(ctx: ConversationContext): Promise<HandlerResult> {
  const msg =
    `📍 Please send your *delivery address*.\n\n` +
    `Include: house number, street, area, city, and state.\n` +
    `_Example: 12 Adeniyi Jones, Ikeja, Lagos_`

  await sendTextMessage(ctx.botToken, ctx.chatId, msg)

  return {
    newState: { ...ctx.state, phase: 'collecting_address', pendingDeliveryMethod: 'delivery' },
    newCart: ctx.cart,
    replySent: msg,
  }
}

// ----------------------------------------------------------------
// Step 2b: Pickup chosen — show location and skip to confirmation
// ----------------------------------------------------------------

export async function handlePickupChosen(ctx: ConversationContext): Promise<HandlerResult> {
  const supabase = createAdminClient()
  const { data: merchant } = await supabase
    .from('merchants')
    .select('pickup_address')
    .eq('id', ctx.merchantId)
    .single()

  const pickupAddress = merchant?.pickup_address ?? 'Contact us for pickup location'

  const lines = ctx.cart.items.map(
    (item, i) => `${i + 1}. ${item.name} ×${item.quantity} — ${formatNaira(item.priceKobo * item.quantity)}`
  )

  const summary =
    `📋 *Order Summary*\n\n` +
    `${lines.join('\n')}\n\n` +
    `🏪 Pickup at: _${pickupAddress}_\n` +
    `🚚 Delivery fee: *Free (Pickup)*\n` +
    `💰 *Total: ${formatNaira(ctx.cart.totalKobo)}*\n\n` +
    `Ready to confirm?`

  await sendButtonsMessage(ctx.botToken, ctx.chatId, summary, [
    { id: 'confirm_order', title: '✅ Confirm Order' },
    { id: 'cancel_order', title: '❌ Cancel' },
  ])

  return {
    newState: {
      ...ctx.state,
      phase: 'confirming_order',
      pendingDeliveryMethod: 'pickup',
      pendingAddress: pickupAddress,
    },
    newCart: ctx.cart,
    replySent: summary,
  }
}

// ----------------------------------------------------------------
// Step 3: Address received — match zone and show summary
// ----------------------------------------------------------------

export async function handleAddressReceived(ctx: ConversationContext): Promise<HandlerResult> {
  const address = ctx.intent.entities.address ?? ctx.rawMessage.trim()

  // Basic address validation
  const validation = validateAddress(address)
  if (!validation.ok) {
    const msg =
      `⚠️ That address looks incomplete.\n\n` +
      `Please include street, area, and city.\n` +
      `_Example: 12 Adeniyi Jones, Ikeja, Lagos_`
    await sendTextMessage(ctx.botToken, ctx.chatId, msg)
    return { newState: ctx.state, newCart: ctx.cart, replySent: msg }
  }

  // Match delivery zone from address keywords
  const deliveryFeeKobo = await resolveDeliveryFee(ctx.merchantId, address)

  const totalWithDelivery = ctx.cart.totalKobo + deliveryFeeKobo

  const lines = ctx.cart.items.map(
    (item, i) => `${i + 1}. ${item.name}${item.size ? ` (${item.size})` : ''} ×${item.quantity} — ${formatNaira(item.priceKobo * item.quantity)}`
  )

  const summary =
    `📋 *Order Summary*\n\n` +
    `${lines.join('\n')}\n\n` +
    `📍 Delivery to: _${address}_\n` +
    `🚚 Delivery fee: *${deliveryFeeKobo === 0 ? 'Free' : formatNaira(deliveryFeeKobo)}*\n` +
    `💰 *Total: ${formatNaira(totalWithDelivery)}*\n\n` +
    `Ready to confirm?`

  await sendButtonsMessage(ctx.botToken, ctx.chatId, summary, [
    { id: 'confirm_order', title: '✅ Confirm Order' },
    { id: 'cancel_order', title: '❌ Cancel' },
  ])

  return {
    newState: {
      ...ctx.state,
      phase: 'confirming_order',
      pendingAddress: address,
      pendingDeliveryMethod: 'delivery',
    },
    newCart: { ...ctx.cart, deliveryFeeKobo, totalKobo: totalWithDelivery } as typeof ctx.cart,
    replySent: summary,
  }
}

// ----------------------------------------------------------------
// Step 4: Confirm order → create DB record + Paystack link
// ----------------------------------------------------------------

export async function handleConfirmOrder(ctx: ConversationContext): Promise<HandlerResult> {
  const address = ctx.state.pendingAddress ?? 'Not provided'
  const deliveryMethod = ctx.state.pendingDeliveryMethod ?? 'delivery'
  const supabase = createAdminClient()

  const ref = `LMD-${Date.now().toString(36).toUpperCase()}`

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        merchant_id: ctx.merchantId,
        customer_id: ctx.customerId,
        conversation_id: ctx.conversationId,
        status: 'confirmed',
        line_items: ctx.cart.items as unknown as import('@/types/database').Json,
        subtotal_kobo: ctx.cart.items.reduce((s, i) => s + i.priceKobo * i.quantity, 0),
        delivery_fee_kobo: (ctx.cart as unknown as Record<string, number>).deliveryFeeKobo ?? 0,
        total_kobo: ctx.cart.totalKobo,
        delivery_address: address,
        delivery_method: deliveryMethod,
        reference: ref,
      })
      .select('id, reference')
      .single()

    if (error || !order) throw new Error(error?.message ?? 'Order insert failed')

    // Generate Paystack payment link
    const syntheticEmail = `${ctx.customerId}@telegram.lameda.bot`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lameda.vercel.app'
    const linkExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    const paystackResult = await initializeTransaction({
      amountKobo: ctx.cart.totalKobo,
      email: syntheticEmail,
      reference: ref,
      callbackUrl: `${appUrl}/payment/callback`,
      metadata: {
        order_id: order.id,
        customer_id: ctx.customerId,
        merchant_id: ctx.merchantId,
        conversation_id: ctx.conversationId,
      },
    })

    if (paystackResult) {
      await supabase.from('payments').insert({
        order_id: order.id,
        merchant_id: ctx.merchantId,
        status: 'pending',
        amount_kobo: ctx.cart.totalKobo,
        currency: 'NGN',
        paystack_reference: paystackResult.reference,
        paystack_access_code: paystackResult.access_code,
        expires_at: linkExpiry,
        metadata: { synthetic_email: syntheticEmail },
      })
    }

    const confirmMsg = paystackResult
      ? `🎉 *Order Confirmed!*\n\n` +
        `Reference: \`${order.reference}\`\n` +
        `Total: *${formatNaira(ctx.cart.totalKobo)}*\n\n` +
        `💳 *Pay securely here:*\n${paystackResult.authorization_url}\n\n` +
        `_Link expires in 30 minutes._`
      : `🎉 *Order Confirmed!*\n\n` +
        `Reference: \`${order.reference}\`\n` +
        `Total: *${formatNaira(ctx.cart.totalKobo)}*\n\n` +
        `💳 Our team will send your payment link shortly. Thank you! 🙏`

    await sendTextMessage(ctx.botToken, ctx.chatId, confirmMsg)

    logger.info({ orderId: order.id, ref: order.reference, merchantId: ctx.merchantId }, 'Order confirmed')

    return {
      newState: {
        ...ctx.state,
        phase: 'completed',
        activeOrderId: order.id,
        pendingAddress: undefined,
        pendingDeliveryMethod: undefined,
      },
      newCart: { items: [], totalKobo: 0 },
      replySent: confirmMsg,
    }
  } catch (err) {
    logger.error({ err }, 'Order creation failed')
    const errMsg = `Something went wrong creating your order. Please try again or contact us directly. 😕`
    await sendTextMessage(ctx.botToken, ctx.chatId, errMsg)
    return { newState: ctx.state, newCart: ctx.cart, replySent: errMsg }
  }
}

export async function handleCancelOrder(ctx: ConversationContext): Promise<HandlerResult> {
  const msg = `Order cancelled. Your cart is still saved if you want to try again! 🛒`
  await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, [
    { id: 'view_cart', title: '🛒 View Cart' },
    { id: 'browse_all', title: '🛍 Keep Shopping' },
  ])
  return { newState: { ...ctx.state, phase: 'cart_review' }, newCart: ctx.cart, replySent: msg }
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/**
 * Resolves delivery fee by matching address keywords against merchant delivery zones.
 * Falls back to merchant default fee if no zone matches.
 */
async function resolveDeliveryFee(merchantId: string, address: string): Promise<number> {
  const supabase = createAdminClient()
  const lower = address.toLowerCase()

  const { data: zones } = await supabase
    .from('merchant_delivery_zones')
    .select('zone_name, keywords, fee_kobo, is_default')
    .eq('merchant_id', merchantId)
    .order('sort_order')

  if (!zones || zones.length === 0) {
    // Fall back to merchant default fee
    const { data: merchant } = await supabase
      .from('merchants')
      .select('default_delivery_fee_kobo')
      .eq('id', merchantId)
      .single()
    return merchant?.default_delivery_fee_kobo ?? 0
  }

  // Try to match a specific zone first
  for (const zone of zones) {
    if (!zone.is_default && zone.keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      return zone.fee_kobo
    }
  }

  // Fall back to default zone
  const defaultZone = zones.find(z => z.is_default)
  return defaultZone?.fee_kobo ?? 0
}

/** Simple Nigerian address validation — checks minimum length and word count */
function validateAddress(address: string): { ok: boolean } {
  const trimmed = address.trim()
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length
  if (trimmed.length < 10 || wordCount < 3) return { ok: false }
  return { ok: true }
}
