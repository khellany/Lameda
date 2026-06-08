/**
 * GET /api/crm/orders
 *
 * MODEL 1 — Transparent decryption.
 * Returns the merchant's order list with delivery_address decrypted.
 * The CRM UI receives plaintext — no knowledge of encryption required.
 *
 * Auth: X-Merchant-Api-Key header
 *
 * Query params:
 *   status  — filter by order status (pending|confirmed|paid|shipped|delivered|cancelled)
 *   limit   — max rows (default 50, max 100)
 *   offset  — pagination offset (default 0)
 *
 * Scoped DB access:
 *   Joins customers only for phone_number (chat ID for contact).
 *   Never joins merchants row — no credentials in scope.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { resolveMerchantFromApiKey } from '@/lib/crm/auth'
import { safeDecrypt } from '@/lib/crypto/pii'
import { formatNaira } from '@/lib/ai/respond'
import { logger } from '@/lib/utils/logger'
import type { OrderStatus } from '@/types/database'

export async function GET(request: NextRequest) {
  const merchant = await resolveMerchantFromApiKey(request)
  if (!merchant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '50', 10), 100)
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0',  10), 0)
  const statusFilter = searchParams.get('status')

  const supabase = createAdminClient()

  let query = supabase
    .from('orders')
    .select(
      `id, reference, status, subtotal_kobo, delivery_fee_kobo, total_kobo,
       delivery_address, delivery_method, notes, created_at, updated_at,
       customers!inner ( phone_number, display_name )`,
      { count: 'exact' },
    )
    .eq('merchant_id', merchant.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const VALID_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled']
  if (statusFilter && VALID_STATUSES.includes(statusFilter as OrderStatus)) {
    query = query.eq('status', statusFilter as OrderStatus)
  }

  const { data: orders, error, count } = await query

  if (error) {
    logger.error({ merchantId: merchant.id, err: error.message }, 'CRM orders query failed')
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }

  // Model 1: decrypt delivery_address transparently
  const decrypted = (orders ?? []).map(o => {
    const customer = o.customers as unknown as { phone_number: string; display_name: string | null } | null
    return {
      id:               o.id,
      reference:        o.reference,
      status:           o.status,
      subtotal:         formatNaira(o.subtotal_kobo),
      delivery_fee:     formatNaira(o.delivery_fee_kobo),
      total:            formatNaira(o.total_kobo),
      delivery_address: safeDecrypt(o.delivery_address), // encrypted physical address
      delivery_method:  o.delivery_method,
      notes:            o.notes,
      customer: {
        phone_number: customer?.phone_number ?? null,      // Telegram chat ID
        display_name: safeDecrypt(customer?.display_name ?? null), // encrypted when set
      },
      created_at:  o.created_at,
      updated_at:  o.updated_at,
    }
  })

  return NextResponse.json({
    orders: decrypted,
    total: count ?? 0,
    limit,
    offset,
  })
}
