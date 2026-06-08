/**
 * /payment/callback
 *
 * Paystack redirects here after a customer completes (or abandons) payment.
 * Query params: ?reference=LMD-XXX&trxref=LMD-XXX
 *
 * This page checks the order status and tells the customer to close the tab
 * and return to Telegram. It does NOT process payment — the Paystack webhook
 * (/api/webhooks/paystack) handles that asynchronously.
 */

import { createAdminClient } from '@/lib/supabase/server'

interface Props {
  searchParams: Promise<{ reference?: string; trxref?: string }>
}

export default async function PaymentCallbackPage({ searchParams }: Props) {
  const params = await searchParams
  const reference = params.reference ?? params.trxref ?? null

  type PageStatus = 'success' | 'pending' | 'failed' | 'unknown'
  let status: PageStatus = 'unknown'

  if (reference) {
    const supabase = createAdminClient()
    const { data: order } = await supabase
      .from('orders')
      .select('status, reference')
      .eq('reference', reference)
      .maybeSingle()

    if (order?.status === 'paid') status = 'success'
    else if (order?.status === 'cancelled') status = 'failed'
    else if (order) status = 'pending'
  }

  const content: Record<PageStatus, { icon: string; title: string; body: string; colour: string }> = {
    success: {
      icon: '✅',
      title: 'Payment Successful!',
      body: 'Your payment has been confirmed. You can now close this tab and return to Telegram — your order update is waiting for you there.',
      colour: '#16a34a',
    },
    pending: {
      icon: '⏳',
      title: 'Payment Processing…',
      body: 'Your payment is being processed. Please close this tab and check your Telegram chat in a moment.',
      colour: '#d97706',
    },
    failed: {
      icon: '❌',
      title: 'Payment Not Completed',
      body: 'Your order was not paid. Please return to Telegram and tap "Shop Again" to place a new order.',
      colour: '#dc2626',
    },
    unknown: {
      icon: '📋',
      title: 'Close This Tab',
      body: 'Please close this tab and return to your Telegram chat to continue.',
      colour: '#6b7280',
    },
  }

  const c = content[status]

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{c.title} — Lameda</title>
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '420px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{c.icon}</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: c.colour, margin: '0 0 1rem' }}>
            {c.title}
          </h1>
          <p style={{ fontSize: '1rem', color: '#374151', lineHeight: 1.6, margin: '0 0 2rem' }}>
            {c.body}
          </p>
          {reference && (
            <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
              Reference: <code>{reference}</code>
            </p>
          )}
          <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '1.5rem' }}>
            💬 Return to <strong>Telegram</strong> to continue shopping.
          </p>
        </div>
      </body>
    </html>
  )
}
