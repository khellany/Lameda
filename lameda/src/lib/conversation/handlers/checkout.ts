import { sendTextMessage, sendButtonsMessage } from '@/lib/telegram/client'
import { createAdminClient } from '@/lib/supabase/server'
import { formatNaira } from '@/lib/ai/respond'
import { initializeTransaction } from '@/lib/payments/paystack'
import { logger } from '@/lib/utils/logger'
import type { ConversationContext, HandlerResult } from '../types'

/**
 * Checkout handler — collects delivery address and confirms order.
 *
 * Flow:
 * 1. Customer taps Checkout → ask for delivery address
 * 2. Customer provides address → show order summary + confirm button
 * 3. Customer confirms → create order record, send payment link (Sprint 3)
 *
 * TECHNICAL DEBT:
 * - Paystack payment link generation is Sprint 3. Currently confirms the
 *   order and shows a "payment coming soon" message.
 * - No delivery fee calculation yet. Added as a fixed N0 for now.
 */

export async function handleCheckoutStart(ctx: ConversationContext): Promise<HandlerResult> {
  if (ctx.cart.items.length === 0) {
    const msg = `Your cart is empty! Add some items before checking out. 🛍`
    await sendButtonsMessage(ctx.botToken, ctx.chatId, msg, [
      { id: 'browse_all', title: '🛍 Browse Products' },
    ])
    return { newState: { ...ctx.state, phase: 'browsing' }, newCart: ctx.cart, replySent: msg }
  }

  const msg =
    `📦 Almost there! Please send your *delivery address*.\n\n` +
    `Include: street, area, city, and state.\n` +
    `Example: _12 Adeniyi Jones, Ikeja, Lagos_`

  await sendTextMessage(ctx.botToken, ctx.chatId, msg)

  return {
    newState: { ...ctx.state, phase: 'collecting_address' },
    newCart: ctx.cart,
    replySent: msg,
  }
}

export async function handleAddressReceived(ctx: ConversationContext): Promise<HandlerResult> {
  const address = ctx.intent.entities.address ?? ctx.rawMessage.trim()

  const lines = ctx.cart.items.map(
    (item, i) => `${i + 1}. ${item.name} x${item.quantity} — ${formatNaira(item.priceKobo * item.quantity)}`
  )

  const summary =
    `📋 *Order Summary*\n\n` +
    `${lines.join('\n')}\n\n` +
    `📦 Delivery to: _${address}_\n` +
    `💰 *Total: ${formatNaira(ctx.cart.totalKobo)}*\n\n` +
    `Ready to confirm?`

  await sendButtonsMessage(ctx.botToken, ctx.chatId, summary, [
    { id: 'confirm_order', title: '✅ Confirm Order' },
    { id: 'cancel_order', title: '❌ Cancel' },
  ])

  return {
    newState: { ...ctx.state, phase: 'confirming_order', pendingAddress: address },
    newCart: ctx.cart,
    replySent: summary,
  }
}

export async function handleConfirmOrder(ctx: ConversationContext): Promise<HandlerResult> {
  const address = ctx.state.pendingAddress ?? 'Not provided'
  const supabase = createAdminClient()

  // Generate order reference
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
        subtotal_kobo: ctx.cart.totalKobo,
        delivery_fee_kobo: 0,
        total_kobo: ctx.cart.totalKobo,
        delivery_address: address,
        delivery_method: 'delivery',
        reference: ref,
      })
      .select('id, reference')
      .single()

    if (error || !order) {
      throw new Error(error?.message ?? 'Order insert failed')
    }

    // Generate Paystack payment link
    // Telegram chat ID is stored in phone_number — use as synthetic email
    const syntheticEmail = `${ctx.customerId}@telegram.lameda.bot`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lameda.vercel.app'

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

    // Create payment record
    if (paystackResult) {
      await supabase.from('payments').insert({
        order_id: order.id,
        merchant_id: ctx.merchantId,
        status: 'pending',
        amount_kobo: ctx.cart.totalKobo,
        currency: 'NGN',
        paystack_reference: paystackResult.reference,
        paystack_access_code: paystackResult.access_code,
        metadata: { synthetic_email: syntheticEmail },
      })
    }

    const confirmMsg = paystackResult
      ? `🎉 *Order Confirmed!*\n\n` +
        `Reference: \`${order.reference}\`\n` +
        `Total: *${formatNaira(ctx.cart.totalKobo)}*\n\n` +
        `💳 *Pay securely here:*\n${paystackResult.authorization_url}\n\n` +
        `_Link expires in 30 minutes. Your order is reserved while you pay._`
      : `🎉 *Order Confirmed!*\n\n` +
        `Reference: \`${order.reference}\`\n` +
        `Total: *${formatNaira(ctx.cart.totalKobo)}*\n\n` +
        `💳 Our team will send your payment link shortly. Thank you! 🙏`

    await sendTextMessage(ctx.botToken, ctx.chatId, confirmMsg)

    logger.info(
      { orderId: order.id, ref: order.reference, hasPaystack: !!paystackResult, merchantId: ctx.merchantId },
      'Order confirmed',
    )

    return {
      newState: { ...ctx.state, phase: 'completed', activeOrderId: order.id },
      newCart: { items: [], totalKobo: 0 }, // Clear cart after order
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
