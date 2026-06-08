/**
 * CRM route authentication helpers.
 *
 * All CRM endpoints authenticate via the per-merchant API key
 * (generated during onboarding, stored in merchants.api_key).
 *
 * DB access is intentionally minimal — each query selects only the
 * columns the calling route actually needs (principle of least privilege).
 */

import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export interface AuthenticatedMerchant {
  id: string
  business_name: string
  subscription_status: string
}

/**
 * Resolves a merchant from the X-Merchant-Api-Key request header.
 * Returns null if the key is missing, invalid, or the merchant is inactive.
 *
 * Selects only what every CRM route needs — not the full merchants row.
 * Routes that need additional fields (e.g. telegram_bot_token) must
 * fetch those separately with their own scoped select.
 */
export async function resolveMerchantFromApiKey(
  request: NextRequest,
): Promise<AuthenticatedMerchant | null> {
  const apiKey = request.headers.get('x-merchant-api-key')
  if (!apiKey?.startsWith('lmd_')) return null

  const supabase = createAdminClient()

  const { data } = await supabase
    .from('merchants')
    .select('id, business_name, subscription_status') // minimal — no PII, no credentials
    .eq('api_key', apiKey)
    .eq('is_active', true)
    .maybeSingle()

  return data ?? null
}

/**
 * Returns the IP address of the caller for audit logging.
 * Vercel sets x-forwarded-for; falls back to x-real-ip.
 */
export function getCallerIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}
