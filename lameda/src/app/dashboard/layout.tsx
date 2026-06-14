import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/crm/session'
import { SignOutButton } from './SignOutButton'
import { NavBar } from './NavBar'
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
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-zinc-900">No business linked</h1>
          <p className="mt-2 text-sm text-zinc-500">
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

  // Open handoff count for the nav badge — scoped to this merchant only.
  const db = createAdminClient()
  const { count: openHandoffs } = await db
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', m.id)
    .like('current_intent', 'handoff:%')

  const subBadgeStyle: Record<string, string> = {
    trial:     'bg-amber-100 text-amber-700',
    active:    'bg-emerald-100 text-emerald-700',
    suspended: 'bg-red-100 text-red-700',
    cancelled: 'bg-zinc-100 text-zinc-500',
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {ctx.forcePasswordChange && <ForcePasswordModal />}

      <header className="border-b border-zinc-200 bg-white sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/dashboard" className="font-bold text-zinc-900 truncate max-w-[160px] shrink-0">
              {m.business_name}
            </Link>
            <NavBar role={ctx.role} openHandoffs={openHandoffs ?? 0} />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {ctx.role === 'sales_rep' && (
              <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                Sales Rep
              </span>
            )}
            <span className={`text-xs px-2 py-1 rounded-full capitalize font-medium ${subBadgeStyle[m.subscription_status] ?? 'bg-zinc-100 text-zinc-500'}`}>
              {m.subscription_status}
            </span>
            <Link
              href="/dashboard/profile"
              className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              Profile
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  )
}
