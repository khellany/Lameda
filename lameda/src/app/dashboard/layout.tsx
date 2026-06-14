import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/crm/session'
import { SignOutButton } from './SignOutButton'
import { Sidebar } from './Sidebar'
import { ForcePasswordModal } from './ForcePasswordModal'

// Session-dependent — never statically optimised.
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await getDashboardContext()
  if (!ctx) redirect('/login')

  // Authenticated, but no merchant linked to this login yet.
  if (!ctx.merchant) {
    return (
      <div className="min-h-screen bg-lm-surface flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-10 h-10 bg-lm-lime rounded-[10px] flex items-center justify-center mx-auto mb-4">
            <span className="font-poppins font-black text-lm-indigo text-sm">L</span>
          </div>
          <h1 className="text-xl font-bold text-lm-indigo">No business linked</h1>
          <p className="mt-2 text-sm text-lm-muted">
            Your login isn&rsquo;t connected to a Lameda business yet. If you just
            registered, give it a moment and refresh — otherwise contact support.
          </p>
          <div className="mt-6">
            <SignOutButton />
          </div>
        </div>
      </div>
    )
  }

  const m = ctx.merchant

  // Open handoff count for the sidebar badge — scoped to this merchant only.
  const db = createAdminClient()
  const { count: openHandoffs } = await db
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', m.id)
    .like('current_intent', 'handoff:%')

  return (
    <div className="flex h-screen overflow-hidden bg-lm-surface">
      {ctx.forcePasswordChange && <ForcePasswordModal />}

      <Sidebar
        role={ctx.role}
        openHandoffs={openHandoffs ?? 0}
        businessName={m.business_name}
        subscriptionStatus={m.subscription_status}
      />

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {ctx.role === 'sales_rep' && (
          <div className="px-6 pt-4 pb-0">
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-100">
              Sales Rep view
            </span>
          </div>
        )}
        <main className="flex-1 px-6 py-7">{children}</main>
      </div>
    </div>
  )
}
