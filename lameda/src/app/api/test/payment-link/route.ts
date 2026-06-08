/**
 * POST /api/test/payment-link
 *
 * Generates a short-lived (2-minute) Paystack payment link for an existing
 * confirmed order. Use this to test the full payment expiry → cancellation →
 * inventory restore cycle without waiting 30 minutes.
 *
 * Body: { orderId: string }
 * Auth: CRON_SECRET header (same secret as cron jobs)
 *
 * Only works in non-production environments unless TEST_PAYMENTS_ENABLED=true.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { initializeTransaction } from '@/lib/payments/paystack'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  // Guard: require explicit opt-in in production
  const isProduction = process.env.NODE_ENV === 'production'
  const testEnabled = process.env.TEST_PAYMENTS_ENABLED === 'true'
  if (isProduction && !testEnabled) {
    return NextResponse.json(
      { error: 'Test endpoint disabled in production. Set TEST_PAYMENTS_ENABLED=true to enable.' },
      { status: 403 },
    )
  }

  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const orderId = body?.orderId
  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, reference, total_kobo, customer_id, merchant_id, status')
    .eq('id', orderId)
    .single()

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.status !== 'confirmed') {
    return NextResponse.json(
      { error: `Order status is '${order.status}' — only 'confirmed' orders can receive a test link` },
      { status: 400 },
    )
  }

  // 2-minute expiry for quick testing
  const TEST_EXPIRY_MS = 2 * 60 * 1000
  const testRef = `${order.reference}-TEST-${Date.now().toString(36).toUpperCase()}`
  const syntheticEmail = `${order.customer_id}@telegram.lameda.bot`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lameda.vercel.app'
  const expiresAt = new Date(Date.now() + TEST_EXPIRY_MS).toISOString()

  const paystackResult = await initializeTransaction({
    amountKobo: order.total_kobo,
    email: syntheticEmail,
    reference: testRef,
    callbackUrl: `${appUrl}/payment/callback`,
    metadata: { order_id: order.id, test: true },
  })

  if (!paystackResult) {
    return NextResponse.json({ error: 'Paystack transaction init failed' }, { status: 502 })
  }

  // Record the test payment so the expiry cron can pick it up
  await supabase.from('payments').insert({
    order_id: order.id,
    merchant_id: order.merchant_id,
    status: 'pending',
    amount_kobo: order.total_kobo,
    currency: 'NGN',
    paystack_reference: testRef,
    paystack_access_code: paystackResult.access_code,
    expires_at: expiresAt,
    metadata: { test: true, synthetic_email: syntheticEmail },
  })

  logger.info({ orderId, testRef, expiresAt }, 'Test payment link generated')

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    reference: testRef,
    paymentUrl: paystackResult.authorization_url,
    expiresAt,
    note: 'Link expires in 2 minutes. The cron job (runs every 15 min) will then cancel the order and restore inventory.',
  })
}
