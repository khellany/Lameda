'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface ChangePasswordResult {
  success: boolean
  error?: string
}

export async function changePassword(
  _prev: ChangePasswordResult,
  formData: FormData,
): Promise<ChangePasswordResult> {
  const newPassword = formData.get('new_password')?.toString() ?? ''
  const confirmPassword = formData.get('confirm_password')?.toString() ?? ''

  if (newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters.' }
  }
  if (newPassword !== confirmPassword) {
    return { success: false, error: 'Passwords do not match.' }
  }

  const supabase = await createServerSupabaseClient()

  // Update password on the logged-in user's auth account
  const { error: pwError } = await supabase.auth.updateUser({ password: newPassword })
  if (pwError) {
    return { success: false, error: pwError.message }
  }

  // Clear the force_password_change flag in user_metadata
  await supabase.auth.updateUser({
    data: { force_password_change: false },
  })

  return { success: true }
}
