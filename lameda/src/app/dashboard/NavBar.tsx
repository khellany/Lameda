'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { DashboardRole } from '@/lib/crm/session'

interface NavItem {
  href: string
  label: string
  badge?: number
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',            label: 'Overview' },
  { href: '/dashboard/orders',     label: 'Orders' },
  { href: '/dashboard/customers',  label: 'Customers' },
  { href: '/dashboard/analytics',  label: 'Analytics' },
  { href: '/dashboard/handoffs',   label: 'Handoffs' },
  { href: '/dashboard/broadcasts', label: 'Broadcasts', adminOnly: true },
  { href: '/dashboard/referrals',  label: 'Referrals',  adminOnly: true },
  { href: '/dashboard/billing',    label: 'Billing',    adminOnly: true },
  { href: '/dashboard/team',       label: 'Team',       adminOnly: true },
  { href: '/dashboard/settings',   label: 'Settings',   adminOnly: true },
]

interface NavBarProps {
  role: DashboardRole
  openHandoffs: number
}

export function NavBar({ role, openHandoffs }: NavBarProps) {
  const pathname = usePathname()

  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || role === 'admin')

  function isActive(href: string): boolean {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <nav className="flex items-center gap-1 text-sm">
      {visibleItems.map(item => {
        const active = isActive(item.href)
        const isHandoffs = item.href === '/dashboard/handoffs'
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-medium
              ${active
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }
            `}
          >
            {item.label}
            {isHandoffs && openHandoffs > 0 && (
              <span className={`
                inline-flex items-center justify-center min-w-[18px] h-[18px] px-1
                rounded-full text-[10px] font-bold
                ${active ? 'bg-white text-zinc-900' : 'bg-red-100 text-red-700'}
              `}>
                {openHandoffs > 99 ? '99+' : openHandoffs}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
