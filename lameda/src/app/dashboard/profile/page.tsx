/**
 * /dashboard/profile — account details + password management
 * Available to both admin and sales_rep (with different editable fields).
 */

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/crm/session'
import { safeDecrypt } from '@/lib/crypto/pii'
import { ProfileForm } from './ProfileForm'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant) redirect('/login')

  const db = createAdminClient()
  const isAdmin = ctx.role === 'admin'

  if (isAdmin) {
    const { data: m } = await db
      .from('merchants')
      .select('business_name, owner_name, email, whatsapp_number, pickup_address, bot_personality, business_type, api_key, referral_code')
      .eq('id', ctx.merchant.id)
      .single()

    return (
      <ProfileForm
        role="admin"
        businessName={m?.business_name ?? ''}
        ownerName={safeDecrypt(m?.owner_name) ?? ''}
        email={safeDecrypt(m?.email) ?? ''}
        whatsappNumber={m?.whatsapp_number ?? ''}
        pickupAddress={m?.pickup_address ?? ''}
        botPersonality={m?.bot_personality ?? ''}
        businessType={m?.business_type ?? ''}
        apiKey={m?.api_key ?? ''}
        referralCode={m?.referral_code ?? ''}
      />
    )
  }

  // Sales rep view — limited fields
  const { data: staff } = await db
    .from('merchant_staff')
    .select('name, email')
    .eq('id', ctx.staffId!)
    .single()

  return (
    <ProfileForm
      role="sales_rep"
      staffName={staff?.name ?? ''}
      email={safeDecrypt(staff?.email) ?? ''}
    />
  )
}
