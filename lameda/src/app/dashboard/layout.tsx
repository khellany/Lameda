import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { getDashboardContext } from '@/lib/crm/session'
import { SignOutButton } from './SignOutButton'

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

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-bold text-zinc-900 truncate max-w-[40vw]">
              {m.business_name}
            </span>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                Overview
              </Link>
              <Link
                href="/dashboard/orders"
                className="px-3 py-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                Orders
              </Link>
              <Link
                href="/dashboard/customers"
                className="px-3 py-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                Customers
              </Link>
              <Link
                href="/dashboard/analytics"
                className="px-3 py-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                Analytics
              </Link>
              <Link
                href="/dashboard/broadcasts"
                className="px-3 py-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                Broadcasts
              </Link>
              <Link
                href="/dashboard/referrals"
                className="px-3 py-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                Referrals
              </Link>
              <Link
                href="/dashboard/billing"
                className="px-3 py-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                Billing
              </Link>
              <Link
                href="/dashboard/settings"
                className="px-3 py-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                Settings
              </Link>
              <Link
                href="/dashboard/handoffs"
                className="px-3 py-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors flex items-center gap-1.5"
              >
                Handoffs
                {openHandoffs != null && openHandoffs > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                    {openHandoffs > 99 ? '99+' : openHandoffs}
                  </span>
                )}
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 text-zinc-500 capitalize">
              {m.subscription_status}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
