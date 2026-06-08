/**
 * GET /api/crm/customers
 *
 * MODEL 1 — Transparent decryption.
 * Returns the merchant's customer list with PII fields decrypted.
 * The CRM UI receives plaintext — decryption is invisible to the frontend.
 *
 * Auth: X-Merchant-Api-Key header (generated at /onboard)
 *
 * Query params:
 *   limit  — max rows returned (default 50, max 100)
 *   offset — pagination offset (default 0)
 *   opted_in — filter by opt-in status (true/false)
 *
 * Scoped DB access:
 *   Selects only CRM-relevant customer columns.
 *   Never selects merchants.telegram_bot_token or merchants.api_key.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { resolveMerchantFromApiKey } from '@/lib/crm/auth'
import { safeDecrypt } from '@/lib/crypto/pii'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  const merchant = await resolveMerchantFromApiKey(request)
  if (!merchant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '50', 10), 100)
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0',  10), 0)
  const optedInFilter = searchParams.get('opted_in')

  const supabase = createAdminClient()

  let query = supabase
    .from('customers')
    .select(
      // Scoped: only columns needed for CRM display
      'id, phone_number, display_name, opted_in, opted_in_at, opted_out_at, language_preference, created_at',
      { count: 'exact' },
    )
    .eq('merchant_id', merchant.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (optedInFilter !== null) {
    query = query.eq('opted_in', optedInFilter === 'true')
  }

  const { data: customers, error, count } = await query

  if (error) {
    logger.error({ merchantId: merchant.id, err: error.message }, 'CRM customers query failed')
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }

  // Model 1: decrypt PII transparently before returning
  // phone_number is a Telegram chat ID — not encrypted (see pii.ts FIELDS NOT ENCRYPTED)
  const decrypted = (customers ?? []).map(c => ({
    id:                  c.id,
    phone_number:        c.phone_number,
    display_name:        safeDecrypt(c.display_name),   // encrypted when set
    opted_in:            c.opted_in,
    opted_in_at:         c.opted_in_at,
    opted_out_at:        c.opted_out_at,
    language_preference: c.language_preference,
    created_at:          c.created_at,
  }))

  return NextResponse.json({
    customers: decrypted,
    total: count ?? 0,
    limit,
    offset,
  })
}
