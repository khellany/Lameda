/**
 * GET /api/cron/payment-expiry
 *
 * Detects expired Paystack payment links and sends the customer a new one.
 *
 * Checks for orders that are:
 *   - status = 'confirmed' (order placed but not yet paid)
 *   - payment.expires_at < now (Paystack link has expired)
 *   - Not already been re-issued (metadata.reissued flag)
 *
 * Schedule (vercel.json): every 15 minutes.
 *
 * Auth: CRON_SECRET header
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { initializeTransaction } from '@/lib/payments/paystack'
import { sendTextMessage } from '@/lib/telegram/client'
import { formatNaira } from '@/lib/ai/respond'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Find expired pending payments
  const { data: expiredPayments, error } = await supabase
    .from('payments')
    .select('id, order_id, merchant_id, amount_kobo, paystack_reference, metadata')
    .eq('status', 'pending')
    .lt('expires_at', now)
    .not('metadata->reissued', 'eq', 'true')

  if (error || !expiredPayments) {
    logger.error({ err: error }, 'Payment expiry cron: failed to fetch payments')
    return NextResponse.json({ ok: false })
  }

  let reissued = 0

  for (const payment of expiredPayments) {
    // Get order + conversation + customer + merchant
    const { data: order } = await supabase
      .from('orders')
      .select('id, reference, total_kobo, customer_id, merchant_id, conversation_id, status')
      .eq('id', payment.order_id)
      .single()

    if (!order || order.status !== 'confirmed') continue

    const [{ data: merchant }, { data: customer }] = await Promise.all([
      supabase.from('merchants').select('telegram_bot_token').eq('id', order.merchant_id).single(),
      supabase.from('customers').select('phone_number').eq('id', order.customer_id).single(),
    ])

    if (!merchant?.telegram_bot_token || !customer?.phone_number) continue

    // Generate a new Paystack link with a fresh reference
    const newRef = `${order.reference}-R${Date.now().toString(36).toUpperCase()}`
    const syntheticEmail = `${order.customer_id}@telegram.lameda.bot`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lameda.vercel.app'
    const newExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    const paystackResult = await initializeTransaction({
      amountKobo: order.total_kobo,
      email: syntheticEmail,
      reference: newRef,
      callbackUrl: `${appUrl}/payment/callback`,
      metadata: { order_id: order.id, reissued: true },
    })

    if (!paystackResult) continue

    // Update payment record with new link
    await supabase
      .from('payments')
      .update({
        paystack_reference: newRef,
        paystack_access_code: paystackResult.access_code,
        expires_at: newExpiry,
        metadata: { ...(payment.metadata as object), reissued: true },
      })
      .eq('id', payment.id)

    // Notify customer
    const msg =
      `⏰ Your previous payment link expired.\n\n` +
      `Here's a fresh one for your order *${order.reference}*:\n` +
      `Total: *${formatNaira(order.total_kobo)}*\n\n` +
      `💳 *Pay here:*\n${paystackResult.authorization_url}\n\n` +
      `_This link is valid for 30 minutes._`

    await sendTextMessage(merchant.telegram_bot_token, customer.phone_number, msg)

    logger.info({ orderId: order.id, newRef }, 'Payment link reissued')
    reissued++
  }

  logger.info({ reissued, checked: expiredPayments.length }, 'Payment expiry cron complete')
  return NextResponse.json({ ok: true, reissued, checked: expiredPayments.length })
}
