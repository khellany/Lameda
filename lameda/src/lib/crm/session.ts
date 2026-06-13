import { cache } from 'react'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'

export interface DashboardMerchant {
  id: string
  business_name: string
  subscription_status: string
  subscription_tier: string
}

export interface DashboardContext {
  userId: string
  merchant: DashboardMerchant | null
}

/**
 * Resolves the logged-in merchant-portal session for dashboard pages.
 *
 * Security model (mirrors the CRM API routes):
 *   1. Verify the Supabase Auth session — getUser() validates the JWT server-side.
 *   2. Map the auth user to their merchant row via merchants.auth_user_id (migration 013).
 *   3. Callers then scope every query to `merchant.id` — the id comes from the verified
 *      session, never from user input.
 *
 * Returns:
 *   - null                  → not authenticated (redirect to /login)
 *   - { merchant: null }    → authenticated but no active linked merchant
 *                             (e.g. a pre-013 account not yet back-filled)
 *   - { merchant: {...} }   → ready to render
 *
 * Wrapped in React cache() so the layout and the page within a single render pass
 * share one DB round-trip instead of each re-querying.
 */
export const getDashboardContext = cache(async (): Promise<DashboardContext | null> => {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: merchant } = await admin
    .from('merchants')
    .select('id, business_name, subscription_status, subscription_tier')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  return { userId: user.id, merchant: merchant ?? null }
})
