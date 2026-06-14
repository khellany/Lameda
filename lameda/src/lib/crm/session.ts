import { cache } from 'react'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'

export type DashboardRole = 'admin' | 'sales_rep'

export interface DashboardMerchant {
  id: string
  business_name: string
  subscription_status: string
  subscription_tier: string
}

export interface DashboardContext {
  userId: string
  merchant: DashboardMerchant | null
  role: DashboardRole
  staffId: string | null       // set when role === 'sales_rep'
  forcePasswordChange: boolean  // true on first login with a temp password
}

/**
 * Resolves the logged-in session for dashboard pages.
 *
 * Security model:
 *   1. Verify the Supabase Auth session — getUser() validates the JWT server-side.
 *   2. First look for a merchant row where auth_user_id matches → role: 'admin'.
 *   3. If not found, look in merchant_staff → role: 'sales_rep'.
 *   4. Callers scope every query to merchant.id which comes from the verified
 *      session, never from user input.
 *
 * forcePasswordChange is read from auth user_metadata (set at account creation,
 * cleared by the change-password server action after the merchant updates it).
 *
 * Returns:
 *   null                  → not authenticated → redirect to /login
 *   { merchant: null }    → authenticated but no linked merchant
 *   { merchant, role }    → ready to render
 */
export const getDashboardContext = cache(async (): Promise<DashboardContext | null> => {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const forcePasswordChange = user.user_metadata?.force_password_change === true

  const admin = createAdminClient()

  // 1. Check if this user is a merchant owner (admin)
  const { data: merchant } = await admin
    .from('merchants')
    .select('id, business_name, subscription_status, subscription_tier')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (merchant) {
    return {
      userId: user.id,
      merchant,
      role: 'admin',
      staffId: null,
      forcePasswordChange,
    }
  }

  // 2. Check if this user is a staff member (sales_rep)
  const { data: staff } = await admin
    .from('merchant_staff')
    .select('id, merchant_id, merchants(id, business_name, subscription_status, subscription_tier)')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (staff && staff.merchants) {
    const linkedMerchant = Array.isArray(staff.merchants) ? staff.merchants[0] : staff.merchants
    return {
      userId: user.id,
      merchant: linkedMerchant as DashboardMerchant,
      role: 'sales_rep',
      staffId: staff.id,
      forcePasswordChange,
    }
  }

  // Authenticated but not linked to any merchant
  return { userId: user.id, merchant: null, role: 'admin', staffId: null, forcePasswordChange }
})
