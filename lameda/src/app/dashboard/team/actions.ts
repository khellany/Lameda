'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/crm/session'
import { encryptPii } from '@/lib/crypto/pii'
import { hashForSearch } from '@/lib/crypto/hash'
import { getEmailClient, FROM_ADDRESS } from '@/lib/email/client'
import { logger } from '@/lib/utils/logger'

function generateTempPassword(): string {
  const words = ['palm', 'bolt', 'jade', 'nova', 'reef', 'dusk', 'sage', 'kite', 'lime', 'wren']
  const pick = () => words[Math.floor(Math.random() * words.length)]
  return `${pick()}-${pick()}-${Math.floor(1000 + Math.random() * 9000)}`
}

const InviteSchema = z.object({
  name:  z.string().min(2).max(100),
  email: z.string().email(),
})

export interface InviteResult {
  success: boolean
  error?: string
}

export async function inviteStaff(
  _prev: InviteResult,
  formData: FormData,
): Promise<InviteResult> {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant || ctx.role !== 'admin') {
    return { success: false, error: 'Only admins can invite team members.' }
  }

  const parsed = InviteSchema.safeParse({
    name:  formData.get('name'),
    email: formData.get('email'),
  })
  if (!parsed.success) {
    return { success: false, error: 'Invalid name or email address.' }
  }

  const { name, email } = parsed.data
  const db = createAdminClient()

  // Prevent duplicate invite for the same merchant
  const emailHash = hashForSearch(email)
  const { data: existing } = await db
    .from('merchant_staff')
    .select('id')
    .eq('merchant_id', ctx.merchant.id)
    .eq('email_hash', emailHash)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'A team member with this email already exists.' }
  }

  const tempPassword = generateTempPassword()

  // Create Supabase auth account for the staff member
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: name,
      business_name: ctx.merchant.business_name,
      force_password_change: true,
    },
  })

  if (authError) {
    if (authError.message?.toLowerCase().includes('already')) {
      return { success: false, error: 'An account with this email already exists.' }
    }
    logger.error({ err: authError }, 'Staff auth user creation failed')
    return { success: false, error: 'Failed to create account. Try again.' }
  }

  // Insert merchant_staff row
  const { error: insertError } = await db.from('merchant_staff').insert({
    merchant_id:  ctx.merchant.id,
    auth_user_id: authData.user.id,
    role:         'sales_rep',
    name,
    email:        encryptPii(email),
    email_hash:   emailHash,
    is_active:    true,
    invited_by:   ctx.userId,
  })

  if (insertError) {
    await db.auth.admin.deleteUser(authData.user.id).catch(() => null)
    logger.error({ err: insertError }, 'merchant_staff insert failed')
    return { success: false, error: 'Failed to add team member. Try again.' }
  }

  // Send invite email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const loginUrl = `${appUrl}/login`

  try {
    await getEmailClient().emails.send({
      from: FROM_ADDRESS,
      to:   email,
      subject: `You've been added to ${ctx.merchant.business_name} on Lameda`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
          <h2 style="margin:0 0 8px">Hi ${name},</h2>
          <p style="color:#52525b;margin:0 0 24px">
            You've been added as a <strong>Sales Rep</strong> for
            <strong>${ctx.merchant.business_name}</strong> on Lameda.
          </p>
          <div style="background:#f4f4f5;border-radius:10px;padding:20px;margin-bottom:24px">
            <p style="margin:0 0 8px;font-size:13px;color:#71717a;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Your login details</p>
            <p style="margin:0 0 6px;font-size:13px"><strong>Portal:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
            <p style="margin:0 0 6px;font-size:13px"><strong>Email:</strong> ${email}</p>
            <p style="margin:0;font-size:13px"><strong>Password:</strong> <code>${tempPassword}</code></p>
          </div>
          <p style="color:#52525b;font-size:13px">You'll be prompted to set a new password when you first log in.</p>
          <a href="${loginUrl}" style="display:inline-block;margin-top:16px;background:#18181b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
            Log in to your dashboard
          </a>
          <p style="margin-top:24px;font-size:12px;color:#a1a1aa">
            Lameda · <a href="mailto:hello@lameda.com.ng">hello@lameda.com.ng</a>
          </p>
        </div>
      `,
      text: `Hi ${name},\n\nYou've been added as a Sales Rep for ${ctx.merchant.business_name} on Lameda.\n\nLogin: ${loginUrl}\nEmail: ${email}\nPassword: ${tempPassword}\n\nYou'll be prompted to change your password on first login.\n\nLameda`,
    })
  } catch (err) {
    logger.error({ err }, 'Staff invite email failed')
    // Don't fail the action — account was created successfully
  }

  return { success: true }
}

export async function deactivateStaff(staffId: string): Promise<InviteResult> {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant || ctx.role !== 'admin') {
    return { success: false, error: 'Only admins can remove team members.' }
  }

  const db = createAdminClient()

  // Verify the staff member belongs to this merchant
  const { data: staff } = await db
    .from('merchant_staff')
    .select('id, auth_user_id')
    .eq('id', staffId)
    .eq('merchant_id', ctx.merchant.id)
    .single()

  if (!staff) return { success: false, error: 'Team member not found.' }

  await db.from('merchant_staff').update({ is_active: false }).eq('id', staffId)

  // Disable their auth account so they can't log in
  if (staff.auth_user_id) {
    await db.auth.admin.updateUserById(staff.auth_user_id, { ban_duration: 'none' }).catch(() => null)
  }

  return { success: true }
}
