'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  BarChart2,
  MessageSquareWarning,
  Megaphone,
  Gift,
  CreditCard,
  UsersRound,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  CircleDot,
} from 'lucide-react'
import type { DashboardRole } from '@/lib/crm/session'
import { SignOutButton } from './SignOutButton'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  adminOnly?: boolean
  badge?: number
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',            label: 'Overview',    icon: LayoutDashboard },
  { href: '/dashboard/orders',     label: 'Orders',      icon: ShoppingBag },
  { href: '/dashboard/customers',  label: 'Customers',   icon: Users },
  { href: '/dashboard/analytics',  label: 'Analytics',   icon: BarChart2 },
  { href: '/dashboard/handoffs',   label: 'Handoffs',    icon: MessageSquareWarning },
  { href: '/dashboard/broadcasts', label: 'Broadcasts',  icon: Megaphone, adminOnly: true },
  { href: '/dashboard/referrals',  label: 'Referrals',   icon: Gift,      adminOnly: true },
  { href: '/dashboard/billing',    label: 'Billing',     icon: CreditCard, adminOnly: true },
  { href: '/dashboard/team',       label: 'Team',        icon: UsersRound, adminOnly: true },
  { href: '/dashboard/settings',   label: 'Settings',    icon: Settings,  adminOnly: true },
]

const SUB_STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  trial:     { dot: 'bg-amber-400',   label: 'Trial' },
  active:    { dot: 'bg-emerald-400', label: 'Active' },
  suspended: { dot: 'bg-red-400',     label: 'Suspended' },
  cancelled: { dot: 'bg-zinc-400',    label: 'Cancelled' },
}

interface SidebarProps {
  role: DashboardRole
  openHandoffs: number
  businessName: string
  subscriptionStatus: string
}

export function Sidebar({ role, openHandoffs, businessName, subscriptionStatus }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  const visible = NAV_ITEMS.filter(item => !item.adminOnly || role === 'admin')
  const sub = SUB_STATUS_STYLES[subscriptionStatus] ?? { dot: 'bg-zinc-400', label: subscriptionStatus }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={`
        flex flex-col h-screen sticky top-0 shrink-0
        bg-lm-indigo border-r border-white/[0.07]
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[64px]' : 'w-[240px]'}
      `}
    >
      {/* ── Logo + collapse toggle ── */}
      <div className={`flex items-center h-14 px-4 border-b border-white/[0.07] ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5 no-underline">
            <div className="w-[28px] h-[28px] bg-lm-lime rounded-[6px] flex items-center justify-center shrink-0">
              <span className="font-poppins font-black text-[0.85rem] text-lm-indigo">L</span>
            </div>
            <span className="font-poppins font-bold text-[0.95rem] text-white truncate">Lameda</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="no-underline">
            <div className="w-[28px] h-[28px] bg-lm-lime rounded-[6px] flex items-center justify-center">
              <span className="font-poppins font-black text-[0.85rem] text-lm-indigo">L</span>
            </div>
          </Link>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* ── Nav items ── */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col gap-0.5 px-2">
          {visible.map(item => {
            const active = isActive(item.href)
            const isHandoffs = item.href === '/dashboard/handoffs'
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-[8px] transition-colors
                  font-medium text-[0.875rem] no-underline group relative
                  ${active
                    ? 'bg-lm-lime/[0.12] text-lm-lime'
                    : 'text-white/60 hover:bg-white/[0.05] hover:text-white/90'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
              >
                <Icon
                  size={18}
                  className={`shrink-0 ${active ? 'text-lm-lime' : ''}`}
                />
                {!collapsed && (
                  <span className="truncate flex-1">{item.label}</span>
                )}
                {isHandoffs && openHandoffs > 0 && (
                  <span className={`
                    inline-flex items-center justify-center min-w-[18px] h-[18px] px-1
                    rounded-full text-[10px] font-bold shrink-0
                    ${active ? 'bg-lm-lime text-lm-indigo' : 'bg-red-500/80 text-white'}
                    ${collapsed ? 'absolute top-1 right-1' : ''}
                  `}>
                    {openHandoffs > 99 ? '99+' : openHandoffs}
                  </span>
                )}
                {/* Tooltip in collapsed mode */}
                {collapsed && (
                  <span className="
                    absolute left-full ml-3 px-2.5 py-1 bg-lm-indigo-dark text-white text-[0.78rem]
                    rounded-md whitespace-nowrap opacity-0 pointer-events-none
                    group-hover:opacity-100 transition-opacity z-50 shadow-lg border border-white/10
                  ">
                    {item.label}
                    {isHandoffs && openHandoffs > 0 && ` (${openHandoffs})`}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* ── Expand button when collapsed ── */}
      {collapsed && (
        <div className="px-2 pb-2">
          <button
            onClick={() => setCollapsed(false)}
            className="w-full flex items-center justify-center p-2.5 rounded-[8px] text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── Bottom: merchant info + sign out ── */}
      <div className={`border-t border-white/[0.07] p-3 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        {!collapsed && (
          <>
            <div className="px-1 mb-2">
              <div className="text-[0.82rem] font-semibold text-white truncate">{businessName}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sub.dot}`} />
                <span className="text-[0.75rem] text-white/40 capitalize">{sub.label}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/profile"
                className="flex-1 text-center text-[0.78rem] text-white/40 hover:text-white/70 px-2 py-1.5 rounded-[6px] hover:bg-white/[0.05] transition-colors no-underline"
              >
                Profile
              </Link>
              <SignOutButton compact />
            </div>
          </>
        )}
        {collapsed && (
          <>
            <Link
              href="/dashboard/profile"
              title="Profile"
              className="p-2 rounded-[8px] text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors"
            >
              <CircleDot size={18} />
            </Link>
            <div title={`Sign out (${businessName})`}>
              <SignOutButton compact iconOnly />
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
