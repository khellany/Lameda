'use server'

import type { Database } from '@/types/database'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/crm/session'
import { encryptPii } from '@/lib/crypto/pii'
import { changePassword } from '../change-password/actions'

type MerchantsUpdate = Database['public']['Tables']['merchants']['Update']

export { changePassword }

export interface UpdateProfileResult {
  success: boolean
  error?: string
}

export async function updateProfile(
  _prev: UpdateProfileResult,
  formData: FormData,
): Promise<UpdateProfileResult> {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant) return { success: false, error: 'Not authenticated.' }

  const whatsapp = formData.get('whatsapp_number')?.toString().trim() ?? ''
  const pickup   = formData.get('pickup_address')?.toString().trim() ?? ''
  const personality = formData.get('bot_personality')?.toString().trim() ?? ''

  // Admin can also update business name and owner name; sales rep cannot.
  const updates: MerchantsUpdate = {
    whatsapp_number: whatsapp || null,
    pickup_address:  pickup   || null,
    bot_personality: personality || null,
  }

  if (ctx.role === 'admin') {
    const businessName = formData.get('business_name')?.toString().trim() ?? ''
    const ownerName    = formData.get('owner_name')?.toString().trim() ?? ''
    if (businessName.length < 2) return { success: false, error: 'Business name is too short.' }
    if (ownerName.length < 2)    return { success: false, error: 'Owner name is too short.' }
    updates.business_name = businessName
    updates.owner_name    = encryptPii(ownerName)
  }

  const db = createAdminClient()
  const { error } = await db
    .from('merchants')
    .update(updates)
    .eq('id', ctx.merchant.id)

  if (error) return { success: false, error: 'Failed to save changes. Try again.' }
  return { success: true }
}

export async function updateStaffProfile(
  _prev: UpdateProfileResult,
  formData: FormData,
): Promise<UpdateProfileResult> {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant || ctx.role !== 'sales_rep' || !ctx.staffId) {
    return { success: false, error: 'Not authorised.' }
  }

  const name = formData.get('name')?.toString().trim() ?? ''
  if (name.length < 2) return { success: false, error: 'Name is too short.' }

  const db = createAdminClient()
  const { error } = await db
    .from('merchant_staff')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', ctx.staffId)

  if (error) return { success: false, error: 'Failed to save changes. Try again.' }
  return { success: true }
}

export async function requestPasswordReset(): Promise<{ success: boolean; error?: string }> {
  const ctx = await getDashboardContext()
  if (!ctx) return { success: false, error: 'Not authenticated.' }

  // Sales reps cannot reset their own password — they must ask an admin.
  // This action is intentionally a no-op for sales_rep; the UI should not show it.
  if (ctx.role === 'sales_rep') {
    return { success: false, error: 'Contact your account admin to reset your password.' }
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { success: false, error: 'Could not read account email.' }

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/profile?reset=1`,
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}
