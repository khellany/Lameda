/**
 * POST /api/webhooks/paystack
 *
 * Handles inbound Paystack webhook events (STORY-027).
 *
 * Verified events handled:
 *   charge.success → mark order paid, send Telegram confirmation to customer
 *
 * Security: every request is verified with HMAC-SHA512 before any DB read/write.
 * Return 200 for all requests (including bad signatures) to prevent Paystack retries
 * from leaking information about signature validity.
 *
 * REQUIRES: PAYSTACK_SECRET_KEY environment variable
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, type PaystackChargeEvent } from '@/lib/payments/paystack'
import { sendTextMessage, sendButtonsMessage } from '@/lib/telegram/client'
import { createAdminClient } from '@/lib/supabase/server'
import { formatNaira } from '@/lib/ai/respond'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature') ?? ''

  // Step 1: Verify signature — reject silently on failure
  if (!verifyWebhookSignature(rawBody, signature)) {
    logger.warn('Paystack webhook signature verification failed')
    return NextResponse.json({ ok: true }) // 200 to stop retries
  }

  let event: PaystackChargeEvent
  try {
    event = JSON.parse(rawBody) as PaystackChargeEvent
  } catch {
    return NextResponse.json({ ok: true })
  }

  // Only handle successful payments
  if (event.event !== 'charge.success') {
    return NextResponse.json({ ok: true })
  }

  const reference = event.data.reference
  logger.info({ reference, amount: event.data.amount }, 'Paystack charge.success received')

  const supabase = createAdminClient()

  // Step 2: Find order by reference
  const { data: order } = await supabase
    .from('orders')
    .select('id, merchant_id, customer_id, conversation_id, total_kobo, reference')
    .eq('reference', reference)
    .maybeSingle()

  if (!order) {
    logger.warn({ reference }, 'Paystack webhook: order not found')
    return NextResponse.json({ ok: true })
  }

  // Step 3: Update order status → paid
  await supabase
    .from('orders')
    .update({ status: 'paid' })
    .eq('id', order.id)

  // Step 4: Update payment record → success
  await supabase
    .from('payments')
    .update({
      status: 'success',
      payment_channel: event.data.channel,
      paid_at: event.data.paid_at,
    })
    .eq('paystack_reference', reference)

  // Step 5: Fetch merchant bot token and customer chat ID to send Telegram confirmation
  const [{ data: merchant }, { data: customer }] = await Promise.all([
    supabase
      .from('merchants')
      .select('telegram_bot_token')
      .eq('id', order.merchant_id)
      .single(),
    supabase
      .from('customers')
      .select('phone_number')
      .eq('id', order.customer_id)
      .single(),
  ])

  if (merchant?.telegram_bot_token && customer?.phone_number) {
    const confirmMsg =
      `✅ *Payment Received!*\n\n` +
      `Order *${order.reference}* — *${formatNaira(order.total_kobo)}*\n\n` +
      `Your payment has been confirmed. We'll start processing your order now. ` +
      `You'll hear from us soon with delivery details! 🎉`

    await sendTextMessage(merchant.telegram_bot_token, customer.phone_number, confirmMsg)

    // Post-payment follow-up — only shown after payment is actually confirmed
    const followUpMsg = `Is there anything else you'd like to order? 😊`
    await sendButtonsMessage(merchant.telegram_bot_token, customer.phone_number, followUpMsg, [
      { id: 'browse_all', title: '🛍 Shop More' },
      { id: 'session_done', title: '✅ That\'s All' },
    ])
  }

  // Step 6: Update conversation state to completed
  if (order.conversation_id) {
    await supabase
      .from('conversations')
      .update({
        state: { phase: 'completed', channel: 'telegram', activeOrderId: order.id },
        last_message_at: new Date().toISOString(),
      })
      .eq('id', order.conversation_id)
  }

  logger.info({ orderId: order.id, reference }, 'Order marked paid, customer notified')
  return NextResponse.json({ ok: true })
}
