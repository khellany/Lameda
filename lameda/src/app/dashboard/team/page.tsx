/**
 * /dashboard/team — admin-only
 * Invite and manage sales rep accounts for this merchant.
 */

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/crm/session'
import { safeDecrypt } from '@/lib/crypto/pii'
import { TeamForm } from './TeamForm'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const ctx = await getDashboardContext()
  if (!ctx?.merchant) redirect('/login')
  if (ctx.role !== 'admin') redirect('/dashboard')

  const db = createAdminClient()
  const { data: staff } = await db
    .from('merchant_staff')
    .select('id, name, email, role, is_active, created_at')
    .eq('merchant_id', ctx.merchant.id)
    .order('created_at', { ascending: false })

  const members = (staff ?? []).map(s => ({
    id:        s.id,
    name:      s.name,
    email:     safeDecrypt(s.email) ?? '',
    role:      s.role,
    isActive:  s.is_active,
    createdAt: s.created_at,
  }))

  return <TeamForm members={members} />
}
