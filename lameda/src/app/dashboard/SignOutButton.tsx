'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

interface SignOutButtonProps {
  compact?: boolean
  iconOnly?: boolean
}

export function SignOutButton({ compact, iconOnly }: SignOutButtonProps = {}) {
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (iconOnly) {
    return (
      <button
        onClick={signOut}
        className="p-2 rounded-[8px] text-white/40 hover:text-red-400 hover:bg-white/[0.05] transition-colors"
        aria-label="Sign out"
      >
        <LogOut size={18} />
      </button>
    )
  }

  if (compact) {
    return (
      <button
        onClick={signOut}
        className="flex items-center gap-1.5 text-[0.78rem] text-white/40 hover:text-red-400 px-2 py-1.5 rounded-[6px] hover:bg-white/[0.05] transition-colors"
      >
        <LogOut size={14} />
        Sign out
      </button>
    )
  }

  return (
    <button
      onClick={signOut}
      className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
    >
      Sign out
    </button>
  )
}
